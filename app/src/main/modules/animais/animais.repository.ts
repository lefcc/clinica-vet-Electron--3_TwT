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

export interface AnimalComCliente {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  nome: string;
  especie: string;
  raca: string;
  sexo: 'M' | 'F';
  data_nascimento: string | undefined; // formato AAAA-MM-DD
  peso_kg: number | undefined;
  observacoes: string;
  idade_texto: string;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface DadosSyncAnimal {
  id: string;
  cliente_id: string;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: 'M' | 'F';
  data_nascimento: number | null;
  peso_kg: number | null;
  observacoes: string | null;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
}

export interface NovoAnimal {
  id?: string;
  clienteId: string;
  nome: string;
  especie: string;
  raca?: string | null;
  sexo: 'M' | 'F';
  dataNascimento?: number | null;
  pesoKg?: number | null;
  observacoes?: string | null;
  ativo?: number;
  criadoEm?: number;
  atualizadoEm?: number;
}

// ============================================================================
// INTERFACE DO REPOSITÓRIO (para testes)
// ============================================================================

export interface RepositorioAnimais {
  listar(entrada: EntradaListagem): Pagina<AnimalComCliente>;
  obter(id: string): AnimalComCliente | undefined;
  listarPorCliente(clienteId: string): AnimalComCliente[];
  criar(dados: Omit<NovoAnimal, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): AnimalComCliente;
  atualizar(id: string, dados: Partial<Omit<NovoAnimal, 'id' | 'criadoEm'>>): AnimalComCliente;
  inativar(id: string): void;
  verificarClienteExiste(clienteId: string): boolean;
}

// ============================================================================
// IMPLEMENTAÇÃO COM SQL (único lugar com SQL do módulo animais)
// ============================================================================

interface LinhaAnimal {
  id: string;
  cliente_id: string;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: 'M' | 'F';
  data_nascimento: number | null;
  peso_kg: number | null;
  observacoes: string | null;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
}

interface LinhaCliente {
  id: string;
  nome: string;
}

function calcularIdadeTexto(dataNascimento: number | null): string {
  if (!dataNascimento) return '—';
  const nascimento = new Date(dataNascimento * 1000);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
    anos--;
    meses += 12;
  }
  if (anos > 0 && meses > 0) return `${anos} ano${anos > 1 ? 's' : ''} e ${meses} mês${meses > 1 ? 'es' : ''}`;
  if (anos > 0) return `${anos} ano${anos > 1 ? 's' : ''}`;
  if (meses > 0) return `${meses} mês${meses > 1 ? 'es' : ''}`;
  const diffDias = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
  return `${diffDias} dia${diffDias !== 1 ? 's' : ''}`;
}

function mapearAnimalComCliente(animal: LinhaAnimal, cliente: LinhaCliente | undefined): AnimalComCliente {
  return {
    id: animal.id,
    cliente_id: animal.cliente_id,
    cliente_nome: cliente?.nome || '—',
    nome: animal.nome,
    especie: animal.especie,
    raca: animal.raca ?? '',
    sexo: animal.sexo,
    data_nascimento: animal.data_nascimento ? new Date(animal.data_nascimento * 1000).toISOString().split('T')[0] : undefined,
    peso_kg: animal.peso_kg ?? undefined,
    observacoes: animal.observacoes ?? '',
    idade_texto: calcularIdadeTexto(animal.data_nascimento),
    ativo: Boolean(animal.ativo),
    criadoEm: animal.criado_em,
    atualizadoEm: animal.atualizado_em,
  };
}

