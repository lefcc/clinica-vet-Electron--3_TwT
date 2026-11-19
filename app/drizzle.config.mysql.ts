// Configuração Drizzle Kit para MySQL (central)
import { defineConfig } from 'drizzle-kit';
import { config } from './src/main/config/env';

export default defineConfig({
  schema: './src/main/db/central/schema.ts',
  out: './src/main/db/central/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    ssl: config.mysql.ssl ? { rejectUnauthorized: false } : undefined
  }
});