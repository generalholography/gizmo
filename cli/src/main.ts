#!/usr/bin/env node

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  HeadlessWorldSession,
  listAutomationCommands,
  listAutomationResourceDefinitions,
  type AutomationSession,
  type AutomationCommandCall,
} from '@gizmo3d/engine/automation';
import { runStdioServer } from '@gizmo3d/mcp/stdioServer';
import {
  getBooleanFlag,
  getStringFlag,
  parseCliArgs,
  parseJsonFlag,
  parseOptionalNumber,
  type ParsedCliArgs,
} from './argParser';
import { buildMcpCommand, buildMcpConfig } from './agentConfig';
import { LiveAutomationSession } from './liveSession';
import { openUrl } from './openUrl';
import {
  readLiveServerSession,
} from './serverClient';
import {
  getCliSessionConfigPath,
  readCliSessionConfig,
  resolveCliTarget,
  resolveDefaultWorldFilePath,
  writeCliLiveSessionConfig,
  writeCliWorldSessionConfig,
} from './sessionConfig';
import {
  cleanCliArtifacts,
  createCliArtifactOutputPath,
  ensureCliRun,
  type CliRunConfig,
} from './runArtifacts';
import { buildLiveSessionOutput } from './liveSessionOutput';
import { initializeWorldFile, resolveInitWorldFilePath } from './worldFile';

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export interface CliRuntime {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

function defaultIo(): CliIo {
  return {
    stdout: (text) => process.stdout.write(`${text}\n`),
    stderr: (text) => process.stderr.write(`${text}\n`),
  };
}

function usage(): string {
  return [
    'Usage: gizmo <command> [args] [options]',
    '',
    'Commands:',
    '  init       Create a gizmo world in a directory and save it for that workspace',
    '  use        Save a default world file for this workspace',
    '  dev        Start the live session, optionally open the browser, and print agent setup info',
    '  mcp        Start the stdio MCP server for a world file',
    '  mcp-config Print the MCP config snippet for a world file or live server',
    '  live       Start a browser-backed live session server',
    '  call       Execute one engine command against a world file or live server',
    '  batch      Execute a batch of engine commands',
    '  resource   Read one engine resource',
    '  camera     Inspect or control the active viewport camera',
    '  snapshot   Capture a render screenshot resource',
    '  clean      Remove stale gizmo run artifacts and legacy session files',
    '  commands   List available engine commands',
    '  resources  List available engine resources',
    '  session    Read one live session summary',
    '',
    'Common options:',
    '  --world <path>    Local world file path',
    '  --server <url>    Live session server URL',
    '  --token <value>   Live session token for explicit --server calls',
    '',
    'Examples:',
    '  gizmo init',
    '  gizmo init ./my-world',
    '  gizmo use ./engine/src/worlds/live-cli-demo.json',
    '  gizmo dev',
    '  gizmo resource world-state-summary',
    '  gizmo call add-entity --params \'{"archetypeOrDef":"cube"}\'',
    '  gizmo camera get',
    '  gizmo camera set --position \'{"x":0,"y":8,"z":18}\' --look-at \'{"x":0,"y":4,"z":0}\'',
    '  gizmo camera frame-entity 12',
    '  gizmo live',
    '  gizmo call add-entity --dry-run --params \'{"archetypeOrDef":"cube"}\'',
    '',
    'Saved defaults:',
    '  gizmo use /absolute/path/to/world.json',
    '  ENGINE_WORLD=/absolute/path/to/world.json',
    '',
    'JSON flags accept inline JSON or @path/to/file.json',
    'Live sessions bind to loopback by default. Use --allow-remote only for trusted networks.',
  ].join('\n');
}

async function handleInit(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const worldFilePath = resolveInitWorldFilePath(getPositionalOrFlag(parsed, 0, 'world'), cwd);
  const workspaceDir = path.dirname(worldFilePath);
  const initialized = await initializeWorldFile(worldFilePath, {
    force: getBooleanFlag(parsed, 'force'),
  });
  const shouldSaveWorkspace = !getBooleanFlag(parsed, 'no-use');
  const config = shouldSaveWorkspace
    ? await writeCliWorldSessionConfig(initialized.worldFilePath, workspaceDir)
    : null;

  printJson(io, {
    mode: 'init',
    workspaceDir,
    worldFilePath: initialized.worldFilePath,
    worldFormat: initialized.format,
    created: initialized.created,
    overwrote: initialized.overwrote,
    selectedForWorkspace: shouldSaveWorkspace,
    configPath: config ? getCliSessionConfigPath(workspaceDir) : null,
    savedAt: config?.savedAt ?? null,
    mcpConfig: buildMcpConfig({ worldFilePath: initialized.worldFilePath }),
    nextSteps: [
      `cd ${workspaceDir}`,
      'Run gizmo dev --no-open to start a browser-backed live session for Codex or another agent.',
      'Run gizmo mcp to attach a headless MCP session to this world.',
    ],
  });
}

function printJson(io: CliIo, value: unknown): void {
  io.stdout(JSON.stringify(value, null, 2));
}

async function maybeWriteScreenshotOutput(
  data: any,
  options: {
    outputPath?: string;
    cwd?: string;
    target?: { mode: 'world'; worldFilePath: string } | { mode: 'live'; serverUrl: string; worldFilePath?: string; browserUrl?: string };
    defaultPrefix?: string;
  } = {},
): Promise<any> {
  if (!data?.dataUrl || typeof data.dataUrl !== 'string') {
    throw new Error('Screenshot output requested, but resource response did not include a dataUrl.');
  }

  const match = data.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Screenshot dataUrl was not base64-encoded.');
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  const cwd = options.cwd ?? process.cwd();
  const artifactOutput =
    options.outputPath
      ? { outputPath: path.resolve(cwd, options.outputPath), run: null as CliRunConfig | null }
      : options.defaultPrefix
        ? await createCliArtifactOutputPath({
            cwd,
            target: options.target,
            prefix: options.defaultPrefix,
            mimeType,
          })
        : null;
  if (!artifactOutput) {
    throw new Error('Screenshot output requested, but no output path or default artifact prefix was provided.');
  }

  const resolvedOutputPath = artifactOutput.outputPath;
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, buffer);

  return {
    outputPath: resolvedOutputPath,
    mimeType,
    width: data.width,
    height: data.height,
    ...(artifactOutput.run ? { runId: artifactOutput.run.id, runDir: artifactOutput.run.runDir } : {}),
  };
}

