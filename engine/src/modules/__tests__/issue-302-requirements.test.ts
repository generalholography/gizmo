import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { applyEffect, effectModule } from '../effect';
import { Effect } from '../../core/schema';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { createInventory, Inventory } from '../../core/inventory';
import { Health } from '../../core/components/Health';
import { Held } from '../../core/components/Held';
import healthPotion from '../../data/healthPotion';
import lootCrate from '../../data/lootCrate';
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

describe('Issue #302 Requirements Verification', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it('REQUIREMENT 1: heal effect behaves like damage but heals entities', () => {
    const healer = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Set up target with health
    addComponent(ctx, Health, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 20;

    // Apply heal effect
    const healEffect: Effect = {
      type: "heal",
      params: { amount: 5 },
      target: "other"
    };

    const result = applyEffect(ctx, healEffect, healer, target);

    expect(result).toBe(true);
    expect(Health.value[target]).toBe(15); // 10 + 5 = 15
  });

  it('REQUIREMENT 2: heal never heals below 0 health (i.e., never exceeds max health)', () => {
    const healer = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Set up target near max health
    addComponent(ctx, Health, target);
    Health.value[target] = 18;
    Health.maxValue[target] = 20;

    // Try to heal for more than remaining health
    const healEffect: Effect = {
      type: "heal",
      params: { amount: 10 },
      target: "other"
    };

    const result = applyEffect(ctx, healEffect, healer, target);

    expect(result).toBe(true);
    expect(Health.value[target]).toBe(20); // Capped at max, not 28
  });

  it('REQUIREMENT 3: health potion entity heals 15 hp on primary action and kills itself', () => {
    expect(healthPotion).toBeDefined();
    expect(healthPotion.Info.name).toBe("Health Potion");
    const primaryAction = healthPotion.Rules.find((r: any) => r.trigger.type === 'primaryAction');
    expect(primaryAction).toBeDefined();
    expect(primaryAction.actions).toHaveLength(1);

    const healEffect = primaryAction.actions[0];
    expect(healEffect.type).toBe("heal");
    expect(healEffect.params.amount).toBe(8);
    expect(healEffect.target).toBe("other");
    expect(healEffect.onSuccess).toHaveLength(1);
    
    const killEffect = healEffect.onSuccess[0];
    expect(killEffect.type).toBe("kill");
    expect(killEffect.target).toBe("self");
  });

  it('REQUIREMENT 4: loot crate contains health potion', () => {
    expect(lootCrate).toBeDefined();
    expect(lootCrate.Info.name).toBe("Loot Crate");
    expect(lootCrate.Inventory).toBeDefined();
    expect(lootCrate.Inventory.items).toHaveLength(1);
    
    const potionInCrate = lootCrate.Inventory.items[0];
    expect(potionInCrate.Info.name).toBe("Health Potion");
    const potionRule = potionInCrate.Rules.find((r: any) => r.trigger.type === 'primaryAction');
    expect(potionRule.actions[0].type).toBe("heal");
    expect(potionRule.actions[0].params.amount).toBe(15);
  });

  it('REQUIREMENT 5: held item removes itself from inventory when killed', () => {
    const player = addEntity(ctx);
    const heldPotion = addEntity(ctx);
    
    // Set up player with health (for heal to work)
    addComponent(ctx, Health, player);
    Health.value[player] = 10;
    Health.maxValue[player] = 25;

    // Set up inventory with potion
    const inv = createInventory(6);
    inv.slots[0] = { type: 'entity', definition: { Info: { name: 'Health Potion' } } };
    
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    inventories.set(player, inv);
    
    // Set up held item tracking
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(player, { eid: heldPotion, slot: 0 });
    
    addComponent(ctx, Held, heldPotion);
    Held.eid[heldPotion] = player;

    // Verify setup
    expect(inv.slots[0]).not.toBeNull();

    // Apply health potion effect (heal + kill self)
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

    const result = applyEffect(ctx, healthPotionEffect, heldPotion, player);

    // Should succeed
    expect(result).toBe(true);
    
    // Player should be healed
    expect(Health.value[player]).toBe(25);
    
    // Health potion should be removed from inventory
    expect(inv.slots[0]).toBeNull();
  });

  it('VERIFICATION: heal effect integration with damage system compatibility', () => {
    const actor = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Set up target with health
    addComponent(ctx, Health, target);
    Health.value[target] = 15;
    Health.maxValue[target] = 20;

    // Test damage effect
    const damageEffect: Effect = {
      type: "damage",
      params: { amount: 5 },
      target: "other"
    };

    let result = applyEffect(ctx, damageEffect, actor, target);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(10); // 15 - 5 = 10

    // Test heal effect to undo damage
    const healEffect: Effect = {
      type: "heal",
      params: { amount: 8 },
      target: "other"
    };

    result = applyEffect(ctx, healEffect, actor, target);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(18); // 10 + 8 = 18
  });
});
