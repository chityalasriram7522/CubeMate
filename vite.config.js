import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    open: false
  },
  preview: {
    host: true,
    port: 5173
  },
  optimizeDeps: {
    include: ['three', 'canvas-confetti', 'lucide']
  }
});
