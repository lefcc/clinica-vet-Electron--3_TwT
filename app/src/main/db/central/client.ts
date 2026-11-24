// Cliente MySQL central com mysql2/promise
import mysql from 'mysql2/promise';
import { config } from '../../config/env';

let pool: mysql.Pool | null = null;

export function getCentralPool(): mysql.Pool {
  if (pool) return pool;

  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    ssl: config.mysql.ssl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5000,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00'
  });

  return pool;
}

export async function closeCentralPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testCentralConnection(): Promise<boolean> {
  try {
    const pool = getCentralPool();
    const connection = await pool.getConnection();
    try {
      await connection.ping();
      return true;
    } finally {
      connection.release();
    }
  } catch {
    return false;
  }
}

// Helper para transações com SELECT ... FOR UPDATE
export async function runInTransaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getCentralPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
