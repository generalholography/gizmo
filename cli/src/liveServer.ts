import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import {
  isMutatingAutomationCommand,
  listAutomationCommands,
  listAutomationResourceDefinitions,
  persistsWorldForAutomationCommand,
  type AutomationCommandCall,
  type WorldDefinition,
} from '@gizmo3d/engine/automation';
import { renderLiveHtml, resolveLiveRuntimeDescriptor } from './liveRuntime';
import { loadWorldFile, type WorldFileFormat, writeWorldDefinitionToFile } from './worldFile';

type BrowserRequest =
  | { id: string; expiresAt: number; type: 'execute-command'; payload: { name: string; params: Record<string, any> } }
  | { id: string; expiresAt: number; type: 'execute-batch'; payload: { calls: AutomationCommandCall[]; description?: string } }
  | { id: string; expiresAt: number; type: 'get-resource'; payload: { name: string; params: Record<string, any> } }
  | { id: string; expiresAt: number; type: 'serialize-world'; payload: { options: { includeEntities: boolean; includeRuntime: boolean } } };

interface BrowserResponseEnvelope {
  clientId: string;
  requestId: string;
  ok: boolean;
  value?: any;
  error?: string;
  summary?: any;
}

interface BrowserReadyEnvelope {
  clientId: string;
  summary?: any;
}

interface PollWaiter {
  clientId: string;
  resolve: (request: BrowserRequest | null) => void;
}

export interface LiveSessionServerOptions {
  worldFilePath: string;
  host: string;
  port: number;
  token?: string;
  allowRemote?: boolean;
  artifactsDir?: string;
}

export interface LiveSessionServer {
  close: () => Promise<void>;
  getInfo: () => Record<string, any>;
}

export interface LiveSessionController {
  getInfo: (connection?: { host: string; port: number }) => Record<string, any>;
  getBootstrapPayload: (connection: { host: string; port: number }) => Record<string, any>;
  getWorldSource: () => Promise<{ format: WorldFileFormat; source: string }>;
  handleBrowserReady: (payload: BrowserReadyEnvelope) => void;
  pollBrowser: (clientId: string, timeoutMs?: number, signal?: AbortSignal) => Promise<BrowserRequest | null>;
  handleBrowserResponse: (payload: BrowserResponseEnvelope) => void;
  handleCommand: (name: string, params: Record<string, any>) => Promise<Record<string, any>>;
  handleBatch: (calls: AutomationCommandCall[], description?: string) => Promise<Record<string, any>>;
  handleResource: (name: string, params: Record<string, any>) => Promise<any>;
}

type PendingRequest = {
  request: BrowserRequest;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

class BrowserBridge {
  private clientId: string | null = null;
  private browserReady = false;
  private browserSummary: any = null;
  private queue: BrowserRequest[] = [];
  private pending = new Map<string, PendingRequest>();
  private pollResolvers: PollWaiter[] = [];
  private readyResolvers: Array<() => void> = [];

  attach(clientId: string, summary?: any): void {
    this.clientId = clientId;
    this.browserReady = true;
    this.browserSummary = summary ?? null;
    const waiters = [...this.readyResolvers];
    this.readyResolvers = [];
    waiters.forEach((resolve) => resolve());
  }

  getState() {
    return {
      clientId: this.clientId,
      browserReady: this.browserReady,
      browserSummary: this.browserSummary,
      pendingRequestCount: this.pending.size,
      queuedRequestCount: this.queue.length,
    };
  }

  async waitUntilReady(timeoutMs = 30_000): Promise<void> {
    if (this.browserReady) return;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyResolvers = this.readyResolvers.filter((entry) => entry !== resolve);
        reject(new Error('No browser client is attached to the live session yet.'));
      }, timeoutMs);

      this.readyResolvers.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async enqueue(request: Omit<BrowserRequest, 'id'>, timeoutMs = 30_000): Promise<any> {
    await this.waitUntilReady(timeoutMs);
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const fullRequest = { ...request, id, expiresAt: Date.now() + timeoutMs } as BrowserRequest;

    return await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.queue = this.queue.filter((entry) => entry.id !== id);
        reject(new Error(`Timed out waiting for browser response for ${request.type}.`));
      }, timeoutMs);

      this.pending.set(id, {
        request: fullRequest,
        resolve,
        reject,
        timer,
      });

      const waiter = this.pollResolvers.shift();
      if (waiter) {
        waiter.resolve(fullRequest);
        return;
      }

      this.queue.push(fullRequest);
    });
  }

  async poll(clientId: string, timeoutMs = 25_000, signal?: AbortSignal): Promise<BrowserRequest | null> {
    if (this.clientId && this.clientId !== clientId) {
      throw new Error(`Live session is already attached to browser client '${this.clientId}'.`);
    }

    this.clientId = clientId;
    while (this.queue.length > 0) {
      const next = this.queue.shift() ?? null;
      if (!next) break;
      if (next.expiresAt <= Date.now()) {
        continue;
      }
      return next;
    }

    return await new Promise<BrowserRequest | null>((resolve) => {
      const waiter: PollWaiter = {
        clientId,
        resolve,
      };

      const cleanup = () => {
        this.pollResolvers = this.pollResolvers.filter((entry) => entry !== waiter);
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      const resolveRequest = (request: BrowserRequest | null) => {
        clearTimeout(timeout);
        cleanup();
        signal?.removeEventListener('abort', handleAbort);
        resolve(request);
      };

      const handleAbort = () => {
        clearTimeout(timeout);
        cleanup();
        resolve(null);
      };

      waiter.resolve = resolveRequest;
      this.pollResolvers.push(waiter);
      signal?.addEventListener('abort', handleAbort, { once: true });
    });
  }

  respond(envelope: BrowserResponseEnvelope): void {
    const pending = this.pending.get(envelope.requestId);
    if (!pending) {
      return;
    }

    if (envelope.summary !== undefined) {
      this.browserSummary = envelope.summary ?? null;
    }

    clearTimeout(pending.timer);
    this.pending.delete(envelope.requestId);

    if (envelope.ok) {
      pending.resolve(envelope.value);
      return;
    }

    pending.reject(new Error(envelope.error || 'Browser request failed.'));
  }
}

