import { describe, it, expect } from 'vitest';
import { createWorld, addComponent, hasComponent, addEntity } from 'bitecs';
import { ECSContext } from '../ecs';
import { createInventory, addToInventory } from '../inventory';
import { Health, doDamage } from '../components/Health';
import { Inventory as InventoryComp } from '../components/Inventory';
import { Transform } from '../components/Transform';
import { MotionSource } from '../components/MotionSource';
import { Faction } from '../components/Faction';
import { Info } from '../components/Info';
import { getStore, InventoryStore } from '../../modules/entityStore';

function makeCtx(): ECSContext {
  const ctx = createWorld() as ECSContext;
  ctx.modules = new Map();
  ctx.resources = new Map([
    ["renderObjects", { resource: new Map() }],
    ["metrics", { resource: { increment: () => {} } }],
    ["heldItems", { resource: new Map() }],
  ]);
  ctx.pipeline = [];
  ctx.isPlaying = true;
  ctx.three = {} as any;
  ctx.rapier = {
    world: {
      getRigidBody: () => null
    }
  } as any;
  ctx.input = {} as any;
  ctx.time = { getElapsed: () => 0 } as any;
  return ctx;
}

describe('inventory death mechanics', () => {
  it('drops inventory items when entity dies', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    
    // Add components to entity
    addComponent(ctx, Health, eid);
    addComponent(ctx, InventoryComp, eid);
    addComponent(ctx, Transform, eid);
    addComponent(ctx, MotionSource, eid);
    addComponent(ctx, Faction, eid);
    addComponent(ctx, Info, eid);
    
    // Set up entity health
    Health.value[eid] = 10;
    Health.maxValue[eid] = 10;
    
    // Set up entity inventory
    InventoryComp.size[eid] = 3;
    InventoryComp.selected[eid] = 0;
    
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    const inv = createInventory(3);
    inventories.set(eid, inv);
    
    // Add items to inventory
    const item1 = { type: 'entity' as const, definition: { test: 'cube' } };
    const item2 = { type: 'material' as const, definition: { type: 'solid' }, amount: 5 };
    addToInventory(inv, item1);
    addToInventory(inv, item2);
    
    expect(inv.slots[0]).toBe(item1);
    expect(inv.slots[1]).toBe(item2);
    expect(inv.slots[2]).toBe(null);
    
    // Verify entity exists before damage
    expect(hasComponent(ctx, Health, eid)).toBe(true);
    
    // Deal fatal damage (this will trigger inventory drop and entity removal)
    doDamage(ctx, 999, eid, 15); // more than 10 health
    
    // Check that entity was removed (health <= 0 triggers removal)
    expect(hasComponent(ctx, Health, eid)).toBe(false);
    
    // Verify the inventory was cleared from the resource map 
    // (this happens in despawn which is called by removeEntity)
    expect(inventories.has(eid)).toBe(false);
  });

  it('handles entities without inventory gracefully', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    
    // Add only health component, no inventory
    addComponent(ctx, Health, eid);
    addComponent(ctx, Faction, eid);
    addComponent(ctx, Info, eid);
    
    Health.value[eid] = 5;
    Health.maxValue[eid] = 5;
    
    // Verify entity exists before damage
    expect(hasComponent(ctx, Health, eid)).toBe(true);
    
    // This should not throw an error
    expect(() => {
      doDamage(ctx, 999, eid, 10);
    }).not.toThrow();
    
    // Entity should be removed
    expect(hasComponent(ctx, Health, eid)).toBe(false);
  });
});