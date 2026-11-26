import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';
import { runInTransaction, obterConexaoLocal } from '../../db/local/client';

// ============================================================================
// TIPOS (usando number para timestamps, compatível com raw SQL)
// ============================================================================

export interface EntradaListagem {
  pagina: number;
  tamanho: number;
  busca?: string;
  [filtro: string]: unknown;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface ClienteComContagem {
  totalAnimaisAtivos: number;
}

export interface DadosSyncCliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: number;
  criadoEm: number;
  atualizadoEm: number;
}

// Tipo Cliente com timestamps como number (Unix seconds)
export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface NovoCliente {
  id?: string;
  nome: string;
  cpf: string;
  telefone?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativo?: number;
  criadoEm?: number;
  atualizadoEm?: number;
}

// ============================================================================
// INTERFACE DO REPOSITÓRIO (para testes)
// ============================================================================

export interface RepositorioClientes {
  listar(entrada: EntradaListagem): Pagina<Cliente>;
  obter(id: string): Cliente | undefined;
  criar(dados: Omit<NovoCliente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): Cliente;
  atualizar(id: string, dados: Partial<Omit<NovoCliente, 'id' | 'criadoEm'>>): Cliente;
  inativar(id: string): void;
  contarAnimaisAtivos(clienteId: string): number;
  buscarPorCpf(cpf: string, ignorarId?: string): Cliente | undefined;
}

// ============================================================================
// IMPLEMENTAÇÃO COM SQL (único lugar com SQL do módulo clientes)
// ============================================================================

interface LinhaCliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
}

