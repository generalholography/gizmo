# Embedding the Engine

Use `@gizmo3d/engine` when an application needs to own the browser canvas and
start Gizmo directly.

## Install

```bash
npm install @gizmo3d/engine
```

## Start a Runtime

```ts
import { EngineMode, startEngine } from '@gizmo3d/engine';

const canvas = document.querySelector<HTMLCanvasElement>('#world');

if (!canvas) {
  throw new Error('Missing #world canvas');
}

const engine = startEngine(canvas, {
  mode: EngineMode.DISPLAY,
});
```

## Choose a Mode

- `EngineMode.GAME`: gameplay runtime with player controls and simulation.
- `EngineMode.DISPLAY`: view-only scene presentation.
- `EngineMode.EDITOR`: editor-facing runtime with selection and editing tools.

## Runtime Ownership

The embedding application owns:

- the canvas element
- page layout and app shell
- any app-level routing
- persistence outside Gizmo world serialization
- serving browser runtime artifacts when dynamic world loading is needed

The engine owns:

- scene/runtime state
- component and module registries
- world initialization and serialization
- editor command execution
- automation command/resource behavior

## Related Docs

- [Engine overview](./overview.md)
- [World definitions](./world-definitions.md)
- [Browser runtime](./browser-runtime.md)
- [Security](../security.md)
