import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA' | 'AJUSTE';
export type StatusEstoqueDto = 'OK' | 'ATENCAO' | 'CRITICO';

export interface LoteDto {
  id: string;
  numero: string;
  validade: string;
  saldo: number;
}

export interface MovimentacaoEstoqueRegistro {
  id: string;
  medicamento_id: string;
  tipo: TipoMovimentacaoEstoque;
  /** Quantidade com sinal algébrico: positiva (entrada/ajuste+) ou negativa (saída/ajuste-) */
  quantidade: number;
  lote_id?: string | null;
  lote_numero?: string | null;
  validade?: string | null;
  observacao?: string | null;
  criado_em: number;
}

export interface MedicamentoEstoqueInfo {
  id: string;
  nome: string;
  unidade: string;
  dias_alerta: number;
  consumo_inicial_diario: number | null;
}

export interface RegistrarEntradaEstoqueDados {
  medicamento_id: string;
  quantidade: number;
  lote_numero: string;
  validade: string;
  observacao?: string;
  usuario_id?: string;
}

export interface RegistrarSaidaEstoqueDados {
  medicamento_id: string;
  quantidade: number;
  observacao?: string;
  usuario_id?: string;
}

export interface RegistrarAjusteEstoqueDados {
  medicamento_id: string;
  diferenca: number;
  observacao?: string;
  usuario_id?: string;
}

export interface RepositorioEstoque {
  listarMedicamentosAtivos(): MedicamentoEstoqueInfo[];
  obterMedicamentoAtivo(id: string): MedicamentoEstoqueInfo | undefined;
  listarMovimentacoesPorMedicamento(medicamentoId: string): MovimentacaoEstoqueRegistro[];
  listarLotesComSaldoFefo(medicamentoId: string): LoteDto[];
  registrarEntrada(dados: RegistrarEntradaEstoqueDados): void;
  registrarSaidaFefo(dados: RegistrarSaidaEstoqueDados): void;
  registrarAjuste(dados: RegistrarAjusteEstoqueDados): void;
}

interface LinhaMedicamentoEstoque {
  id: string;
  nome: string;
  unidade: string;
  dias_alerta: number;
  consumo_inicial_diario: number | null;
}

interface LinhaMovimentacao {
  id: string;
  medicamento_id: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  lote_id: string | null;
  lote_numero?: string | null;
  validade?: string | null;
  motivo: string | null;
  criado_em: number;
}

interface LinhaLote {
  id: string;
  numero: string;
  validade: string;
  saldo: number;
}

