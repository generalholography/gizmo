import { describe, it, expect } from 'vitest';
import { applyBundle, spawn } from '../spawn';
import { despawn } from '../despawn';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
import { Inventory } from '../components/Inventory';
import { Transform } from '../components/Transform';
import { Animation } from '../components/Animation';
import { MotionSource } from '../components/MotionSource';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { getStore, InventoryStore } from '../../modules/entityStore';

function ctxWithModules(): ECSContext {
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
  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));
  // Add animation module mock for testing using a proper Module instance
  class MockAnimationModule extends Module<any, any> {
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
      this.mockRegistry[id] = { clips: [] };
      this.mockDefinitions[id] = def;
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id] || { clips: [] };
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }
  }
  world.modules.set('animation', new MockAnimationModule(world));
  // Add motionSource module mock
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
  }
  world.modules.set('motionSource', new MockMotionSourceModule(world));
  world.resources.set('nextStableId', { resource: 1 });
  return world;
}

describe('spawn and despawn', () => {
  it('spawns entity and returns bundle on despawn', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, { Transform: { x: 1 }, Inventory: { size: 1 } });
    expect(Transform.x[eid]).toBe(1);
    expect(Inventory.size[eid]).toBe(1);
    const bundle = despawn(ctx, eid);
    expect(bundle.Transform.x).toBe(1);
    expect(bundle.Inventory.size).toBe(1);
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    expect(invs.has(eid)).toBe(false);
  });

  it('adds a default Transform when missing', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, { Inventory: { size: 1 } });
    expect(Transform.x[eid]).toBe(0);
    expect(Transform.y[eid]).toBe(0);
    expect(Transform.z[eid]).toBe(0);
    const bundle = despawn(ctx, eid);
    expect(bundle.Transform.x).toBe(0);
    expect(bundle.Transform.y).toBe(0);
    expect(bundle.Transform.z).toBe(0);
  });

  it('handles Animation component spawn and despawn', () => {
    const ctx = ctxWithModules();
    const animationDef = {
      clips: [{
        name: "default",
        duration: 2.0,
        tracks: [{
          targetTag: "testBox",
          keyframes: [
            { time: 0.0, position: [0, 0, 0] },
            { time: 1.0, position: [0, 2, 0] },
            { time: 2.0, position: [0, 0, 0] }
          ]
        }]
      }]
    };

    const eid = spawn(ctx, { Animation: animationDef });
    
    // Verify Animation component was added and resolved
    expect(Animation.animationId[eid]).toBeTruthy();
    
    // Verify despawn returns the original Animation definition
    const bundle = despawn(ctx, eid);
    expect(bundle.Animation).toEqual(animationDef);
  });

  it('adds a default static MotionSource when missing', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, { Transform: { x: 1 } });
    
    // Verify MotionSource component was added automatically
    expect(MotionSource.motionSourceId[eid]).toBeTruthy();
    
    // Verify the default MotionSource was properly resolved
    const motionSourceModule = ctx.modules.get('motionSource')!;
    const resolvedMotionSource = motionSourceModule.get(MotionSource.motionSourceId[eid]);
    expect(resolvedMotionSource.bodyType).toBe('static');
    
    // Verify despawn includes the MotionSource
    const bundle = despawn(ctx, eid);
    expect(bundle.MotionSource).toEqual({ type: 'static', params: {} });
  });

  it('persists discoveredBy and pickedUpBy stores through spawn/despawn', () => {
    const ctx = ctxWithModules();
    
    // Spawn an entity
    const eid = spawn(ctx, { Transform: { x: 1 } });
    
    // Add some players to discoveredBy and pickedUpBy
    const discoveredStore = getStore(ctx, 'discoveredBy');
    const pickedUpStore = getStore(ctx, 'pickedUpBy');
    
    discoveredStore.get(eid).add(10);
    discoveredStore.get(eid).add(20);
    pickedUpStore.get(eid).add(30);
    
    // Despawn the entity
    const bundle = despawn(ctx, eid);
    
    // Verify the stores are in the bundle
    expect(bundle.DiscoveredBy).toEqual([10, 20]);
    expect(bundle.PickedUpBy).toEqual([30]);
    
    // Verify cleanup removed the store entries
    expect(discoveredStore.has(eid)).toBe(false);
    expect(pickedUpStore.has(eid)).toBe(false);
    
    // Spawn a new entity from the bundle
    const newEid = spawn(ctx, bundle);
    
    // Verify the stores were restored
    expect(discoveredStore.get(newEid).size).toBe(2);
    expect(discoveredStore.get(newEid).has(10)).toBe(true);
    expect(discoveredStore.get(newEid).has(20)).toBe(true);
    expect(pickedUpStore.get(newEid).size).toBe(1);
    expect(pickedUpStore.get(newEid).has(30)).toBe(true);
  });

  it('handles empty discoveredBy and pickedUpBy stores', () => {
    const ctx = ctxWithModules();
    
    // Spawn an entity without any discovered/pickedUp data
    const eid = spawn(ctx, { Transform: { x: 1 } });
    
    // Despawn the entity
    const bundle = despawn(ctx, eid);
    
    // Verify the stores are not in the bundle when empty
    expect(bundle.DiscoveredBy).toBeUndefined();
    expect(bundle.PickedUpBy).toBeUndefined();
    
    // Spawn a new entity from the bundle
    const newEid = spawn(ctx, bundle);
    
    // Verify new entity has empty stores (lazy initialized)
    const discoveredStore = getStore(ctx, 'discoveredBy');
    const pickedUpStore = getStore(ctx, 'pickedUpBy');
    expect(discoveredStore.get(newEid).size).toBe(0);
    expect(pickedUpStore.get(newEid).size).toBe(0);
  });

  it('serializes and restores Stock and Rules pseudo-components', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, {
      Info: { name: 'StoreRuleEntity', description: 'test' },
      Stock: { health: { current: 9, max: 10, min: 0 } },
      Rules: [
        { trigger: { type: 'event', params: { event: 'interact' } }, actions: [] }
      ],
    } as any);

    const bundle = despawn(ctx, eid);
    expect(bundle.Stock).toEqual({ health: { current: 9, max: 10, min: 0 } });
    expect(Array.isArray(bundle.Rules)).toBe(true);
    expect(bundle.Rules[0].trigger.type).toBe('event');

    const newEid = spawn(ctx, bundle as any);
    const roundTripped = despawn(ctx, newEid);
    expect(roundTripped.Stock.health.current).toBe(9);
    expect(roundTripped.Rules[0].trigger.type).toBe('event');
  });


  it('serializes authoritative Stores alongside legacy compatibility fields', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, {
      Stores: [
        { store: 'inventory', value: { size: 2, selectedItemIndex: 1, items: [] } },
        { store: 'energy', value: { current: 4, max: 8, min: 0 } },
      ],
    } as any);

    const bundle = despawn(ctx, eid);
    expect(Array.isArray(bundle.Stores)).toBe(true);
    expect(bundle.Stores[0].store).toBe('inventory');
    expect(bundle.Stores.some((store: any) => store.store === 'energy' && store.value.current === 4)).toBe(true);
    expect(bundle.Inventory.size).toBe(2);
    expect(bundle.Stock.energy.current).toBe(4);
  });

  it('prefers Stores values over legacy store fields when both are provided', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, {
      Stores: [
        { store: 'health', value: { current: 7, max: 10, min: 0 } },
      ],
      Stock: { health: { current: 1, max: 10, min: 0 } },
    } as any);

    const stockStore = getStore<any>(ctx, 'health');
    expect(stockStore.get(eid).current).toBe(7);
  });

  it('hydrates Inventory component from Stores.inventory so hotbar/held-item systems work', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, {
      Stores: [
        { store: 'inventory', value: { size: 3, selectedItemIndex: 2, items: ['bow'] } },
      ],
    } as any);

    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = inventories.get(eid);

    expect(inv?.size).toBe(3);
    expect(inv?.selected).toBe(2);
    expect(Inventory.size[eid]).toBe(3);
    expect(Inventory.selected[eid]).toBe(2);
  });


  it('does not duplicate rules when Rules pseudo-component is edited repeatedly', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, {
      Info: { name: 'RuleEditEntity', description: 'test' },
      Rules: [{ trigger: { type: 'event', params: { event: 'interact' } }, actions: [] }],
    } as any);

    applyBundle(ctx, eid, {
      Rules: [{ trigger: { type: 'time', params: { delay: 1 } }, actions: [] }],
    } as any);

    applyBundle(ctx, eid, {
      Rules: [{
        trigger: { type: 'interval', params: { interval: 1 } },
        condition: {
          type: 'compare',
          params: {
            operator: 'eq',
            left: { type: 'metric', params: { metric: 'x', subject: eid } },
            right: { type: 'literal', params: { value: 1 } },
          },
        },
        actions: [],
      }],
    } as any);

    const bundle = despawn(ctx, eid);
    expect(bundle.Rules).toHaveLength(1);
    expect(bundle.Rules[0].trigger.type).toBe('interval');
  });

});
