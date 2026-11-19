// Schema Drizzle para SQLite local
// Tabelas definidas conforme AGENTS.md seção 7
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const colaboradores = sqliteTable('colaboradores', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cpf: text('cpf').notNull().unique(),
  cargo: text('cargo').notNull(),
  crmv: text('crmv'),
  telefone: text('telefone'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  cpfIdx: index('idx_colaboradores_cpf').on(table.cpf),
  ativoIdx: index('idx_colaboradores_ativo').on(table.ativo)
}));

export const usuarios = sqliteTable('usuarios', {
  id: text('id').primaryKey(),
  colaboradorId: text('colaborador_id').notNull().unique().references(() => colaboradores.id),
  login: text('login').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  perfil: text('perfil', { enum: ['MASTER', 'VETERINARIO', 'ATENDENTE'] }).notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  ultimoLoginEm: integer('ultimo_login_em', { mode: 'timestamp' }),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  loginIdx: index('idx_usuarios_login').on(table.login),
  colaboradorIdx: index('idx_usuarios_colaborador').on(table.colaboradorId)
}));

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cpf: text('cpf').notNull().unique(),
  telefone: text('telefone'),
  email: text('email'),
  cep: text('cep'),
  logradouro: text('logradouro'),
  numero: text('numero'),
  complemento: text('complemento'),
  bairro: text('bairro'),
  cidade: text('cidade'),
  uf: text('uf', { length: 2 }),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  cpfIdx: index('idx_clientes_cpf').on(table.cpf),
  nomeIdx: index('idx_clientes_nome').on(table.nome),
  ativoIdx: index('idx_clientes_ativo').on(table.ativo)
}));

export const animais = sqliteTable('animais', {
  id: text('id').primaryKey(),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  nome: text('nome').notNull(),
  especie: text('especie').notNull(),
  raca: text('raca'),
  sexo: text('sexo', { enum: ['M', 'F'] }).notNull(),
  dataNascimento: integer('data_nascimento', { mode: 'timestamp' }),
  pesoKg: real('peso_kg'),
  observacoes: text('observacoes'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  clienteIdx: index('idx_animais_cliente').on(table.clienteId),
  ativoIdx: index('idx_animais_ativo').on(table.ativo)
}));

export const medicamentos = sqliteTable('medicamentos', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  principioAtivo: text('principio_ativo'),
  unidade: text('unidade').notNull(),
  diasAlerta: integer('dias_alerta').notNull().default(3),
  consumoInicialDiario: real('consumo_inicial_diario'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  nomeIdx: index('idx_medicamentos_nome').on(table.nome),
  ativoIdx: index('idx_medicamentos_ativo').on(table.ativo)
}));

export const fornecedores = sqliteTable('fornecedores', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo', { enum: ['NACIONAL', 'IMPORTADO'] }).notNull(),
  contato: text('contato'),
  telefone: text('telefone'),
  email: text('email'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  ativoIdx: index('idx_fornecedores_ativo').on(table.ativo)
}));

// Tabelas de sincronização (somente SQLite local)
export const syncOutbox = sqliteTable('sync_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tabela: text('tabela').notNull(),
  registroId: text('registro_id').notNull(),
  operacao: text('operacao', { enum: ['inserir', 'atualizar', 'inativar'] }).notNull(),
  dados: text('dados', { mode: 'json' }).notNull(),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  tentativas: integer('tentativas').notNull().default(0),
  ultimoErro: text('ultimo_erro'),
  enviadoEm: integer('enviado_em', { mode: 'timestamp' })
}, (table) => ({
  tabelaRegistroIdx: index('idx_sync_outbox_tabela_registro').on(table.tabela, table.registroId),
  enviadoIdx: index('idx_sync_outbox_enviado').on(table.enviadoEm)
}));

export const syncEstado = sqliteTable('sync_estado', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull()
});

export const syncConflitos = sqliteTable('sync_conflitos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tabela: text('tabela').notNull(),
  registroId: text('registro_id').notNull(),
  tipo: text('tipo').notNull(),
  dadosLocal: text('dados_local', { mode: 'json' }).notNull(),
  dadosCentral: text('dados_central', { mode: 'json' }).notNull(),
  status: text('status', { enum: ['aberto', 'resolvido'] }).notNull().default('aberto'),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  resolvidoPor: text('resolvido_por'),
  resolvidoEm: integer('resolvido_em', { mode: 'timestamp' })
}, (table) => ({
  tabelaRegistroIdx: index('idx_sync_conflitos_tabela_registro').on(table.tabela, table.registroId),
  statusIdx: index('idx_sync_conflitos_status').on(table.status)
}));

export type Colaborador = typeof colaboradores.$inferSelect;
export type NovoColaborador = typeof colaboradores.$inferInsert;
export type Usuario = typeof usuarios.$inferSelect;
export type NovoUsuario = typeof usuarios.$inferInsert;
export type Cliente = typeof clientes.$inferSelect;
export type NovoCliente = typeof clientes.$inferInsert;
export type Animal = typeof animais.$inferSelect;
export type NovoAnimal = typeof animais.$inferInsert;
export type Medicamento = typeof medicamentos.$inferSelect;
export type NovoMedicamento = typeof medicamentos.$inferInsert;
export type Fornecedor = typeof fornecedores.$inferSelect;
export type NovoFornecedor = typeof fornecedores.$inferInsert;