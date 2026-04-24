export interface McpConfigTarget {
  worldFilePath?: string;
  serverUrl?: string;
  token?: string;
  serverName?: string;
}

export function buildMcpConfig(target: McpConfigTarget = {}): Record<string, any> {
  const serverName = target.serverName?.trim() || 'gizmo';
  const args = ['mcp'];

  if (target.serverUrl?.trim()) {
    args.push('--server', target.serverUrl);
    if (target.token?.trim()) {
      args.push('--token', target.token);
    }
  } else if (target.worldFilePath?.trim()) {
    args.push('--world', target.worldFilePath);
  }

  return {
    mcpServers: {
      [serverName]: {
        command: 'gizmo',
        args,
      },
    },
  };
}

export function buildMcpCommand(target: McpConfigTarget = {}): string {
  const args = buildMcpConfig(target).mcpServers[target.serverName?.trim() || 'gizmo'].args as string[];
  return ['gizmo', ...args].join(' ');
}
