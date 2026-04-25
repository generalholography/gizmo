# Examples

Example worlds live in `engine/src/worlds`. They are useful both as manual
fixtures and as references for world definitions, components, modules, and
behavior patterns.

## Starter and Utility Worlds

- `blank-world.js`: minimal world for clean testing.
- `starter-game.js`: starter gameplay-oriented world.
- `editor-test-world.js`: broad editor/runtime test content.
- `live-cli-demo.json`: data-only world for CLI/live-session workflows.
- `example-declarative.js`: declarative world definition example.
- `render-scene.js`: rendering-focused scene.

## Scene Examples

- `city.js`
- `farmstead.js`
- `forest-spawner-demo.js`
- `kingdom.js`
- `mars.js`
- `renaissance.js`
- `town-builder.js`
- `wilderness.js`
- `arctic-outpost.js`
- `christmas-wonderland.js`

## Gameplay Examples

- `dungeon-crawler.js`
- `dropper.js`
- `golf.js`
- `soccer.js`
- `space-battle.js`
- `zombie.js`

## Systems and Runtime Examples

- `asset-wedge-demo-world.js`
- `geometry-playground-world.js`
- `military-spawner-demo.js`
- `runtime-module-type-demo.json`
- `runtime-module-type-script-demo.js`
- `store-rule-demo-world.js`

Spawner-focused examples live under `engine/src/worlds/spawners`:

- `spawner-demo.js`
- `spawner-trigger-test-world.js`
- `enchanted-forest.js`
- `race-track.js`
- `village-spawner-demo.js`
- `wave-spawner-demo.js`

## Running an Example

From the repo root after building:

```bash
npm run cli --workspace=cli -- dev ./engine/src/worlds/live-cli-demo.json --no-open
```

Or with an installed CLI:

```bash
gizmo dev /absolute/path/to/world.json --no-open
```

For JavaScript examples, remember that world scripts execute code. Only run
world scripts from trusted repositories.
