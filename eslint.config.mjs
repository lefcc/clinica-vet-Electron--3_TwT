// A1 revisada: quatro ferramentas diretas, sem parser/plugin adicional.
// Os pontos de entrada vazios são válidos no parser padrão. Antes de código
// TS/IPC real, propor e aprovar um parser TS na tarefa correspondente.
export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/coverage/**", "**/release/**"],
  },
  {
    files: ["**/*.{mjs,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "constructor-super": "error",
      "for-direction": "error",
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-duplicate-case": "error",
      "no-duplicate-imports": "error",
      "no-eval": "error",
      "no-fallthrough": "error",
      "no-unreachable": "error",
      "no-unused-labels": "error",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
    },
  },
];
