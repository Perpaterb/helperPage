import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use the repo name as the base path on GitHub Pages (served at /helperPage/).
// When running locally in Docker/dev, BASE_PATH is unset so it defaults to '/'.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 }
});
