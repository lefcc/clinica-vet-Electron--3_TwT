// Schema Drizzle para SQLite local
// Tabelas definidas conforme AGENTS.md seção 7
import { sqliteTable, text, integer, real, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
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
  perfilValido: check('ck_usuarios_perfil', sql`${table.perfil} IN ('MASTER', 'VETERINARIO', 'ATENDENTE')`),
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
  sexoValido: check('ck_animais_sexo', sql`${table.sexo} IN ('M', 'F')`),
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
  tipoValido: check('ck_fornecedores_tipo', sql`${table.tipo} IN ('NACIONAL', 'IMPORTADO')`),
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
  operacaoValido: check('ck_sync_outbox_operacao', sql`${table.operacao} IN ('inserir', 'atualizar', 'inativar')`),
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
  statusValido: check('ck_sync_conflitos_status', sql`${table.status} IN ('aberto', 'resolvido')`),
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
export const agendamentos = sqliteTable('agendamentos', {
  id: text('id').primaryKey(),
  clienteId: text('cliente_id').references(() => clientes.id),
  animalId: text('animal_id').notNull().references(() => animais.id),
  veterinarioId: text('veterinario_id').notNull().references(() => colaboradores.id),
  inicio: integer('inicio', { mode: 'timestamp' }).notNull(),
  duracaoMin: integer('duracao_min').notNull(),
  motivo: text('motivo'),
  status: text('status', { enum: ['AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO'] }).notNull().default('AGENDADO'),
  confirmado: integer('confirmado', { mode: 'boolean' }).notNull().default(false),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  animalIdx: index('idx_agendamentos_animal').on(table.animalId),
  veterinarioIdx: index('idx_agendamentos_veterinario').on(table.veterinarioId),
  inicioIdx: index('idx_agendamentos_inicio').on(table.inicio),
  statusIdx: index('idx_agendamentos_status').on(table.status),
  ativoIdx: index('idx_agendamentos_ativo').on(table.ativo)
}));

export const consultas = sqliteTable('consultas', {
  id: text('id').primaryKey(),
  agendamentoId: text('agendamento_id').references(() => agendamentos.id),
  animalId: text('animal_id').notNull().references(() => animais.id),
  veterinarioId: text('veterinario_id').notNull().references(() => colaboradores.id),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  anamnese: text('anamnese'),
  diagnostico: text('diagnostico'),
  observacoes: text('observacoes'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  animalIdx: index('idx_consultas_animal').on(table.animalId),
  veterinarioIdx: index('idx_consultas_veterinario').on(table.veterinarioId),
  dataIdx: index('idx_consultas_data').on(table.data),
  ativoIdx: index('idx_consultas_ativo').on(table.ativo)
}));

export const prescricoes = sqliteTable('prescricoes', {
  id: text('id').primaryKey(),
  consultaId: text('consulta_id').notNull().references(() => consultas.id),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  quantidade: integer('quantidade').notNull(),
  posologia: text('posologia'),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  consultaIdx: index('idx_prescricoes_consulta').on(table.consultaId),
  medicamentoIdx: index('idx_prescricoes_medicamento').on(table.medicamentoId)
}));

export const estoqueLotes = sqliteTable('estoque_lotes', {
  id: text('id').primaryKey(),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  numero: text('numero').notNull(),
  validade: integer('validade', { mode: 'timestamp' }).notNull(),
  quantidadeInicial: integer('quantidade_inicial').notNull(),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  medicamentoIdx: index('idx_estoque_lotes_medicamento').on(table.medicamentoId),
  validadeIdx: index('idx_estoque_lotes_validade').on(table.validade)
}));

