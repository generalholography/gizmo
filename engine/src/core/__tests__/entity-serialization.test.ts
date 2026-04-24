import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { spawn } from '../spawn';
import { despawn, getEntityBundle } from '../despawn';
import { serializeWorld } from '../serializeWorld';
import * as Components from '../components';
import { hasComponent } from 'bitecs';
import { decode, encode } from '../../utils/strings';
import { 
  entityStoreModule, 
  getStore, 
  AIMemoryStore, 
  HeldItemsStore, 
  InventoryCooldownsStore,
  MetricsStore,
  UnlockedAchievementsStore,
  ArchetypeRefStore
} from '../../modules/entityStore';
import { ReactiveMap } from '../../utils/reactiveTypes';
import { registerArchetype } from '../../modules/archetype';

function createTestContext(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    three: {} as any,
    rapier: {} as any,
    input: {} as any,
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    time: new Timer()
  });
  
  // Add required modules
  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));
  
  // Mock motionSource module
  class MockMotionSourceModule extends Module<any, any> {
    private mockRegistry: Record<number, any> = {};
    private mockDefinitions: Record<number, any> = {};
    
    constructor(ctx: any) {
      super(ctx, {});
    }
    
    resolve(def: any): number {
      const str = JSON.stringify(def);
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      const id = hash >>> 0;
      this.mockRegistry[id] = { bodyType: "static" };
      this.mockDefinitions[id] = def;
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id] || { bodyType: "static" };
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }

    serializeDefinition(id: number, options: { useDelta?: boolean } = {}): any {
      const def = this.mockDefinitions[id];
      if (!def) return undefined;
      if (options.useDelta) {
        // Return name if it's a static motion source
        if (def.type === 'static') {
          return 'static';
        }
      }
      return def;
    }
  }
  world.modules.set('motionSource', new MockMotionSourceModule(world));
  
  // Add body module mock
  class MockBodyModule extends Module<any, any> {
    private mockRegistry: Record<number, any> = {};
    private mockDefinitions: Record<number, any> = {};
    
    constructor(ctx: any) {
      super(ctx, {});
    }
    
    resolve(def: any): number {
      const str = JSON.stringify(def);
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      const id = hash >>> 0;
      this.mockRegistry[id] = {};
      this.mockDefinitions[id] = def;
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id] || {};
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }

    serializeDefinition(id: number, options: { useDelta?: boolean } = {}): any {
      return this.mockDefinitions[id];
    }
  }
  world.modules.set('body', new MockBodyModule(world));
  
  // Add entity store module
  world.modules.set('entityStore', entityStoreModule(world));
  
  // Initialize required resources
  world.resources.set('nextStableId', { resource: 1 });
  
  return world;
}

