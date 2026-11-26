import { join } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { BancoSql } from '../banco-sql';

<<<<<<< Updated upstream
=======
// cria TODAS as tabelas do schema local (offline-first).
// é "IF NOT EXISTS", então pode rodar toda vez que o app abre sem estragar nada.
// TODO: quando as migrations do drizzle forem aplicadas, isso pode ser simplificado.
>>>>>>> Stashed changes
export class EsquemaLocal {
  constructor(private readonly banco: BancoSql) {}

  aplicar(): void {
<<<<<<< Updated upstream
    const migrations = readMigrationFiles({ migrationsFolder: join(__dirname, 'migrations') });
    this.banco.transacao(() => {
      const { user_version } = this.banco.prepare('PRAGMA user_version').get() as { user_version: number };
      if (user_version > migrations.length) throw new Error('Este banco exige uma versão mais recente do aplicativo.');
      for (const migration of migrations.slice(user_version)) {
        for (const sql of migration.sql) this.banco.exec(sql);
      }
      this.banco.exec('PRAGMA user_version = ' + migrations.length);
    });
=======
    this.banco.exec(`
      -- ============================================================
      -- COLABORADORES & USUÁRIOS (auth)
      -- ============================================================
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

      -- ============================================================
      -- CLIENTES & ANIMAIS
      -- ============================================================
      CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        telefone TEXT,
        email TEXT,
        cep TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        uf TEXT(2),
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes (cpf);
      CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
      CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes (ativo);

      CREATE TABLE IF NOT EXISTS animais (
        id TEXT PRIMARY KEY,
        cliente_id TEXT NOT NULL REFERENCES clientes (id),
        nome TEXT NOT NULL,
        especie TEXT NOT NULL,
        raca TEXT,
        sexo TEXT NOT NULL CHECK (sexo IN ('M', 'F')),
        data_nascimento INTEGER,
        peso_kg REAL,
        observacoes TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_animais_cliente ON animais (cliente_id);
      CREATE INDEX IF NOT EXISTS idx_animais_ativo ON animais (ativo);

      -- ============================================================
      -- AGENDA (agendamentos)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS agendamentos (
        id TEXT PRIMARY KEY,
        cliente_id TEXT REFERENCES clientes (id),
        animal_id TEXT NOT NULL REFERENCES animais (id),
        veterinario_id TEXT NOT NULL REFERENCES colaboradores (id),
        inicio INTEGER NOT NULL,
        duracao_min INTEGER NOT NULL,
        motivo TEXT,
        status TEXT NOT NULL DEFAULT 'AGENDADO' CHECK (status IN ('AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO')),
        confirmado INTEGER NOT NULL DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_agendamentos_animal ON agendamentos (animal_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_veterinario ON agendamentos (veterinario_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio ON agendamentos (inicio);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos (status);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_ativo ON agendamentos (ativo);

      -- ============================================================
      -- CONSULTAS & PRESCRIÇÕES
      -- ============================================================
      CREATE TABLE IF NOT EXISTS consultas (
        id TEXT PRIMARY KEY,
        agendamento_id TEXT REFERENCES agendamentos (id),
        animal_id TEXT NOT NULL REFERENCES animais (id),
        veterinario_id TEXT NOT NULL REFERENCES colaboradores (id),
        data INTEGER NOT NULL,
        anamnese TEXT,
        diagnostico TEXT,
        observacoes TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_consultas_animal ON consultas (animal_id);
      CREATE INDEX IF NOT EXISTS idx_consultas_veterinario ON consultas (veterinario_id);
      CREATE INDEX IF NOT EXISTS idx_consultas_data ON consultas (data);
      CREATE INDEX IF NOT EXISTS idx_consultas_ativo ON consultas (ativo);

      CREATE TABLE IF NOT EXISTS prescricoes (
        id TEXT PRIMARY KEY,
        consulta_id TEXT NOT NULL REFERENCES consultas (id),
        medicamento_id TEXT NOT NULL REFERENCES medicamentos (id),
        quantidade INTEGER NOT NULL,
        posologia TEXT,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_prescricoes_consulta ON prescricoes (consulta_id);
      CREATE INDEX IF NOT EXISTS idx_prescricoes_medicamento ON prescricoes (medicamento_id);

      -- ============================================================
      -- ESTOQUE (medicamentos, lotes, movimentações)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS medicamentos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        principio_ativo TEXT,
        unidade TEXT NOT NULL,
        dias_alerta INTEGER NOT NULL DEFAULT 3,
        consumo_inicial_diario REAL,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_medicamentos_nome ON medicamentos (nome);
      CREATE INDEX IF NOT EXISTS idx_medicamentos_ativo ON medicamentos (ativo);

      CREATE TABLE IF NOT EXISTS estoque_lotes (
        id TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL REFERENCES medicamentos (id),
        numero TEXT NOT NULL,
        validade INTEGER NOT NULL,
        quantidade_inicial INTEGER NOT NULL,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_estoque_lotes_medicamento ON estoque_lotes (medicamento_id);
      CREATE INDEX IF NOT EXISTS idx_estoque_lotes_validade ON estoque_lotes (validade);

      CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
        id TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL REFERENCES medicamentos (id),
        tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
        quantidade INTEGER NOT NULL,
        lote_id TEXT REFERENCES estoque_lotes (id),
        motivo TEXT,
        referencia_id TEXT,
        referencia_tipo TEXT,
        usuario_id TEXT NOT NULL REFERENCES colaboradores (id),
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_estoque_mov_medicamento ON estoque_movimentacoes (medicamento_id);
      CREATE INDEX IF NOT EXISTS idx_estoque_mov_lote ON estoque_movimentacoes (lote_id);
      CREATE INDEX IF NOT EXISTS idx_estoque_mov_referencia ON estoque_movimentacoes (referencia_id, referencia_tipo);
      CREATE INDEX IF NOT EXISTS idx_estoque_mov_criado ON estoque_movimentacoes (criado_em);

      -- ============================================================
      -- FORNECEDORES
      -- ============================================================
      CREATE TABLE IF NOT EXISTS fornecedores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('NACIONAL', 'IMPORTADO')),
        contato TEXT,
        telefone TEXT,
        email TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores (ativo);

      -- ============================================================
      -- SINCRONIZAÇÃO (somente SQLite local)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabela TEXT NOT NULL,
        registro_id TEXT NOT NULL,
        operacao TEXT NOT NULL CHECK (operacao IN ('inserir', 'atualizar', 'inativar')),
        dados TEXT NOT NULL,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        tentativas INTEGER NOT NULL DEFAULT 0,
        ultimo_erro TEXT,
        enviado_em INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_tabela_registro ON sync_outbox (tabela, registro_id);
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_enviado ON sync_outbox (enviado_em);

      CREATE TABLE IF NOT EXISTS sync_estado (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_conflitos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabela TEXT NOT NULL,
        registro_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        dados_local TEXT NOT NULL,
        dados_central TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido')),
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        resolvido_por TEXT,
        resolvido_em INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_sync_conflitos_tabela_registro ON sync_conflitos (tabela, registro_id);
      CREATE INDEX IF NOT EXISTS idx_sync_conflitos_status ON sync_conflitos (status);
    `);
>>>>>>> Stashed changes
  }
}
