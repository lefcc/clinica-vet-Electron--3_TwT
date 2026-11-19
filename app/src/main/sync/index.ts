// Módulo de sincronização - outbox, push, pull, conflitos
import { getLocalDb } from '../db/local/client';
import { runInTransaction } from '../db/central/client';
import { config } from '../config/env';

export interface SyncStatus {
  pendentes: number;
  ultimaSync: number | null;
  emAndamento: boolean;
  erro: string | null;
}

let syncEmAndamento = false;
let syncStatus: SyncStatus = {
  pendentes: 0,
  ultimaSync: null,
  emAndamento: false,
  erro: null
};

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

function atualizarStatus(parcial: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...parcial };
}

export async function contarPendentes(): Promise<number> {
  const db = getLocalDb();
  const resultado = db.prepare('SELECT COUNT(*) as total FROM sync_outbox WHERE enviado_em IS NULL').get() as { total: number };
  return resultado.total;
}

export async function executarPush(): Promise<{ enviados: number; erros: number }> {
  if (syncEmAndamento) {
    throw new Error('Sincronização já em andamento');
  }

  syncEmAndamento = true;
  atualizarStatus({ emAndamento: true, erro: null });

  let enviados = 0;
  let erros = 0;

  try {
    const db = getLocalDb();
    const pendentes = db.prepare(`
      SELECT id, tabela, registro_id, operacao, dados
      FROM sync_outbox
      WHERE enviado_em IS NULL
      ORDER BY criado_em ASC
      LIMIT ?
    `).all(config.sync.batchSize) as Array<{
      id: number;
      tabela: string;
      registro_id: string;
      operacao: 'inserir' | 'atualizar' | 'inativar';
      dados: Record<string, unknown>;
    }>;

    for (const item of pendentes) {
      try {
        await pushItem(item);
        db.prepare('UPDATE sync_outbox SET enviado_em = ?, tentativas = tentativas + 1 WHERE id = ?')
          .run(Date.now(), item.id);
        enviados++;
      } catch (error) {
        erros++;
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        db.prepare('UPDATE sync_outbox SET tentativas = tentativas + 1, ultimo_erro = ? WHERE id = ?')
          .run(mensagem, item.id);
      }
    }

    atualizarStatus({ ultimaSync: Date.now(), pendentes: await contarPendentes() });
    return { enviados, erros };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro na sincronização';
    atualizarStatus({ erro: mensagem });
    throw error;
  } finally {
    syncEmAndamento = false;
    atualizarStatus({ emAndamento: false });
  }
}

async function pushItem(item: {
  tabela: string;
  registro_id: string;
  operacao: 'inserir' | 'atualizar' | 'inativar';
  dados: Record<string, unknown>;
}): Promise<void> {
  await runInTransaction(async (conn) => {
    const { tabela, registro_id, operacao, dados } = item;

    switch (operacao) {
      case 'inserir': {
        const colunas = Object.keys(dados).join(', ');
        const placeholders = Object.keys(dados).map(() => '?').join(', ');
        const valores = Object.values(dados) as (string | number | boolean | null)[];
        await conn.execute(
          `INSERT INTO \`${tabela}\` (${colunas}) VALUES (${placeholders})`,
          valores
        );
        break;
      }
      case 'atualizar': {
        const sets = Object.keys(dados).filter(k => k !== 'id').map(k => `\`${k}\` = ?`).join(', ');
        const valores = [...Object.entries(dados).filter(([k]) => k !== 'id').map(([, v]) => v), registro_id] as (string | number | boolean | null)[];
        await conn.execute(
          `UPDATE \`${tabela}\` SET ${sets} WHERE id = ?`,
          valores
        );
        break;
      }
      case 'inativar': {
        await conn.execute(
          `UPDATE \`${tabela}\` SET ativo = FALSE, atualizado_em = NOW() WHERE id = ?`,
          [registro_id]
        );
        break;
      }
    }
  });
}

export async function executarPull(): Promise<{ atualizados: number }> {
  // Implementação futura: buscar alterações do MySQL e aplicar no SQLite
  // Requer controle de versão/timestamp por tabela
  return { atualizados: 0 };
}

export async function resolverConflito(
  conflitoId: number,
  resolucao: 'local' | 'central' | 'mesclar',
  dadosMesclados?: Record<string, unknown>
): Promise<void> {
  const db = getLocalDb();
  const conflito = db.prepare('SELECT * FROM sync_conflitos WHERE id = ?').get(conflitoId) as
    | { id: number; tabela: string; registro_id: string; dados_local: string; dados_central: string }
    | undefined;

  if (!conflito) throw new Error('Conflito não encontrado');

  let dadosFinais: Record<string, unknown>;

  switch (resolucao) {
    case 'local':
      dadosFinais = JSON.parse(conflito.dados_local);
      break;
    case 'central':
      dadosFinais = JSON.parse(conflito.dados_central);
      break;
    case 'mesclar':
      if (!dadosMesclados) throw new Error('Dados mesclados obrigatórios para resolução por mesclagem');
      dadosFinais = dadosMesclados;
      break;
  }

  await runInTransaction(async (conn) => {
    const sets = Object.keys(dadosFinais).filter(k => k !== 'id').map(k => `\`${k}\` = ?`).join(', ');
    const valores = [...Object.entries(dadosFinais).filter(([k]) => k !== 'id').map(([, v]) => v), conflito.registro_id] as (string | number | boolean | null)[];
    await conn.execute(
      `UPDATE \`${conflito.tabela}\` SET ${sets} WHERE id = ?`,
      valores
    );
  });

  db.prepare('UPDATE sync_conflitos SET status = ?, resolvido_por = ?, resolvido_em = ? WHERE id = ?')
    .run('resolvido', 'sistema', Date.now(), conflitoId);
}