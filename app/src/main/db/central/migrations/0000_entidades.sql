CREATE TABLE `agendamentos` (
	`id` varchar(36) NOT NULL,
	`animal_id` varchar(36) NOT NULL,
	`veterinario_id` varchar(36) NOT NULL,
	`inicio` timestamp NOT NULL,
	`duracao_min` int NOT NULL,
	`motivo` text,
	`status` enum('AGENDADO','CONFIRMADO','REALIZADO','CANCELADO') NOT NULL DEFAULT 'AGENDADO',
	`confirmado` boolean NOT NULL DEFAULT false,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agendamentos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `alertas_estoque` (
	`id` varchar(36) NOT NULL,
	`medicamento_id` varchar(36) NOT NULL,
	`dias_restantes` int NOT NULL,
	`saldo_atual` decimal(14,4) NOT NULL,
	`consumo_medio_diario` decimal(14,4) NOT NULL,
	`status` enum('aberto','resolvido') NOT NULL DEFAULT 'aberto',
	`resolvido_em` timestamp,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertas_estoque_id` PRIMARY KEY(`id`)
);

CREATE TABLE `animais` (
	`id` varchar(36) NOT NULL,
	`cliente_id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`especie` varchar(100) NOT NULL,
	`raca` varchar(100),
	`sexo` enum('M','F') NOT NULL,
	`data_nascimento` timestamp,
	`peso_kg` decimal(6,2),
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `animais_id` PRIMARY KEY(`id`)
);

CREATE TABLE `auditoria` (
	`id` varchar(36) NOT NULL,
	`ocorrido_em` timestamp NOT NULL,
	`usuario_id` varchar(36),
	`usuario_nome` varchar(255) NOT NULL,
	`perfil` enum('MASTER','VETERINARIO','ATENDENTE') NOT NULL,
	`acao` varchar(60) NOT NULL,
	`entidade` varchar(100) NOT NULL,
	`registro_id` varchar(36),
	`descricao` text NOT NULL,
	`dados_antes` json,
	`dados_depois` json,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditoria_id` PRIMARY KEY(`id`)
);

CREATE TABLE `clientes` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`telefone` varchar(20),
	`email` varchar(255),
	`cep` varchar(9),
	`logradouro` varchar(255),
	`numero` varchar(20),
	`complemento` varchar(100),
	`bairro` varchar(100),
	`cidade` varchar(100),
	`uf` varchar(2),
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientes_cpf_unique` UNIQUE(`cpf`)
);

CREATE TABLE `colaboradores` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`cargo` varchar(100) NOT NULL,
	`crmv` varchar(20),
	`telefone` varchar(20),
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colaboradores_id` PRIMARY KEY(`id`),
	CONSTRAINT `colaboradores_cpf_unique` UNIQUE(`cpf`)
);

CREATE TABLE `configuracoes` (
	`id` varchar(36) NOT NULL,
	`nome_clinica` varchar(255) NOT NULL,
	`telefone` varchar(20),
	`email` varchar(255),
	`cep` varchar(9),
	`logradouro` varchar(255),
	`numero` varchar(20),
	`bairro` varchar(100),
	`cidade` varchar(100),
	`uf` varchar(2),
	`template_lembrete` text NOT NULL,
	`backup_horario` varchar(5) NOT NULL,
	`backup_manter` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `configuracoes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `consultas` (
	`id` varchar(36) NOT NULL,
	`animal_id` varchar(36) NOT NULL,
	`veterinario_id` varchar(36) NOT NULL,
	`data` timestamp NOT NULL,
	`anamnese` text NOT NULL,
	`diagnostico` text,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultas_id` PRIMARY KEY(`id`)
);

CREATE TABLE `cotacoes_dolar` (
	`id` varchar(36) NOT NULL,
	`valor_centavos` int NOT NULL,
	`data_cotacao` timestamp NOT NULL,
	`fonte` varchar(50) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cotacoes_dolar_id` PRIMARY KEY(`id`)
);

CREATE TABLE `fornecedores` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` enum('NACIONAL','IMPORTADO') NOT NULL,
	`contato` varchar(255),
	`telefone` varchar(20),
	`email` varchar(255),
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`)
);

CREATE TABLE `fornecedores_precos` (
	`id` varchar(36) NOT NULL,
	`medicamento_id` varchar(36) NOT NULL,
	`fornecedor_id` varchar(36) NOT NULL,
	`moeda` enum('BRL','USD') NOT NULL,
	`preco_centavos` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fornecedores_precos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_fornecedores_precos_medicamento_id` UNIQUE(`medicamento_id`,`fornecedor_id`)
);

CREATE TABLE `lembretes_vacina` (
	`id` varchar(36) NOT NULL,
	`vacina_id` varchar(36) NOT NULL,
	`mensagem` text NOT NULL,
	`telefone` varchar(20) NOT NULL,
	`status` enum('pendente','enviado') NOT NULL DEFAULT 'pendente',
	`enviado_em` timestamp,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lembretes_vacina_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_lembretes_vacina_vacina_id` UNIQUE(`vacina_id`)
);

