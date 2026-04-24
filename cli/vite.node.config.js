import path from 'node:path';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

const external = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
  'vite',
]);

export default defineConfig({
  resolve: {
    alias: {
      '@gizmo3d/engine/automation/headless': path.resolve(__dirname, '../engine/src/automation/headless.ts'),
      '@gizmo3d/engine/automation/session': path.resolve(__dirname, '../engine/src/automation/session.ts'),
      '@gizmo3d/engine/automation/resources': path.resolve(__dirname, '../engine/src/automation/resources.ts'),
      '@gizmo3d/engine/automation/commands': path.resolve(__dirname, '../engine/src/automation/commands.ts'),
      '@gizmo3d/engine/automation/definitions': path.resolve(__dirname, '../engine/src/automation/definitions.ts'),
      '@gizmo3d/engine/automation/world': path.resolve(__dirname, '../engine/src/automation/world.ts'),
      '@gizmo3d/engine/automation': path.resolve(__dirname, '../engine/src/automation/index.ts'),
      '@gizmo3d/engine': path.resolve(__dirname, '../engine/src/index.ts'),
      '@gizmo3d/mcp/stdioServer': path.resolve(__dirname, '../mcp/src/stdioServer.ts'),
      '@gizmo3d/mcp': path.resolve(__dirname, '../mcp/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: 'node20',
    rollupOptions: {
      external: (id) => external.has(id) || id.startsWith('vite/'),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
