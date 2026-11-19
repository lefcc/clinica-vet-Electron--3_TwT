import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/coverage/**", "**/release/**"],
  },
  ...tseslint.configs.recommended,
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
