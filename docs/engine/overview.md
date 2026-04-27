# Engine Overview

`@gizmo3d/engine` contains the browser runtime, editor APIs, world
initialization and serialization, automation definitions, and browser runtime
artifacts.

Use the engine package when you want to:

- embed a Gizmo world in a browser app
- start the runtime in game, display, or editor mode
- initialize and serialize worlds
- build custom editor UI around the command system
- call automation commands/resources directly from code
- consume versioned browser runtime bundles

## Install

```bash
npm install @gizmo3d/engine
```

## Minimal Runtime

```ts
import { EngineMode, startEngine } from '@gizmo3d/engine';

const canvas = document.querySelector('canvas');

if (!canvas) {
  throw new Error('Missing canvas');
}

const engine = startEngine(canvas, {
  mode: EngineMode.EDITOR,
});
```

## Engine Modes

- `EngineMode.GAME`: gameplay mode with player controls and physics.
- `EngineMode.DISPLAY`: view-only mode with orbit-style viewing.
- `EngineMode.EDITOR`: editing mode with editor controls and selection.

## World APIs

The engine exports world initialization and serialization helpers:

```ts
import { initialize, serializeWorld } from '@gizmo3d/engine';
```

World definitions are the durable interchange format used by the engine, CLI,
and MCP server.

## Automation APIs

Automation entrypoints are exported under `@gizmo3d/engine/automation/*`.

Important source files:

- `engine/src/automation/definitions.ts`: command definitions
- `engine/src/automation/commands.ts`: command execution
- `engine/src/automation/resourceCatalog.ts`: resource definitions
- `engine/src/automation/resources.ts`: resource handlers
- `engine/src/automation/headless.ts`: headless session support

## Browser Runtime Bundles

Package builds emit versioned browser runtime files under
`engine/dist/browser/<engine-version>/`. These artifacts are intended for apps
that need to serve a specific runtime version for dynamic world compatibility.

## Package README

See [`engine/README.md`](../../engine/README.md) for the package entrypoint.

## More Engine Docs

- [Embedding](./embedding.md)
- [World definitions](./world-definitions.md)
- [Automation API](./automation-api.md)
- [Browser runtime](./browser-runtime.md)