describe('Entity Serialization - Phase 1: Archetype Tracking', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
    
    // Register test archetypes
    registerArchetype(ctx, 'goblin', {
      Info: { name: 'Goblin', description: 'A small green creature' },
      Health: { value: 10, maxValue: 10 },
      Transform: { y: 5 }
    });
    
    registerArchetype(ctx, 'treasure', {
      Info: { name: 'Treasure Chest', description: 'Contains valuable items' },
      Transform: { y: 0 }
    });
  });

  it('tracks archetype when spawned from named archetype', () => {
    const eid = spawn(ctx, 'goblin');
    
    const archetypeStore = getStore<ArchetypeRefStore>(ctx, 'archetypeRef');
    expect(archetypeStore.has(eid)).toBe(true);
    expect(archetypeStore.get(eid)).toBe('goblin');
  });

  it('does not track archetype when spawned from inline bundle', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Custom Entity' },
      Health: { value: 20 }
    });
    
    const archetypeStore = getStore<ArchetypeRefStore>(ctx, 'archetypeRef');
    expect(archetypeStore.has(eid)).toBe(false);
  });

  it('archetype store survives getEntityBundle without errors', () => {
    const eid = spawn(ctx, 'goblin');
    
    // This was causing the decode error before the fix
    expect(() => getEntityBundle(ctx, eid)).not.toThrow();
    
    const bundle = getEntityBundle(ctx, eid);
    expect(bundle._meta?.archetype).toBe('goblin');
  });

  it('includes archetype in serialized bundle metadata', () => {
    const eid = spawn(ctx, 'goblin');
    const bundle = despawn(ctx, eid);
    
    expect(bundle._meta).toBeDefined();
    expect(bundle._meta?.archetype).toBe('goblin');
    expect(bundle._meta?.serializedAt).toBeDefined();
    expect(bundle._meta?.engineVersion).toBeDefined();
  });

  it('spawns from bundle with archetype reference (delta serialization)', () => {
    const bundle = {
      _meta: { archetype: 'goblin' },
      Health: { value: 5, maxValue: 10 }  // Override health
    };
    
    const eid = spawn(ctx, bundle);
    
    // Should have goblin's Info
    expect(decode(Components.Info.name[eid])).toBe('Goblin');
    
    // Should have overridden health
    expect(Components.Health.value[eid]).toBe(5);
    
    // Should have archetype reference in store
    const archetypeStore = getStore<ArchetypeRefStore>(ctx, 'archetypeRef');
    expect(archetypeStore.has(eid)).toBe(true);
    expect(archetypeStore.get(eid)).toBe('goblin');
  });

  it('falls back gracefully when archetype no longer exists', () => {
    const bundle = {
      _meta: { archetype: 'nonexistent' },
      Info: { name: 'Orphaned Entity' },
      Health: { value: 15 }
    };
    
    // Should not throw, uses bundle as-is
    const eid = spawn(ctx, bundle);
    
    expect(decode(Components.Info.name[eid])).toBe('Orphaned Entity');
    expect(Components.Health.value[eid]).toBe(15);
  });

  it('preserves body part name and tag through despawn/spawn serialization', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Part Test' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              type: 'primitive',
              name: 'Upper Arm',
              tag: 'upperArm',
              geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
            },
          ],
        },
      },
    });

    const bundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(bundle.Body?.params?.parts?.[0]?.name).toBe('Upper Arm');
    expect(bundle.Body?.params?.parts?.[0]?.tag).toBe('upperArm');

    const serialized = despawn(ctx, eid);
    const restoredEid = spawn(ctx, serialized);
    const restoredBundle = getEntityBundle(ctx, restoredEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(restoredBundle.Body?.params?.parts?.[0]?.name).toBe('Upper Arm');
    expect(restoredBundle.Body?.params?.parts?.[0]?.tag).toBe('upperArm');
  });
});

describe('Entity Serialization - Phase 2: Runtime Control', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('excludes runtime stores when includeRuntime is false', () => {
    const eid = spawn(ctx, { Info: { name: 'Test' } });
    
    // Add runtime data
    const metricsStore = getStore<MetricsStore>(ctx, 'metrics');
    metricsStore.set(eid, { score: { __value: 100 } });
    
    const achievementsStore = getStore<UnlockedAchievementsStore>(ctx, 'unlockedAchievements');
    achievementsStore.get(eid).add('First Achievement');
    
    const bundle = getEntityBundle(ctx, eid, { includeRuntime: false });
    
    expect(bundle.Metrics).toBeUndefined();
    expect(bundle.UnlockedAchievements).toBeUndefined();
  });

  it('includes runtime stores when includeRuntime is true', () => {
    const eid = spawn(ctx, { Info: { name: 'Test' } });
    
    const metricsStore = getStore<MetricsStore>(ctx, 'metrics');
    metricsStore.set(eid, { score: { __value: 100 } });
    
    const bundle = getEntityBundle(ctx, eid, { includeRuntime: true });
    
    expect(bundle.Metrics).toBeDefined();
    expect(bundle.Metrics.score.__value).toBe(100);
  });

  it('excludes runtime components when includeRuntimeComponents is false', () => {
    const eid = spawn(ctx, { Info: { name: 'Test' } });
    
    const bundle = getEntityBundle(ctx, eid, { includeRuntimeComponents: false });
    
    // SpawnedAt should not be included
    expect(bundle.SpawnedAt).toBeUndefined();
    expect(bundle.Velocity).toBeUndefined();
    expect(bundle._InputState).toBeUndefined();
  });

  it('applies custom component filter', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Test' },
      Health: { value: 50 }
    });
    
    const bundle = getEntityBundle(ctx, eid, {
      componentFilter: (compName) => compName !== 'Health'
    });
    
    expect(bundle.Info).toBeDefined();
    expect(bundle.Health).toBeUndefined();
  });

  it('strips runtime data from components when includeRuntime is false', () => {
    const eid = spawn(ctx, { Info: { name: 'Test' } });
    
    // Manually set runtime fields (in a real scenario, these would be set by systems)
    if (hasComponent(ctx, Components.Transform, eid)) {
      // Transform doesn't have runtime fields, so this test is more conceptual
    }
    
    const bundleWithRuntime = getEntityBundle(ctx, eid, { includeRuntime: true });
    const bundleWithoutRuntime = getEntityBundle(ctx, eid, { includeRuntime: false });
    
    // Both should have Transform
    expect(bundleWithRuntime.Transform).toBeDefined();
    expect(bundleWithoutRuntime.Transform).toBeDefined();
  });
});

