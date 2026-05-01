import { EngineMode, loadDependencies, startEngine } from '@gizmo3d/engine';

type BootstrapPayload = {
  serverUrl: string;
  worldFilePath: string;
  worldFormat: 'json' | 'world-script';
};

type BrowserRequest =
  | { id: string; expiresAt: number; type: 'execute-command'; payload: { name: string; params: Record<string, any> } }
  | { id: string; expiresAt: number; type: 'execute-batch'; payload: { calls: Array<{ name: string; params: Record<string, any> }>; description?: string } }
  | { id: string; expiresAt: number; type: 'get-resource'; payload: { name: string; params: Record<string, any> } }
  | { id: string; expiresAt: number; type: 'serialize-world'; payload: { options: { includeEntities: boolean; includeRuntime: boolean } } };

function createStatusPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '84px';
  panel.style.left = '50%';
  panel.style.transform = 'translateX(-50%)';
  panel.style.zIndex = '10000';
  panel.style.padding = '8px 10px';
  panel.style.borderRadius = '8px';
  panel.style.background = 'rgba(7, 9, 14, 0.82)';
  panel.style.color = '#d7e2f0';
  panel.style.fontFamily = 'Menlo, Monaco, monospace';
  panel.style.fontSize = '12px';
  panel.style.lineHeight = '1.5';
  panel.style.maxWidth = '360px';
  panel.style.textAlign = 'center';
  panel.style.whiteSpace = 'pre-line';
  panel.textContent = 'Starting live engine session...';
  document.body.appendChild(panel);
  return panel;
}

function getSessionToken(): string {
  return new URL(window.location.href).searchParams.get('token') ?? '';
}

function withSessionToken(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const token = getSessionToken();
  if (token) {
    headers.set('x-gizmo-token', token);
  }
  return {
    ...init,
    headers,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, withSessionToken(init));
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || response.statusText);
  }
  return payload as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  return await fetchJson<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function bootstrapWorld(api: any): Promise<void> {
  const worldSource = await fetchJson<{ format: 'json' | 'world-script'; source: string }>('/api/world-source');
  if (worldSource.format === 'json') {
    await api.loadWorldFromDefinition(JSON.parse(worldSource.source));
    return;
  }
  await api.loadWorld(worldSource.source);
}

async function handleRequest(api: any, request: BrowserRequest): Promise<any> {
  switch (request.type) {
    case 'execute-command':
      return await api.automation.executeCommand(request.payload.name, request.payload.params);
    case 'execute-batch':
      return await api.automation.executeBatch(request.payload.calls, request.payload.description);
    case 'get-resource':
      return api.automation.getResource(request.payload.name, request.payload.params);
    case 'serialize-world':
      return api.serializeWorld(request.payload.options);
    default:
      throw new Error(`Unsupported live browser request '${(request as any).type}'.`);
  }
}

async function start(): Promise<void> {
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';

  const statusPanel = createStatusPanel();
  statusPanel.textContent = 'Connecting to live session...';

  const bootstrap = await fetchJson<BootstrapPayload>('/api/bootstrap');
  const clientId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client_${Math.random().toString(36).slice(2, 10)}`;

  await loadDependencies();

  const canvas = document.createElement('canvas');
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  document.body.appendChild(canvas);

  const api = startEngine(canvas, {
    mode: EngineMode.EDITOR,
    hudVisible: true,
    onSaveWorld: async () => {
      const definition = api.serializeWorld({
        includeEntities: true,
        includeRuntime: false,
      });
      await postJson('/api/world', {
        format: bootstrap.worldFormat,
        definition,
      });
    },
    onExportBlob: async ({ blob, filename, mimeType }: { blob: Blob; filename: string; mimeType?: string }) => {
      const result = await postJson<{ path?: string; filename?: string; bytes?: number }>('/api/artifacts', {
        filename,
        mimeType: mimeType || blob.type,
        dataBase64: arrayBufferToBase64(await blob.arrayBuffer()),
      });
      return {
        path: result.path,
        message: result.path ? `Saved to ${result.path}` : `${result.filename || filename} exported`,
      };
    },
    editorSessionConfig: {
      leftPanelCollapsedByDefault: true,
    },
  });

  await bootstrapWorld(api);
  (window as any).__ENGINE_LIVE__ = api;

  const summary = api.automation.getResource('world-state-summary');
  await postJson('/api/browser/ready', {
    clientId,
    summary,
  });

  statusPanel.textContent = [
    'Live session connected',
    `Bridge: ${bootstrap.serverUrl}`,
  ].join('\n');

  while (true) {
    try {
      const response = await fetchJson<{ request: BrowserRequest | null }>(
        `/api/browser/poll?clientId=${encodeURIComponent(clientId)}&timeoutMs=25000`,
      );

      if (!response.request) {
        continue;
      }

      if (response.request.expiresAt <= Date.now()) {
        const summary = api.automation.getResource('world-state-summary');
        await postJson('/api/browser/respond', {
          clientId,
          requestId: response.request.id,
          ok: false,
          error: 'Request expired before browser execution.',
          summary,
        });
        continue;
      }

      try {
        const value = await handleRequest(api, response.request);
        const summary = api.automation.getResource('world-state-summary');
        await postJson('/api/browser/respond', {
          clientId,
          requestId: response.request.id,
          ok: true,
          value,
          summary,
        });
      } catch (error: any) {
        await postJson('/api/browser/respond', {
          clientId,
          requestId: response.request.id,
          ok: false,
          error: error?.message || String(error),
        });
      }
    } catch (error: any) {
      statusPanel.textContent = `Live session polling failed: ${error?.message || error}`;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

void start().catch((error) => {
  console.error('[engine live] failed to start browser client', error);
  const panel = createStatusPanel();
  panel.textContent = `Failed to start live session: ${error?.message || error}`;
});
