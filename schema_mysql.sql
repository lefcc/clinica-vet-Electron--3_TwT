-- ============================================================================
-- SCHEMA MYSQL COMPLETO - SISTEMA CLÍNICA VETERINÁRIA
-- Baseado em: AGENTS.md, CONTEXTO.md, FRONT.md, tipos.ts
-- Compatível com MySQL 8.0+ (InnoDB, utf8mb4)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. TABELAS DE USUÁRIOS E COLABORADORES
-- ============================================================================

CREATE TABLE `colaboradores` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `nome` VARCHAR(255) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL COMMENT 'Apenas dígitos',
    `cargo` VARCHAR(100) NOT NULL,
    `crmv` VARCHAR(20) NULL COMMENT 'Obrigatório se cargo = VETERINARIO',
    `telefone` VARCHAR(20) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_colaboradores_cpf` (`cpf`),
    KEY `idx_colaboradores_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Colaboradores da clínica';

CREATE TABLE `usuarios` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `colaborador_id` CHAR(36) NOT NULL COMMENT 'FK para colaboradores.id',
    `login` VARCHAR(100) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt custo >= 10',
    `perfil` ENUM('MASTER','VETERINARIO','ATENDENTE') NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `ultimo_login_em` TIMESTAMP NULL,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_usuarios_login` (`login`),
    UNIQUE KEY `uk_usuarios_colaborador` (`colaborador_id`),
    KEY `idx_usuarios_ativo` (`ativo`),
    CONSTRAINT `fk_usuarios_colaborador` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuários do sistema (login)';

-- ============================================================================
-- 2. TABELAS DE CLIENTES E ANIMAIS
-- ============================================================================

CREATE TABLE `clientes` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `nome` VARCHAR(255) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL COMMENT 'Apenas dígitos',
    `telefone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `cep` VARCHAR(9) NULL COMMENT 'Apenas dígitos',
    `logradouro` VARCHAR(255) NULL,
    `numero` VARCHAR(20) NULL,
    `complemento` VARCHAR(100) NULL,
    `bairro` VARCHAR(100) NULL,
    `cidade` VARCHAR(100) NULL,
    `uf` CHAR(2) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_clientes_cpf` (`cpf`),
    KEY `idx_clientes_nome` (`nome`),
    KEY `idx_clientes_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Clientes (tutores dos animais)';

CREATE TABLE `animais` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `cliente_id` CHAR(36) NOT NULL COMMENT 'FK para clientes.id',
    `nome` VARCHAR(255) NOT NULL,
    `especie` VARCHAR(100) NOT NULL,
    `raca` VARCHAR(100) NULL,
    `sexo` ENUM('M','F') NOT NULL,
    `data_nascimento` DATE NULL COMMENT 'Data pura (yyyy-mm-dd), UTC no banco',
    `peso_kg` DECIMAL(6,2) NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_animais_cliente` (`cliente_id`),
    KEY `idx_animais_ativo` (`ativo`),
    CONSTRAINT `fk_animais_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Animais dos clientes';

-- ============================================================================
-- 3. TABELAS DE MEDICAMENTOS E FORNECEDORES
-- ============================================================================

CREATE TABLE `medicamentos` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `nome` VARCHAR(255) NOT NULL,
    `principio_ativo` VARCHAR(255) NULL,
    `unidade` VARCHAR(50) NOT NULL COMMENT 'Ex: comprimido, ml, frasco',
    `dias_alerta` INT NOT NULL DEFAULT 3 COMMENT 'Dias para alerta de estoque (1-60)',
    `consumo_inicial_diario` DECIMAL(10,2) NULL COMMENT 'Usado até ter 7 dias de histórico',
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_medicamentos_nome_unidade` (`nome`, `unidade`, `ativo`),
    KEY `idx_medicamentos_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de medicamentos';