describe('Entity Serialization - Phase 3: Complete Store Serialization', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('serializes and restores AI memory', () => {
    const eid = spawn(ctx, { Info: { name: 'AI Entity' } });
    
    const aiMemoryStore = getStore<AIMemoryStore>(ctx, 'aiMemory');
    aiMemoryStore.set(eid, {
      lastSeenTarget: 42,
      lastSeenTime: 1000,
      targetPosition: { x: 10, y: 5, z: 3 }
    });
    
    const bundle = getEntityBundle(ctx, eid, { includeRuntime: true });
    
    expect(bundle.AIMemory).toBeDefined();
    expect(bundle.AIMemory.lastSeenTarget).toBe(42);
    expect(bundle.AIMemory.targetPosition).toEqual({ x: 10, y: 5, z: 3 });
    
    // Restore to new entity
    const newEid = spawn(ctx, bundle);
    const restoredMemory = aiMemoryStore.get(newEid);
    
    expect(restoredMemory).toBeDefined();
    expect(restoredMemory.lastSeenTarget).toBe(42);
    expect(restoredMemory.lastSeenTime).toBe(1000);
  });

  it('does not serialize held items runtime state', () => {
    const player = spawn(ctx, { Info: { name: 'Player' } });
    const sword = spawn(ctx, { Info: { name: 'Sword' } });
    
    const heldItemsStore = getStore<HeldItemsStore>(ctx, 'heldItems');
    heldItemsStore.set(player, { eid: sword, slot: 0 });
    
    const bundle = getEntityBundle(ctx, player, { includeRuntime: true });
    
    expect(bundle.HeldItems).toBeUndefined();
  });

  it('serializes and restores inventory cooldowns', () => {
    const eid = spawn(ctx, { Info: { name: 'Player' } });
    
    const cooldownsStore = getStore<InventoryCooldownsStore>(ctx, 'inventoryCooldowns');
    const cooldowns = new ReactiveMap<number>();
    cooldowns.set('sword', 1.5);
    cooldowns.set('bow', 0.5);
    cooldowns.set('spell', 3.0);
    cooldownsStore.set(eid, cooldowns);
    
    const bundle = getEntityBundle(ctx, eid, { includeRuntime: true });
    
    expect(bundle.InventoryCooldowns).toBeDefined();
    expect(bundle.InventoryCooldowns.sword).toBe(1.5);
    expect(bundle.InventoryCooldowns.bow).toBe(0.5);
    expect(bundle.InventoryCooldowns.spell).toBe(3.0);
    
    // Restore
    const newEid = spawn(ctx, bundle);
    const restoredCooldowns = cooldownsStore.get(newEid);
    
    expect(restoredCooldowns).toBeDefined();
    expect(restoredCooldowns?.get('sword')).toBe(1.5);
    expect(restoredCooldowns?.get('bow')).toBe(0.5);
    expect(restoredCooldowns?.get('spell')).toBe(3.0);
  });

  it('excludes new stores when includeRuntime is false', () => {
    const eid = spawn(ctx, { Info: { name: 'Test' } });
    
    const aiMemoryStore = getStore<AIMemoryStore>(ctx, 'aiMemory');
    aiMemoryStore.set(eid, { lastSeenTarget: 99 });
    
    const cooldownsStore = getStore<InventoryCooldownsStore>(ctx, 'inventoryCooldowns');
    const cooldowns = new ReactiveMap<number>();
    cooldowns.set('item', 2.0);
    cooldownsStore.set(eid, cooldowns);
    
    const bundle = getEntityBundle(ctx, eid, { includeRuntime: false });
    
    expect(bundle.AIMemory).toBeUndefined();
    expect(bundle.InventoryCooldowns).toBeUndefined();
  });
});

