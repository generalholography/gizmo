// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorldDefinition } from '@gizmo3d/engine/automation';
import { createLiveSessionController, startLiveSessionServer } from '../liveServer';
import { renderLiveHtml, resolveLiveRuntimeDescriptor } from '../liveRuntime';

describe('Live session server', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(tempPaths.map(async (entry) => fs.rm(entry, { recursive: true, force: true })));
    tempPaths.length = 0;
  });

  it('bridges browser requests and persists mutating commands back to disk', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-live-server-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    const controller = await createLiveSessionController({
      worldFilePath,
    });

    let stopped = false;

    const fakeBrowserLoop = (async () => {
      const clientId = 'test-browser';
      controller.handleBrowserReady({
        clientId,
        summary: { title: 'Live Test World', entityCount: 0 },
      });

      while (!stopped) {
        const request = await controller.pollBrowser(clientId, 100);
        if (!request) {
          continue;
        }

        let value: any = null;
        const summary =
          request.type === 'get-resource'
            ? { title: 'Live Test World', entityCount: 0 }
            : { title: 'Live Test World', entityCount: 1 };

        if (request.type === 'get-resource') {
          value = { title: 'Live Test World', entityCount: 0 };
        } else if (request.type === 'execute-command') {
          value = `Executed ${request.payload.name}`;
        } else if (request.type === 'serialize-world') {
          value = createWorldDefinition({
            title: 'Live Test World',
            dimensions: [
              {
                name: 'base',
                chunks: [
                  {
                    chunkId: '0_0_0',
                    entities: [
                      {
                        Info: { name: 'Persisted Live Entity' },
                      },
                    ],
                  },
                ],
              },
            ],
          });
        } else {
          value = [];
        }

        controller.handleBrowserResponse({
          clientId,
          requestId: request.id,
          ok: true,
          value,
          summary,
        });
      }
    })();

    try {
      const summary = await controller.handleResource('world-state-summary', {});
      expect(summary.title).toBe('Live Test World');

      const commandResult = await controller.handleCommand('add-entity', {
        archetypeOrDef: {
          definition: {
            Info: { name: 'Transient Entity' },
          },
        },
      });
      expect(commandResult.changed).toBe(true);
      expect(commandResult.message).toBe('Executed add-entity');

      const liveInfo = controller.getInfo({ host: '127.0.0.1', port: 4322 });
      expect(liveInfo.browserSummary).toMatchObject({
        title: 'Live Test World',
        entityCount: 1,
      });

      const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
      const entities =
        saved.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
          .flatMap((chunk: any) => chunk.entities ?? []) ?? [];
      expect(entities.some((entity: any) => entity?.Info?.name === 'Persisted Live Entity')).toBe(true);

      const worldSourceAfterSave = await controller.getWorldSource();
      const reloadedWorld = JSON.parse(worldSourceAfterSave.source);
      const reloadedEntities =
        reloadedWorld.dimensions?.flatMap((dimension: any) => dimension.chunks ?? [])
          .flatMap((chunk: any) => chunk.entities ?? []) ?? [];
      expect(worldSourceAfterSave.format).toBe('json');
      expect(reloadedWorld.title).toBe('Live Test World');
      expect(reloadedEntities.some((entity: any) => entity?.Info?.name === 'Persisted Live Entity')).toBe(true);
    } finally {
      stopped = true;
      await fakeBrowserLoop;
    }
  });

  it('drops timed-out queued browser requests so they cannot execute later', async () => {
    vi.useFakeTimers();
    try {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-live-timeout-'));
      const worldFilePath = path.join(tempDir, 'world.json');
      tempPaths.push(tempDir);

      const controller = await createLiveSessionController({
        worldFilePath,
      });

      controller.handleBrowserReady({
        clientId: 'test-browser',
        summary: { title: 'Live Test World', entityCount: 0 },
      });

      const commandPromise = controller
        .handleCommand('add-entity', {
          archetypeOrDef: {
            definition: {
              Info: { name: 'Should Expire' },
            },
          },
        })
        .catch((error) => error);

      await vi.advanceTimersByTimeAsync(30_000);
      const timeoutError = await commandPromise;
      expect(timeoutError).toBeInstanceOf(Error);
      expect(timeoutError.message).toContain('Timed out waiting for browser response for execute-command.');

      const nextRequestPromise = controller.pollBrowser('test-browser', 10);
      await vi.advanceTimersByTimeAsync(10);
      const nextRequest = await nextRequestPromise;
      expect(nextRequest).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves live runtime assets from both source and bundled CLI layouts', async () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const sourceCliDir = path.join(repoRoot, 'cli', 'src');
    const bundledCliDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-cli-dist-'));
    tempPaths.push(bundledCliDir);
    await fs.writeFile(path.join(bundledCliDir, 'liveClient.js'), 'export {};', 'utf8');

    expect(resolveLiveRuntimeDescriptor(sourceCliDir)).toEqual({
      mode: 'source',
      viteRoot: path.join(repoRoot, 'engine'),
      clientEntryPath: path.join(repoRoot, 'cli', 'src', 'liveClient.ts'),
    });
    expect(resolveLiveRuntimeDescriptor(bundledCliDir)).toEqual({
      mode: 'dist',
      viteRoot: bundledCliDir,
      clientEntryPath: path.join(bundledCliDir, 'liveClient.js'),
    });
  });

  it('renders live html against an explicit client entry path', () => {
    const html = renderLiveHtml('/tmp/gizmo/liveClient.js');
    expect(html).toContain('/@fs/tmp/gizmo/liveClient.js');
    expect(html).toContain('Gizmo Live Session');
  });

  it('uses cookie auth for browser assets while keeping API auth header-only', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-live-http-auth-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);
    await fs.writeFile(worldFilePath, JSON.stringify(createWorldDefinition({ title: 'HTTP Auth Test' })), 'utf8');

    let server;
    try {
      server = await startLiveSessionServer({
        worldFilePath,
        host: '127.0.0.1',
        port: 0,
        token: 'test-token',
      });
    } catch (error: any) {
      if (error?.code === 'EPERM' || String(error?.message || error).includes('listen EPERM')) {
        return;
      }
      throw error;
    }

    try {
      const info = server.getInfo();
      const htmlResponse = await fetch(info.browserUrl);
      expect(htmlResponse.status).toBe(200);
      const cookieHeader = htmlResponse.headers.get('set-cookie')?.split(';')[0];
      expect(cookieHeader).toMatch(/^gizmo_live_token=/);

      const html = await htmlResponse.text();
      const liveClientSrc = html.match(/<script type="module" src="([^"]*liveClient\.(?:ts|js))"><\/script>/)?.[1];
      expect(liveClientSrc).toBeTruthy();

      const clientUrl = new URL(liveClientSrc!, info.serverUrl);
      const assetWithoutCookie = await fetch(clientUrl);
      expect(assetWithoutCookie.status).toBe(401);

      const assetWithCookie = await fetch(clientUrl, {
        headers: {
          cookie: cookieHeader!,
        },
      });
      expect(assetWithCookie.status).toBe(200);

      const apiWithQueryToken = await fetch(`${info.serverUrl}/api/session?token=test-token`);
      expect(apiWithQueryToken.status).toBe(401);

      const apiWithHeaderToken = await fetch(`${info.serverUrl}/api/session`, {
        headers: {
          'x-gizmo-token': 'test-token',
        },
      });
      expect(apiWithHeaderToken.status).toBe(200);
    } finally {
      await server.close();
    }
  }, 15000);

  it('saves live browser worlds and exported artifacts through authenticated endpoints', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-live-persist-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    const artifactsDir = path.join(tempDir, '.gizmo', 'runs', 'test-run', 'artifacts');
    tempPaths.push(tempDir);
    await fs.writeFile(worldFilePath, JSON.stringify(createWorldDefinition({ title: 'Before Save' })), 'utf8');

    let server;
    try {
      server = await startLiveSessionServer({
        worldFilePath,
        host: '127.0.0.1',
        port: 0,
        token: 'test-token',
        artifactsDir,
      });
    } catch (error: any) {
      if (error?.code === 'EPERM' || String(error?.message || error).includes('listen EPERM')) {
        return;
      }
      throw error;
    }

    try {
      const info = server.getInfo();
      expect(info.artifactsDir).toBe(artifactsDir);

      const savedDefinition = createWorldDefinition({ title: 'Saved From Browser' });
      const saveResponse = await fetch(`${info.serverUrl}/api/world`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gizmo-token': 'test-token',
        },
        body: JSON.stringify({
          format: 'json',
          definition: savedDefinition,
        }),
      });
      expect(saveResponse.status).toBe(200);
      const saved = JSON.parse(await fs.readFile(worldFilePath, 'utf8'));
      expect(saved.title).toBe('Saved From Browser');

      const artifactResponse = await fetch(`${info.serverUrl}/api/artifacts`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gizmo-token': 'test-token',
        },
        body: JSON.stringify({
          filename: '../demo export.glb',
          mimeType: 'model/gltf-binary',
          dataBase64: Buffer.from('glb bytes').toString('base64'),
        }),
      });
      expect(artifactResponse.status).toBe(200);
      const artifact = await artifactResponse.json();
      expect(artifact.filename).toBe('demo-export.glb');
      expect(artifact.path).toBe(path.join(artifactsDir, 'demo-export.glb'));
      await expect(fs.readFile(artifact.path, 'utf8')).resolves.toBe('glb bytes');

      const usdzArtifactResponse = await fetch(`${info.serverUrl}/api/artifacts`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gizmo-token': 'test-token',
        },
        body: JSON.stringify({
          mimeType: 'model/vnd.usdz+zip',
          dataBase64: Buffer.from('usdz bytes').toString('base64'),
        }),
      });
      expect(usdzArtifactResponse.status).toBe(200);
      const usdzArtifact = await usdzArtifactResponse.json();
      expect(usdzArtifact.filename).toMatch(/^artifact-\d+\.usdz$/);
      expect(usdzArtifact.path).toBe(path.join(artifactsDir, usdzArtifact.filename));
      await expect(fs.readFile(usdzArtifact.path, 'utf8')).resolves.toBe('usdz bytes');

      const unauthenticatedSave = await fetch(`${info.serverUrl}/api/world`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ definition: savedDefinition }),
      });
      expect(unauthenticatedSave.status).toBe(401);
    } finally {
      await server.close();
    }
  }, 15000);

  it('rejects non-loopback hosts unless remote access is explicit', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-live-host-'));
    const worldFilePath = path.join(tempDir, 'world.json');
    tempPaths.push(tempDir);

    await expect(
      startLiveSessionServer({
        worldFilePath,
        host: '0.0.0.0',
        port: 0,
      }),
    ).rejects.toThrow(/--allow-remote/);
  });
});
