# Architecture

Gizmo is split into three public npm packages in one workspace.

```text
@gizmo3d/engine
  Runtime engine, editor APIs, world serialization, automation commands,
  automation resources, and versioned browser runtime bundles.

@gizmo3d/cli
  The `gizmo` executable. Creates worlds, starts live sessions, proxies commands
  and resources, prints MCP config, controls cameras, and captures screenshots.

@gizmo3d/mcp
  MCP server that maps automation commands to tools and automation resources to
  MCP resources/templates.
```

## Engine Layer

The engine owns the world model and runtime behavior. It exposes:

- `startEngine` for browser canvas runtime startup.
- Engine modes for game, display, and editor usage.
- World initialization and serialization APIs.
- Editor command infrastructure.
- Automation command and resource definitions.
- Headless session support.

The engine is the source of truth for command/resource catalogs. CLI and MCP
surfaces should reflect the engine definitions rather than redefining behavior.

## CLI Layer

The CLI provides the user-facing operational workflow:

- `gizmo init` creates world files.
- `gizmo use` saves workspace defaults.
- `gizmo start` starts the recommended live workflow and prints connection info.
- `gizmo call`, `batch`, and `resource` operate against a world file or live
  server.
- `gizmo camera` and `snapshot` operate against live rendering resources.
- `gizmo mcp` starts a stdio MCP server.

The CLI resolves targets in this order:

1. explicit flags such as `--world` or `--server`
2. environment variables such as `GIZMO_WORLD`
3. workspace session config in `.gizmo/session.json`

## MCP Layer

The MCP package adapts engine automation to MCP:

- commands become tools
- static resources become MCP resources
- entity-specific resources become resource templates

The stdio server opens a headless world session by default. The CLI can also
proxy a running live session through MCP.

## Data and Persistence

World definitions are serializable. Mutating automation commands flow through
editor command wrappers and can auto-save depending on session mode.

Live sessions keep a backing world file and serialize changes back after
mutations. Headless sessions operate directly on the world file.

## Browser Runtime Artifacts

The engine package builds versioned browser runtime assets under
`engine/dist/browser/<engine-version>/`. Applications embedding Gizmo can copy a
specific runtime version into their public assets to keep dynamic world loading
compatible with published package versions.

## Design Rule

Public surfaces should use one vocabulary and one source of truth:

- Use engine definitions for commands and resources.
- Use world/component/schema source for world shape references.
- Keep CLI and MCP docs aligned with the engine automation layer.