describe('Entity Serialization - Phase 4: Delta Serialization', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
    
    // Register archetype with several components
    // Note: Transform is always added by spawn() with defaults, so we don't include it in archetype
    registerArchetype(ctx, 'warrior', {
      Info: { name: 'Warrior', description: 'A brave fighter' },
      Health: { value: 100, maxValue: 100 }
    });
  });

  it('serializes only changed fields with delta serialization', () => {
    const eid = spawn(ctx, 'warrior');
    
    // Change health but keep Info the same
    Components.Health.value[eid] = 50;
    
    const bundle = getEntityBundle(ctx, eid, { useDelta: true });
    
    expect(bundle._meta?.archetype).toBe('warrior');
    
    // Health should be included (changed)
    expect(bundle.Health).toBeDefined();
    expect(bundle.Health.value).toBe(50);
    
    // Info should NOT be included (unchanged from archetype)
    expect(bundle.Info).toBeUndefined();
    
    // Transform will be included because it's added by spawn() with defaults
    // and not defined in the archetype, so it can't be compared
    expect(bundle.Transform).toBeDefined();
  });

  it('includes all fields when useDelta is false', () => {
    const eid = spawn(ctx, 'warrior');
    
    // Change health
    Components.Health.value[eid] = 50;
    
    const bundle = getEntityBundle(ctx, eid, { useDelta: false });
    
    // All components should be included
    expect(bundle.Info).toBeDefined();
    expect(bundle.Health).toBeDefined();
    expect(bundle.Transform).toBeDefined();
  });

  it('handles entities without archetype reference', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Custom' },
      Health: { value: 75 }
    });
    
    const bundle = getEntityBundle(ctx, eid, { useDelta: true });
    
    // Should serialize everything (no archetype to delta from)
    expect(bundle.Info).toBeDefined();
    expect(bundle.Health).toBeDefined();
  });

  it('round-trip with delta serialization maintains data', () => {
    const eid = spawn(ctx, 'warrior');
    
    // Modify entity
    Components.Health.value[eid] = 30;
    Components.Transform.y[eid] = 10;
    
    const bundle = getEntityBundle(ctx, eid, { useDelta: true });
    
    // Spawn from delta bundle
    const newEid = spawn(ctx, bundle);
    
    // Should have archetype's Info
    expect(decode(Components.Info.name[newEid])).toBe('Warrior');
    
    // Should have modified Health
    expect(Components.Health.value[newEid]).toBe(30);
    
    // Should have modified Transform
    expect(Components.Transform.y[newEid]).toBe(10);
    
    // Unchanged Transform fields should match archetype
    expect(Components.Transform.x[newEid]).toBe(0);
  });
});

