import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  root: process.cwd(),
  base: '/',
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
