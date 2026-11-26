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

export interface AgendamentoComRelacoes {
  id: string;
  cliente_id: string | null;
  animal_id: string;
  animal_nome: string;
  cliente_nome: string;
  veterinario_id: string;
  veterinario_nome: string;
  inicio: number; // timestamp Unix (segundos)
  duracao_min: number;
  motivo: string | null;
  status: 'AGENDADO' | 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO';
  confirmado: boolean;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface DadosSyncAgendamento {
  id: string;
  cliente_id: string | null;
  animal_id: string;
  veterinario_id: string;
  inicio: number;
  duracao_min: number;
  motivo: string | null;
  status: string;
  confirmado: number;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
}

export interface NovoAgendamento {
  id?: string;
  clienteId?: string | null;
  animalId: string;
  veterinarioId: string;
  inicio: number;
  duracaoMin: number;
  motivo?: string | null;
  status?: string;
  confirmado?: number;
  ativo?: number;
  criadoEm?: number;
  atualizadoEm?: number;
}

export interface Veterinario {
  id: string;
  nome: string;
  crmv: string | null;
}

// ============================================================================
// INTERFACE DO REPOSITÓRIO (para testes)
// ============================================================================

export interface RepositorioAgendamentos {
  listar(entrada: { inicio: number; fim: number; veterinario_id?: string }): AgendamentoComRelacoes[];
  obter(id: string): AgendamentoComRelacoes | undefined;
  criar(dados: Omit<NovoAgendamento, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): AgendamentoComRelacoes;
  atualizar(id: string, dados: Partial<Omit<NovoAgendamento, 'id' | 'criadoEm'>>): AgendamentoComRelacoes;
  cancelar(id: string): void;
  listarVeterinarios(): Veterinario[];
  verificarConflito(veterinarioId: string, inicio: number, fim: number, ignorarId?: string): boolean;
  verificarAnimalExiste(animalId: string): boolean;
  verificarVeterinarioExiste(veterinarioId: string): boolean;
}

// ============================================================================
// IMPLEMENTAÇÃO COM SQL (único lugar com SQL do módulo agenda)
// ============================================================================

interface LinhaAgendamento {
  id: string;
  cliente_id: string | null;
  animal_id: string;
  veterinario_id: string;
  inicio: number;
  duracao_min: number;
  motivo: string | null;
  status: string;
  confirmado: number;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
}

interface LinhaAnimal {
  id: string;
  nome: string;
  cliente_id: string;
}

interface LinhaCliente {
  id: string;
  nome: string;
}

interface LinhaColaborador {
  id: string;
  nome: string;
  crmv: string | null;
  perfil: string;
}

function mapearAgendamento(
  ag: LinhaAgendamento,
  animal: LinhaAnimal | undefined,
  cliente: LinhaCliente | undefined,
  vet: LinhaColaborador | undefined,
): AgendamentoComRelacoes {
  return {
    id: ag.id,
    cliente_id: ag.cliente_id,
    animal_id: ag.animal_id,
    animal_nome: animal?.nome || '—',
    cliente_nome: cliente?.nome || '—',
    veterinario_id: ag.veterinario_id,
    veterinario_nome: vet?.nome || '—',
    inicio: ag.inicio,
    duracao_min: ag.duracao_min,
    motivo: ag.motivo,
    status: ag.status as AgendamentoComRelacoes['status'],
    confirmado: Boolean(ag.confirmado),
    ativo: Boolean(ag.ativo),
    criadoEm: ag.criado_em,
    atualizadoEm: ag.atualizado_em,
  };
}

export class AgendaRepository implements RepositorioAgendamentos {
  constructor(private readonly banco: BancoSql) {}