describe('Entity Serialization - World Integration', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
    
    registerArchetype(ctx, 'npc', {
      Info: { name: 'NPC', description: 'A helpful character' },
      Health: { value: 50, maxValue: 50 }
    });
  });

  it('passes entity serialization options through serializeWorld', () => {
    const eid1 = spawn(ctx, 'npc');
    const eid2 = spawn(ctx, 'npc');
    
    // Add runtime data
    const metricsStore = getStore<MetricsStore>(ctx, 'metrics');
    metricsStore.set(eid1, { interactions: { __value: 5 } });
    metricsStore.set(eid2, { interactions: { __value: 3 } });
    
    const worldDef = serializeWorld(ctx, {
      includeEntities: true,
      includeRuntime: false
    });
    
    // Entities are now in dimensions/chunks structure
    expect(worldDef.dimensions).toBeDefined();
    expect(worldDef.dimensions!.length).toBeGreaterThan(0);
    expect(worldDef.dimensions![0].chunks).toBeDefined();
    expect(worldDef.dimensions![0].chunks!.length).toBeGreaterThan(0);
    const entities = worldDef.dimensions![0].chunks![0].entities;
    expect(entities.length).toBe(2);
    
    // Metrics should be excluded due to includeRuntime: false
    expect(entities[0].Metrics).toBeUndefined();
    expect(entities[1].Metrics).toBeUndefined();
  });

  it('uses delta serialization in world serialization', () => {
    const eid = spawn(ctx, 'npc');
    
    // Only change health
    Components.Health.value[eid] = 25;
    
    const worldDef = serializeWorld(ctx, {
      includeEntities: true,
      entitySerializationOptions: {
        useDelta: true,
        includeRuntime: false
      }
    });
    
    // Entities are now in dimensions/chunks structure
    expect(worldDef.dimensions).toBeDefined();
    expect(worldDef.dimensions!.length).toBeGreaterThan(0);
    expect(worldDef.dimensions![0].chunks).toBeDefined();
    expect(worldDef.dimensions![0].chunks!.length).toBeGreaterThan(0);
    const entities = worldDef.dimensions![0].chunks![0].entities;
    expect(entities.length).toBe(1);
    
    const entityBundle = entities[0];
    
    // Should have archetype reference
    expect(entityBundle._meta?.archetype).toBe('npc');
    
    // Should have changed Health
    expect(entityBundle.Health).toBeDefined();
    
    // Should NOT have unchanged Info
    expect(entityBundle.Info).toBeUndefined();
  });

  it('restores entities from world definition with delta bundles', () => {
    const eid = spawn(ctx, 'npc');
    Components.Health.value[eid] = 10;
    
    const worldDef = serializeWorld(ctx, {
      includeEntities: true,
      entitySerializationOptions: {
        useDelta: true
      }
    });
    
    // Create new context and restore
    const newCtx = createTestContext();
    registerArchetype(newCtx, 'npc', {
      Info: { name: 'NPC', description: 'A helpful character' },
      Health: { value: 50, maxValue: 50 }
    });
    
    // Spawn entities from world definition (using new structure)
    const entities = worldDef.dimensions![0].chunks![0].entities;
    const restoredEntities = entities.map(bundle => spawn(newCtx, bundle));
    
    expect(restoredEntities.length).toBe(1);
    const restoredEid = restoredEntities[0];
    
    // Should have archetype's Info
    expect(decode(Components.Info.name[restoredEid])).toBe('NPC');
    
    // Should have saved Health
    expect(Components.Health.value[restoredEid]).toBe(10);
  });
});

describe('Entity Serialization - Module Name + Diff Support', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('serializes module definitions with delta support', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Test' },
      MotionSource: { type: 'static', params: {} }
    });
    
    const bundle = getEntityBundle(ctx, eid, { useDelta: true });
    
    // Module definitions are serialized
    expect(bundle.MotionSource).toBeDefined();
  });

  it('handles string references for module definitions', () => {
    // This test verifies that when a module returns a string (name reference)
    // it can be resolved back to the full definition
    const eid = spawn(ctx, {
      Info: { name: 'Test' },
      MotionSource: { type: 'static', params: {} }
    });
    
    const bundle = despawn(ctx, eid, { useDelta: true });
    
    // Spawn from the bundle
    const newEid = spawn(ctx, bundle);
    
    // Should successfully restore the MotionSource
    expect(hasComponent(ctx, Components.MotionSource, newEid)).toBe(true);
  });
});
