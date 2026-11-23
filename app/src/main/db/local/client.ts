// banco local único do app (singleton), pros módulos que já usam getLocalDb()
import type Database from 'better-sqlite3';
import { config } from '../../config/env';
import { ConexaoLocal } from './conexao-local';

const conexao = new ConexaoLocal(config.sqlitePath);

/** abre o banco (se ainda não estiver aberto) e devolve a conexão */
export function obterConexaoLocal(): ConexaoLocal {
  conexao.abrir();
  return conexao;
}

export function getLocalDb(): Database.Database {
  return obterConexaoLocal().bruto();
}

export function closeLocalDb(): void {
  conexao.fechar();
}

// helper pra transação com sync_outbox atômico
export function runInTransaction<T>(fn: (db: Database.Database) => T): T {
  const db = getLocalDb();
  const transaction = db.transaction(fn);
  return transaction(db);
}
