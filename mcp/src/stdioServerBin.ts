#!/usr/bin/env node

import process from 'node:process';
import { parseStdioServerArgs } from './parseArgs';
import { runStdioServer } from './stdioServer';

runStdioServer(parseStdioServerArgs(process.argv.slice(2))).catch((error) => {
  console.error('[engine-mcp-server] Failed to start', error);
  process.exit(1);
});

