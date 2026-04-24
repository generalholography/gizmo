import fs from 'node:fs/promises';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAutomationMcpServer } from './mcpServerFactory';
import type { EngineMcpServerOptions } from './parseArgs';

const ENGINE_SERVER_NAME = 'engine';

export async function createEngineMcpServer(options: EngineMcpServerOptions) {
  const resolvedWorldPath = path.resolve(options.worldFilePath);
  if (resolvedWorldPath.includes(`${path.sep}absolute${path.sep}path${path.sep}to${path.sep}`)) {
    throw new Error(
      `The --world argument is using the placeholder example path '${options.worldFilePath}'. ` +
        `Pass a real path instead, for example ` +
        `'${path.resolve('@gizmo3d/engine/src/worlds/blank-world.js')}' or '/tmp/engine-world.json'.`,
    );
  }

  const ext = path.extname(resolvedWorldPath).toLowerCase();
  if (ext === '.js' || ext === '.mjs') {
    try {
      await fs.access(resolvedWorldPath);
    } catch {
      throw new Error(
        `World script file not found at '${resolvedWorldPath}'. ` +
          `Pass an existing .js/.mjs world script, or use a .json path to create a new world file.`,
      );
    }
  }

  const { HeadlessWorldSession } = await import('@gizmo3d/engine/automation/headless');
  const session = await HeadlessWorldSession.open({
    worldFilePath: resolvedWorldPath,
    autoSave: options.autoSave,
  });

  const server = await createAutomationMcpServer(session, {
    name: `${ENGINE_SERVER_NAME}-mcp-server`,
    instructions:
      'Use resources to inspect the current world definition and tools to mutate it. ' +
      'Mutating tools persist changes to the backing world file automatically unless the server is started with --no-auto-save.',
    promptDescription: 'Guidance for editing the current world through the engine MCP server.',
    buildPromptText: (_info, goal) =>
      `Inspect engine://session/info and engine://world/summary before making edits. ` +
      `Use engine://entities and engine://entities/{stableId} for precise targeting. ` +
      `All mutating tools auto-save by default.` +
      (goal ? ` Goal: ${goal}` : ''),
  });

  return { server, session };
}

export async function runStdioServer(options: EngineMcpServerOptions): Promise<void> {
  const { server, session } = await createEngineMcpServer(options);
  const transport = new StdioServerTransport();

  const close = async () => {
    await server.close().catch(() => undefined);
    await session.close?.().catch(() => undefined);
  };

  process.on('SIGINT', () => void close().finally(() => process.exit(0)));
  process.on('SIGTERM', () => void close().finally(() => process.exit(0)));

  await server.connect(transport);
}
