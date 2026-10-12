import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createBillionDollarApiPlugin } from './src/server/apiPlugin.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    createBillionDollarApiPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
