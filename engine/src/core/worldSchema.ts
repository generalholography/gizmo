/**
 * Declarative World Schema
 * Provides a unified type system for world-level initialization and serialization
 */

import type { ArchetypeBundle } from '../modules/archetype';
import type { ConditionDefinition } from '../modules/condition';
import type { FieldDefinition } from '../modules/field';
import type { SpawnerDefinition, SpawnerDefaults } from '../modules/spawner';
import type { ParticleEmitter, Vector3 } from './schema';

/**
 * Default sky configuration used when dimensions don't have sky defined
 * Centralized to ensure consistency across serialization and runtime
 */
export const DEFAULT_SKY_CONFIG = {
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
} as const;

/**
 * Ensures a dimension has a complete sky configuration with all required properties
 * Fills in missing properties with defaults from DEFAULT_SKY_CONFIG
 */
export function ensureCompleteSkyConfig(sky: any): any {
  if (!sky) {
    return { ...DEFAULT_SKY_CONFIG };
  }
  
  // Ensure all required sky properties exist
  const completeSky = { ...sky };
  if (!completeSky.color) completeSky.color = DEFAULT_SKY_CONFIG.color;
  if (!completeSky.sun) completeSky.sun = { ...DEFAULT_SKY_CONFIG.sun };
  if (!completeSky.clouds) completeSky.clouds = { ...DEFAULT_SKY_CONFIG.clouds };
  if (!completeSky.stars) completeSky.stars = { ...DEFAULT_SKY_CONFIG.stars };
  
  return completeSky;
}

/**
 * Achievement definition with name field for array-based storage
 */
export interface AchievementDefinition {
  /** Achievement name/identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Condition that determines when achievement is unlocked */
  condition: ConditionDefinition;
}

/**
 * Serialized module instance
 * Represents a runtime-registered named module instance
 */
export interface ModuleInstanceDefinition {
  /** Instance name */
  name: string;
  /** Module definition (type + params) */
  definition: { type: string; params: any };
}

/**
 * Persisted runtime module type definition
 * Represents a factory-backed custom module type that can be re-registered on load
 */
export interface RuntimeModuleTypeDefinition {
  /** Target module name (e.g. 'field', 'material') */
  moduleName: string;
  /** Registered type name within that module */
  typeName: string;
  /** JavaScript source that evaluates to a factory function `(params, helpers) => resolvedValue` */
  factorySource: string;
  /** Optional human-readable description */
  description?: string;
  /** Optional JSON-schema-like description of the expected params payload */
  parameterSchema?: Record<string, any>;
}

/**
 * Declarative world definition that captures all world-level configuration
 * This is the "world-level spawn" equivalent - a complete description of world state
 * Includes both spawn-time configuration and runtime values (when serialized)
 * 
 * ENHANCED (Phase 1): Now includes dimension/chunk support
 * - engineVersion serves as schema version
 * - dimensions field upgraded to DimensionDefinition[] with chunk support
 * - entities can be at top level (legacy) or in dimensions[].chunks[].entities (new)
 * - playerState for player saves (undefined for editor spawn state)
 */
export interface WorldDefinition {
  /** World title */
  title?: string;
  
  /** World description */
  description?: string;
  
  /** Tags for categorization and filtering */
  tags?: string[];
  
  /** Brand colors for UI theming */
  brandColors?: string[];
  
  /** 
   * Dimension configurations with chunk support
   * ALWAYS an array, even if single dimension
   */
  dimensions?: DimensionDefinition[];
  
  /**
   * Active dimension name (for player spawn/camera)
   * Defaults to dimensions[0].name if not specified
   */
  activeDimension?: string;
  
  /** Achievement definitions */
  achievements?: AchievementDefinition[];
  
  /** 
   * Entities to spawn at world initialization (LEGACY)
   * Deprecated: Use dimensions[].chunks[].entities instead
   * Kept for backward compatibility with existing worlds
   */
  entities?: ArchetypeBundle[];
  
  /** 
   * Default settings applied to all spawners (Phase 4)
   * Individual spawner settings override these defaults
   * Use heightField: null in a spawner to disable the default
   */
  spawnerDefaults?: SpawnerDefaults;
  
  /** Spawner definitions for declarative procedural entity placement */
  spawners?: SpawnerDefinition[];
  
  /** 
   * Runtime-registered module instances by module type
   * Key is the module name (e.g., 'archetype', 'field', 'condition')
   * Value is an array of {name, definition} for each runtime-registered instance
   * Excludes built-in definitions registered at engine startup
   */
  modules?: Record<string, ModuleInstanceDefinition[]>;

  /**
   * Persisted runtime module type registrations
   * Each entry contains the factory source needed to re-register a custom type on load.
   */
  moduleTypes?: RuntimeModuleTypeDefinition[];
  
  /** Runtime values (included when serialized with includeRuntime: true) */
  
  /** Current time of day (0-2399, military time) - runtime value */
  timeOfDay?: number;
  
  /** Total playtime in seconds - runtime value (player saves) */
  playTime?: number;
  
  /** Timestamp when world was created - runtime value (NEW) */
  createdAt?: number;
  
  /** Timestamp when world was last updated - runtime value (NEW) */
  updatedAt?: number;
  
  /** Timestamp when world was serialized - runtime value */
  serializedAt?: number;
  
  /** 
   * Engine version for compatibility checking - runtime value
   * Also serves as schema version indicator
    * e.g., "0.3.0" indicates both engine version and schema format
   */
  engineVersion?: string;

  /**
   * Next StableID value to assign for new entities.
   * Persisted to ensure stable IDs remain monotonic across saves.
   */
  nextStableId?: number;
  
