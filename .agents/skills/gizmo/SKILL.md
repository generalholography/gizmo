---
name: gizmo
description: Use Gizmo to create, inspect, edit, validate, and automate browser 3D worlds with the gizmo CLI, live sessions, MCP, screenshots, component schemas, module authoring, and stable entity IDs. Use when working with Gizmo worlds, setting up agents for Gizmo, or generating 3D scenes through CLI/MCP workflows.
license: Apache-2.0
compatibility: Requires the gizmo CLI and a trusted local workspace.
---

# Gizmo

Use this skill when creating, editing, inspecting, or validating Gizmo worlds
with the `gizmo` CLI or MCP. For visual creation tasks, optimize for fast first
edits: start the live session, show the user the URL, then build immediately.

## Safety

Only run Gizmo against trusted workspaces and world files. JavaScript/MJS worlds
and persisted runtime module factories can execute code. Live sessions bind to
`127.0.0.1` by default and use a per-session token; treat printed browser URLs,
tokens, and portable MCP configs as local secrets.

## Golden Path For Agents

Assume the `gizmo` CLI is installed globally. Verify when needed:

```bash
gizmo --version
```

If `gizmo` is missing, ask the user before installing it:

```bash
npm install -g @gizmo3d/cli@latest
```

In an empty folder or task workspace, start the recommended agent workflow:

```bash
gizmo start --no-open --port 0
```

`start` auto-creates `world.json` when needed, writes `.gizmo/session.json`,
starts a browser-backed live session, creates `.gizmo/runs/<run-id>/`, and
prints browser plus MCP connection details.

Immediately tell the user:

```text
Live Gizmo preview: <browserUrl>
I will keep building now; open it if you want to watch.
```

Then continue working. Do not wait for the user to open the link.

Launch rules:

- In agent environments, use `gizmo start --no-open --port 0`.
- Do not use the default port in agent workflows; `--port 0` avoids stale
  session conflicts.
- Do not open a system browser unless the user asked for that. If the current
  environment has an in-app/local browser navigation tool, open the printed URL
  there once; otherwise just report the URL and continue.
- If a live command says no browser client is attached, do not retry in a loop
  and do not open Chrome just to fix it. Keep making file-backed edits with
  `--world ./world.json`; use screenshots only after a browser is attached.
- In a normal human terminal where the user expects Gizmo to open the browser,
  use `gizmo start` without `--no-open`.

For headless file work:

```bash
gizmo init ./my-world
cd ./my-world
gizmo use ./world.json
```

## Agent Loop

For visual creation tasks:

1. Start: `gizmo start --no-open --port 0`.
2. Surface the printed URL to the user and keep going.
3. Build the first meaningful version immediately.
4. Read only the resource you need next, usually `world-state-summary` or
   `entity-list`. Do not front-load full catalog discovery unless blocked.
5. Iterate in small, named passes.
6. Once a browser is attached, validate visually with camera moves and snapshots.
7. At the end of a temporary live task, run `gizmo stop`.

Fast build options:

- For a complete generated scene, write a full world definition JSON and run:

  ```bash
  gizmo apply ./scene.json --world ./world.json
  ```

- For live sessions with an attached browser, `gizmo apply ./scene.json` updates
  the visible world.
- For procedural worlds in trusted workspaces, prefer the dedicated
  `gizmo-worldscript` skill and run:

  ```bash
  gizmo run-world-script ./world.world.js --world ./world.json --validate
  ```

  Expose script execution through MCP/live only when the user explicitly opts in
  with `--allow-world-scripts`.
- For incremental edits, use `gizmo call <command> --params '<json>'`.
- For a logical group of incremental edits, use `gizmo batch @calls.json`.
- Avoid using `reinitialize-world` directly unless `gizmo docs command
  reinitialize-world` shows that it is the exact installed-version behavior you
  need. Prefer `gizmo apply` for whole-world replacement.

Visual validation:

```bash
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":2,"z":0}'
gizmo snapshot --prefix check
```

Only use camera/snapshot commands after a browser client is attached.

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

