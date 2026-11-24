// Schema Drizzle para MySQL central
// Mesmas tabelas do SQLite (exceto sync_outbox, sync_estado, sync_conflitos)
import { mysqlTable, varchar, mysqlEnum, text, int, decimal, timestamp, date, index, uniqueIndex, boolean, json } from 'drizzle-orm/mysql-core';

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
  perfil: mysqlEnum('perfil', ['MASTER', 'VETERINARIO', 'ATENDENTE']).notNull(),
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
  sexo: mysqlEnum('sexo', ['M', 'F']).notNull(),
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
  tipo: mysqlEnum('tipo', ['NACIONAL', 'IMPORTADO']).notNull(),
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

export const agendamentos = mysqlTable('agendamentos', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  animalId: varchar('animal_id', { length: 36 }).notNull().references(() => animais.id),
  veterinarioId: varchar('veterinario_id', { length: 36 }).notNull().references(() => colaboradores.id),
  inicio: timestamp('inicio').notNull(),
  duracaoMin: int('duracao_min').notNull(),
  motivo: text('motivo'),
  status: mysqlEnum('status', ['AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO']).notNull().default('AGENDADO'),
  confirmado: boolean('confirmado').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxAgendamentosVeterinarioId: index('idx_agendamentos_veterinario_id').on(table.veterinarioId, table.inicio),
  idxAgendamentosAnimalId: index('idx_agendamentos_animal_id').on(table.animalId)
}));

export const consultas = mysqlTable('consultas', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  animalId: varchar('animal_id', { length: 36 }).notNull().references(() => animais.id),
  veterinarioId: varchar('veterinario_id', { length: 36 }).notNull().references(() => colaboradores.id),
  data: timestamp('data').notNull(),
  anamnese: text('anamnese').notNull(),
  diagnostico: text('diagnostico'),
  observacoes: text('observacoes'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxConsultasAnimalId: index('idx_consultas_animal_id').on(table.animalId, table.data)
}));

export const prescricoesConsulta = mysqlTable('prescricoes_consulta', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  consultaId: varchar('consulta_id', { length: 36 }).notNull().references(() => consultas.id),
  medicamentoId: varchar('medicamento_id', { length: 36 }).notNull().references(() => medicamentos.id),
  quantidade: decimal('quantidade', { precision: 14, scale: 4 }).notNull(),
  posologia: text('posologia'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxPrescricoesConsultaConsultaId: index('idx_prescricoes_consulta_consulta_id').on(table.consultaId)
}));

export const lotesEstoque = mysqlTable('lotes_estoque', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  medicamentoId: varchar('medicamento_id', { length: 36 }).notNull().references(() => medicamentos.id),
  numero: varchar('numero', { length: 100 }).notNull(),
  validade: date('validade', { mode: 'string' }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxLotesEstoqueMedicamentoId: index('idx_lotes_estoque_medicamento_id').on(table.medicamentoId, table.validade),
  uqLotesEstoqueMedicamentoId: uniqueIndex('uq_lotes_estoque_medicamento_id').on(table.medicamentoId, table.numero)
}));

export const movimentacoesEstoque = mysqlTable('movimentacoes_estoque', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  medicamentoId: varchar('medicamento_id', { length: 36 }).notNull().references(() => medicamentos.id),
  loteId: varchar('lote_id', { length: 36 }).notNull().references(() => lotesEstoque.id),
  consultaId: varchar('consulta_id', { length: 36 }).references(() => consultas.id),
  usuarioId: varchar('usuario_id', { length: 36 }).notNull().references(() => usuarios.id),
  tipo: mysqlEnum('tipo', ['ENTRADA', 'SAIDA', 'AJUSTE']).notNull(),
  quantidade: decimal('quantidade', { precision: 14, scale: 4 }).notNull(),
  motivo: text('motivo'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxMovimentacoesEstoqueMedicamentoId: index('idx_movimentacoes_estoque_medicamento_id').on(table.medicamentoId, table.criadoEm),
  idxMovimentacoesEstoqueLoteId: index('idx_movimentacoes_estoque_lote_id').on(table.loteId)
}));

export const alertasEstoque = mysqlTable('alertas_estoque', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  medicamentoId: varchar('medicamento_id', { length: 36 }).notNull().references(() => medicamentos.id),
  diasRestantes: int('dias_restantes').notNull(),
  saldoAtual: decimal('saldo_atual', { precision: 14, scale: 4 }).notNull(),
  consumoMedioDiario: decimal('consumo_medio_diario', { precision: 14, scale: 4 }).notNull(),
  status: mysqlEnum('status', ['aberto', 'resolvido']).notNull().default('aberto'),
  resolvidoEm: timestamp('resolvido_em'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxAlertasEstoqueMedicamentoId: index('idx_alertas_estoque_medicamento_id').on(table.medicamentoId, table.status)
}));

export const fornecedoresPrecos = mysqlTable('fornecedores_precos', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  medicamentoId: varchar('medicamento_id', { length: 36 }).notNull().references(() => medicamentos.id),
  fornecedorId: varchar('fornecedor_id', { length: 36 }).notNull().references(() => fornecedores.id),
  moeda: mysqlEnum('moeda', ['BRL', 'USD']).notNull(),
  precoCentavos: int('preco_centavos').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  uqFornecedoresPrecosMedicamentoId: uniqueIndex('uq_fornecedores_precos_medicamento_id').on(table.medicamentoId, table.fornecedorId)
}));

