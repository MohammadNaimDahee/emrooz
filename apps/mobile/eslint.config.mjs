// Minimal ESLint 9 flat config for the mobile app.
//
// The mobile app used to inherit @emrooz/config/eslint/react-native, but
// that preset is written in legacy `.eslintrc.*` format and ESLint 9 only
// loads flat configs. Migrating the shared preset to flat config is out
// of scope for this pass, so we run a lightweight, config-agnostic
// TypeScript lint here — enough to catch the obvious mistakes without
// pulling in every React-Native-specific rule.
//
// Typecheck (`pnpm --filter @emrooz/mobile typecheck`) still enforces the
// hard type invariants; this file just handles the stylistic layer.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'ios/**',
      'android/**',
      'dist/**',
      'build/**',
      'assets/**',
      'scripts/**',
      'plugins/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // React Native does not require importing React with the new
      // JSX runtime, and Expo's default tsconfig sets jsx: "react-native".
      'no-undef': 'off',
      // Unused vars still surface real bugs; keep it as a warning that
      // ignores intentionally-prefixed underscores.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` shows up in a few places where React Native APIs are
      // loosely typed; downgrade to warn so it doesn't gate CI.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Config files (babel.config.js, metro.config.js) run under Node
    // CommonJS. Don't flag `module`, `require`, `__dirname` as undefined,
    // and don't push them toward ESM import syntax — they're loaded by
    // tooling that expects CJS.
    files: ['*.config.js', '*.config.cjs', '*.config.mjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
