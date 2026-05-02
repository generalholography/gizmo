# Agent Workflow

This workflow is intended for MCP-compatible coding agents editing Gizmo worlds.

## Start a Session

```bash
mkdir my-world
cd ./my-world
gizmo start --no-open --port 0
```

Use `--no-open --port 0` in agent environments. Immediately tell the user the
printed `codex.openInAppBrowserUrl` or `browserUrl` so they can watch if they
want, then continue working without waiting for them to open it. If the
environment exposes an in-app/local browser navigation tool, open the URL there
once. In a normal terminal where the user expects the system browser to open,
use `gizmo start` without `--no-open`.

Attach the agent using the printed MCP config. If the global `gizmo` command is
missing, ask the user before installing `@gizmo3d/cli@latest`, then verify with
`gizmo --version`.

## Build Before Deep Inspection

For creation tasks, do not front-load catalog reads. Make a meaningful first
edit, then read only the resource needed next, usually `world-state-summary`,
`entity-list`, or a targeted `entity-bundle`.

If no browser client is attached, continue with file-backed edits and wait to
run camera or screenshot workflows until a browser client is attached.

## Make Focused Mutations

Use generated command definitions rather than guessing parameter names:

- [Automation commands](../reference/automation-commands.generated.md)
- [Automation resources](../reference/automation-resources.generated.md)

Prefer stable IDs when targeting entities.

For a complete generated scene, write a full world definition and apply it:

```bash
gizmo apply ./scene.json --world ./world.json
```

## Validate

After each meaningful change:

1. Re-read relevant resources.
2. If live rendering matters, frame the camera.
3. Capture a screenshot.
4. Summarize exactly what changed.

## Safety

Only work in trusted repositories and world files. Do not open unknown
JavaScript/MJS worlds.
