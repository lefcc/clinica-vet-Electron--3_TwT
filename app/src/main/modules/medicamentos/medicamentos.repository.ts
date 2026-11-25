import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';

export interface MedicamentoDto {
  id: string;
  nome: string;
  principio_ativo?: string;
  unidade: string;
  dias_alerta: number;
  consumo_inicial_diario?: number | null;
  ativo: boolean;
}

export interface NovoMedicamentoDados {
  nome: string;
  principio_ativo?: string;
  unidade: string;
  dias_alerta: number;
  consumo_inicial_diario?: number | null;
}

export interface AtualizarMedicamentoDados {
  id: string;
  nome?: string;
  principio_ativo?: string;
  unidade?: string;
  dias_alerta?: number;
  consumo_inicial_diario?: number | null;
}

export interface RepositorioMedicamentos {
  listarAtivos(): MedicamentoDto[];
  obterAtivoPorId(id: string): MedicamentoDto | undefined;
  criar(dados: NovoMedicamentoDados): MedicamentoDto;
  atualizar(dados: AtualizarMedicamentoDados): MedicamentoDto | undefined;
  inativar(id: string): boolean;
}

interface LinhaMedicamento {
  id: string;
  nome: string;
  principio_ativo: string | null;
  unidade: string;
  dias_alerta: number;
  consumo_inicial_diario: number | null;
  ativo: number;
}

function mapearLinhaMedicamento(linha: LinhaMedicamento): MedicamentoDto {
  return {
    id: linha.id,
    nome: linha.nome,
    principio_ativo: linha.principio_ativo ?? undefined,
    unidade: linha.unidade,
    dias_alerta: Number(linha.dias_alerta),
    consumo_inicial_diario:
      linha.consumo_inicial_diario !== null && linha.consumo_inicial_diario !== undefined
        ? Number(linha.consumo_inicial_diario)
        : null,
    ativo: Boolean(linha.ativo),
  };
}

export class MedicamentosRepository implements RepositorioMedicamentos {
  private tabelasGarantidas = false;

  constructor(private readonly banco: BancoSql) {}

  private garantirTabelas(): void {
    if (this.tabelasGarantidas) return;
    this.banco.exec(`
      CREATE TABLE IF NOT EXISTS medicamentos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        principio_ativo TEXT,
        unidade TEXT NOT NULL,
        dias_alerta INTEGER NOT NULL DEFAULT 3,
        consumo_inicial_diario REAL,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_medicamentos_nome ON medicamentos (nome);
      CREATE INDEX IF NOT EXISTS idx_medicamentos_ativo ON medicamentos (ativo);

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabela TEXT NOT NULL,
        registro_id TEXT NOT NULL,
        operacao TEXT NOT NULL CHECK (operacao IN ('inserir', 'atualizar', 'inativar')),
        dados TEXT NOT NULL,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        tentativas INTEGER NOT NULL DEFAULT 0,
        ultimo_erro TEXT,
        enviado_em INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_tabela_registro ON sync_outbox (tabela, registro_id);
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_enviado ON sync_outbox (enviado_em);
    `);
    this.tabelasGarantidas = true;
  }

