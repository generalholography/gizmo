import { describe, it, expect } from 'vitest';
import { createInventory, addToInventory, swapInventorySlots } from '../inventory';
import type { Inventory } from '../inventory';
import type { ECSContext } from '../ecs';
import { createWorld } from 'bitecs';

function makeCtx(inv: Inventory): ECSContext {
  const ctx = createWorld() as ECSContext;
  ctx.modules = new Map();
  ctx.resources = new Map([
    ["inventories", { resource: new Map([[1, inv]]) } as any],
  ]);
  ctx.pipeline = [];
  ctx.isPlaying = true;
  ctx.three = {} as any;
  ctx.rapier = {} as any;
  ctx.input = {} as any;
  return ctx;
}

describe('inventory utils', () => {
  it('adds and stacks materials', () => {
    const inv = createInventory(2);
    const item = { type: 'material' as const, definition: {}, amount: 1 };
    const item2 = { type: 'material' as const, definition: {}, amount: 2 };
    expect(addToInventory(inv, item)).toBe(true);
    expect(addToInventory(inv, item2)).toBe(true);
    expect(inv.slots[0]?.amount).toBe(3);
  });

  it('swaps items between slots', () => {
    const inv = createInventory(2);
    const a = { type: 'entity' as const, definition: { id: 'a' } };
    const b = { type: 'entity' as const, definition: { id: 'b' } };
    addToInventory(inv, a);
    addToInventory(inv, b);
    const ctx = makeCtx(inv);
    swapInventorySlots(ctx, 1, inv, 0, 1);
    expect(inv.slots[0]).toBe(b);
    expect(inv.slots[1]).toBe(a);
  });
});
