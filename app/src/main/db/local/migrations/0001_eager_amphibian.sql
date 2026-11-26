CREATE TABLE `agendamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text,
	`animal_id` text NOT NULL,
	`veterinario_id` text NOT NULL,
	`inicio` integer NOT NULL,
	`duracao_min` integer NOT NULL,
	`motivo` text,
	`status` text DEFAULT 'AGENDADO' NOT NULL,
	`confirmado` integer DEFAULT false NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consultas` (
	`id` text PRIMARY KEY NOT NULL,
	`agendamento_id` text,
	`animal_id` text NOT NULL,
	`veterinario_id` text NOT NULL,
	`data` integer NOT NULL,
	`anamnese` text,
	`diagnostico` text,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`atualizado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estoque_lotes` (
	`id` text PRIMARY KEY NOT NULL,
	`medicamento_id` text NOT NULL,
	`numero` text NOT NULL,
	`validade` integer NOT NULL,
	`quantidade_inicial` integer NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estoque_movimentacoes` (
	`id` text PRIMARY KEY NOT NULL,
	`medicamento_id` text NOT NULL,
	`tipo` text NOT NULL,
	`quantidade` integer NOT NULL,
	`lote_id` text,
	`motivo` text,
	`referencia_id` text,
	`referencia_tipo` text,
	`usuario_id` text NOT NULL,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lote_id`) REFERENCES `estoque_lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `colaboradores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prescricoes` (
	`id` text PRIMARY KEY NOT NULL,
	`consulta_id` text NOT NULL,
	`medicamento_id` text NOT NULL,
	`quantidade` integer NOT NULL,
	`posologia` text,
	`criado_em` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_agendamentos_animal` ON `agendamentos` (`animal_id`);--> statement-breakpoint
CREATE INDEX `idx_agendamentos_veterinario` ON `agendamentos` (`veterinario_id`);--> statement-breakpoint
CREATE INDEX `idx_agendamentos_inicio` ON `agendamentos` (`inicio`);--> statement-breakpoint
CREATE INDEX `idx_agendamentos_status` ON `agendamentos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_agendamentos_ativo` ON `agendamentos` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_consultas_animal` ON `consultas` (`animal_id`);--> statement-breakpoint
CREATE INDEX `idx_consultas_veterinario` ON `consultas` (`veterinario_id`);--> statement-breakpoint
CREATE INDEX `idx_consultas_data` ON `consultas` (`data`);--> statement-breakpoint
CREATE INDEX `idx_consultas_ativo` ON `consultas` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_estoque_lotes_medicamento` ON `estoque_lotes` (`medicamento_id`);--> statement-breakpoint
CREATE INDEX `idx_estoque_lotes_validade` ON `estoque_lotes` (`validade`);--> statement-breakpoint
CREATE INDEX `idx_estoque_mov_medicamento` ON `estoque_movimentacoes` (`medicamento_id`);--> statement-breakpoint
CREATE INDEX `idx_estoque_mov_lote` ON `estoque_movimentacoes` (`lote_id`);--> statement-breakpoint
CREATE INDEX `idx_estoque_mov_referencia` ON `estoque_movimentacoes` (`referencia_id`,`referencia_tipo`);--> statement-breakpoint
CREATE INDEX `idx_estoque_mov_criado` ON `estoque_movimentacoes` (`criado_em`);--> statement-breakpoint
CREATE INDEX `idx_prescricoes_consulta` ON `prescricoes` (`consulta_id`);--> statement-breakpoint
CREATE INDEX `idx_prescricoes_medicamento` ON `prescricoes` (`medicamento_id`);