export const estoqueMovimentacoes = sqliteTable('estoque_movimentacoes', {
  id: text('id').primaryKey(),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  tipo: text('tipo', { enum: ['ENTRADA', 'SAIDA', 'AJUSTE'] }).notNull(),
  quantidade: integer('quantidade').notNull(),
  loteId: text('lote_id').references(() => estoqueLotes.id),
  motivo: text('motivo'),
  referenciaId: text('referencia_id'),
  referenciaTipo: text('referencia_tipo'),
  usuarioId: text('usuario_id').notNull().references(() => colaboradores.id),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  medicamentoIdx: index('idx_estoque_mov_medicamento').on(table.medicamentoId),
  loteIdx: index('idx_estoque_mov_lote').on(table.loteId),
  referenciaIdx: index('idx_estoque_mov_referencia').on(table.referenciaId, table.referenciaTipo),
  criadoEmIdx: index('idx_estoque_mov_criado').on(table.criadoEm)
}));

export type Agendamento = typeof agendamentos.$inferSelect;
export type NovoAgendamento = typeof agendamentos.$inferInsert;
export type Consulta = typeof consultas.$inferSelect;
export type NovaConsulta = typeof consultas.$inferInsert;
export type Prescricao = typeof prescricoes.$inferSelect;
export type NovaPrescricao = typeof prescricoes.$inferInsert;
export type EstoqueLote = typeof estoqueLotes.$inferSelect;
export type NovoEstoqueLote = typeof estoqueLotes.$inferInsert;
export type EstoqueMovimentacao = typeof estoqueMovimentacoes.$inferSelect;
export type NovaEstoqueMovimentacao = typeof estoqueMovimentacoes.$inferInsert;

export type Fornecedor = typeof fornecedores.$inferSelect;
export type NovoFornecedor = typeof fornecedores.$inferInsert;

export const agendamentos = sqliteTable('agendamentos', {
  id: text('id').primaryKey().notNull(),
  animalId: text('animal_id').notNull().references(() => animais.id),
  veterinarioId: text('veterinario_id').notNull().references(() => colaboradores.id),
  inicio: integer('inicio', { mode: 'timestamp' }).notNull(),
  duracaoMin: integer('duracao_min').notNull(),
  motivo: text('motivo'),
  status: text('status', { enum: ['AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO'] }).notNull().default('AGENDADO'),
  confirmado: integer('confirmado', { mode: 'boolean' }).notNull().default(false),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  statusValido: check('ck_agendamentos_status', sql`${table.status} IN ('AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO')`),
  idxAgendamentosVeterinarioId: index('idx_agendamentos_veterinario_id').on(table.veterinarioId, table.inicio),
  idxAgendamentosAnimalId: index('idx_agendamentos_animal_id').on(table.animalId)
}));

export const consultas = sqliteTable('consultas', {
  id: text('id').primaryKey().notNull(),
  animalId: text('animal_id').notNull().references(() => animais.id),
  veterinarioId: text('veterinario_id').notNull().references(() => colaboradores.id),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  anamnese: text('anamnese').notNull(),
  diagnostico: text('diagnostico'),
  observacoes: text('observacoes'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxConsultasAnimalId: index('idx_consultas_animal_id').on(table.animalId, table.data)
}));

export const prescricoesConsulta = sqliteTable('prescricoes_consulta', {
  id: text('id').primaryKey().notNull(),
  consultaId: text('consulta_id').notNull().references(() => consultas.id),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  quantidade: real('quantidade').notNull(),
  posologia: text('posologia'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxPrescricoesConsultaConsultaId: index('idx_prescricoes_consulta_consulta_id').on(table.consultaId)
}));

export const lotesEstoque = sqliteTable('lotes_estoque', {
  id: text('id').primaryKey().notNull(),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  numero: text('numero').notNull(),
  validade: text('validade').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxLotesEstoqueMedicamentoId: index('idx_lotes_estoque_medicamento_id').on(table.medicamentoId, table.validade),
  uqLotesEstoqueMedicamentoId: uniqueIndex('uq_lotes_estoque_medicamento_id').on(table.medicamentoId, table.numero)
}));

