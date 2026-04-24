/**
 * Play Mode Controller
 * Manages the transition between edit mode and play mode
 */

import { ECSContext } from '../ecs';
import { serializeWorld } from '../serializeWorld';
import { WorldDefinition } from '../worldSchema';
import type { EngineAPI } from '../..';

export class PlayModeController {
  private prePlaySnapshot: WorldDefinition | null = null;
  
  /**
   * Enter play mode - saves current state and enables all game systems
   */
  enterPlayMode(ctx: ECSContext, engine: EngineAPI): void {
    console.log('[PlayMode] Entering play mode');
    
    // 1. Save current state (full snapshot for V1 implementation)
    this.prePlaySnapshot = serializeWorld(ctx, {
      includeEntities: true,
      includeRuntime: true
    });
    
    // 2. Enable game systems
    ctx.isPlaying = true;
    
    console.log('[PlayMode] Play mode active, state saved');
  }
  
  /**
   * Exit play mode - restores pre-play state
   */
  async exitPlayMode(ctx: ECSContext, engine: EngineAPI): Promise<void> {
    console.log('[PlayMode] Exiting play mode');
    
    if (!this.prePlaySnapshot) {
      console.warn('[PlayMode] No pre-play snapshot available');
      ctx.isPlaying = false;
      return;
    }
    
    // 1. Stop systems
    ctx.isPlaying = false;
    
    // 2. Generate world script from snapshot
    const worldScript = this.generateWorldScript(this.prePlaySnapshot);
    
    // 3. Reload world with pre-play state
    await engine.loadWorld(worldScript);
    
    // 4. Clear snapshot
    this.prePlaySnapshot = null;
    
    console.log('[PlayMode] Returned to edit mode');
  }
  
  /**
   * Check if we're currently in play mode
   */
  isPlaying(): boolean {
    return this.prePlaySnapshot !== null;
  }
  
  /**
   * Generate executable world script from definition
   */
  private generateWorldScript(worldDef: WorldDefinition): string {
    const worldDefStr = JSON.stringify(worldDef, null, 2);
    
    return `
// Auto-generated world script (play mode restore)
const worldDefinition = ${worldDefStr};

export default {
  setupScene(api) {
    const { initialize } = api;
    console.log('[PlayMode] Restoring world from snapshot');
    
    initialize(worldDefinition, {
      spawnEntities: true,
      merge: false
    });
    
    console.log('[PlayMode] World restored');
  }
};
`;
  }
}