  listar(entrada: { inicio: number; fim: number; veterinario_id?: string }): AgendamentoComRelacoes[] {
    const { inicio, fim, veterinario_id } = entrada;

    let whereSql = 'WHERE a.inicio >= ? AND a.inicio < ? AND a.ativo = 1';
    const params: unknown[] = [inicio, fim];

    if (veterinario_id) {
      whereSql += ' AND a.veterinario_id = ?';
      params.push(veterinario_id);
    }

    const linhas = this.banco
      .prepare(
        `SELECT a.*,
                an.nome AS animal_nome, an.cliente_id AS animal_cliente_id,
                c.nome AS cliente_nome,
                col.nome AS veterinario_nome, col.crmv AS veterinario_crmv
         FROM agendamentos a
         JOIN animais an ON an.id = a.animal_id
         LEFT JOIN clientes c ON c.id = an.cliente_id
         JOIN colaboradores col ON col.id = a.veterinario_id
         ${whereSql}
         ORDER BY a.inicio ASC`,
      )
      .all(...params) as (LinhaAgendamento & {
        animal_nome: string;
        animal_cliente_id: string;
        cliente_nome: string;
        veterinario_nome: string;
        veterinario_crmv: string | null;
      })[];

    return linhas.map((linha) => ({
      id: linha.id,
      cliente_id: linha.cliente_id,
      animal_id: linha.animal_id,
      animal_nome: linha.animal_nome,
      cliente_nome: linha.cliente_nome,
      veterinario_id: linha.veterinario_id,
      veterinario_nome: linha.veterinario_nome,
      inicio: linha.inicio,
      duracao_min: linha.duracao_min,
      motivo: linha.motivo,
      status: linha.status as AgendamentoComRelacoes['status'],
      confirmado: Boolean(linha.confirmado),
      ativo: Boolean(linha.ativo),
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    }));
  }

  obter(id: string): AgendamentoComRelacoes | undefined {
    const linha = this.banco
      .prepare(
        `SELECT a.*,
                an.nome AS animal_nome, an.cliente_id AS animal_cliente_id,
                c.nome AS cliente_nome,
                col.nome AS veterinario_nome, col.crmv AS veterinario_crmv
         FROM agendamentos a
         JOIN animais an ON an.id = a.animal_id
         LEFT JOIN clientes c ON c.id = an.cliente_id
         JOIN colaboradores col ON col.id = a.veterinario_id
         WHERE a.id = ?`,
      )
      .get(id) as
      | (LinhaAgendamento & {
          animal_nome: string;
          animal_cliente_id: string;
          cliente_nome: string;
          veterinario_nome: string;
          veterinario_crmv: string | null;
        })
      | undefined;

    if (!linha) return undefined;

    return {
      id: linha.id,
      cliente_id: linha.cliente_id,
      animal_id: linha.animal_id,
      animal_nome: linha.animal_nome,
      cliente_nome: linha.cliente_nome,
      veterinario_id: linha.veterinario_id,
      veterinario_nome: linha.veterinario_nome,
      inicio: linha.inicio,
      duracao_min: linha.duracao_min,
      motivo: linha.motivo,
      status: linha.status as AgendamentoComRelacoes['status'],
      confirmado: Boolean(linha.confirmado),
      ativo: Boolean(linha.ativo),
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    };
  }

  listarVeterinarios(): Veterinario[] {
    const linhas = this.banco
      .prepare(
        `SELECT id, nome, crmv FROM colaboradores WHERE ativo = 1 AND perfil = 'VETERINARIO' ORDER BY nome ASC`,
      )
      .all() as LinhaColaborador[];

    return linhas.map((c) => ({ id: c.id, nome: c.nome, crmv: c.crmv }));
  }

  verificarAnimalExiste(animalId: string): boolean {
    const linha = this.banco.prepare('SELECT 1 FROM animais WHERE id = ? AND ativo = 1').get(animalId);
    return !!linha;
  }

  verificarVeterinarioExiste(veterinarioId: string): boolean {
    const linha = this.banco
      .prepare("SELECT 1 FROM colaboradores WHERE id = ? AND ativo = 1 AND perfil = 'VETERINARIO'")
      .get(veterinarioId);
    return !!linha;
  }

  verificarConflito(veterinarioId: string, inicio: number, fim: number, ignorarId?: string): boolean {
    let sql = `SELECT 1 FROM agendamentos
               WHERE veterinario_id = ? AND ativo = 1 AND status != 'CANCELADO'
               AND inicio < ? AND (inicio + duracao_min * 60) > ?`;
    const params: unknown[] = [veterinarioId, fim, inicio];

    if (ignorarId) {
      sql += ' AND id != ?';
      params.push(ignorarId);
    }

    const linha = this.banco.prepare(sql).get(...params);
    return !!linha;
  }