CREATE TABLE `fornecedores` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `nome` VARCHAR(255) NOT NULL,
    `tipo` ENUM('NACIONAL','IMPORTADO') NOT NULL,
    `contato` VARCHAR(255) NULL,
    `telefone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_fornecedores_ativo` (`ativo`),
    KEY `idx_fornecedores_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fornecedores de medicamentos';

-- Tabela de preços por fornecedor (para comparativo)
CREATE TABLE `fornecedor_precos` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `medicamento_id` CHAR(36) NOT NULL COMMENT 'FK para medicamentos.id',
    `fornecedor_id` CHAR(36) NOT NULL COMMENT 'FK para fornecedores.id',
    `moeda` ENUM('BRL','USD') NOT NULL,
    `preco_centavos` BIGINT NOT NULL COMMENT 'Preço na moeda original (centavos)',
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_fornecedor_precos_med_forn` (`medicamento_id`, `fornecedor_id`),
    KEY `idx_fornecedor_precos_medicamento` (`medicamento_id`),
    KEY `idx_fornecedor_precos_fornecedor` (`fornecedor_id`),
    CONSTRAINT `fk_fornecedor_precos_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_fornecedor_precos_fornecedor` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Preços de medicamentos por fornecedor';

-- ============================================================================
-- 4. TABELAS DE AGENDA E CONSULTAS
-- ============================================================================

CREATE TABLE `agendamentos` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `cliente_id` CHAR(36) NULL COMMENT 'FK para clientes.id (pode ser null se não vinculado)',
    `animal_id` CHAR(36) NOT NULL COMMENT 'FK para animais.id',
    `veterinario_id` CHAR(36) NOT NULL COMMENT 'FK para colaboradores.id (perfil VETERINARIO)',
    `inicio` TIMESTAMP NOT NULL COMMENT 'UTC - início do agendamento',
    `duracao_min` INT NOT NULL DEFAULT 30 COMMENT 'Duração em minutos',
    `motivo` VARCHAR(500) NULL,
    `status` ENUM('AGENDADO','CONFIRMADO','REALIZADO','CANCELADO') NOT NULL DEFAULT 'AGENDADO',
    `confirmado` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'FALSE = marcado offline, sem confirmação do servidor central',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_agendamentos_animal` (`animal_id`),
    KEY `idx_agendamentos_veterinario_inicio` (`veterinario_id`, `inicio`),
    KEY `idx_agendamentos_status` (`status`),
    KEY `idx_agendamentos_confirmado` (`confirmado`),
    CONSTRAINT `fk_agendamentos_animal` FOREIGN KEY (`animal_id`) REFERENCES `animais` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_agendamentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_agendamentos_veterinario` FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agendamentos/atendimentos';

