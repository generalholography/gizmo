import fs from 'node:fs/promises';
import path from 'node:path';

const PRIMARY_SESSION_DIR = '.gizmo';
const SESSION_FILE = 'session.json';

export type CliSessionMode = 'world' | 'live';

export interface CliWorldSessionConfig {
  mode: 'world';
  worldFilePath: string;
  savedAt: string;
}

export interface CliLiveSessionConfig {
  mode: 'live';
  serverUrl: string;
  token?: string;
  worldFilePath?: string;
  browserUrl?: string;
  savedAt: string;
}

export type CliSessionConfig = CliWorldSessionConfig | CliLiveSessionConfig;

export type CliResolvedTarget =
  | { mode: 'world'; worldFilePath: string }
  | { mode: 'live'; serverUrl: string; token?: string; worldFilePath?: string; browserUrl?: string };

function getPrimarySessionDir(cwd = process.cwd()): string {
  return path.resolve(cwd, PRIMARY_SESSION_DIR);
}

export function getCliSessionConfigPath(cwd = process.cwd()): string {
  return path.join(getPrimarySessionDir(cwd), SESSION_FILE);
}

function normalizeConfig(raw: Partial<CliSessionConfig> | null | undefined): CliSessionConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (typeof (raw as any).serverUrl === 'string' && (raw as any).serverUrl.trim()) {
    return {
      mode: 'live',
      serverUrl: (raw as any).serverUrl,
      token:
        typeof (raw as any).token === 'string' && (raw as any).token.trim()
          ? (raw as any).token
          : undefined,
      worldFilePath:
        typeof (raw as any).worldFilePath === 'string' && (raw as any).worldFilePath.trim()
          ? (raw as any).worldFilePath
          : undefined,
      browserUrl:
        typeof (raw as any).browserUrl === 'string' && (raw as any).browserUrl.trim()
          ? (raw as any).browserUrl
          : undefined,
      savedAt: typeof (raw as any).savedAt === 'string' ? (raw as any).savedAt : new Date(0).toISOString(),
    };
  }

  if (typeof (raw as any).worldFilePath === 'string' && (raw as any).worldFilePath.trim()) {
    return {
      mode: 'world',
      worldFilePath: (raw as any).worldFilePath,
      savedAt: typeof (raw as any).savedAt === 'string' ? (raw as any).savedAt : new Date(0).toISOString(),
    };
  }

  return null;
}

async function readConfigFromPath(configPath: string): Promise<CliSessionConfig | null> {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return normalizeConfig(JSON.parse(raw) as Partial<CliSessionConfig>);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to read CLI session config: ${error?.message || error}`);
  }
}

export async function readCliSessionConfig(cwd = process.cwd()): Promise<CliSessionConfig | null> {
  return await readConfigFromPath(getCliSessionConfigPath(cwd));
}

export async function removeCliSessionConfig(cwd = process.cwd()): Promise<boolean> {
  try {
    await fs.rm(getCliSessionConfigPath(cwd), { force: true });
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw new Error(`Failed to remove CLI session config: ${error?.message || error}`);
  }
}

async function writeCliSessionConfig(config: CliSessionConfig, cwd = process.cwd()): Promise<CliSessionConfig> {
  const configPath = getCliSessionConfigPath(cwd);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

export async function writeCliWorldSessionConfig(
  worldFilePath: string,
  cwd = process.cwd(),
): Promise<CliWorldSessionConfig> {
  const config: CliWorldSessionConfig = {
    mode: 'world',
    worldFilePath: path.resolve(cwd, worldFilePath),
    savedAt: new Date().toISOString(),
  };

  return (await writeCliSessionConfig(config, cwd)) as CliWorldSessionConfig;
}

export async function writeCliLiveSessionConfig(
  options: { worldFilePath?: string; serverUrl: string; token?: string; browserUrl?: string },
  cwd = process.cwd(),
): Promise<CliLiveSessionConfig> {
  const config: CliLiveSessionConfig = {
    mode: 'live',
    serverUrl: options.serverUrl,
    token: options.token,
    browserUrl: options.browserUrl,
    worldFilePath: options.worldFilePath ? path.resolve(cwd, options.worldFilePath) : undefined,
    savedAt: new Date().toISOString(),
  };

  return (await writeCliSessionConfig(config, cwd)) as CliLiveSessionConfig;
}

export async function resolveConfiguredWorldFilePath(
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const config = await readCliSessionConfig(cwd);
  if (config?.worldFilePath) {
    return config.worldFilePath;
  }

  if (env.GIZMO_WORLD?.trim()) {
    return path.resolve(cwd, env.GIZMO_WORLD);
  }

  return null;
}

export async function resolveDefaultWorldFilePath(
  explicitWorldPath: string | undefined,
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  if (explicitWorldPath?.trim()) {
    return path.resolve(cwd, explicitWorldPath);
  }

  const configuredWorld = await resolveConfiguredWorldFilePath(cwd, env);
  if (configuredWorld) {
    return configuredWorld;
  }

  throw new Error(
    'No world is selected. Pass --world <path>, set GIZMO_WORLD, or run `gizmo use <path>`.',
  );
}

export async function resolveCliTarget(
  options: {
    serverUrl?: string;
    token?: string;
    worldFilePath?: string;
  },
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<CliResolvedTarget> {
  if (options.serverUrl?.trim()) {
    return {
      mode: 'live',
      serverUrl: options.serverUrl,
      token: options.token,
    };
  }

  if (options.worldFilePath?.trim()) {
    return {
      mode: 'world',
      worldFilePath: path.resolve(cwd, options.worldFilePath),
    };
  }

  const config = await readCliSessionConfig(cwd);
  if (config?.mode === 'live' && config.serverUrl) {
    return {
      mode: 'live',
      serverUrl: config.serverUrl,
      token: config.token,
      worldFilePath: config.worldFilePath,
      browserUrl: config.browserUrl,
    };
  }

  if (env.GIZMO_WORLD?.trim()) {
    return {
      mode: 'world',
      worldFilePath: path.resolve(cwd, env.GIZMO_WORLD),
    };
  }

  if (config?.mode === 'world' && config.worldFilePath) {
    return {
      mode: 'world',
      worldFilePath: config.worldFilePath,
    };
  }

  throw new Error(
    'No active gizmo target. Run `gizmo start <path>` for a live session or `gizmo use <path>` for a world file.',
  );
}
