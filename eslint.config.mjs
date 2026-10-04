import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'app/**', 'scripts/**', 'reports/**', 'playwright-report/**', 'allure-*/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts', 'playwright.config.ts'],
    rules: {
      // Prohibido esperar con tiempos fijos: se debe usar auto-waiting y aserciones web-first.
      'no-restricted-properties': [
        'error',
        { object: 'page', property: 'waitForTimeout', message: 'No uses waits fijos; usa auto-waiting o expect().' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
