import { ECSContext } from "./ecs";
import { entityExists as bitecsEntityExists } from "bitecs";
import { getStore, Store } from "../modules/entityStore";

export interface EntityAndTimestamp {
  entity: number | null;
  happenedAt: number; // performance.now()
}

export interface Memory {
  lastDamageDealt: EntityAndTimestamp;
  lastTargeted: EntityAndTimestamp;
}

// Create default memory object
export function createMemory(): Memory {
  return {
    lastDamageDealt: { entity: null, happenedAt: 0 },
    lastTargeted: { entity: null, happenedAt: 0 }
  };
}

// Get memory for an entity, creating if it doesn't exist
export function getMemory(ctx: ECSContext, eid: number): Memory {
  const memoryMap = getStore<Store<Memory>>(ctx, 'aiMemory');
  
  if (!memoryMap.has(eid)) {
    memoryMap.set(eid, createMemory());
  }
  
  return memoryMap.get(eid)!;
}

// Set memory for an entity
export function setMemory(ctx: ECSContext, eid: number, memory: Memory): void {
  const memoryMap = getStore<Store<Memory>>(ctx, 'aiMemory');
  memoryMap.set(eid, memory);
}

// Remove memory for an entity (for cleanup)
export function removeMemory(ctx: ECSContext, eid: number): void {
  const memoryMap = getStore<Store<Memory>>(ctx, 'aiMemory');
  memoryMap.delete(eid);
}

// Check if entity exists in the ECS world
export function entityExists(ctx: ECSContext, eid: number): boolean {
  return bitecsEntityExists(ctx, eid);
}