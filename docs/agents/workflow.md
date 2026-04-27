# Agent Workflow

This workflow is intended for MCP-compatible coding agents editing Gizmo worlds.

## Start a Session

```bash
gizmo init ./my-world
cd ./my-world
gizmo start --no-open
```

Attach the agent using the printed MCP config.

## Inspect Before Editing

Read these resources first:

- `session-info`
- `world-state-summary`
- `entity-list`
- `component-catalog`
- `module-type-catalog`

Use `entity-bundle` for precise entity inspection.

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
