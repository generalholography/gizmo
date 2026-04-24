/**
 * Spawner Module Type Definitions
 * 
 * Phase 1 improvement: Standard { type, params } structure aligned with engine patterns
 * Phase 6.1: Added trigger support for composite spawners
 */

import { ECSContext } from "../../core/ecs";
import type { TriggerDefinition } from "../trigger";
import type { ConditionDefinition } from "../condition";
import type { MetricsKey } from "../../core/metrics";
import type { Path3D, PlacementDefinition } from "../../core/schema";

// ============================================================================
// Core Types
// ============================================================================

/** Position in 3D space */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/** Range for random values */
export interface Range {
  min: number;
  max: number;
}

/** Bounds definition for placement */
export interface Bounds {
  x: [number, number];
  z: [number, number];
  y?: [number, number];
}

/** Entity reference - can be single entity, array, or weighted selection */
export type EntityRef = string | string[] | WeightedEntity[];

/** Weighted entity for random selection */
export interface WeightedEntity {
  entity: string;
  weight: number;
}

/** Transform override for spawned entities */
export interface TransformOverride {
  x?: number | Range | { field: string; scale?: number };
  y?: number | Range | { field: string; scale?: number };
  z?: number | Range | { field: string; scale?: number };
  rx?: number | Range;
  ry?: number | Range;
  rz?: number | Range;
  sx?: number | Range;
  sy?: number | Range;
  sz?: number | Range;
  scale?: number | Range; // uniform scale shorthand
}

// ============================================================================
// Constraint Types - Now extensible via factory pattern
// ============================================================================

/** Base constraint interface */
export interface BaseConstraint {
  type: string;
}

/** Slope constraint - filter by terrain slope */
export interface SlopeConstraint extends BaseConstraint {
  type: 'slope';
  min?: number;  // Minimum slope (0-1, 0 = flat)
  max?: number;  // Maximum slope (0-1, 1 = 90 degrees)
  field?: string; // Height field to sample for slope calculation
  sampleRadius?: number; // Distance to sample for slope calculation (default: 1)
}

/** Altitude constraint - filter by height */
export interface AltitudeConstraint extends BaseConstraint {
  type: 'altitude';
  min?: number;
  max?: number;
  field?: string;
}

/** Noise constraint - filter by noise field value */
export interface NoiseConstraint extends BaseConstraint {
  type: 'noise';
  field: string;
  min?: number;
  max?: number;
}

/** Distance constraint - filter by distance from points */
export interface DistanceConstraint extends BaseConstraint {
  type: 'distance';
  from: Position | Position[];
  min?: number;
  max?: number;
}

/** Exclusion zone for exclude constraints */
export interface ExclusionZone {
  center: Position;
  radius: number;
}

/** Exclude constraint - filter by exclusion zones */
export interface ExcludeConstraint extends BaseConstraint {
  type: 'exclude';
  zones: ExclusionZone[];
}

/** Path distance constraint - filter by distance from a polyline path */
export interface PathDistanceConstraint extends BaseConstraint {
  type: 'pathDistance';
  path: Path3D;
  min?: number;
  max?: number;
}

/** Entity distance constraint - filter by distance from existing entities */
export interface EntityDistanceConstraint extends BaseConstraint {
  type: 'entityDistance';
  entityType?: string; // Optional: filter by entity type name
  min?: number;
  max?: number;
}

/** Density constraint - limit entities per area */
export interface DensityConstraint extends BaseConstraint {
  type: 'density';
  maxPerUnit: number; // Max entities per square unit
  unitSize?: number; // Size of density check area (default: 10)
}

/** Exclude spawner constraint - exclude positions within radius of another spawner's results */
export interface ExcludeSpawnerConstraint extends BaseConstraint {
  type: 'excludeSpawner';
  /** Name of the spawner whose result positions to exclude from */
  spawner: string;
  /** Radius around each spawned position to exclude */
  radius: number;
}

/** Union of all constraint types */
export type Constraint =
  | SlopeConstraint
  | AltitudeConstraint
  | NoiseConstraint
  | DistanceConstraint
  | ExcludeConstraint
  | PathDistanceConstraint
  | EntityDistanceConstraint
  | DensityConstraint
  | ExcludeSpawnerConstraint
  | { type: string; [key: string]: any }; // Allow custom constraints

/** Constraint definition for Module pattern (same as Constraint but with explicit params structure) */
export type ConstraintDefinition = { type: string; params: any };

// ============================================================================
// Spawner Result
// ============================================================================

export interface SpawnerResult {
  /** Entity IDs that were spawned */
  entityIds: number[];
  /** Positions where entities were spawned */
  positions: Position[];
}

// ============================================================================
// Base Spawner Params (common to all spawner types)
// ============================================================================

export interface BaseSpawnerParams {
  /** Unique name for this spawner */
  name: string;
  /** Whether to execute immediately on registration (default: true) */
  immediate?: boolean;
  /** Transform overrides applied to all spawned entities */
  transform?: TransformOverride;
  /** Constraints to filter positions */
  constraints?: Constraint[];
  /** Height field name for Y positioning */
  heightField?: string;
  /** 
   * Height offset to add after sampling height field (prevents z-fighting)
   * Positive values move entities up from the surface
   */
  heightOffset?: number;
  /**
   * Size of the terrain for height field coordinate normalization
   * This should match the size of the displacedPlane geometry
   * If not specified, uses dimension terrain size or derives from bounds
   * @internal Set automatically from dimension terrain configuration
   */
  terrainSize?: number;
}

// ============================================================================
// Spawner Defaults (applied to all spawners unless overridden)
// ============================================================================

