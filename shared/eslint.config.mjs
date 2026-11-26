import { createRequire } from 'node:module';
import typescriptEslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const js = createRequire(require.resolve('eslint/package.json'))('@eslint/js');

export default [
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
