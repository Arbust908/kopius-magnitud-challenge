import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  base: '/kopius-magnitud-challenge/',
  server: {
    open: true,
  },
});