function normalizeFsImportPath(filePath: string): string {
  return `/@fs${filePath.replace(/\\/g, '/')}`;
}

async function readRequestBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
}

function writeError(res: ServerResponse, statusCode: number, code: string, message: string): void {
  writeJson(res, statusCode, {
    ok: false,
    code,
    error: message,
  });
}

function writeHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}

function sanitizeArtifactFilename(filename: string | undefined, mimeType: string | undefined): string {
  const fallbackExtension = (() => {
    switch ((mimeType ?? '').toLowerCase()) {
      case 'model/gltf-binary':
        return 'glb';
      case 'model/gltf+json':
        return 'gltf';
      case 'model/stl':
        return 'stl';
      case 'model/vnd.usdz+zip':
      case 'model/usd':
        return 'usdz';
      case 'application/javascript':
      case 'text/javascript':
        return 'js';
      case 'application/json':
        return 'json';
      default:
        return 'bin';
    }
  })();
  const raw = filename?.trim() || `artifact-${Date.now()}.${fallbackExtension}`;
  const base = path.basename(raw).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `artifact-${Date.now()}.${fallbackExtension}`;
}

async function writeArtifactFile(artifactsDir: string, payload: any): Promise<{ path: string; filename: string; bytes: number }> {
  const filename = sanitizeArtifactFilename(payload?.filename, payload?.mimeType);
  const outputPath = path.join(artifactsDir, filename);
  const resolvedArtifactsDir = path.resolve(artifactsDir);
  const resolvedOutputPath = path.resolve(outputPath);
  if (!resolvedOutputPath.startsWith(`${resolvedArtifactsDir}${path.sep}`)) {
    throw new Error('Artifact filename resolves outside the artifacts directory.');
  }

  const dataBase64 = typeof payload?.dataBase64 === 'string' ? payload.dataBase64 : '';
  if (!dataBase64) {
    throw new Error('Missing artifact dataBase64 payload.');
  }
  const data = Buffer.from(dataBase64, 'base64');
  await fs.mkdir(resolvedArtifactsDir, { recursive: true });
  await fs.writeFile(resolvedOutputPath, data);
  return {
    path: resolvedOutputPath,
    filename,
    bytes: data.byteLength,
  };
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function createSessionToken(): string {
  return randomBytes(24).toString('base64url');
}

function getHeaderToken(req: IncomingMessage): string | null {
  const header = req.headers['x-gizmo-token'];
  if (typeof header === 'string' && header.trim()) return header;
  if (Array.isArray(header) && typeof header[0] === 'string' && header[0].trim()) return header[0];
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);
  return null;
}

function getPageToken(req: IncomingMessage, url: URL): string | null {
  return getHeaderToken(req) ?? url.searchParams.get('token') ?? getCookieToken(req);
}

function getCookieToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (rawName === 'gizmo_live_token') {
      return decodeURIComponent(rawValue.join('='));
    }
  }
  return null;
}

function tokenMatches(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function appendToken(url: string, token: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('token', token);
  return parsed.toString();
}

function writeLiveSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader('set-cookie', `gizmo_live_token=${encodeURIComponent(token)}; Path=/; SameSite=Strict`);
}

function loadedWorldFormatForWrite(value: unknown): WorldFileFormat {
  return value === 'world-script' ? 'world-script' : 'json';
}

async function maybeTransformWorldScript(vite: ViteDevServer, worldFilePath: string): Promise<string> {
  const moduleUrl = normalizeFsImportPath(worldFilePath);
  const transformed = await vite.transformRequest(moduleUrl);
  return transformed?.code ?? '';
}

export async function createLiveSessionController(options: {
  worldFilePath: string;
  transformWorldScript?: (worldFilePath: string) => Promise<string>;
}): Promise<LiveSessionController> {
  const worldFilePath = path.resolve(options.worldFilePath);
  const loadedWorld = await loadWorldFile(worldFilePath);
  const bridge = new BrowserBridge();
  let lastSavedAt: string | null = null;

  async function persistWorldDefinition(definition: WorldDefinition): Promise<void> {
    await writeWorldDefinitionToFile(worldFilePath, loadedWorld.format, definition);
    lastSavedAt = new Date().toISOString();
  }

  async function persistBrowserWorld(): Promise<void> {
    const definition = await bridge.enqueue({
      type: 'serialize-world',
      payload: {
        options: {
          includeEntities: true,
          includeRuntime: false,
        },
      },
    });
    await persistWorldDefinition(definition as WorldDefinition);
  }

  return {
    getInfo: (connection) => {
      const host = connection?.host ?? '127.0.0.1';
      const port = connection?.port ?? 0;
      const baseServerUrl = port > 0 ? `http://${host}:${port}` : null;
      return {
        mode: 'live',
        host,
        port,
        serverUrl: baseServerUrl,
        browserUrl: baseServerUrl ? `${baseServerUrl}/live.html` : null,
        worldFilePath,
        worldFormat: loadedWorld.format as WorldFileFormat,
        lastSavedAt,
        ...bridge.getState(),
      };
    },
    getBootstrapPayload: (connection) => ({
      worldFilePath,
      worldFormat: loadedWorld.format,
      serverUrl: `http://${connection.host}:${connection.port}`,
    }),
    getWorldSource: async () => {
      const currentWorld = await loadWorldFile(worldFilePath);
      if (currentWorld.format === 'json') {
        return {
          format: 'json' as const,
          source: currentWorld.source,
        };
      }

      const transformedSource = options.transformWorldScript
        ? await options.transformWorldScript(worldFilePath)
        : '';

      return {
        format: 'world-script' as const,
        source: transformedSource || currentWorld.source,
      };
    },
    handleBrowserReady: (payload) => {
      bridge.attach(payload.clientId, payload.summary);
    },
    pollBrowser: async (clientId, timeoutMs, signal) => await bridge.poll(clientId, timeoutMs, signal),
    handleBrowserResponse: (payload) => {
      bridge.respond(payload);
    },
    handleCommand: async (name, params) => {
      const message = await bridge.enqueue({
        type: 'execute-command',
        payload: { name, params },
      });

      if (persistsWorldForAutomationCommand(name)) {
        await persistBrowserWorld();
      }

      return {
        changed: isMutatingAutomationCommand(name),
        message,
        lastSavedAt,
      };
    },
    handleBatch: async (calls, description) => {
      const results = await bridge.enqueue({
        type: 'execute-batch',
        payload: { calls, description },
      });

      if (calls.some((call) => persistsWorldForAutomationCommand(call.name))) {
        await persistBrowserWorld();
      }

      return {
        changed: calls.some((call) => isMutatingAutomationCommand(call.name)),
        results: calls.map((call, index) => ({
          text: Array.isArray(results) ? (results[index] ?? call.name) : call.name,
          changed: isMutatingAutomationCommand(call.name),
        })),
        lastSavedAt,
      };
    },
    handleResource: async (name, params) =>
      await bridge.enqueue({
        type: 'get-resource',
        payload: {
          name,
          params,
        },
      }),
  };
}

