import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          toast: ['react-hot-toast'],
          recharts: ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'react-hot-toast', 'recharts']
  }
});
