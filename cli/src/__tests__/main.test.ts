// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../main';

describe('CLI main', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(tempPaths.map(async (entry) => fs.rm(entry, { recursive: true, force: true })));
    tempPaths.length = 0;
  });

  function createIo() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    return {
      io: {
        stdout: (text: string) => stdout.push(text),
        stderr: (text: string) => stderr.push(text),
      },
      stdout,
      stderr,
    };
  }

  it('executes a headless command and persists changes', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-main-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(
      [
        'call',
        '--world',
        worldFilePath,
        '--command',
        'add-entity',
        '--params',
        JSON.stringify({
          archetypeOrDef: {
            definition: {
              Info: { name: 'CLI Entity' },
              Transform: { x: 1, y: 2, z: 3 },
            },
          },
        }),
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);

    const payload = JSON.parse(stdout[0]);
    expect(payload.changed).toBe(true);

    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    const entities =
      saved.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
        .flatMap((chunk: any) => chunk.entities ?? []) ?? [];
    expect(entities.some((entity: any) => entity?.Info?.name === 'CLI Entity')).toBe(true);
  });

  it('supports dry-run headless calls without writing changes', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-dry-run-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const initIo = createIo();
    expect(await runCli(['init', worldFilePath], initIo.io)).toBe(0);
    const before = await fs.readFile(worldFilePath, 'utf8');

    const { io, stdout } = createIo();
    const exitCode = await runCli(
      [
        'call',
        'add-entity',
        '--world',
        worldFilePath,
        '--dry-run',
        '--params',
        JSON.stringify({
          archetypeOrDef: {
            definition: {
              Info: { name: 'Dry Run Entity' },
            },
          },
        }),
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout[0])).toMatchObject({
      changed: true,
      dryRun: true,
      persisted: false,
    });
    await expect(fs.readFile(worldFilePath, 'utf8')).resolves.toBe(before);
  });

  it('initializes a new gizmo workspace in a target directory', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-init-'));
    const projectDir = path.join(tempDir, 'new-gizmo-project');
    tempPaths.push(tempDir);

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['init', projectDir], io);

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);

    const payload = JSON.parse(stdout[0]);
    const worldFilePath = path.join(projectDir, 'world.json');
    expect(payload.mode).toBe('init');
    expect(payload.workspaceDir).toBe(projectDir);
    expect(payload.worldFilePath).toBe(worldFilePath);
    expect(payload.created).toBe(true);
    expect(payload.selectedForWorkspace).toBe(true);
    expect(payload.mcpConfig).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp', '--world', worldFilePath],
        },
      },
    });

    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    expect(saved.title).toBe('Untitled World');

    const session = JSON.parse(await fs.readFile(path.join(projectDir, '.gizmo', 'session.json'), 'utf8'));
    expect(session.worldFilePath).toBe(worldFilePath);
  });

  it('reads a headless resource', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-resource-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const { io, stdout } = createIo();
    const exitCode = await runCli(['resource', '--world', worldFilePath, '--resource', 'world-state-summary'], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout[0]);
    expect(payload.title).toBe('Untitled World');
    expect(payload.entityCount).toBe(0);
  });

  it('supports positional resource and call syntax', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-positional-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const callIo = createIo();
    const callExitCode = await runCli(
      [
        'call',
        'add-entity',
        '--world',
        worldFilePath,
        '--params',
        JSON.stringify({
          archetypeOrDef: {
            definition: {
              Info: { name: 'Positional Entity' },
            },
          },
        }),
      ],
      callIo.io,
    );

    expect(callExitCode).toBe(0);

    const resourceIo = createIo();
    const resourceExitCode = await runCli(['resource', 'world-state-summary', '--world', worldFilePath], resourceIo.io);
    expect(resourceExitCode).toBe(0);

    const payload = JSON.parse(resourceIo.stdout[0]);
    expect(payload.entityCount).toBe(1);
  });

  it('executes headless batches atomically through the shared automation session', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-batch-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const batchIo = createIo();
    const batchExitCode = await runCli(
      [
        'batch',
        '--world',
        worldFilePath,
        '--description',
        'CLI Batch',
        '--calls',
        JSON.stringify([
          {
            name: 'add-entity',
            params: {
              archetypeOrDef: {
                definition: {
                  Info: { name: 'Batch Entity One' },
                },
              },
            },
          },
          {
            name: 'add-entity',
            params: {
              archetypeOrDef: {
                definition: {
                  Info: { name: 'Batch Entity Two' },
                },
              },
            },
          },
        ]),
      ],
      batchIo.io,
    );

    expect(batchExitCode).toBe(0);
    const payload = JSON.parse(batchIo.stdout[0]);
    expect(payload.results).toHaveLength(2);
    expect(payload.results.every((entry: any) => entry.result.changed)).toBe(true);

    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    const entities =
      saved.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
        .flatMap((chunk: any) => chunk.entities ?? []) ?? [];
    expect(entities.map((entity: any) => entity.Info?.name)).toEqual(['Batch Entity One', 'Batch Entity Two']);
  });

  it('saves a default world with use and reuses it for headless commands', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-use-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const useIo = createIo();
    const useExitCode = await runCli(['use', worldFilePath], useIo.io, { cwd: tempDir });
    expect(useExitCode).toBe(0);

    const savedConfig = JSON.parse(await fs.readFile(path.join(tempDir, '.gizmo/session.json'), 'utf8'));
    expect(savedConfig.worldFilePath).toBe(worldFilePath);

    const callIo = createIo();
    const callExitCode = await runCli(
      [
        'call',
        '--command',
        'add-entity',
        '--params',
        JSON.stringify({
          archetypeOrDef: {
            definition: {
              Info: { name: 'Saved World Entity' },
            },
          },
        }),
      ],
      callIo.io,
      { cwd: tempDir },
    );

    expect(callExitCode).toBe(0);

    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    const entities =
      saved.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
        .flatMap((chunk: any) => chunk.entities ?? []) ?? [];
    expect(entities.some((entity: any) => entity?.Info?.name === 'Saved World Entity')).toBe(true);
  });

  it('persists runtime module types and instances through shared headless commands', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-runtime-modules-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const upsertTypeIo = createIo();
    expect(
      await runCli(
        [
          'call',
          '--world',
          worldFilePath,
          '--command',
          'upsert-module-type',
          '--params',
          JSON.stringify({
            moduleName: 'field',
            typeName: 'radialPulse',
            description: 'CLI persisted runtime field',
            factorySource:
              '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
          }),
        ],
        upsertTypeIo.io,
      ),
    ).toBe(0);

    const upsertInstanceIo = createIo();
    expect(
      await runCli(
        [
          'call',
          '--world',
          worldFilePath,
          '--command',
          'upsert-module-instance',
          '--params',
          JSON.stringify({
            moduleName: 'field',
            instanceName: 'pulseMask',
            definition: {
              type: 'radialPulse',
              params: { radius: 0.4, amplitude: 2 },
            },
          }),
        ],
        upsertInstanceIo.io,
      ),
    ).toBe(0);

    const resourceIo = createIo();
    expect(
      await runCli(['resource', '--world', worldFilePath, '--resource', 'module-type-catalog'], resourceIo.io),
    ).toBe(0);
    const typeCatalog = JSON.parse(resourceIo.stdout[0]);
    expect(
      typeCatalog.some(
        (entry: any) =>
          entry.moduleName === 'field' && entry.typeName === 'radialPulse' && entry.persisted,
      ),
    ).toBe(true);

    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    expect(saved.moduleTypes).toEqual([
      expect.objectContaining({
        moduleName: 'field',
        typeName: 'radialPulse',
        description: 'CLI persisted runtime field',
      }),
    ]);
    expect(saved.modules?.field).toEqual([
      expect.objectContaining({
        name: 'pulseMask',
        definition: {
          type: 'radialPulse',
          params: { radius: 0.4, amplitude: 2 },
        },
      }),
    ]);
  });

  it('prints MCP config for the selected world or a live server', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-config-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const useIo = createIo();
    expect(await runCli(['use', worldFilePath], useIo.io, { cwd: tempDir })).toBe(0);

    const worldConfigIo = createIo();
    expect(await runCli(['mcp-config'], worldConfigIo.io, { cwd: tempDir })).toBe(0);
    expect(JSON.parse(worldConfigIo.stdout[0])).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp'],
        },
      },
    });

    const liveConfigIo = createIo();
    expect(await runCli(['mcp-config', '--server', 'http://127.0.0.1:4292'], liveConfigIo.io)).toBe(0);
    expect(JSON.parse(liveConfigIo.stdout[0])).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp', '--server', 'http://127.0.0.1:4292'],
        },
      },
    });
  });

  it('cleans stale workspace runs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-clean-'));
    tempPaths.push(tempDir);

    await fs.mkdir(path.join(tempDir, '.gizmo', 'runs', 'stale-run', 'artifacts'), { recursive: true });

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['clean'], io, { cwd: tempDir });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    const payload = JSON.parse(stdout[0]);
    expect(payload.removedRunDirs).toContain(path.join(tempDir, '.gizmo', 'runs', 'stale-run'));
    await expect(fs.stat(path.join(tempDir, '.gizmo', 'runs', 'stale-run'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects removed pre-alpha command aliases', async () => {
    const devIo = createIo();
    expect(await runCli(['dev'], devIo.io)).toBe(1);
    expect(devIo.stderr[0]).toContain("Unknown command 'dev'.");

    const liveIo = createIo();
    expect(await runCli(['live'], liveIo.io)).toBe(1);
    expect(liveIo.stderr[0]).toContain("Unknown command 'live'.");
  });
});
