# Install

Gizmo publishes three public packages under the `@gizmo3d` npm scope.

## CLI

Most users should start with the CLI:

```bash
npm install -g @gizmo3d/cli
gizmo --help
```

The CLI installs the `gizmo` executable and includes the live-session browser
bundle needed by `gizmo dev` and `gizmo live`.

## Engine

Install the engine when embedding Gizmo in a browser app or building directly
against runtime/editor APIs:

```bash
npm install @gizmo3d/engine
```

```ts
import { EngineMode, startEngine } from '@gizmo3d/engine';
```

## MCP

Install the MCP package when embedding or running the MCP server directly:

```bash
npm install @gizmo3d/mcp
```

Most users can use MCP through the CLI:

```bash
gizmo mcp --world /absolute/path/to/world.json
```

## Local Repo Development

```bash
git clone <repo-url>
cd gizmo
npm install
npm run build
npm test
npm run validate
```

The root workspace is private; the publishable packages are `engine`, `cli`, and
`mcp`.

## Global Binary Troubleshooting

If `gizmo --help` does not show the expected commands, your shell may be finding
an older binary:

```bash
which gizmo
npm prefix -g
gizmo --help
```

Reinstall `@gizmo3d/cli` into the active npm prefix or remove the older binary
from your `PATH`.
