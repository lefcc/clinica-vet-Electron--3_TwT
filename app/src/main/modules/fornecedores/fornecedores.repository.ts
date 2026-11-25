import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';

export type TipoFornecedor = 'NACIONAL' | 'IMPORTADO';
export type MoedaPreco = 'BRL' | 'USD';

export interface FornecedorDto {
  id: string;
  nome: string;
  tipo: TipoFornecedor;
  contato?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}

export interface NovoFornecedorDados {
  nome: string;
  tipo: TipoFornecedor;
  contato?: string;
  telefone?: string;
  email?: string;
}

export interface AtualizarFornecedorDados {
  id: string;
  nome?: string;
  tipo?: TipoFornecedor;
  contato?: string;
  telefone?: string;
  email?: string;
}

export interface RegistroPrecoFornecedor {
  id: string;
  medicamento_id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_tipo: TipoFornecedor;
  moeda: MoedaPreco;
  preco_centavos: number;
  atualizado_em: string;
}

export interface SalvarPrecoFornecedorDados {
  medicamento_id: string;
  fornecedor_id: string;
  moeda: MoedaPreco;
  preco_centavos: number;
}

export interface RepositorioFornecedores {
  listarAtivos(): FornecedorDto[];
  obterAtivoPorId(id: string): FornecedorDto | undefined;
  criar(dados: NovoFornecedorDados): FornecedorDto;
  atualizar(dados: AtualizarFornecedorDados): FornecedorDto | undefined;
  inativar(id: string): boolean;
  listarPrecosPorMedicamento(medicamentoId: string): RegistroPrecoFornecedor[];
  salvarPreco(dados: SalvarPrecoFornecedorDados): RegistroPrecoFornecedor;
  inativarPreco(id: string): boolean;
}

interface LinhaFornecedor {
  id: string;
  nome: string;
  tipo: TipoFornecedor;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  ativo: number;
}

interface LinhaPrecoFornecedor {
  id: string;
  medicamento_id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_tipo: TipoFornecedor;
  moeda: MoedaPreco;
  preco_centavos: number;
  atualizado_em: number | string;
}

function mapearLinhaFornecedor(linha: LinhaFornecedor): FornecedorDto {
  return {
    id: linha.id,
    nome: linha.nome,
    tipo: linha.tipo,
    contato: linha.contato ?? undefined,
    telefone: linha.telefone ?? undefined,
    email: linha.email ?? undefined,
    ativo: Boolean(linha.ativo),
  };
}

