import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliRoot, '..');
const distDir = path.join(cliRoot, 'dist');
const builtCliPath = path.join(distDir, 'main.js');
const demoWorldPath = path.join(repoRoot, 'engine', 'src', 'worlds', 'live-cli-demo.json');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
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

function parseJsonOutput(text) {
  return JSON.parse(text.trim());
}

async function waitForWorkspaceSession(workspaceDir, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const startedAt = Date.now();
  const sessionPath = path.join(workspaceDir, '.gizmo', 'session.json');

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const raw = await fs.readFile(sessionPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed?.serverUrl && parsed?.browserUrl) {
        return parsed;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }

    if (liveProcess && liveProcess.exitCode !== null) {
      throw new Error(
        [
          `Live CLI exited before workspace session became ready (exit ${liveProcess.exitCode}).`,
          liveStdout.trim() ? `stdout:\n${liveStdout.trim()}` : '',
          liveStderr.trim() ? `stderr:\n${liveStderr.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for workspace session at ${sessionPath}.`);
}

let liveProcess = null;
let liveStdout = '';
let liveStderr = '';

async function waitForProcessExit(child) {
  if (!child) {
    return;
  }

  if (child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise((resolve) => child.once('exit', resolve));
}

async function main() {
  const tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-validate-workspace-'));
  const tmpPrefix = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-validate-prefix-'));
  const tmpCache = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-validate-cache-'));
  const tmpLiveWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-validate-live-'));

  try {
    await fs.access(builtCliPath);
    await fs.copyFile(demoWorldPath, path.join(tmpWorkspace, 'world.json'));
    await fs.copyFile(demoWorldPath, path.join(tmpLiveWorkspace, 'world.json'));

    const builtHelp = run(process.execPath, [builtCliPath, '--help']);
    assert.match(builtHelp.stdout, /Usage: gizmo/);

    run(
      'npm',
      ['install', '--prefix', tmpPrefix, '--no-package-lock', '--ignore-scripts', distDir],
      {
        env: { ...process.env, npm_config_cache: tmpCache },
      },
    );

    const installedBin = path.join(tmpPrefix, 'node_modules', '.bin', 'gizmo');
    const installedHelp = run(installedBin, ['--help']);
    assert.match(installedHelp.stdout, /Usage: gizmo/);
    assert.match(installedHelp.stdout, /^\s*init\s+/m);

    const useResult = extractFirstJsonObject(
      run(installedBin, ['use', './world.json'], { cwd: tmpWorkspace }).stdout,
    );
    assert.equal(await fs.realpath(useResult.worldFilePath), await fs.realpath(path.join(tmpWorkspace, 'world.json')));

    const worldMcpConfig = extractFirstJsonObject(
      run(installedBin, ['mcp-config'], { cwd: tmpWorkspace }).stdout,
    );
    assert.deepEqual(worldMcpConfig, {
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp'],
        },
      },
    });

    const summaryBefore = extractFirstJsonObject(
      run(installedBin, ['resource', 'world-state-summary'], { cwd: tmpWorkspace }).stdout,
    );
    assert.ok(
      typeof summaryBefore.entityCount === 'number' && summaryBefore.entityCount >= 0,
      'Expected world-state-summary to include a numeric entityCount.',
    );

    extractFirstJsonObject(
      run(
        installedBin,
        [
          'call',
          'add-entity',
          '--params',
          JSON.stringify({
            archetypeOrDef: {
              definition: {
                Info: { name: 'Validation Cube' },
                Transform: { x: 4, y: 1, z: 0 },
              },
            },
          }),
        ],
        { cwd: tmpWorkspace },
      ).stdout,
    );

    const summaryAfter = extractFirstJsonObject(
      run(installedBin, ['resource', 'world-state-summary'], { cwd: tmpWorkspace }).stdout,
    );
    assert.equal(summaryAfter.entityCount, summaryBefore.entityCount + 1);

    const packed = run('npm', ['pack'], {
      cwd: distDir,
      env: { ...process.env, npm_config_cache: tmpCache },
    });
    const tarballName = packed.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => line.endsWith('.tgz'));
    assert.ok(tarballName, 'Expected npm pack to emit a tarball name.');

    const tarballPackageJson = run('tar', ['-xOf', path.join(distDir, tarballName), 'package/package.json']).stdout;
    const packedPackage = JSON.parse(tarballPackageJson);
    assert.equal(packedPackage.name, '@gizmo3d/cli');
    assert.equal(packedPackage.bin?.gizmo, './main.js');
    const tarballFiles = run('tar', ['-tf', path.join(distDir, tarballName)]).stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    assert.ok(tarballFiles.includes('package/LICENSE'), 'Expected package tarball to include LICENSE.');
    assert.ok(tarballFiles.includes('package/README.md'), 'Expected package tarball to include README.md.');
    assert.ok(tarballFiles.includes('package/main.js'), 'Expected package tarball to include main.js.');
    assert.ok(tarballFiles.includes('package/liveClient.js'), 'Expected package tarball to include liveClient.js.');
    assert.ok(!tarballFiles.some((file) => file.includes('/.gizmo/')), 'Package tarball must not include .gizmo runtime state.');

    liveProcess = spawn(
      process.execPath,
      [builtCliPath, 'live', './world.json', '--port', '0'],
      {
        cwd: tmpLiveWorkspace,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    liveProcess.stdout?.setEncoding('utf8');
    liveProcess.stderr?.setEncoding('utf8');
    liveProcess.stdout?.on('data', (chunk) => {
      liveStdout += chunk;
    });
    liveProcess.stderr?.on('data', (chunk) => {
      liveStderr += chunk;
    });

    const liveInfo = await waitForWorkspaceSession(tmpLiveWorkspace);
    const liveMcpConfig = extractFirstJsonObject(
      run(process.execPath, [builtCliPath, 'mcp-config'], { cwd: tmpLiveWorkspace }).stdout,
    );
    assert.deepEqual(liveMcpConfig, {
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp'],
        },
      },
    });

    const session = extractFirstJsonObject(
      run(process.execPath, [builtCliPath, 'session'], { cwd: tmpLiveWorkspace }).stdout,
    );
    assert.equal(session.mode, 'live');

    const liveHtmlResponse = await fetch(liveInfo.browserUrl);
    assert.equal(liveHtmlResponse.status, 200);
    const liveCookie = liveHtmlResponse.headers.get('set-cookie');
    assert.match(liveCookie ?? '', /gizmo_live_token=/);
    const liveCookieHeader = liveCookie?.split(';')[0];
    assert.ok(liveCookieHeader, 'Expected live HTML to set a live session cookie.');
    const liveHtml = await liveHtmlResponse.text();
    assert.match(liveHtml, /Gizmo Live Session/);
    assert.match(liveHtml, /liveClient\.(ts|js)/);
    const liveClientSrc = liveHtml.match(/<script type="module" src="([^"]*liveClient\.(?:ts|js))"><\/script>/)?.[1];
    assert.ok(liveClientSrc, 'Expected live HTML to include a live client module script.');

    const liveClientWithoutCookie = await fetch(new URL(liveClientSrc, liveInfo.serverUrl));
    assert.equal(liveClientWithoutCookie.status, 401);

    const liveClientWithCookie = await fetch(new URL(liveClientSrc, liveInfo.serverUrl), {
      headers: {
        cookie: liveCookieHeader,
      },
    });
    assert.equal(liveClientWithCookie.status, 200);

    const apiSessionWithoutToken = await fetch(`${liveInfo.serverUrl}/api/session`);
    assert.equal(apiSessionWithoutToken.status, 401);
    const apiSessionWithoutTokenPayload = await apiSessionWithoutToken.json();
    assert.equal(apiSessionWithoutTokenPayload.code, 'live-auth-failed');

    const apiSessionWithQueryToken = await fetch(
      `${liveInfo.serverUrl}/api/session?token=${encodeURIComponent(liveInfo.token)}`,
    );
    assert.equal(apiSessionWithQueryToken.status, 401);
    const apiSessionWithQueryTokenPayload = await apiSessionWithQueryToken.json();
    assert.equal(apiSessionWithQueryTokenPayload.code, 'live-auth-failed');

    const apiSessionWithHeaderToken = await fetch(`${liveInfo.serverUrl}/api/session`, {
      headers: {
        'x-gizmo-token': liveInfo.token,
      },
    });
    assert.equal(apiSessionWithHeaderToken.status, 200);
    const apiSessionWithHeaderTokenPayload = await apiSessionWithHeaderToken.json();
    assert.equal(apiSessionWithHeaderTokenPayload.mode, 'live');

    liveProcess.kill('SIGTERM');
    await waitForProcessExit(liveProcess);
    liveProcess = null;

    console.log(
      JSON.stringify(
        {
          ok: true,
          builtCliPath,
          installedBin,
          packedTarball: path.join(distDir, tarballName),
          validated: [
            'built-help',
            'installed-help',
            'installed-help-includes-init',
            'workspace-use',
            'workspace-mcp-config',
            'workspace-resource',
            'workspace-call',
            'packed-bin-metadata',
            'packed-files',
            'live-mcp-config',
            'live-server-session',
            'live-server-html',
            'live-server-client-assets',
            'live-server-api-auth',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    if (liveProcess) {
      liveProcess.kill('SIGTERM');
      await waitForProcessExit(liveProcess);
      liveProcess = null;
    }
    await Promise.all([
      fs.rm(tmpWorkspace, { recursive: true, force: true }),
      fs.rm(tmpPrefix, { recursive: true, force: true }),
      fs.rm(tmpCache, { recursive: true, force: true }),
      fs.rm(tmpLiveWorkspace, { recursive: true, force: true }),
    ]);
  }
}

await main();
