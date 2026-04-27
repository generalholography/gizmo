import fs from 'node:fs/promises';
import path from 'node:path';
import { createWorldDefinition, loadWorldFromJSON, type WorldDefinition } from '@gizmo3d/engine/automation';

export type WorldFileFormat = 'json' | 'world-script';

export interface LoadedWorldFile {
  worldFilePath: string;
  format: WorldFileFormat;
  existsOnDisk: boolean;
  source: string;
}

export interface InitializedWorldFile {
  worldFilePath: string;
  format: WorldFileFormat;
  created: boolean;
  overwrote: boolean;
}

export async function loadWorldFile(worldFilePath: string): Promise<LoadedWorldFile> {
  const resolvedPath = path.resolve(worldFilePath);

  try {
    const source = await fs.readFile(resolvedPath, 'utf8');
    return {
      worldFilePath: resolvedPath,
      format: detectWorldFileFormat(resolvedPath, source),
      existsOnDisk: true,
      source,
    };
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw new Error(`Failed to read world file '${resolvedPath}': ${error?.message || error}`);
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    if (extension === '.js' || extension === '.mjs') {
      throw new Error(
        `World script file not found at '${resolvedPath}'. Pass an existing .js/.mjs file, or use a .json path to create a new world.`,
      );
    }

    return {
      worldFilePath: resolvedPath,
      format: 'json',
      existsOnDisk: false,
      source: JSON.stringify(createWorldDefinition(), null, 2),
    };
  }
}

export function detectWorldFileFormat(worldFilePath: string, source: string): WorldFileFormat {
  const extension = path.extname(worldFilePath).toLowerCase();
  const trimmed = source.trim();

  if (extension === '.json' || trimmed.startsWith('{')) {
    return 'json';
  }

  if (extension === '.js' || extension === '.mjs' || trimmed.includes('setupScene(')) {
    return 'world-script';
  }

  throw new Error(`Unsupported world file format for '${worldFilePath}'.`);
}

function detectWorldFileFormatFromPath(worldFilePath: string): WorldFileFormat {
  const extension = path.extname(worldFilePath).toLowerCase();

  if (!extension || extension === '.json') {
    return 'json';
  }

  if (extension === '.js' || extension === '.mjs') {
    return 'world-script';
  }

  throw new Error(
    `Unsupported world file format for '${worldFilePath}'. Use a directory path, or a .json, .js, or .mjs file.`,
  );
}

export function resolveInitWorldFilePath(targetPath: string | undefined, cwd = process.cwd()): string {
  const resolvedTarget = path.resolve(cwd, targetPath ?? '.');
  const extension = path.extname(resolvedTarget).toLowerCase();

  if (!targetPath || !extension) {
    return path.join(resolvedTarget, 'world.json');
  }

  detectWorldFileFormatFromPath(resolvedTarget);
  return resolvedTarget;
}

export async function initializeWorldFile(
  worldFilePath: string,
  options: { force?: boolean; ifMissing?: boolean } = {},
): Promise<InitializedWorldFile> {
  const resolvedPath = path.resolve(worldFilePath);
  const format = detectWorldFileFormatFromPath(resolvedPath);
  let existedOnDisk = false;

  try {
    await fs.access(resolvedPath);
    existedOnDisk = true;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw new Error(`Failed to access world file '${resolvedPath}': ${error?.message || error}`);
    }
  }

  if (existedOnDisk && options.ifMissing) {
    return {
      worldFilePath: resolvedPath,
      format,
      created: false,
      overwrote: false,
    };
  }

  if (existedOnDisk && !options.force) {
    throw new Error(`World file already exists at '${resolvedPath}'. Pass --force to overwrite it.`);
  }

  await writeWorldDefinitionToFile(resolvedPath, format, createWorldDefinition());

  return {
    worldFilePath: resolvedPath,
    format,
    created: !existedOnDisk,
    overwrote: existedOnDisk,
  };
}

export async function writeWorldDefinitionToFile(
  worldFilePath: string,
  format: WorldFileFormat,
  definition: WorldDefinition,
): Promise<void> {
  await fs.mkdir(path.dirname(worldFilePath), { recursive: true });

  let contents: string;
  if (format === 'world-script') {
    contents = loadWorldFromJSON(JSON.stringify(definition));
  } else {
    contents = JSON.stringify(definition, null, 2);
  }

  await writeTextFileAtomically(worldFilePath, contents);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function writeTextFileAtomically(filePath: string, contents: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.${path.basename(resolvedPath)}.${process.pid}.${Date.now()}.tmp`);
  const backupPath = `${resolvedPath}.bak`;

  await fs.writeFile(tempPath, contents, 'utf8');
  if (await pathExists(resolvedPath)) {
    await fs.copyFile(resolvedPath, backupPath);
  }
  await fs.rename(tempPath, resolvedPath);
}