function normalizarTimestampIso(valor: number | string): string {
  if (typeof valor === 'string' && valor.includes('T')) {
    return valor;
  }
  const num = Number(valor);
  if (!Number.isNaN(num) && num > 0) {
    const ms = num < 10_000_000_000 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

export class FornecedoresRepository implements RepositorioFornecedores {
  private tabelasGarantidas = false;

  constructor(private readonly banco: BancoSql) {}

  private garantirTabelas(): void {
    if (this.tabelasGarantidas) return;
    this.banco.exec(`
      CREATE TABLE IF NOT EXISTS fornecedores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('NACIONAL', 'IMPORTADO')),
        contato TEXT,
        telefone TEXT,
        email TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores (ativo);

      CREATE TABLE IF NOT EXISTS fornecedores_precos (
        id TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL,
        fornecedor_id TEXT NOT NULL,
        moeda TEXT NOT NULL CHECK (moeda IN ('BRL', 'USD')),
        preco_centavos INTEGER NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fornecedores_precos_med ON fornecedores_precos (medicamento_id, ativo);

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

  listarAtivos(): FornecedorDto[] {
    this.garantirTabelas();
    const linhas = this.banco
      .prepare(
        `SELECT id, nome, tipo, contato, telefone, email, ativo
         FROM fornecedores
         WHERE ativo = 1
         ORDER BY nome ASC`,
      )
      .all() as LinhaFornecedor[];

    return linhas.map(mapearLinhaFornecedor);
  }

  obterAtivoPorId(id: string): FornecedorDto | undefined {
    this.garantirTabelas();
    const linha = this.banco
      .prepare(
        `SELECT id, nome, tipo, contato, telefone, email, ativo
         FROM fornecedores
         WHERE id = ? AND ativo = 1`,
      )
      .get(id) as LinhaFornecedor | undefined;

    return linha ? mapearLinhaFornecedor(linha) : undefined;
  }

  criar(dados: NovoFornecedorDados): FornecedorDto {
    this.garantirTabelas();
    const id = randomUUID();
    const agora = Math.floor(Date.now() / 1000);
    const contato = dados.contato ?? null;
    const telefone = dados.telefone ?? null;
    const email = dados.email ?? null;

    this.banco.transacao(() => {
      this.banco
        .prepare(
          `INSERT INTO fornecedores (id, nome, tipo, contato, telefone, email, ativo, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        )
        .run(id, dados.nome, dados.tipo, contato, telefone, email, agora, agora);

      this.registrarOutbox('fornecedores', id, 'inserir', {
        id,
        nome: dados.nome,
        tipo: dados.tipo,
        contato,
        telefone,
        email,
        ativo: 1,
        criado_em: agora,
        atualizado_em: agora,
      });
    });

    return {
      id,
      nome: dados.nome,
      tipo: dados.tipo,
      contato: contato ?? undefined,
      telefone: telefone ?? undefined,
      email: email ?? undefined,
      ativo: true,
    };
  }

  atualizar(dados: AtualizarFornecedorDados): FornecedorDto | undefined {
    this.garantirTabelas();
    const atual = this.obterAtivoPorId(dados.id);
    if (!atual) return undefined;

    const nome = dados.nome ?? atual.nome;
    const tipo = dados.tipo ?? atual.tipo;
    const contato = dados.contato !== undefined ? (dados.contato ?? null) : (atual.contato ?? null);
    const telefone = dados.telefone !== undefined ? (dados.telefone ?? null) : (atual.telefone ?? null);
    const email = dados.email !== undefined ? (dados.email ?? null) : (atual.email ?? null);
    const agora = Math.floor(Date.now() / 1000);

    this.banco.transacao(() => {
      this.banco
        .prepare(
          `UPDATE fornecedores
           SET nome = ?, tipo = ?, contato = ?, telefone = ?, email = ?, atualizado_em = ?
           WHERE id = ? AND ativo = 1`,
        )
        .run(nome, tipo, contato, telefone, email, agora, dados.id);

      this.registrarOutbox('fornecedores', dados.id, 'atualizar', {
        id: dados.id,
        nome,
        tipo,
        contato,
        telefone,
        email,
        atualizado_em: agora,
      });
    });

    return {
      id: dados.id,
      nome,
      tipo,
      contato: contato ?? undefined,
      telefone: telefone ?? undefined,
      email: email ?? undefined,
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
        .prepare(`UPDATE fornecedores SET ativo = 0, atualizado_em = ? WHERE id = ? AND ativo = 1`)
        .run(agora, id);

      this.registrarOutbox('fornecedores', id, 'inativar', {
        id,
        ativo: 0,
        atualizado_em: agora,
      });
    });

    return true;
  }

  listarPrecosPorMedicamento(medicamentoId: string): RegistroPrecoFornecedor[] {
    this.garantirTabelas();
    const linhas = this.banco
      .prepare(
        `SELECT fp.id,
                fp.medicamento_id,
                fp.fornecedor_id,
                f.nome AS fornecedor_nome,
                f.tipo AS fornecedor_tipo,
                fp.moeda,
                fp.preco_centavos,
                fp.atualizado_em
         FROM fornecedores_precos fp
         JOIN fornecedores f ON f.id = fp.fornecedor_id
         WHERE fp.medicamento_id = ? AND fp.ativo = 1 AND f.ativo = 1`,
      )
      .all(medicamentoId) as LinhaPrecoFornecedor[];

    return linhas.map((l) => ({
      id: l.id,
      medicamento_id: l.medicamento_id,
      fornecedor_id: l.fornecedor_id,
      fornecedor_nome: l.fornecedor_nome,
      fornecedor_tipo: l.fornecedor_tipo,
      moeda: l.moeda,
      preco_centavos: Number(l.preco_centavos),
      atualizado_em: normalizarTimestampIso(l.atualizado_em),
    }));
  }

  salvarPreco(dados: SalvarPrecoFornecedorDados): RegistroPrecoFornecedor {
    this.garantirTabelas();
    const fornecedor = this.obterAtivoPorId(dados.fornecedor_id);
    if (!fornecedor) {
      throw new Error('Fornecedor não encontrado ou inativo.');
    }

    const existente = this.banco
      .prepare(
        `SELECT id FROM fornecedores_precos
         WHERE medicamento_id = ? AND fornecedor_id = ?
         LIMIT 1`,
      )
      .get(dados.medicamento_id, dados.fornecedor_id) as { id: string } | undefined;

    const agora = Math.floor(Date.now() / 1000);
    const id = existente?.id ?? randomUUID();

    this.banco.transacao(() => {
      if (existente) {
        this.banco
          .prepare(
            `UPDATE fornecedores_precos
             SET moeda = ?, preco_centavos = ?, ativo = 1, atualizado_em = ?
             WHERE id = ?`,
          )
          .run(dados.moeda, dados.preco_centavos, agora, id);

        this.registrarOutbox('fornecedores_precos', id, 'atualizar', {
          id,
          medicamento_id: dados.medicamento_id,
          fornecedor_id: dados.fornecedor_id,
          moeda: dados.moeda,
          preco_centavos: dados.preco_centavos,
          ativo: 1,
          atualizado_em: agora,
        });
      } else {
        this.banco
          .prepare(
            `INSERT INTO fornecedores_precos (id, medicamento_id, fornecedor_id, moeda, preco_centavos, ativo, criado_em, atualizado_em)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          )
          .run(id, dados.medicamento_id, dados.fornecedor_id, dados.moeda, dados.preco_centavos, agora, agora);

        this.registrarOutbox('fornecedores_precos', id, 'inserir', {
          id,
          medicamento_id: dados.medicamento_id,
          fornecedor_id: dados.fornecedor_id,
          moeda: dados.moeda,
          preco_centavos: dados.preco_centavos,
          ativo: 1,
          criado_em: agora,
          atualizado_em: agora,
        });
      }
    });

    return {
      id,
      medicamento_id: dados.medicamento_id,
      fornecedor_id: fornecedor.id,
      fornecedor_nome: fornecedor.nome,
      fornecedor_tipo: fornecedor.tipo,
      moeda: dados.moeda,
      preco_centavos: dados.preco_centavos,
      atualizado_em: normalizarTimestampIso(agora),
    };
  }

  inativarPreco(id: string): boolean {
    this.garantirTabelas();
    const agora = Math.floor(Date.now() / 1000);
    let alterados = 0;

    this.banco.transacao(() => {
      const resultado = this.banco
        .prepare(`UPDATE fornecedores_precos SET ativo = 0, atualizado_em = ? WHERE id = ? AND ativo = 1`)
        .run(agora, id);
      alterados = Number(resultado.changes);

      if (alterados > 0) {
        this.registrarOutbox('fornecedores_precos', id, 'inativar', {
          id,
          ativo: 0,
          atualizado_em: agora,
        });
      }
    });

    return alterados > 0;
  }
}
