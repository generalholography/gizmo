import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverUrl = process.argv[2];
if (!serverUrl) {
  console.error('Usage: node validateLiveProxyMcp.mjs <live-server-url> [token]');
  process.exit(1);
}
const token = process.argv[3];

const cliRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(cliRoot, '..');
const cliEntry = path.join(cliRoot, 'dist', 'main.js');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-live-mcp-'));

const client = new Client(
  {
    name: 'gizmo-live-mcp-smoke',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [cliEntry, 'mcp', '--server', serverUrl, ...(token ? ['--token', token] : [])],
  cwd: repoRoot,
  stderr: 'pipe',
});

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const resources = await client.listResources();

  assert.ok(tools.tools.some((tool) => tool.name === 'add-entity'));
  assert.ok(resources.resources.some((resource) => resource.uri === 'engine://world/summary'));
  assert.ok(resources.resources.some((resource) => resource.uri === 'engine://render/screenshot'));

  const summary = await client.readResource({ uri: 'engine://world/summary' });
  const summaryText = summary.contents?.[0]?.text ?? '';
  const summaryJson = JSON.parse(summaryText);
  assert.equal(typeof summaryJson.title, 'string');
  assert.equal(typeof summaryJson.entityCount, 'number');

  const screenshot = await client.readResource({ uri: 'engine://render/screenshot' });
  const screenshotText = screenshot.contents?.[0]?.text ?? '';
  assert.match(screenshotText, /dataUrl/);

  const entityName = `Live MCP Smoke ${Date.now()}`;
  await client.callTool({
    name: 'add-entity',
    arguments: {
      archetypeOrDef: {
        definition: {
          Info: { name: entityName },
          Transform: { x: 6, y: 1, z: 0 },
        },
      },
    },
  });

  const entityList = await client.readResource({ uri: 'engine://entities' });
  const entityListText = entityList.contents?.[0]?.text ?? '';
  assert.match(entityListText, new RegExp(entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const result = {
    ok: true,
    serverUrl,
    validated: ['list-tools', 'list-resources', 'world-summary', 'render-screenshot', 'add-entity'],
  };
  await fs.writeFile(path.join(tempDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.close().catch(() => undefined);
  await transport.close().catch(() => undefined);
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
}
