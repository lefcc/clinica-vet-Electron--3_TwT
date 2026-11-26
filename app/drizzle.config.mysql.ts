// Gera o DDL do MySQL sem carregar o Electron nem credenciais de uma instalação.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/main/db/central/schema.ts',
  out: './dist/migrations-mysql',
  dialect: 'mysql'
});
