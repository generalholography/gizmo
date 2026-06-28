// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../main';
import { startLiveSessionServer } from '../liveServer';
import { ensureCliRun, getCliRunStatePath } from '../runArtifacts';
import { readCliSessionConfig, writeCliLiveSessionConfig, writeCliWorldSessionConfig } from '../sessionConfig';
import { createWorldDefinition } from '@gizmo3d/engine/automation';

describe('CLI main', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
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

  it('prints version through conventional version flags and command', async () => {
    for (const argv of [['--version'], ['-v'], ['version']]) {
      const { io, stdout, stderr } = createIo();

      expect(await runCli(argv, io)).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout[0]).toMatch(/^\d+\.\d+\.\d+/);
    }
  });

  it('prints global and command-specific help through conventional help flags', async () => {
    const globalHelp = createIo();
    expect(await runCli(['--help'], globalHelp.io)).toBe(0);
    expect(globalHelp.stdout[0]).toContain('Usage: gizmo <command>');
    expect(globalHelp.stdout[0]).toContain('-v, --version');

    const commandHelp = createIo();
    expect(await runCli(['start', '--help'], commandHelp.io)).toBe(0);
    expect(commandHelp.stdout[0]).toContain('Usage: gizmo start');
    expect(commandHelp.stdout[0]).toContain('--no-open');

    const helpCommand = createIo();
    expect(await runCli(['help', 'snapshot'], helpCommand.io)).toBe(0);
    expect(helpCommand.stdout[0]).toContain('Usage: gizmo snapshot');
  });

  it('lists and prints bundled agent skills', async () => {
    const listIo = createIo();
    expect(await runCli(['skills'], listIo.io)).toBe(0);
    const payload = JSON.parse(listIo.stdout[0]);
    expect(payload.skillsDir).toEqual(expect.stringContaining('.agents/skills'));
    expect(payload.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'gizmo' }),
      ]),
    );

    const pathIo = createIo();
    expect(await runCli(['skills', '--path'], pathIo.io)).toBe(0);
    expect(pathIo.stdout[0]).toBe(payload.skillsDir);

    const printIo = createIo();
    expect(await runCli(['skills', '--print', 'gizmo'], printIo.io)).toBe(0);
    expect(printIo.stdout[0]).toContain('name: gizmo');
    expect(printIo.stdout[0]).toContain('Agent Loop');
  });

  it('prints installed agent docs from the CLI', async () => {
    const workflowIo = createIo();
    expect(await runCli(['docs', 'workflow'], workflowIo.io)).toBe(0);
    expect(workflowIo.stdout[0]).toContain('Gizmo Agent Workflow');

    const commandIo = createIo();
    expect(await runCli(['docs', 'command', 'add-entity'], commandIo.io)).toBe(0);
    expect(commandIo.stdout[0]).toContain('gizmo call add-entity');
    expect(commandIo.stdout[0]).toContain('archetypeOrDef');

    const componentIo = createIo();
    expect(await runCli(['docs', 'component', 'Transform'], componentIo.io)).toBe(0);
    expect(componentIo.stdout[0]).toContain('Gizmo Component: Transform');
    expect(componentIo.stdout[0]).toContain('position');
  });

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

  it('runs trusted world scripts through the dedicated CLI command', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-world-script-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    const scriptPath = path.join(tempDir, 'scene.world.js');
    tempPaths.push(tempDir);

    await fs.writeFile(scriptPath, `
      export default {
        setupScene(api) {
          api.initialize({
            title: 'CLI Script World',
            entities: [
              { Info: { name: 'CLI Script Plaza' }, Transform: { x: 1, y: 0, z: 2 } }
            ]
          }, { merge: false, spawnEntities: true });
        }
      };
    `);

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['run-world-script', scriptPath, '--world', worldFilePath, '--validate'], io);

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    const payload = JSON.parse(stdout[0]);
    expect(payload).toMatchObject({
      ok: true,
      changed: true,
      persisted: true,
      summary: { title: 'CLI Script World', entityCount: 1 },
    });
    expect(payload.evaluation).toMatchObject({ ok: true });

    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    expect(saved.title).toBe('CLI Script World');
  });

  it('runs generated WorldScript skill examples with clean scene evaluation', async () => {
    const examples = [
      'starter-world.js',
      'arena-survival.world.js',
      'puzzle-dungeon.world.js',
      'dropper-race.world.js',
    ];

    for (const fileName of examples) {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-worldscript-example-'));
      tempPaths.push(tempDir);
      const worldFilePath = path.join(tempDir, 'world.json');
      const scriptPath = path.join(repoRoot, '.agents/skills/gizmo-worldscript/assets', fileName);
      const { io, stdout, stderr } = createIo();

      const exitCode = await runCli(['run-world-script', scriptPath, '--world', worldFilePath, '--validate'], io);
      expect(exitCode, fileName).toBe(0);
      expect(stderr, fileName).toEqual([]);

      const payload = JSON.parse(stdout[0]);
      expect(payload.ok, fileName).toBe(true);
      expect(payload.evaluation, fileName).toMatchObject({
        ok: true,
        summary: { errors: 0, warnings: 0 },
      });
    }
  });

  it('prints MCP config with world-script opt-in when requested', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-mcp-config-world-script-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const initIo = createIo();
    expect(await runCli(['init', worldFilePath], initIo.io)).toBe(0);

    const { io, stdout } = createIo();
    expect(await runCli(['mcp-config', worldFilePath, '--allow-world-scripts'], io)).toBe(0);
    const payload = JSON.parse(stdout[0]);
    expect(payload.mcpServers.gizmo.args).toEqual([
      'mcp',
      '--world',
      worldFilePath,
      '--allow-world-scripts',
    ]);
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

  it('applies a complete world definition to a world file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-apply-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    const inputPath = path.join(tempDir, 'scene.json');
    tempPaths.push(tempDir);
    await fs.writeFile(worldFilePath, JSON.stringify(createWorldDefinition({ title: 'Before' })), 'utf8');
    await fs.writeFile(inputPath, JSON.stringify(createWorldDefinition({
      title: 'Applied Scene',
      dimensions: [
        {
          name: 'base',
          chunks: [
            {
              chunkId: '0_0_0',
              entities: [
                {
                  Info: { name: 'Applied Entity' },
                  Transform: { position: { x: 1, y: 2, z: 3 } },
                },
              ],
            },
          ],
        },
      ],
    })), 'utf8');

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['apply', inputPath, '--world', worldFilePath], io, { cwd: tempDir });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout[0])).toMatchObject({
      ok: true,
      mode: 'world',
      worldFilePath,
      changed: true,
    });
    const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    expect(saved.title).toBe('Applied Scene');
    expect(saved.dimensions[0].chunks[0].entities[0].Info.name).toBe('Applied Entity');
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

  it('stops an active live session and clears local session state', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-stop-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);
    await fs.writeFile(worldFilePath, JSON.stringify(createWorldDefinition({ title: 'Stop Test' })), 'utf8');

    let server;
    try {
      server = await startLiveSessionServer({
        worldFilePath,
        host: '127.0.0.1',
        port: 0,
        token: 'stop-token',
      });
    } catch (error: any) {
      if (error?.code === 'EPERM' || String(error?.message || error).includes('listen EPERM')) {
        return;
      }
      throw error;
    }

    const info = server.getInfo();
    await writeCliLiveSessionConfig(
      {
        worldFilePath,
        serverUrl: info.serverUrl,
        token: 'stop-token',
        browserUrl: info.browserUrl,
      },
      tempDir,
    );
    await ensureCliRun({
      cwd: tempDir,
      target: {
        mode: 'live',
        serverUrl: info.serverUrl,
        token: 'stop-token',
        browserUrl: info.browserUrl,
        worldFilePath,
      },
    });

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['stop'], io, { cwd: tempDir });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout[0])).toMatchObject({
      ok: true,
      serverUrl: info.serverUrl,
      removedSessionConfig: true,
      removedRunState: true,
    });
    await expect(readCliSessionConfig(tempDir)).resolves.toBeNull();
    await expect(fs.stat(getCliRunStatePath(tempDir))).rejects.toMatchObject({ code: 'ENOENT' });
  }, 15000);

  it('does not clear unrelated local state when stopping an explicit server', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-stop-explicit-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);
    await fs.writeFile(worldFilePath, JSON.stringify(createWorldDefinition({ title: 'Explicit Stop Test' })), 'utf8');

    let server;
    try {
      server = await startLiveSessionServer({
        worldFilePath,
        host: '127.0.0.1',
        port: 0,
        token: 'stop-token',
      });
    } catch (error: any) {
      if (error?.code === 'EPERM' || String(error?.message || error).includes('listen EPERM')) {
        return;
      }
      throw error;
    }

    const worldConfig = await writeCliWorldSessionConfig(worldFilePath, tempDir);
    const info = server.getInfo();
    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['stop', '--server', info.serverUrl, '--token', 'stop-token'], io, { cwd: tempDir });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout[0])).toMatchObject({
      ok: true,
      serverUrl: info.serverUrl,
      removedSessionConfig: false,
      removedRunState: false,
    });
    await expect(readCliSessionConfig(tempDir)).resolves.toEqual(worldConfig);
  }, 15000);

  it('evaluates a clean headless scene with actionable phase 1 and 2 metrics', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-eval-clean-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    await fs.writeFile(
      worldFilePath,
      JSON.stringify(
        createWorldDefinition({
          title: 'Evaluation Clean Room',
          entities: [
            {
              Info: { name: 'Floor' },
              StableID: { id: 1 },
              Transform: { x: 0, y: -0.05, z: 0 },
              Body: {
                type: 'composite',
                params: {
                  parts: [
                    {
                      geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.1, lengthZ: 8 } },
                    },
                  ],
                },
              },
              MotionSource: { type: 'static', params: {} },
            },
            {
              Info: { name: 'Crate' },
              StableID: { id: 2 },
              Transform: { x: 0, y: 0.5, z: 0 },
              Body: {
                type: 'composite',
                params: {
                  parts: [
                    {
                      geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                    },
                  ],
                },
              },
              MotionSource: { type: 'static', params: {} },
            },
          ],
        }),
      ),
      'utf8',
    );

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['eval', worldFilePath, '--checks', 'basic,inventory,bounds,intersections,coplanar'], io);

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    const report = JSON.parse(stdout[0]);
    expect(report.ok).toBe(true);
    expect(report.world).toMatchObject({ title: 'Evaluation Clean Room', entityCount: 2, worldFilePath });
    expect(report.checks.map((check: any) => check.id)).toEqual([
      'basic.loadability',
      'basic.stableIds',
      'basic.transforms',
      'inventory.summary',
      'bounds.world',
      'bounds.placement',
      'geometry.intersections',
      'geometry.coplanar',
    ]);
    expect(report.checks.find((check: any) => check.id === 'geometry.intersections').metrics.aabbOverlapPairs).toBe(0);
    expect(report.checks.find((check: any) => check.id === 'geometry.coplanar').metrics.coplanarFacePairs).toBe(0);
  });

  it('reports intersections and supports fail-on thresholds', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-eval-intersections-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const cubeBody = {
      type: 'composite',
      params: {
        parts: [
          {
            geometry: { type: 'box', params: { lengthX: 2, lengthY: 2, lengthZ: 2 } },
          },
        ],
      },
    };

    await fs.writeFile(
      worldFilePath,
      JSON.stringify(
        createWorldDefinition({
          title: 'Evaluation Intersections',
          entities: [
            {
              Info: { name: 'Left Cube' },
              StableID: { id: 10 },
              Transform: { x: 0, y: 1, z: 0 },
              Body: cubeBody,
              MotionSource: { type: 'static', params: {} },
            },
            {
              Info: { name: 'Right Cube' },
              StableID: { id: 11 },
              Transform: { x: 0.5, y: 1, z: 0 },
              Body: cubeBody,
              MotionSource: { type: 'static', params: {} },
            },
          ],
        }),
      ),
      'utf8',
    );

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['eval', worldFilePath, '--checks', 'intersections', '--fail-on', 'error'], io);

    expect(exitCode).toBe(2);
    expect(stderr).toEqual([]);
    const report = JSON.parse(stdout[0]);
    const intersections = report.checks.find((check: any) => check.id === 'geometry.intersections');
    expect(report.ok).toBe(false);
    expect(intersections.status).toBe('error');
    expect(intersections.metrics.aabbOverlapPairs).toBe(1);
    expect(intersections.findings[0]).toMatchObject({
      severity: 'error',
      stableIds: [10, 11],
    });
  });

  it('reports coplanar surfaces that can z-fight', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-eval-coplanar-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const panelBody = {
      type: 'composite',
      params: {
        parts: [
          {
            geometry: { type: 'box', params: { lengthX: 4, lengthY: 0.1, lengthZ: 4 } },
          },
        ],
      },
    };

    await fs.writeFile(
      worldFilePath,
      JSON.stringify(
        createWorldDefinition({
          title: 'Evaluation Coplanar Surfaces',
          entities: [
            {
              Info: { name: 'Base Panel' },
              StableID: { id: 20 },
              Transform: { x: 0, y: -0.05, z: 0 },
              Body: panelBody,
              MotionSource: { type: 'static', params: {} },
            },
            {
              Info: { name: 'Duplicate Top Panel' },
              StableID: { id: 21 },
              Transform: { x: 0.25, y: -0.05, z: 0.25 },
              Body: panelBody,
              MotionSource: { type: 'static', params: {} },
            },
            {
              Info: { name: 'Supported Crate' },
              StableID: { id: 22 },
              Transform: { x: 0, y: 0.5, z: 0 },
              Body: {
                type: 'composite',
                params: {
                  parts: [
                    {
                      geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                    },
                  ],
                },
              },
              MotionSource: { type: 'static', params: {} },
            },
          ],
        }),
      ),
      'utf8',
    );

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['eval', worldFilePath, '--checks', 'coplanar', '--coplanar-tolerance', '0.01'], io);

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    const report = JSON.parse(stdout[0]);
    expect(report.checks.map((check: any) => check.id)).toEqual(['geometry.coplanar']);
    const coplanar = report.checks[0];
    expect(coplanar.status).toBe('warning');
    expect(coplanar.metrics.coplanarFacePairs).toBe(1);
    expect(coplanar.findings[0]).toMatchObject({
      severity: 'warning',
      stableIds: [20, 21],
    });
  });

  it('writes markdown eval reports to disk', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-eval-output-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    const reportPath = path.join(tempDir, 'report.md');
    tempPaths.push(tempDir);
    await fs.writeFile(worldFilePath, JSON.stringify(createWorldDefinition({ title: 'Markdown Eval' })), 'utf8');

    const { io, stdout, stderr } = createIo();
    const exitCode = await runCli(['eval', worldFilePath, '--format', 'markdown', '--output', reportPath], io);

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout[0])).toMatchObject({ ok: true, outputPath: reportPath });
    await expect(fs.readFile(reportPath, 'utf8')).resolves.toContain('# Scene Evaluation: Markdown Eval');
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
