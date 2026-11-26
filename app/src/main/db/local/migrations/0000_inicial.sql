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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON colaboradores (cpf);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo ON colaboradores (ativo);
--> statement-breakpoint

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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios (login);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_usuarios_colaborador ON usuarios (colaborador_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, cpf TEXT NOT NULL UNIQUE, telefone TEXT,
  email TEXT, cep TEXT, logradouro TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes (cpf);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes (ativo);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS animais (
  id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL REFERENCES clientes(id),
  nome TEXT NOT NULL, especie TEXT NOT NULL, raca TEXT,
  sexo TEXT NOT NULL CHECK (sexo IN ('M', 'F')), data_nascimento INTEGER, peso_kg REAL, observacoes TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_animais_cliente ON animais (cliente_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_animais_ativo ON animais (ativo);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS medicamentos (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, principio_ativo TEXT, unidade TEXT NOT NULL,
  dias_alerta INTEGER NOT NULL DEFAULT 3, consumo_inicial_diario REAL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_medicamentos_nome ON medicamentos (nome);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_medicamentos_ativo ON medicamentos (ativo);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS fornecedores (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, tipo TEXT NOT NULL CHECK (tipo IN ('NACIONAL', 'IMPORTADO')),
  contato TEXT, telefone TEXT, email TEXT, ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores (ativo);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tabela TEXT NOT NULL, registro_id TEXT NOT NULL,
  operacao TEXT NOT NULL CHECK (operacao IN ('inserir', 'atualizar', 'inativar')), dados TEXT NOT NULL,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')), tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT, enviado_em INTEGER
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sync_outbox_tabela_registro ON sync_outbox (tabela, registro_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sync_outbox_enviado ON sync_outbox (enviado_em);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS sync_estado (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS sync_conflitos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tabela TEXT NOT NULL, registro_id TEXT NOT NULL, tipo TEXT NOT NULL,
  dados_local TEXT NOT NULL, dados_central TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido')),
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')), resolvido_por TEXT, resolvido_em INTEGER
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sync_conflitos_tabela_registro ON sync_conflitos (tabela, registro_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sync_conflitos_status ON sync_conflitos (status);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT PRIMARY KEY NOT NULL,
  animal_id TEXT NOT NULL REFERENCES animais(id),
  veterinario_id TEXT NOT NULL REFERENCES colaboradores(id),
  inicio INTEGER NOT NULL,
  duracao_min INTEGER NOT NULL,
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'AGENDADO' CHECK (status IN ('AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO')),
  confirmado INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_agendamentos_veterinario_id ON agendamentos (veterinario_id, inicio);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_agendamentos_animal_id ON agendamentos (animal_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS consultas (
  id TEXT PRIMARY KEY NOT NULL,
  animal_id TEXT NOT NULL REFERENCES animais(id),
  veterinario_id TEXT NOT NULL REFERENCES colaboradores(id),
  data INTEGER NOT NULL,
  anamnese TEXT NOT NULL,
  diagnostico TEXT,
  observacoes TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_consultas_animal_id ON consultas (animal_id, data);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS prescricoes_consulta (
  id TEXT PRIMARY KEY NOT NULL,
  consulta_id TEXT NOT NULL REFERENCES consultas(id),
  medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
  quantidade REAL NOT NULL,
  posologia TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_prescricoes_consulta_consulta_id ON prescricoes_consulta (consulta_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lotes_estoque (
  id TEXT PRIMARY KEY NOT NULL,
  medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
  numero TEXT NOT NULL,
  validade TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_lotes_estoque_medicamento_id ON lotes_estoque (medicamento_id, validade);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_lotes_estoque_medicamento_id ON lotes_estoque (medicamento_id, numero);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id TEXT PRIMARY KEY NOT NULL,
  medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
  lote_id TEXT NOT NULL REFERENCES lotes_estoque(id),
  consulta_id TEXT REFERENCES consultas(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
  quantidade REAL NOT NULL,
  motivo TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_medicamento_id ON movimentacoes_estoque (medicamento_id, criado_em);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_lote_id ON movimentacoes_estoque (lote_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS alertas_estoque (
  id TEXT PRIMARY KEY NOT NULL,
  medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
  dias_restantes INTEGER NOT NULL,
  saldo_atual REAL NOT NULL,
  consumo_medio_diario REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido')),
  resolvido_em INTEGER,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_alertas_estoque_medicamento_id ON alertas_estoque (medicamento_id, status);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS fornecedores_precos (
  id TEXT PRIMARY KEY NOT NULL,
  medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
  fornecedor_id TEXT NOT NULL REFERENCES fornecedores(id),
  moeda TEXT NOT NULL CHECK (moeda IN ('BRL', 'USD')),
  preco_centavos INTEGER NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_precos_medicamento_id ON fornecedores_precos (medicamento_id, fornecedor_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS cotacoes_dolar (
  id TEXT PRIMARY KEY NOT NULL,
  valor_centavos INTEGER NOT NULL,
  data_cotacao INTEGER NOT NULL,
  fonte TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_cotacoes_dolar_data_cotacao ON cotacoes_dolar (data_cotacao);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS vacinas_catalogo (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  intervalo_reforco_dias INTEGER NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_vacinas_catalogo_nome ON vacinas_catalogo (nome);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS vacinas_aplicacoes (
  id TEXT PRIMARY KEY NOT NULL,
  animal_id TEXT NOT NULL REFERENCES animais(id),
  vacina_id TEXT NOT NULL REFERENCES vacinas_catalogo(id),
  veterinario_id TEXT NOT NULL REFERENCES colaboradores(id),
  data TEXT NOT NULL,
  proxima_dose TEXT NOT NULL,
  lote TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_vacinas_aplicacoes_proxima_dose ON vacinas_aplicacoes (proxima_dose);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_vacinas_aplicacoes_animal_id ON vacinas_aplicacoes (animal_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lembretes_vacina (
  id TEXT PRIMARY KEY NOT NULL,
  vacina_id TEXT NOT NULL REFERENCES vacinas_aplicacoes(id),
  mensagem TEXT NOT NULL,
  telefone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado')),
  enviado_em INTEGER,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_lembretes_vacina_vacina_id ON lembretes_vacina (vacina_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS servicos (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_servicos_nome ON servicos (nome);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS orcamentos (
  id TEXT PRIMARY KEY NOT NULL,
  numero INTEGER NOT NULL,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  animal_id TEXT REFERENCES animais(id),
  desconto_centavos INTEGER NOT NULL,
  total_centavos INTEGER NOT NULL,
  forma_pagamento TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos (cliente_id, criado_em);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_orcamentos_numero ON orcamentos (numero);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS orcamentos_itens (
  id TEXT PRIMARY KEY NOT NULL,
  orcamento_id TEXT NOT NULL REFERENCES orcamentos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('SERVICO', 'MEDICAMENTO')),
  item_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  valor_unitario_centavos INTEGER NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orcamentos_itens_orcamento_id ON orcamentos_itens (orcamento_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY NOT NULL,
  ocorrido_em INTEGER NOT NULL,
  usuario_id TEXT,
  usuario_nome TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('MASTER', 'VETERINARIO', 'ATENDENTE')),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  registro_id TEXT,
  descricao TEXT NOT NULL,
  dados_antes TEXT,
  dados_depois TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_auditoria_ocorrido_em ON auditoria (ocorrido_em);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria (entidade, acao);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS configuracoes (
  id TEXT PRIMARY KEY NOT NULL,
  nome_clinica TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  template_lembrete TEXT NOT NULL,
  backup_horario TEXT NOT NULL,
  backup_manter INTEGER NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
