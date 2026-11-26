import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    alias: {
      '@clinica-vet/shared': path.resolve(__dirname, '../shared/dist'),
      '@clinica-vet/app': path.resolve(__dirname, 'src'),
    },
  },
});