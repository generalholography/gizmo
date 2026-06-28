/**
 * World Initialization System
 * Provides declarative world setup analogous to entity-level spawn()
 */

import { ECSContext, getResource, setResource, getModule } from './ecs';
import { WorldDefinition, InitializeWorldOptions } from './worldSchema';
import { WorldMetadata } from './schema';
import { ReactiveMap } from '../utils/reactiveTypes';
import { Achievement } from './achievements';
import { spawn, restoreDeferredEntityReferences } from './spawn';
import { Module } from '../modules/Module';
import { SpawnerModule } from '../modules/spawner';
import { hydrateRuntimeModuleTypes } from './runtimeModuleTypes';
import { syncDimensionTerrain } from './dimensionTerrain';

/**
 * Initialize a world from a declarative definition
 * This is the world-level equivalent of spawn() for entities
 * 
 * @param ctx - ECS context
 * @param definition - Declarative world definition
 * @param options - Initialization options
 * 
 * @example
 * ```typescript
 * initialize({
 *   title: "My World",
 *   description: "An amazing world",
 *   dimensions: [{
 *     name: "base",
 *     gravity: -9.81,
 *     useDayNightCycle: false,
 *     sky: { color: "#87CEEB" }
 *   }],
 *   achievements: [{
 *     name: "First Steps",
 *     description: "Walk 10 steps",
 *     condition: {
 *       type: "compare",
 *       params: {
 *         operator: "gte",
 *         left: { type: "metric", params: { metric: "steps" } },
 *         right: { type: "literal", params: { value: 10 } }
 *       }
 *     }
 *   }]
 * });
 * ```
 */