CREATE TABLE `consultas` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `agendamento_id` CHAR(36) NULL COMMENT 'FK para agendamentos.id (opcional, pode criar consulta sem agendamento)',
    `animal_id` CHAR(36) NOT NULL COMMENT 'FK para animais.id',
    `veterinario_id` CHAR(36) NOT NULL COMMENT 'FK para colaboradores.id (usuário da sessão)',
    `data` TIMESTAMP NOT NULL COMMENT 'UTC - data/hora da consulta',
    `anamnese` TEXT NULL,
    `diagnostico` TEXT NULL COMMENT 'Não retornado para ATENDENTE',
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_consultas_animal` (`animal_id`),
    KEY `idx_consultas_veterinario_data` (`veterinario_id`, `data`),
    KEY `idx_consultas_agendamento` (`agendamento_id`),
    CONSTRAINT `fk_consultas_animal` FOREIGN KEY (`animal_id`) REFERENCES `animais` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_consultas_veterinario` FOREIGN KEY (`veterinario_id`) REFERENCES `colaboradores` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_consultas_agendamento` FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Consultas/diagnósticos (prontuário)';

CREATE TABLE `prescricoes` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `consulta_id` CHAR(36) NOT NULL COMMENT 'FK para consultas.id',
    `medicamento_id` CHAR(36) NOT NULL COMMENT 'FK para medicamentos.id',
    `quantidade` INT NOT NULL COMMENT 'Quantidade prescrita',
    `posologia` VARCHAR(500) NULL COMMENT 'Instruções de uso',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_prescricoes_consulta` (`consulta_id`),
    KEY `idx_prescricoes_medicamento` (`medicamento_id`),
    CONSTRAINT `fk_prescricoes_consulta` FOREIGN KEY (`consulta_id`) REFERENCES `consultas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_prescricoes_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Medicamentos prescritos na consulta';

-- ============================================================================
-- 5. TABELAS DE ESTOQUE (MOVIMENTAÇÕES APPEND-ONLY + LOTES FEFO)
-- ============================================================================

CREATE TABLE `estoque_movimentacoes` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `medicamento_id` CHAR(36) NOT NULL COMMENT 'FK para medicamentos.id',
    `tipo` ENUM('ENTRADA','SAIDA','AJUSTE') NOT NULL,
    `quantidade` INT NOT NULL COMMENT 'Positivo para ENTRADA, negativo para SAIDA, diferença para AJUSTE',
    `lote_id` CHAR(36) NULL COMMENT 'FK para estoque_lotes.id (obrigatório para ENTRADA)',
    `motivo` VARCHAR(255) NULL COMMENT 'Ex: compra, consumo consulta, ajuste inventário',
    `referencia_id` CHAR(36) NULL COMMENT 'ID da consulta, agendamento, ou outra origem',
    `referencia_tipo` VARCHAR(50) NULL COMMENT 'consulta, agendamento, compra, inventario',
    `usuario_id` CHAR(36) NOT NULL COMMENT 'FK para colaboradores.id (quem fez a movimentação)',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'UTC',
    KEY `idx_estoque_mov_medicamento_criado` (`medicamento_id`, `criado_em`),
    KEY `idx_estoque_mov_lote` (`lote_id`),
    KEY `idx_estoque_mov_tipo` (`tipo`),
    KEY `idx_estoque_mov_referencia` (`referencia_tipo`, `referencia_id`),
    CONSTRAINT `fk_estoque_mov_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_estoque_mov_lote` FOREIGN KEY (`lote_id`) REFERENCES `estoque_lotes` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_estoque_mov_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `colaboradores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Movimentações de estoque (append-only, saldo = soma)';

CREATE TABLE `estoque_lotes` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `medicamento_id` CHAR(36) NOT NULL COMMENT 'FK para medicamentos.id',
    `numero` VARCHAR(100) NOT NULL COMMENT 'Número do lote',
    `validade` DATE NOT NULL COMMENT 'Data de validade (yyyy-mm-dd)',
    `quantidade_inicial` INT NOT NULL COMMENT 'Quantidade recebida neste lote',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_estoque_lotes_medicamento_validade` (`medicamento_id`, `validade`),
    KEY `idx_estoque_lotes_validade` (`validade`),
    UNIQUE KEY `uk_estoque_lotes_med_numero` (`medicamento_id`, `numero`),
    CONSTRAINT `fk_estoque_lotes_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lotes de medicamentos (FEFO - First Expired, First Out)';

-- ============================================================================
-- 6. TABELAS DE ALERTAS DE ESTOQUE
-- ============================================================================

CREATE TABLE `alertas_estoque` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `medicamento_id` CHAR(36) NOT NULL COMMENT 'FK para medicamentos.id',
    `dias_restantes` INT NOT NULL,
    `saldo` INT NOT NULL,
    `status` ENUM('CRITICO','ATENCAO') NOT NULL COMMENT 'CRITICO <= dias_alerta, ATENCAO <= 2*dias_alerta',
    `resolvido` BOOLEAN NOT NULL DEFAULT FALSE,
    `resolvido_em` TIMESTAMP NULL,
    `resolvido_por` CHAR(36) NULL COMMENT 'FK para colaboradores.id',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_alertas_estoque_medicamento_aberto` (`medicamento_id`, `resolvido`),
    KEY `idx_alertas_estoque_resolvido` (`resolvido`),
    CONSTRAINT `fk_alertas_estoque_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_alertas_estoque_resolvido_por` FOREIGN KEY (`resolvido_por`) REFERENCES `colaboradores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alertas de estoque crítico (um aberto por medicamento)';