CREATE TABLE `lotes_estoque` (
	`id` varchar(36) NOT NULL,
	`medicamento_id` varchar(36) NOT NULL,
	`numero` varchar(100) NOT NULL,
	`validade` date NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lotes_estoque_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_lotes_estoque_medicamento_id` UNIQUE(`medicamento_id`,`numero`)
);

CREATE TABLE `medicamentos` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`principio_ativo` varchar(255),
	`unidade` varchar(50) NOT NULL,
	`dias_alerta` int NOT NULL DEFAULT 3,
	`consumo_inicial_diario` decimal(10,2),
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicamentos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `movimentacoes_estoque` (
	`id` varchar(36) NOT NULL,
	`medicamento_id` varchar(36) NOT NULL,
	`lote_id` varchar(36) NOT NULL,
	`consulta_id` varchar(36),
	`usuario_id` varchar(36) NOT NULL,
	`tipo` enum('ENTRADA','SAIDA','AJUSTE') NOT NULL,
	`quantidade` decimal(14,4) NOT NULL,
	`motivo` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_estoque_id` PRIMARY KEY(`id`)
);

CREATE TABLE `orcamentos` (
	`id` varchar(36) NOT NULL,
	`numero` int NOT NULL,
	`cliente_id` varchar(36) NOT NULL,
	`animal_id` varchar(36),
	`desconto_centavos` int NOT NULL,
	`total_centavos` int NOT NULL,
	`forma_pagamento` varchar(255) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orcamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_orcamentos_numero` UNIQUE(`numero`)
);

CREATE TABLE `orcamentos_itens` (
	`id` varchar(36) NOT NULL,
	`orcamento_id` varchar(36) NOT NULL,
	`tipo` enum('SERVICO','MEDICAMENTO') NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`quantidade` int NOT NULL,
	`valor_unitario_centavos` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orcamentos_itens_id` PRIMARY KEY(`id`)
);

