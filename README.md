# Gizmo

This is the public automation monorepo for Gizmo, maintained by
generalholography. It contains:

- `@gizmo3d/engine`: the runtime engine, automation APIs, browser runtime bundle, and tests.
- `@gizmo3d/mcp`: the MCP server for engine automation.
- `@gizmo3d/cli`: the `gizmo` command-line tool.

The packages publish under the `@gizmo3d` npm scope. The CLI installs
the `gizmo` command.

## Validate

```bash
npm install
npm run build
npm test
npm run validate
npm run pack:dry-run
```

## Release Shape

The engine package owns browser runtime artifacts at
`engine/dist/browser/<engine-version>/`. Private applications should consume
published packages and copy selected runtime versions into their own public asset
trees for dynamic world compatibility.