-- ============================================================================
-- 7. TABELAS DE VACINAS
-- ============================================================================

CREATE TABLE `vacinas_catalogo` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `nome` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `intervalo_reforco_dias` INT NOT NULL COMMENT 'Dias entre doses de reforço',
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_vacinas_catalogo_nome` (`nome`, `ativo`),
    KEY `idx_vacinas_catalogo_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de vacinas disponíveis';

CREATE TABLE `vacinas_animal` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `animal_id` CHAR(36) NOT NULL COMMENT 'FK para animais.id',
    `vacina_catalogo_id` CHAR(36) NOT NULL COMMENT 'FK para vacinas_catalogo.id',
    `data_aplicacao` DATE NOT NULL COMMENT 'Data da aplicação (yyyy-mm-dd)',
    `proxima_dose` DATE NULL COMMENT 'Próxima dose calculada (data_aplicacao + intervalo_reforco_dias)',
    `lote` VARCHAR(100) NULL COMMENT 'Lote da vacina aplicada',
    `aplicado_por` CHAR(36) NULL COMMENT 'FK para colaboradores.id',
    `lembrete_enviado` BOOLEAN NOT NULL DEFAULT FALSE,
    `lembrete_enviado_em` TIMESTAMP NULL,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_vacinas_animal_animal` (`animal_id`),
    KEY `idx_vacinas_animal_proxima_dose` (`proxima_dose`),
    KEY `idx_vacinas_animal_lembrete` (`lembrete_enviado`),
    CONSTRAINT `fk_vacinas_animal_animal` FOREIGN KEY (`animal_id`) REFERENCES `animais` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_vacinas_animal_catalogo` FOREIGN KEY (`vacina_catalogo_id`) REFERENCES `vacinas_catalogo` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_vacinas_animal_aplicado_por` FOREIGN KEY (`aplicado_por`) REFERENCES `colaboradores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vacinas aplicadas aos animais (histórico e próximas doses)';

-- ============================================================================
-- 8. TABELAS DE SERVIÇOS E ORÇAMENTOS
-- ============================================================================

CREATE TABLE `servicos` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `nome` VARCHAR(255) NOT NULL,
    `valor_centavos` BIGINT NOT NULL COMMENT 'Valor em centavos',
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_servicos_nome` (`nome`, `ativo`),
    KEY `idx_servicos_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de serviços com preços';

CREATE TABLE `orcamentos` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `numero` INT NOT NULL COMMENT 'Número sequencial do orçamento',
    `cliente_id` CHAR(36) NOT NULL COMMENT 'FK para clientes.id',
    `animal_id` CHAR(36) NULL COMMENT 'FK para animais.id (opcional)',
    `criado_por` CHAR(36) NOT NULL COMMENT 'FK para colaboradores.id',
    `itens_json` JSON NOT NULL COMMENT 'Array de itens: {tipo, item_id, descricao, quantidade, valor_unitario_centavos}',
    `desconto_centavos` BIGINT NOT NULL DEFAULT 0,
    `total_centavos` BIGINT NOT NULL COMMENT 'Recalculado no back-end: soma(itens) - desconto',
    `forma_pagamento` VARCHAR(100) NULL,
    `status` ENUM('RASCUNHO','ENVIADO','APROVADO','RECUSADO','EXPIRADO') NOT NULL DEFAULT 'RASCUNHO',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_orcamentos_numero` (`numero`),
    KEY `idx_orcamentos_cliente` (`cliente_id`),
    KEY `idx_orcamentos_animal` (`animal_id`),
    KEY `idx_orcamentos_status` (`status`),
    CONSTRAINT `fk_orcamentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_orcamentos_animal` FOREIGN KEY (`animal_id`) REFERENCES `animais` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_orcamentos_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `colaboradores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Orçamentos/demonstrativos (sem valor fiscal)';