  /**
   * Player-specific data for save files (NEW)
   * Undefined/null in editor spawn state
   * Populated in player save files
   */
  playerState?: PlayerState;
}

/**
 * DimensionDefinition
 * Represents a single dimension with chunk support
 * 
 * Initially: Single dimension with name "main"
 * Future: Multiple dimensions
 */
export interface DimensionDefinition {
  /** Dimension name (e.g., "main", "overworld", "nether") */
  name: string;
  
  /** Gravity value for this dimension */
  gravity: number;
  
  /** Whether day/night cycle is enabled */
  useDayNightCycle: boolean;
  
  /** Sky configuration */
  sky: {
    color: any;  // THREE.Color | number | string
    sun?: {
      color: any;  // THREE.Color | number | string
      intensity: number;
      timeOfDay: number;
    };
    clouds?: {
      color: any;  // THREE.Color | number | string
      coverage: number;
    };
    stars?: {
      intensity: number;
    };
  };

  /** Dimension-level particle systems (weather, ambience, etc.) */
  particleSystems?: DimensionParticleSystemDefinition[];
  
  /** Terrain settings (optional) */
  terrain?: {
    enabled?: boolean;
    heightField: string | FieldDefinition;
    size: number | { x: number; z: number };
    resolution?: number;
    heightOffset?: number;
    material?: any;
    collider?: boolean;
    water?: {
      enabled: boolean;
      height?: number;
      material?: any;
    };
  };
  
  /** 
   * Chunks in this dimension (ALWAYS array, even if single chunk)
   * This prevents schema churn when adding chunking support
   */
  chunks: ChunkDefinition[];
  
  /** Portals to other dimensions (future feature) */
  portals?: Array<{
    sourceDimension: string;
    targetDimension: string;
    sourcePosition: { x: number; y: number; z: number };
    targetPosition: { x: number; y: number; z: number };
  }>;
}

/**
 * DimensionParticleSystemDefinition
 * Declarative particle emitters attached to a dimension (weather, ambience, etc.)
 */
export interface DimensionParticleSystemDefinition {
  /** Optional system name for debugging */
  name?: string;
  /** Emitter position in world space */
  position?: Vector3;
  /** Particle emitter configuration */
  emitter: ParticleEmitter;
}

/**
 * ChunkDefinition
 * Represents a spatial partition of a dimension
 * 
 * Initially: Single chunk with chunkId "main", bounds null (entire world)
 * Future: Multiple chunks with spatial bounds
 */
export interface ChunkDefinition {
  /** Chunk identifier (e.g., "main" for single chunk, "chunk_0_0_0" for spatial chunks) */
  chunkId: string;
  
  /** 
   * Spatial bounds (null = entire world for single-chunk worlds)
   * defined = spatial partition with min/max coordinates
   */
  bounds?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  } | null;
  
  /** All entities in this chunk */
  entities: ArchetypeBundle[];
  
  /** Number of entities in this chunk */
  entityCount: number;
  
  /** Chunk version (incremented on each change) */
  version: number;
  
  /** Unix timestamp (ms) when chunk was last updated */
  updatedAt: number;
}

/**
 * PlayerState
 * Player-specific data for save files
 * Undefined in editor spawn state
 */
export interface PlayerState {
  /** Player identity */
  playerId: string;
  
  /** Save slot number */
  saveSlot: number;
  
  /** Player position */
  position: { x: number; y: number; z: number };
  
  /** Player rotation (quaternion) */
  rotation: { x: number; y: number; z: number; w: number };
  
  /** Which dimension player is in */
  dimension: string;
  
  /** Inventory data (cache, full player entity also in chunks) */
  inventory?: any;
  
  /** Metrics data (cache) */
  metrics?: any;
  
  /** Unlocked achievements */
  unlockedAchievements?: string[];
}

/**
 * Options for world initialization
 */
export interface InitializeWorldOptions {
  /** Whether to merge with existing resources or replace them (default: false = replace) */
  merge?: boolean;
  
  /** Whether to spawn entities defined in the world definition (default: true) */
  spawnEntities?: boolean;
  
  /** Custom setup function to run after initialization (backward compatibility) */
  customSetup?: (api: any) => void;
}

/**
 * Serialization metadata for entity bundles
 */
export interface SerializationMetadata {
  /** Archetype name this entity was spawned from */
  archetype?: string;
  
  /** Timestamp when entity was last serialized */
  serializedAt?: number;
  
  /** Engine version that serialized this entity */
  engineVersion?: string;
  
  /** Custom metadata (for extensions) */
  custom?: Record<string, any>;
}

/**
 * Options for entity serialization
 */
export interface SerializeEntityOptions {
  /** Include runtime/transient data (AI state, cooldowns, etc.) (default: true) */
  includeRuntime?: boolean;
  
  /** Include component-level runtime data (velocities, input state, etc.) (default: false) */
  includeRuntimeComponents?: boolean;
  
  /** Use delta serialization if archetype is available (default: false) */
  useDelta?: boolean;
  
  /** Custom component filter */
  componentFilter?: (componentName: string) => boolean;
}

/**
 * Options for world serialization
 */
export interface SerializeWorldOptions {
  /** Whether to include entity snapshots in serialization (default: false) */
  includeEntities?: boolean;
  
  /** Whether to include runtime values (timeOfDay) (default: true) */
  includeRuntime?: boolean;
  
  /** Entity IDs to exclude from serialization */
  excludeEntities?: number[];
  
  /** Options for entity serialization */
  entitySerializationOptions?: SerializeEntityOptions;
}
