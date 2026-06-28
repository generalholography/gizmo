---
name: gizmo-worldscript
description: Generate high-quality Gizmo JavaScript/MJS world scripts for creating complete browser 3D worlds from scratch or procedurally expanding a world. Use when the user asks to create a Gizmo world, write setupScene(api), author a worldscript, build a procedural scene, add gameplay via script, or prefer worldscript syntax over low-level MCP/CLI commands.
license: Apache-2.0
compatibility: Requires the gizmo CLI and a trusted local workspace.
---

# Gizmo WorldScript

Use JavaScript world scripts when creating a coherent world from scratch,
especially when repetition, layout helpers, reusable archetypes, procedural
placement, or gameplay wiring would be awkward as raw JSON.

World scripts execute trusted local JavaScript. Only run or author them inside
trusted workspaces.

## Workflow

1. Start from a script file such as `world.world.js`; use
   `assets/starter-world.js` as a compact template when helpful.
2. Read `references/worldscript-api.md` before authoring component shapes; it is
   generated from the engine API and includes the valid composite `Body` pattern.
3. Build in layers: metadata, materials/archetypes, terrain/floors, landmarks,
   interactables, lighting/camera/player, then optional rules.
4. Prefer small helper functions over giant repeated entity literals.
5. Run with:

   ```bash
   gizmo run-world-script ./world.world.js --world ./world.json --validate
   ```

6. For live/agent sessions that need MCP access to script execution, start with:

   ```bash
   gizmo start --no-open --port 0 --allow-world-scripts
   ```

7. Validate visually with camera moves and snapshots after the script loads.

## References

Read only what you need:

- `references/worldscript-api.md`: exact `setupScene(api)` shape and useful API calls.
- `references/component-schema.md`: generated installed-version component/body schema.
- `references/examples.md`: generated complete game scripts and gameplay patterns.
- `references/world-quality.md`: opinionated checklist for making worlds feel good.

## Style Rules

- Give the world a memorable title, description, and strong first-view concept.
- Make scale readable: one clear ground plane, landmarks at different heights,
  and paths wide enough for a player.
- Use names on important entities so `entity-list` and screenshots are useful.
- Use loops for repeated objects, but vary color, size, rotation, or placement.
- Put repeated bundles behind helpers such as `makeCrate`, `spawnRing`, or
  `spawnLampPost`.
- Prefer JSON-like bundles inside the script; avoid clever JavaScript that hides
  the scene structure.
- Finish with `gizmo eval` or `gizmo run-world-script --validate`; fix overlaps,
  floating objects, and obvious z-fighting.

## Minimal Shape

```js
export default {
  setupScene(api) {
    api.initialize({
      title: 'Lantern Harbor',
      description: 'A small playable harbor scene with warm lights and clear landmarks.',
      entities: [
        {
          Info: { name: 'Stone Pier' },
          Transform: { x: 0, y: 0, z: 0 },
          Body: {
            type: 'composite',
            params: {
              parts: [{
                geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.5, lengthZ: 3 } },
                material: { type: 'solid', params: { color: '#6f7f8f' } }
              }]
            }
          },
          MotionSource: { type: 'static', params: {} }
        }
      ]
    }, { merge: false, spawnEntities: true });
  }
};
```
