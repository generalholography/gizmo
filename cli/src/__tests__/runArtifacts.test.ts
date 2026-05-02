// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearCliRunState,
  cleanCliArtifacts,
  createCliArtifactOutputPath,
  ensureCliRun,
  getCliRunStatePath,
  getCliRunsDir,
  readCliRunConfig,
} from '../runArtifacts';

describe('CLI run artifacts', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(tempPaths.map(async (entry) => fs.rm(entry, { recursive: true, force: true })));
    tempPaths.length = 0;
  });

  it('creates and reuses a workspace run under .gizmo/runs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-run-artifacts-'));
    tempPaths.push(tempDir);

    const runA = await ensureCliRun({
      cwd: tempDir,
      target: {
        mode: 'live',
        serverUrl: 'http://127.0.0.1:4321',
        browserUrl: 'http://127.0.0.1:4321/live.html',
        worldFilePath: path.join(tempDir, 'world.json'),
      },
    });
    const runB = await ensureCliRun({ cwd: tempDir });

    expect(runB.id).toBe(runA.id);
    expect(runA.runDir.startsWith(getCliRunsDir(tempDir))).toBe(true);
    await expect(fs.stat(runA.runDir)).resolves.toBeDefined();
    await expect(fs.stat(runA.artifactsDir)).resolves.toBeDefined();
    await expect(readCliRunConfig(tempDir)).resolves.toMatchObject({ id: runA.id });
  });

  it('creates default artifact output paths inside the active run', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-run-artifact-output-'));
    tempPaths.push(tempDir);

    const artifact = await createCliArtifactOutputPath({
      cwd: tempDir,
      prefix: 'snapshot',
      mimeType: 'image/png',
      target: {
        mode: 'world',
        worldFilePath: path.join(tempDir, 'world.json'),
      },
    });

    expect(artifact.outputPath.startsWith(path.join(getCliRunsDir(tempDir), artifact.run.id, 'artifacts'))).toBe(true);
    expect(artifact.outputPath.endsWith('.png')).toBe(true);
  });

  it('cleans stale runs while preserving the active workspace run by default', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-run-clean-'));
    tempPaths.push(tempDir);

    const active = await ensureCliRun({
      cwd: tempDir,
      target: {
        mode: 'world',
        worldFilePath: path.join(tempDir, 'world.json'),
      },
    });

    const staleRunDir = path.join(getCliRunsDir(tempDir), 'stale-run');
    await fs.mkdir(path.join(staleRunDir, 'artifacts'), { recursive: true });

    const result = await cleanCliArtifacts({ cwd: tempDir });

    expect(result.keptRunId).toBe(active.id);
    expect(result.removedRunDirs).toContain(staleRunDir);
    await expect(fs.stat(active.runDir)).resolves.toBeDefined();
    await expect(fs.stat(staleRunDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('removes the active run state when cleaning with --all semantics', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-run-clean-all-'));
    tempPaths.push(tempDir);

    const active = await ensureCliRun({
      cwd: tempDir,
      target: {
        mode: 'world',
        worldFilePath: path.join(tempDir, 'world.json'),
      },
    });

    const result = await cleanCliArtifacts({ cwd: tempDir, all: true });

    expect(result.keptRunId).toBeNull();
    expect(result.removedRunState).toBe(true);
    expect(result.removedRunDirs).toContain(active.runDir);
    await expect(fs.stat(getCliRunStatePath(tempDir))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('clears active run state without deleting artifacts', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-run-state-clear-'));
    tempPaths.push(tempDir);

    const active = await ensureCliRun({
      cwd: tempDir,
      target: {
        mode: 'live',
        serverUrl: 'http://127.0.0.1:4321',
      },
    });

    await expect(clearCliRunState(tempDir)).resolves.toBe(true);
    await expect(readCliRunConfig(tempDir)).resolves.toBeNull();
    await expect(fs.stat(active.runDir)).resolves.toBeDefined();
  });
});
