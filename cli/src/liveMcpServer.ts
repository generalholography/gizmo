import process from 'node:process';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAutomationMcpServer } from '@gizmo3d/mcp';
import { LiveAutomationSession } from './liveSession';

export async function createLiveProxyMcpServer(serverUrl: string, token?: string) {
  const session = new LiveAutomationSession(serverUrl, token);
  const server = await createAutomationMcpServer(session, {
    name: 'engine-live-mcp-server',
    instructions:
      'Use resources to inspect the attached live world and tools to mutate it. ' +
      'This server proxies a running gizmo live session, so edits apply to the visible browser-backed world.',
    promptDescription: 'Guidance for editing the attached live world through the engine MCP server.',
    buildPromptText: (info, goal) =>
      `Inspect engine://session/info and engine://world/summary before making edits. ` +
      `Use engine://entities and engine://entities/{stableId} for precise targeting. ` +
      `This MCP session is attached to live server ${info.serverUrl || serverUrl}.` +
      (goal ? ` Goal: ${goal}` : ''),
  });

  return { server, session };
}

export async function runLiveProxyMcpServer(serverUrl: string, token?: string): Promise<void> {
  const { server, session } = await createLiveProxyMcpServer(serverUrl, token);
  const transport = new StdioServerTransport();

  const close = async () => {
    await server.close().catch(() => undefined);
    if (session.close) {
      await session.close().catch(() => undefined);
    }
  };

  process.on('SIGINT', () => void close().finally(() => process.exit(0)));
  process.on('SIGTERM', () => void close().finally(() => process.exit(0)));

  await server.connect(transport);
}
