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
    '  start      Create or use a world, start a live session, and print agent setup info',
    '  mcp        Start the stdio MCP server for a world file',
    '  mcp-config Print the MCP config snippet for a world file or live server',
    '  serve      Start a browser-backed live session server for an existing world',
    '  call       Execute one engine command against a world file or live server',
    '  batch      Execute a batch of engine commands',
    '  resource   Read one engine resource',
    '  camera     Inspect or control the active viewport camera',
    '  snapshot   Capture a render screenshot resource',
    '  clean      Remove stale gizmo run artifacts and legacy session files',
    '  commands   List available engine commands',
    '  resources  List available engine resources',
    '  session    Read one live session summary',
    '  version    Print the installed gizmo CLI version',
    '',
    'Common options:',
    '  -h, --help       Show help',
    '  -v, --version    Show version',
    '  --world <path>    Local world file path',
    '  --server <url>    Live session server URL',
    '  --token <value>   Live session token for explicit --server calls',
    '',
    'Examples:',
    '  gizmo init',
    '  gizmo init ./my-world',
    '  gizmo use ./engine/src/worlds/live-cli-demo.json',
    '  gizmo start',
    '  gizmo --version',
    '  gizmo resource world-state-summary',
    '  gizmo call add-entity --params \'{"archetypeOrDef":"cube"}\'',
    '  gizmo camera get',
    '  gizmo camera set --position \'{"x":0,"y":8,"z":18}\' --look-at \'{"x":0,"y":4,"z":0}\'',
    '  gizmo camera frame-entity 12',
    '  gizmo serve',
    '  gizmo call add-entity --dry-run --params \'{"archetypeOrDef":"cube"}\'',
    '',
    'Saved defaults:',
    '  gizmo use /absolute/path/to/world.json',
    '  GIZMO_WORLD=/absolute/path/to/world.json',
    '',
    'JSON flags accept inline JSON or @path/to/file.json',
    'Live sessions bind to loopback by default. Use --allow-remote only for trusted networks.',
  ].join('\n');
}