  criar(dados: Omit<NovoAgendamento, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): AgendamentoComRelacoes {
    const agora = Math.floor(Date.now() / 1000);
    const id = randomUUID();

    return runInTransaction((db) => {
      // Inserir agendamento
      db.prepare(
        `INSERT INTO agendamentos (id, cliente_id, animal_id, veterinario_id, inicio, duracao_min, motivo, status, confirmado, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'AGENDADO', 0, 1, ?, ?)`,
      ).run(
        id,
        dados.clienteId ?? null,
        dados.animalId,
        dados.veterinarioId,
        dados.inicio,
        dados.duracaoMin,
        dados.motivo ?? null,
        agora,
        agora,
      );

      // Gravar na sync_outbox
      const dadosSync: DadosSyncAgendamento = {
        id,
        cliente_id: dados.clienteId ?? null,
        animal_id: dados.animalId,
        veterinario_id: dados.veterinarioId,
        inicio: dados.inicio,
        duracao_min: dados.duracaoMin,
        motivo: dados.motivo ?? null,
        status: 'AGENDADO',
        confirmado: 0,
        ativo: 1,
        criado_em: agora,
        atualizado_em: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inserir', ?, ?)`,
      ).run('agendamentos', id, JSON.stringify(dadosSync), agora);

      return this.obter(id)!;
    });
  }

  atualizar(id: string, dados: Partial<Omit<NovoAgendamento, 'id' | 'criadoEm'>>): AgendamentoComRelacoes {
    const agora = Math.floor(Date.now() / 1000);
    const existente = this.obter(id);
    if (!existente) throw new Error('Agendamento não encontrado');

    return runInTransaction((db) => {
      const campos: string[] = [];
      const valores: unknown[] = [];

      const mapaCampos: Record<string, string> = {
        clienteId: 'cliente_id',
        animalId: 'animal_id',
        veterinarioId: 'veterinario_id',
        duracaoMin: 'duracao_min',
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

      db.prepare(`UPDATE agendamentos SET ${campos.join(', ')} WHERE id = ?`).run(...valores);

      // Gravar na sync_outbox
      const atualizado = this.obter(id)!;
      const dadosSync: DadosSyncAgendamento = {
        id: atualizado.id,
        cliente_id: atualizado.cliente_id,
        animal_id: atualizado.animal_id,
        veterinario_id: atualizado.veterinario_id,
        inicio: atualizado.inicio,
        duracao_min: atualizado.duracao_min,
        motivo: atualizado.motivo,
        status: atualizado.status,
        confirmado: atualizado.confirmado ? 1 : 0,
        ativo: atualizado.ativo ? 1 : 0,
        criado_em: atualizado.criadoEm,
        atualizado_em: atualizado.atualizadoEm,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'atualizar', ?, ?)`,
      ).run('agendamentos', id, JSON.stringify(dadosSync), agora);

      return atualizado;
    });
  }

  cancelar(id: string): void {
    const agora = Math.floor(Date.now() / 1000);
    const existente = this.obter(id);
    if (!existente) throw new Error('Agendamento não encontrado');

    runInTransaction((db) => {
      db.prepare("UPDATE agendamentos SET status = 'CANCELADO', atualizado_em = ? WHERE id = ?").run(agora, id);

      // Gravar na sync_outbox
      const dadosSync: DadosSyncAgendamento = {
        id: existente.id,
        cliente_id: existente.cliente_id,
        animal_id: existente.animal_id,
        veterinario_id: existente.veterinario_id,
        inicio: existente.inicio,
        duracao_min: existente.duracao_min,
        motivo: existente.motivo,
        status: 'CANCELADO',
        confirmado: existente.confirmado ? 1 : 0,
        ativo: 0,
        criado_em: existente.criadoEm,
        atualizado_em: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inativar', ?, ?)`,
      ).run('agendamentos', id, JSON.stringify(dadosSync), agora);
    });
  }
}

// ============================================================================
// FÁBRICA PARA OBTER INSTÂNCIA COM BANCO REAL
// ============================================================================

export function criarAgendaRepository(): AgendaRepository {
  return new AgendaRepository(obterConexaoLocal());
}