function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export class EstoqueRepository implements RepositorioEstoque {
  private tabelasGarantidas = false;

  constructor(
    private readonly banco: BancoSql,
    private readonly obterUsuarioAtualId: () => string | null = () => null,
  ) {}

  private garantirTabelas(): void {
    if (this.tabelasGarantidas) return;
    this.banco.exec(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        cargo TEXT NOT NULL,
        crmv TEXT,
        telefone TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        colaborador_id TEXT NOT NULL UNIQUE REFERENCES colaboradores (id),
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL CHECK (perfil IN ('MASTER', 'VETERINARIO', 'ATENDENTE')),
        ativo INTEGER NOT NULL DEFAULT 1,
        ultimo_login_em INTEGER,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

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

      CREATE TABLE IF NOT EXISTS lotes_estoque (
        id TEXT PRIMARY KEY NOT NULL,
        medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
        numero TEXT NOT NULL,
        validade TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_lotes_estoque_medicamento_id ON lotes_estoque (medicamento_id, validade);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lotes_estoque_medicamento_id ON lotes_estoque (medicamento_id, numero);

      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id TEXT PRIMARY KEY NOT NULL,
        medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
        lote_id TEXT NOT NULL REFERENCES lotes_estoque(id),
        consulta_id TEXT,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
        quantidade REAL NOT NULL,
        motivo TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_medicamento_id ON movimentacoes_estoque (medicamento_id, criado_em);
      CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_lote_id ON movimentacoes_estoque (lote_id);

      CREATE TABLE IF NOT EXISTS alertas_estoque (
        id TEXT PRIMARY KEY NOT NULL,
        medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
        dias_restantes INTEGER NOT NULL,
        saldo_atual REAL NOT NULL,
        consumo_medio_diario REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido')),
        resolvido_em INTEGER,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_alertas_estoque_medicamento_id ON alertas_estoque (medicamento_id, status);

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

  private resolverUsuarioId(usuarioIdInformado?: string): string {
    if (usuarioIdInformado) return usuarioIdInformado;
    const daSessao = this.obterUsuarioAtualId();
    if (daSessao) return daSessao;
    const usuarioBanco = this.banco
      .prepare(`SELECT id FROM usuarios WHERE ativo = 1 ORDER BY criado_em ASC LIMIT 1`)
      .get() as { id: string } | undefined;
    return usuarioBanco?.id ?? 'usuario-sistema';
  }

  private registrarOutbox(
    tabela: string,
    registroId: string,
    operacao: 'inserir' | 'atualizar' | 'inativar',
    dados: Record<string, unknown>,
  ): void {
    this.banco
      .prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(tabela, registroId, operacao, JSON.stringify(dados), Math.floor(Date.now() / 1000));
  }

  listarMedicamentosAtivos(): MedicamentoEstoqueInfo[] {
    this.garantirTabelas();
    const linhas = this.banco
      .prepare(
        `SELECT id, nome, unidade, dias_alerta, consumo_inicial_diario
         FROM medicamentos
         WHERE ativo = 1
         ORDER BY nome ASC`,
      )
      .all() as LinhaMedicamentoEstoque[];

    return linhas.map((l) => ({
      id: l.id,
      nome: l.nome,
      unidade: l.unidade,
      dias_alerta: Number(l.dias_alerta),
      consumo_inicial_diario:
        l.consumo_inicial_diario !== null && l.consumo_inicial_diario !== undefined
          ? Number(l.consumo_inicial_diario)
          : null,
    }));
  }

  obterMedicamentoAtivo(id: string): MedicamentoEstoqueInfo | undefined {
    this.garantirTabelas();
    const l = this.banco
      .prepare(
        `SELECT id, nome, unidade, dias_alerta, consumo_inicial_diario
         FROM medicamentos
         WHERE id = ? AND ativo = 1`,
      )
      .get(id) as LinhaMedicamentoEstoque | undefined;

    if (!l) return undefined;
    return {
      id: l.id,
      nome: l.nome,
      unidade: l.unidade,
      dias_alerta: Number(l.dias_alerta),
      consumo_inicial_diario:
        l.consumo_inicial_diario !== null && l.consumo_inicial_diario !== undefined
          ? Number(l.consumo_inicial_diario)
          : null,
    };
  }

  listarMovimentacoesPorMedicamento(medicamentoId: string): MovimentacaoEstoqueRegistro[] {
    this.garantirTabelas();
    const linhas = this.banco
      .prepare(
        `SELECT m.id,
                m.medicamento_id,
                m.tipo,
                m.quantidade,
                m.lote_id,
                l.numero AS lote_numero,
                l.validade AS validade,
                m.motivo,
                m.criado_em
         FROM movimentacoes_estoque m
         LEFT JOIN lotes_estoque l ON l.id = m.lote_id
         WHERE m.medicamento_id = ? AND m.ativo = 1
         ORDER BY m.criado_em ASC`,
      )
      .all(medicamentoId) as LinhaMovimentacao[];

    return linhas.map((l) => ({
      id: l.id,
      medicamento_id: l.medicamento_id,
      tipo: l.tipo,
      quantidade: Number(l.quantidade),
      lote_id: l.lote_id,
      lote_numero: l.lote_numero ?? null,
      validade: l.validade ?? null,
      observacao: l.motivo,
      criado_em: Number(l.criado_em),
    }));
  }

  listarLotesComSaldoFefo(medicamentoId: string): LoteDto[] {
    this.garantirTabelas();
    const linhas = this.banco
      .prepare(
        `SELECT l.id,
                l.numero,
                l.validade,
                COALESCE(SUM(CASE WHEN m.ativo = 1 THEN m.quantidade ELSE 0 END), 0) AS saldo
         FROM lotes_estoque l
         LEFT JOIN movimentacoes_estoque m ON m.lote_id = l.id
         WHERE l.medicamento_id = ? AND l.ativo = 1
         GROUP BY l.id, l.numero, l.validade, l.criado_em
         HAVING COALESCE(SUM(CASE WHEN m.ativo = 1 THEN m.quantidade ELSE 0 END), 0) > 0
         ORDER BY l.validade ASC, l.criado_em ASC`,
      )
      .all(medicamentoId) as LinhaLote[];

    return linhas.map((l) => ({
      id: l.id,
      numero: l.numero,
      validade: l.validade,
      saldo: arredondar2(Number(l.saldo)),
    }));
  }

  private inserirMovimentacao(dados: {
    medicamento_id: string;
    lote_id: string;
    usuario_id: string;
    tipo: TipoMovimentacaoEstoque;
    quantidade: number;
    motivo: string | null;
    agora: number;
  }): void {
    const movId = randomUUID();
    this.banco
      .prepare(
        `INSERT INTO movimentacoes_estoque (id, medicamento_id, lote_id, consulta_id, usuario_id, tipo, quantidade, motivo, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(
        movId,
        dados.medicamento_id,
        dados.lote_id,
        dados.usuario_id,
        dados.tipo,
        dados.quantidade,
        dados.motivo,
        dados.agora,
        dados.agora,
      );

    this.registrarOutbox('movimentacoes_estoque', movId, 'inserir', {
      id: movId,
      medicamento_id: dados.medicamento_id,
      lote_id: dados.lote_id,
      consulta_id: null,
      usuario_id: dados.usuario_id,
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      motivo: dados.motivo,
      ativo: 1,
      criado_em: dados.agora,
      atualizado_em: dados.agora,
    });
  }

  registrarEntrada(dados: RegistrarEntradaEstoqueDados): void {
    this.garantirTabelas();
    const agora = Math.floor(Date.now() / 1000);
    const qtd = arredondar2(Math.abs(dados.quantidade));
    const motivo = dados.observacao ?? null;
    const usuarioId = this.resolverUsuarioId(dados.usuario_id);

    this.banco.transacao(() => {
      const loteExistente = this.banco
        .prepare(
          `SELECT id, validade FROM lotes_estoque
           WHERE medicamento_id = ? AND numero = ? AND ativo = 1
           LIMIT 1`,
        )
        .get(dados.medicamento_id, dados.lote_numero) as { id: string; validade: string } | undefined;

      let loteId: string;
      if (loteExistente) {
        loteId = loteExistente.id;
        this.banco
          .prepare(`UPDATE lotes_estoque SET validade = ?, atualizado_em = ? WHERE id = ?`)
          .run(dados.validade, agora, loteId);

        this.registrarOutbox('lotes_estoque', loteId, 'atualizar', {
          id: loteId,
          medicamento_id: dados.medicamento_id,
          numero: dados.lote_numero,
          validade: dados.validade,
          ativo: 1,
          atualizado_em: agora,
        });
      } else {
        loteId = randomUUID();
        this.banco
          .prepare(
            `INSERT INTO lotes_estoque (id, medicamento_id, numero, validade, ativo, criado_em, atualizado_em)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
          )
          .run(loteId, dados.medicamento_id, dados.lote_numero, dados.validade, agora, agora);

        this.registrarOutbox('lotes_estoque', loteId, 'inserir', {
          id: loteId,
          medicamento_id: dados.medicamento_id,
          numero: dados.lote_numero,
          validade: dados.validade,
          ativo: 1,
          criado_em: agora,
          atualizado_em: agora,
        });
      }

      this.inserirMovimentacao({
        medicamento_id: dados.medicamento_id,
        lote_id: loteId,
        usuario_id: usuarioId,
        tipo: 'ENTRADA',
        quantidade: qtd,
        motivo,
        agora,
      });
    });
  }

  private abaterNosLotesFefoEmTransacao(
    medicamentoId: string,
    quantidadeAbater: number,
    tipo: 'SAIDA' | 'AJUSTE',
    motivo: string | null,
    usuarioId: string,
    agora: number,
  ): void {
    const lotes = this.listarLotesComSaldoFefo(medicamentoId);
    let restante = arredondar2(Math.abs(quantidadeAbater));

    for (const lote of lotes) {
      if (restante <= 0) break;
      const consumido = arredondar2(Math.min(lote.saldo, restante));
      if (consumido <= 0) continue;
      restante = arredondar2(restante - consumido);

      this.inserirMovimentacao({
        medicamento_id: medicamentoId,
        lote_id: lote.id,
        usuario_id: usuarioId,
        tipo,
        quantidade: -consumido,
        motivo,
        agora,
      });
    }
  }

  registrarSaidaFefo(dados: RegistrarSaidaEstoqueDados): void {
    this.garantirTabelas();
    const agora = Math.floor(Date.now() / 1000);
    const qtdAbs = arredondar2(Math.abs(dados.quantidade));
    const motivo = dados.observacao ?? null;
    const usuarioId = this.resolverUsuarioId(dados.usuario_id);

    this.banco.transacao(() => {
      this.abaterNosLotesFefoEmTransacao(dados.medicamento_id, qtdAbs, 'SAIDA', motivo, usuarioId, agora);
    });
  }

  registrarAjuste(dados: RegistrarAjusteEstoqueDados): void {
    this.garantirTabelas();
    const agora = Math.floor(Date.now() / 1000);
    const diferenca = arredondar2(dados.diferenca);
    if (diferenca === 0) return;
    const motivo = dados.observacao ?? null;
    const usuarioId = this.resolverUsuarioId(dados.usuario_id);

    this.banco.transacao(() => {
      if (diferenca < 0) {
        this.abaterNosLotesFefoEmTransacao(dados.medicamento_id, Math.abs(diferenca), 'AJUSTE', motivo, usuarioId, agora);
      } else {
        const lotes = this.listarLotesComSaldoFefo(dados.medicamento_id);
        const loteMaisDistante = lotes[lotes.length - 1];
        let loteId: string;

        if (loteMaisDistante) {
          loteId = loteMaisDistante.id;
        } else {
          const existenteAjuste = this.banco
            .prepare(
              `SELECT id FROM lotes_estoque
               WHERE medicamento_id = ? AND numero = 'AJUSTE-INV' AND ativo = 1
               LIMIT 1`,
            )
            .get(dados.medicamento_id) as { id: string } | undefined;

          if (existenteAjuste) {
            loteId = existenteAjuste.id;
          } else {
            loteId = randomUUID();
            const validadePadrao = new Date((agora + 365 * 86400) * 1000).toISOString().slice(0, 10);
            this.banco
              .prepare(
                `INSERT INTO lotes_estoque (id, medicamento_id, numero, validade, ativo, criado_em, atualizado_em)
                 VALUES (?, ?, 'AJUSTE-INV', ?, 1, ?, ?)`,
              )
              .run(loteId, dados.medicamento_id, validadePadrao, agora, agora);

            this.registrarOutbox('lotes_estoque', loteId, 'inserir', {
              id: loteId,
              medicamento_id: dados.medicamento_id,
              numero: 'AJUSTE-INV',
              validade: validadePadrao,
              ativo: 1,
              criado_em: agora,
              atualizado_em: agora,
            });
          }
        }

        this.inserirMovimentacao({
          medicamento_id: dados.medicamento_id,
          lote_id: loteId,
          usuario_id: usuarioId,
          tipo: 'AJUSTE',
          quantidade: diferenca,
          motivo,
          agora,
        });
      }
    });
  }
}
