# Agent Workflow

This workflow is intended for MCP-compatible coding agents editing Gizmo worlds.

## Start a Session

```bash
mkdir my-world
cd ./my-world
gizmo start --no-open
```

Use `--no-open` in agent environments. Immediately tell the user the printed
`codex.openInAppBrowserUrl` or `browserUrl` so they can watch if they want, then
continue working without waiting for them to open it. If the environment exposes
an in-app/local browser navigation tool, open the URL there too. In a normal
terminal where the user expects the system browser to open, use `gizmo start`
without `--no-open`.

Attach the agent using the printed MCP config. If the global `gizmo` command is
missing, ask the user before installing `@gizmo3d/cli@latest`, then verify with
`gizmo --version`.

## Inspect Before Editing

Read these resources first:

- `session-info`
- `world-state-summary`
- `entity-list`
- `component-catalog`
- `module-type-catalog`

Use `entity-bundle` for precise entity inspection.

If `session-info` reports that no browser client is attached, continue with
structured edits if possible, but surface the live URL again and wait to run
camera or screenshot workflows until a browser client is attached.

## Make Focused Mutations

Use generated command definitions rather than guessing parameter names:

- [Automation commands](../reference/automation-commands.generated.md)
- [Automation resources](../reference/automation-resources.generated.md)

Prefer stable IDs when targeting entities.

## Validate

After each meaningful change:

1. Re-read relevant resources.
2. If live rendering matters, frame the camera.
3. Capture a screenshot.
4. Summarize exactly what changed.

## Safety

Only work in trusted repositories and world files. Do not open unknown
JavaScript/MJS worlds.
