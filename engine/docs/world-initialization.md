# World Initialization and Serialization

## Overview

The world initialization and serialization system provides a declarative approach to defining and managing world-level resources, similar to how entity spawning works with declarative syntax. This system enables:

- **One-stop initialization** via `initializeWorld()` - the world-level equivalent of `spawn()`
- **State capture and persistence** via `serializeWorld()` - the world-level equivalent of `despawn()`
- **Declarative world definitions** aligned with entity-level syntax
- **Runtime state preservation** for achievements, metrics, and world data

## Quick Start

```typescript
import { initializeWorld, serializeWorld } from '@gizmo3d/engine';

// Define your world declaratively
const myWorld = {
  title: "Adventure Island",
  description: "Explore tropical paradise",
  dimensions: [{
    name: "base",
    gravity: -9.81,
    useDayNightCycle: false,
    sky: { color: "#87ceeb" },
    chunks: []
  }],
  achievements: [{
    name: "Island Explorer",
    description: "Discover 10 locations",
    condition: {
      type: "compare",
      params: {
        operator: "gte",
        left: { type: "metric", params: { metric: "discoveries" } },
        right: { type: "literal", params: { value: 10 } }
      }
    }
  }, {
    name: "Island Cartographer",
    description: "Discover 25 locations",
    condition: {
      type: "compare",
      params: {
        operator: "gte",
        left: { type: "metric", params: { metric: "discoveries" } },
        right: { type: "literal", params: { value: 25 } }
      }
    }
  }]
};

// Initialize the world
initializeWorld(ecsContext, myWorld);

// Later, save the world state
const savedState = serializeWorld(ecsContext, { includeRuntime: true });
```

## Migration from Manual Setup

**Before** (manual resource manipulation):
```javascript
const metadata = getResource('metadata');
metadata.title = 'My World';
metadata.dimensions = [{ name: 'base', gravity: -9.81 }];

const achievements = getResource('achievements');
achievements.set('First', { description: 'Complete task' });
```

**After** (declarative initialization):
```javascript
initializeWorld(ctx, {
  title: 'My World',
  dimensions: [{
    name: 'base',
    gravity: -9.81,
    useDayNightCycle: false,
    sky: { color: '#87ceeb' },
    chunks: []
  }],
  achievements: [
    { name: 'First', description: 'Complete task', condition: { type: 'always', params: {} } }
  ]
});
```

## Best Practices

1. Use declarative definitions for all new worlds
2. Version your save files to handle schema changes
3. Test serialization round-trips
4. Exclude transient entities from serialization
5. Use `merge: true` when layering configurations

## See Full Documentation

For complete API reference, advanced usage patterns, and examples, see the inline JSDoc comments in:
- `src/core/worldSchema.ts` - Type definitions
- `src/core/initializeWorld.ts` - Initialization API
- `src/core/serializeWorld.ts` - Serialization API
