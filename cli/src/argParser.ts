import fs from 'node:fs/promises';
import path from 'node:path';

export interface ParsedCliArgs {
  command: string | null;
  positionals: string[];
  flags: Map<string, string | boolean>;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const args = [...argv];
  const command = args.shift() ?? null;
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const equalsIndex = token.indexOf('=');
    if (equalsIndex >= 0) {
      const key = token.slice(2, equalsIndex);
      const value = token.slice(equalsIndex + 1);
      flags.set(key, value);
      continue;
    }

    const key = token.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      flags.set(key, true);
      continue;
    }

    flags.set(key, next);
    index += 1;
  }

  return { command, positionals, flags };
}

export function getFlag(parsed: ParsedCliArgs, name: string): string | boolean | undefined {
  return parsed.flags.get(name);
}

export function getStringFlag(parsed: ParsedCliArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === 'string' ? value : undefined;
}

export function getBooleanFlag(parsed: ParsedCliArgs, name: string): boolean {
  const value = parsed.flags.get(name);
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  const normalized = value.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
}

export function requireStringFlag(parsed: ParsedCliArgs, name: string): string {
  const value = getStringFlag(parsed, name);
  if (!value) {
    throw new Error(`Missing required --${name} option.`);
  }
  return value;
}

export async function parseJsonFlag<T>(value: string | undefined, cwd: string): Promise<T> {
  if (!value) {
    return {} as T;
  }

  const raw = value.startsWith('@')
    ? await fs.readFile(path.resolve(cwd, value.slice(1)), 'utf8')
    : value;

  return JSON.parse(raw) as T;
}

export function parseOptionalNumber(value: string | undefined, flagName: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected --${flagName} to be a number, received '${value}'.`);
  }
  return parsed;
}