export const cotacoesDolar = mysqlTable('cotacoes_dolar', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  valorCentavos: int('valor_centavos').notNull(),
  dataCotacao: timestamp('data_cotacao').notNull(),
  fonte: varchar('fonte', { length: 50 }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxCotacoesDolarDataCotacao: index('idx_cotacoes_dolar_data_cotacao').on(table.dataCotacao)
}));

export const vacinasCatalogo = mysqlTable('vacinas_catalogo', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  descricao: text('descricao'),
  intervaloReforcoDias: int('intervalo_reforco_dias').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxVacinasCatalogoNome: index('idx_vacinas_catalogo_nome').on(table.nome)
}));

export const vacinasAplicacoes = mysqlTable('vacinas_aplicacoes', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  animalId: varchar('animal_id', { length: 36 }).notNull().references(() => animais.id),
  vacinaId: varchar('vacina_id', { length: 36 }).notNull().references(() => vacinasCatalogo.id),
  veterinarioId: varchar('veterinario_id', { length: 36 }).notNull().references(() => colaboradores.id),
  data: date('data', { mode: 'string' }).notNull(),
  proximaDose: date('proxima_dose', { mode: 'string' }).notNull(),
  lote: varchar('lote', { length: 100 }),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxVacinasAplicacoesProximaDose: index('idx_vacinas_aplicacoes_proxima_dose').on(table.proximaDose),
  idxVacinasAplicacoesAnimalId: index('idx_vacinas_aplicacoes_animal_id').on(table.animalId)
}));

export const lembretesVacina = mysqlTable('lembretes_vacina', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  vacinaId: varchar('vacina_id', { length: 36 }).notNull().references(() => vacinasAplicacoes.id),
  mensagem: text('mensagem').notNull(),
  telefone: varchar('telefone', { length: 20 }).notNull(),
  status: mysqlEnum('status', ['pendente', 'enviado']).notNull().default('pendente'),
  enviadoEm: timestamp('enviado_em'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  uqLembretesVacinaVacinaId: uniqueIndex('uq_lembretes_vacina_vacina_id').on(table.vacinaId)
}));

export const servicos = mysqlTable('servicos', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  valorCentavos: int('valor_centavos').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxServicosNome: index('idx_servicos_nome').on(table.nome)
}));

export const orcamentos = mysqlTable('orcamentos', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  numero: int('numero').notNull(),
  clienteId: varchar('cliente_id', { length: 36 }).notNull().references(() => clientes.id),
  animalId: varchar('animal_id', { length: 36 }).references(() => animais.id),
  descontoCentavos: int('desconto_centavos').notNull(),
  totalCentavos: int('total_centavos').notNull(),
  formaPagamento: varchar('forma_pagamento', { length: 255 }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxOrcamentosClienteId: index('idx_orcamentos_cliente_id').on(table.clienteId, table.criadoEm),
  uqOrcamentosNumero: uniqueIndex('uq_orcamentos_numero').on(table.numero)
}));

export const orcamentosItens = mysqlTable('orcamentos_itens', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  orcamentoId: varchar('orcamento_id', { length: 36 }).notNull().references(() => orcamentos.id),
  tipo: mysqlEnum('tipo', ['SERVICO', 'MEDICAMENTO']).notNull(),
  itemId: varchar('item_id', { length: 36 }).notNull(),
  descricao: varchar('descricao', { length: 255 }).notNull(),
  quantidade: int('quantidade').notNull(),
  valorUnitarioCentavos: int('valor_unitario_centavos').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxOrcamentosItensOrcamentoId: index('idx_orcamentos_itens_orcamento_id').on(table.orcamentoId)
}));

export const auditoria = mysqlTable('auditoria', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  ocorridoEm: timestamp('ocorrido_em').notNull(),
  usuarioId: varchar('usuario_id', { length: 36 }),
  usuarioNome: varchar('usuario_nome', { length: 255 }).notNull(),
  perfil: mysqlEnum('perfil', ['MASTER', 'VETERINARIO', 'ATENDENTE']).notNull(),
  acao: varchar('acao', { length: 60 }).notNull(),
  entidade: varchar('entidade', { length: 100 }).notNull(),
  registroId: varchar('registro_id', { length: 36 }),
  descricao: text('descricao').notNull(),
  dadosAntes: json('dados_antes'),
  dadosDepois: json('dados_depois'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => ({
  idxAuditoriaOcorridoEm: index('idx_auditoria_ocorrido_em').on(table.ocorridoEm),
  idxAuditoriaEntidade: index('idx_auditoria_entidade').on(table.entidade, table.acao)
}));

export const configuracoes = mysqlTable('configuracoes', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  nomeClinica: varchar('nome_clinica', { length: 255 }).notNull(),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  cep: varchar('cep', { length: 9 }),
  logradouro: varchar('logradouro', { length: 255 }),
  numero: varchar('numero', { length: 20 }),
  bairro: varchar('bairro', { length: 100 }),
  cidade: varchar('cidade', { length: 100 }),
  uf: varchar('uf', { length: 2 }),
  templateLembrete: text('template_lembrete').notNull(),
  backupHorario: varchar('backup_horario', { length: 5 }).notNull(),
  backupManter: int('backup_manter').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em').notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow()
});
