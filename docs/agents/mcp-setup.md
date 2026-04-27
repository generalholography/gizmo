# Agent MCP Setup

Gizmo supports headless and live MCP workflows.

## Headless Setup

```bash
gizmo mcp --world /absolute/path/to/world.json
```

Use this when the agent only needs structured world reads and mutations.

## Live Setup

```bash
gizmo start --no-open
```

Use this when the agent also needs browser rendering, camera control, and
screenshots.

## Config Shape

```json
{
  "mcpServers": {
    "gizmo": {
      "command": "gizmo",
      "args": ["mcp"]
    }
  }
}
```

When using a portable live config, include the explicit `--server` and token
values printed by `gizmo start`.

## Minimum Agent Instructions

An agent should be told:

- inspect resources before mutating
- prefer stable IDs
- keep edits focused
- use screenshots for visual validation in live sessions
- treat tokenized live URLs as secrets