export async function startLiveSessionServer(options: LiveSessionServerOptions): Promise<LiveSessionServer> {
  if (!options.allowRemote && !isLoopbackHost(options.host)) {
    throw new Error(
      `Refusing to bind live session to non-loopback host '${options.host}'. Pass --allow-remote to expose it beyond this machine.`,
    );
  }

  const runtime = resolveLiveRuntimeDescriptor();
  const worldFilePath = path.resolve(options.worldFilePath);
  const artifactsDir = options.artifactsDir ? path.resolve(options.artifactsDir) : undefined;
  const token = options.token?.trim() || createSessionToken();
  let resolvedPort = options.port;
  let serverUrl = `http://${options.host}:${resolvedPort}`;
  let browserUrl = appendToken(`${serverUrl}/live.html`, token);

  const vite = await createViteServer({
    root: runtime.viteRoot,
    appType: 'custom',
    resolve: {
      alias: {
        '@gizmo3d/engine/automation/headless': path.resolve(runtime.viteRoot, 'src/automation/headless.ts'),
        '@gizmo3d/engine/automation/session': path.resolve(runtime.viteRoot, 'src/automation/session.ts'),
        '@gizmo3d/engine/automation/resources': path.resolve(runtime.viteRoot, 'src/automation/resources.ts'),
        '@gizmo3d/engine/automation/commands': path.resolve(runtime.viteRoot, 'src/automation/commands.ts'),
        '@gizmo3d/engine/automation/definitions': path.resolve(runtime.viteRoot, 'src/automation/definitions.ts'),
        '@gizmo3d/engine/automation/world': path.resolve(runtime.viteRoot, 'src/automation/world.ts'),
        '@gizmo3d/engine/automation': path.resolve(runtime.viteRoot, 'src/automation/index.ts'),
        '@gizmo3d/engine': path.resolve(runtime.viteRoot, 'src/index.ts'),
      },
    },
    server: {
      middlewareMode: true,
      hmr: false,
      ws: false,
      watch: null,
      fs: {
        allow: [runtime.viteRoot, path.dirname(runtime.clientEntryPath), path.dirname(worldFilePath)],
      },
    },
  });
  const controller = await createLiveSessionController({
    worldFilePath,
    transformWorldScript: async (entryPath) => await maybeTransformWorldScript(vite, entryPath),
  });
  let closing = false;

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        writeError(res, 400, 'bad-request', 'Missing request URL.');
        return;
      }

      const url = new URL(req.url, `http://${options.host}:${options.port}`);

      if (url.pathname === '/') {
        res.statusCode = 302;
        res.setHeader('location', `/live.html?token=${encodeURIComponent(token)}`);
        res.end();
        return;
      }

      if (url.pathname === '/live.html' && req.method === 'GET') {
        if (!tokenMatches(getPageToken(req, url), token)) {
          writeError(res, 401, 'live-auth-failed', 'Missing or invalid gizmo live session token.');
          return;
        }
        const source = renderLiveHtml(runtime.clientEntryPath);
        const html = await vite.transformIndexHtml(url.pathname, source);
        writeLiveSessionCookie(res, token);
        writeHtml(res, 200, html);
        return;
      }

      if (url.pathname.startsWith('/api/') && !tokenMatches(getHeaderToken(req), token)) {
        writeError(res, 401, 'live-auth-failed', 'Missing or invalid gizmo live session token.');
        return;
      }

      if (url.pathname === '/api/bootstrap' && req.method === 'GET') {
        writeJson(res, 200, controller.getBootstrapPayload({ host: options.host, port: resolvedPort }));
        return;
      }

      if (url.pathname === '/api/world-source' && req.method === 'GET') {
        writeJson(res, 200, await controller.getWorldSource());
        return;
      }

      if (url.pathname === '/api/browser/ready' && req.method === 'POST') {
        const body = (await readRequestBody(req)) as BrowserReadyEnvelope;
        if (!body?.clientId) {
          writeError(res, 400, 'bad-request', 'Missing browser clientId.');
          return;
        }
        controller.handleBrowserReady(body);
        writeJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/browser/poll' && req.method === 'GET') {
        const clientId = url.searchParams.get('clientId');
        if (!clientId) {
          writeError(res, 400, 'bad-request', 'Missing browser clientId.');
          return;
        }
        const timeoutMs = Number(url.searchParams.get('timeoutMs') || '25000');
        const abortController = new AbortController();
        req.on('close', () => abortController.abort());
        const request = await controller.pollBrowser(
          clientId,
          Number.isFinite(timeoutMs) ? timeoutMs : 25_000,
          abortController.signal,
        );
        writeJson(res, 200, { request });
        return;
      }

      if (url.pathname === '/api/browser/respond' && req.method === 'POST') {
        controller.handleBrowserResponse((await readRequestBody(req)) as BrowserResponseEnvelope);
        writeJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/world' && req.method === 'POST') {
        const body = await readRequestBody(req);
        const definition = body?.definition;
        if (!definition || typeof definition !== 'object') {
          writeError(res, 400, 'bad-request', 'Missing world definition.');
          return;
        }
        const worldFormat = loadedWorldFormatForWrite(controller.getInfo({ host: options.host, port: resolvedPort }).worldFormat);
        await writeWorldDefinitionToFile(worldFilePath, worldFormat, definition as WorldDefinition);
        writeJson(res, 200, {
          ok: true,
          worldFilePath,
          savedAt: new Date().toISOString(),
        });
        return;
      }

      if (url.pathname === '/api/artifacts' && req.method === 'POST') {
        if (!artifactsDir) {
          writeError(res, 409, 'artifacts-disabled', 'This live session does not have an artifacts directory.');
          return;
        }
        const artifact = await writeArtifactFile(artifactsDir, await readRequestBody(req));
        writeJson(res, 200, {
          ok: true,
          path: artifact.path,
          filename: artifact.filename,
          bytes: artifact.bytes,
        });
        return;
      }

      if (url.pathname === '/api/session' && req.method === 'GET') {
        writeJson(res, 200, {
          ...controller.getInfo({ host: options.host, port: resolvedPort }),
          artifactsDir,
        });
        return;
      }

      if (url.pathname === '/api/shutdown' && req.method === 'POST') {
        writeJson(res, 200, {
          ok: true,
          shuttingDown: true,
          serverUrl,
          worldFilePath,
        });
        if (!closing) {
          closing = true;
          setTimeout(() => {
            server.close(() => {
              void vite.close();
            });
          }, 0);
        }
        return;
      }

      if (url.pathname === '/api/commands' && req.method === 'GET') {
        writeJson(res, 200, listAutomationCommands());
        return;
      }

      if (url.pathname === '/api/resources' && req.method === 'GET') {
        writeJson(res, 200, listAutomationResourceDefinitions());
        return;
      }

      if (url.pathname === '/api/resource' && req.method === 'GET') {
        const name = url.searchParams.get('name');
        if (!name) {
          writeError(res, 400, 'bad-request', 'Missing resource name.');
          return;
        }

        const params: Record<string, any> = {};
        for (const [key, value] of url.searchParams.entries()) {
          if (key === 'name') continue;
          try {
            params[key] = JSON.parse(value);
          } catch {
            params[key] = value;
          }
        }

        writeJson(res, 200, await controller.handleResource(name, params));
        return;
      }

      if (url.pathname === '/api/command' && req.method === 'POST') {
        const body = await readRequestBody(req);
        const name = body?.name;
        const params = body?.params ?? {};
        if (!name) {
          writeError(res, 400, 'bad-request', 'Missing command name.');
          return;
        }

        writeJson(res, 200, await controller.handleCommand(name, params));
        return;
      }

      if (url.pathname === '/api/batch' && req.method === 'POST') {
        const body = await readRequestBody(req);
        const calls = Array.isArray(body?.calls) ? body.calls : [];
        const description = typeof body?.description === 'string' ? body.description : undefined;
        if (calls.length === 0) {
          writeError(res, 400, 'bad-request', 'Batch calls must be a non-empty array.');
          return;
        }

        writeJson(res, 200, await controller.handleBatch(calls, description));
        return;
      }

      if (!tokenMatches(getPageToken(req, url), token)) {
        writeError(res, 401, 'live-auth-failed', 'Missing or invalid gizmo live session token.');
        return;
      }

      vite.middlewares(req, res, () => {
        writeError(res, 404, 'not-found', `Route '${url.pathname}' not found.`);
      });
    } catch (error: any) {
      writeError(res, 500, 'internal-error', error?.message || String(error));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  resolvedPort =
    typeof address === 'object' && address && typeof address.port === 'number'
      ? address.port
      : options.port;
  serverUrl = `http://${options.host}:${resolvedPort}`;
  browserUrl = appendToken(`${serverUrl}/live.html`, token);

  return {
    close: async () => {
      if (closing) {
        await vite.close().catch(() => undefined);
        return;
      }
      closing = true;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await vite.close();
    },
    getInfo: () => ({
      ...controller.getInfo({ host: options.host, port: resolvedPort }),
      token,
      serverUrl,
      browserUrl,
      artifactsDir,
    }),
  };
}