export function initialize(
  ctx: ECSContext,
  definition: WorldDefinition,
  options: InitializeWorldOptions = {}
): void {
  const {
    merge = false,
    spawnEntities = true
  } = options;

  // Initialize metadata (title, description, tags, brandColors)
  const existingMetadata = getResource<WorldMetadata>(ctx, 'metadata');
  
  const title = definition.title ?? (merge && existingMetadata ? existingMetadata.title : 'Untitled World');
  const description = definition.description ?? (merge && existingMetadata ? existingMetadata.description : '');
  const tags = definition.tags ?? (merge && existingMetadata ? existingMetadata.tags : []);
  const brandColors = definition.brandColors ?? (merge && existingMetadata ? existingMetadata.brandColors : ['#87ceeb', '#fffacd']);
  
  // Handle dimensions - DimensionDefinition is now used directly in metadata
  // Ensure chunks array exists (add empty array if missing)
  let dimensions = definition.dimensions ?? (merge && existingMetadata ? existingMetadata.dimensions : [{
    name: 'base',
    gravity: -9.81,
    useDayNightCycle: false,
    sky: {
      color: 0x87CEEB,
      sun: {
        color: 0xFFFACD,
        intensity: 1.0,
        timeOfDay: 1200
      },
      clouds: {
        color: 0xFFFFFF,
        coverage: 0.65
      },
      stars: {
        intensity: 0.0
      }
    },
    chunks: []
  }]);
  
  // Ensure all dimensions have chunks array (even if empty)
  dimensions = dimensions.map(dim => ({
    ...dim,
    chunks: dim.chunks ?? []
  }));
  
  const metadata: WorldMetadata = {
    title,
    description,
    tags,
    brandColors,
    dimensions
  };
  
  setResource(ctx, 'metadata', metadata);

  // Restore persisted runtime module type registrations before any module instances or entities
  hydrateRuntimeModuleTypes(ctx, definition.moduleTypes);

  // Spawn dimension-level particle systems
  const dimensionParticleSystemIds: number[] = [];
  for (const dimension of dimensions) {
    if (!dimension.particleSystems || dimension.particleSystems.length === 0) continue;
    for (const system of dimension.particleSystems) {
      if (!system?.emitter) continue;
      const pos = system.position ?? { x: 0, y: 0, z: 0 };
      try {
        const eid = spawn(ctx, {
          Info: {
            name: system.name ?? `${dimension.name} Particle System`,
            description: `Dimension particle system for ${dimension.name}`,
          },
          Transform: {
            x: (pos as any).x ?? (pos as any)[0] ?? 0,
            y: (pos as any).y ?? (pos as any)[1] ?? 0,
            z: (pos as any).z ?? (pos as any)[2] ?? 0,
          },
          ParticleEmitter: system.emitter,
          WorldParticleSystem: {},
        });
        dimensionParticleSystemIds.push(eid);
      } catch (error) {
        console.error(`Failed to spawn dimension particle system '${system.name ?? 'unnamed'}':`, error);
      }
    }
  }
  if (dimensionParticleSystemIds.length > 0) {
    setResource(ctx, 'dimensionParticleSystems', dimensionParticleSystemIds);
  }

  // Initialize achievements (array format with name field)
  if (definition.achievements) {
    const achievements = getResource<ReactiveMap<Achievement>>(ctx, 'achievements');
    
    if (!achievements) {
      console.warn('Achievements resource not found, skipping achievement initialization');
    } else {
      if (!merge) {
        // Clear existing achievements if not merging
        achievements.clear();
      }
      
      // Add all achievements from definition (array format)
      for (const achievementDef of definition.achievements) {
        achievements.set(achievementDef.name, {
          description: achievementDef.description,
          condition: achievementDef.condition
        });
      }
    }
  }

  // Restore runtime-registered module instances
  if (definition.modules) {
    for (const [moduleName, instances] of Object.entries(definition.modules)) {
      if (moduleName === 'spawner') {
        continue;
      }
      const module = getModule<Module<any, any>>(ctx, moduleName);
      if (module) {
        // Register each instance from the serialized data (standard modules)
        for (const instance of instances) {
          try {
            module.register(instance.name, instance.definition);
          } catch (error) {
            console.error(`Failed to register ${moduleName} module instance '${instance.name}':`, error);
          }
        }
      } else {
        console.warn(`Module '${moduleName}' not found, skipping module instance restoration`);
      }
    }
  }

  // Restore runtime values if present
  if (definition.timeOfDay !== undefined) {
    setResource(ctx, 'timeOfDay', definition.timeOfDay);
  }

  const resolveNextStableId = (): number => {
    if (typeof definition.nextStableId === 'number' && !Number.isNaN(definition.nextStableId)) {
      return definition.nextStableId;
    }

    let maxStableId = -1;
    const scanEntity = (entity: any) => {
      const id = entity?.StableID?.id;
      if (typeof id === 'number' && !Number.isNaN(id)) {
        maxStableId = Math.max(maxStableId, id);
      }
    };

    definition.entities?.forEach(scanEntity);
    definition.dimensions
      ?.flatMap(dimension => dimension.chunks ?? [])
      .flatMap(chunk => chunk.entities ?? [])
      .forEach(scanEntity);

    return maxStableId + 1;
  };

  setResource(ctx, 'nextStableId', resolveNextStableId());

  syncDimensionTerrain(ctx, dimensions);

  // Spawn entities if defined and enabled
  if (spawnEntities) {
    // New format: Entities in dimensions[].chunks[].entities
    if (definition.dimensions && definition.dimensions.length > 0) {
      for (const dimension of definition.dimensions) {
        if (dimension.chunks && dimension.chunks.length > 0) {
          for (const chunk of dimension.chunks) {
            for (const entityDef of chunk.entities) {
              try {
                spawn(ctx, entityDef);
              } catch (error) {
                console.error('Failed to spawn entity from world definition:', error, entityDef);
              }
            }
          }
        }
      }
      
      // Restore deferred entity references
      restoreDeferredEntityReferences(ctx);
    } 
    // Legacy format: Entities at top level
    else if (definition.entities && definition.entities.length > 0) {
      for (const entityDef of definition.entities) {
        try {
          spawn(ctx, entityDef);
        } catch (error) {
          console.error('Failed to spawn entity from world definition:', error, entityDef);
        }
      }
      
      // Restore deferred entity references
      restoreDeferredEntityReferences(ctx);
    }
  }

  // Restore spawner module instances after declared entities and stable IDs are initialized,
  // because spawner restoration may execute and create owned entities.
  if (definition.modules?.spawner) {
    const spawnerMod = getModule<SpawnerModule>(ctx, 'spawner');
    if (spawnerMod) {
      spawnerMod.refreshTerrainSettings();

      for (const instance of definition.modules.spawner as Array<{ name: string; definition: any; isExecuted?: boolean; waveState?: any }>) {
        try {
          const savedState = instance.isExecuted || instance.waveState
            ? { isExecuted: instance.isExecuted, waveState: instance.waveState }
            : undefined;
          spawnerMod.registerSpawner(instance.definition, savedState);
        } catch (error) {
          console.error(`Failed to restore spawner '${instance.name}':`, error);
        }
      }
    } else {
      console.warn("Module 'spawner' not found, skipping module instance restoration");
    }
  }

  // Process spawners if defined
  if (definition.spawners && definition.spawners.length > 0) {
    const spawnerMod = getModule<SpawnerModule>(ctx, 'spawner');
    if (spawnerMod) {
      // Refresh terrain settings now that metadata is set (Phase 4 fix)
      // The spawner module is created before initialize() is called, so
      // terrain settings need to be refreshed after metadata is available
      spawnerMod.refreshTerrainSettings();
      
      // Apply spawner defaults if provided (Phase 4)
      if (definition.spawnerDefaults) {
        spawnerMod.setDefaults(definition.spawnerDefaults);
      }
      
      for (const spawnerDef of definition.spawners) {
        try {
          spawnerMod.registerSpawner(spawnerDef);
        } catch (error) {
          const spawnerName = spawnerDef.params?.name ?? 'unknown';
          console.error(`Failed to register spawner '${spawnerName}':`, error);
        }
      }
    } else {
      console.warn('Spawner module not found, skipping spawner initialization');
    }
  }

  // Run custom setup if provided (backward compatibility)
  if (options.customSetup) {
    options.customSetup(ctx);
  }
}

/**
 * Helper function to create a world definition with proper defaults
 * This makes it easier to author world definitions by providing sensible defaults
 * 
 * @param partial - Partial world definition
 * @returns Complete world definition with defaults
 */
export function createWorldDefinition(partial: Partial<WorldDefinition> = {}): WorldDefinition {
  const now = Date.now();
  
  return {
    title: partial.title || 'Untitled World',
    description: partial.description || '',
    tags: partial.tags || [],
    brandColors: partial.brandColors || ['#87ceeb', '#fffacd'],
    dimensions: partial.dimensions || [{
      name: 'main',
      gravity: -9.81,
      useDayNightCycle: false,
      sky: {
        color: 0x87CEEB,
        sun: {
          color: 0xFFFACD,
          intensity: 1.0,
          timeOfDay: 1200
        },
        clouds: {
          color: 0xFFFFFF,
          coverage: 0.65
        },
        stars: {
          intensity: 0.0
        }
      },
      chunks: [{
        chunkId: 'main',
        bounds: null,
        entities: partial.entities || [],
        entityCount: partial.entities?.length || 0,
        version: 1,
        updatedAt: now
      }]
    }],
    activeDimension: 'main',
    achievements: partial.achievements || [],
    ...(partial.modules ? { modules: partial.modules } : {}),
    ...(partial.moduleTypes ? { moduleTypes: partial.moduleTypes } : {}),
    engineVersion: '0.3.0',
  };
}
