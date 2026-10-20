import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: true // Permite acceso mediante túneles públicos (Cloudflare, localtunnel, etc.)
  }
});
