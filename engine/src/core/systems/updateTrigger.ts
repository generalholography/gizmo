/**
 * Trigger Update System
 * 
 * Updates trigger timing by calling the trigger module's update() method
 * each frame with deltaTime. This enables automatic time-based and interval
 * trigger execution.
 * 
 * Following engine patterns:
 * - Systems are functions that take ECSContext and perform updates
 * - deltaTime is obtained from ctx resources
 * - Systems are registered in the pipeline and run each frame
 * 
 * Phase 6.1: Generic trigger system for reusable timing/event functionality
 */

import { ECSContext, getResource, getModule } from "../ecs";
import { TriggerModule } from "../../modules/trigger";
import { SpawnerModule } from "../../modules/spawner";

/**
 * System to update trigger state each frame and execute triggered spawners
 * 
 * This system:
 * 1. Resets hasFired flags from previous frame
 * 2. Updates trigger timing (calls update with deltaTime)
 * 3. Checks spawners and executes those whose triggers fired
 * 
 * Triggers fire automatically when their conditions are met:
 * - immediate: Fire on registration
 * - time: Fire after delay seconds
 * - interval: Fire every interval seconds
 * - event: Fire when event is emitted (not time-dependent)
 * - proximity: Fire when near position (TODO: Phase 8)
 * - condition: Fire when condition is met
 * 
 * Following ECS pattern:
 * - Systems poll trigger state (hasFired) instead of using callbacks
 * - Fully serializable, no callbacks stored
 * - Extensible: any system can check triggers, not just spawners
 */
export const updateTriggerSystem = (ctx: ECSContext): void => {
  const dt = getResource<number>(ctx, 'deltaTime') ?? 1 / 60;
  
  const trigger = getModule<TriggerModule>(ctx, 'trigger');
  if (!trigger) return;
  
  // 1. Reset hasFired flags from previous frame
  trigger.resetFiredFlags();
  
  // 2. Update trigger timing (sets hasFired for triggers that should fire this frame)
  trigger.update(dt);
  
  // 3. Check spawners and execute those whose triggers fired
  const spawner = getModule<SpawnerModule>(ctx, 'spawner');
  if (spawner) {
    spawner.checkTriggersAndExecute();
  }
};
