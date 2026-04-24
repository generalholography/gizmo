# vibe shell
this is a simple starter repo that demonstrates a working three.js + rapier game engine.
it is intended as a starting point for coding agent game implementation

## CLI

The dedicated [cli package](../cli/README.md) now owns `gizmo` for both headless file editing and browser-backed live sessions.

Common workflows:

```bash
# Start the recommended one-command local agent workflow
gizmo dev ./world.json

# Save a default world once for this workspace
gizmo use /absolute/path/to/world.json

# Start stdio MCP against a local world file
gizmo --help
gizmo mcp

# Start a live browser-backed session
gizmo live

# Print MCP config for a saved world or live server
gizmo mcp-config

# Inspect or move the active viewport camera
gizmo camera get
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":4,"z":0}'
```

Installed product flow:

```bash
npm install -g ./dist
gizmo dev ./world.json
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo snapshot --output /tmp/world.png
```

You can also package the distributable CLI/runtime bundle from `cli/dist`:

```bash
npm run pack:dist --workspace=cli
npm run validate --workspace=cli
```

Browser runtime bundles are versioned engine artifacts. Build them into the
engine-owned output tree, then sync them into the private web app only when
validating or deploying that app:

```bash
npm run build:package --workspace=engine
npm run sync:engine-assets
```

Full CLI docs: [cli/README.md](../cli/README.md)

## Engine Modes

The engine supports three modes:

### Game Mode (default)
Normal gameplay mode with player controls and full physics simulation.

```ts
import { startEngine, EngineMode } from '@gizmo3d/engine';

const engine = startEngine(canvas, { mode: EngineMode.GAME });
```

### Display Mode
View-only mode with orbit controls, no player spawning. Useful for showcasing scenes.

```ts
const engine = startEngine(canvas, { mode: EngineMode.DISPLAY });
```

### Editor Mode
Scene editing mode with fly controls and entity manipulation.

```ts
const engine = startEngine(canvas, { mode: EngineMode.EDITOR });
```

#### Editor Controls:
- **WASD**: Move camera (relative to camera XZ plane)
- **E**: Move up (relative to camera Y)
- **Q**: Move down (relative to camera Y)
- **Right Click + Drag**: Rotate camera (pitch and yaw, no roll)
- **Left Click**: Select/deselect entity
- **J**: Translate mode
- **K**: Rotate mode
- **L**: Scale mode
- **X**: Toggle local/world space
- **Shift (hold)**: Enable snapping (translation: 1 unit, rotation: 45°, scale: 0.5)

#### Editor Features:
- No player spawning
- Physics objects exist but don't simulate
- Entity selection with visual transform gizmo
- Real-time entity bundle viewing
- Copy entity definition to clipboard
- Export entire scene to JavaScript file

## Extending Modules
New field, collider, mesh, or material types can be added with `registerType` on each module:

```ts
import { registerMeshType } from "./modules/mesh";

registerMeshType("myShape", params => {
  // return a THREE.BufferGeometry
});
```
