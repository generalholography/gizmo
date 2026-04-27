---
name: gizmo-world-builder
description: Create, inspect, modify, and validate Gizmo worlds using the gizmo CLI, live sessions, MCP resources, automation commands, camera control, and screenshots. Use when working on Gizmo world files or agent-assisted scene editing.
license: MIT
compatibility: Requires the gizmo CLI and a trusted local workspace.
---

# Gizmo World Builder

Use this skill when creating or editing Gizmo worlds through the CLI or MCP.

## Safety

Only run Gizmo against trusted workspaces and world files. JavaScript/MJS worlds
and persisted runtime module factories can execute code.

## Workflow

1. Start or locate a session.
   - New workspace: `mkdir -p ./my-world && cd ./my-world && gizmo start --no-open`
   - Existing workspace: `gizmo start --no-open`
   - Headless file work: `gizmo use /absolute/path/to/world.json`

2. Inspect before mutating.
   - `gizmo resource session-info`
   - `gizmo resource world-state-summary`
   - `gizmo resource entity-list`
   - `gizmo resource component-catalog`
   - `gizmo resource module-type-catalog`

3. Make focused changes.
   - Use `gizmo call <command> --params '<json>'`.
   - Use `stableId` when targeting existing entities.
   - Use batch only when the changes should be one logical operation.

4. Validate.
   - Re-read relevant resources.
   - In live sessions, use `gizmo camera frame-entity <stableId>` when useful.
   - Capture screenshots with `gizmo snapshot` when visual validation matters.

## References

- Agent workflow: `docs/agents/workflow.md`
- MCP setup: `docs/agents/mcp-setup.md`
- Automation commands: `docs/reference/automation-commands.generated.md`
- Automation resources: `docs/reference/automation-resources.generated.md`
- Compact prompt context: `docs/agents/prompt-context.generated.md`
- More detailed world-builder notes: `references/agent-workflow.md`
