import { addComponent, addEntity, createWorld, hasComponent } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { ECSContext, getModule, setResource } from '../../core/ecs';
import { createInventory } from '../../core/inventory';
import { Health, Owner } from '../../core/components';
import { applyEffect, effectModule } from '../effect';
import { Effect } from '../../core/schema';
import { EntityStoreModule, entityStoreModule, getStore, InventoryStore, StockStore } from '../entityStore';

function makeCtx(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    time: new Timer(),
    three: { scene: { remove: vi.fn() } },
    rapier: { world: { removeRigidBody: vi.fn(), getRigidBody: vi.fn(), bodies: new Map() } },
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    input: {} as any,
  });

  setResource(world, 'renderObjects', new Map());
  setResource(world, 'inventoryChangeCallbacks', new Map());
  setResource(world, 'playerInventoryCallbacks', new Set());
  setResource(world, 'metrics', {
    set: vi.fn(),
    increment: vi.fn(),
  });

  world.modules.set('entityStore', entityStoreModule(world));
  world.modules.set('effect', effectModule(world));
  return world;
}

describe('store effects', () => {
  it('addToInventory adds all requested items when enough room exists', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    inventories.set(eid, createInventory(3));

    const effect: Effect = {
      type: 'addToInventory',
      target: 'self',
      params: { item: 'healthPotion', count: 2 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(true);
    const inv = inventories.get(eid)!;
    expect(inv.slots.filter((slot) => slot !== null)).toHaveLength(2);
    expect(inv.slots[0]).toEqual({ type: 'entity', definition: 'healthPotion' });
    expect(inv.slots[1]).toEqual({ type: 'entity', definition: 'healthPotion' });
  });

  it('addToInventory fails atomically when there is not enough space', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = createInventory(2);
    inv.slots[0] = { type: 'entity', definition: 'bow' };
    inventories.set(eid, inv);
    const before = JSON.parse(JSON.stringify(inv.slots));

    const effect: Effect = {
      type: 'addToInventory',
      target: 'self',
      params: { item: 'healthPotion', count: 2 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(false);
    expect(inventories.get(eid)?.slots).toEqual(before);
  });

  it('removeFromInventory removes matching entries by archetype/name', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = createInventory(4);
    inv.slots[0] = { type: 'entity', definition: { _meta: { archetype: 'healthPotion' }, Info: { name: 'Health Potion' } } };
    inv.slots[1] = { type: 'entity', definition: { _meta: { archetype: 'healthPotion' }, Info: { name: 'Health Potion' } } };
    inv.slots[2] = { type: 'entity', definition: { _meta: { archetype: 'bow' }, Info: { name: 'Bow' } } };
    inventories.set(eid, inv);

    const effect: Effect = {
      type: 'removeFromInventory',
      target: 'self',
      params: { archetype: 'healthPotion', name: 'Health Potion', count: 2 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(true);
    const result = inventories.get(eid)!;
    expect(result.slots[0]).toBeNull();
    expect(result.slots[1]).toBeNull();
    expect(result.slots[2]).not.toBeNull();
  });

  it('removeFromInventory succeeds with archetype-only entries even when name is also provided', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = createInventory(3);
    inv.slots[0] = { type: 'entity', definition: 'healthPotion' };
    inv.slots[1] = { type: 'entity', definition: 'healthPotion' };
    inventories.set(eid, inv);

    const effect: Effect = {
      type: 'removeFromInventory',
      target: 'self',
      params: { archetype: 'healthPotion', name: 'Health Potion', count: 2 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(true);
    const result = inventories.get(eid)!;
    expect(result.slots[0]).toBeNull();
    expect(result.slots[1]).toBeNull();
  });

  it('removeFromInventory supports name-only matching for inline item bundles', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = createInventory(2);
    inv.slots[0] = { type: 'entity', definition: { Info: { name: 'Quest Scroll' } } };
    inventories.set(eid, inv);

    const effect: Effect = {
      type: 'removeFromInventory',
      target: 'self',
      params: { name: 'Quest Scroll', count: 1 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(true);
    expect(inventories.get(eid)?.slots[0]).toBeNull();
  });

  it('removeFromInventory fails atomically when insufficient matching entries exist', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = createInventory(3);
    inv.slots[0] = { type: 'entity', definition: { _meta: { archetype: 'healthPotion' }, Info: { name: 'Health Potion' } } };
    inv.slots[1] = { type: 'entity', definition: { _meta: { archetype: 'bow' }, Info: { name: 'Bow' } } };
    inventories.set(eid, inv);
    const before = JSON.parse(JSON.stringify(inv.slots));

    const effect: Effect = {
      type: 'removeFromInventory',
      target: 'self',
      params: { archetype: 'healthPotion', name: 'Health Potion', count: 2 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(false);
    expect(inventories.get(eid)?.slots).toEqual(before);
  });

  it('incrementStock fails if the stock store instance does not exist', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    const effect: Effect = {
      type: 'incrementStock',
      target: 'self',
      params: { stock: 'nonexistent', delta: -2 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(false);
  });

  it('incrementStock clamps to min/max and updates health component without killing entity', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    addComponent(ctx, Health, eid);

    const healthStore = getStore<StockStore>(ctx, 'health');
    healthStore.set(eid, { current: 2, max: 5, min: 0 });
    Health.value[eid] = 2;
    Health.maxValue[eid] = 5;

    const down: Effect = {
      type: 'incrementStock',
      target: 'self',
      params: { stock: 'health', delta: -99 },
    } as any;
    const up: Effect = {
      type: 'incrementStock',
      target: 'self',
      params: { stock: 'health', delta: 99 },
    } as any;

    expect(applyEffect(ctx, down, eid)).toBe(true);
    expect(healthStore.get(eid)?.current).toBe(0);
    expect(Health.value[eid]).toBe(0);
    expect(hasComponent(ctx, Health, eid)).toBe(true);

    expect(applyEffect(ctx, up, eid)).toBe(true);
    expect(healthStore.get(eid)?.current).toBe(5);
    expect(Health.value[eid]).toBe(5);
  });

  it('setMetric and incrementMetric support owner subject and subtype/subpath', () => {
    const ctx = makeCtx();
    const owner = addEntity(ctx);
    const proxy = addEntity(ctx);
    addComponent(ctx, Owner, proxy);
    Owner.eid[proxy] = owner;

    const setEffect: Effect = {
      type: 'setMetric',
      target: 'self',
      params: { metric: 'lab score', value: 10, subpath: 'lane1', subject: 'owner' },
    } as any;
    const incrementEffect: Effect = {
      type: 'incrementMetric',
      target: 'self',
      params: { metric: 'lab score', delta: 3, subtype: 'lane1', subject: 'owner' },
    } as any;

    expect(applyEffect(ctx, setEffect, proxy)).toBe(true);
    expect(applyEffect(ctx, incrementEffect, proxy)).toBe(true);

    const metrics = (ctx.resources.get('metrics')?.resource as any);
    expect(metrics.set).toHaveBeenCalledWith(owner, 'lab score', 'lane1', 10);
    expect(metrics.increment).toHaveBeenCalledWith(owner, 'lab score', 'lane1', 3);
  });

  it('incrementStock supports dynamic stock stores and clamps at zero', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    getStore<InventoryStore>(ctx, 'inventory');
    const storeModule = getModule<EntityStoreModule>(ctx, 'entityStore')!;
    storeModule.registerStoreInstance('energy', 'stock');

    const energyStore = getStore<StockStore>(ctx, 'energy');
    energyStore.set(eid, { current: 1, max: 4, min: 0 });

    const effect: Effect = {
      type: 'incrementStock',
      target: 'self',
      params: { stock: 'energy', delta: -10 },
    } as any;

    expect(applyEffect(ctx, effect, eid)).toBe(true);
    expect(energyStore.get(eid)?.current).toBe(0);
  });
});
