// Módulo de sincronização - outbox, push, pull, conflitos
import { getLocalDb, obterConexaoLocal } from '../db/local/client';
import { runInTransaction } from '../db/central/client';
import { config } from '../config/env';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { colunasSincronizaveis } from '../db/local/tabelas-sincronizaveis';
import { agoraEmSegundos } from '../modules/admin/transacao';
import { OutboxRepository } from '../modules/admin/outbox.repository';

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
  return new OutboxRepository(obterConexaoLocal()).contarPendencias();
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
      ORDER BY id ASC
      LIMIT ?
    `).all(config.sync.batchSize) as Array<{
      id: number;
      tabela: string;
      registro_id: string;
      operacao: 'inserir' | 'atualizar' | 'inativar';
      dados: string;
    }>;

    for (const item of pendentes) {
      try {
        await pushItem(item);
        db.prepare('UPDATE sync_outbox SET enviado_em = ?, tentativas = tentativas + 1, ultimo_erro = NULL WHERE id = ?')
          .run(agoraEmSegundos(), item.id);
        enviados++;
      } catch {
        erros++;
        const mensagem = 'Não foi possível enviar o registro ao banco central.';
        db.prepare('UPDATE sync_outbox SET tentativas = tentativas + 1, ultimo_erro = ? WHERE id = ?')
          .run(mensagem, item.id);
        atualizarStatus({ erro: mensagem });
        // Um envio mais novo pode depender deste ou atualizar o mesmo registro.
        break;
      }
    }

    atualizarStatus({
      pendentes: await contarPendentes(),
      ...(enviados > 0 && erros === 0 && { ultimaSync: Date.now() })
    });
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
  dados: string;
}): Promise<void> {
  const { tabela, registro_id: id } = item;
  const colunas = colunasSincronizaveis.get(tabela);
  if (!colunas) throw new Error('Tabela de sincronização inválida.');
  const dados = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).parse(JSON.parse(item.dados));
  if ((dados.id !== undefined && dados.id !== id) || Object.keys(dados).some((campo) => !colunas.has(campo))) {
    throw new Error('Dados da fila de sincronização inválidos.');
  }
  const valores = Object.entries(dados).filter(([campo]) => campo !== 'id').map(([campo, valor]) => {
    const coluna = colunas.get(campo);
    const convertido = coluna?.columnType === 'SQLiteTimestamp' && typeof valor === 'number'
      ? new Date(valor * 1000)
      : valor;
    return [campo, convertido] as const;
  });
  if (item.operacao === 'inativar' && !valores.some(([campo]) => campo === 'ativo')) {
    valores.push(['ativo', 0]);
  }
  if (!valores.length) throw new Error('Dados da fila de sincronização vazios.');
  const tabelaSql = crase(tabela);
  await runInTransaction(async (conn) => {
    const [existentes] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM ${tabelaSql} WHERE id = ? FOR UPDATE`, [id]
    );
    if (!existentes.length) {
      const campos = valores.map(([campo]) => crase(campo));
      await conn.execute(
        `INSERT INTO ${tabelaSql} (id, ${campos.join(', ')}) VALUES (?, ${campos.map(() => '?').join(', ')})`,
        [id, ...valores.map(([, valor]) => valor)]
      );
    } else if (!['auditoria', 'movimentacoes_estoque'].includes(tabela)) {
      const campos = valores.map(([campo]) => crase(campo) + ' = ?').join(', ');
      await conn.execute(
        `UPDATE ${tabelaSql} SET ${campos} WHERE id = ?`, [...valores.map(([, valor]) => valor), id]
      );
    }
  });
}

function crase(nome: string): string {
  // Os identificadores já foram conferidos contra as tabelas e colunas do Drizzle.
  return '\x60' + nome + '\x60';
}

export async function executarPull(): Promise<{ atualizados: number }> {
  // A aplicação de registros remotos ainda depende da implementação do pull.
  return { atualizados: 0 };
}