- `gizmo start --no-open --port 0`: recommended agent workflow; auto-inits in empty folders.
- `gizmo mcp`: start stdio MCP for the active workspace or explicit world.
- `gizmo mcp-config`: print MCP configuration.
- `gizmo resource <name>`: read world/session state.
- `gizmo call <name> --params '<json>'`: mutate the world.
- `gizmo batch @calls.json`: run a logical batch of incremental edits.
- `gizmo apply ./scene.json`: apply a complete world definition.
- `gizmo camera get|set|frame-entity`: inspect/control the viewport camera.
- `gizmo snapshot`: capture the live viewport into `.gizmo/runs/.../artifacts`.
- `gizmo docs ...`: read installed-version docs for finer syntax.
- `gizmo stop`: stop the active live server and clear local session state.

Live editor persistence:

- Manual editor saves write the visible browser world back to `world.json`.
  Prefer the toolbar Save button or `Ctrl+S`/`Cmd+S` after user-driven edits.
- Live editor exports are written to `.gizmo/runs/<run-id>/artifacts/` instead
  of relying on browser downloads. Use this path when an embedded browser, such
  as Codex's in-app browser, blocks downloads.
- When the user is done with the session, run `gizmo stop`. It preserves
  artifacts; use `gizmo clean` later for stale run cleanup.

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

<!-- BEGIN GENERATED GIZMO REFERENCE -->
<!-- Generated by scripts/generate-skill.mjs. Do not edit this block by hand. -->

## Embedded Engine Reference

This block is generated from the installed engine automation catalogs so the
skill remains useful when the source repo docs are not on disk. Use it for
common shapes, then use `gizmo docs ...` for exact installed-version detail.

### Automation Commands

- `add-entity(archetypeOrDef, overrides?)`: Spawn a new entity from an archetype or bundle. (changes state; persists world)
- `delete-entity(stableId)`: Delete an entity by its stable ID. (changes state; persists world)
- `duplicate-entity(stableId, offset?)`: Duplicate an entity with an optional offset. (changes state; persists world)
- `set-transform(stableId, transform)`: Set an entity transform (position/rotation/scale). (changes state; persists world)
- `add-component(stableId, componentName, componentData)`: Add a component to an entity. (changes state; persists world)
- `remove-component(stableId, componentName)`: Remove a component from an entity. (changes state; persists world)
- `modify-component(stableId, componentName, componentData)`: Modify an existing component on an entity. (changes state; persists world)
- `modify-body(stableId, body)`: Modify an entity body definition. (changes state; persists world)
- `insert-body-part(stableId, parentPath, part)`: Insert a new body part into a composite body. (changes state; persists world)
- `add-body-part(stableId, archetype, localPosition)`: Append a new body part to a composite body. (changes state; persists world)
- `set-body-part-transform(stableId, path, transform)`: Set a body part transform. (changes state; persists world)
- `reinitialize-world(definition)`: Reinitialize the world (respawn entities). (changes state; persists world)
- `run-world-script(source?, path?, validate?)`: Execute a trusted JavaScript world script and replace the current world. (changes state; persists world)
- `modify-world-settings(settings)`: Update world-level settings. (changes state; persists world)
- `upsert-module-type(moduleName, typeName, factorySource, description?, parameterSchema?)`: Register or replace a persisted runtime module type backed by factory source. (changes state; persists world)
- `remove-module-type(moduleName, typeName)`: Remove a persisted runtime module type. (changes state; persists world)
- `upsert-module-instance(moduleName, instanceName, definition)`: Register or replace a named module instance. (changes state; persists world)
- `remove-module-instance(moduleName, instanceName)`: Remove a named module instance. (changes state; persists world)
- `set-viewport-camera(position?, lookAt?, rotation?, fov?)`: Set the current viewport camera pose. (changes state)
- `frame-viewport-entity(stableId, padding?, fov?)`: Move the viewport camera to frame one entity by stable ID. (changes state)

### Automation Resources