function getResourceParams(parsed: ParsedCliArgs): Record<string, any> {
  const params: Record<string, any> = {};
  const eid = parseOptionalNumber(getStringFlag(parsed, 'eid'), 'eid');
  const stableId = parseOptionalNumber(getStringFlag(parsed, 'stable-id'), 'stable-id');
  if (eid !== undefined) params.eid = eid;
  if (stableId !== undefined) params.stableId = stableId;
  return params;
}

function getPositionalOrFlag(parsed: ParsedCliArgs, index: number, flagName: string): string | undefined {
  return parsed.positionals[index] ?? getStringFlag(parsed, flagName);
}

async function openAutomationSession(
  target: Awaited<ReturnType<typeof resolveCliTarget>>,
  autoSave: boolean,
): Promise<AutomationSession> {
  if (target.mode === 'live') {
    return new LiveAutomationSession(target.serverUrl, target.token);
  }

  return await HeadlessWorldSession.open({
    worldFilePath: target.worldFilePath,
    autoSave,
  });
}

async function handleCall(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const commandName = getPositionalOrFlag(parsed, 0, 'command');
  if (!commandName) {
    throw new Error('call requires a command name as the first argument or via --command.');
  }
  const cwd = runtime.cwd ?? process.cwd();
  const params = await parseJsonFlag<Record<string, any>>(getStringFlag(parsed, 'params'), cwd);
  const target = await resolveCliTarget(
    {
      serverUrl: getStringFlag(parsed, 'server'),
      token: getStringFlag(parsed, 'token'),
      worldFilePath: getStringFlag(parsed, 'world'),
    },
    cwd,
    runtime.env,
  );
  const dryRun = getBooleanFlag(parsed, 'dry-run');
  if (dryRun && target.mode === 'live') {
    throw new Error('call --dry-run is only supported for headless world-file targets.');
  }

  const session = await openAutomationSession(target, !dryRun && !getBooleanFlag(parsed, 'no-auto-save'));

  try {
    printJson(io, {
      ...(await session.callTool(commandName, params)),
      ...(dryRun ? { dryRun: true, persisted: false } : {}),
    });
  } finally {
    await session.close?.();
  }
}