function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export class AnimalRepository implements RepositorioAnimais {
  constructor(private readonly banco: BancoSql) {}

  listar(entrada: EntradaListagem): Pagina<AnimalComCliente> {
    const { pagina = 1, tamanho = 10, busca } = entrada;
    const paginaSegura = Math.max(1, pagina);
    const tamanhoSeguro = Math.min(200, Math.max(1, tamanho));
    const offset = (paginaSegura - 1) * tamanhoSeguro;

    let whereSql = 'WHERE a.ativo = 1';
    const params: unknown[] = [];

    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      whereSql += ` AND (a.nome LIKE ? OR a.especie LIKE ? OR a.raca LIKE ? OR c.nome LIKE ?)`;
      params.push(termo, termo, termo, termo);
    }

    // Total
    const totalLinha = this.banco
      .prepare(
        `SELECT COUNT(*) AS total
         FROM animais a
         JOIN clientes c ON c.id = a.cliente_id
         ${whereSql}`,
      )
      .get(...params) as { total: number };
    const total = totalLinha.total;

    // Itens
    const linhas = this.banco
      .prepare(
        `SELECT a.*, c.nome AS cliente_nome
         FROM animais a
         JOIN clientes c ON c.id = a.cliente_id
         ${whereSql}
         ORDER BY a.nome ASC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, tamanhoSeguro, offset) as (LinhaAnimal & { cliente_nome: string })[];

    const itens = linhas.map((linha) => {
      const { cliente_nome, ...animal } = linha;
      return {
        ...mapearAnimalComCliente(animal, { id: animal.cliente_id, nome: cliente_nome }),
        cliente_nome,
      };
    });

    return {
      itens,
      total,
      pagina: paginaSegura,
      tamanho: tamanhoSeguro,
    };
  }

  obter(id: string): AnimalComCliente | undefined {
    const linha = this.banco
      .prepare(
        `SELECT a.*, c.nome AS cliente_nome
         FROM animais a
         JOIN clientes c ON c.id = a.cliente_id
         WHERE a.id = ?`,
      )
      .get(id) as (LinhaAnimal & { cliente_nome: string }) | undefined;

    if (!linha) return undefined;
    const { cliente_nome, ...animal } = linha;
    return mapearAnimalComCliente(animal, { id: animal.cliente_id, nome: cliente_nome });
  }

  listarPorCliente(clienteId: string): AnimalComCliente[] {
    const linhas = this.banco
      .prepare(
        `SELECT a.*, c.nome AS cliente_nome
         FROM animais a
         JOIN clientes c ON c.id = a.cliente_id
         WHERE a.cliente_id = ? AND a.ativo = 1
         ORDER BY a.nome ASC`,
      )
      .all(clienteId) as (LinhaAnimal & { cliente_nome: string })[];

    return linhas.map((linha) => {
      const { cliente_nome, ...animal } = linha;
      return mapearAnimalComCliente(animal, { id: animal.cliente_id, nome: cliente_nome });
    });
  }

  verificarClienteExiste(clienteId: string): boolean {
    const linha = this.banco
      .prepare('SELECT 1 FROM clientes WHERE id = ? AND ativo = 1')
      .get(clienteId);
    return !!linha;
  }

  criar(dados: Omit<NovoAnimal, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): AnimalComCliente {
    const agora = Math.floor(Date.now() / 1000);
    const id = randomUUID();

    return runInTransaction((db) => {
      // Inserir animal
      db.prepare(
        `INSERT INTO animais (id, cliente_id, nome, especie, raca, sexo, data_nascimento, peso_kg, observacoes, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      ).run(
        id,
        dados.clienteId,
        dados.nome,
        dados.especie,
        dados.raca ?? null,
        dados.sexo,
        dados.dataNascimento ?? null,
        dados.pesoKg ?? null,
        dados.observacoes ?? null,
        agora,
        agora,
      );

      // Gravar na sync_outbox
      const dadosSync: DadosSyncAnimal = {
        id,
        cliente_id: dados.clienteId,
        nome: dados.nome,
        especie: dados.especie,
        raca: dados.raca ?? null,
        sexo: dados.sexo,
        data_nascimento: dados.dataNascimento ?? null,
        peso_kg: dados.pesoKg ?? null,
        observacoes: dados.observacoes ?? null,
        ativo: 1,
        criado_em: agora,
        atualizado_em: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inserir', ?, ?)`,
      ).run('animais', id, JSON.stringify(dadosSync), agora);

      return this.obter(id)!;
    });
  }

  atualizar(id: string, dados: Partial<Omit<NovoAnimal, 'id' | 'criadoEm'>>): AnimalComCliente {
    const agora = Math.floor(Date.now() / 1000);
    const existente = this.obter(id);
    if (!existente) throw new Error('Animal não encontrado');

    return runInTransaction((db) => {
      const campos: string[] = [];
      const valores: unknown[] = [];

      // Mapear campos camelCase para snake_case
      const mapaCampos: Record<string, string> = {
        clienteId: 'cliente_id',
        dataNascimento: 'data_nascimento',
        pesoKg: 'peso_kg',
      };

      for (const [chave, valor] of Object.entries(dados)) {
        if (valor !== undefined && chave !== 'id' && chave !== 'criadoEm') {
          const coluna = mapaCampos[chave] || chave.replace(/([A-Z])/g, '_$1').toLowerCase();
          campos.push(`${coluna} = ?`);
          valores.push(valor);
        }
      }
      if (campos.length === 0) return existente;

      campos.push('atualizado_em = ?');
      valores.push(agora);
      valores.push(id);

      db.prepare(`UPDATE animais SET ${campos.join(', ')} WHERE id = ?`).run(...valores);

      // Gravar na sync_outbox
      const atualizado = this.obter(id)!;
      const dadosSync: DadosSyncAnimal = {
        id: atualizado.id,
        cliente_id: atualizado.cliente_id,
        nome: atualizado.nome,
        especie: atualizado.especie,
        raca: atualizado.raca,
        sexo: atualizado.sexo,
        data_nascimento: atualizado.data_nascimento ? Math.floor(new Date(atualizado.data_nascimento).getTime() / 1000) : null,
        peso_kg: atualizado.peso_kg ?? null,
        observacoes: atualizado.observacoes,
        ativo: atualizado.ativo ? 1 : 0,
        criado_em: atualizado.criadoEm,
        atualizado_em: atualizado.atualizadoEm,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'atualizar', ?, ?)`,
      ).run('animais', id, JSON.stringify(dadosSync), agora);

      return atualizado;
    });
  }

  inativar(id: string): void {
    const agora = Math.floor(Date.now() / 1000);
    const existente = this.obter(id);
    if (!existente) throw new Error('Animal não encontrado');

    runInTransaction((db) => {
      db.prepare('UPDATE animais SET ativo = 0, atualizado_em = ? WHERE id = ?').run(agora, id);

      // Gravar na sync_outbox - mapear manualmente para snake_case
      const dadosSync: DadosSyncAnimal = {
        id: existente.id,
        cliente_id: existente.cliente_id,
        nome: existente.nome,
        especie: existente.especie,
        raca: existente.raca,
        sexo: existente.sexo,
        data_nascimento: existente.data_nascimento ? Math.floor(new Date(existente.data_nascimento).getTime() / 1000) : null,
        peso_kg: existente.peso_kg ?? null,
        observacoes: existente.observacoes,
        ativo: 0,
        criado_em: existente.criadoEm,
        atualizado_em: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inativar', ?, ?)`,
      ).run('animais', id, JSON.stringify(dadosSync), agora);
    });
  }
}

// ============================================================================
// FÁBRICA PARA OBTER INSTÂNCIA COM BANCO REAL
// ============================================================================

export function criarAnimalRepository(): AnimalRepository {
  return new AnimalRepository(obterConexaoLocal());
}