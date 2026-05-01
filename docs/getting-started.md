# Getting Started

This guide creates a local Gizmo world, starts a live browser-backed session,
adds an entity, reads world state, and captures a screenshot.

## Requirements

- Node.js compatible with the repo and release workflow. The current release
  workflow uses Node.js 24.
- npm.
- A trusted local workspace.

Gizmo can execute JavaScript world files and runtime module factory source. Do
not run these commands against untrusted repositories or world files.

## Install the CLI

```bash
npm install -g @gizmo3d/cli
gizmo --help
```

For coding agents, install the Gizmo skill:

```bash
npx skills add generalholography/gizmo --skill gizmo -a codex -g -y
```

The CLI also exposes installed-version reference docs:

```bash
gizmo docs workflow
gizmo docs command add-entity
gizmo docs component Transform
```

For repo development, use the local workspace instead:

```bash
npm install
npm run build
npm run cli --workspace=cli -- --help
```

## Create and Start a World

```bash
mkdir my-world
cd ./my-world
gizmo start --no-open
```

In an empty folder, `start` creates `world.json`, writes the active target to
`.gizmo/session.json`, starts a local live session, creates a run directory
under `.gizmo/runs/`, and prints browser and MCP connection details.

Open the printed browser URL in a browser, or use the printed MCP config with an
MCP-compatible coding agent.

## Inspect World State

```bash
gizmo resource world-state-summary
gizmo resource entity-list
gizmo resource component-catalog
```

Resources are read-only structured views of the active session.

## Add an Entity

```bash
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
```

Mutating commands in live mode persist the serialized world back to the backing
file.

## Control the Camera

```bash
gizmo camera get
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":4,"z":0}'
```

## Capture a Screenshot

```bash
gizmo snapshot
```

By default, screenshots are written to the active run under
`.gizmo/runs/<run-id>/artifacts/`.

## Next Steps

- Read [Concepts](./concepts.md) for the core model.
- Read [CLI overview](./cli/overview.md) for command families.
- Read [MCP overview](./mcp/overview.md) for agent integrations.
- Read [Engine overview](./engine/overview.md) if you want to embed the runtime.
