# @gizmo3d/mcp

`@gizmo3d/mcp` exposes Gizmo automation through the Model Context Protocol. It
maps engine automation commands to MCP tools and automation resources to MCP
resources/resource templates.

Most users should start MCP through the CLI:

```bash
npm install -g @gizmo3d/cli
gizmo mcp --world /absolute/path/to/world.json
```

Use this package directly when you want to embed or customize the MCP server.

## Install

```bash
npm install @gizmo3d/mcp
```

## CLI Usage

Generic MCP config:

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

If the current workspace already has `.gizmo/session.json`, the args can be:

```json
["mcp"]
```

`gizmo start` prints ready-to-use MCP configs for live sessions.

## Library Usage

The package exports:

- `createAutomationMcpServer`
- resource URI helpers
- argument parsing helpers
- stdio server helpers

```ts
import { createAutomationMcpServer } from '@gizmo3d/mcp';
```

The stdio server opens a Gizmo automation session and exposes world resources
and mutating tools to the connected MCP client.

## Resources and Tools

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

Tools are generated from engine automation command definitions such as
`add-entity`, `delete-entity`, `set-transform`, `modify-component`,
`reinitialize-world`, and viewport camera commands.

Generated references:

- [Automation commands](../docs/reference/automation-commands.generated.md)
- [Automation resources](../docs/reference/automation-resources.generated.md)

## Security

The MCP server can read and mutate world files. JavaScript/MJS world files can
execute code. Only attach MCP clients you trust to workspaces and world files
you trust.

Read [SECURITY.md](../SECURITY.md) before exposing live sessions or opening
unknown world files.

## Local Development

From the repo root:

```bash
npm run build --workspace=mcp
npm run test --workspace=mcp
```

## Documentation

- [MCP overview](../docs/mcp/overview.md)
- [MCP resources](../docs/mcp/resources.md)
- [MCP client setup](../docs/mcp/client-setup.md)
- [Agent workflows](../docs/agents/overview.md)
- [CLI overview](../docs/cli/overview.md)
- [Security](../SECURITY.md)

## License

MIT
