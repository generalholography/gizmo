# World Quality Checklist

Use this as a final pass before delivery.

## Composition

- The world has one clear main idea visible from the first camera angle.
- There is a foreground, middle, and background.
- Tall landmarks create a readable silhouette.
- Repeated objects support the concept rather than filling empty space.

## Navigation

- The player or camera has clear open paths.
- Important objects are not hidden behind dense clutter.
- Traversable floors are broad, level, and visually distinct.
- Floating decorative objects are intentional.

## Interaction

- Important entities have `Info.name`.
- If the world has gameplay, there is a simple loop: discover, collect, avoid,
  unlock, score, or reach.
- Rules and triggers use readable names and minimal state.

## Visual Polish

- Use 3-5 material colors, not one monotone palette.
- Add lighting contrast or bright accents near focal points.
- Vary scale and height to avoid a flat diorama.
- Keep decorative density highest near landmarks and lower on paths.

## Validation

Run:

```bash
gizmo run-world-script ./world.world.js --world ./world.json --validate
gizmo eval ./world.json --checks basic,inventory,bounds,intersections,coplanar
```

Fix:

- duplicate stable IDs
- non-finite transforms
- obvious collider overlaps
- coplanar floors/walls that can z-fight
- unsupported floating placement unless intentional