- `session-info`: Information about the active automation session and backing world file. params: none
- `world-state-summary`: High-level summary of world entities and metadata. params: none
- `component-catalog`: Registered component schemas with structural metadata. params: none
- `module-type-catalog`: Registered runtime module types, including persisted custom factories. params: none
- `module-instance-catalog`: Named module instances across all modules. params: none
- `entity-list`: List of all entities with basic info. params: none
- `selected-entities-full`: Selected entities with IDs and full definitions. params: none
- `selected-body-parts-full`: Selected body parts with IDs and full entity definitions. params: none
- `metadata`: World metadata (title, description, dimensions). params: none
- `achievements`: List of all achievements. params: none
- `full-world-state`: Complete serialized world state. params: none
- `scene-evaluation`: Deterministic scene validation and evaluation report for loadability, inventory, bounds, intersections, and coplanar z-fighting risk. params: none
- `entity-bundle`: Get a full entity bundle by stable ID. params: stableId
- `render-screenshot`: Capture a screenshot of the full world viewport. params: none
- `viewport-camera`: Current viewport camera pose and framing direction. params: none
- `entity-render-screenshot`: Capture a screenshot focused on a single entity by stable ID. params: stableId

### High-Value Command Examples

Add a cube:

```bash
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
```

Add an inline entity definition:

```bash
gizmo call add-entity --params '{"archetypeOrDef":{"definition":{"Transform":{"position":{"x":0,"y":1,"z":0},"scale":{"x":2,"y":0.5,"z":2}},"Renderable":{"body":{"type":"box","size":{"x":2,"y":0.5,"z":2}}}},"archetype":"platform"}}'
```

Move an entity by stable ID:

```bash
gizmo call set-transform --params '{"stableId":12,"transform":{"position":{"x":2,"y":1,"z":0}}}'
```

Modify a component after checking its schema:

```bash
gizmo docs component Transform
gizmo call modify-component --params '{"stableId":12,"componentName":"Transform","componentData":{"position":{"x":0,"y":2,"z":0}}}'
```

Frame and capture visual output:

```bash
gizmo camera frame-entity 12
gizmo snapshot --prefix entity-12
```

Batch one logical operation:

```bash
gizmo batch '[{"name":"add-entity","params":{"archetypeOrDef":"cube"}},{"name":"add-entity","params":{"archetypeOrDef":"sphere","overrides":{"Transform":{"position":{"x":2,"y":1,"z":0}}}}}]'
```

### Component And Body Authoring Notes

- Components are keyed by component name in entity definitions.
- Always inspect `gizmo resource component-catalog` or `gizmo docs component <name>` before using unfamiliar component fields.
- Common transform fields are `position`, `rotation`, and `scale` with `{ "x", "y", "z" }` numeric objects.
- Body definitions are nested objects used by renderable/composite entities. Use `modify-body`, `insert-body-part`, `add-body-part`, and `set-body-part-transform` for structural body edits.
- Prefer small edits followed by `entity-bundle --stable-id <id>` so mistakes are easy to spot.

### Visual Iteration Pattern

1. Start with `gizmo start --no-open --port 0`, surface the live URL, and keep working.
2. Make a meaningful first build immediately; do not wait for browser attachment.
3. If no browser is attached, continue with file-backed edits such as `gizmo apply ./scene.json --world ./world.json`.
4. Once a browser is attached, move the camera with `frame-entity` or `camera set`.
5. Capture `gizmo snapshot` and compare against the user request.
6. Repeat from another camera angle for spatial work.

<!-- END GENERATED GIZMO REFERENCE -->

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

For live MCP, run `gizmo start --no-open --port 0` and use the printed
`mcpConfig` in the same workspace, or `portableMcpConfig` when explicit
server/token details are needed.

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

- If `gizmo` is not found, ask before running `npm install -g
  @gizmo3d/cli@latest`, then verify with `gizmo --version`.
- If commands cannot find a server, rerun `gizmo start --no-open --port 0`.
- If live commands say no browser client is attached, surface the printed
  `browserUrl` or `codex.openInAppBrowserUrl`, open it yourself only if your
  environment has a browser tool, and retry visual-only operations after a
  browser attaches.
- If a sandbox blocks loopback access, retry with local network permission.
- If screenshots fail, confirm the target is a live session, not headless.
- If explicit `--server` auth fails, use the current token from `gizmo start`.
- If a command shape is unclear, prefer `gizmo docs command <name>` or
  `gizmo commands` over guessing.

## Optional Repo Docs

If the source repo is available, additional docs may exist under `docs/`.
This skill is self-contained so agents can operate when Gizmo was installed from
npm without cloning the source repository.
