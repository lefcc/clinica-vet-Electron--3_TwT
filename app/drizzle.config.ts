import { defineConfig } from 'drizzle-kit';

const url = process.env.SQLITE_PATH;

export default defineConfig({
  schema: './src/main/db/local/schema.ts',
  out: './src/main/db/local/migrations',
  dialect: 'sqlite',
  ...(url ? { dbCredentials: { url } } : {})
});
