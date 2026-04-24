export type EngineMcpServerOptions = {
  worldFilePath: string;
  autoSave: boolean;
};

export function parseStdioServerArgs(argv: string[]): EngineMcpServerOptions {
  let worldFilePath = '';
  let autoSave = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--world' || arg === '--world-file') {
      worldFilePath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--no-auto-save') {
      autoSave = false;
      continue;
    }
  }

  if (!worldFilePath.trim()) {
    throw new Error('Missing required --world <path> argument.');
  }

  return {
    worldFilePath,
    autoSave,
  };
}

