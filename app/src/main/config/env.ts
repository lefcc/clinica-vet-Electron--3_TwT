// Configuração de ambiente - carregamento de variáveis
import * as path from 'path';
import { app } from 'electron';

// Carregar .env se existir (desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config({ path: path.join(process.cwd(), '.env') });
  } catch {
    // dotenv não instalado ou .env não encontrado - ignorar
  }
}

interface Config {
  // SQLite local
  sqlitePath: string;

  // MySQL central
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: boolean;
  };

  // Sincronização
  sync: {
    intervalMs: number;
    batchSize: number;
  };

  // Dólar
  dolar: {
    apiUrl: string;
    fetchIntervalMs: number;
  };

  // Segurança
  bcryptCost: number;
  sessionTtlHours: number;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Variável de ambiente numérica obrigatória não definida: ${key}`);
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Variável de ambiente ${key} deve ser um número: ${value}`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Variável de ambiente booleana obrigatória não definida: ${key}`);
  }
  return value.toLowerCase() === 'true';
}

export const config: Config = {
  sqlitePath: path.join(app.getPath('userData'), 'clinica-vet.sqlite'),

  mysql: {
    host: getEnv('MYSQL_HOST', 'localhost'),
    port: getEnvNumber('MYSQL_PORT', 3306),
    user: getEnv('MYSQL_USER', 'clinica'),
    password: getEnv('MYSQL_PASSWORD', 'clinica123'),
    database: getEnv('MYSQL_DATABASE', 'clinica_vet'),
    ssl: getEnvBoolean('MYSQL_SSL', false)
  },

  sync: {
    intervalMs: getEnvNumber('SYNC_INTERVAL_MS', 300000),
    batchSize: getEnvNumber('SYNC_BATCH_SIZE', 100)
  },

  dolar: {
    apiUrl: getEnv('DOLAR_API_URL', 'https://economia.awesomeapi.com.br/json/last/USD-BRL'),
    fetchIntervalMs: getEnvNumber('DOLAR_FETCH_INTERVAL_MS', 3600000)
  },

  bcryptCost: getEnvNumber('BCRYPT_COST', 10),
  sessionTtlHours: getEnvNumber('SESSION_TTL_HOURS', 8)
};