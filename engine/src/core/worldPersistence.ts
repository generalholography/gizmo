/**
 * World Persistence System
 * Provides save/load functionality for complete world state
 */

import { ECSContext } from './ecs';
import { WorldDefinition } from './worldSchema';
import { serializeWorld } from './serializeWorld';
import { initialize } from './initializeWorld';

/**
 * Save world state to a JSON file
 * 
 * @param ctx - ECS context
 * @param filename - Name of the file to save (default: world-save-{timestamp}.json)
 * @returns The serialized world definition
 * 
 * @example
 * ```typescript
 * const worldData = saveWorldToFile(engine.ecsWorld, 'my-world.json');
 * ```
 */
export function saveWorldToFile(
  ctx: ECSContext,
  filename?: string
): WorldDefinition {
  // Serialize complete world state with entities and runtime data
  const worldDef = serializeWorld(ctx, {
    includeEntities: true,
    includeRuntime: true
  });

  // Generate filename if not provided
  const finalFilename = filename || `world-save-${Date.now()}.json`;

  // Debug: Check if players have metrics/achievements
  const playerEntities = worldDef.entities?.filter((e: any) => e.Player !== undefined) || [];
  if (playerEntities.length > 0) {
    console.log('=== Player State Debug ===');
    playerEntities.forEach((player: any, index: number) => {
      console.log(`Player ${index + 1}:`);
      console.log('  Has Metrics:', 'Metrics' in player, player.Metrics);
      console.log('  Has UnlockedAchievements:', 'UnlockedAchievements' in player, player.UnlockedAchievements);
    });
  }

  // Create JSON blob
  const json = JSON.stringify(worldDef, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`World saved to ${finalFilename}`, worldDef);

  return worldDef;
}

/**
 * Load world state from a file
 * Opens a file picker and loads the selected world definition
 * Returns the loaded world definition as a string that can be passed to loadWorld()
 * 
 * @param onLoad - Callback when world is loaded with the world script string
 * @param onError - Callback when loading fails
 * 
 * @example
 * ```typescript
 * loadWorldFromFile(
 *   (worldScript) => engine.loadWorld(worldScript),
 *   (error) => console.error('Failed to load:', error)
 * );
 * ```
 */
export function loadWorldFromFile(
  onLoad: (worldScript: string) => void,
  onError?: (error: Error) => void
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target?.files?.[0];

    if (!file) {
      const error = new Error('No file selected');
      console.error(error);
      onError?.(error);
      return;
    }

    try {
      const text = await file.text();
      const worldDef = JSON.parse(text) as WorldDefinition;

      console.log('Loading world from file:', file.name, worldDef);

      // Generate world script that initializes from the loaded definition
      const worldScript = generateWorldScriptFromDefinition(worldDef);

      console.log('World loaded successfully from', file.name);
      onLoad(worldScript);
    } catch (error) {
      console.error('Failed to load world:', error);
      onError?.(error as Error);
    }
  };

  // Trigger file picker
  input.click();
}

/**
 * Generate a world script from a world definition
 * Creates a JavaScript module that can be loaded by the engine
 */
function generateWorldScriptFromDefinition(worldDef: WorldDefinition): string {
  // Stringify the world definition for embedding in the script
  const worldDefStr = JSON.stringify(worldDef, null, 2);

  return `
// Auto-generated world script from saved world
const worldDefinition = ${worldDefStr};

export default {
  setupScene(api) {
    const { initialize } = api;
    console.log('Loading world from saved state');
    
    // Initialize world from saved definition
    // Note: api.initialize is already bound to ctx, so we don't pass it again
    initialize(worldDefinition, {
      spawnEntities: true,
      merge: false
    });
    
    console.log('World loaded from saved state');
  }
};
`;
}

/**
 * Create a save file from world definition (without triggering download)
 * Useful for programmatic access to save data
 * 
 * @param ctx - ECS context
 * @returns JSON string of the world definition
 */
export function serializeWorldToJSON(ctx: ECSContext): string {
  const worldDef = serializeWorld(ctx, {
    includeEntities: true,
    includeRuntime: true
  });

  return JSON.stringify(worldDef, null, 2);
}

/**
 * Load world from JSON string
 * Returns a world script that can be passed to loadWorld()
 * 
 * @param json - JSON string containing world definition
 * @returns World script string
 */
export function loadWorldFromJSON(json: string): string {
  const worldDef = JSON.parse(json) as WorldDefinition;
  return generateWorldScriptFromDefinition(worldDef);
}
