import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    env: options.env ?? process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(' ')}`,
        result.stdout?.trim() ? `stdout:\n${result.stdout.trim()}` : '',
        result.stderr?.trim() ? `stderr:\n${result.stderr.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
  }

  return result;
}

function buildShellLikeEnv() {
  const pathEntries = (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter(Boolean)
    .filter((entry) => !entry.endsWith(`${path.sep}node_modules${path.sep}.bin`));

  return {
    ...process.env,
    PATH: pathEntries.join(path.delimiter),
  };
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start < 0) {
    throw new Error(`Expected JSON object in output, received:\n${text}`);
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(text.slice(start, index + 1));
      }
    }
  }

  throw new Error(`Unterminated JSON object in output:\n${text}`);
}

async function main() {
  const tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-validate-global-'));
  const gizmoProjectDir = path.join(tmpWorkspace, 'project');
  const shellEnv = buildShellLikeEnv();

  try {
    const resolvedWhich = run('which', ['gizmo'], { env: shellEnv }).stdout.trim();
    const help = run('gizmo', ['--help'], { env: shellEnv }).stdout;
    const npmGlobalPrefix = run('npm', ['prefix', '-g'], { env: shellEnv }).stdout.trim();

    if (!/^\s*init\s+/m.test(help)) {
      throw new Error(
        [
          `The gizmo binary on PATH does not expose the new init command.`,
          `Resolved binary: ${resolvedWhich}`,
          `npm global prefix: ${npmGlobalPrefix}`,
          '',
          'This usually means an older gizmo install is shadowing the CLI workspace package.',
          'Repair steps:',
          '1. Run `which gizmo` and `gizmo --help`.',
          '2. Remove the old install from the prefix that appears first on PATH.',
          '3. Reinstall with `npm install -g ./cli/dist` or install into the PATH-first prefix explicitly.',
        ].join('\n'),
      );
    }

    const initResult = extractFirstJsonObject(run('gizmo', ['init', gizmoProjectDir], { env: shellEnv }).stdout);
    assert.equal(initResult.mode, 'init');
    assert.equal(initResult.workspaceDir, gizmoProjectDir);

    const worldFilePath = path.join(gizmoProjectDir, 'world.json');
    const sessionConfigPath = path.join(gizmoProjectDir, '.gizmo', 'session.json');
    const savedWorld = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
    const savedSession = JSON.parse(await fs.readFile(sessionConfigPath, 'utf8'));

    assert.equal(savedWorld.title, 'Untitled World');
    assert.equal(savedSession.worldFilePath, worldFilePath);

    console.log(
      JSON.stringify(
        {
          ok: true,
          resolvedGizmoPath: resolvedWhich,
          npmGlobalPrefix,
          validated: [
            'path-resolution',
            'help-includes-init',
            'global-init-command',
            'workspace-world-created',
            'workspace-session-saved',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await fs.rm(tmpWorkspace, { recursive: true, force: true });
  }
}

await main();
