import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LiveRuntimeDescriptor {
  viteRoot: string;
  clientEntryPath: string;
  mode: 'source' | 'dist';
}

function normalizeFsImportPath(filePath: string): string {
  return `/@fs${filePath.replace(/\\/g, '/')}`;
}

export function renderLiveHtml(clientEntryPath: string): string {
  const clientSrc = normalizeFsImportPath(clientEntryPath);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gizmo Live Session</title>
</head>
<body>
  <script type="module" src="${clientSrc}"></script>
</body>
</html>
`;
}

export function resolveLiveRuntimeDescriptor(
  fromDir = path.dirname(fileURLToPath(import.meta.url)),
): LiveRuntimeDescriptor {
  const candidates: LiveRuntimeDescriptor[] = [
    {
      mode: 'source',
      viteRoot: path.resolve(fromDir, '../../engine'),
      clientEntryPath: path.resolve(fromDir, 'liveClient.ts'),
    },
    {
      mode: 'dist',
      viteRoot: path.resolve(fromDir),
      clientEntryPath: path.resolve(fromDir, 'liveClient.js'),
    },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.clientEntryPath)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate live runtime assets from '${fromDir}'.`);
}
