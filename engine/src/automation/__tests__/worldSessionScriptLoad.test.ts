import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HeadlessWorldSession } from '../headlessSession';

describe('HeadlessWorldSession world-script loading', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempPaths.map(async (entry) => {
        await fs.rm(entry, { recursive: true, force: true });
      }),
    );
    tempPaths.length = 0;
  });

  it('loads a setupScene world script and can write it back after automation edits', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-mcp-script-session-'));
    const scriptPath = path.join(tempDir, 'blank-world.js');
    tempPaths.push(tempDir);

    const sourcePath = path.resolve(__dirname, '../../worlds/blank-world.js');
    await fs.copyFile(sourcePath, scriptPath);

    const session = await HeadlessWorldSession.open({
      worldFilePath: scriptPath,
      autoSave: true,
    });

    try {
      const summary = session.readResource('world-state-summary') as any;
      expect(summary.title).toBe('Blank World');

      await session.callTool('add-entity', {
        archetypeOrDef: {
          definition: {
            Info: { name: 'Script Entity' },
          },
        },
      });

      const savedScript = await fs.readFile(scriptPath, 'utf8');
      expect(savedScript).toContain('const worldDefinition =');
      expect(savedScript).toContain('Script Entity');
    } finally {
      await session.close();
    }
  });

  it('persists custom runtime module types and instances through headless auto-save', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-mcp-runtime-type-session-'));
    const worldPath = path.join(tempDir, 'runtime-world.json');
    tempPaths.push(tempDir);

    const session = await HeadlessWorldSession.open({
      worldFilePath: worldPath,
      autoSave: true,
    });

    try {
      await session.callTool('upsert-module-type', {
        moduleName: 'field',
        typeName: 'radialPulse',
        description: 'Headless persisted runtime field',
        factorySource:
          '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
      });
      await session.callTool('upsert-module-instance', {
        moduleName: 'field',
        instanceName: 'pulseMask',
        definition: {
          type: 'radialPulse',
          params: { radius: 0.4, amplitude: 3 },
        },
      });

      const savedWorld = JSON.parse(await fs.readFile(worldPath, 'utf8')) as any;
      expect(savedWorld.moduleTypes).toEqual([
        expect.objectContaining({
          moduleName: 'field',
          typeName: 'radialPulse',
          description: 'Headless persisted runtime field',
        }),
      ]);
      expect(savedWorld.modules?.field).toEqual([
        expect.objectContaining({
          name: 'pulseMask',
          definition: {
            type: 'radialPulse',
            params: { radius: 0.4, amplitude: 3 },
          },
        }),
      ]);
    } finally {
      await session.close();
    }

    const reloaded = await HeadlessWorldSession.open({
      worldFilePath: worldPath,
      autoSave: false,
    });

    try {
      const typeCatalog = reloaded.readResource('module-type-catalog') as any[];
      const instanceCatalog = reloaded.readResource('module-instance-catalog') as any[];
      expect(typeCatalog.some((entry) => entry.moduleName === 'field' && entry.typeName === 'radialPulse' && entry.persisted)).toBe(true);
      expect(instanceCatalog.some((entry) => entry.moduleName === 'field' && entry.instanceName === 'pulseMask')).toBe(true);
    } finally {
      await reloaded.close();
    }
  });
});
