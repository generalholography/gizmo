import { defineQuery, hasComponent } from "bitecs";
import { ECSContext } from "../ecs";
import { Transform } from "../components/Transform";
import { Health, doDamage } from "../components/Health";
import { despawn } from "../despawn";

// Y coordinate threshold for the kill plane
export const KILL_PLANE_Y = -500;
export const KILL_PLANE_EID = -99;
export const KILL_PLANE_NAME = "The Void";

// Query for all entities with Transform component (since we need to check their position)
const killPlaneQuery = defineQuery([Transform]);

/**
 * Kill plane system that removes entities that fall below the world threshold.
 * 
 * For entities with Health component: uses doDamage() to properly kill them,
 * which triggers OnDie effects and proper cleanup.
 * 
 * For entities without Health component: uses despawn() to remove them directly.
 * 
 * This system runs after motionSystem to check final positions after movement.
 */
export function killPlaneSystem(ctx: ECSContext): void {
  const entities = killPlaneQuery(ctx);
  
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    const y = Transform.y[eid];
    
    // Check if entity is below the kill plane
    if (y < KILL_PLANE_Y) {
      if (hasComponent(ctx, Health, eid)) {
        // Entity has health, use damage system to kill it properly
        // Use a very high damage amount to ensure death regardless of current health
        // Use entity 0 as the "actor" since this is environmental damage
        doDamage(ctx, KILL_PLANE_EID, eid, 999999);
      } else {
        // Entity has no health, despawn it directly
        despawn(ctx, eid);
      }
    }
  }
}