function commandUsage(command: string): string {
  const commandHelp: Record<string, string[]> = {
    init: [
      'Usage: gizmo init [directory-or-world.json] [options]',
      '',
      'Create a gizmo world file and save it as the workspace default.',
      '',
      'Options:',
      '  --world <path>  World file path or workspace directory',
      '  --force         Overwrite an existing world file',
      '  --no-use        Do not save the world as this workspace default',
    ],
    use: [
      'Usage: gizmo use <world.json>',
      '',
      'Save a default world file for the current workspace.',
    ],
    start: [
      'Usage: gizmo start [directory-or-world.json] [options]',
      '',
      'Create or use a world, start a browser-backed live session, and print agent setup info.',
      '',
      'Options:',
      '  --no-open       Print the browser URL without opening it',
      '  --host <host>   Bind host; defaults to 127.0.0.1',
      '  --port <port>   Bind port; use 0 for an ephemeral port',
      '  --allow-remote  Permit non-loopback binding for trusted networks',
    ],
    serve: [
      'Usage: gizmo serve [world.json] [options]',
      '',
      'Start a browser-backed live session for an existing world.',
      '',
      'Options:',
      '  --host <host>   Bind host; defaults to 127.0.0.1',
      '  --port <port>   Bind port; defaults to 4173',
      '  --allow-remote  Permit non-loopback binding for trusted networks',
    ],
    call: [
      'Usage: gizmo call <command> [options]',
      '',
      'Execute one automation command against a world file or live server.',
      '',
      'Options:',
      '  --params <json|@file>  Command params',
      '  --world <path>         Local world file path',
      '  --server <url>         Live session server URL',
      '  --token <value>        Live session token',
      '  --dry-run              Validate against a world file without saving',
    ],
    batch: [
      'Usage: gizmo batch <json|@file> [options]',
      '',
      'Execute a non-empty array of automation command calls.',
      '',
      'Options:',
      '  --description <text>  Batch description',
      '  --world <path>        Local world file path',
      '  --server <url>        Live session server URL',
      '  --token <value>       Live session token',
      '  --dry-run             Validate against a world file without saving',
    ],
    resource: [
      'Usage: gizmo resource <resource> [options]',
      '',
      'Read one automation resource.',
      '',
      'Options:',
      '  --stable-id <id>  Stable entity ID for entity resources',
      '  --output <path>   Write screenshot resources to a file',
      '  --world <path>    Local world file path',
      '  --server <url>    Live session server URL',
      '  --token <value>   Live session token',
    ],
    camera: [
      'Usage: gizmo camera [get|set|frame-entity] [options]',
      '',
      'Inspect or control the active viewport camera.',
      '',
      'Examples:',
      '  gizmo camera get',
      '  gizmo camera set --position \'{"x":0,"y":8,"z":18}\' --look-at \'{"x":0,"y":4,"z":0}\'',
      '  gizmo camera frame-entity 12',
    ],
    snapshot: [
      'Usage: gizmo snapshot [options]',
      '',
      'Capture the active render viewport into the active run artifacts directory.',
      '',
      'Options:',
      '  --prefix <name>  Artifact filename prefix',
      '  --output <path>  Explicit output path',
      '  --server <url>   Live session server URL',
      '  --token <value>  Live session token',
    ],
    mcp: [
      'Usage: gizmo mcp [world.json] [options]',
      '',
      'Start the stdio MCP server for a world file or live session.',
      '',
      'Options:',
      '  --world <path>    Local world file path',
      '  --server <url>    Live session server URL',
      '  --token <value>   Live session token',
      '  --no-auto-save    Do not persist world-file mutations',
    ],
    'mcp-config': [
      'Usage: gizmo mcp-config [world.json] [options]',
      '',
      'Print an MCP config snippet for the current workspace, a world file, or a live server.',
    ],
    clean: [
      'Usage: gizmo clean [options]',
      '',
      'Remove stale gizmo run artifacts and legacy session files.',
      '',
      'Options:',
      '  --all  Remove all run artifacts, not just stale artifacts',
    ],
    commands: [
      'Usage: gizmo commands',
      '',
      'List available automation commands as JSON.',
    ],
    resources: [
      'Usage: gizmo resources',
      '',
      'List available automation resources as JSON.',
    ],
    session: [
      'Usage: gizmo session [options]',
      '',
      'Read the current live or world session summary.',
      '',
      'Options:',
      '  --world <path>    Local world file path',
      '  --server <url>    Live session server URL',
      '  --token <value>   Live session token',
    ],
    version: [
      'Usage: gizmo version',
      '',
      'Print the installed gizmo CLI version.',
    ],
  };

  return (commandHelp[command] ?? [usage()]).join('\n');
}

async function getCliVersion(): Promise<string> {
  const startDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(startDir, 'package.json'),
    path.join(startDir, '..', 'package.json'),
  ];

  for (const candidate of candidates) {
    try {
      const packageJson = JSON.parse(await fs.readFile(candidate, 'utf8'));
      if (packageJson?.name === '@gizmo3d/cli' && typeof packageJson.version === 'string') {
        return packageJson.version;
      }
    } catch {
      // Try the next likely package location.
    }
  }

  throw new Error('Unable to resolve @gizmo3d/cli package version.');
}

function hasHelpFlag(parsed: ParsedCliArgs): boolean {
  return getBooleanFlag(parsed, 'help') || getBooleanFlag(parsed, 'h');
}

