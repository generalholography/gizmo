import { MaterialDefinition } from '../modules/material';
import { ECSContext, getResource } from './ecs';
import { Player } from './components/Player';
import { hasComponent } from 'bitecs';
import { spawn } from './spawn';
import { ArchetypeBundle, despawn } from './despawn';
import { getSpawnTransform } from '../modules/renderer';
import * as THREE from 'three';
import { ReactiveMap } from '../utils/reactiveTypes';
import { getStore, InventoryStore, Store } from '../modules/entityStore';

export type InventoryItem =
  | { type: 'entity'; definition: ArchetypeBundle | string }
  | { type: 'material'; definition: MaterialDefinition; amount: number };

export interface Inventory {
  size: number;
  selected: number;
  slots: (InventoryItem | null)[];
}

export type InventoryChangeCallback = (inv: Inventory) => void;

export function createInventory(size: number): Inventory {
  return { size, selected: 0, slots: Array(size).fill(null) };
}

function defsEqual(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function addToInventory(inv: Inventory, item: InventoryItem): boolean {
  // First, try to stack with existing material items if possible
  if (item.type === 'material') {
    for (let i = 0; i < inv.size; i++) {
      const slot = inv.slots[i];
      if (
        slot &&
        slot.type === 'material' &&
        defsEqual(slot.definition, item.definition)
      ) {
        slot.amount += item.amount;
        return true;
      }
    }
  }
  // Then, try to find an empty slot
  for (let i = 0; i < inv.size; i++) {
    if (inv.slots[i] === null) {
      inv.slots[i] = item;
      return true;
    }
  }
  // Inventory is full
  return false;
}

export function inventoryChanged(ctx: ECSContext, eid: number) {
  const invs = getStore<InventoryStore>(ctx, 'inventory');
  const inv = invs?.get(eid);
  if (!inv) return;

  // --- Begin: Remove held item entity if it exists ---
  const held = getStore<Store<{ eid: number; slot: number }>>(ctx, "heldItems");
  if (held) {
    const entry = held.get(eid);
    if (entry) {
      // Remove the held entity so it will be refreshed later.
      // We also need to update the definition in the held slot
      // Since the cooldown or other properties may have changed
      // on the runtime entity.
      const heldItemDef = despawn(ctx, entry.eid);
      const existingSlot = inv.slots[entry.slot];
      
      // Possible during drop that the slot was already cleared
      // Hence the check
      if (existingSlot) {
        existingSlot.definition = heldItemDef;
      }
      held.delete(eid);
    }
  }
  // --- End: Remove held item entity if it exists ---

  const cbMap = getResource<Map<number, Set<InventoryChangeCallback>>>(ctx, 'inventoryChangeCallbacks');
  const cbs = cbMap?.get(eid);
  if (cbs) {
    for (const cb of cbs) cb(inv);
  }
  if (hasComponent(ctx, Player, eid)) {
    const playerCbs = getResource<Set<InventoryChangeCallback>>(ctx, 'playerInventoryCallbacks');
    if (playerCbs) {
      for (const cb of playerCbs) cb(inv);
    }
  }
}

/**
 * Swap two slots in the inventory and notify listeners.
 * @param ctx ECSContext
 * @param eid Entity id
 * @param inv Inventory object
 * @param indexA First slot index
 * @param indexB Second slot index
 */
export function swapInventorySlots(
  ctx: ECSContext,
  eid: number,
  inv: Inventory,
  indexA: number,
  indexB: number
) {
  if (
    indexA < 0 || indexA >= inv.size ||
    indexB < 0 || indexB >= inv.size ||
    indexA === indexB
  ) {
    return;
  }
  const tmp = inv.slots[indexA];
  inv.slots[indexA] = inv.slots[indexB];
  inv.slots[indexB] = tmp;
  inventoryChanged(ctx, eid);
}

export function drop(ctx: ECSContext, eid: number, slot: number): number | null {
  const invs = getStore<InventoryStore>(ctx, 'inventory');
  const playerCooldownCallbacks = getResource<ReactiveMap<number>>(ctx, 'playerInventoryCooldownCallbacks');
  const inv = invs?.get(eid);
  if (!inv) return null;
  if (slot < 0 || slot >= inv.size) return null;
  const item = inv.slots[slot];
  if (!item) return null;

  // --- Compute spawn transform using getSpawnRay ---
  //TODO: need to add a raycast to ensure that object wont clip through something very close
  // This will require being able to derive the physics bounds from the entity definition
  const t = getSpawnTransform(ctx, eid);
  // Position: origin + normalized direction (distance 1 in front)
  const pos = t.position.clone().add(t.zAxis.clone().normalize().multiplyScalar(0.5));
  // Forward vector projected onto XZ plane
  const fwdXZ = t.zAxis.clone();
  fwdXZ.y = 0;
  fwdXZ.normalize();
  // If zero vector, fallback to (0,0,1)
  if (fwdXZ.lengthSq() < 1e-6) fwdXZ.set(0, 0, 1);
  // Quaternion to look along fwdXZ, right side up
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), fwdXZ);

  const transform = {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    qx: quat.x,
    qy: quat.y,
    qz: quat.z,
    qw: quat.w,
  };
  // -------------------------------------------------

  if (hasComponent(ctx, Player, eid)) {
    // Clear any cooldown callback for this slot since it's being dropped
    playerCooldownCallbacks?.set(String(slot), null);
  }
  if (item.type === 'entity') {
    inv.slots[slot] = null;
    const itemEid = spawn(ctx, item.definition, {
      Transform: transform,
    });
    inventoryChanged(ctx, eid);
    return itemEid;
  }
  if (item.type === 'material') {
    inv.slots[slot] = null;
    inventoryChanged(ctx, eid);
    return null; //TODO: Handle dropping materials in the world
  }
  console.warn('Unknown inventory item type:', item);
  return null; 
}

export function dropSelected(ctx: ECSContext, eid: number): number | null {
  const invs = getStore<InventoryStore>(ctx, 'inventory');
  const inv = invs?.get(eid);
  if (!inv) return null;
  return drop(ctx, eid, inv.selected);
}