CREATE TABLE `prescricoes_consulta` (
	`id` varchar(36) NOT NULL,
	`consulta_id` varchar(36) NOT NULL,
	`medicamento_id` varchar(36) NOT NULL,
	`quantidade` decimal(14,4) NOT NULL,
	`posologia` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescricoes_consulta_id` PRIMARY KEY(`id`)
);

CREATE TABLE `servicos` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`valor_centavos` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `servicos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `usuarios` (
	`id` varchar(36) NOT NULL,
	`colaborador_id` varchar(36) NOT NULL,
	`login` varchar(100) NOT NULL,
	`senha_hash` varchar(255) NOT NULL,
	`perfil` enum('MASTER','VETERINARIO','ATENDENTE') NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimo_login_em` timestamp,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usuarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `usuarios_colaborador_id_unique` UNIQUE(`colaborador_id`),
	CONSTRAINT `usuarios_login_unique` UNIQUE(`login`)
);

CREATE TABLE `vacinas_aplicacoes` (
	`id` varchar(36) NOT NULL,
	`animal_id` varchar(36) NOT NULL,
	`vacina_id` varchar(36) NOT NULL,
	`veterinario_id` varchar(36) NOT NULL,
	`data` date NOT NULL,
	`proxima_dose` date NOT NULL,
	`lote` varchar(100),
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vacinas_aplicacoes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `vacinas_catalogo` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`intervalo_reforco_dias` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vacinas_catalogo_id` PRIMARY KEY(`id`)
);

ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_animal_id_animais_id_fk` FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_veterinario_id_colaboradores_id_fk` FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `alertas_estoque` ADD CONSTRAINT `alertas_estoque_medicamento_id_medicamentos_id_fk` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `animais` ADD CONSTRAINT `animais_cliente_id_clientes_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `consultas` ADD CONSTRAINT `consultas_animal_id_animais_id_fk` FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `consultas` ADD CONSTRAINT `consultas_veterinario_id_colaboradores_id_fk` FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `fornecedores_precos` ADD CONSTRAINT `fornecedores_precos_medicamento_id_medicamentos_id_fk` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `fornecedores_precos` ADD CONSTRAINT `fornecedores_precos_fornecedor_id_fornecedores_id_fk` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `lembretes_vacina` ADD CONSTRAINT `lembretes_vacina_vacina_id_vacinas_aplicacoes_id_fk` FOREIGN KEY (`vacina_id`) REFERENCES `vacinas_aplicacoes`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `lotes_estoque` ADD CONSTRAINT `lotes_estoque_medicamento_id_medicamentos_id_fk` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_medicamento_id_medicamentos_id_fk` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_lote_id_lotes_estoque_id_fk` FOREIGN KEY (`lote_id`) REFERENCES `lotes_estoque`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_consulta_id_consultas_id_fk` FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `orcamentos` ADD CONSTRAINT `orcamentos_cliente_id_clientes_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `orcamentos` ADD CONSTRAINT `orcamentos_animal_id_animais_id_fk` FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `orcamentos_itens` ADD CONSTRAINT `orcamentos_itens_orcamento_id_orcamentos_id_fk` FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `prescricoes_consulta` ADD CONSTRAINT `prescricoes_consulta_consulta_id_consultas_id_fk` FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `prescricoes_consulta` ADD CONSTRAINT `prescricoes_consulta_medicamento_id_medicamentos_id_fk` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_colaborador_id_colaboradores_id_fk` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `vacinas_aplicacoes` ADD CONSTRAINT `vacinas_aplicacoes_animal_id_animais_id_fk` FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `vacinas_aplicacoes` ADD CONSTRAINT `vacinas_aplicacoes_vacina_id_vacinas_catalogo_id_fk` FOREIGN KEY (`vacina_id`) REFERENCES `vacinas_catalogo`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `vacinas_aplicacoes` ADD CONSTRAINT `vacinas_aplicacoes_veterinario_id_colaboradores_id_fk` FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores`(`id`) ON DELETE no action ON UPDATE no action;

CREATE INDEX `idx_agendamentos_veterinario_id` ON `agendamentos` (`veterinario_id`,`inicio`);

CREATE INDEX `idx_agendamentos_animal_id` ON `agendamentos` (`animal_id`);

CREATE INDEX `idx_alertas_estoque_medicamento_id` ON `alertas_estoque` (`medicamento_id`,`status`);

CREATE INDEX `idx_animais_cliente` ON `animais` (`cliente_id`);

CREATE INDEX `idx_animais_ativo` ON `animais` (`ativo`);

CREATE INDEX `idx_auditoria_ocorrido_em` ON `auditoria` (`ocorrido_em`);

CREATE INDEX `idx_auditoria_entidade` ON `auditoria` (`entidade`,`acao`);

CREATE INDEX `idx_clientes_cpf` ON `clientes` (`cpf`);

CREATE INDEX `idx_clientes_nome` ON `clientes` (`nome`);

CREATE INDEX `idx_clientes_ativo` ON `clientes` (`ativo`);

CREATE INDEX `idx_colaboradores_cpf` ON `colaboradores` (`cpf`);

CREATE INDEX `idx_colaboradores_ativo` ON `colaboradores` (`ativo`);

CREATE INDEX `idx_consultas_animal_id` ON `consultas` (`animal_id`,`data`);

CREATE INDEX `idx_cotacoes_dolar_data_cotacao` ON `cotacoes_dolar` (`data_cotacao`);

CREATE INDEX `idx_fornecedores_ativo` ON `fornecedores` (`ativo`);

CREATE INDEX `idx_lotes_estoque_medicamento_id` ON `lotes_estoque` (`medicamento_id`,`validade`);

CREATE INDEX `idx_medicamentos_nome` ON `medicamentos` (`nome`);

CREATE INDEX `idx_medicamentos_ativo` ON `medicamentos` (`ativo`);

CREATE INDEX `idx_movimentacoes_estoque_medicamento_id` ON `movimentacoes_estoque` (`medicamento_id`,`criado_em`);

CREATE INDEX `idx_movimentacoes_estoque_lote_id` ON `movimentacoes_estoque` (`lote_id`);

CREATE INDEX `idx_orcamentos_cliente_id` ON `orcamentos` (`cliente_id`,`criado_em`);

CREATE INDEX `idx_orcamentos_itens_orcamento_id` ON `orcamentos_itens` (`orcamento_id`);

CREATE INDEX `idx_prescricoes_consulta_consulta_id` ON `prescricoes_consulta` (`consulta_id`);

CREATE INDEX `idx_servicos_nome` ON `servicos` (`nome`);

CREATE INDEX `idx_usuarios_login` ON `usuarios` (`login`);

CREATE INDEX `idx_usuarios_colaborador` ON `usuarios` (`colaborador_id`);

CREATE INDEX `idx_vacinas_aplicacoes_proxima_dose` ON `vacinas_aplicacoes` (`proxima_dose`);

CREATE INDEX `idx_vacinas_aplicacoes_animal_id` ON `vacinas_aplicacoes` (`animal_id`);

CREATE INDEX `idx_vacinas_catalogo_nome` ON `vacinas_catalogo` (`nome`);
