import { describe, it, expect } from 'vitest';
import { spawn } from '../spawn';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
import { Inventory } from '../components/Inventory';
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
  world.resources.set('nextStableId', { resource: 1 });
  return world;
}

describe('inventory spawn with new format', () => {
  it('spawns entity with inventory items in new declarative format', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, {
      Inventory: {
        size: 3,
        items: [
          {
            Info: { name: "Test Item 1" },
            Transform: { x: 1, y: 1, z: 1 }
          },
          "cube", // archetype reference
          {
            Info: { name: "Test Item 3" },
            Transform: { x: 3, y: 3, z: 3 }
          }
        ],
        selectedItemIndex: 0
      }
    });
    
    // Check inventory component was set up correctly
    expect(Inventory.size[eid]).toBe(3);
    expect(Inventory.selected[eid]).toBe(0);
    
    // Check inventory data was created
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    const inv = invs.get(eid);
    expect(inv).toBeDefined();
    expect(inv.size).toBe(3);
    expect(inv.selected).toBe(0);
    
    // Check items were converted correctly
    expect(inv.slots[0]).toEqual({ type: 'entity', definition: { Info: { name: "Test Item 1" }, Transform: { x: 1, y: 1, z: 1 } } });
    expect(inv.slots[1]).toEqual({ type: 'entity', definition: 'cube' });
    expect(inv.slots[2]).toEqual({ type: 'entity', definition: { Info: { name: "Test Item 3" }, Transform: { x: 3, y: 3, z: 3 } } });
  });

  it('handles both selected and selectedItemIndex properties', () => {
    const ctx = ctxWithModules();
    
    // Test with selectedItemIndex
    const eid1 = spawn(ctx, {
      Inventory: { size: 2, selectedItemIndex: 1, items: [] }
    });
    expect(Inventory.selected[eid1]).toBe(1);
    
    // Test with selected (should take precedence)
    const eid2 = spawn(ctx, {
      Inventory: { size: 2, selected: 1, selectedItemIndex: 0, items: [] }
    });
    expect(Inventory.selected[eid2]).toBe(1);
  });
});