  private registrarOutbox(
    registroId: string,
    operacao: 'inserir' | 'atualizar' | 'inativar',
    dados: Record<string, unknown>,
  ): void {
    this.banco
      .prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES ('medicamentos', ?, ?, ?, ?)`,
      )
      .run(registroId, operacao, JSON.stringify(dados), Math.floor(Date.now() / 1000));
  }

  listarAtivos(): MedicamentoDto[] {
    this.garantirTabelas();
    const linhas = this.banco
      .prepare(
        `SELECT id, nome, principio_ativo, unidade, dias_alerta, consumo_inicial_diario, ativo
         FROM medicamentos
         WHERE ativo = 1
         ORDER BY nome ASC`,
      )
      .all() as LinhaMedicamento[];

    return linhas.map(mapearLinhaMedicamento);
  }

  obterAtivoPorId(id: string): MedicamentoDto | undefined {
    this.garantirTabelas();
    const linha = this.banco
      .prepare(
        `SELECT id, nome, principio_ativo, unidade, dias_alerta, consumo_inicial_diario, ativo
         FROM medicamentos
         WHERE id = ? AND ativo = 1`,
      )
      .get(id) as LinhaMedicamento | undefined;

    return linha ? mapearLinhaMedicamento(linha) : undefined;
  }

  criar(dados: NovoMedicamentoDados): MedicamentoDto {
    this.garantirTabelas();
    const id = randomUUID();
    const agora = Math.floor(Date.now() / 1000);
    const principioAtivo = dados.principio_ativo ?? null;
    const consumoInicial = dados.consumo_inicial_diario ?? null;

    this.banco.transacao(() => {
      this.banco
        .prepare(
          `INSERT INTO medicamentos (id, nome, principio_ativo, unidade, dias_alerta, consumo_inicial_diario, ativo, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        )
        .run(id, dados.nome, principioAtivo, dados.unidade, dados.dias_alerta, consumoInicial, agora, agora);

      this.registrarOutbox(id, 'inserir', {
        id,
        nome: dados.nome,
        principio_ativo: principioAtivo,
        unidade: dados.unidade,
        dias_alerta: dados.dias_alerta,
        consumo_inicial_diario: consumoInicial,
        ativo: 1,
        criado_em: agora,
        atualizado_em: agora,
      });
    });

    return {
      id,
      nome: dados.nome,
      principio_ativo: principioAtivo ?? undefined,
      unidade: dados.unidade,
      dias_alerta: dados.dias_alerta,
      consumo_inicial_diario: consumoInicial,
      ativo: true,
    };
  }

  atualizar(dados: AtualizarMedicamentoDados): MedicamentoDto | undefined {
    this.garantirTabelas();
    const atual = this.obterAtivoPorId(dados.id);
    if (!atual) return undefined;

    const nome = dados.nome ?? atual.nome;
    const principioAtivo =
      dados.principio_ativo !== undefined ? (dados.principio_ativo ?? null) : (atual.principio_ativo ?? null);
    const unidade = dados.unidade ?? atual.unidade;
    const diasAlerta = dados.dias_alerta ?? atual.dias_alerta;
    const consumoInicial =
      dados.consumo_inicial_diario !== undefined
        ? (dados.consumo_inicial_diario ?? null)
        : (atual.consumo_inicial_diario ?? null);
    const agora = Math.floor(Date.now() / 1000);

    this.banco.transacao(() => {
      this.banco
        .prepare(
          `UPDATE medicamentos
           SET nome = ?, principio_ativo = ?, unidade = ?, dias_alerta = ?, consumo_inicial_diario = ?, atualizado_em = ?
           WHERE id = ? AND ativo = 1`,
        )
        .run(nome, principioAtivo, unidade, diasAlerta, consumoInicial, agora, dados.id);

      this.registrarOutbox(dados.id, 'atualizar', {
        id: dados.id,
        nome,
        principio_ativo: principioAtivo,
        unidade,
        dias_alerta: diasAlerta,
        consumo_inicial_diario: consumoInicial,
        atualizado_em: agora,
      });
    });

    return {
      id: dados.id,
      nome,
      principio_ativo: principioAtivo ?? undefined,
      unidade,
      dias_alerta: diasAlerta,
      consumo_inicial_diario: consumoInicial,
      ativo: true,
    };
  }

  inativar(id: string): boolean {
    this.garantirTabelas();
    const atual = this.obterAtivoPorId(id);
    if (!atual) return false;

    const agora = Math.floor(Date.now() / 1000);
    this.banco.transacao(() => {
      this.banco
        .prepare(`UPDATE medicamentos SET ativo = 0, atualizado_em = ? WHERE id = ? AND ativo = 1`)
        .run(agora, id);

      this.registrarOutbox(id, 'inativar', {
        id,
        ativo: 0,
        atualizado_em: agora,
      });
    });

    return true;
  }
}
