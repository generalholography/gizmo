/**
 * This file demonstrates the kill plane system in action.
 * It shows how entities below y=-500 are automatically cleaned up.
 * 
 * Usage example in a game scenario:
 * 
 * 1. A bullet is fired but misses its target
 * 2. The bullet falls due to physics (gravity)
 * 3. When it reaches y < -500, the kill plane system removes it
 * 4. This prevents accumulation of stray projectiles in the world
 */

import { KILL_PLANE_Y, killPlaneSystem } from './killPlane';

// The kill plane constant is available for reference
console.log(`Kill plane is set at y = ${KILL_PLANE_Y}`);

// Example of how the system integrates with the game engine:
// 
// In the main game loop (src/index.ts), the system is registered as:
// addSystem(ctx, killPlaneSystem); // runs after motionSystem
//
// This ensures that after all entities have moved in a frame,
// any that have fallen below the kill plane are cleaned up.

export { KILL_PLANE_Y, killPlaneSystem };