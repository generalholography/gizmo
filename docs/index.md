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
- [CLI overview](./cli/overview.md)
- [MCP overview](./mcp/overview.md)
- [Agent workflows](./agents/overview.md)

Package entrypoints:

- [`@gizmo3d/engine`](../engine/README.md)
- [`@gizmo3d/cli`](../cli/README.md)
- [`@gizmo3d/mcp`](../mcp/README.md)

## Current Stability Notes

The packages are structured for public publishing and local production use, but
the documentation surface is still being expanded. The stable public path today
is the CLI/live/MCP automation flow:

```bash
npm install -g @gizmo3d/cli
gizmo init ./my-world
cd ./my-world
gizmo dev --no-open
```

The engine package also exposes runtime, editor, serialization, and automation
APIs for direct integration. When using lower-level engine APIs, prefer exported
entrypoints from `@gizmo3d/engine` and `@gizmo3d/engine/automation/*`.