function mapearCliente(linha: LinhaCliente): Cliente {
  return {
    id: linha.id,
    nome: linha.nome,
    cpf: linha.cpf,
    telefone: linha.telefone ?? '',
    email: linha.email ?? '',
    cep: linha.cep ?? '',
    logradouro: linha.logradouro ?? '',
    numero: linha.numero ?? '',
    complemento: linha.complemento ?? '',
    bairro: linha.bairro ?? '',
    cidade: linha.cidade ?? '',
    uf: linha.uf ?? '',
    ativo: Boolean(linha.ativo),
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

export class ClienteRepository implements RepositorioClientes {
  constructor(private readonly banco: BancoSql) {}

  listar(entrada: EntradaListagem): Pagina<Cliente> {
    const { pagina = 1, tamanho = 10, busca } = entrada;
    const paginaSegura = Math.max(1, pagina);
    const tamanhoSeguro = Math.min(200, Math.max(1, tamanho));
    const offset = (paginaSegura - 1) * tamanhoSeguro;

    let whereSql = 'WHERE ativo = 1';
    const params: unknown[] = [];

    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      whereSql += ` AND (nome LIKE ? OR cpf LIKE ? OR telefone LIKE ?)`;
      params.push(termo, termo, termo);
    }

    // Total
    const totalLinha = this.banco
      .prepare(`SELECT COUNT(*) AS total FROM clientes ${whereSql}`)
      .get(...params) as { total: number };
    const total = totalLinha.total;

    // Itens
    const linhas = this.banco
      .prepare(
        `SELECT * FROM clientes ${whereSql} ORDER BY nome ASC LIMIT ? OFFSET ?`,
      )
      .all(...params, tamanhoSeguro, offset) as LinhaCliente[];

    return {
      itens: linhas.map(mapearCliente),
      total,
      pagina: paginaSegura,
      tamanho: tamanhoSeguro,
    };
  }

  obter(id: string): Cliente | undefined {
    const linha = this.banco
      .prepare('SELECT * FROM clientes WHERE id = ?')
      .get(id) as LinhaCliente | undefined;
    return linha ? mapearCliente(linha) : undefined;
  }

  buscarPorCpf(cpf: string, ignorarId?: string): Cliente | undefined {
    let sql = 'SELECT * FROM clientes WHERE cpf = ? AND ativo = 1';
    const params: unknown[] = [cpf];
    if (ignorarId) {
      sql += ' AND id != ?';
      params.push(ignorarId);
    }
    const linha = this.banco.prepare(sql).get(...params) as LinhaCliente | undefined;
    return linha ? mapearCliente(linha) : undefined;
  }

  contarAnimaisAtivos(clienteId: string): number {
    const linha = this.banco
      .prepare('SELECT COUNT(*) AS total FROM animais WHERE cliente_id = ? AND ativo = 1')
      .get(clienteId) as { total: number };
    return linha.total;
  }

  criar(dados: Omit<NovoCliente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): Cliente {
    const agora = Math.floor(Date.now() / 1000);
    const id = randomUUID();

    return runInTransaction((db) => {
      // Inserir cliente
      db.prepare(
        `INSERT INTO clientes (id, nome, cpf, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      ).run(
        id,
        dados.nome,
        dados.cpf,
        dados.telefone ?? null,
        dados.email ?? null,
        dados.cep ?? null,
        dados.logradouro ?? null,
        dados.numero ?? null,
        dados.complemento ?? null,
        dados.bairro ?? null,
        dados.cidade ?? null,
        dados.uf ?? null,
        agora,
        agora,
      );

      // Gravar na sync_outbox
      const dadosSync: DadosSyncCliente = {
        id,
        nome: dados.nome,
        cpf: dados.cpf,
        telefone: dados.telefone ?? null,
        email: dados.email ?? null,
        cep: dados.cep ?? null,
        logradouro: dados.logradouro ?? null,
        numero: dados.numero ?? null,
        complemento: dados.complemento ?? null,
        bairro: dados.bairro ?? null,
        cidade: dados.cidade ?? null,
        uf: dados.uf ?? null,
        ativo: 1,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inserir', ?, ?)`,
      ).run('clientes', id, JSON.stringify(dadosSync), agora);

      return this.obter(id)!;
    });
  }

  atualizar(id: string, dados: Partial<Omit<NovoCliente, 'id' | 'criadoEm'>>): Cliente {
    const agora = Math.floor(Date.now() / 1000);
    const existente = this.obter(id);
    if (!existente) throw new Error('Cliente não encontrado');

    return runInTransaction((db) => {
      const campos: string[] = [];
      const valores: unknown[] = [];

      for (const [chave, valor] of Object.entries(dados)) {
        if (valor !== undefined && chave !== 'id' && chave !== 'criadoEm') {
          const coluna = chave.replace(/([A-Z])/g, '_$1').toLowerCase();
          campos.push(`${coluna} = ?`);
          valores.push(valor);
        }
      }
      if (campos.length === 0) return existente;

      campos.push('atualizado_em = ?');
      valores.push(agora);
      valores.push(id);

      db.prepare(`UPDATE clientes SET ${campos.join(', ')} WHERE id = ?`).run(...valores);

      // Gravar na sync_outbox
      const atualizado = this.obter(id)!;
      const dadosSync: DadosSyncCliente = {
        id: atualizado.id,
        nome: atualizado.nome,
        cpf: atualizado.cpf,
        telefone: atualizado.telefone,
        email: atualizado.email,
        cep: atualizado.cep,
        logradouro: atualizado.logradouro,
        numero: atualizado.numero,
        complemento: atualizado.complemento,
        bairro: atualizado.bairro,
        cidade: atualizado.cidade,
        uf: atualizado.uf,
        ativo: atualizado.ativo ? 1 : 0,
        criadoEm: atualizado.criadoEm,
        atualizadoEm: atualizado.atualizadoEm,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'atualizar', ?, ?)`,
      ).run('clientes', id, JSON.stringify(dadosSync), agora);

      return atualizado;
    });
  }

  inativar(id: string): void {
    const agora = Math.floor(Date.now() / 1000);
    const existente = this.obter(id);
    if (!existente) throw new Error('Cliente não encontrado');

    runInTransaction((db) => {
      db.prepare('UPDATE clientes SET ativo = 0, atualizado_em = ? WHERE id = ?').run(agora, id);

      // Gravar na sync_outbox
      const dadosSync: DadosSyncCliente = {
        ...existente,
        ativo: 0,
        atualizadoEm: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inativar', ?, ?)`,
      ).run('clientes', id, JSON.stringify(dadosSync), agora);
    });
  }
}

// ============================================================================
// FÁBRICA PARA OBTER INSTÂNCIA COM BANCO REAL
// ============================================================================

export function criarClienteRepository(): ClienteRepository {
  return new ClienteRepository(obterConexaoLocal());
}