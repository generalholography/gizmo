/**
 * Spawner Update System
 * 
 * Updates wave spawner timing by calling the spawner module's update() method
 * each frame with deltaTime. This enables automatic wave progression for
 * wave spawners that use timed delays.
 * 
 * Following engine patterns:
 * - Systems are functions that take ECSContext and perform updates
 * - deltaTime is obtained from ctx resources
 * - Systems are registered in the pipeline and run each frame
 */

import { ECSContext, getResource, getModule } from "../ecs";
import { SpawnerModule } from "../../modules/spawner";

/**
 * System to update spawner state each frame
 * 
 * This drives timed wave spawning by calling spawnerModule.update(deltaTime).
 * Waves with delay > 0 will trigger when their delay time has elapsed
 * since the previous wave.
 * 
 * Usage:
 * - Wave spawners automatically advance waves based on their delay properties
 * - delay: 0 waves spawn immediately on initialization
 * - delay: N waves spawn N seconds after the previous wave
 */
export const updateSpawnerSystem = (ctx: ECSContext): void => {
  const dt = getResource<number>(ctx, 'deltaTime') ?? 1 / 60;
  
  const spawner = getModule<SpawnerModule>(ctx, 'spawner');
  if (spawner) {
    spawner.update(dt);
  }
};
