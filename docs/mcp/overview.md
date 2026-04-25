# MCP Overview

`@gizmo3d/mcp` exposes Gizmo automation through the Model Context Protocol.

The MCP server maps:

- automation commands to MCP tools
- static automation resources to MCP resources
- entity-specific resources to MCP resource templates

Most users can start the server through the CLI:

```bash
gizmo mcp --world /absolute/path/to/world.json
```

If a workspace already has `.gizmo/session.json`, this can be shortened:

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

`gizmo dev` prints workspace-local and portable MCP configs for live sessions.

## Resources

Common resources include:

- `engine://session/info`
- `engine://world/summary`
- `engine://components/catalog`
- `engine://modules/types`
- `engine://modules/instances`
- `engine://entities`
- `engine://entities/{stableId}`
- `engine://render/screenshot`
- `engine://viewport/camera`

Use resources to inspect the current world before mutating it.

## Trust Boundary

The MCP server opens world files and can expose mutating tools. Only attach MCP
clients you trust to workspaces and world files you trust.

## Package README

See [`mcp/README.md`](../../mcp/README.md) for package-level usage.
