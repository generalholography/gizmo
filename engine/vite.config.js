import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';
import fs from 'fs';
import path from 'path';

function cleanDirPlugin(dir) {
  return {
    name: 'clean-dir',
    buildStart() {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Cleaned: ${dir}`);
      }
    },
  };
}

const engineVersion = process.env.ENGINE_VERSION || '0.1.1';
const outDir = 'dist/browser/' + engineVersion;

export default defineConfig({
  // Ensure generated asset URLs (e.g., worker files) are relative to index.js
  // so they resolve within /engines/{version}/ when loaded dynamically.
  base: './',
  server: { open: true },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Engine',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      output: {
        // Honor ENGINE_VERSION, defaulting to 0.1.1 when not provided.
        // Keep browser runtime artifacts owned by the engine package; private
        // apps copy selected versions into their public asset trees explicitly.
        dir: outDir,
        format: 'es',
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        inlineDynamicImports: true
      },
      external: [], // Bundle all dependencies for standalone engine
    },
    sourcemap: false,
  },
  plugins: [
    cleanDirPlugin(outDir),
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    }),
  ],
  worker: {
    format: 'es', // Use ES modules for workers too
  }
});