function hasVersionFlag(parsed: ParsedCliArgs): boolean {
  return getBooleanFlag(parsed, 'version') || getBooleanFlag(parsed, 'v');
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
      'Run gizmo start --no-open to start a browser-backed live session for Codex or another agent.',
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
  const stableId = parseOptionalNumber(getStringFlag(parsed, 'stable-id'), 'stable-id');
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

async function resolveStartWorldFilePath(
  explicitTargetPath: string | undefined,
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ worldFilePath: string; initialized: Awaited<ReturnType<typeof initializeWorldFile>> | null }> {
  if (explicitTargetPath?.trim()) {
    const worldFilePath = resolveInitWorldFilePath(explicitTargetPath, cwd);
    const initialized = await initializeWorldFile(worldFilePath, { ifMissing: true });
    return { worldFilePath: initialized.worldFilePath, initialized };
  }

  try {
    const worldFilePath = await resolveDefaultWorldFilePath(undefined, cwd, env);
    return { worldFilePath, initialized: null };
  } catch {
    const initialized = await initializeWorldFile(resolveInitWorldFilePath(undefined, cwd), { ifMissing: true });
    return { worldFilePath: initialized.worldFilePath, initialized };
  }
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
        ? getStringFlag(parsed, 'prefix') ?? (
            resourceName === 'entity-render-screenshot'
              ? `entity-screenshot-${resourceParams.stableId ?? 'capture'}`
              : 'snapshot'
          )
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
      token: getStringFlag(parsed, 'token'),
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
      const padding = parseOptionalNumber(getStringFlag(parsed, 'padding'), 'padding');
      const fov = parseOptionalNumber(getStringFlag(parsed, 'fov'), 'fov');
      if (stableId === undefined) {
        throw new Error('camera frame-entity requires a stable ID positional argument or --stable-id.');
      }
      printJson(
        io,
        await runCommand('frame-viewport-entity', {
          ...(stableId !== undefined ? { stableId } : {}),
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

async function startBrowserBackedSession(options: {
  parsed: ParsedCliArgs;
  io: CliIo;
  runtime: CliRuntime;
  mode: 'start' | 'serve';
  autoInit: boolean;
  shouldOpen: boolean;
}): Promise<void> {
  const { startLiveSessionServer } = await import('./liveServer');
  const { parsed, io, runtime } = options;
  const cwd = runtime.cwd ?? process.cwd();
  const explicitWorld = getPositionalOrFlag(parsed, 0, 'world');
  const resolved = options.autoInit
    ? await resolveStartWorldFilePath(explicitWorld, cwd, runtime.env)
    : {
        worldFilePath: await resolveDefaultWorldFilePath(explicitWorld, cwd, runtime.env),
        initialized: null,
      };
  const worldFilePath = resolved.worldFilePath;
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
  const sessionCwd = options.autoInit && resolved.initialized ? path.dirname(worldFilePath) : cwd;
  if (options.autoInit && resolved.initialized) {
    await writeCliWorldSessionConfig(worldFilePath, sessionCwd);
  }
  await writeCliLiveSessionConfig(
    {
      worldFilePath,
      serverUrl: info.serverUrl,
      token: info.token,
      browserUrl: info.browserUrl,
    },
    sessionCwd,
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

  let browserOpen: { command: string; args: string[] } | null = null;

  if (options.shouldOpen && info.browserUrl) {
    browserOpen = await openUrl(info.browserUrl);
  }

  const output = buildLiveSessionOutput({
    mode: options.mode,
    liveInfo: info,
    run,
    browserOpen,
  });
  printJson(io, {
    ...output,
    ...(resolved.initialized ? {
      initializedWorld: {
        worldFilePath: resolved.initialized.worldFilePath,
        created: resolved.initialized.created,
        overwrote: resolved.initialized.overwrote,
      },
    } : {}),
  });

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function handleServe(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  await startBrowserBackedSession({
    parsed,
    io,
    runtime,
    mode: 'serve',
    autoInit: false,
    shouldOpen: false,
  });
}

async function handleStart(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  await startBrowserBackedSession({
    parsed,
    io,
    runtime,
    mode: 'start',
    autoInit: true,
    shouldOpen: !getBooleanFlag(parsed, 'no-open'),
  });
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
    if (hasVersionFlag(parsed)) {
      io.stdout(await getCliVersion());
      return 0;
    }

    if (hasHelpFlag(parsed)) {
      io.stdout(parsed.command ? commandUsage(parsed.command) : usage());
      return 0;
    }

    switch (parsed.command) {
      case null:
      case '--help':
        io.stdout(usage());
        return 0;
      case 'help':
        io.stdout(parsed.positionals[0] ? commandUsage(parsed.positionals[0]) : usage());
        return 0;
      case 'version':
        io.stdout(await getCliVersion());
        return 0;
      case 'use':
        await handleUse(parsed, io, runtime);
        return 0;
      case 'init':
        await handleInit(parsed, io, runtime);
        return 0;
      case 'start':
        await handleStart(parsed, io, runtime);
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
      case 'serve':
        await handleServe(parsed, io, runtime);
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
