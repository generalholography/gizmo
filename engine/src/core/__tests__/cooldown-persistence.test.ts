import { describe, it, expect } from 'vitest';
import { spawn } from '../spawn';
import { despawn } from '../despawn';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { createInventory, addToInventory } from '../inventory';
import { updateEffectCooldownSystem } from '../systems/updateEffectCooldowns';
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
    time: new Timer(),
  });

  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));

  world.resources.set('timer', { resource: new Timer() });
  world.resources.set('deltaTime', { resource: 1 / 60 });
  world.resources.set('nextStableId', { resource: 1 });
  world.resources.set('effectsArrays', { resource: new Map() });
  world.resources.set('inventoryChangeCallbacks', { resource: new Map() });

  class MockMotionSourceModule extends Module<any, any> {
    constructor(ctx: any) {
      super(ctx, {});
    }

    resolve(_def: any): number {
      return 1;
    }

    get(_id: number): any {
      return { bodyType: 'static' };
    }
  }

  world.modules.set('motionSource', new MockMotionSourceModule(world));

  return world;
}

describe('cooldown persistence', () => {
  it('preserves Rules cooldown state when item is despawned and respawned', () => {
    const ctx = ctxWithModules();

    const itemDef = {
      Rules: [{
        trigger: { type: 'primaryAction' },
        cooldown: 5.0,
        __cooldownRemaining: 3.0,
        actions: [{ type: 'heal', target: 'self', params: { amount: 10 } }],
      }],
    };

    const eid = spawn(ctx, itemDef);

    const bundle = despawn(ctx, eid);
    const serializedRule = bundle.Rules?.[0];
    expect(serializedRule?.cooldown).toBe(5.0);
    expect(serializedRule?.__cooldownRemaining ?? 0).toBeGreaterThan(0);

    const newEid = spawn(ctx, bundle);
    const reserialized = despawn(ctx, newEid).Rules?.[0];
    expect(reserialized?.cooldown).toBe(5.0);
    expect(reserialized?.__cooldownRemaining ?? 0).toBeGreaterThan(0);
  });

  it('updates Rules cooldowns for inventory items that are not held', () => {
    const ctx = ctxWithModules();

    const item1Def = {
      Rules: [{
        trigger: { type: 'primaryAction' },
        cooldown: 5.0,
        __cooldownRemaining: 3.0,
        actions: [{ type: 'heal', target: 'self', params: { amount: 10 } }],
      }],
    };

    const item2Def = {
      Rules: [{
        trigger: { type: 'secondaryAction' },
        cooldown: 8.0,
        __cooldownRemaining: 2.0,
        actions: [{ type: 'emitEvent', target: 'self', params: { name: 'shield_up' } }],
      }],
    };

    const playerEid = spawn(ctx, { Inventory: { size: 3 } });
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inventory = createInventory(3);
    inventories.set(playerEid, inventory);

    addToInventory(inventory, { type: 'entity', definition: item1Def as any });
    addToInventory(inventory, { type: 'entity', definition: item2Def as any });

    const before1 = item1Def.Rules[0].__cooldownRemaining!;
    const before2 = item2Def.Rules[0].__cooldownRemaining!;

    updateEffectCooldownSystem(ctx);

    expect(item1Def.Rules[0].__cooldownRemaining).toBeLessThan(before1);
    expect(item2Def.Rules[0].__cooldownRemaining).toBeLessThan(before2);
  });

  it('does not update Rules cooldown on inventory definition for currently held slot', () => {
    const ctx = ctxWithModules();

    const item1Def = {
      Rules: [{
        trigger: { type: 'primaryAction' },
        cooldown: 5.0,
        __cooldownRemaining: 3.0,
        actions: [{ type: 'heal', target: 'self', params: { amount: 10 } }],
      }],
    };

    const item2Def = {
      Rules: [{
        trigger: { type: 'secondaryAction' },
        cooldown: 8.0,
        __cooldownRemaining: 2.0,
        actions: [{ type: 'emitEvent', target: 'self', params: { name: 'shield_up' } }],
      }],
    };

    const playerEid = spawn(ctx, { Inventory: { size: 3 } });
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    const inventory = createInventory(3);
    inventories.set(playerEid, inventory);

    addToInventory(inventory, { type: 'entity', definition: item1Def as any });
    addToInventory(inventory, { type: 'entity', definition: item2Def as any });

    const heldItemEid = spawn(ctx, item1Def as any);
    heldItems.set(playerEid, { eid: heldItemEid, slot: 0 });

    const beforeHeldDefinition = item1Def.Rules[0].__cooldownRemaining!;
    const beforeOther = item2Def.Rules[0].__cooldownRemaining!;

    updateEffectCooldownSystem(ctx);

    expect(item1Def.Rules[0].__cooldownRemaining).toBe(beforeHeldDefinition);
    expect(item2Def.Rules[0].__cooldownRemaining).toBeLessThan(beforeOther);
  });

  it('defaults __cooldownRemaining to 0 when not provided', () => {
    const ctx = ctxWithModules();

    const itemDef = {
      Rules: [{
        trigger: { type: 'primaryAction' },
        cooldown: 5.0,
        actions: [{ type: 'heal', target: 'self', params: { amount: 10 } }],
      }],
    };

    const eid = spawn(ctx, itemDef as any);
    const serialized = despawn(ctx, eid).Rules?.[0];
    expect(serialized?.cooldown).toBe(5.0);
    expect(serialized?.__cooldownRemaining ?? 0).toBe(0);
  });

  it('persists cooldown state with multiple Rules in same item', () => {
    const ctx = ctxWithModules();

    const itemDef = {
      Rules: [
        {
          trigger: { type: 'primaryAction' },
          cooldown: 5.0,
          __cooldownRemaining: 3.0,
          actions: [{ type: 'heal', target: 'self', params: { amount: 10 } }],
        },
        {
          trigger: { type: 'secondaryAction' },
          cooldown: 8.0,
          __cooldownRemaining: 1.5,
          actions: [{ type: 'emitEvent', target: 'self', params: { name: 'secondary' } }],
        },
      ],
    };

    const eid = spawn(ctx, itemDef as any);
    const bundle = despawn(ctx, eid);
    const newEid = spawn(ctx, bundle);
    const reserialized = despawn(ctx, newEid).Rules ?? [];

    expect(reserialized).toHaveLength(2);
    expect(reserialized[0].cooldown).toBe(5.0);
    expect(reserialized[1].cooldown).toBe(8.0);
    expect(reserialized[0].__cooldownRemaining ?? 0).toBeGreaterThan(0);
    expect(reserialized[1].__cooldownRemaining ?? 0).toBeGreaterThan(0);
  });
});
