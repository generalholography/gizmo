# Gizmo Documentation

Gizmo is a local-first toolkit for browser 3D worlds, live editing, CLI
automation, and MCP-compatible agent workflows.

Start here:

- [Getting started](./getting-started.md): create a world, start a live session,
  inspect state, add an entity, and capture a screenshot.
- [Install](./install.md): package installation and local workspace setup.
- [Concepts](./concepts.md): the shared vocabulary used by the engine, CLI, and
  MCP server.
- [Architecture](./architecture.md): how the packages fit together.
- [Examples](./examples.md): included world files and when to use them.
- [Security](./security.md): trusted-workspace model and live-session boundary.
- [Release process](./release-process.md): validation and publishing flow.

Package docs:

- [Engine overview](./engine/overview.md)
- [Engine embedding](./engine/embedding.md)
- [World definitions](./engine/world-definitions.md)
- [Engine automation API](./engine/automation-api.md)
- [Browser runtime](./engine/browser-runtime.md)
- [CLI overview](./cli/overview.md)
- [CLI commands](./cli/commands.md)
- [Live sessions](./cli/live-sessions.md)
- [Screenshots](./cli/screenshots.md)
- [CLI troubleshooting](./cli/troubleshooting.md)
- [MCP overview](./mcp/overview.md)
- [MCP stdio server](./mcp/stdio-server.md)
- [MCP resources](./mcp/resources.md)
- [MCP client setup](./mcp/client-setup.md)
- [Agent workflows](./agents/overview.md)
- [Agent workflow](./agents/workflow.md)
- [Agent MCP setup](./agents/mcp-setup.md)
- [Gizmo Agent Skills](./agents/skills.md)

Generated references:

- [Reference index](./reference/index.md)
- [Automation commands](./reference/automation-commands.generated.md)
- [Automation resources](./reference/automation-resources.generated.md)
- [Agent prompt context](./agents/prompt-context.generated.md)

Package entrypoints:

- [`@gizmo3d/engine`](../engine/README.md)
- [`@gizmo3d/cli`](../cli/README.md)
- [`@gizmo3d/mcp`](../mcp/README.md)

## Public Alpha Stability

The stable public path is the CLI/live/MCP automation flow:

```bash
npm install -g @gizmo3d/cli
mkdir my-world
cd ./my-world
gizmo start --no-open --port 0
```

The engine package exposes runtime, editor, serialization, and automation APIs
for direct integration. During the public alpha, prefer exported entrypoints
from `@gizmo3d/engine` and `@gizmo3d/engine/automation/*` and expect lower-level
engine internals to keep moving faster than the CLI/MCP workflow.
