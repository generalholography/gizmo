# CLI Overview

`@gizmo3d/cli` installs the `gizmo` command. It is the recommended entrypoint
for creating worlds, starting live sessions, connecting agents, running
automation commands, and capturing screenshots.

## Install

```bash
npm install -g @gizmo3d/cli
gizmo --help
```

## Command Families

- `gizmo init`: create a world file and workspace session.
- `gizmo use`: save a default world for the current workspace.
- `gizmo dev`: start the recommended live workflow and print browser/MCP setup.
- `gizmo live`: start a lower-level browser-backed live server.
- `gizmo mcp`: start a stdio MCP server.
- `gizmo mcp-config`: print MCP configuration.
- `gizmo call`: execute one automation command.
- `gizmo batch`: execute several automation commands.
- `gizmo resource`: read one automation resource.
- `gizmo camera`: inspect or move the viewport camera.
- `gizmo snapshot`: capture a render screenshot.
- `gizmo commands`: list automation commands.
- `gizmo resources`: list automation resources.
- `gizmo session`: read active live-session summary.
- `gizmo clean`: remove stale run artifacts.

## Target Resolution

The CLI can operate against a headless world file or a live server. It resolves
targets from:

1. explicit `--world` or `--server`
2. environment variables such as `ENGINE_WORLD`
3. `.gizmo/session.json`

`gizmo dev` writes the active live session to `.gizmo/session.json`, so
follow-up commands usually do not need repeated flags.

## JSON Flags

JSON flags accept inline JSON or `@path/to/file.json` depending on the command.

```bash
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
```

## Screenshots and Runs

`gizmo dev` creates an active run under `.gizmo/runs/<run-id>/`. Screenshot
artifacts default to that run's `artifacts/` directory.

## Package README

See [`cli/README.md`](../../cli/README.md) for the package entrypoint and command
examples.
