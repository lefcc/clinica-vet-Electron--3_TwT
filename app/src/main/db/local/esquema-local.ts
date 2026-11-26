import { join } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { BancoSql } from '../banco-sql';

export class EsquemaLocal {
  constructor(private readonly banco: BancoSql) {}

  aplicar(): void {
    const migrations = readMigrationFiles({ migrationsFolder: join(__dirname, 'migrations') });
    this.banco.transacao(() => {
      const { user_version } = this.banco.prepare('PRAGMA user_version').get() as { user_version: number };
      if (user_version > migrations.length) throw new Error('Este banco exige uma versão mais recente do aplicativo.');
      for (const migration of migrations.slice(user_version)) {
        for (const sql of migration.sql) this.banco.exec(sql);
      }
      this.banco.exec('PRAGMA user_version = ' + migrations.length);
    });
  }
}
