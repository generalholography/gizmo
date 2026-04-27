# Stdio Server

The Gizmo MCP stdio server opens an automation session and exposes engine
commands and resources to an MCP-compatible client.

## Start with the CLI

```bash
gizmo mcp --world /absolute/path/to/world.json
```

If the workspace has `.gizmo/session.json`:

```bash
gizmo mcp
```

## Generic MCP Config

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

## Live Proxy

`gizmo start` prints MCP configs for the active live session. Use the workspace
config when the agent runs in the same workspace; use the portable config when
the agent needs explicit server details.

## Auto-Save

Mutating tools persist changes to the backing world file by default unless the
server/session is configured otherwise.

## Security

Only connect trusted MCP clients to trusted workspaces. JavaScript/MJS worlds
can execute code when opened.
