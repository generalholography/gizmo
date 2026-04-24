import { describe, expect, it } from 'vitest';
import { buildLiveSessionOutput } from '../liveSessionOutput';

describe('buildLiveSessionOutput', () => {
  it('includes Codex browser hints and portable MCP config for live sessions', () => {
    const payload = buildLiveSessionOutput({
      mode: 'live',
      liveInfo: {
        mode: 'live',
        serverUrl: 'http://127.0.0.1:4318',
        browserUrl: 'http://127.0.0.1:4318/live.html',
      },
      run: {
        id: 'run-123',
        runDir: '/tmp/run-123',
        artifactsDir: '/tmp/run-123/artifacts',
        createdAt: '2026-04-23T00:00:00.000Z',
        lastUsedAt: '2026-04-23T00:00:00.000Z',
        mode: 'live',
        serverUrl: 'http://127.0.0.1:4318',
        browserUrl: 'http://127.0.0.1:4318/live.html',
      },
    });

    expect(payload.browserTargets).toEqual({
      system: 'http://127.0.0.1:4318/live.html',
      codex: 'http://127.0.0.1:4318/live.html',
    });
    expect(payload.codex).toEqual({
      browserUrl: 'http://127.0.0.1:4318/live.html',
      openInAppBrowserUrl: 'http://127.0.0.1:4318/live.html',
      note: 'Open this URL in the Codex in-app browser to attach the visible live world.',
    });
    expect(payload.mcpConfig).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp'],
        },
      },
    });
    expect(payload.portableMcpConfig).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp', '--server', 'http://127.0.0.1:4318'],
        },
      },
    });
  });

  it('tracks system browser launch metadata for dev sessions', () => {
    const payload = buildLiveSessionOutput({
      mode: 'dev',
      liveInfo: {
        mode: 'live',
        serverUrl: 'http://127.0.0.1:4318',
        browserUrl: 'http://127.0.0.1:4318/live.html',
      },
      run: {
        id: 'run-123',
        runDir: '/tmp/run-123',
        artifactsDir: '/tmp/run-123/artifacts',
        createdAt: '2026-04-23T00:00:00.000Z',
        lastUsedAt: '2026-04-23T00:00:00.000Z',
      },
      browserOpen: {
        command: 'open',
        args: ['http://127.0.0.1:4318/live.html'],
      },
    });

    expect(payload.mode).toBe('dev');
    expect(payload.browserOpened).toBe(true);
    expect(payload.browserOpen).toEqual({
      command: 'open',
      args: ['http://127.0.0.1:4318/live.html'],
    });
    expect(payload.live.serverUrl).toBe('http://127.0.0.1:4318');
  });
});
