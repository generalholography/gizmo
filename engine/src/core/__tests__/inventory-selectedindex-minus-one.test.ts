import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addComponent, addEntity } from 'bitecs';
import { ECSContext } from '../ecs';
import { Inventory as InventoryComp } from '../components/Inventory';
import { spawn } from '../spawn';
import { Inventory } from '../inventory';
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

describe('inventory selectedItemIndex -1 support', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = ctxWithModules();
  });

  it('supports selectedItemIndex -1 in spawn declarative syntax', () => {
    const eid = spawn(ctx, {
      Inventory: { 
        size: 3, 
        selectedItemIndex: -1, 
        items: [
          { Info: { name: "Test Item" }, Body: { type: "composite", params: { parts: [] } } },
          null,
          null
        ]
      }
    });
    
    // Check inventory component was set up correctly
    expect(InventoryComp.size[eid]).toBe(3);
    expect(InventoryComp.selected[eid]).toBe(-1);
    
    // Check inventory data was created
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    const inv = invs.get(eid);
    expect(inv).toBeDefined();
    expect(inv.size).toBe(3);
    expect(inv.selected).toBe(-1);
  });

  it('allows changing selectedItemIndex to and from -1', () => {
    const eid = spawn(ctx, {
      Inventory: { size: 2, selectedItemIndex: 0, items: [] }
    });
    
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    const inv = invs.get(eid)!;
    
    // Change to -1
    inv.selected = -1;
    InventoryComp.selected[eid] = -1;
    expect(inv.selected).toBe(-1);
    expect(InventoryComp.selected[eid]).toBe(-1);
    
    // Change back to 0
    inv.selected = 0;
    InventoryComp.selected[eid] = 0;
    expect(inv.selected).toBe(0);
    expect(InventoryComp.selected[eid]).toBe(0);
  });

  it('prefers selected over selectedItemIndex when both are provided', () => {
    const eid = spawn(ctx, {
      Inventory: { 
        size: 3, 
        selected: -1,
        selectedItemIndex: 1, 
        items: []
      }
    });
    
    // selected should take precedence
    expect(InventoryComp.selected[eid]).toBe(-1);
    
    const invs = getStore<InventoryStore>(ctx, 'inventory');
    const inv = invs.get(eid);
    expect(inv?.selected).toBe(-1);
  });
});