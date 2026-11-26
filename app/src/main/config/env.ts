// Configuração de ambiente - carregamento de variáveis
import * as path from 'path';
import { mkdirSync } from 'node:fs';
import * as dotenv from 'dotenv';

const perfilLocal = app.commandLine?.getSwitchValue('user-data-dir');
if (perfilLocal) {
  const caminho = path.resolve(perfilLocal);
  mkdirSync(caminho, { recursive: true });
  app.setPath('userData', caminho);
}

// carrega o .env (padrão da aula, com dotenv). procura na pasta do app e na raiz do projeto.
// se o arquivo não existir, tudo bem: valem os valores padrão logo abaixo
if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
  for (const pasta of [process.cwd(), path.resolve(process.cwd(), '..')]) {
    dotenv.config({ path: path.join(pasta, '.env') });
  }
}

// app do Electron é carregado lazy para evitar erro quando roda fora do Electron (ex: testes, build)
let _electronApp: Electron.App | null = null;
function getElectronApp(): Electron.App | null {
  if (!_electronApp) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _electronApp = require('electron').app;
    } catch {
      _electronApp = null;
    }
  }
  return _electronApp;
}

function getUserDataPath(): string {
  const electronApp = getElectronApp();
  if (electronApp) {
    return electronApp.getPath('userData');
  }
  // Fallback para testes/build fora do Electron: usa pasta temporária ou cwd
  return process.env.APPDATA || process.env.HOME || process.cwd();
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
    ca?: string;
  };

  // Sincronização
  sync: {
    habilitado: boolean;
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

function getEnvNumber(key: string, padrao: number, minimo: number, maximo = Number.MAX_SAFE_INTEGER): number {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') return padrao;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimo || parsed > maximo) {
    console.warn(`Configuração ${key} inválida. Usando o valor padrão.`);
    return padrao;
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
  sqlitePath: path.join(getUserDataPath(), 'clinica-vet.sqlite'),

  mysql: {
    host: getEnv('MYSQL_HOST', 'localhost'),
    port: getEnvNumber('MYSQL_PORT', 3306, 1, 65535),
    user: getEnv('MYSQL_USER', 'clinica'),
    password: getEnv('MYSQL_PASSWORD', 'clinica123'),
    database: getEnv('MYSQL_DATABASE', 'clinica_vet'),
    ssl: getEnvBoolean('MYSQL_SSL', false)
  },

  sync: {
    habilitado: !app.isPackaged && getEnvBoolean('SYNC_HABILITADO', false),
    intervalMs: getEnvNumber('SYNC_INTERVAL_MS', 60000, 1000),
    batchSize: getEnvNumber('SYNC_BATCH_SIZE', 100, 1, 1000)
  },

  dolar: {
    apiUrl: getEnv('DOLAR_API_URL', 'https://economia.awesomeapi.com.br/json/last/USD-BRL'),
    fetchIntervalMs: getEnvNumber('DOLAR_FETCH_INTERVAL_MS', 3600000, 1)
  },

  bcryptCost: getEnvNumber('BCRYPT_COST', 10, 10, 15),
  sessionTtlHours: getEnvNumber('SESSION_TTL_HOURS', 8, 1),

  usuarioExemplo: {
    login: process.env.SEED_MASTER_LOGIN,
    senha: process.env.SEED_MASTER_SENHA,
    nome: process.env.SEED_MASTER_NOME,
    cpf: process.env.SEED_MASTER_CPF
  }
};
