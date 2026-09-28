import js from '@eslint/js';
import globals from 'globals';
export default [
  {
    ignores: [
      '_site/**',
      '.cache/**',
      'node_modules/**',
      'src/assets/vendor/**',
      'data/**',
      'src/styles/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: ['**/*.js', '**/*.mjs'], languageOptions: { globals: { ...globals.node } } },
  {
    files: ['src/assets/site.js', 'tests/**/*.js', 'scripts/browser-*.mjs'],
    languageOptions: { globals: { ...globals.browser } },
  },
];
