/**
 * World Serialization System
 * Captures world state in declarative format for persistence
 */

import { ECSContext, getResource, getModule } from './ecs';
import { WorldDefinition, SerializeWorldOptions, ModuleInstanceDefinition, ensureCompleteSkyConfig } from './worldSchema';
import { WorldMetadata } from './schema';
import { ReactiveMap } from '../utils/reactiveTypes';
import { Achievement } from './achievements';
import { getEntityBundle } from './despawn';
import { defineQuery, hasComponent } from 'bitecs';
import * as Components from './components';
import { Module } from '../modules/Module';
import { listPersistedRuntimeModuleTypes } from './runtimeModuleTypes';
import { isDimensionTerrainEntity } from './dimensionTerrain';

// Query to find all entities (excluding temporary/system entities if needed)
const allEntitiesQuery = defineQuery([Components.Transform]);

/**
 * Serialize the current world state to a declarative definition
 * This is the world-level equivalent of despawn() for entities
 * 
 * @param ctx - ECS context
 * @param options - Serialization options
 * @returns World definition capturing current state
 * 
 * @example
 * ```typescript
 * const worldState = serializeWorld(ctx, { includeRuntime: true });
 * // Save worldState to file/database for later restoration
 * ```
 */
export function serializeWorld(
  ctx: ECSContext,
  options: SerializeWorldOptions = {}
): WorldDefinition {
  const {
    includeEntities = false,
    includeRuntime = true,
    excludeEntities = [],
    entitySerializationOptions = {}
  } = options;

  const definition: WorldDefinition = {};
  const now = Date.now();

  // Serialize metadata
  const metadata = getResource<WorldMetadata>(ctx, 'metadata', true);
  if (metadata) {
    definition.title = metadata.title;
    definition.description = metadata.description;
    definition.tags = metadata.tags ? [...metadata.tags] : undefined;
    definition.brandColors = metadata.brandColors ? [...metadata.brandColors] : undefined;
    
    // Use dimensions directly from metadata (already DimensionDefinition[])
    if (metadata.dimensions && metadata.dimensions.length > 0) {
      definition.dimensions = metadata.dimensions.map(dim => ({
        ...dim,
        sky: ensureCompleteSkyConfig(dim.sky),
        chunks: [] // Will be populated with entities below
      }));
      definition.activeDimension = metadata.dimensions[0].name;
    }
  }

  // If no dimensions defined, create a default dimension
  if (!definition.dimensions || definition.dimensions.length === 0) {
    definition.dimensions = [{
      name: 'main',
      gravity: -9.81,
      useDayNightCycle: false,
      sky: ensureCompleteSkyConfig(null),
      chunks: []
    }];
    definition.activeDimension = 'main';
  }

  // Serialize achievements (definitions as array with name field)
  const achievements = getResource<ReactiveMap<Achievement>>(ctx, 'achievements', true);
  if (achievements) {
    definition.achievements = [];
    for (const [name, achievement] of achievements.entries()) {
      definition.achievements.push({
        name,
        description: achievement.description,
        condition: achievement.condition
      });
    }
  }

  // Serialize runtime-registered module instances (excluding built-ins)
  // Iterate through all modules in the context and serialize any with runtime definitions
  definition.modules = {};
  
  for (const [moduleName, module] of ctx.modules.entries()) {
    if (module instanceof Module) {
      const runtimeDefs = module.getRuntimeDefinitions();
      if (runtimeDefs.length > 0) {
        definition.modules[moduleName] = runtimeDefs;
      }
    }
  }
  
  // Remove modules field if empty
  if (Object.keys(definition.modules).length === 0) {
    delete definition.modules;
  }

  const runtimeModuleTypes = listPersistedRuntimeModuleTypes(ctx);
  if (runtimeModuleTypes.length > 0) {
    definition.moduleTypes = runtimeModuleTypes;
  }

  // Serialize runtime values if requested
  if (includeRuntime) {
    // Serialize timeOfDay
    const timeOfDay = getResource<number>(ctx, 'timeOfDay', true);
    if (timeOfDay !== undefined) {
      definition.timeOfDay = timeOfDay;
    }

    // Add metadata about serialization
    definition.createdAt = now; // TODO: Track actual creation time
    definition.updatedAt = now;
    definition.serializedAt = now;
    definition.engineVersion = '0.3.0'; // TODO: Get from package.json or config
  }

  const nextStableId = getResource<number>(ctx, 'nextStableId', true);
  if (typeof nextStableId === 'number' && !Number.isNaN(nextStableId)) {
    definition.nextStableId = nextStableId;
  }

  // Collect entities and add them to chunks
  if (includeEntities) {
    const entityBundles: import('../modules/archetype').ArchetypeBundle[] = [];
    
    let entities: number[];
    try {
      // Check if Transform component is available before querying
      if (!Components.Transform) {
        console.error('[serializeWorld] Transform component is not defined');
        entities = [];
      } else {
        entities = allEntitiesQuery(ctx);
      }
    } catch (error) {
      console.error('[serializeWorld] Failed to query entities', {
        error,
        hasTransform: !!Components.Transform,
        transformType: typeof Components.Transform,
        ctxKeys: Object.keys(ctx).slice(0, 10), // Show first 10 keys for debugging
      });
      // If query fails, assume no entities to serialize
      entities = [];
    }
    
    // Prepare entity serialization options, respecting includeRuntime from world options
    const entityOptions = {
      includeRuntime,
      ...entitySerializationOptions
    };
    
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i];
      
      // Skip excluded entities
      if (excludeEntities.includes(eid)) {
        continue;
      }
      
      // Skip held item entities (they are runtime state reconstructed from inventory)
      if (Components.Held && hasComponent(ctx, Components.Held, eid)) {
        continue;
      }

      // Skip dimension-level particle system entities (serialized in world definition)
      if (Components.WorldParticleSystem && hasComponent(ctx, Components.WorldParticleSystem, eid)) {
        continue;
      }

      // Skip dimension-level terrain entities (serialized in world definition)
      if (isDimensionTerrainEntity(ctx, eid)) {
        continue;
      }

      // Skip spawner-owned generated entities; the spawner definition is the source of truth.
      if (Components.SpawnerOwned && hasComponent(ctx, Components.SpawnerOwned, eid)) {
        continue;
      }
      
      // Include player entities to preserve their metrics, achievements, and inventory
      // The player will be loaded from the save rather than re-spawned
      
      try {
        const bundle = getEntityBundle(ctx, eid, entityOptions);
        entityBundles.push(bundle);
      } catch (error) {
        console.error(`Failed to serialize entity ${eid}:`, error);
      }
    }
    
    // Add entities to first dimension's chunk
    // For now, all entities go to the first dimension's single chunk
    if (definition.dimensions && definition.dimensions.length > 0) {
      definition.dimensions[0].chunks = [{
        chunkId: 'main',
        bounds: null,  // null = entire world (single chunk)
        entities: entityBundles,
        entityCount: entityBundles.length,
        version: 1,
        updatedAt: now
      }];
    }
  } else {
    // Even without entities, create empty chunk structure
    if (definition.dimensions && definition.dimensions.length > 0) {
      definition.dimensions[0].chunks = [{
        chunkId: 'main',
        bounds: null,
        entities: [],
        entityCount: 0,
        version: 1,
        updatedAt: now
      }];
    }
  }

  return definition;
}
