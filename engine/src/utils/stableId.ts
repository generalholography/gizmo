/**
 * Utility functions for working with StableIDs
 * 
 * StableIDs are persistent entity identifiers that remain constant across world saves/loads.
 * Entity IDs (eids) can change between sessions, but StableIDs do not.
 * 
 * PATTERN: When storing entity references in entity stores for serialization,
 * always use StableIDs instead of entity IDs to ensure references persist across saves/loads.
 */

import { defineQuery, hasComponent } from "bitecs";
import { ECSContext } from "../core/ecs";
import { StableID } from "../core/components";

/**
 * Convert an entity ID to its StableID
 * @param ctx ECS context
 * @param eid Entity ID
 * @returns StableID or undefined if entity doesn't have StableID component
 */
export function eidToStableId(ctx: ECSContext, eid: number): number | undefined {
  if (!hasComponent(ctx, StableID, eid)) {
    return undefined;
  }
  return StableID.id[eid];
}

/**
 * Convert a StableID to its current entity ID
 * @param ctx ECS context
 * @param stableId StableID to look up
 * @returns Current entity ID or undefined if not found
 * 
 * NOTE: This function performs a linear search through all entities with StableID components.
 * For better performance during bulk operations (e.g., world deserialization), consider:
 * 1. Building a temporary stableId -> eid lookup map before processing
 * 2. Caching the query result
 * However, for typical usage (few lookups), this simple approach is sufficient.
 */
export function stableIdToEid(ctx: ECSContext, stableId: number): number | undefined {
  // Query all entities with StableID component
  const query = defineQuery([StableID]);
  const entities = query(ctx);
  
  // Find the entity with matching StableID
  for (const eid of entities) {
    if (StableID.id[eid] === stableId) {
      return eid;
    }
  }
  
  return undefined;
}

/**
 * Convert an array of entity IDs to StableIDs
 * @param ctx ECS context
 * @param eids Array of entity IDs
 * @returns Array of StableIDs (undefined values filtered out)
 */
export function eidsToStableIds(ctx: ECSContext, eids: number[]): number[] {
  const stableIds: number[] = [];
  for (const eid of eids) {
    const stableId = eidToStableId(ctx, eid);
    if (stableId !== undefined) {
      stableIds.push(stableId);
    }
  }
  return stableIds;
}

/**
 * Convert an array of StableIDs to current entity IDs
 * @param ctx ECS context
 * @param stableIds Array of StableIDs
 * @returns Array of entity IDs (undefined values filtered out)
 */
export function stableIdsToEids(ctx: ECSContext, stableIds: number[]): number[] {
  const eids: number[] = [];
  for (const stableId of stableIds) {
    const eid = stableIdToEid(ctx, stableId);
    if (eid !== undefined) {
      eids.push(eid);
    }
  }
  return eids;
}

/**
 * Convert a Set of entity IDs to StableIDs
 * @param ctx ECS context
 * @param eidSet Set of entity IDs
 * @returns Set of StableIDs
 */
export function eidSetToStableIdSet(ctx: ECSContext, eidSet: Set<number>): Set<number> {
  const stableIdSet = new Set<number>();
  for (const eid of eidSet) {
    const stableId = eidToStableId(ctx, eid);
    if (stableId !== undefined) {
      stableIdSet.add(stableId);
    }
  }
  return stableIdSet;
}

/**
 * Convert a Set of StableIDs to current entity IDs
 * @param ctx ECS context
 * @param stableIdSet Set of StableIDs
 * @returns Set of entity IDs
 */
export function stableIdSetToEidSet(ctx: ECSContext, stableIdSet: Set<number>): Set<number> {
  const eidSet = new Set<number>();
  for (const stableId of stableIdSet) {
    const eid = stableIdToEid(ctx, stableId);
    if (eid !== undefined) {
      eidSet.add(eid);
    }
  }
  return eidSet;
}
