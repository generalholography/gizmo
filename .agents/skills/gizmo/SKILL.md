---
name: gizmo
description: Use Gizmo to create, inspect, edit, validate, and automate browser 3D worlds with the gizmo CLI, live sessions, MCP, screenshots, component schemas, module authoring, and stable entity IDs. Use when working with Gizmo worlds, setting up agents for Gizmo, or generating 3D scenes through CLI/MCP workflows.
license: Apache-2.0
compatibility: Requires the gizmo CLI and a trusted local workspace.
---

# Gizmo

Use this skill when creating, editing, inspecting, or validating Gizmo worlds
with the `gizmo` CLI or MCP.

## Safety

Only run Gizmo against trusted workspaces and world files. JavaScript/MJS worlds
and persisted runtime module factories can execute code. Live sessions bind to
`127.0.0.1` by default and use a per-session token; treat printed browser URLs,
tokens, and portable MCP configs as local secrets.

## First Run

In an empty folder:

```bash
gizmo start --no-open
```

`start` auto-creates `world.json` when needed, writes `.gizmo/session.json`,
starts a browser-backed live session, creates `.gizmo/runs/<run-id>/`, and
prints browser plus MCP connection details. Open the printed `browserUrl` when
visual feedback is needed.

For headless file work:

```bash
gizmo init ./my-world
cd ./my-world
gizmo use ./world.json
```

## Agent Loop

1. Inspect before mutating:
   - `gizmo resource session-info`
   - `gizmo resource world-state-summary`
   - `gizmo resource entity-list`
   - `gizmo resource component-catalog`
   - `gizmo resource module-type-catalog`
2. Make one focused change:
   - `gizmo call <command> --params '<json>'`
   - `gizmo batch '<json-array>'` only when changes are one logical operation.
3. Re-read relevant resources.
4. For visual work:
   - `gizmo camera frame-entity <stableId>`
   - `gizmo camera set --position '<json>' --look-at '<json>'`
   - `gizmo snapshot`

Use `stableId` as the durable public entity identity. Do not expose runtime
entity IDs as public handles.

## CLI Reference

Use the installed CLI as the source of truth:

```bash
gizmo --help
gizmo docs
gizmo docs workflow
gizmo docs command add-entity
gizmo docs resource entity-bundle
gizmo docs component Transform
gizmo docs module material
gizmo commands
gizmo resources
```

Core commands:

- `gizmo start --no-open`: recommended live workflow; auto-inits in empty folders.
- `gizmo mcp`: start stdio MCP for the active workspace or explicit world.
- `gizmo mcp-config`: print MCP configuration.
- `gizmo resource <name>`: read world/session state.
- `gizmo call <name> --params '<json>'`: mutate the world.
- `gizmo camera get|set|frame-entity`: inspect/control the viewport camera.
- `gizmo snapshot`: capture the live viewport into `.gizmo/runs/.../artifacts`.
- `gizmo docs ...`: read installed-version docs for finer syntax.

Common resources:

- `session-info`, `world-state-summary`, `entity-list`
- `entity-bundle --stable-id <id>`
- `component-catalog`
- `module-type-catalog`, `module-instance-catalog`
- `viewport-camera`
- `render-screenshot`, `entity-render-screenshot --stable-id <id>`

Common mutating commands:

- `add-entity(archetypeOrDef, overrides?)`
- `delete-entity(stableId)`
- `duplicate-entity(stableId, offset?)`
- `set-transform(stableId, transform)`
- `add-component(stableId, componentName, componentData)`
- `modify-component(stableId, componentName, componentData)`
- `modify-body(stableId, body)`
- `insert-body-part(stableId, parentPath, part)`
- `upsert-module-type(moduleName, typeName, factorySource, description?, parameterSchema?)`
- `upsert-module-instance(moduleName, instanceName, definition)`
- `set-viewport-camera(position?, lookAt?, rotation?, fov?)`
- `frame-viewport-entity(stableId, padding?, fov?)`

## MCP

For headless MCP:

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

For live MCP, run `gizmo start --no-open` and use the printed `mcpConfig` in the
same workspace, or `portableMcpConfig` when explicit server/token details are
needed.

## Module Authoring

Inspect first:

```bash
gizmo resource module-type-catalog
gizmo resource module-instance-catalog
gizmo docs modules
gizmo docs module material
```

Register only trusted factory source:

```bash
gizmo call upsert-module-type --params '{"moduleName":"material","typeName":"warmMatte","description":"Solid warm matte material.","parameterSchema":{"type":"object","properties":{"color":{"type":"string"}}},"factorySource":"(params) => ({ type: \"solid\", params: { color: params.color || \"#f2c078\" } })"}'
gizmo call upsert-module-instance --params '{"moduleName":"material","instanceName":"sunlitStucco","definition":{"type":"warmMatte","params":{"color":"#f7e7bf"}}}'
```

Use `gizmo docs component <name>` for component field syntax and `gizmo docs
command <name>` for exact command parameters.

## Troubleshooting

- If commands cannot find a server, rerun `gizmo start --no-open`.
- If a sandbox blocks loopback access, retry with local network permission.
- If screenshots fail, confirm the target is a live session, not headless.
- If explicit `--server` auth fails, use the current token from `gizmo start`.
- If a command shape is unclear, prefer `gizmo docs command <name>` or
  `gizmo commands` over guessing.

## Optional Repo Docs

If the source repo is available, additional docs may exist under `docs/`.
This skill is self-contained so agents can operate when Gizmo was installed from
npm without cloning the source repository.
