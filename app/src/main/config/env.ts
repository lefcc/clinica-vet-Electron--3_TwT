// Configuração de ambiente - carregamento de variáveis
import * as path from 'path';
import * as dotenv from 'dotenv';
import { app } from 'electron';

// carrega o .env (padrão da aula, com dotenv). procura na pasta do app e na raiz do projeto.
// se o arquivo não existir, tudo bem: valem os valores padrão logo abaixo
if (process.env.NODE_ENV !== 'production') {
  for (const pasta of [process.cwd(), path.resolve(process.cwd(), '..')]) {
    dotenv.config({ path: path.join(pasta, '.env') });
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

  // usuário inicial (opcional): se o .env não definir, em desenvolvimento vale o de exemplo
  usuarioExemplo: {
    login?: string;
    senha?: string;
    nome?: string;
    cpf?: string;
  };
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
  sessionTtlHours: getEnvNumber('SESSION_TTL_HOURS', 8),

  usuarioExemplo: {
    login: process.env.SEED_MASTER_LOGIN,
    senha: process.env.SEED_MASTER_SENHA,
    nome: process.env.SEED_MASTER_NOME,
    cpf: process.env.SEED_MASTER_CPF
  }
};