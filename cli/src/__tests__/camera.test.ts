// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../main';

describe('CLI camera command', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(tempPaths.map(async (entry) => fs.rm(entry, { recursive: true, force: true })));
    tempPaths.length = 0;
  });

  function createIo() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    return {
      io: {
        stdout: (text: string) => stdout.push(text),
        stderr: (text: string) => stderr.push(text),
      },
      stdout,
      stderr,
    };
  }

  it('reads and updates the viewport camera in a headless session', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-cli-camera-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const initialIo = createIo();
    const initialExitCode = await runCli(['camera', 'get', '--world', worldFilePath], initialIo.io);
    expect(initialExitCode).toBe(0);
    expect(JSON.parse(initialIo.stdout[0]).position).toEqual({ x: 0, y: 0, z: 0 });

    const setIo = createIo();
    const setExitCode = await runCli(
      [
        'camera',
        'set',
        '--world',
        worldFilePath,
        '--position',
        '{"x":3,"y":7,"z":15}',
        '--look-at',
        '{"x":1,"y":2,"z":3}',
        '--fov',
        '58',
      ],
      setIo.io,
    );

    expect(setExitCode).toBe(0);
    const setPayload = JSON.parse(setIo.stdout[0]);
    expect(setPayload.position).toEqual({ x: 3, y: 7, z: 15 });
    expect(setPayload.fov).toBe(58);
  });
});
