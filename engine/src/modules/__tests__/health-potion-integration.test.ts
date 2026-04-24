import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { applyEffect, effectModule } from '../effect';
import { Effect } from '../../core/schema';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { createInventory, Inventory } from '../../core/inventory';
import { Health } from '../../core/components/Health';
import { Held } from '../../core/components/Held';
import { getStore, InventoryStore, Store } from '../entityStore';

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
  setResource(world, 'inventoryChangeCallbacks', new Map());

  // Add effect module
  world.modules.set('effect', effectModule(world));

  return world;
}

describe('Health Potion Integration Test', () => {
  let ctx: ECSContext;
  let player: number;
  let healthPotion: number;

  beforeEach(() => {
    ctx = makeCtx();
    player = addEntity(ctx);
    healthPotion = addEntity(ctx);
  });

  it('should heal player and remove itself from inventory when used', () => {
    // Set up player with health
    addComponent(ctx, Health, player);
    Health.value[player] = 10;
    Health.maxValue[player] = 25;

    // Set up player inventory with health potion
    const inv = createInventory(6);
    inv.slots[0] = { 
      type: 'entity', 
      definition: { 
        Info: { name: 'Health Potion' },
        // ... other health potion properties
      } 
    };
    
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    inventories.set(player, inv);
    
    // Set up held item tracking (health potion is in player's hand)
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(player, { eid: healthPotion, slot: 0 });
    
    // Add Held component to the health potion
    addComponent(ctx, Held, healthPotion);
    Held.eid[healthPotion] = player;

    // Verify initial state
    expect(Health.value[player]).toBe(10);
    expect(inv.slots[0]).not.toBeNull();
    expect(heldItems.has(player)).toBe(true);

    // Simulate using the health potion (OnPrimaryAction)
    const healthPotionEffect: Effect = {
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

    // Apply the effect (health potion heals player and kills itself)
    const result = applyEffect(ctx, healthPotionEffect, healthPotion, player);

    // Should succeed
    expect(result).toBe(true);
    
    // Player should be healed
    expect(Health.value[player]).toBe(25); // 10 + 15 = 25 (max health)
    
    // Health potion should be removed from inventory
    expect(inv.slots[0]).toBeNull();
  });

  it('should cap healing at max health', () => {
    // Set up player with health close to max
    addComponent(ctx, Health, player);
    Health.value[player] = 20;
    Health.maxValue[player] = 25;

    // Apply heal effect for 15 HP
    const healEffect: Effect = {
      type: "heal",
      params: { amount: 15 },
      target: "other"
    };

    const result = applyEffect(ctx, healEffect, healthPotion, player);

    // Should succeed but cap at max health
    expect(result).toBe(true);
    expect(Health.value[player]).toBe(25); // Should be capped at max, not 35
  });

  it('should fail to heal if target is already at max health', () => {
    // Set up player with full health
    addComponent(ctx, Health, player);
    Health.value[player] = 25;
    Health.maxValue[player] = 25;

    // Set up inventory
    const inv = createInventory(6);
    inv.slots[0] = { type: 'entity', definition: { Info: { name: 'Health Potion' } } };
    
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    inventories.set(player, inv);
    
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(player, { eid: healthPotion, slot: 0 });

    // Apply heal effect with kill on success
    const healthPotionEffect: Effect = {
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

    const result = applyEffect(ctx, healthPotionEffect, healthPotion, player);

    // Should fail because player is at max health
    expect(result).toBe(false);
    expect(Health.value[player]).toBe(25); // Health unchanged
    
    // Health potion should NOT be removed from inventory since heal failed
    expect(inv.slots[0]).not.toBeNull();
  });

  it('should handle healing entities without health component gracefully', () => {
    // Create target without health component
    const target = addEntity(ctx);

    const healEffect: Effect = {
      type: "heal",
      params: { amount: 15 },
      target: "other"
    };

    const result = applyEffect(ctx, healEffect, healthPotion, target);

    // Should fail gracefully
    expect(result).toBe(false);
  });
});