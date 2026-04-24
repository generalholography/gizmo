import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.resolve(__dirname, '..');
const sourcePackagePath = path.join(cliRoot, 'package.json');
const distDir = path.join(cliRoot, 'dist');
const distPackagePath = path.join(distDir, 'package.json');

const sourcePackage = JSON.parse(await fs.readFile(sourcePackagePath, 'utf8'));

const distPackage = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  description: 'Gizmo CLI for the AI game engine.',
  type: 'module',
  bin: {
    gizmo: './main.js',
  },
  files: [
    'LICENSE',
    'README.md',
    'main.js',
    'liveClient.js',
    'public',
  ],
  keywords: ['game-engine', 'cli', 'mcp', 'editor', 'ai'],
  license: 'MIT',
  repository: {
    type: 'git',
    url: 'https://github.com/generalholography/gizmo.git',
    directory: 'cli',
  },
  homepage: 'https://github.com/generalholography/gizmo',
  bugs: {
    url: 'https://github.com/generalholography/gizmo/issues',
  },
  engines: {
    node: '>=20',
  },
  dependencies: {
    vite: sourcePackage.dependencies.vite,
  },
};

await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(distPackagePath, JSON.stringify(distPackage, null, 2) + '\n', 'utf8');
