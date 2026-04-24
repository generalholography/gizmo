import { describe, it, expect } from 'vitest';
import { spawn } from '../spawn';
import { despawn } from '../despawn';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
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

describe('inventory persistence through despawn/spawn', () => {
  it('preserves inventory items when entity is despawned and respawned', () => {
    const ctx = ctxWithModules();

    // Spawn entity with inventory items
    const entityDef = {
      Inventory: {
        size: 2,
        items: [
          {
            Info: { name: "Test Item", description: "A test item" },
            Body: { 
              type: "composite",
              params: {
                parts: [
                  {
                    geometry: { type: "box", params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                    material: { type: "solid", params: { color: "#ff0000" } }
                  }
                ]
              }
            }
          },
          {
            Info: { name: "Another Item", description: "Another test item" },
            Body: {
              type: "composite", 
              params: {
                parts: [
                  {
                    geometry: { type: "sphere", params: { radius: 0.5 } },
                    material: { type: "solid", params: { color: "#00ff00" } }
                  }
                ]
              }
            }
          }
        ],
        selectedItemIndex: 0
      }
    };

    const eid = spawn(ctx, entityDef);

    // Verify inventory was created
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const originalInv = inventories.get(eid);
    expect(originalInv).toBeDefined();
    expect(originalInv.size).toBe(2);
    expect(originalInv.selected).toBe(0);
    expect(originalInv.slots[0]).toBeDefined();
    expect(originalInv.slots[1]).toBeDefined();

    // Despawn and get bundle
    const bundle = despawn(ctx, eid);
    
    // Check what the bundle contains for inventory
    console.log('Despawn bundle Inventory:', JSON.stringify(bundle.Inventory, null, 2));

    // Spawn from the bundle
    const newEid = spawn(ctx, bundle);

    // Check if inventory items survived
    const newInv = inventories.get(newEid);
    expect(newInv).toBeDefined();
    expect(newInv.size).toBe(2);
    expect(newInv.selected).toBe(0);
    
    // The key test: verify the items are still there
    expect(newInv.slots[0]).toBeDefined();
    expect(newInv.slots[1]).toBeDefined();
    
    console.log('Original inventory:', originalInv);
    console.log('New inventory:', newInv);
  });

  it('handles sparse inventories correctly', () => {
    const ctx = ctxWithModules();

    // Create entity with sparse inventory (slot 0 has item, slot 1 is empty, slot 2 has item)
    const entityDef = {
      Inventory: {
        size: 3,
        items: [
          {
            Info: { name: "First Item", description: "In slot 0" },
            Body: {
              type: "composite",
              params: {
                parts: [
                  {
                    geometry: { type: "box", params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                    material: { type: "solid", params: { color: "#ff0000" } }
                  }
                ]
              }
            }
          },
          // Slot 1 is intentionally empty
          undefined,
          {
            Info: { name: "Third Item", description: "In slot 2" },
            Body: {
              type: "composite",
              params: {
                parts: [
                  {
                    geometry: { type: "sphere", params: { radius: 0.5 } },
                    material: { type: "solid", params: { color: "#00ff00" } }
                  }
                ]
              }
            }
          }
        ],
        selectedItemIndex: 0
      }
    };

    const eid = spawn(ctx, entityDef);

    // Verify sparse inventory was created correctly
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const originalInv = inventories.get(eid);
    expect(originalInv.size).toBe(3);
    expect(originalInv.slots[0]).toBeDefined(); // Has item
    expect(originalInv.slots[1]).toBeNull();    // Empty slot
    expect(originalInv.slots[2]).toBeDefined(); // Has item

    // Despawn and respawn
    const bundle = despawn(ctx, eid);
    const newEid = spawn(ctx, bundle);

    // Verify sparse structure is preserved
    const newInv = inventories.get(newEid);
    expect(newInv.size).toBe(3);
    expect(newInv.slots[0]).toBeDefined(); // Still has item
    expect(newInv.slots[1]).toBeNull();    // Still empty
    expect(newInv.slots[2]).toBeDefined(); // Still has item

    console.log('Sparse bundle items:', bundle.Inventory.items);
    console.log('Original sparse inventory slots:', originalInv.slots.map((s: any) => s ? 'item' : 'null'));
    console.log('New sparse inventory slots:', newInv.slots.map((s: any) => s ? 'item' : 'null'));
  });
});