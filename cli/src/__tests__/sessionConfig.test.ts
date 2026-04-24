// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getCliSessionConfigPath,
  readCliSessionConfig,
  resolveCliTarget,
  writeCliLiveSessionConfig,
  writeCliWorldSessionConfig,
} from '../sessionConfig';

describe('CLI session config', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(tempPaths.map(async (entry) => fs.rm(entry, { recursive: true, force: true })));
    tempPaths.length = 0;
  });

  it('writes workspace config to .gizmo/session.json', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-session-config-'));
    tempPaths.push(tempDir);

    const config = await writeCliWorldSessionConfig('./world.json', tempDir);

    expect(config.mode).toBe('world');
    expect(config.worldFilePath).toBe(path.join(tempDir, 'world.json'));
    expect(getCliSessionConfigPath(tempDir)).toBe(path.join(tempDir, '.gizmo', 'session.json'));
    expect(await readCliSessionConfig(tempDir)).toEqual(config);
  });

  it('falls back to a saved live session target before world config', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-live-target-'));
    tempPaths.push(tempDir);

    await writeCliWorldSessionConfig('./world.json', tempDir);
    await writeCliLiveSessionConfig(
      {
        worldFilePath: './world.json',
        serverUrl: 'http://127.0.0.1:4318',
        token: 'session-token',
        browserUrl: 'http://127.0.0.1:4318/live.html?token=session-token',
      },
      tempDir,
    );

    await expect(resolveCliTarget({}, tempDir)).resolves.toEqual({
      mode: 'live',
      serverUrl: 'http://127.0.0.1:4318',
      token: 'session-token',
      worldFilePath: path.join(tempDir, 'world.json'),
      browserUrl: 'http://127.0.0.1:4318/live.html?token=session-token',
    });
  });

  it('returns null when no workspace session has been configured yet', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-empty-session-'));
    tempPaths.push(tempDir);

    await expect(readCliSessionConfig(tempDir)).resolves.toBeNull();
  });
});
