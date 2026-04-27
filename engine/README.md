# @gizmo3d/engine

`@gizmo3d/engine` is the Gizmo browser/runtime package. It contains the 3D
engine, editor-facing APIs, world initialization and serialization, automation
command/resource definitions, headless automation sessions, and versioned
browser runtime bundles.

Use this package when you want to embed Gizmo in a browser app or build directly
against engine/editor APIs. If you primarily want to create and edit worlds from
the terminal, start with [`@gizmo3d/cli`](../cli/README.md).

## Install

```bash
npm install @gizmo3d/engine
```

## Minimal Browser Runtime

```ts
import { EngineMode, startEngine } from '@gizmo3d/engine';

const canvas = document.querySelector('canvas');

if (!canvas) {
  throw new Error('Missing canvas element');
}

const engine = startEngine(canvas, {
  mode: EngineMode.EDITOR,
});
```

## Engine Modes

```ts
import { EngineMode } from '@gizmo3d/engine';
```

- `EngineMode.GAME`: gameplay mode with player controls and physics simulation.
- `EngineMode.DISPLAY`: view-only mode for presenting scenes.
- `EngineMode.EDITOR`: editing mode with fly controls, selection, transforms,
  and editor UI integration.

## World Initialization and Serialization

```ts
import { initialize, serializeWorld } from '@gizmo3d/engine';
```

World definitions are the durable scene/simulation format shared by the engine,
CLI, and MCP server. A world can include metadata, dimensions, entities,
achievements, module definitions, stores, and runtime-facing configuration.

JavaScript/MJS world scripts can execute code. Only load world scripts from
trusted workspaces. Prefer JSON worlds for data-only interchange.

## Automation APIs

The package exports automation APIs under `@gizmo3d/engine/automation` and
specific subpaths:

- `@gizmo3d/engine/automation`
- `@gizmo3d/engine/automation/world`
- `@gizmo3d/engine/automation/definitions`
- `@gizmo3d/engine/automation/commands`
- `@gizmo3d/engine/automation/resources`
- `@gizmo3d/engine/automation/session`
- `@gizmo3d/engine/automation/headless`

Automation commands are structured operations such as `add-entity`,
`set-transform`, `modify-component`, and `set-viewport-camera`. Automation
resources are read-only views such as `world-state-summary`, `entity-list`,
`component-catalog`, `entity-bundle`, `render-screenshot`, and
`viewport-camera`.

The source of truth for these surfaces is:

- `src/automation/definitions.ts`
- `src/automation/commands.ts`
- `src/automation/resourceCatalog.ts`
- `src/automation/resources.ts`

Generated references:

- [Automation commands](../docs/reference/automation-commands.generated.md)
- [Automation resources](../docs/reference/automation-resources.generated.md)

## Browser Runtime Artifacts

Package builds emit versioned browser runtime artifacts under:

```text
dist/browser/<engine-version>/
```

Applications that load dynamic worlds should serve the runtime version that
matches the package version they target.

## Local Development

From the repo root:

```bash
npm install
npm run build --workspace=engine
npm run test --workspace=engine
```

To build the publishable package artifacts:

```bash
npm run build:package --workspace=engine
```

## Documentation

- [Engine overview](../docs/engine/overview.md)
- [Automation API](../docs/engine/automation-api.md)
- [Concepts](../docs/concepts.md)
- [Architecture](../docs/architecture.md)
- [Examples](../docs/examples.md)
- [Security](../SECURITY.md)

## License

MIT
