// Schema Drizzle para MySQL central
// Mesmas tabelas do SQLite (exceto sync_outbox, sync_estado, sync_conflitos)
import { mysqlTable, varchar, text, int, decimal, timestamp, index, boolean } from 'drizzle-orm/mysql-core';

export const colaboradores = mysqlTable('colaboradores', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  cargo: varchar('cargo', { length: 100 }).notNull(),
  crmv: varchar('crmv', { length: 20 }),
  telefone: varchar('telefone', { length: 20 }),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow()
}, (table) => ({
  cpfIdx: index('idx_colaboradores_cpf').on(table.cpf),
  ativoIdx: index('idx_colaboradores_ativo').on(table.ativo)
}));

export const usuarios = mysqlTable('usuarios', {
  id: varchar('id', { length: 36 }).primaryKey(),
  colaboradorId: varchar('colaborador_id', { length: 36 }).notNull().unique().references(() => colaboradores.id),
  login: varchar('login', { length: 100 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  perfil: varchar('perfil', { length: 20, enum: ['MASTER', 'VETERINARIO', 'ATENDENTE'] }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
  ultimoLoginEm: timestamp('ultimo_login_em'),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow()
}, (table) => ({
  loginIdx: index('idx_usuarios_login').on(table.login),
  colaboradorIdx: index('idx_usuarios_colaborador').on(table.colaboradorId)
}));

export const clientes = mysqlTable('clientes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  cep: varchar('cep', { length: 9 }),
  logradouro: varchar('logradouro', { length: 255 }),
  numero: varchar('numero', { length: 20 }),
  complemento: varchar('complemento', { length: 100 }),
  bairro: varchar('bairro', { length: 100 }),
  cidade: varchar('cidade', { length: 100 }),
  uf: varchar('uf', { length: 2 }),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow()
}, (table) => ({
  cpfIdx: index('idx_clientes_cpf').on(table.cpf),
  nomeIdx: index('idx_clientes_nome').on(table.nome),
  ativoIdx: index('idx_clientes_ativo').on(table.ativo)
}));

export const animais = mysqlTable('animais', {
  id: varchar('id', { length: 36 }).primaryKey(),
  clienteId: varchar('cliente_id', { length: 36 }).notNull().references(() => clientes.id),
  nome: varchar('nome', { length: 255 }).notNull(),
  especie: varchar('especie', { length: 100 }).notNull(),
  raca: varchar('raca', { length: 100 }),
  sexo: varchar('sexo', { length: 1, enum: ['M', 'F'] }).notNull(),
  dataNascimento: timestamp('data_nascimento'),
  pesoKg: decimal('peso_kg', { precision: 6, scale: 2 }),
  observacoes: text('observacoes'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow()
}, (table) => ({
  clienteIdx: index('idx_animais_cliente').on(table.clienteId),
  ativoIdx: index('idx_animais_ativo').on(table.ativo)
}));

export const medicamentos = mysqlTable('medicamentos', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  principioAtivo: varchar('principio_ativo', { length: 255 }),
  unidade: varchar('unidade', { length: 50 }).notNull(),
  diasAlerta: int('dias_alerta').notNull().default(3),
  consumoInicialDiario: decimal('consumo_inicial_diario', { precision: 10, scale: 2 }),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow()
}, (table) => ({
  nomeIdx: index('idx_medicamentos_nome').on(table.nome),
  ativoIdx: index('idx_medicamentos_ativo').on(table.ativo)
}));

export const fornecedores = mysqlTable('fornecedores', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: varchar('tipo', { length: 20, enum: ['NACIONAL', 'IMPORTADO'] }).notNull(),
  contato: varchar('contato', { length: 255 }),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow()
}, (table) => ({
  ativoIdx: index('idx_fornecedores_ativo').on(table.ativo)
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