export const movimentacoesEstoque = sqliteTable('movimentacoes_estoque', {
  id: text('id').primaryKey().notNull(),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  loteId: text('lote_id').notNull().references(() => lotesEstoque.id),
  consultaId: text('consulta_id').references(() => consultas.id),
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id),
  tipo: text('tipo', { enum: ['ENTRADA', 'SAIDA', 'AJUSTE'] }).notNull(),
  quantidade: real('quantidade').notNull(),
  motivo: text('motivo'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  tipoValido: check('ck_movimentacoes_estoque_tipo', sql`${table.tipo} IN ('ENTRADA', 'SAIDA', 'AJUSTE')`),
  idxMovimentacoesEstoqueMedicamentoId: index('idx_movimentacoes_estoque_medicamento_id').on(table.medicamentoId, table.criadoEm),
  idxMovimentacoesEstoqueLoteId: index('idx_movimentacoes_estoque_lote_id').on(table.loteId)
}));

export const alertasEstoque = sqliteTable('alertas_estoque', {
  id: text('id').primaryKey().notNull(),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  diasRestantes: integer('dias_restantes').notNull(),
  saldoAtual: real('saldo_atual').notNull(),
  consumoMedioDiario: real('consumo_medio_diario').notNull(),
  status: text('status', { enum: ['aberto', 'resolvido'] }).notNull().default('aberto'),
  resolvidoEm: integer('resolvido_em', { mode: 'timestamp' }),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  statusValido: check('ck_alertas_estoque_status', sql`${table.status} IN ('aberto', 'resolvido')`),
  idxAlertasEstoqueMedicamentoId: index('idx_alertas_estoque_medicamento_id').on(table.medicamentoId, table.status)
}));

export const fornecedoresPrecos = sqliteTable('fornecedores_precos', {
  id: text('id').primaryKey().notNull(),
  medicamentoId: text('medicamento_id').notNull().references(() => medicamentos.id),
  fornecedorId: text('fornecedor_id').notNull().references(() => fornecedores.id),
  moeda: text('moeda', { enum: ['BRL', 'USD'] }).notNull(),
  precoCentavos: integer('preco_centavos').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  moedaValido: check('ck_fornecedores_precos_moeda', sql`${table.moeda} IN ('BRL', 'USD')`),
  uqFornecedoresPrecosMedicamentoId: uniqueIndex('uq_fornecedores_precos_medicamento_id').on(table.medicamentoId, table.fornecedorId)
}));

export const cotacoesDolar = sqliteTable('cotacoes_dolar', {
  id: text('id').primaryKey().notNull(),
  valorCentavos: integer('valor_centavos').notNull(),
  dataCotacao: integer('data_cotacao', { mode: 'timestamp' }).notNull(),
  fonte: text('fonte').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxCotacoesDolarDataCotacao: index('idx_cotacoes_dolar_data_cotacao').on(table.dataCotacao)
}));

export const vacinasCatalogo = sqliteTable('vacinas_catalogo', {
  id: text('id').primaryKey().notNull(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  intervaloReforcoDias: integer('intervalo_reforco_dias').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxVacinasCatalogoNome: index('idx_vacinas_catalogo_nome').on(table.nome)
}));

export const vacinasAplicacoes = sqliteTable('vacinas_aplicacoes', {
  id: text('id').primaryKey().notNull(),
  animalId: text('animal_id').notNull().references(() => animais.id),
  vacinaId: text('vacina_id').notNull().references(() => vacinasCatalogo.id),
  veterinarioId: text('veterinario_id').notNull().references(() => colaboradores.id),
  data: text('data').notNull(),
  proximaDose: text('proxima_dose').notNull(),
  lote: text('lote'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxVacinasAplicacoesProximaDose: index('idx_vacinas_aplicacoes_proxima_dose').on(table.proximaDose),
  idxVacinasAplicacoesAnimalId: index('idx_vacinas_aplicacoes_animal_id').on(table.animalId)
}));

