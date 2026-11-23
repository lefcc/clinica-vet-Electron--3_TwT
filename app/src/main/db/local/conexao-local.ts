// a "conexao.js" do projeto: abre o banco SQLite local (um arquivo por computador)
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import type { BancoSql, ComandoSql } from '../banco-sql';

export class ConexaoLocal implements BancoSql {
  private banco: Database.Database | null = null;

  constructor(private readonly caminho: string) {}

  abrir(): void {
    if (this.banco) return;

    // garante que a pasta do arquivo existe
    fs.mkdirSync(path.dirname(this.caminho), { recursive: true });

    const banco = new Database(this.caminho);
    banco.pragma('journal_mode = WAL');
    banco.pragma('synchronous = NORMAL');
    banco.pragma('foreign_keys = ON');
    banco.pragma('busy_timeout = 5000');
    this.banco = banco;
  }

  fechar(): void {
    this.banco?.close();
    this.banco = null;
  }

  /** o Database "cru", pros módulos antigos que ainda usam ele direto */
  bruto(): Database.Database {
    return this.obter();
  }

  exec(sql: string): void {
    this.obter().exec(sql);
  }

  prepare(sql: string): ComandoSql {
    const comando = this.obter().prepare(sql);
    return {
      get: (...parametros) => comando.get(...parametros),
      run: (...parametros) => comando.run(...parametros),
      all: (...parametros) => comando.all(...parametros),
    };
  }

  transacao<T>(funcao: () => T): T {
    return this.obter().transaction(funcao)();
  }

  private obter(): Database.Database {
    if (!this.banco) throw new Error('O banco local ainda não foi aberto.');
    return this.banco;
  }
}
