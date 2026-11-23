import type { BancoSql } from '../banco-sql';

// cria as tabelas que o login precisa (colaboradores e usuarios), iguais ao schema.ts.
// é "IF NOT EXISTS", então pode rodar toda vez que o app abre sem estragar nada.
// TODO: quando as migrations do drizzle existirem, elas assumem o lugar disso
export class EsquemaLocal {
  constructor(private readonly banco: BancoSql) {}

  aplicar(): void {
    this.banco.exec(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        cargo TEXT NOT NULL,
        crmv TEXT,
        telefone TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON colaboradores (cpf);
      CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo ON colaboradores (ativo);

      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        colaborador_id TEXT NOT NULL UNIQUE REFERENCES colaboradores (id),
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL CHECK (perfil IN ('MASTER', 'VETERINARIO', 'ATENDENTE')),
        ativo INTEGER NOT NULL DEFAULT 1,
        ultimo_login_em INTEGER,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios (login);
      CREATE INDEX IF NOT EXISTS idx_usuarios_colaborador ON usuarios (colaborador_id);
    `);
  }
}