async function handleBatch(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const calls = await parseJsonFlag<AutomationCommandCall[]>(
    getPositionalOrFlag(parsed, 0, 'calls') ?? undefined,
    cwd,
  );
  if (!Array.isArray(calls) || calls.length === 0) {
    throw new Error('batch requires a non-empty calls payload as the first argument or via --calls.');
  }
  const description = getStringFlag(parsed, 'description');
  const target = await resolveCliTarget(
    {
      serverUrl: getStringFlag(parsed, 'server'),
      token: getStringFlag(parsed, 'token'),
      worldFilePath: getStringFlag(parsed, 'world'),
    },
    cwd,
    runtime.env,
  );
  const dryRun = getBooleanFlag(parsed, 'dry-run');
  if (dryRun && target.mode === 'live') {
    throw new Error('batch --dry-run is only supported for headless world-file targets.');
  }

  const session = await openAutomationSession(target, !dryRun && !getBooleanFlag(parsed, 'no-auto-save'));

  try {
    const batch = await session.callBatch(calls, description);
    const results = calls.map((call, index) => ({
      call,
      result: batch.results[index] ?? { text: call.name, changed: false },
    }));
    printJson(io, {
      description,
      results,
      ...(dryRun ? { dryRun: true, persisted: false } : {}),
    });
  } finally {
    await session.close?.();
  }
}

async function handleResource(
  parsed: ParsedCliArgs,
  io: CliIo,
  runtime: CliRuntime,
  defaultResourceName?: string,
): Promise<void> {
  const resourceName = defaultResourceName ?? getPositionalOrFlag(parsed, 0, 'resource');
  if (!resourceName) {
    throw new Error('resource requires a resource name as the first argument or via --resource.');
  }
  const resourceParams = getResourceParams(parsed);
  const outputPath = getStringFlag(parsed, 'output');
  const cwd = runtime.cwd ?? process.cwd();
  const target = await resolveCliTarget(
    {
      serverUrl: getStringFlag(parsed, 'server'),
      token: getStringFlag(parsed, 'token'),
      worldFilePath: getStringFlag(parsed, 'world'),
    },
    cwd,
    runtime.env,
  );

  const session = await openAutomationSession(target, !getBooleanFlag(parsed, 'no-auto-save'));

  try {
    const data = await session.readResource(resourceName, resourceParams);
    const defaultPrefix =
      !outputPath && (resourceName === 'render-screenshot' || resourceName === 'entity-render-screenshot')
        ? resourceName === 'entity-render-screenshot'
          ? `entity-screenshot-${resourceParams.stableId ?? resourceParams.eid ?? 'capture'}`
          : 'snapshot'
        : undefined;
    if (outputPath || defaultPrefix) {
      printJson(io, await maybeWriteScreenshotOutput(data, {
        outputPath,
        cwd,
        target,
        defaultPrefix,
      }));
      return;
    }
    printJson(io, data);
  } finally {
    await session.close?.();
  }
}

async function handleCamera(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const action = parsed.positionals[0] ?? 'get';
  const cwd = runtime.cwd ?? process.cwd();
  const target = await resolveCliTarget(
    {
      serverUrl: getStringFlag(parsed, 'server'),
      worldFilePath: getStringFlag(parsed, 'world'),
    },
    cwd,
    runtime.env,
  );

  const runResource = async () => {
    const session = await openAutomationSession(target, !getBooleanFlag(parsed, 'no-auto-save'));
    try {
      return await session.readResource('viewport-camera');
    } finally {
      await session.close?.();
    }
  };

  const runCommand = async (name: string, params: Record<string, any>) => {
    const session = await openAutomationSession(target, !getBooleanFlag(parsed, 'no-auto-save'));
    try {
      await session.callTool(name, params);
      return await session.readResource('viewport-camera');
    } finally {
      await session.close?.();
    }
  };

  switch (action) {
    case 'get':
      printJson(io, await runResource());
      return;
    case 'set': {
      const position = await parseJsonFlag<Record<string, any>>(getStringFlag(parsed, 'position'), cwd);
      const lookAt = await parseJsonFlag<Record<string, any>>(getStringFlag(parsed, 'look-at'), cwd);
      const rotation = await parseJsonFlag<Record<string, any>>(getStringFlag(parsed, 'rotation'), cwd);
      const fov = parseOptionalNumber(getStringFlag(parsed, 'fov'), 'fov');
      if (!position && !lookAt && !rotation && fov === undefined) {
        throw new Error('camera set requires at least one of --position, --look-at, --rotation, or --fov.');
      }
      printJson(
        io,
        await runCommand('set-viewport-camera', {
          ...(position ? { position } : {}),
          ...(lookAt ? { lookAt } : {}),
          ...(rotation ? { rotation } : {}),
          ...(fov !== undefined ? { fov } : {}),
        }),
      );
      return;
    }
    case 'frame-entity': {
      const stableId = parseOptionalNumber(
        getPositionalOrFlag(parsed, 1, 'stable-id') ?? getStringFlag(parsed, 'stableId'),
        'stable-id',
      );
      const eid = parseOptionalNumber(getStringFlag(parsed, 'eid'), 'eid');
      const padding = parseOptionalNumber(getStringFlag(parsed, 'padding'), 'padding');
      const fov = parseOptionalNumber(getStringFlag(parsed, 'fov'), 'fov');
      if (stableId === undefined && eid === undefined) {
        throw new Error('camera frame-entity requires a StableID positional argument, --stable-id, or --eid.');
      }
      printJson(
        io,
        await runCommand('frame-viewport-entity', {
          ...(stableId !== undefined ? { stableId } : {}),
          ...(eid !== undefined ? { eid } : {}),
          ...(padding !== undefined ? { padding } : {}),
          ...(fov !== undefined ? { fov } : {}),
        }),
      );
      return;
    }
    default:
      throw new Error(`Unknown camera action '${action}'. Expected get, set, or frame-entity.`);
  }
}

