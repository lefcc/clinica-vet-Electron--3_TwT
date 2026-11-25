import { readFileSync, writeFileSync, renameSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';
import { z } from 'zod';
import { config } from './env';

const credenciais = z
  .object({
    host: z.string().trim().min(1),
    port: z.number().int().min(1).max(65535),
    user: z.string().trim().min(1),
    password: z.string().min(1),
    database: z.string().trim().min(1),
    ca: z.string().min(1).optional()
  })
  .strict();

const caminho = () => join(app.getPath('userData'), 'mysql.credenciais');

function exigirCofre(): void {
  if (
    !safeStorage.isEncryptionAvailable() ||
    (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
  ) {
    throw new Error('O cofre de credenciais do sistema não está disponível.');
  }
}

/** Executado pelo provisionamento local em uma sessão do administrador do computador. */
export function provisionarMysql(): void {
  exigirCofre();
  const dados = credenciais.parse({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ca: process.env.MYSQL_TLS_CA_ARQUIVO ? readFileSync(process.env.MYSQL_TLS_CA_ARQUIVO, 'utf8') : undefined
  });
  const destino = caminho();
  const temporario = destino + '.tmp';
  mkdirSync(app.getPath('userData'), { recursive: true });
  try {
    writeFileSync(temporario, safeStorage.encryptString(JSON.stringify(dados)), { mode: 0o600, flag: 'wx' });
    renameSync(temporario, destino);
  } finally {
    rmSync(temporario, { force: true });
  }
}

export function habilitarMysqlInstalado(): boolean {
  let arquivo: Buffer;
  try {
    arquivo = readFileSync(caminho());
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw erro;
  }
  exigirCofre();
  const dados = credenciais.parse(JSON.parse(safeStorage.decryptString(arquivo)));
  Object.assign(config.mysql, dados, { ssl: true });
  return true;
}
