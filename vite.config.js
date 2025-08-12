import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to copy manifest and icons
    {
      name: 'copy-extension-files',
      generateBundle() {
        // Ensure dist directory exists
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        
        // Copy manifest.json from public directory
        if (existsSync('public/manifest.json')) {
          copyFileSync('public/manifest.json', 'dist/manifest.json');
        }
        
        // Copy icons directory
        if (existsSync('public/icons')) {
          if (!existsSync('dist/icons')) {
            mkdirSync('dist/icons', { recursive: true });
          }
          const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];
          iconFiles.forEach(file => {
            if (existsSync(`public/icons/${file}`)) {
              copyFileSync(`public/icons/${file}`, `dist/icons/${file}`);
            }
          });
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.tsx'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Specific naming for Chrome extension files
          if (chunkInfo.name === 'popup') return 'popup.js';
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'background') return 'background.js';
          return '[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          // Handle files specifically for Chrome extension
          if (assetInfo.name?.endsWith('.css')) {
            if (assetInfo.name.includes('popup')) return 'popup.css';
            if (assetInfo.name.includes('content')) return 'content.css';
            return '[name].[ext]';
          }
          if (assetInfo.name === 'index.html') return 'popup.html';
          return '[name].[ext]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@content': resolve(__dirname, 'src/content'),
      '@background': resolve(__dirname, 'src/background'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  server: {
    port: 3000,
    hmr: {
      port: 3001,
    },
  },
});