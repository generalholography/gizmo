# MCP Client Setup

Use `gizmo mcp` to expose a Gizmo world to an MCP-compatible client.

## Headless World File

```json
{
  "mcpServers": {
    "gizmo": {
      "command": "gizmo",
      "args": ["mcp", "--world", "/absolute/path/to/world.json"]
    }
  }
}
```

## Workspace-Local Config

After:

```bash
gizmo use /absolute/path/to/world.json
```

the MCP args can be:

```json
["mcp"]
```

## Live Session Config

Start:

```bash
gizmo start --no-open --port 0
```

Then use the printed `mcpConfig` for agents running in the same workspace, or
the printed `portableMcpConfig` for agents that need explicit live-server
details.

## Agent Guidance

Agents should:

- read `session-info` and `world-state-summary` first
- use `entity-list` and targeted entity resources for selection
- make small, focused tool calls
- re-read resources after mutations
- use screenshots only from live sessions
