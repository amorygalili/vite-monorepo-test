// vite.config.ts at root

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // root default – Vite serves from the root folder
  resolve: {
    alias: {
      '@myorg/c': path.resolve(__dirname, 'packages/c/src'),
      '@myorg/b': path.resolve(__dirname, 'packages/b/src'),
      '@myorg/a': path.resolve(__dirname, 'packages/a/src')
    },
    // this lets Vite follow symlinked workspace imports
    preserveSymlinks: true
  },
  server: {
    fs: {
      allow: [
        // allow serving files from workspace packages
        path.resolve(__dirname, 'packages')
      ]
    }
  },
  optimizeDeps: {
    // optionally include the workspace packages so Vite pre-bundles them
    include: [
      '@myorg/c',
      '@myorg/b',
      '@myorg/a'
    ]
  }
});

