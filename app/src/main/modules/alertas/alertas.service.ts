import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';
import type { SaldoEstoqueDto } from '../estoque/estoque.service';

export interface AlertaEstoqueDto {
  id: string;
  medicamento_nome: string;
  dias_restantes: number;
  saldo: number;
  unidade: string;
}

export interface ProvedorSaldosEstoque {
  calcularTodosSaldos(agoraMs?: number): SaldoEstoqueDto[];
}

export interface RepositorioAlertasEstoque {
  sincronizarAlertasCriticos(saldos: SaldoEstoqueDto[]): Map<string, string>;
}

export class AlertasEstoqueRepository implements RepositorioAlertasEstoque {
  private tabelasGarantidas = false;

  constructor(private readonly banco: BancoSql) {}

  private garantirTabelas(): void {
    if (this.tabelasGarantidas) return;
    this.banco.exec(`
      CREATE TABLE IF NOT EXISTS alertas_estoque (
        id TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL,
        dias_restantes INTEGER NOT NULL,
        saldo_atual REAL NOT NULL,
        consumo_medio_diario REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'aberto',
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_alertas_estoque_med_status ON alertas_estoque (medicamento_id, status);
    `);
    this.tabelasGarantidas = true;
  }

  sincronizarAlertasCriticos(saldos: SaldoEstoqueDto[]): Map<string, string> {
    this.garantirTabelas();
    const idsPorMedicamento = new Map<string, string>();
    const agora = Math.floor(Date.now() / 1000);

    this.banco.transacao(() => {
      for (const s of saldos) {
        if (s.status === 'CRITICO') {
          const existente = this.banco
            .prepare(
              `SELECT id FROM alertas_estoque
               WHERE medicamento_id = ? AND status = 'aberto'
               LIMIT 1`,
            )
            .get(s.medicamento_id) as { id: string } | undefined;

          if (existente) {
            const idStr = String(existente.id);
            this.banco
              .prepare(
                `UPDATE alertas_estoque
                 SET dias_restantes = ?, saldo_atual = ?, consumo_medio_diario = ?, atualizado_em = ?
                 WHERE id = ?`,
              )
              .run(s.dias_restantes ?? 0, s.saldo, s.consumo_medio_diario, agora, existente.id);
            idsPorMedicamento.set(s.medicamento_id, idStr);
          } else {
            const novoId = randomUUID();
            this.banco
              .prepare(
                `INSERT INTO alertas_estoque (id, medicamento_id, dias_restantes, saldo_atual, consumo_medio_diario, status, criado_em, atualizado_em)
                 VALUES (?, ?, ?, ?, ?, 'aberto', ?, ?)`,
              )
              .run(novoId, s.medicamento_id, s.dias_restantes ?? 0, s.saldo, s.consumo_medio_diario, agora, agora);
            idsPorMedicamento.set(s.medicamento_id, novoId);
          }
        } else {
          this.banco
            .prepare(
              `UPDATE alertas_estoque
               SET status = 'resolvido', atualizado_em = ?
               WHERE medicamento_id = ? AND status = 'aberto'`,
            )
            .run(agora, s.medicamento_id);
        }
      }
    });

    return idsPorMedicamento;
  }
}

export class AlertasService {
  constructor(
    private readonly estoque: ProvedorSaldosEstoque,
    private readonly repositorio?: RepositorioAlertasEstoque,
  ) {}

  listar(): AlertaEstoqueDto[] {
    const saldos = this.estoque.calcularTodosSaldos();
    const idsPorMed = this.repositorio?.sincronizarAlertasCriticos(saldos);

    return saldos
      .filter((s) => s.status === 'CRITICO')
      .map((s) => ({
        id: idsPorMed?.get(s.medicamento_id) ?? `alerta-${s.medicamento_id}`,
        medicamento_nome: s.medicamento_nome,
        dias_restantes: s.dias_restantes ?? 0,
        saldo: s.saldo,
        unidade: s.unidade,
      }));
  }

  contar(): { total: number } {
    return { total: this.listar().length };
  }
}
