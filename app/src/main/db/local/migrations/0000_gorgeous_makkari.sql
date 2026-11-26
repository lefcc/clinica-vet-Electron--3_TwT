CREATE TABLE `animais` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`nome` text NOT NULL,
	`especie` text NOT NULL,
	`raca` text,
	`sexo` text NOT NULL,
	`data_nascimento` integer,
	`peso_kg` real,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`cpf` text NOT NULL,
	`telefone` text,
	`email` text,
	`cep` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text(2),
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `colaboradores` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`cpf` text NOT NULL,
	`cargo` text NOT NULL,
	`crmv` text,
	`telefone` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`contato` text,
	`telefone` text,
	`email` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `medicamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`principio_ativo` text,
	`unidade` text NOT NULL,
	`dias_alerta` integer DEFAULT 3 NOT NULL,
	`consumo_inicial_diario` real,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_conflitos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tabela` text NOT NULL,
	`registro_id` text NOT NULL,
	`tipo` text NOT NULL,
	`dados_local` text NOT NULL,
	`dados_central` text NOT NULL,
	`status` text DEFAULT 'aberto' NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`resolvido_por` text,
	`resolvido_em` integer
);
--> statement-breakpoint
CREATE TABLE `sync_estado` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tabela` text NOT NULL,
	`registro_id` text NOT NULL,
	`operacao` text NOT NULL,
	`dados` text NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`ultimo_erro` text,
	`enviado_em` integer
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`colaborador_id` text NOT NULL,
	`login` text NOT NULL,
	`senha_hash` text NOT NULL,
	`perfil` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`ultimo_login_em` integer,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_animais_cliente` ON `animais` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `idx_animais_ativo` ON `animais` (`ativo`);--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_cpf_unique` ON `clientes` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_clientes_cpf` ON `clientes` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_clientes_nome` ON `clientes` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_clientes_ativo` ON `clientes` (`ativo`);--> statement-breakpoint
CREATE UNIQUE INDEX `colaboradores_cpf_unique` ON `colaboradores` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_colaboradores_cpf` ON `colaboradores` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_colaboradores_ativo` ON `colaboradores` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_fornecedores_ativo` ON `fornecedores` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_medicamentos_nome` ON `medicamentos` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_medicamentos_ativo` ON `medicamentos` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_sync_conflitos_tabela_registro` ON `sync_conflitos` (`tabela`,`registro_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_conflitos_status` ON `sync_conflitos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sync_outbox_tabela_registro` ON `sync_outbox` (`tabela`,`registro_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_outbox_enviado` ON `sync_outbox` (`enviado_em`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_colaborador_id_unique` ON `usuarios` (`colaborador_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_login_unique` ON `usuarios` (`login`);--> statement-breakpoint
CREATE INDEX `idx_usuarios_login` ON `usuarios` (`login`);--> statement-breakpoint
CREATE INDEX `idx_usuarios_colaborador` ON `usuarios` (`colaborador_id`);