/**
 * Configuration Vite (dev server + bundler).
 * ----------------------------------------------------------------
 * Le proxy /api vers le backend evite les soucis CORS en local.
 * En prod c'est nginx qui route les requetes (voir infra/nginx).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