async function handleLive(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const { startLiveSessionServer } = await import('./liveServer');
  const cwd = runtime.cwd ?? process.cwd();
  const worldFilePath = await resolveDefaultWorldFilePath(
    getPositionalOrFlag(parsed, 0, 'world'),
    cwd,
    runtime.env,
  );
  const host = getStringFlag(parsed, 'host') ?? '127.0.0.1';
  const port = parseOptionalNumber(getStringFlag(parsed, 'port'), 'port') ?? 4173;
  const allowRemote = getBooleanFlag(parsed, 'allow-remote');

  const server = await startLiveSessionServer({
    worldFilePath,
    host,
    port,
    allowRemote,
  });

  const info = server.getInfo();
  await writeCliLiveSessionConfig(
    {
      worldFilePath,
      serverUrl: info.serverUrl,
      token: info.token,
      browserUrl: info.browserUrl,
    },
    cwd,
  );
  const run = await ensureCliRun({
    cwd,
    target: {
      mode: 'live',
      serverUrl: info.serverUrl,
      token: info.token,
      browserUrl: info.browserUrl,
      worldFilePath,
    },
    forceNew: true,
  });

  printJson(io, buildLiveSessionOutput({
    mode: 'live',
    liveInfo: info,
    run,
  }));

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function handleDev(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const { startLiveSessionServer } = await import('./liveServer');
  const cwd = runtime.cwd ?? process.cwd();
  const worldFilePath = await resolveDefaultWorldFilePath(
    getPositionalOrFlag(parsed, 0, 'world'),
    cwd,
    runtime.env,
  );
  const host = getStringFlag(parsed, 'host') ?? '127.0.0.1';
  const port = parseOptionalNumber(getStringFlag(parsed, 'port'), 'port') ?? 4173;
  const shouldOpen = !getBooleanFlag(parsed, 'no-open');
  const allowRemote = getBooleanFlag(parsed, 'allow-remote');

  const server = await startLiveSessionServer({
    worldFilePath,
    host,
    port,
    allowRemote,
  });

  const liveInfo = server.getInfo();
  await writeCliLiveSessionConfig(
    {
      worldFilePath,
      serverUrl: liveInfo.serverUrl,
      token: liveInfo.token,
      browserUrl: liveInfo.browserUrl,
    },
    cwd,
  );
  const run = await ensureCliRun({
    cwd,
    target: {
      mode: 'live',
      serverUrl: liveInfo.serverUrl,
      token: liveInfo.token,
      browserUrl: liveInfo.browserUrl,
      worldFilePath,
    },
    forceNew: true,
  });

  let browserOpen: { command: string; args: string[] } | null = null;

  if (shouldOpen && liveInfo.browserUrl) {
    browserOpen = await openUrl(liveInfo.browserUrl);
  }

  printJson(io, buildLiveSessionOutput({
    mode: 'dev',
    liveInfo: liveInfo,
    run,
    browserOpen,
  }));

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function handleUse(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const worldArg = getPositionalOrFlag(parsed, 0, 'world');
  if (!worldArg) {
    throw new Error('use requires a world path as the first argument or via --world.');
  }

  const cwd = runtime.cwd ?? process.cwd();
  const config = await writeCliWorldSessionConfig(worldArg, cwd);
  printJson(io, {
    mode: config.mode,
    worldFilePath: config.worldFilePath,
    configPath: getCliSessionConfigPath(cwd),
    savedAt: config.savedAt,
  });
}

async function handleMcpConfig(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const explicitServerUrl = getStringFlag(parsed, 'server');
  const explicitWorldFilePath = getPositionalOrFlag(parsed, 0, 'world');

  if (explicitServerUrl) {
    printJson(io, buildMcpConfig({ serverUrl: explicitServerUrl, token: getStringFlag(parsed, 'token') }));
    return;
  }

  if (explicitWorldFilePath) {
    const worldFilePath = await resolveDefaultWorldFilePath(explicitWorldFilePath, cwd, runtime.env);
    printJson(io, buildMcpConfig({ worldFilePath }));
    return;
  }

  const config = await readCliSessionConfig(cwd);
  if (config?.mode === 'live') {
    printJson(io, buildMcpConfig());
    return;
  }

  const worldFilePath = await resolveDefaultWorldFilePath(
    undefined,
    cwd,
    runtime.env,
  );
  printJson(io, buildMcpConfig());
}

async function handleClean(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const result = await cleanCliArtifacts({
    cwd,
    all: getBooleanFlag(parsed, 'all'),
  });
  printJson(io, {
    ...result,
    runsDir: path.join(path.resolve(cwd, '.gizmo'), 'runs'),
  });
}

export async function runCli(argv: string[], io = defaultIo(), runtime: CliRuntime = {}): Promise<number> {
  const parsed = parseCliArgs(argv);

  try {
    switch (parsed.command) {
      case null:
      case 'help':
      case '--help':
        io.stdout(usage());
        return 0;
      case 'use':
        await handleUse(parsed, io, runtime);
        return 0;
      case 'init':
        await handleInit(parsed, io, runtime);
        return 0;
      case 'dev':
        await handleDev(parsed, io, runtime);
        return 0;
      case 'mcp': {
        const cwd = runtime.cwd ?? process.cwd();
        const target = await resolveCliTarget(
          {
            serverUrl: getStringFlag(parsed, 'server'),
            token: getStringFlag(parsed, 'token'),
            worldFilePath: getPositionalOrFlag(parsed, 0, 'world'),
          },
          cwd,
          runtime.env,
        );

        if (target.mode === 'live') {
          await (await import('./liveMcpServer')).runLiveProxyMcpServer(target.serverUrl, target.token);
        } else {
          await runStdioServer({
            worldFilePath: target.worldFilePath,
            autoSave: !getBooleanFlag(parsed, 'no-auto-save'),
          });
        }
        return 0;
      }
      case 'mcp-config':
        await handleMcpConfig(parsed, io, runtime);
        return 0;
      case 'call':
        await handleCall(parsed, io, runtime);
        return 0;
      case 'batch':
        await handleBatch(parsed, io, runtime);
        return 0;
      case 'resource':
        await handleResource(parsed, io, runtime);
        return 0;
      case 'camera':
        await handleCamera(parsed, io, runtime);
        return 0;
      case 'snapshot':
        await handleResource(parsed, io, runtime, 'render-screenshot');
        return 0;
      case 'clean':
        await handleClean(parsed, io, runtime);
        return 0;
      case 'commands':
        printJson(io, listAutomationCommands());
        return 0;
      case 'resources':
        printJson(io, listAutomationResourceDefinitions());
        return 0;
      case 'live':
        await handleLive(parsed, io, runtime);
        return 0;
      case 'session': {
        const cwd = runtime.cwd ?? process.cwd();
        const explicitServerUrl = getStringFlag(parsed, 'server');
        const explicitToken = getStringFlag(parsed, 'token');
        if (explicitServerUrl) {
          printJson(io, await readLiveServerSession(explicitServerUrl, explicitToken));
          return 0;
        }

        const target = await resolveCliTarget(
          {
            serverUrl: explicitServerUrl,
            token: explicitToken,
            worldFilePath: getStringFlag(parsed, 'world'),
          },
          cwd,
          runtime.env,
        );
        if (target.mode === 'live') {
          printJson(io, await readLiveServerSession(target.serverUrl, target.token));
          return 0;
        }

        printJson(io, {
          mode: 'world',
          worldFilePath: target.worldFilePath,
          configPath: getCliSessionConfigPath(cwd),
        });
        return 0;
      }
      default:
        throw new Error(`Unknown command '${parsed.command}'.`);
    }
  } catch (error: any) {
    io.stderr(error?.message || String(error));
    return 1;
  }
}

const isDirectInvocation = (() => {
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    return fsSync.realpathSync(entry) === fsSync.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return path.basename(entry) === 'main.js' || path.basename(entry) === 'main.ts';
  }
})();

if (isDirectInvocation) {
  void runCli(process.argv.slice(2)).then((code) => {
    if (code !== 0) {
      process.exit(code);
    }
  });
}
