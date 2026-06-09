/**
 * Configuration Vite (dev server + bundler).
 * ----------------------------------------------------------------
 * base '/app/': le dashboard est servi sous accelyo.fr/app (la racine
 * du domaine est occupee par le site vitrine). Les assets sont donc
 * references avec le prefixe /app/.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/app/',
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