/**
 * Default settings applied to all spawners in initialize()
 * Individual spawner settings override these defaults
 * 
 * Note: For terrain height projection, prefer setting `terrain` in the dimension
 * definition. This provides proper coordinate normalization that matches the
 * displaced plane geometry. spawnerDefaults.heightField is still supported for
 * backwards compatibility but terrainSize cannot be specified.
 */
export interface SpawnerDefaults {
  /** 
   * Default height field for Y positioning
   * Can be overridden per-spawner with heightField or set to null to disable
   * 
   * @deprecated Use `dimension.terrain.heightField` in the dimension definition instead
   * for proper coordinate normalization that matches the displacedPlane geometry.
   */
  heightField?: string;
  /** 
   * Default height offset applied after height field sampling
   * Prevents z-fighting for entities on terrain
   */
  heightOffset?: number;
  /** Default transform overrides applied to all spawned entities */
  transform?: TransformOverride;
}

// ============================================================================
// Canonical Composite Spawner DSL
// ============================================================================

/** Placement definition for composite spawner */
export type { PlacementDefinition };

/** Selection definition for composite spawner */
export type SelectionDefinition =
  | { type: 'single'; params: { entity: string } }
  | { type: 'random'; params: { entities: string[] } }
  | { type: 'weighted'; params: { options: WeightedEntity[] } }
  | { type: 'sequence'; params: { entities: string[]; loop?: boolean } }
  | {
      type: 'conditional';
      params: {
        conditions: ConditionalSelection[];
        fallback?: string;
        defaultSubject?: MetricsKey;
        queryContext?: Record<string, unknown>;
      };
    }
  | { type: string; params: Record<string, any> }; // Allow custom selections

/** Conditional selection rule */
export interface ConditionalSelection {
  condition: ConditionDefinition;
  entity: string;
  fallback?: string;
}

/** Post-spawn hook definition */
export type PostSpawnHook =
  | { type: 'setComponent'; params: { component: string; data: Record<string, any> } }
  | { type: 'addTag'; params: { tag: string } }
  | { type: 'setFaction'; params: { faction: string } }
  | { type: string; params: Record<string, any> }; // Allow custom hooks

/** Composite spawner params */
export interface CompositeParams extends BaseSpawnerParams {
  /** Placement strategy */
  placement: PlacementDefinition;
  /** Entity selection strategy */
  selection: SelectionDefinition;
  /** Optional trigger that controls when spawning happens (Phase 6.1) */
  trigger?: TriggerDefinition;
  /** Post-spawn hooks to modify spawned entities */
  afterSpawn?: PostSpawnHook[];
  /** Optional execution schedule folded into canonical composite DSL */
  schedule?: CompositeSchedule;
}

export interface CompositeSpawnerDef {
  type: 'composite';
  params: CompositeParams;
}

/** Single scheduled wave in canonical composite DSL */
export interface WaveDefinition {
  /** Delay in seconds before this wave executes (from start or previous wave) */
  delay: number;
  /** Number of entities to spawn in this wave */
  count: number | Range;
  /** Override entity selector for this wave */
  entity?: EntityRef;
  /** Override bounds for this wave */
  bounds?: Bounds;
  /** Override explicit positions for this wave */
  positions?: Position[];
}

/** Population management settings */
export interface PopulationSettings {
  /** Maximum total entities that can exist from this spawner */
  maxTotal: number;
  /** Spawn more when population drops below this threshold */
  respawnThreshold?: number;
  /** Seconds between respawn checks (default: 5) */
  respawnDelay?: number;
}

/** Composite schedule params - time-based and population-based spawning */
export interface CompositeSchedule {
  /** Base entity selector for scheduled waves */
  entity: EntityRef;
  /** Base bounds for scheduled waves */
  bounds: Bounds;
  /** Wave definitions */
  waves: WaveDefinition[];
  /** Whether spawner is active when registered (default: true) */
  active?: boolean;
  /** Whether waves loop after all complete (default: false) */
  loop?: boolean;
  /** Population management settings */
  population?: PopulationSettings;
}

// ============================================================================
// Union of all spawner definitions
// ============================================================================

export type SpawnerDefinition = CompositeSpawnerDef;

// ============================================================================
// Factory Types for Extension System
// ============================================================================

/** Spawner executor function type */
export type SpawnerExecutor<T extends BaseSpawnerParams = BaseSpawnerParams> = 
  (ctx: ECSContext, params: T) => SpawnerResult;

/** Placement generator function type */
export type PlacementGenerator<T = any> = 
  (params: T, ctx?: ECSContext) => Position[];

/** Selection function type */
export type SelectionFunction<T = any> = 
  (params: T, index: number, position: Position, ctx?: ECSContext) => string;

/** Constraint checker function type */
export type ConstraintChecker<T = any> = 
  (params: T, position: Position, ctx: ECSContext, heightField?: string) => boolean;

/** Post-spawn hook executor type */
export type PostSpawnHookExecutor<T = any> = 
  (params: T, entityId: number, position: Position, ctx: ECSContext) => void;

// ============================================================================
// Wave State for Runtime Control & Serialization
// ============================================================================

/** Runtime state for wave spawners (for serialization) */
export interface WaveState {
  /** Current wave index */
  currentWaveIndex: number;
  /** Time in seconds since spawner started */
  timeSinceStart: number;
  /** Time of last wave execution */
  lastWaveTime: number;
  /** Whether spawner is currently active */
  isActive: boolean;
  /** Whether all waves have completed (if not looping) */
  isComplete: boolean;
  /** Time of last population respawn check */
  lastRespawnCheck?: number;
}

// No legacy compatibility helpers are kept in hard-cut mode.
