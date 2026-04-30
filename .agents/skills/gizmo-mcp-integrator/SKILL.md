---
name: gizmo-mcp-integrator
description: Configure MCP-compatible coding agents such as Codex, Claude Code, and others to use Gizmo through gizmo mcp or gizmo start. Use when setting up MCP config, live-session proxying, or agent access to Gizmo automation tools/resources.
license: Apache-2.0
compatibility: Requires the gizmo CLI and an MCP-compatible agent.
---

# Gizmo MCP Integrator

Use this skill when configuring agents to inspect and edit Gizmo worlds through
MCP.

## Safety

The MCP server can expose mutating tools. Only connect trusted MCP clients to
trusted world files and workspaces. JavaScript/MJS worlds can execute code.

## Headless Config

For a specific world file:

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

For a workspace after `gizmo use /absolute/path/to/world.json`:

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

## Live Config

Run:

```bash
gizmo start --no-open
```

Use the printed workspace-local `mcpConfig` for agents running in the same
workspace. Use `portableMcpConfig` only when explicit server/token details are
needed.

## Agent Operating Guidance

Agents should read resources before mutating:

- `session-info`
- `world-state-summary`
- `entity-list`
- `component-catalog`
- `module-type-catalog`

Then use generated automation commands as tools.

## References

- MCP overview: `docs/mcp/overview.md`
- Stdio server: `docs/mcp/stdio-server.md`
- Client setup: `docs/mcp/client-setup.md`
- Resources: `docs/mcp/resources.md`
- Agent MCP setup: `docs/agents/mcp-setup.md`
- Automation commands: `docs/reference/automation-commands.generated.md`
- Automation resources: `docs/reference/automation-resources.generated.md`
