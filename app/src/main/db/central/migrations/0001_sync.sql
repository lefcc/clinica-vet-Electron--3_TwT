CREATE TABLE IF NOT EXISTS sync_relogio (
  id INT PRIMARY KEY,
  inicializado BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

INSERT IGNORE INTO sync_relogio (id) VALUES (1);

CREATE TABLE IF NOT EXISTS sync_mudancas (
  versao BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  operacao_id VARCHAR(64) NOT NULL UNIQUE,
  tabela VARCHAR(64) NOT NULL,
  registro_id VARCHAR(36) NOT NULL,
  dados JSON NOT NULL,
  sincronizado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_sync_mudancas_registro (tabela, registro_id, versao)
) ENGINE=InnoDB;