-- ============================================================================
-- 9. TABELA DE COTAÇÃO DO DÓLAR
-- ============================================================================

CREATE TABLE `dolar_cotacao` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `valor_centavos` BIGINT NOT NULL COMMENT 'USD/BRL em centavos (ex: 550 = 5,50)',
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Quando buscou/atualizou',
    `origem` ENUM('API','CACHE') NOT NULL DEFAULT 'API' COMMENT 'API = AwesomeAPI, CACHE = última salva',
    KEY `idx_dolar_cotacao_atualizado` (`atualizado_em` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de cotações do dólar (mantém última para fallback)';

-- ============================================================================
-- 10. TABELA DE AUDITORIA (APPEND-ONLY, SÓ LEITURA NO FRONT)
-- ============================================================================

CREATE TABLE `auditoria` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `ocorrido_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'UTC',
    `usuario_id` CHAR(36) NULL COMMENT 'FK para colaboradores.id (quem fez a ação)',
    `usuario_nome` VARCHAR(255) NOT NULL COMMENT 'Nome no momento da ação (para auditoria histórica)',
    `perfil` ENUM('MASTER','VETERINARIO','ATENDENTE') NOT NULL,
    `acao` VARCHAR(50) NOT NULL COMMENT 'LOGIN, LOGOUT, CRIAR, ATUALIZAR, INATIVAR, MOVIMENTO_ESTOQUE, RESOLVER_CONFLITO, BACKUP, RESTAURAR',
    `entidade` VARCHAR(100) NOT NULL COMMENT 'Tabela/tela afetada: clientes, animais, medicamentos, etc.',
    `registro_id` CHAR(36) NULL COMMENT 'ID do registro afetado',
    `descricao` TEXT NOT NULL COMMENT 'Descrição legível: "Marcou atendimento de Luna às 10:30"',
    `detalhes_json` JSON NULL COMMENT 'Dados extras (antes/depois, etc.)',
    KEY `idx_auditoria_ocorrido` (`ocorrido_em` DESC),
    KEY `idx_auditoria_usuario` (`usuario_id`),
    KEY `idx_auditoria_entidade_registro` (`entidade`, `registro_id`),
    KEY `idx_auditoria_acao` (`acao`),
    CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `colaboradores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de auditoria (append-only, imutável)';

-- ============================================================================
-- 11. TABELAS DE CONFIGURAÇÕES E BACKUP
-- ============================================================================

CREATE TABLE `configuracoes` (
    `chave` VARCHAR(100) NOT NULL PRIMARY KEY,
    `valor` JSON NOT NULL COMMENT 'Valor da configuração (string, número, boolean, objeto)',
    `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `atualizado_por` CHAR(36) NULL COMMENT 'FK para colaboradores.id'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurações da clínica (chave-valor JSON)';

-- Chaves esperadas em configuracoes:
-- 'clinica' -> {nome_clinica, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf}
-- 'lembrete_vacina' -> {template_lembrete}
-- 'backup' -> {backup_horario: "HH:MM", backup_manter: N}

CREATE TABLE `backups` (
    `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v4',
    `tipo` ENUM('AUTOMATICO','MANUAL') NOT NULL,
    `arquivo` VARCHAR(500) NOT NULL COMMENT 'Caminho/nome do arquivo de backup',
    `tamanho_bytes` BIGINT NOT NULL,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `criado_por` CHAR(36) NULL COMMENT 'FK para colaboradores.id',
    KEY `idx_backups_tipo_criado` (`tipo`, `criado_em` DESC),
    CONSTRAINT `fk_backups_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `colaboradores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de backups realizados';

-- ============================================================================
-- 12. TABELAS DE SINCRONIZAÇÃO (EXISTEM APENAS NO SQLITE LOCAL)
-- ============================================================================
-- NOTA: Estas tabelas NÃO são criadas no MySQL central.
-- Elas ficam apenas no SQLite local de cada computador.
-- Mantidas aqui apenas para documentação da estrutura completa.

/*
CREATE TABLE `sync_outbox` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `tabela` VARCHAR(100) NOT NULL,
    `registro_id` CHAR(36) NOT NULL,
    `operacao` ENUM('inserir','atualizar','inativar') NOT NULL,
    `dados` JSON NOT NULL,
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `tentativas` INT NOT NULL DEFAULT 0,
    `ultimo_erro` TEXT NULL,
    `enviado_em` TIMESTAMP NULL,
    KEY `idx_sync_outbox_tabela_registro` (`tabela`, `registro_id`),
    KEY `idx_sync_outbox_enviado` (`enviado_em`)
);

CREATE TABLE `sync_estado` (
    `chave` VARCHAR(100) PRIMARY KEY,
    `valor` TEXT NOT NULL
);

CREATE TABLE `sync_conflitos` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `tabela` VARCHAR(100) NOT NULL,
    `registro_id` CHAR(36) NOT NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `dados_local` JSON NOT NULL,
    `dados_central` JSON NOT NULL,
    `status` ENUM('aberto','resolvido') NOT NULL DEFAULT 'aberto',
    `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolvido_por` CHAR(36) NULL,
    `resolvido_em` TIMESTAMP NULL,
    KEY `idx_sync_conflitos_tabela_registro` (`tabela`, `registro_id`),
    KEY `idx_sync_conflitos_status` (`status`)
);
*/

-- ============================================================================
-- 13. DADOS INICIAIS (SEEDS)
-- ============================================================================

-- Inserir configurações padrão
INSERT INTO `configuracoes` (`chave`, `valor`, `atualizado_por`) VALUES
('clinica', JSON_OBJECT(
    'nome_clinica', 'Clínica Veterinária',
    'telefone', '',
    'email', '',
    'cep', '',
    'logradouro', '',
    'numero', '',
    'complemento', '',
    'bairro', '',
    'cidade', '',
    'uf', ''
), NULL),
('lembrete_vacina', JSON_OBJECT(
    'template_lembrete', 'Olá {tutor}! A vacina {vacina} do {animal} vence em {data}. Agende conosco!'
), NULL),
('backup', JSON_OBJECT(
    'backup_horario', '02:00',
    'backup_manter', 7
), NULL)
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`), `atualizado_em` = CURRENT_TIMESTAMP;

-- Inserir cotação inicial do dólar (fallback)
INSERT INTO `dolar_cotacao` (`id`, `valor_centavos`, `origem`) VALUES
(UUID(), 550, 'CACHE') -- R$ 5,50 como fallback inicial
ON DUPLICATE KEY UPDATE `valor_centavos` = VALUES(`valor_centavos`), `atualizado_em` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 14. ÍNDICES ADICIONAIS PARA PERFORMANCE (OPÇÕES)
-- ============================================================================

-- Índices compostos para queries frequentes do dashboard/relatórios
CREATE INDEX `idx_consultas_animal_data` ON `consultas` (`animal_id`, `data` DESC);
CREATE INDEX `idx_agendamentos_data_status` ON `agendamentos` (`inicio`, `status`);
CREATE INDEX `idx_estoque_mov_medicamento_tipo_criado` ON `estoque_movimentacoes` (`medicamento_id`, `tipo`, `criado_em` DESC);
CREATE INDEX `idx_vacinas_animal_animal_proxima` ON `vacinas_animal` (`animal_id`, `proxima_dose`);
CREATE INDEX `idx_orcamentos_cliente_criado` ON `orcamentos` (`cliente_id`, `criado_em` DESC);

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================