import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HeadlessWorldSession } from '../headlessSession';

describe('HeadlessWorldSession', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempPaths.map(async (entry) => {
        await fs.rm(entry, { recursive: true, force: true });
      }),
    );
    tempPaths.length = 0;
  });

  it('creates, edits, and auto-saves a world definition file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-mcp-session-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const session = await HeadlessWorldSession.open({
      worldFilePath,
      autoSave: true,
    });

    try {
      const beforeSummary = session.readResource('world-state-summary') as any;
      expect(beforeSummary.title).toBe('Untitled World');
      expect(beforeSummary.entityCount).toBe(0);

      const result = await session.callTool('add-entity', {
        archetypeOrDef: {
          definition: {
            Info: { name: 'Session Entity' },
            Transform: { x: 4, y: 5, z: 6 },
          },
        },
      });

      expect(result.changed).toBe(true);

      const afterSummary = session.readResource('world-state-summary') as any;
      expect(afterSummary.entityCount).toBe(1);

      const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
      const savedEntities =
        saved.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
          .flatMap((chunk: any) => chunk.entities ?? []) ?? [];

      expect(savedEntities).toHaveLength(1);
      expect(savedEntities[0].Info.name).toBe('Session Entity');
    } finally {
      await session.close();
    }
  });

  it('applies batches through the canonical batch path and saves once coherent world state', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-mcp-session-batch-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const session = await HeadlessWorldSession.open({
      worldFilePath,
      autoSave: true,
    });

    try {
      const result = await session.callBatch(
        [
          {
            name: 'add-entity',
            params: {
              archetypeOrDef: {
                definition: {
                  Info: { name: 'Batch Entity A' },
                },
              },
            },
          },
          {
            name: 'add-entity',
            params: {
              archetypeOrDef: {
                definition: {
                  Info: { name: 'Batch Entity B' },
                },
              },
            },
          },
        ],
        'Batch Smoke',
      );

      expect(result.changed).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results.every((entry) => entry.changed)).toBe(true);

      const afterSummary = session.readResource('world-state-summary') as any;
      expect(afterSummary.entityCount).toBe(2);

      const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
      const savedEntities =
        saved.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
          .flatMap((chunk: any) => chunk.entities ?? []) ?? [];

      expect(savedEntities.map((entity: any) => entity.Info?.name)).toEqual(['Batch Entity A', 'Batch Entity B']);
    } finally {
      await session.close();
    }
  });
});
