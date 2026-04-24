import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addComponent, addEntity, hasComponent } from 'bitecs';
import { ECSContext, getResource } from '../ecs';
import { Inventory as InventoryComp } from '../components/Inventory';
import { OnPrimaryAction } from '../components/OnPrimaryAction';
import { OnSecondaryAction } from '../components/OnSecondaryAction';
import { spawn } from '../spawn';
import { Inventory } from '../inventory';
import { getStore, InventoryStore, Store } from '../../modules/entityStore';

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
    time: { getElapsed: () => 0 } as any
  });
  
  // Mock modules needed for spawn
  world.modules.set('archetype', { 
    resolve: (p: any) => p,
    get: (p: any) => p 
  });
  
  world.resources.set('nextStableId', { resource: 1 });
  
  return world;
}

describe('inventory selectedItemIndex -1 action handling logic', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = ctxWithModules();
  });

  it('should determine to use entity actions when selectedItemIndex is -1', () => {
    // Create an entity with selectedItemIndex -1
    const eid = spawn(ctx, {
      Inventory: { 
        size: 2, 
        selectedItemIndex: -1, 
        items: [
          {
            Info: { name: "Test Tool" },
            Body: { type: "composite", params: { parts: [] } }
          },
          null
        ]
      }
    });

    // Add entity-level action components manually
    addComponent(ctx, OnPrimaryAction, eid);
    addComponent(ctx, OnSecondaryAction, eid);
    
    // Verify selectedItemIndex is -1
    expect(InventoryComp.selected[eid]).toBe(-1);
    
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    const inv = invs.get(eid);
    expect(inv?.selected).toBe(-1);
    
    // Test the logic that motionControl.ts uses to determine primary/secondary actors
    const heldItems = getStore<Store<any>>(ctx, 'heldItems');
    const heldEntry = heldItems.get(eid); // Should be undefined since no held item
    const hasValidHeldItem = !!(heldEntry && inv && inv.selected >= 0);
    
    // When selectedItemIndex is -1, hasValidHeldItem should be false
    expect(hasValidHeldItem).toBe(false);
    
    // This means motionControl would use the entity itself for actions
    const primaryActor = hasValidHeldItem && hasComponent(ctx, OnPrimaryAction, heldEntry?.eid)
      ? heldEntry.eid
      : eid;
    const secondaryActor = hasValidHeldItem && hasComponent(ctx, OnSecondaryAction, heldEntry?.eid)
      ? heldEntry.eid
      : eid;
      
    expect(primaryActor).toBe(eid); // Should use entity actions
    expect(secondaryActor).toBe(eid); // Should use entity actions
  });

  it('should determine to use held item actions when selectedItemIndex is valid and held item exists', () => {
    // Create an entity with selectedItemIndex 0
    const eid = spawn(ctx, {
      Inventory: { 
        size: 2, 
        selectedItemIndex: 0, 
        items: [
          {
            Info: { name: "Test Tool" },
            Body: { type: "composite", params: { parts: [] } }
          },
          null
        ]
      }
    });

    // Add entity-level action components
    addComponent(ctx, OnPrimaryAction, eid);
    
    // Verify selectedItemIndex is 0 
    expect(InventoryComp.selected[eid]).toBe(0);
    
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    const inv = invs.get(eid);
    expect(inv?.selected).toBe(0);
    
    // Simulate having a held item (normally created by heldItemSystem)
    const heldItems = getStore<Store<any>>(ctx, 'heldItems');
    const mockHeldEid = addEntity(ctx);
    addComponent(ctx, OnPrimaryAction, mockHeldEid);
    heldItems.set(eid, { eid: mockHeldEid, slot: 0 });
    
    // Test the logic that motionControl.ts uses
    const heldEntry = heldItems.get(eid);
    const hasValidHeldItem = !!(heldEntry && inv && inv.selected >= 0);
    
    // When selectedItemIndex is valid and held item exists, hasValidHeldItem should be true
    expect(hasValidHeldItem).toBe(true);
    
    // This means motionControl would use the held item for actions if it has them
    const primaryActor = hasValidHeldItem && hasComponent(ctx, OnPrimaryAction, heldEntry.eid)
      ? heldEntry.eid
      : eid;
      
    expect(primaryActor).toBe(mockHeldEid); // Should use held item actions
  });
});