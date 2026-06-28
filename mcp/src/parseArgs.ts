export type EngineMcpServerOptions = {
  worldFilePath: string;
  autoSave: boolean;
  allowWorldScripts: boolean;
};

export function parseStdioServerArgs(argv: string[]): EngineMcpServerOptions {
  let worldFilePath = '';
  let autoSave = true;
  let allowWorldScripts = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--world') {
      worldFilePath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--no-auto-save') {
      autoSave = false;
      continue;
    }
    if (arg === '--allow-world-scripts') {
      allowWorldScripts = true;
      continue;
    }
  }

  if (!worldFilePath.trim()) {
    throw new Error('Missing required --world <path> argument.');
  }

  return {
    worldFilePath,
    autoSave,
    allowWorldScripts,
  };
}
