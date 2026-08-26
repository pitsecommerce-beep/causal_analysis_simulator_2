import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/cliente',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/escena/')) return 'escena';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'recharts';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
