// Cliente SQLite local com better-sqlite3
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../../config/env';

let dbInstance: Database.Database | null = null;

export function getLocalDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = config.sqlitePath;
  const dbDir = path.dirname(dbPath);

  // Garantir que o diretório existe
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath);

  // Configurações de performance e integridade
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

export function closeLocalDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Helper para transações com sync_outbox atômico
export function runInTransaction<T>(fn: (db: Database.Database) => T): T {
  const db = getLocalDb();
  const transaction = db.transaction(fn);
  return transaction(db);
}