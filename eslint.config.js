import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        AbortController: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        RequestInit: 'readonly',
        ResizeObserver: 'readonly',
        Response: 'readonly',
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        queueMicrotask: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
  },
);
