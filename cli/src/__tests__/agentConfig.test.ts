import { describe, expect, it } from 'vitest';
import { buildMcpCommand, buildMcpConfig } from '../agentConfig';

describe('agent config helpers', () => {
  it('builds a world-backed MCP config', () => {
    expect(
      buildMcpConfig({
        worldFilePath: '/tmp/world.json',
      }),
    ).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp', '--world', '/tmp/world.json'],
        },
      },
    });
  });

  it('builds a live-server-backed MCP config and command', () => {
    expect(
      buildMcpConfig({
        serverUrl: 'http://127.0.0.1:4292',
        serverName: 'engine-live',
      }),
    ).toEqual({
      mcpServers: {
        'engine-live': {
          command: 'gizmo',
          args: ['mcp', '--server', 'http://127.0.0.1:4292'],
        },
      },
    });

    expect(buildMcpCommand({ serverUrl: 'http://127.0.0.1:4292' })).toBe(
      'gizmo mcp --server http://127.0.0.1:4292',
    );
  });

  it('includes live-session tokens in portable MCP configs', () => {
    expect(
      buildMcpConfig({
        serverUrl: 'http://127.0.0.1:4292',
        token: 'secret-token',
      }),
    ).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp', '--server', 'http://127.0.0.1:4292', '--token', 'secret-token'],
        },
      },
    });

    expect(buildMcpCommand({ serverUrl: 'http://127.0.0.1:4292', token: 'secret-token' })).toBe(
      'gizmo mcp --server http://127.0.0.1:4292 --token secret-token',
    );
  });

  it('builds a minimal workspace-local MCP config by default', () => {
    expect(buildMcpConfig()).toEqual({
      mcpServers: {
        gizmo: {
          command: 'gizmo',
          args: ['mcp'],
        },
      },
    });
    expect(buildMcpCommand()).toBe('gizmo mcp');
  });
});
