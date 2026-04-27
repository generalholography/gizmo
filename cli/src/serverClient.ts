export interface LiveServerCommandResult {
  changed?: boolean;
  message?: string;
  [key: string]: any;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function readJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

function buildHeaders(token?: string, headers?: HeadersInit): HeadersInit {
  const result = new Headers(headers);
  if (token?.trim()) {
    result.set('x-gizmo-token', token);
  }
  return result;
}

async function request<T>(serverUrl: string, pathname: string, init?: RequestInit & { token?: string }): Promise<T> {
  const response = await fetch(`${trimTrailingSlash(serverUrl)}${pathname}`, {
    ...init,
    headers: buildHeaders(init?.token, init?.headers),
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    const errorMessage = payload?.error || response.statusText;
    throw new Error(errorMessage);
  }
  return payload as T;
}

export async function callLiveServerCommand(
  serverUrl: string,
  name: string,
  params: Record<string, any>,
  token?: string,
): Promise<LiveServerCommandResult> {
  return await request<LiveServerCommandResult>(serverUrl, '/api/command', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ name, params }),
    token,
  });
}

export async function callLiveServerBatch(
  serverUrl: string,
  calls: Array<{ name: string; params: Record<string, any> }>,
  description?: string,
  token?: string,
): Promise<LiveServerCommandResult> {
  return await request<LiveServerCommandResult>(serverUrl, '/api/batch', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ calls, description }),
    token,
  });
}

export async function readLiveServerResource(
  serverUrl: string,
  name: string,
  params?: Record<string, any>,
  token?: string,
): Promise<any> {
  const url = new URL(`${trimTrailingSlash(serverUrl)}/api/resource`);
  url.searchParams.set('name', name);
  if (params?.stableId !== undefined) {
    url.searchParams.set('stableId', String(params.stableId));
  }
  return await request<any>(serverUrl, `${url.pathname}${url.search}`, { token });
}

export async function readLiveServerSession(serverUrl: string, token?: string): Promise<any> {
  return await request<any>(serverUrl, '/api/session', { token });
}
