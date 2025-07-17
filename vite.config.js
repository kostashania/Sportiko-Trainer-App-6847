import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {'@': path.resolve(__dirname, './src')}
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Make sure environment variables are properly loaded
  define: {
    'process.env': {}
  }
});