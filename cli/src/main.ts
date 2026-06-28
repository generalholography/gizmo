#!/usr/bin/env node

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  HeadlessWorldSession,
  evaluateScene,
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
  stopLiveServer,
} from './serverClient';
import {
  getCliSessionConfigPath,
  readCliSessionConfig,
  removeCliSessionConfig,
  resolveCliTarget,
  resolveDefaultWorldFilePath,
  writeCliLiveSessionConfig,
  writeCliWorldSessionConfig,
} from './sessionConfig';
import {
  cleanCliArtifacts,
  clearCliRunState,
  createCliArtifactOutputPath,
  ensureCliRun,
  type CliRunConfig,
} from './runArtifacts';
import { buildLiveSessionOutput } from './liveSessionOutput';
import { initializeWorldFile, loadWorldFile, resolveInitWorldFilePath, writeWorldDefinitionToFile } from './worldFile';

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
    '  apply      Apply a complete world definition to the active target',
    '  run-world-script Execute a trusted JavaScript world script against the active target',
    '  resource   Read one engine resource',
    '  camera     Inspect or control the active viewport camera',
    '  snapshot   Capture a render screenshot resource',
    '  eval       Validate and evaluate a scene',
    '  docs       Print agent-readable CLI, command, resource, component, or module docs',
    '  stop       Stop the active live session server',
    '  clean      Remove stale gizmo run artifacts and legacy session files',
    '  commands   List available engine commands',
    '  resources  List available engine resources',
    '  skills     Locate or print bundled Gizmo Agent Skills',
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
    '  gizmo apply @world.json',
    '  gizmo run-world-script ./scene.world.js --validate',
    '  gizmo camera get',
    '  gizmo camera set --position \'{"x":0,"y":8,"z":18}\' --look-at \'{"x":0,"y":4,"z":0}\'',
    '  gizmo camera frame-entity 12',
    '  gizmo eval --checks basic,inventory,bounds,intersections,coplanar',
    '  gizmo serve',
    '  gizmo stop',
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
      '  --allow-world-scripts Enable trusted world-script execution tools for this session',
      '',
      'If the default port is already in use and --port was not provided, Gizmo falls back to an ephemeral port.',
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
      '  --allow-world-scripts Enable trusted world-script execution tools for this session',
      '',
      'If the default port is already in use and --port was not provided, Gizmo falls back to an ephemeral port.',
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
      '  --allow-world-scripts  Enable trusted world-script execution for run-world-script',
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
    apply: [
      'Usage: gizmo apply <world.json|@file|json> [options]',
      '',
      'Apply a complete world definition to the active target.',
      '',
      'Options:',
      '  --input <json|@file>  World definition JSON',
      '  --world <path>        Local world file path',
      '  --server <url>        Live session server URL',
      '  --token <value>       Live session token',
    ],
    'run-world-script': [
      'Usage: gizmo run-world-script <world-script.js> [options]',
      '',
      'Execute a trusted JavaScript/MJS world script and replace the active world.',
      '',
      'Options:',
      '  --path <path>     JavaScript/MJS world script file',
      '  --source <text>   Inline script source, or @file.js',
      '  --world <path>    Local world file path',
      '  --server <url>    Live session server URL',
      '  --token <value>   Live session token',
      '  --dry-run         Execute against a headless temporary session without saving',
      '  --validate        Include scene-evaluation after the script runs',
      '  --no-auto-save    Run without persisting the backing world',
      '',
      'World scripts execute JavaScript. Only run trusted local scripts.',
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
    eval: [
      'Usage: gizmo eval [world.json] [options]',
      '',
      'Validate and evaluate a scene with deterministic local checks.',
      '',
      'Checks:',
      '  basic           Loadability, StableID integrity, and transform sanity',
      '  inventory       Entity/category/component inventory',
      '  bounds          World bounds and ground/support placement diagnostics',
      '  intersections   Object overlap and collider intersection diagnostics',
      '  coplanar        Nearly coincident same-side faces that may z-fight',
      '',
      'Options:',
      '  --checks <list>                  Comma-separated checks; defaults to basic,inventory,bounds,intersections,coplanar',
      '  --profile <name>                 Evaluation profile label; defaults to agent',
      '  --format <json|markdown>         Output format; defaults to json',
      '  --output <path>                  Write the report to a file',
      '  --fail-on <error|warning|score>  Exit non-zero when the threshold is met',
      '  --min-score <number>             Minimum score for --fail-on score',
      '  --max-findings <number>          Maximum findings returned per check',
      '  --overlap-tolerance <number>     Ignore AABB contacts shallower than this distance',
      '  --coplanar-tolerance <number>    Face-plane tolerance for possible z-fighting',
      '  --ground-y <number>              Ground plane Y used for placement checks',
      '  --floor-tolerance <number>       Allowed below-ground tolerance',
      '  --floating-tolerance <number>    Allowed unsupported height above ground',
      '  --world <path>                   Local world file path',
      '  --server <url>                   Live session server URL',
      '  --token <value>                  Live session token',
    ],
    docs: [
      'Usage: gizmo docs [topic] [name] [options]',
      '',
      'Print agent-readable reference docs from the installed CLI and engine surface.',
      '',
      'Topics:',
      '  cli                 CLI workflow and target selection',
      '  workflow            Agent world-building loop',
      '  commands            List automation commands',
      '  command <name>      Show one automation command',
      '  resources           List automation resources',
      '  resource <name>     Show one automation resource',
      '  components          List component schemas',
      '  component <name>    Show one component schema',
      '  modules             List runtime module types',
      '  module <name>       Show module types for a module name or moduleName/typeName',
      '',
      'Options for component/module topics:',
      '  --world <path>    Local world file path',
      '  --server <url>    Live session server URL',
      '  --token <value>   Live session token',
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
    stop: [
      'Usage: gizmo stop [options]',
      '',
      'Stop the active browser-backed live session server and clear local session state.',
      '',
      'Options:',
      '  --server <url>   Live session server URL',
      '  --token <value>  Live session token',
      '  --keep-session   Do not remove .gizmo/session.json or .gizmo/run.json',
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
    skills: [
      'Usage: gizmo skills [options]',
      '',
      'Locate or print the portable Gizmo Agent Skills bundled with the CLI.',
      '',
      'Options:',
      '  --path          Print only the bundled skills directory',
      '  --print <name>  Print one SKILL.md prompt by skill name',
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

async function resolveBundledSkillsDir(): Promise<string> {
  const startDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(startDir, 'skills'),
    path.resolve(startDir, '../../.agents/skills'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try the next likely source or bundled package location.
    }
  }

  throw new Error('Unable to locate bundled Gizmo Agent Skills.');
}

async function listBundledSkills(skillsDir: string): Promise<Array<{ name: string; path: string }>> {
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    try {
      await fs.access(skillPath);
      skills.push({ name: entry.name, path: skillPath });
    } catch {
      // Ignore non-skill directories.
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
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
      'Run gizmo start --no-open --port 0 to start a browser-backed live session for Codex or another agent.',
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

function markdownCode(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function renderParameterList(parameters: any[] | undefined): string {
  if (!parameters?.length) return '- No parameters.';
  return parameters.map((param) => {
    const required = param.required ? 'required' : 'optional';
    const details = [
      `- \`${param.name}\` (${param.type ?? 'unknown'}, ${required}): ${param.description ?? 'No description.'}`,
      param.schema ? `\n\n  Schema:\n\n${markdownCode(param.schema)}` : '',
    ].join('');
    return details;
  }).join('\n');
}

async function withConsoleNoiseSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

function renderCommandDocs(commandName?: string): string {
  const commands = listAutomationCommands();
  if (commandName) {
    const command = commands.find((candidate) => candidate.name === commandName);
    if (!command) {
      throw new Error(`Unknown automation command '${commandName}'. Run 'gizmo docs commands' to list commands.`);
    }
    return [
      `# gizmo command: ${command.name}`,
      '',
      command.description ?? 'No description.',
      '',
      '## CLI Syntax',
      '',
      '```bash',
      `gizmo call ${command.name} --params '<json>'`,
      '```',
      '',
      '## Parameters',
      '',
      renderParameterList(command.parameters),
    ].join('\n');
  }

  return [
    '# Gizmo Automation Commands',
    '',
    'Use `gizmo call <name> --params \'<json>\'` for one command, `gizmo batch @calls.json` for a logical batch, or `gizmo apply ./scene.json` for a complete world definition.',
    'Run `gizmo docs command <name>` for detailed parameter docs.',
    '',
    ...commands.map((command) => `- \`${command.name}\`: ${command.description ?? 'No description.'}`),
  ].join('\n');
}

function renderResourceDocs(resourceName?: string): string {
  const resources = listAutomationResourceDefinitions();
  if (resourceName) {
    const resource = resources.find((candidate) => candidate.name === resourceName);
    if (!resource) {
      throw new Error(`Unknown automation resource '${resourceName}'. Run 'gizmo docs resources' to list resources.`);
    }
    return [
      `# gizmo resource: ${resource.name}`,
      '',
      resource.description ?? 'No description.',
      '',
      `- Kind: \`${resource.kind}\``,
      `- MIME type: \`${resource.mimeType ?? 'application/json'}\``,
      resource.aliases?.length ? `- Aliases: ${resource.aliases.map((alias) => `\`${alias}\``).join(', ')}` : '',
      '',
      '## CLI Syntax',
      '',
      '```bash',
      `gizmo resource ${resource.name}`,
      '```',
      resource.name.includes('entity') ? '\nEntity resources use `--stable-id <id>` when they target an entity.' : '',
    ].filter(Boolean).join('\n');
  }

  return [
    '# Gizmo Automation Resources',
    '',
    'Use `gizmo resource <name>` to read a resource. Run `gizmo docs resource <name>` for details.',
    '',
    ...resources.map((resource) => `- \`${resource.name}\` (${resource.kind}): ${resource.description ?? 'No description.'}`),
  ].join('\n');
}

function renderCliDocs(): string {
  return [
    '# Gizmo CLI Reference',
    '',
    'Recommended first run in an empty folder:',
    '',
    '```bash',
    'gizmo start --no-open --port 0',
    '```',
    '',
    '`gizmo start` auto-creates `world.json` when needed, writes `.gizmo/session.json`, starts a loopback live server, creates `.gizmo/runs/<run-id>/`, and prints browser plus MCP connection details.',
    '',
    'Target resolution order for most commands:',
    '',
    '1. Explicit `--server`/`--token` or `--world` flags.',
    '2. `GIZMO_WORLD` for headless world-file work.',
    '3. `.gizmo/session.json` in the current workspace.',
    '',
    'Core commands: `init`, `use`, `start`, `mcp`, `mcp-config`, `call`, `batch`, `apply`, `resource`, `camera`, `snapshot`, `eval`, `docs`, `skills`, `commands`, `resources`, `session`, `stop`, `clean`, `version`.',
  ].join('\n');
}

function renderWorkflowDocs(): string {
  return [
    '# Gizmo Agent Workflow',
    '',
    '1. Start a robust agent session: `gizmo start --no-open --port 0`.',
    '2. Immediately surface the printed browser URL to the user, then keep working.',
    '3. Make a meaningful first edit before deep inspection.',
    '4. For full generated scenes, use `gizmo apply ./scene.json --world ./world.json`.',
    '5. For incremental edits, use `gizmo call <command> --params \'<json>\'` or `gizmo batch @calls.json`.',
    '6. Once a browser client is attached, use `gizmo camera ...` and `gizmo snapshot` for visual validation.',
    '',
    'Use `stableId` as the durable public entity identity. Do not expose runtime entity IDs as public handles.',
    '',
    'For exact installed-version syntax, use `gizmo docs command <name>`, `gizmo docs resource <name>`, `gizmo docs component <name>`, and `gizmo docs module <moduleName/typeName>`.',
  ].join('\n');
}

function renderComponentList(components: any[]): string {
  return [
    '# Gizmo Component Schemas',
    '',
    'Use `gizmo docs component <name>` for field details. Component docs read the active world when available.',
    '',
    ...components.map((component) => {
      const required = component.requiredFields?.length ? `; required: ${component.requiredFields.join(', ')}` : '';
      return `- \`${component.name}\`${required}`;
    }),
  ].join('\n');
}

function renderComponentDetail(component: any): string {
  const fields = component.fields?.length
    ? component.fields.map((field: any) => {
        const bits = [
          `- \`${field.name}\` (${field.type ?? 'unknown'}${field.required ? ', required' : ', optional'})`,
          field.description ? `: ${field.description}` : '',
          field.enumValues?.length ? `\n  Values: ${field.enumValues.map((value: string) => `\`${value}\``).join(', ')}` : '',
        ];
        return bits.join('');
      }).join('\n')
    : '- No fields.';
  return [
    `# Gizmo Component: ${component.name}`,
    '',
    component.displayName && component.displayName !== component.name ? `Display name: ${component.displayName}` : '',
    `Structural: ${component.isStructural ? 'yes' : 'no'}`,
    component.requiredFields?.length ? `Required fields: ${component.requiredFields.map((field: string) => `\`${field}\``).join(', ')}` : 'Required fields: none',
    '',
    '## Fields',
    '',
    fields,
  ].filter(Boolean).join('\n');
}

function renderModuleList(modules: any[], filter?: string): string {
  const filtered = filter
    ? modules.filter((moduleType) => moduleType.moduleName === filter || `${moduleType.moduleName}/${moduleType.typeName}` === filter)
    : modules;
  if (filter && filtered.length === 0) {
    throw new Error(`Unknown module '${filter}'. Run 'gizmo docs modules' to list modules.`);
  }
  return [
    filter ? `# Gizmo Module Types: ${filter}` : '# Gizmo Module Types',
    '',
    'Runtime module types power materials, meshes, bodies, colliders, gameplay rules, conditions, actions, effects, and other reusable definitions.',
    'Use `gizmo docs module <moduleName/typeName>` for a focused lookup when needed.',
    '',
    ...filtered.map((moduleType) => {
      const persisted = moduleType.persisted ? 'custom persisted' : 'built-in';
      const description = moduleType.description ? `: ${moduleType.description}` : '';
      return `- \`${moduleType.moduleName}/${moduleType.typeName}\` (${persisted})${description}`;
    }),
    '',
    'Custom module type syntax:',
    '',
    '```bash',
    'gizmo call upsert-module-type --params \'{"moduleName":"material","typeName":"warmMatte","factorySource":"(params) => ({ type: \\"solid\\", params })"}\'',
    '```',
    '',
    'Factory source is executable project code. Only author or run trusted module factories.',
  ].join('\n');
}

async function readDocsResource(
  resourceName: string,
  parsed: ParsedCliArgs,
  runtime: CliRuntime,
): Promise<any> {
  const cwd = runtime.cwd ?? process.cwd();
  const hasExplicitTarget = Boolean(getStringFlag(parsed, 'server') || getStringFlag(parsed, 'world'));
  let tempDir: string | null = null;

  try {
    try {
      const target = await resolveCliTarget(
        {
          serverUrl: getStringFlag(parsed, 'server'),
          token: getStringFlag(parsed, 'token'),
          worldFilePath: getStringFlag(parsed, 'world'),
        },
        cwd,
        runtime.env,
      );
      return await withConsoleNoiseSuppressed(async () => {
        const session = await openAutomationSession(target, false);
        try {
          return await session.readResource(resourceName);
        } finally {
          await session.close?.();
        }
      });
    } catch (error) {
      if (hasExplicitTarget) throw error;
      return await withConsoleNoiseSuppressed(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-docs-'));
        const initialized = await initializeWorldFile(path.join(tempDir, 'world.json'), { ifMissing: true });
        const session = await HeadlessWorldSession.open({
          worldFilePath: initialized.worldFilePath,
          autoSave: false,
        });
        try {
          return await session.readResource(resourceName);
        } finally {
          await session.close?.();
        }
      });
    }
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function renderDocs(parsed: ParsedCliArgs, runtime: CliRuntime): Promise<string> {
  const topic = parsed.positionals[0] ?? 'index';
  const name = parsed.positionals[1];

  switch (topic) {
    case 'index':
      return [
        '# Gizmo CLI Docs',
        '',
        'Topics:',
        '',
        '- `gizmo docs cli`',
        '- `gizmo docs workflow`',
        '- `gizmo docs commands`',
        '- `gizmo docs command <name>`',
        '- `gizmo docs resources`',
        '- `gizmo docs resource <name>`',
        '- `gizmo docs components`',
        '- `gizmo docs component <name>`',
        '- `gizmo docs modules`',
        '- `gizmo docs module <moduleName>` or `<moduleName/typeName>`',
      ].join('\n');
    case 'cli':
      return renderCliDocs();
    case 'workflow':
      return renderWorkflowDocs();
    case 'commands':
      return renderCommandDocs();
    case 'command':
      return renderCommandDocs(name);
    case 'resources':
      return renderResourceDocs();
    case 'resource':
      return renderResourceDocs(name);
    case 'components': {
      const components = await readDocsResource('component-catalog', parsed, runtime);
      return renderComponentList(components);
    }
    case 'component': {
      if (!name) throw new Error("docs component requires a component name, such as 'Transform'.");
      const components = await readDocsResource('component-catalog', parsed, runtime);
      const component = components.find((candidate: any) => candidate.name === name || candidate.displayName === name);
      if (!component) {
        throw new Error(`Unknown component '${name}'. Run 'gizmo docs components' to list components.`);
      }
      return renderComponentDetail(component);
    }
    case 'modules': {
      const modules = await readDocsResource('module-type-catalog', parsed, runtime);
      return renderModuleList(modules);
    }
    case 'module': {
      if (!name) throw new Error("docs module requires a module name, such as 'material' or 'material/solid'.");
      const modules = await readDocsResource('module-type-catalog', parsed, runtime);
      return renderModuleList(modules, name);
    }
    default:
      throw new Error(`Unknown docs topic '${topic}'. Run 'gizmo docs' to list topics.`);
  }
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
  options: { allowWorldScripts?: boolean } = {},
): Promise<AutomationSession> {
  if (target.mode === 'live') {
    return new LiveAutomationSession(target.serverUrl, target.token);
  }

  return await HeadlessWorldSession.open({
    worldFilePath: target.worldFilePath,
    autoSave,
    allowWorldScripts: options.allowWorldScripts === true,
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

  const session = await openAutomationSession(target, !dryRun && !getBooleanFlag(parsed, 'no-auto-save'), {
    allowWorldScripts: getBooleanFlag(parsed, 'allow-world-scripts'),
  });

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

  const session = await openAutomationSession(target, !dryRun && !getBooleanFlag(parsed, 'no-auto-save'), {
    allowWorldScripts: getBooleanFlag(parsed, 'allow-world-scripts'),
  });

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

async function handleApply(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const input = getPositionalOrFlag(parsed, 0, 'input') ?? getStringFlag(parsed, 'input');
  if (!input) {
    throw new Error('apply requires a world definition as the first argument or via --input.');
  }
  const definition = await parseJsonFlag<Record<string, any>>(input.startsWith('@') || input.trim().startsWith('{') ? input : `@${input}`, cwd);
  const target = await resolveCliTarget(
    {
      serverUrl: getStringFlag(parsed, 'server'),
      token: getStringFlag(parsed, 'token'),
      worldFilePath: getStringFlag(parsed, 'world'),
    },
    cwd,
    runtime.env,
  );

  if (target.mode === 'world') {
    const current = await loadWorldFile(target.worldFilePath).catch(() => ({ format: 'json' as const }));
    await writeWorldDefinitionToFile(target.worldFilePath, current.format, definition as any);
    printJson(io, {
      ok: true,
      mode: 'world',
      worldFilePath: target.worldFilePath,
      changed: true,
    });
    return;
  }

  const info = await readLiveServerSession(target.serverUrl, target.token);
  if (info.browserReady) {
    const session = await openAutomationSession(target, true);
    try {
      printJson(io, {
        ok: true,
        mode: 'live',
        serverUrl: target.serverUrl,
        ...(await session.callTool('reinitialize-world', { definition })),
      });
    } finally {
      await session.close?.();
    }
    return;
  }

  if (!target.worldFilePath) {
    throw new Error('Live session has no backing world file and no browser client is attached.');
  }

  const current = await loadWorldFile(target.worldFilePath).catch(() => ({ format: 'json' as const }));
  await writeWorldDefinitionToFile(target.worldFilePath, current.format, definition as any);
  printJson(io, {
    ok: true,
    mode: 'live',
    serverUrl: target.serverUrl,
    worldFilePath: target.worldFilePath,
    changed: true,
    browserReady: false,
    note: 'Updated the backing world file. Open or refresh the live browser to load the new world.',
  });
}

async function readWorldScriptSourceArg(value: string, cwd: string): Promise<string> {
  if (value.startsWith('@')) {
    return await fs.readFile(path.resolve(cwd, value.slice(1)), 'utf8');
  }
  return value;
}

async function handleRunWorldScript(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const explicitSource = getStringFlag(parsed, 'source');
  const scriptPath = getPositionalOrFlag(parsed, 0, 'path');
  if (explicitSource && scriptPath) {
    throw new Error('run-world-script accepts either --source or a script path, not both.');
  }
  if (!explicitSource && !scriptPath) {
    throw new Error('run-world-script requires a script path or --source.');
  }

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
    throw new Error('run-world-script --dry-run is only supported for headless world-file targets.');
  }

  const params: Record<string, any> = {
    validate: getBooleanFlag(parsed, 'validate'),
  };
  if (explicitSource) {
    params.source = await readWorldScriptSourceArg(explicitSource, cwd);
  } else {
    params.path = path.resolve(cwd, scriptPath as string);
  }

  const session = await openAutomationSession(target, !dryRun && !getBooleanFlag(parsed, 'no-auto-save'), {
    allowWorldScripts: true,
  });

  try {
    const result = await session.callTool('run-world-script', params);
    let parsedText: any = null;
    try {
      parsedText = JSON.parse(result.text);
    } catch {
      parsedText = { message: result.text };
    }
    printJson(io, {
      ...parsedText,
      changed: result.changed,
      ...(dryRun ? { dryRun: true, persisted: false } : { persisted: !getBooleanFlag(parsed, 'no-auto-save') }),
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

function parseCommaList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function renderEvalMarkdown(report: any): string {
  const lines = [
    `# Scene Evaluation: ${report.world?.title ?? 'Untitled World'}`,
    '',
    `- Status: ${report.ok ? 'pass' : 'fail'}`,
    `- Score: ${report.score}`,
    `- Entities: ${report.world?.entityCount ?? 0}`,
    `- Errors: ${report.summary?.errors ?? 0}`,
    `- Warnings: ${report.summary?.warnings ?? 0}`,
    `- Info: ${report.summary?.info ?? 0}`,
    '',
    '## Checks',
    '',
  ];

  for (const check of report.checks ?? []) {
    lines.push(`### ${check.label}`);
    lines.push('');
    lines.push(`- ID: \`${check.id}\``);
    lines.push(`- Status: ${check.status}`);
    lines.push(`- Score: ${check.score}`);
    if (check.metrics && Object.keys(check.metrics).length > 0) {
      lines.push(`- Metrics: \`${JSON.stringify(check.metrics)}\``);
    }
    if (check.findings?.length) {
      lines.push('');
      for (const finding of check.findings) {
        const stableIds = finding.stableIds?.length ? ` (stableIds: ${finding.stableIds.join(', ')})` : '';
        lines.push(`- ${finding.severity}: ${finding.message}${stableIds}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function shouldEvalFail(report: any, failOn: string | undefined, minScore: number | undefined): boolean {
  switch (failOn) {
    case undefined:
      return false;
    case 'error':
      return (report.summary?.errors ?? 0) > 0;
    case 'warning':
      return (report.summary?.errors ?? 0) > 0 || (report.summary?.warnings ?? 0) > 0;
    case 'score': {
      const threshold = minScore ?? 1;
      return (report.score ?? 0) < threshold;
    }
    default:
      throw new Error("eval --fail-on must be one of 'error', 'warning', or 'score'.");
  }
}

async function handleEval(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<number> {
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

  const checks = parseCommaList(getStringFlag(parsed, 'checks'));
  const maxFindingsPerCheck = parseOptionalNumber(getStringFlag(parsed, 'max-findings'), 'max-findings');
  const overlapTolerance = parseOptionalNumber(getStringFlag(parsed, 'overlap-tolerance'), 'overlap-tolerance');
  const coplanarTolerance = parseOptionalNumber(getStringFlag(parsed, 'coplanar-tolerance'), 'coplanar-tolerance');
  const groundY = parseOptionalNumber(getStringFlag(parsed, 'ground-y'), 'ground-y');
  const floorTolerance = parseOptionalNumber(getStringFlag(parsed, 'floor-tolerance'), 'floor-tolerance');
  const floatingTolerance = parseOptionalNumber(getStringFlag(parsed, 'floating-tolerance'), 'floating-tolerance');
  const minScore = parseOptionalNumber(getStringFlag(parsed, 'min-score'), 'min-score');
  const format = getStringFlag(parsed, 'format') ?? 'json';
  if (format !== 'json' && format !== 'markdown') {
    throw new Error("eval --format must be either 'json' or 'markdown'.");
  }

  let report: any;
  const evalOptions = {
    checks,
    profile: getStringFlag(parsed, 'profile') ?? 'agent',
    maxFindingsPerCheck,
    overlapTolerance,
    coplanarTolerance,
    groundY,
    floorTolerance,
    floatingTolerance,
  };
  if (target.mode === 'live') {
    const session = await openAutomationSession(target, false);
    try {
      report = await session.readResource('scene-evaluation', evalOptions);
    } finally {
      await session.close?.();
    }
  } else {
    const session = await HeadlessWorldSession.open({
      worldFilePath: target.worldFilePath,
      autoSave: false,
    });
    try {
      report = evaluateScene(session.getContext(), {
        ...evalOptions,
        worldFilePath: target.worldFilePath,
      });
    } finally {
      await session.close?.();
    }
  }

  const rendered = format === 'markdown' ? renderEvalMarkdown(report) : JSON.stringify(report, null, 2);
  const outputPath = getStringFlag(parsed, 'output');
  if (outputPath) {
    const resolvedOutputPath = path.resolve(cwd, outputPath);
    await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await fs.writeFile(resolvedOutputPath, rendered, 'utf8');
    printJson(io, {
      ok: report.ok,
      score: report.score,
      summary: report.summary,
      outputPath: resolvedOutputPath,
    });
  } else {
    io.stdout(rendered);
  }

  return shouldEvalFail(report, getStringFlag(parsed, 'fail-on'), minScore) ? 2 : 0;
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
  const explicitPort = getStringFlag(parsed, 'port');
  const port = parseOptionalNumber(explicitPort, 'port') ?? 4173;
  const allowRemote = getBooleanFlag(parsed, 'allow-remote');
  const allowWorldScripts = getBooleanFlag(parsed, 'allow-world-scripts');
  const run = await ensureCliRun({
    cwd,
    target: {
      mode: 'live',
      worldFilePath,
    },
    forceNew: true,
  });

  let server;
  let portFallback: { from: number; to: number; reason: string } | null = null;
  try {
    server = await startLiveSessionServer({
      worldFilePath,
      host,
      port,
      allowRemote,
      allowWorldScripts,
      artifactsDir: run.artifactsDir,
    });
  } catch (error: any) {
    if (explicitPort === undefined && (error?.code === 'EADDRINUSE' || String(error?.message || '').includes('EADDRINUSE'))) {
      portFallback = {
        from: port,
        to: 0,
        reason: `Port ${port} was already in use.`,
      };
      server = await startLiveSessionServer({
        worldFilePath,
        host,
        port: 0,
        allowRemote,
        allowWorldScripts,
        artifactsDir: run.artifactsDir,
      });
    } else {
      throw error;
    }
  }

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
  const updatedRun = await ensureCliRun({
    cwd,
    target: {
      mode: 'live',
      serverUrl: info.serverUrl,
      token: info.token,
      browserUrl: info.browserUrl,
      worldFilePath,
    },
  });

  let browserOpen: { command: string; args: string[] } | null = null;

  if (options.shouldOpen && info.browserUrl) {
    browserOpen = await openUrl(info.browserUrl);
  }

  const output = buildLiveSessionOutput({
    mode: options.mode,
    liveInfo: info,
    run: updatedRun,
    browserOpen,
  });
  printJson(io, {
    ...output,
    ...(portFallback ? { portFallback } : {}),
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
  const allowWorldScripts = getBooleanFlag(parsed, 'allow-world-scripts');

  if (explicitServerUrl) {
    printJson(io, buildMcpConfig({ serverUrl: explicitServerUrl, token: getStringFlag(parsed, 'token'), allowWorldScripts }));
    return;
  }

  if (explicitWorldFilePath) {
    const worldFilePath = await resolveDefaultWorldFilePath(explicitWorldFilePath, cwd, runtime.env);
    printJson(io, buildMcpConfig({ worldFilePath, allowWorldScripts }));
    return;
  }

  const config = await readCliSessionConfig(cwd);
  if (config?.mode === 'live') {
    printJson(io, buildMcpConfig());
    return;
  }

  await resolveDefaultWorldFilePath(
    undefined,
    cwd,
    runtime.env,
  );
  printJson(io, buildMcpConfig({ allowWorldScripts }));
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

async function handleStop(parsed: ParsedCliArgs, io: CliIo, runtime: CliRuntime): Promise<void> {
  const cwd = runtime.cwd ?? process.cwd();
  const explicitServerUrl = getStringFlag(parsed, 'server');
  const explicitToken = getStringFlag(parsed, 'token');
  const keepSession = getBooleanFlag(parsed, 'keep-session');
  const savedConfig = await readCliSessionConfig(cwd);
  const serverUrl = explicitServerUrl ?? (savedConfig?.mode === 'live' ? savedConfig.serverUrl : undefined);
  const token = explicitToken ?? (savedConfig?.mode === 'live' ? savedConfig.token : undefined);

  if (!serverUrl) {
    throw new Error('No active live session to stop. Pass --server <url> or run `gizmo start` first.');
  }

  const stopped = await stopLiveServer(serverUrl, token);
  const shouldClearLocalState = !keepSession && savedConfig?.mode === 'live' && savedConfig.serverUrl === serverUrl;
  const removedSessionConfig = shouldClearLocalState ? await removeCliSessionConfig(cwd) : false;
  const removedRunState = shouldClearLocalState ? await clearCliRunState(cwd) : false;

  printJson(io, {
    ok: true,
    serverUrl,
    stopped,
    removedSessionConfig,
    removedRunState,
  });
}

async function handleSkills(parsed: ParsedCliArgs, io: CliIo): Promise<void> {
  const skillsDir = await resolveBundledSkillsDir();
  const printSkillName = getStringFlag(parsed, 'print');

  if (getBooleanFlag(parsed, 'path')) {
    io.stdout(skillsDir);
    return;
  }

  if (printSkillName) {
    const skills = await listBundledSkills(skillsDir);
    const skill = skills.find((candidate) => candidate.name === printSkillName);
    if (!skill) {
      throw new Error(`Unknown Gizmo skill '${printSkillName}'. Run 'gizmo skills' to list bundled skills.`);
    }
    io.stdout(await fs.readFile(skill.path, 'utf8'));
    return;
  }

  const skills = await listBundledSkills(skillsDir);
  printJson(io, {
    skillsDir,
    skills,
    install: {
      npxSkillsCodex: "npx skills add generalholography/gizmo --skill gizmo -a codex -g -y",
      npxSkillsClaudeCode: "npx skills add generalholography/gizmo --skill gizmo -a claude-code -g -y",
      printOne: 'gizmo skills --print gizmo',
      manualCopy: `cp -R ${skillsDir}/* <agent-skills-directory>/`,
    },
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
            allowWorldScripts: getBooleanFlag(parsed, 'allow-world-scripts'),
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
      case 'apply':
        await handleApply(parsed, io, runtime);
        return 0;
      case 'run-world-script':
        await handleRunWorldScript(parsed, io, runtime);
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
      case 'eval':
        return await handleEval(parsed, io, runtime);
      case 'docs':
        io.stdout(await renderDocs(parsed, runtime));
        return 0;
      case 'clean':
        await handleClean(parsed, io, runtime);
        return 0;
      case 'stop':
        await handleStop(parsed, io, runtime);
        return 0;
      case 'commands':
        printJson(io, listAutomationCommands());
        return 0;
      case 'resources':
        printJson(io, listAutomationResourceDefinitions());
        return 0;
      case 'skills':
        await handleSkills(parsed, io);
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
