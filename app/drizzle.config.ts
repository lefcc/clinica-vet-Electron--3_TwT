// Configuração Drizzle Kit para SQLite (local) e MySQL (central)
import { defineConfig } from 'drizzle-kit';
import * as path from 'path';

export default defineConfig({
  schema: './src/main/db/local/schema.ts',
  out: './src/main/db/local/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(process.cwd(), 'src/main/db/local/migrations') // placeholder
  },
  // Configuração para MySQL (central) - usar variável de ambiente ou arquivo separado
  // Para gerar migrations MySQL: drizzle-kit generate --config=drizzle.config.mysql.ts
});