export const lembretesVacina = sqliteTable('lembretes_vacina', {
  id: text('id').primaryKey().notNull(),
  vacinaId: text('vacina_id').notNull().references(() => vacinasAplicacoes.id),
  mensagem: text('mensagem').notNull(),
  telefone: text('telefone').notNull(),
  status: text('status', { enum: ['pendente', 'enviado'] }).notNull().default('pendente'),
  enviadoEm: integer('enviado_em', { mode: 'timestamp' }),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  statusValido: check('ck_lembretes_vacina_status', sql`${table.status} IN ('pendente', 'enviado')`),
  uqLembretesVacinaVacinaId: uniqueIndex('uq_lembretes_vacina_vacina_id').on(table.vacinaId)
}));

export const servicos = sqliteTable('servicos', {
  id: text('id').primaryKey().notNull(),
  nome: text('nome').notNull(),
  valorCentavos: integer('valor_centavos').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxServicosNome: index('idx_servicos_nome').on(table.nome)
}));

export const orcamentos = sqliteTable('orcamentos', {
  id: text('id').primaryKey().notNull(),
  numero: integer('numero').notNull(),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  animalId: text('animal_id').references(() => animais.id),
  descontoCentavos: integer('desconto_centavos').notNull(),
  totalCentavos: integer('total_centavos').notNull(),
  formaPagamento: text('forma_pagamento').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  idxOrcamentosClienteId: index('idx_orcamentos_cliente_id').on(table.clienteId, table.criadoEm),
  uqOrcamentosNumero: uniqueIndex('uq_orcamentos_numero').on(table.numero)
}));

export const orcamentosItens = sqliteTable('orcamentos_itens', {
  id: text('id').primaryKey().notNull(),
  orcamentoId: text('orcamento_id').notNull().references(() => orcamentos.id),
  tipo: text('tipo', { enum: ['SERVICO', 'MEDICAMENTO'] }).notNull(),
  itemId: text('item_id').notNull(),
  descricao: text('descricao').notNull(),
  quantidade: integer('quantidade').notNull(),
  valorUnitarioCentavos: integer('valor_unitario_centavos').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  tipoValido: check('ck_orcamentos_itens_tipo', sql`${table.tipo} IN ('SERVICO', 'MEDICAMENTO')`),
  idxOrcamentosItensOrcamentoId: index('idx_orcamentos_itens_orcamento_id').on(table.orcamentoId)
}));

export const auditoria = sqliteTable('auditoria', {
  id: text('id').primaryKey().notNull(),
  ocorridoEm: integer('ocorrido_em', { mode: 'timestamp' }).notNull(),
  usuarioId: text('usuario_id'),
  usuarioNome: text('usuario_nome').notNull(),
  perfil: text('perfil', { enum: ['MASTER', 'VETERINARIO', 'ATENDENTE'] }).notNull(),
  acao: text('acao').notNull(),
  entidade: text('entidade').notNull(),
  registroId: text('registro_id'),
  descricao: text('descricao').notNull(),
  dadosAntes: text('dados_antes', { mode: 'json' }),
  dadosDepois: text('dados_depois', { mode: 'json' }),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  perfilValido: check('ck_auditoria_perfil', sql`${table.perfil} IN ('MASTER', 'VETERINARIO', 'ATENDENTE')`),
  idxAuditoriaOcorridoEm: index('idx_auditoria_ocorrido_em').on(table.ocorridoEm),
  idxAuditoriaEntidade: index('idx_auditoria_entidade').on(table.entidade, table.acao)
}));

export const configuracoes = sqliteTable('configuracoes', {
  id: text('id').primaryKey().notNull(),
  nomeClinica: text('nome_clinica').notNull(),
  telefone: text('telefone'),
  email: text('email'),
  cep: text('cep'),
  logradouro: text('logradouro'),
  numero: text('numero'),
  bairro: text('bairro'),
  cidade: text('cidade'),
  uf: text('uf'),
  templateLembrete: text('template_lembrete').notNull(),
  backupHorario: text('backup_horario').notNull(),
  backupManter: integer('backup_manter').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
});
