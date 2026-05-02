import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CliResolvedTarget } from './sessionConfig';

const PRIMARY_SESSION_DIR = '.gizmo';
const RUNS_DIR = 'runs';
const RUN_STATE_FILE = 'run.json';
const ARTIFACTS_DIR = 'artifacts';

export interface CliRunConfig {
  id: string;
  runDir: string;
  artifactsDir: string;
  createdAt: string;
  lastUsedAt: string;
  mode?: 'world' | 'live';
  worldFilePath?: string;
  serverUrl?: string;
  token?: string;
  browserUrl?: string;
}

function getPrimarySessionDir(cwd = process.cwd()): string {
  return path.resolve(cwd, PRIMARY_SESSION_DIR);
}

export function getCliRunsDir(cwd = process.cwd()): string {
  return path.join(getPrimarySessionDir(cwd), RUNS_DIR);
}

export function getCliRunStatePath(cwd = process.cwd()): string {
  return path.join(getPrimarySessionDir(cwd), RUN_STATE_FILE);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'run';
}

function buildRunId(now = new Date(), target?: Partial<CliResolvedTarget>): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-')
    .toLowerCase();
  const base =
    target?.worldFilePath
      ? path.basename(target.worldFilePath, path.extname(target.worldFilePath))
      : target?.mode === 'live'
        ? 'live'
        : 'run';
  return `${stamp}-${slugify(base)}-${randomUUID().slice(0, 8)}`;
}

function normalizeRunConfig(raw: Partial<CliRunConfig> | null | undefined): CliRunConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    return null;
  }
  if (typeof raw.runDir !== 'string' || !raw.runDir.trim()) {
    return null;
  }
  if (typeof raw.artifactsDir !== 'string' || !raw.artifactsDir.trim()) {
    return null;
  }

  return {
    id: raw.id,
    runDir: raw.runDir,
    artifactsDir: raw.artifactsDir,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    lastUsedAt: typeof raw.lastUsedAt === 'string' ? raw.lastUsedAt : new Date(0).toISOString(),
    mode: raw.mode === 'world' || raw.mode === 'live' ? raw.mode : undefined,
    worldFilePath: typeof raw.worldFilePath === 'string' && raw.worldFilePath.trim() ? raw.worldFilePath : undefined,
    serverUrl: typeof raw.serverUrl === 'string' && raw.serverUrl.trim() ? raw.serverUrl : undefined,
    token: typeof raw.token === 'string' && raw.token.trim() ? raw.token : undefined,
    browserUrl: typeof raw.browserUrl === 'string' && raw.browserUrl.trim() ? raw.browserUrl : undefined,
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readCliRunConfig(cwd = process.cwd()): Promise<CliRunConfig | null> {
  try {
    const raw = await fs.readFile(getCliRunStatePath(cwd), 'utf8');
    return normalizeRunConfig(JSON.parse(raw) as Partial<CliRunConfig>);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to read CLI run config: ${error?.message || error}`);
  }
}

export async function clearCliRunState(cwd = process.cwd()): Promise<boolean> {
  try {
    await fs.rm(getCliRunStatePath(cwd), { force: true });
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw new Error(`Failed to clear CLI run state: ${error?.message || error}`);
  }
}

async function writeCliRunConfig(config: CliRunConfig, cwd = process.cwd()): Promise<CliRunConfig> {
  const statePath = getCliRunStatePath(cwd);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(config, null, 2), 'utf8');
  await fs.writeFile(path.join(config.runDir, RUN_STATE_FILE), JSON.stringify(config, null, 2), 'utf8');
  return config;
}

export async function ensureCliRun(
  options: {
    cwd?: string;
    target?: Partial<CliResolvedTarget>;
    forceNew?: boolean;
  } = {},
): Promise<CliRunConfig> {
  const cwd = options.cwd ?? process.cwd();
  const existing = await readCliRunConfig(cwd);
  const target = options.target;

  if (!options.forceNew && existing && await pathExists(existing.runDir)) {
    const updated: CliRunConfig = {
      ...existing,
      lastUsedAt: new Date().toISOString(),
      mode: target?.mode ?? existing.mode,
      worldFilePath: target?.worldFilePath ?? existing.worldFilePath,
      serverUrl: target?.mode === 'live' ? target.serverUrl ?? existing.serverUrl : existing.serverUrl,
      token: target?.mode === 'live' ? target.token ?? existing.token : existing.token,
      browserUrl: target?.mode === 'live' ? target.browserUrl ?? existing.browserUrl : existing.browserUrl,
    };
    return await writeCliRunConfig(updated, cwd);
  }

  const now = new Date();
  const id = buildRunId(now, target);
  const runDir = path.join(getCliRunsDir(cwd), id);
  const artifactsDir = path.join(runDir, ARTIFACTS_DIR);
  await fs.mkdir(artifactsDir, { recursive: true });

  const config: CliRunConfig = {
    id,
    runDir,
    artifactsDir,
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    mode: target?.mode,
    worldFilePath: target?.worldFilePath,
    serverUrl: target?.mode === 'live' ? target.serverUrl : undefined,
    token: target?.mode === 'live' ? target.token : undefined,
    browserUrl: target?.mode === 'live' ? target.browserUrl : undefined,
  };

  return await writeCliRunConfig(config, cwd);
}

function extensionForMimeType(mimeType: string | undefined): string {
  switch ((mimeType ?? '').toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/png':
    default:
      return 'png';
  }
}

export async function createCliArtifactOutputPath(options: {
  cwd?: string;
  target?: Partial<CliResolvedTarget>;
  prefix: string;
  mimeType?: string;
}): Promise<{ run: CliRunConfig; outputPath: string }> {
  const run = await ensureCliRun({ cwd: options.cwd, target: options.target });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-')
    .toLowerCase();
  const filename = `${slugify(options.prefix)}-${stamp}.${extensionForMimeType(options.mimeType)}`;
  return {
    run,
    outputPath: path.join(run.artifactsDir, filename),
  };
}

export interface CliCleanResult {
  removedRunDirs: string[];
  removedRunState: boolean;
  keptRunId: string | null;
}

export async function cleanCliArtifacts(
  options: {
    cwd?: string;
    all?: boolean;
  } = {},
): Promise<CliCleanResult> {
  const cwd = options.cwd ?? process.cwd();
  const all = options.all ?? false;
  const activeRun = await readCliRunConfig(cwd);
  const runsDir = getCliRunsDir(cwd);
  const result: CliCleanResult = {
    removedRunDirs: [],
    removedRunState: false,
    keptRunId: all ? null : activeRun?.id ?? null,
  };

  try {
    const entries = await fs.readdir(runsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!all && activeRun?.id === entry.name) continue;
      const runDir = path.join(runsDir, entry.name);
      await fs.rm(runDir, { recursive: true, force: true });
      result.removedRunDirs.push(runDir);
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw new Error(`Failed to clean CLI runs: ${error?.message || error}`);
    }
  }

  if (all || (activeRun && !(await pathExists(activeRun.runDir)))) {
    await fs.rm(getCliRunStatePath(cwd), { force: true });
    result.removedRunState = true;
    result.keptRunId = null;
  }

  return result;
}
