import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource, setModule } from '../../core/ecs';
import { applyEffect, effectModule } from '../effect';
import { Effect } from '../../core/schema';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { createInventory, Inventory } from '../../core/inventory';
import { Health } from '../../core/components/Health';
import { Held } from '../../core/components/Held';
import { entityStoreModule, getStore, InventoryStore, Store } from '../entityStore';

function makeCtx(): ECSContext {
  const world = createWorld() as ECSContext;
  
  // Add basic required properties
  Object.assign(world, {
    time: new Timer(),
    three: { scene: { remove: vi.fn() } },
    rapier: { world: { removeRigidBody: vi.fn() } },
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    input: {} as any
  });

  // Set up required resources
  setResource(world, 'renderObjects', new Map());
  setResource(world, 'metrics', {
    increment: vi.fn()
  });
  setModule(world, 'entityStore', entityStoreModule(world));

  // Add effect module
  world.modules.set('effect', effectModule(world));

  return world;
}

describe('Kill Effect Inventory Fix', () => {
  let ctx: ECSContext;
  let holder: number;
  let heldItem: number;

  beforeEach(() => {
    ctx = makeCtx();
    holder = addEntity(ctx);
    heldItem = addEntity(ctx);
  });

  it('should remove held item from inventory when kill effect is used', () => {
    // Set up inventory with an item
    const inv = createInventory(3);
    inv.slots[0] = { type: 'entity', definition: { Info: { name: 'Test Item' } } };
    
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    inventories.set(holder, inv);
    
    // Set up held item tracking
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(holder, { eid: heldItem, slot: 0 });
    
    // Add Held component to the item
    addComponent(ctx, Held, heldItem);
    Held.eid[heldItem] = holder;

    // Verify item is in inventory initially
    expect(inv.slots[0]).not.toBeNull();
    expect(heldItems.has(holder)).toBe(true);

    // Apply kill effect to the held item
    const effect: Effect = {
      type: "kill",
      target: "self"
    };

    const result = applyEffect(ctx, effect, heldItem, heldItem);

    // Should succeed
    expect(result).toBe(true);
    
    // Item should be removed from inventory
    expect(inv.slots[0]).toBeNull();
  });

  it('should work when item kills itself using kill effect in onSuccess', () => {
    // Set up inventory with health potion-like item
    const inv = createInventory(3);
    inv.slots[1] = { type: 'entity', definition: { Info: { name: 'Health Potion' } } };
    
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    inventories.set(holder, inv);
    
    // Set up held item tracking for slot 1
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(holder, { eid: heldItem, slot: 1 });
    
    // Add Held component to the item
    addComponent(ctx, Held, heldItem);
    Held.eid[heldItem] = holder;

    // Create target to heal
    const target = addEntity(ctx);
    
    // Verify setup
    expect(inv.slots[1]).not.toBeNull();
    expect(heldItems.has(holder)).toBe(true);

    // Apply heal effect with kill on success (simulating health potion behavior)
    const effect: Effect = {
      type: "heal",
      params: { amount: 15 },
      target: "other",
      onSuccess: [
        {
          type: "kill",
          target: "self"
        }
      ]
    };

    // Note: heal will fail because target has no health component, so kill won't trigger
    const result = applyEffect(ctx, effect, heldItem, target);

    // Heal should fail due to no health component
    expect(result).toBe(false);
    
    // Item should still be in inventory since heal failed
    expect(inv.slots[1]).not.toBeNull();
    
    // Now test successful heal scenario by adding health component
    addComponent(ctx, Health, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 20;

    const result2 = applyEffect(ctx, effect, heldItem, target);

    // Heal should succeed and trigger kill
    expect(result2).toBe(true);
    
    // Item should be removed from inventory
    expect(inv.slots[1]).toBeNull();
  });

  it('should not crash when killing item that is not held', () => {
    // Create an item that is not held
    const freeItem = addEntity(ctx);

    // Apply kill effect
    const effect: Effect = {
      type: "kill",
      target: "self"
    };

    // Should work without errors
    const result = applyEffect(ctx, effect, freeItem, freeItem);
    expect(result).toBe(true);
  });
});