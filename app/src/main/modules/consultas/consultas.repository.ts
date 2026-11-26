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

export interface Prescricao {
  id: string;
  consulta_id: string;
  medicamento_id: string;
  medicamento_nome: string;
  quantidade: number;
  posologia: string | null;
  unidade: string;
  criadoEm: number;
}

export interface ConsultaComRelacoes {
  id: string;
  agendamento_id: string | null;
  animal_id: string;
  animal_nome: string;
  cliente_nome: string;
  veterinario_id: string;
  veterinario_nome: string;
  data: number; // timestamp Unix (segundos)
  anamnese: string | null;
  diagnostico: string | null;
  observacoes: string | null;
  prescricoes: Prescricao[];
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface DadosSyncConsulta {
  id: string;
  agendamento_id: string | null;
  animal_id: string;
  veterinario_id: string;
  data: number;
  anamnese: string | null;
  diagnostico: string | null;
  observacoes: string | null;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
}

export interface DadosSyncPrescricao {
  id: string;
  consulta_id: string;
  medicamento_id: string;
  quantidade: number;
  posologia: string | null;
  criado_em: number;
}

export interface NovoLote {
  id: string;
  medicamentoId: string;
  numero: string;
  validade: number; // timestamp Unix (data)
  quantidadeInicial: number;
  criadoEm?: number;
}

export interface LoteParaBaixa {
  id: string;
  numero: string;
  validade: number;
  saldo: number;
}

export interface NovaConsulta {
  id?: string;
  agendamentoId?: string | null;
  animalId: string;
  veterinarioId: string;
  data: number;
  anamnese?: string | null;
  diagnostico?: string | null;
  observacoes?: string | null;
  prescricoes?: Array<{ medicamentoId: string; quantidade: number; posologia?: string | null }>;
  ativo?: number;
  criadoEm?: number;
  atualizadoEm?: number;
}

export interface MovimentacaoEstoque {
  id: string;
  medicamentoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  loteId?: string | null;
  motivo?: string | null;
  referenciaId?: string | null;
  referenciaTipo?: string | null;
  usuarioId: string;
  criadoEm?: number;
}

// ============================================================================
// INTERFACE DO REPOSITÓRIO (para testes)
// ============================================================================

export interface RepositorioConsultas {
  listar(entrada: EntradaListagem): Pagina<ConsultaComRelacoes>;
  obter(id: string): ConsultaComRelacoes | undefined;
  historicoAnimal(animalId: string): ConsultaComRelacoes[];
  criar(dados: Omit<NovaConsulta, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>, usuarioId: string): ConsultaComRelacoes;
  verificarAnimalExiste(animalId: string): boolean;
  buscarLotesParaBaixa(medicamentoId: string, quantidade: number): LoteParaBaixa[];
}

// ============================================================================
// IMPLEMENTAÇÃO COM SQL (único lugar com SQL do módulo consultas)
// ============================================================================

interface LinhaConsulta {
  id: string;
  agendamento_id: string | null;
  animal_id: string;
  veterinario_id: string;
  data: number;
  anamnese: string | null;
  diagnostico: string | null;
  observacoes: string | null;
  ativo: number;
  criado_em: number;
  atualizado_em: number;
  animal_nome?: string;
  animal_cliente_id?: string;
  cliente_nome?: string;
  veterinario_nome?: string;
}

interface LinhaPrescricao {
  id: string;
  consulta_id: string;
  medicamento_id: string;
  quantidade: number;
  posologia: string | null;
  criado_em: number;
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
}

interface LinhaMedicamento {
  id: string;
  nome: string;
  unidade: string;
}

interface LinhaLote {
  id: string;
  medicamento_id: string;
  numero: string;
  validade: number;
  quantidade_inicial: number;
}

interface LinhaMovimento {
  lote_id: string | null;
  quantidade: number;
}

function mapearConsulta(
  consulta: LinhaConsulta,
  animal: LinhaAnimal | undefined,
  cliente: LinhaCliente | undefined,
  vet: LinhaColaborador | undefined,
  prescricoes: (LinhaPrescricao & { medicamento_nome: string; unidade: string })[],
): ConsultaComRelacoes {
  return {
    id: consulta.id,
    agendamento_id: consulta.agendamento_id,
    animal_id: consulta.animal_id,
    animal_nome: animal?.nome || '—',
    cliente_nome: cliente?.nome || '—',
    veterinario_id: consulta.veterinario_id,
    veterinario_nome: vet?.nome || '—',
    data: consulta.data,
    anamnese: consulta.anamnese,
    diagnostico: consulta.diagnostico,
    observacoes: consulta.observacoes,
    prescricoes: prescricoes.map((p) => ({
      id: p.id,
      consulta_id: p.consulta_id,
      medicamento_id: p.medicamento_id,
      medicamento_nome: p.medicamento_nome,
      quantidade: p.quantidade,
      posologia: p.posologia,
      unidade: p.unidade,
      criadoEm: p.criado_em,
    })),
    ativo: Boolean(consulta.ativo),
    criadoEm: consulta.criado_em,
    atualizadoEm: consulta.atualizado_em,
  };
}

function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export class ConsultasRepository implements RepositorioConsultas {
  constructor(private readonly banco: BancoSql) {}

  listar(entrada: EntradaListagem): Pagina<ConsultaComRelacoes> {
    const { pagina = 1, tamanho = 10, busca } = entrada;
    const paginaSegura = Math.max(1, pagina);
    const tamanhoSeguro = Math.min(200, Math.max(1, tamanho));
    const offset = (paginaSegura - 1) * tamanhoSeguro;

    let whereSql = 'WHERE c.ativo = 1';
    const params: unknown[] = [];

    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      whereSql += ` AND (an.nome LIKE ? OR cl.nome LIKE ? OR col.nome LIKE ? OR c.anamnese LIKE ?)`;
      params.push(termo, termo, termo, termo);
    }

    // Total
    const totalLinha = this.banco
      .prepare(
        `SELECT COUNT(*) AS total
         FROM consultas c
         JOIN animais an ON an.id = c.animal_id
         JOIN clientes cl ON cl.id = an.cliente_id
         JOIN colaboradores col ON col.id = c.veterinario_id
         ${whereSql}`,
      )
      .get(...params) as { total: number };
    const total = totalLinha.total;

    // Itens
    const linhas = this.banco
      .prepare(
        `SELECT c.*, an.nome AS animal_nome, an.cliente_id AS animal_cliente_id, cl.nome AS cliente_nome, col.nome AS veterinario_nome
         FROM consultas c
         JOIN animais an ON an.id = c.animal_id
         JOIN clientes cl ON cl.id = an.cliente_id
         JOIN colaboradores col ON col.id = c.veterinario_id
         ${whereSql}
         ORDER BY c.data DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, tamanhoSeguro, offset) as LinhaConsulta[];

    const itens: ConsultaComRelacoes[] = [];
    for (const linha of linhas) {
      const prescricoes = this.banco
        .prepare(
          `SELECT p.*, m.nome AS medicamento_nome, m.unidade
           FROM prescricoes p
           JOIN medicamentos m ON m.id = p.medicamento_id
           WHERE p.consulta_id = ?
           ORDER BY p.criado_em ASC`,
        )
        .all(linha.id) as (LinhaPrescricao & { medicamento_nome: string; unidade: string })[];

      const animal = { id: linha.animal_id, nome: linha.animal_nome, cliente_id: linha.animal_cliente_id } as LinhaAnimal;
      const cliente = { id: linha.animal_cliente_id, nome: linha.cliente_nome } as LinhaCliente;
      const vet = { id: linha.veterinario_id, nome: linha.veterinario_nome } as LinhaColaborador;

      itens.push(mapearConsulta(linha, animal, cliente, vet, prescricoes));
    }

    return {
      itens,
      total,
      pagina: paginaSegura,
      tamanho: tamanhoSeguro,
    };
  }

  obter(id: string): ConsultaComRelacoes | undefined {
    const consulta = this.banco
      .prepare(
        `SELECT c.*, an.nome AS animal_nome, an.cliente_id AS animal_cliente_id, cl.nome AS cliente_nome, col.nome AS veterinario_nome
         FROM consultas c
         JOIN animais an ON an.id = c.animal_id
         JOIN clientes cl ON cl.id = an.cliente_id
         JOIN colaboradores col ON col.id = c.veterinario_id
         WHERE c.id = ?`,
      )
      .get(id) as
      | (LinhaConsulta & {
          animal_nome: string;
          animal_cliente_id: string;
          cliente_nome: string;
          veterinario_nome: string;
        })
      | undefined;

    if (!consulta) return undefined;

    const prescricoes = this.banco
      .prepare(
        `SELECT p.*, m.nome AS medicamento_nome, m.unidade
         FROM prescricoes p
         JOIN medicamentos m ON m.id = p.medicamento_id
         WHERE p.consulta_id = ?
         ORDER BY p.criado_em ASC`,
      )
      .all(id) as (LinhaPrescricao & { medicamento_nome: string; unidade: string })[];

    const animal = { id: consulta.animal_id, nome: consulta.animal_nome, cliente_id: consulta.animal_cliente_id } as LinhaAnimal;
    const cliente = { id: consulta.animal_cliente_id, nome: consulta.cliente_nome } as LinhaCliente;
    const vet = { id: consulta.veterinario_id, nome: consulta.veterinario_nome } as LinhaColaborador;

    return mapearConsulta(consulta, animal, cliente, vet, prescricoes);
  }

  historicoAnimal(animalId: string): ConsultaComRelacoes[] {
    const linhas = this.banco
      .prepare(
        `SELECT c.*, an.nome AS animal_nome, an.cliente_id AS animal_cliente_id, cl.nome AS cliente_nome, col.nome AS veterinario_nome
         FROM consultas c
         JOIN animais an ON an.id = c.animal_id
         JOIN clientes cl ON cl.id = an.cliente_id
         JOIN colaboradores col ON col.id = c.veterinario_id
         WHERE c.animal_id = ? AND c.ativo = 1
         ORDER BY c.data DESC`,
      )
      .all(animalId) as (LinhaConsulta & {
        animal_nome: string;
        animal_cliente_id: string;
        cliente_nome: string;
        veterinario_nome: string;
      })[];

    const itens: ConsultaComRelacoes[] = [];
    for (const linha of linhas) {
      const prescricoes = this.banco
        .prepare(
          `SELECT p.*, m.nome AS medicamento_nome, m.unidade
           FROM prescricoes p
           JOIN medicamentos m ON m.id = p.medicamento_id
           WHERE p.consulta_id = ?
           ORDER BY p.criado_em ASC`,
        )
        .all(linha.id) as (LinhaPrescricao & { medicamento_nome: string; unidade: string })[];

      const animal = { id: linha.animal_id, nome: linha.animal_nome, cliente_id: linha.animal_cliente_id } as LinhaAnimal;
      const cliente = { id: linha.animal_cliente_id, nome: linha.cliente_nome } as LinhaCliente;
      const vet = { id: linha.veterinario_id, nome: linha.veterinario_nome } as LinhaColaborador;

      itens.push(mapearConsulta(linha, animal, cliente, vet, prescricoes));
    }
    return itens;
  }

  verificarAnimalExiste(animalId: string): boolean {
    const linha = this.banco.prepare('SELECT 1 FROM animais WHERE id = ? AND ativo = 1').get(animalId);
    return !!linha;
  }

  buscarLotesParaBaixa(medicamentoId: string, quantidade: number): LoteParaBaixa[] {
    // Buscar lotes com saldo disponível, ordenados por validade (FEFO - First Expired First Out)
    const lotes = this.banco
      .prepare(
        `SELECT l.id, l.numero, l.validade, l.quantidade_inicial,
                COALESCE(SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.lote_id = l.id THEN m.quantidade ELSE 0 END), 0) as entradas,
                COALESCE(SUM(CASE WHEN m.tipo = 'SAIDA' AND m.lote_id = l.id THEN -m.quantidade ELSE 0 END), 0) as saidas
         FROM estoque_lotes l
         LEFT JOIN estoque_movimentacoes m ON m.lote_id = l.id
         WHERE l.medicamento_id = ? AND l.validade >= date('now')
         GROUP BY l.id, l.numero, l.validade, l.quantidade_inicial
         HAVING (l.quantidade_inicial + entradas - saidas) > 0
         ORDER BY l.validade ASC`,
      )
      .all(medicamentoId) as (LinhaLote & { entradas: number; saidas: number })[];

    const lotesComSaldo: LoteParaBaixa[] = [];
    let somaSaldo = 0;

    for (const lote of lotes) {
      const saldo = lote.quantidade_inicial + lote.entradas - lote.saidas;
      if (saldo > 0) {
        lotesComSaldo.push({
          id: lote.id,
          numero: lote.numero,
          validade: lote.validade,
          saldo,
        });
        somaSaldo += saldo;
        if (somaSaldo >= quantidade) break;
      }
    }

    if (somaSaldo < quantidade) {
      throw new Error('ESTOQUE_INSUFICIENTE');
    }

    return lotesComSaldo;
  }

  criar(dados: Omit<NovaConsulta, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>, usuarioId: string): ConsultaComRelacoes {
    const agora = Math.floor(Date.now() / 1000);
    const id = randomUUID();

    return runInTransaction((db) => {
      // Inserir consulta
      db.prepare(
        `INSERT INTO consultas (id, agendamento_id, animal_id, veterinario_id, data, anamnese, diagnostico, observacoes, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      ).run(
        id,
        dados.agendamentoId ?? null,
        dados.animalId,
        dados.veterinarioId,
        dados.data,
        dados.anamnese ?? null,
        dados.diagnostico ?? null,
        dados.observacoes ?? null,
        agora,
        agora,
      );

      // Inserir prescrições e baixar estoque (FEFO)
      if (dados.prescricoes && dados.prescricoes.length > 0) {
        for (const presc of dados.prescricoes) {
          const prescId = randomUUID();

          // Buscar lotes para baixa FEFO
          const lotes = this.buscarLotesParaBaixa(presc.medicamentoId, presc.quantidade);

          // Inserir prescrição
          db.prepare(
            `INSERT INTO prescricoes (id, consulta_id, medicamento_id, quantidade, posologia, criado_em)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(prescId, id, presc.medicamentoId, presc.quantidade, presc.posologia ?? null, agora);

          // Baixar estoque dos lotes (FEFO)
          let qtdRestante = presc.quantidade;
          for (const lote of lotes) {
            const qtdBaixa = Math.min(qtdRestante, lote.saldo);
            const movId = randomUUID();

            db.prepare(
              `INSERT INTO estoque_movimentacoes (id, medicamento_id, tipo, quantidade, lote_id, motivo, referencia_id, referencia_tipo, usuario_id, criado_em)
               VALUES (?, ?, 'SAIDA', ?, ?, 'Prescrição em consulta', ?, 'consulta', ?, ?)`,
            ).run(movId, presc.medicamentoId, -qtdBaixa, lote.id, id, usuarioId, agora);

            // Atualizar saldo do lote (implícito via movimentações)

            // Gravar na sync_outbox para prescrição
            const dadosSyncPresc: DadosSyncPrescricao = {
              id: prescId,
              consulta_id: id,
              medicamento_id: presc.medicamentoId,
              quantidade: presc.quantidade,
              posologia: presc.posologia ?? null,
              criado_em: agora,
            };
            db.prepare(
              `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
               VALUES (?, ?, 'inserir', ?, ?)`,
            ).run('prescricoes', prescId, JSON.stringify(dadosSyncPresc), agora);

            // Gravar na sync_outbox para movimentação
            const dadosSyncMov = {
              id: movId,
              medicamento_id: presc.medicamentoId,
              tipo: 'SAIDA',
              quantidade: -qtdBaixa,
              lote_id: lote.id,
              motivo: 'Prescrição em consulta',
              referencia_id: id,
              referencia_tipo: 'consulta',
              usuario_id: usuarioId,
              criado_em: agora,
            };
            db.prepare(
              `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
               VALUES (?, ?, 'inserir', ?, ?)`,
            ).run('estoque_movimentacoes', movId, JSON.stringify(dadosSyncMov), agora);

            qtdRestante -= qtdBaixa;
            if (qtdRestante === 0) break;
          }
        }
      }

      // Gravar na sync_outbox para consulta
      const dadosSync: DadosSyncConsulta = {
        id,
        agendamento_id: dados.agendamentoId ?? null,
        animal_id: dados.animalId,
        veterinario_id: dados.veterinarioId,
        data: dados.data,
        anamnese: dados.anamnese ?? null,
        diagnostico: dados.diagnostico ?? null,
        observacoes: dados.observacoes ?? null,
        ativo: 1,
        criado_em: agora,
        atualizado_em: agora,
      };
      db.prepare(
        `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
         VALUES (?, ?, 'inserir', ?, ?)`,
      ).run('consultas', id, JSON.stringify(dadosSync), agora);

      // Se há agendamento_id, marcar como REALIZADO
      if (dados.agendamentoId) {
        db.prepare("UPDATE agendamentos SET status = 'REALIZADO', atualizado_em = ? WHERE id = ?").run(agora, dados.agendamentoId);

        // Gravar na sync_outbox para agendamento
        const agendamentoAtualizado = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(dados.agendamentoId) as
          | { id: string; cliente_id: string | null; animal_id: string; veterinario_id: string; inicio: number; duracao_min: number; motivo: string | null; status: string; confirmado: number; ativo: number; criado_em: number; atualizado_em: number }
          | undefined;
        if (agendamentoAtualizado) {
          const dadosSyncAg = {
            id: agendamentoAtualizado.id,
            cliente_id: agendamentoAtualizado.cliente_id,
            animal_id: agendamentoAtualizado.animal_id,
            veterinario_id: agendamentoAtualizado.veterinario_id,
            inicio: agendamentoAtualizado.inicio,
            duracao_min: agendamentoAtualizado.duracao_min,
            motivo: agendamentoAtualizado.motivo,
            status: 'REALIZADO',
            confirmado: agendamentoAtualizado.confirmado,
            ativo: agendamentoAtualizado.ativo,
            criado_em: agendamentoAtualizado.criado_em,
            atualizado_em: agora,
          };
          db.prepare(
            `INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em)
             VALUES (?, ?, 'atualizar', ?, ?)`,
          ).run('agendamentos', dados.agendamentoId, JSON.stringify(dadosSyncAg), agora);
        }
      }

      return this.obter(id)!;
    });
  }
}

// ============================================================================
// FÁBRICA PARA OBTER INSTÂNCIA COM BANCO REAL
// ============================================================================

export function criarConsultasRepository(): ConsultasRepository {
  return new ConsultasRepository(obterConexaoLocal());
}