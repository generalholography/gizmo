/**
 * Spawner Module - Core Implementation
 * 
 * Implements phases 1-5 of the improvement plan:
 * - Phase 1: Standard { type, params } structure, Module base class alignment
 * - Phase 2: Extension system with registerType, registerPlacement, etc.
 * - Phase 3: Cluster spawner, path spawner, Poisson distribution, post-spawn hooks
 * - Phase 4: Syntax polish (spawnerDefaults, 2D paths, heightOffset, excludeSpawner)
 * - Phase 5: Wave spawner with runtime control and serialization
 */

import { ECSContext, getModule, getResource } from "../../core/ecs";
import { spawn } from "../../core/spawn";
import { Module } from "../Module";
import type { WorldMetadata } from "../../core/schema";
import { TriggerModule, triggerModule } from "../trigger";

// Re-export all types
export * from './types';

import {
  Position,
  Range,
  Bounds,
  EntityRef,
  WeightedEntity,
  TransformOverride,
  Constraint,
  SpawnerResult,
  BaseSpawnerParams,
  CompositeParams,
  CompositeSchedule,
  WaveState,
  WaveDefinition,
  SpawnerDefinition,
  SpawnerExecutor,
  PlacementDefinition,
  SelectionDefinition,
  PostSpawnHook,
  PostSpawnHookExecutor,
  SpawnerDefaults,
} from './types';

type WaveParams = any;

import {
  randomInRange,
  resolveCount,
  resolveValue,
  PlacementModule,
} from './placement';

import {
  selectEntityFromRef,
  SelectionModule,
} from './selection';

import {
  sampleHeight,
  setSpawnerResultsGetter,
  getTerrainSettings,
  DEFAULT_NORMALIZATION_SIZE,
  TerrainSettings,
  ConstraintsModule,
} from './constraints';

// Re-export modules for external use
export { PlacementModule, SelectionModule, ConstraintsModule };

// ============================================================================
// Spawner Executor Registry
// ============================================================================

const executorRegistry: Map<string, SpawnerExecutor> = new Map();

/** Register a composite spawner executor */
export function registerSpawnerType<T extends BaseSpawnerParams = BaseSpawnerParams>(
  type: string,
  executor: SpawnerExecutor<T>
): void {
  executorRegistry.set(type, executor as SpawnerExecutor);
}

/** Get a spawner executor by type */
export function getSpawnerExecutor(type: string): SpawnerExecutor | undefined {
  return executorRegistry.get(type);
}

/** Get all registered spawner types */
export function getSpawnerTypes(): string[] {
  return Array.from(executorRegistry.keys());
}

// ============================================================================
// Post-Spawn Hook Registry
// ============================================================================

const hookRegistry: Map<string, PostSpawnHookExecutor> = new Map();

function compositeToWaveParams(params: CompositeParams): WaveParams | undefined {
  const schedule = params.schedule;
  if (!schedule) return undefined;
  return {
    ...params,
    entity: schedule.entity,
    bounds: schedule.bounds,
    waves: schedule.waves,
    loop: schedule.loop,
    active: schedule.active,
    population: schedule.population,
  } as WaveParams;
}

/** Register a custom post-spawn hook */
export function registerPostSpawnHook<T = any>(type: string, executor: PostSpawnHookExecutor<T>): void {
  hookRegistry.set(type, executor as PostSpawnHookExecutor);
}

/** Get a post-spawn hook executor by type */
export function getPostSpawnHook(type: string): PostSpawnHookExecutor | undefined {
  return hookRegistry.get(type);
}

// ============================================================================
// Transform Override Helper
// ============================================================================

/**
 * Apply transform overrides to position
 * 
 * Transform precedence rules:
 * - Individual scale (sx, sy, sz) overrides uniform scale
 * - If uniform scale is set, it applies to all axes first
 * - Then individual scale values replace their specific axis
 * - Example: scale: 0.8, sy: 1.5 → sx=0.8, sy=1.5, sz=0.8
 */
function applyTransformOverrides(
  ctx: ECSContext,
  basePos: Position,
  transform: TransformOverride | undefined,
  heightOffset: number = 0
): Record<string, number> {
  const result: Record<string, number> = {
    x: basePos.x,
    y: basePos.y + heightOffset,
    z: basePos.z,
  };
  
  if (!transform) return result;
  
  // Handle scale shorthand (uniform scale applied first)
  if (transform.scale !== undefined) {
    const s = resolveValue(transform.scale, 1);
    result.sx = s;
    result.sy = s;
    result.sz = s;
  }
  
  // Individual scale overrides (replaces specific axes)
  if (transform.sx !== undefined) result.sx = resolveValue(transform.sx, 1);
  if (transform.sy !== undefined) result.sy = resolveValue(transform.sy, 1);
  if (transform.sz !== undefined) result.sz = resolveValue(transform.sz, 1);
  
  // Rotation overrides
  if (transform.rx !== undefined) result.rx = resolveValue(transform.rx, 0);
  if (transform.ry !== undefined) result.ry = resolveValue(transform.ry, 0);
  if (transform.rz !== undefined) result.rz = resolveValue(transform.rz, 0);
  
  return result;
}

// ============================================================================
// Built-in Spawner Executors
// ============================================================================

/** Get the terrain size for height sampling - uses params.terrainSize or derives from bounds */
function getTerrainSizeForParams(params: { terrainSize?: number; bounds?: Bounds }): number {
  if (params.terrainSize !== undefined) {
    return params.terrainSize;
  }
  if (params.bounds) {
    return Math.max(
      params.bounds.x[1] - params.bounds.x[0],
      params.bounds.z[1] - params.bounds.z[0]
    );
  }
  return DEFAULT_NORMALIZATION_SIZE;
}

/** Execute composite spawner */
const executeComposite: SpawnerExecutor<CompositeParams> = (ctx, params) => {
  const entityIds: number[] = [];
  const positions: Position[] = [];
  const heightOffset = params.heightOffset ?? 0;
  const terrainSize = params.terrainSize ?? DEFAULT_NORMALIZATION_SIZE;

  const getTangentHeading = (values: Position[], index: number): number | undefined => {
    const current = values[index];
    if (!current) return undefined;
    const prev = index > 0 ? values[index - 1] : undefined;
    const next = index < values.length - 1 ? values[index + 1] : undefined;

    let dx = 0;
    let dz = 0;
    if (prev && next) {
      dx = next.x - prev.x;
      dz = next.z - prev.z;
    } else if (next) {
      dx = next.x - current.x;
      dz = next.z - current.z;
    } else if (prev) {
      dx = current.x - prev.x;
      dz = current.z - prev.z;
    }

    if (Math.hypot(dx, dz) <= 1e-6) return undefined;
    return Math.atan2(dx, dz);
  };

  const getPlacementOrientationYaw = (placement: PlacementDefinition, values: Position[], index: number): number | undefined => {
    const orientation = placement.type === 'polyline'
      ? (placement.params.orientation ?? 'none')
      : 'none';

    if (orientation === 'none') return undefined;

    if (orientation === 'fixed') {
      if (placement.type !== 'polyline') return 0;
      return Number.isFinite(placement.params.fixedYaw) ? placement.params.fixedYaw : 0;
    }

    if (orientation === 'tangent') {
      return getTangentHeading(values, index);
    }

    if (orientation !== 'radial') {
      return undefined;
    }

    const current = values[index];
    if (!current) return undefined;

    let center: Position | undefined;
    if (placement.type === 'circle' || placement.type === 'spiral') {
      center = placement.params.center;
    } else if (placement.type === 'line') {
      center = {
        x: (placement.params.start.x + placement.params.end.x) / 2,
        y: (placement.params.start.y + placement.params.end.y) / 2,
        z: (placement.params.start.z + placement.params.end.z) / 2,
      };
    }

    if (!center && values.length > 0) {
      const total = values.reduce(
        (acc, pos) => {
          acc.x += pos.x;
          acc.y += pos.y;
          acc.z += pos.z;
          return acc;
        },
        { x: 0, y: 0, z: 0 },
      );

      center = {
        x: total.x / values.length,
        y: total.y / values.length,
        z: total.z / values.length,
      };
    }

    if (!center) return undefined;

    const dx = current.x - center.x;
    const dz = current.z - center.z;
    if (Math.hypot(dx, dz) <= 1e-6) return undefined;
    return Math.atan2(dx, dz);
  };
  
  // Generate positions
  const allPositions = getModule<PlacementModule>(ctx, "placement")!.generate(params.placement);
  
  // Filter through constraints
  const validPositions = allPositions.filter(pos => 
    getModule<ConstraintsModule>(ctx, "constraints")!.passesAll(params.constraints, pos, ctx, params.heightField)
  );
  
  // Spawn entities
  for (let i = 0; i < validPositions.length; i++) {
    let pos = validPositions[i];
    
    // Sample height if field provided
    if (params.heightField) {
      pos = { ...pos, y: sampleHeight(ctx, params.heightField, pos.x, pos.z, terrainSize) };
    }
    
    const entityName = getModule<SelectionModule>(ctx, "selection")!.select(params.selection, i, pos, ctx);
    const transformOverrides = applyTransformOverrides(ctx, pos, params.transform, heightOffset);

    if (params.transform?.ry === undefined) {
      const heading = getPlacementOrientationYaw(params.placement, validPositions, i);
      if (Number.isFinite(heading)) {
        transformOverrides.ry = heading;
      }
    }
    
    try {
      const eid = spawn(ctx, entityName, { Transform: transformOverrides });
      entityIds.push(eid);
      positions.push(pos);
      
      // Execute post-spawn hooks (Phase 3)
      if (params.afterSpawn) {
        for (const hook of params.afterSpawn) {
          const hookExecutor = getPostSpawnHook(hook.type);
          if (hookExecutor) {
            hookExecutor(hook.params, eid, pos, ctx);
          } else {
            console.warn(`Unknown post-spawn hook type: '${hook.type}'`);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to spawn entity '${entityName}':`, e);
    }
  }
  
  return { entityIds, positions };
};

// ============================================================================
// Wave Spawner Executor (Phase 5: Runtime Spawning)
// ============================================================================

/**
 * Execute wave spawner
 * 
 * IMPORTANT: Wave timing limitations
 * ---------------------------------
 * Currently, all waves execute immediately when the spawner runs. The `delay`
 * property in wave definitions is recorded but NOT enforced during execution.
 * 
 * Full wave timing (respecting delays) requires:
 * 1. Integration with game loop/update system
 * 2. Scheduler to track time since spawner start
 * 3. Per-wave execution on delay thresholds
 * 
 * For time-based wave spawning, use the runtime control API:
 * - spawner.triggerNextWave(name) - manually advance waves
 * - spawner.getWaveState(name) - check current wave index
 * - Game logic manages timing between waves
 * 
 * For automatic timed wave spawning, use the update() method:
 * @example
 * ```javascript
 * // Automatic wave timing (call in game loop):
 * function update(delta) {
 *   spawnerModule.update(delta); // Handles timed waves automatically
 * }
 * ```
 * 
 * Or for manual control:
 * @example
 * ```javascript
 * // Manual wave advancement:
 * spawner.triggerNextWave('enemies');
 * ```
 */
const executeWave: SpawnerExecutor<WaveParams> = (ctx, params) => {
  // Wave spawner only executes the first wave (delay=0) on initialization
  // Subsequent waves are triggered via update() or triggerNextWave()
  const entityIds: number[] = [];
  const positions: Position[] = [];
  const heightOffset = params.heightOffset ?? 0;
  const terrainSize = getTerrainSizeForParams(params);
  
  // Find waves with delay=0 to execute immediately
  for (let waveIndex = 0; waveIndex < params.waves.length; waveIndex++) {
    const wave = params.waves[waveIndex];
    
    // Only execute waves with delay=0 on initialization
    if (wave.delay !== 0) continue;
    
    const spawned = executeWaveInternal(ctx, params, wave, waveIndex, terrainSize, heightOffset);
    entityIds.push(...spawned.entityIds);
    positions.push(...spawned.positions);
  }
  
  return { entityIds, positions };
};

/**
 * Internal helper to execute a single wave
 * Used by both initial execution and triggerNextWave
 */
function executeWaveInternal(
  ctx: ECSContext,
  params: WaveParams,
  wave: WaveDefinition,
  waveIndex: number,
  terrainSize: number,
  heightOffset: number
): SpawnerResult {
  const entityIds: number[] = [];
  const positions: Position[] = [];
  
  const count = resolveCount(wave.count);
  const bounds = wave.bounds ?? params.bounds;
  const entity = wave.entity ?? params.entity;
  
  // If wave has specific positions, use them
  if (wave.positions && wave.positions.length > 0) {
    for (let i = 0; i < Math.min(count, wave.positions.length); i++) {
      const basePos = wave.positions[i];
      let y = basePos.y;
      
      if (params.heightField) {
        y = sampleHeight(ctx, params.heightField, basePos.x, basePos.z, terrainSize);
      }
      
      const pos: Position = { x: basePos.x, y, z: basePos.z };
      const entityName = selectEntityFromRef(entity);
      const transformOverrides = applyTransformOverrides(ctx, pos, params.transform, heightOffset);
      
      try {
        const eid = spawn(ctx, entityName, { Transform: transformOverrides });
        entityIds.push(eid);
        positions.push(pos);
      } catch (e) {
        console.warn(`Failed to spawn entity '${entityName}' in wave ${waveIndex}:`, e);
      }
    }
  } else {
    // Scatter within bounds
    const maxAttempts = count * 3;
    let attempts = 0;
    let spawned = 0;
    
    while (spawned < count && attempts < maxAttempts) {
      attempts++;
      
      const x = bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]);
      const z = bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]);
      let y = bounds.y 
        ? bounds.y[0] + Math.random() * (bounds.y[1] - bounds.y[0])
        : 0;
      
      if (params.heightField) {
        y = sampleHeight(ctx, params.heightField, x, z, terrainSize);
      }
      
      const pos: Position = { x, y, z };
      
      if (!getModule<ConstraintsModule>(ctx, "constraints")!.passesAll(params.constraints, pos, ctx, params.heightField)) {
        continue;
      }
      
      const entityName = selectEntityFromRef(entity);
      const transformOverrides = applyTransformOverrides(ctx, pos, params.transform, heightOffset);
      
      try {
        const eid = spawn(ctx, entityName, { Transform: transformOverrides });
        entityIds.push(eid);
        positions.push(pos);
        spawned++;
      } catch (e) {
        console.warn(`Failed to spawn entity '${entityName}' in wave ${waveIndex}:`, e);
      }
    }
  }
  
  return { entityIds, positions };
}

// ============================================================================
// Register built-in spawner types
// ============================================================================

registerSpawnerType('composite', executeComposite);

// ============================================================================
// Register built-in post-spawn hooks (Phase 3)
// ============================================================================

registerPostSpawnHook('setComponent', (params, entityId, position, ctx) => {
  // Would need entity component access - placeholder
  console.log(`setComponent hook: ${params.component} on entity ${entityId}`);
});

registerPostSpawnHook('addTag', (params, entityId, position, ctx) => {
  // Would need tag system access - placeholder
  console.log(`addTag hook: ${params.tag} on entity ${entityId}`);
});

registerPostSpawnHook('setFaction', (params, entityId, position, ctx) => {
  // Would need faction system access - placeholder  
  console.log(`setFaction hook: ${params.faction} on entity ${entityId}`);
});

// ============================================================================
// Spawner Module Class
// ============================================================================

interface SpawnerState {
  definition: SpawnerDefinition;
  result?: SpawnerResult;
  isExecuted: boolean;
  waveState?: WaveState;
  loopTriggerName?: string; // Name of the loop trigger for wave spawners with loop enabled
}

export interface SpawnerModuleDefinition {
  type: string;
  params: any;
}

/**
 * Saved state for spawner restoration during save/load
 * Includes isExecuted for all spawners and waveState for wave spawners
 */
export interface SavedSpawnerState {
  /** Whether the spawner has been executed (prevents re-execution on load) */
  isExecuted?: boolean;
  /** Wave-specific state (for composite schedule spawners) */
  waveState?: WaveState;
}

/**
 * SpawnerModule - Manages declarative entity spawning
 * 
 * Extends Module base class for compatibility with the module system,
 * but uses its own internal state management for spawner-specific behavior.
 * 
 * Phases 4-5 additions:
 * - spawnerDefaults support for default heightField, heightOffset, transform
 * - Wave spawner runtime control (pause/resume/reset/trigger)
 * - excludeSpawner constraint support via result reference getter
 * - Dimension-level terrain settings for proper height field coordinate normalization
 * 
 * Phase 6.1 additions:
 * - Integration with trigger module for wave spawner timing
 * - Trigger support in composite spawners for advanced composition
 */
/**
 * SpawnerModule - Manages declarative entity spawning
 * 
 * FOLLOWS MODULE PATTERN WITH JUSTIFIED DIVERGENCES:
 * 
 * Core Principles Followed:
 * 1. ✅ Extends Module<SpawnerModuleDefinition, SpawnerState>
 * 2. ✅ Uses {type, params} structure via SpawnerDefinition
 * 3. ✅ Uses registerType() for spawner type factories
 * 4. ✅ Calls addDefinition() for all registrations
 * 5. ✅ Marks built-in spawner types as built-in
 * 
 * Justified Divergences:
 * 1. Custom state management (spawnerStates Map):
 *    - Tracks execution state (isExecuted, waveState, SpawnerResult)
 *    - Spawners are executable entities, not just resolvable definitions
 * 2. Runtime control API (execute, getResult, pauseWave, etc.):
 *    - Spawners need runtime operations beyond resolution
 * 3. Defaults system integration:
 *    - setDefaults() applies to all spawners
 *    - Integrates with dimension terrain configuration
 * 4. Override register() for spawner-specific initialization:
 *    - Applies defaults, sets up triggers, handles immediate execution
 */
export class SpawnerModule extends Module<SpawnerModuleDefinition, SpawnerState> {
  private spawnerStates: Map<string, SpawnerState> = new Map();
  private _defaults: SpawnerDefaults = {};
  private _terrainSettings: TerrainSettings | undefined;
  private _triggerModule: TriggerModule | undefined;
  private _placementModule: PlacementModule | undefined;
  private _selectionModule: SelectionModule | undefined;
  private _constraintsModule: ConstraintsModule | undefined;
  
  constructor(ctx: ECSContext) {
    // Initialize with spawner type factories
    super(ctx, {});
    
    // Register all built-in spawner types using base Module.registerType()
    this.registerType('composite', (params: any) => this.executeSpawnerType('composite', params));
    
    // Set up the spawner results getter for excludeSpawner constraint
    setSpawnerResultsGetter((name: string) => this.getResult(name));
    
    // Pull terrain settings from dimension configuration
    this._terrainSettings = getTerrainSettings(ctx);
  }
  
  /**
   * Execute a spawner by type using the global executor registry
   * This bridges between Module pattern (factories) and spawner pattern (executors)
   */
  private executeSpawnerType(type: string, params: any): SpawnerState {
    // Create initial state - will be populated during execution
    const state: SpawnerState = {
      definition: { type, params } as SpawnerDefinition,
      isExecuted: false,
    };
    return state;
  }
  
  /**
   * Get or create the trigger module
   * Lazy initialization to avoid circular dependencies
   */
  private getTriggerModule(): TriggerModule {
    if (!this._triggerModule) {
      // Try to get existing trigger module from context (hide warnings during check)
      const existing = getModule<TriggerModule>(this.ctx, 'trigger', true);
      if (existing) {
        this._triggerModule = existing;
      } else {
        // Create new trigger module instance
        this._triggerModule = triggerModule(this.ctx);
        // Register it in the context for other systems to use
        this.ctx.modules.set('trigger', this._triggerModule);
      }
    }
    return this._triggerModule;
  }
  
  /**
   * Get placement module
   */
  private getPlacementModule(): PlacementModule {
    if (!this._placementModule) {
      this._placementModule = getModule<PlacementModule>(this.ctx, 'placement');
      if (!this._placementModule) {
        throw new Error('Placement module not found in context');
      }
    }
    return this._placementModule;
  }
  
  /**
   * Get selection module
   */
  private getSelectionModule(): SelectionModule {
    if (!this._selectionModule) {
      this._selectionModule = getModule<SelectionModule>(this.ctx, 'selection');
      if (!this._selectionModule) {
        throw new Error('Selection module not found in context');
      }
    }
    return this._selectionModule;
  }
  
  /**
   * Get constraints module
   */
  private getConstraintsModule(): ConstraintsModule {
    if (!this._constraintsModule) {
      this._constraintsModule = getModule<ConstraintsModule>(this.ctx, 'constraints');
      if (!this._constraintsModule) {
        throw new Error('Constraints module not found in context');
      }
    }
    return this._constraintsModule;
  }
  
  /**
   * Check if position passes all constraints (helper method)
   */
  private passesConstraints(
    position: Position,
    constraints: Constraint[] | undefined,
    heightField?: string
  ): boolean {
    if (!constraints || constraints.length === 0) return true;
    return this.getConstraintsModule().passesAll(constraints, position, this.ctx, heightField);
  }
  
  /**
   * Set defaults that apply to all spawners (Phase 4)
   * These can be overridden per-spawner
   */
  setDefaults(defaults: SpawnerDefaults): void {
    this._defaults = { ...this._defaults, ...defaults };
  }
  
  /**
   * Get current spawner defaults
   */
  getDefaults(): SpawnerDefaults {
    return { ...this._defaults };
  }
  
  /**
   * Get terrain settings from dimension configuration
   */
  getTerrainSettings(): TerrainSettings | undefined {
    return this._terrainSettings;
  }
  
  /**
   * Refresh terrain settings from dimension configuration
   * Call this after dimension metadata is updated
   */
  refreshTerrainSettings(): void {
    this._terrainSettings = getTerrainSettings(this.ctx);
  }
  
  /**
   * Apply defaults to spawner params
   * Priority: spawner-specific > spawnerDefaults > dimension terrain
   */
  private applyDefaults(params: BaseSpawnerParams, bounds?: Bounds): BaseSpawnerParams {
    const result = { ...params };
    
    // First apply dimension terrain settings as the base defaults
    if (this._terrainSettings) {
      if (result.heightField === undefined) {
        result.heightField = this._terrainSettings.heightField;
      }
      if (result.heightOffset === undefined && this._terrainSettings.heightOffset !== undefined) {
        result.heightOffset = this._terrainSettings.heightOffset;
      }
      // Set terrain size from dimension settings
      if (result.terrainSize === undefined) {
        result.terrainSize = this._terrainSettings.size;
      }
    }
    
    // Then apply spawnerDefaults (overrides dimension terrain)
    if (result.heightField === undefined && this._defaults.heightField !== undefined) {
      result.heightField = this._defaults.heightField;
    }
    if (result.heightOffset === undefined && this._defaults.heightOffset !== undefined) {
      result.heightOffset = this._defaults.heightOffset;
    }
    
    // Merge transform defaults (spawner transform takes precedence)
    if (this._defaults.transform) {
      result.transform = { ...this._defaults.transform, ...result.transform };
    }
    
    // If terrainSize still not set, derive from bounds as fallback
    if (result.terrainSize === undefined && bounds) {
      result.terrainSize = Math.max(
        bounds.x[1] - bounds.x[0],
        bounds.z[1] - bounds.z[0]
      );
    }
    
    return result;
  }
  
  /**
   * Get the terrain size for height field coordinate normalization
   * Returns dimension terrain size, or derives from bounds as fallback
   */
  getTerrainSize(bounds?: Bounds): number {
    // Prefer dimension terrain size
    if (this._terrainSettings) {
      return this._terrainSettings.size;
    }
    // Fallback: derive from bounds
    if (bounds) {
      return Math.max(
        bounds.x[1] - bounds.x[0],
        bounds.z[1] - bounds.z[0]
      );
    }
    return DEFAULT_NORMALIZATION_SIZE;
  }
  
  /**
   * Register a canonical composite spawner definition
   */
  registerSpawner(def: SpawnerDefinition, savedState?: SavedSpawnerState): void {
    const normalized = def;

    if (!normalized.params || typeof normalized.params !== 'object') {
      throw new Error(
        'Spawner definition must use canonical schema: { type: "composite", params: { name, placement, selection, ... } }'
      );
    }
    
    if (!normalized.params.name) {
      throw new Error('Spawner definition must have a name');
    }
    
    // Extract bounds from params for terrain size fallback calculation
    const paramsWithBounds = normalized.params as any;
    const bounds = paramsWithBounds.bounds as Bounds | undefined;
    
    // Apply defaults to params (pass bounds for terrain size fallback)
    normalized.params = this.applyDefaults(normalized.params, bounds) as any;
    
    let isRestoringFromSave = false;
    let waveStateToRestore: WaveState | undefined;
    
    if (savedState) {
      isRestoringFromSave = savedState.isExecuted === true;
      waveStateToRestore = savedState.waveState;
    }
    
    const state: SpawnerState = {
      definition: normalized,
      isExecuted: isRestoringFromSave,
    };
    
    // Initialize wave state for composite schedules
    if (normalized.type === 'composite' && (normalized.params as CompositeParams).schedule) {
      const waveParams = compositeToWaveParams(normalized.params as CompositeParams)!;
      // Restore saved wave state if provided, otherwise initialize fresh
      if (waveStateToRestore) {
        state.waveState = { ...waveStateToRestore };
      } else {
        state.waveState = {
          currentWaveIndex: 0,
          timeSinceStart: 0,
          lastWaveTime: 0,
          isActive: waveParams.active !== false,
          isComplete: false,
        };
      }
    }
    
    // Phase 6.1: Handle composite spawners with triggers
    let hasCompositeTrigger = false;
    if (normalized.type === 'composite') {
      const compositeParams = normalized.params as CompositeParams;
      if (compositeParams.trigger && !isRestoringFromSave) {
        // Mark as not executed yet - will execute when trigger fires
        state.isExecuted = false;
        hasCompositeTrigger = true;
      }
    }
    
    // Add to base Module - this calls addDefinition() and resolve() which creates the SpawnerState
    // The state is stored in both base Module registry and our spawnerStates map
    this.addDefinition(normalized.params.name, normalized as any, false);
    const id = this.resolve(normalized.params.name);
    const resolvedState = this.get(id);
    
    // Update the resolved state with our execution-specific data
    resolvedState.definition = normalized;
    resolvedState.isExecuted = state.isExecuted;
    if (state.waveState) {
      resolvedState.waveState = state.waveState;
    }
    
    // IMPORTANT: Add state to map BEFORE setting up triggers
    // Triggers may call back into methods that need the state
    // Store reference to same state object used by base Module
    this.spawnerStates.set(normalized.params.name, resolvedState);
    
    // Phase 6.1: Set up triggers for wave timing (after state is in map)
    if (normalized.type === 'composite' && (normalized.params as CompositeParams).schedule) {
      const waveParams = compositeToWaveParams(normalized.params as CompositeParams)!;
      const waveState = resolvedState.waveState;
      const timeSinceStart = waveState?.timeSinceStart ?? 0;
      this.setupWaveTriggersForSpawner(normalized.params.name, waveParams, timeSinceStart);
    }
    
    // Phase 6.1: Set up triggers for composite spawners (after state is in map)
    if (hasCompositeTrigger) {
      const compositeParams = normalized.params as CompositeParams;
      this.setupCompositeSpawnerTrigger(normalized.params.name, compositeParams);
    }
    
    // Execute immediately if:
    // 1. immediate is true (default)
    // 2. NOT restoring from save (isExecuted would be true)
    // 3. NOT a composite spawner with a trigger (those execute when trigger fires)
    const shouldExecuteImmediately = normalized.params.immediate !== false && 
                                      !isRestoringFromSave && 
                                      !hasCompositeTrigger;
    
    if (shouldExecuteImmediately) {
      this.execute(normalized.params.name);
    }
  }
  
  /**
   * Override register to support spawner-specific types
   * Enforces canonical { type, params } schema for spawner definitions
   */
  override register(name: string, defOrBase: SpawnerModuleDefinition | string, overrides?: Partial<SpawnerModuleDefinition>): SpawnerState {
    // Handle the case where defOrBase is a spawner definition
    if (typeof defOrBase !== 'string') {
      const spawnerDef: SpawnerDefinition = defOrBase as any;

      if (!spawnerDef.params || typeof spawnerDef.params !== 'object') {
        throw new Error(
          'Legacy flat spawner schema is deprecated. Use { type: "composite", params: { ... } }.'
        );
      }

      spawnerDef.params.name = name;
      
      this.registerSpawner(spawnerDef);
      return this.spawnerStates.get(name)!;
    }
    
    // If it's a string (base name reference), use parent implementation
    return super.register(name, defOrBase, overrides ?? {} as any);
  }
  
  /**
   * Execute a spawner by name
   */
  execute(name: string): SpawnerResult {
    const state = this.spawnerStates.get(name);
    if (!state) {
      throw new Error(`Spawner '${name}' not found. Registered spawners: ${this.getSpawnerNames().join(', ')}`);
    }
    
    const def = state.definition;
    const executor = getSpawnerExecutor(def.type);
    
    if (!executor) {
      throw new Error(
        `Unknown spawner type: '${def.type}'. ` +
        `Available types: ${getSpawnerTypes().join(', ')}`
      );
    }
    
    let result: SpawnerResult;
    if (def.type === 'composite' && (def.params as CompositeParams).schedule) {
      const waveParams = compositeToWaveParams(def.params as CompositeParams)!;
      result = executeWave(this.ctx, waveParams);
    } else {
      result = executor(this.ctx, def.params);
    }
    
    state.result = result;
    state.isExecuted = true;
    
    // For wave spawners, track which delay=0 waves were executed and set next wave index
    if (def.type === 'composite' && (def.params as CompositeParams).schedule && state.waveState) {
      const waveParams = compositeToWaveParams(def.params as CompositeParams)!;
      // Count all delay=0 waves that were executed on initialization
      let executedCount = 0;
      for (let i = 0; i < waveParams.waves.length; i++) {
        if (waveParams.waves[i].delay === 0) {
          executedCount++;
        }
      }
      // Find the first non-executed wave (first wave with delay > 0)
      let nextWaveIndex = 0;
      for (let i = 0; i < waveParams.waves.length; i++) {
        if (waveParams.waves[i].delay > 0) {
          nextWaveIndex = i;
          break;
        }
        // If all waves have delay=0, point to one past the end
        if (i === waveParams.waves.length - 1) {
          nextWaveIndex = waveParams.waves.length;
        }
      }
      state.waveState.currentWaveIndex = nextWaveIndex;
    }
    
    return result;
  }
  
  /**
   * Execute all registered spawners that haven't been executed yet
   */
  executeAll(): void {
    for (const [name, state] of this.spawnerStates) {
      if (!state.isExecuted) {
        this.execute(name);
      }
    }
  }
  
  /**
   * Get the result of a spawner execution
   */
  getResult(name: string): SpawnerResult | undefined {
    return this.spawnerStates.get(name)?.result;
  }
  
  /**
   * Check if a spawner has been executed
   */
  isExecuted(name: string): boolean {
    return this.spawnerStates.get(name)?.isExecuted ?? false;
  }
  
  /**
   * Get all registered spawner names
   */
  getSpawnerNames(): string[] {
    return Array.from(this.spawnerStates.keys());
  }
  
  /**
   * Get a spawner definition by name
   */
  getSpawnerDefinition(name: string): SpawnerDefinition | undefined {
    return this.spawnerStates.get(name)?.definition;
  }
  
  /**
   * Override getRuntimeDefinitions to include spawner state for serialization
   * This enables proper save/load of spawner progress including:
   * - isExecuted: Prevents one-shot spawners from re-executing on load
   * - waveState: Preserves wave spawner timing and progress
   */
  override getRuntimeDefinitions(): Array<{ name: string; definition: SpawnerModuleDefinition; isExecuted?: boolean; waveState?: WaveState }> {
    const runtime: Array<{ name: string; definition: SpawnerModuleDefinition; isExecuted?: boolean; waveState?: WaveState }> = [];
    
    for (const [name, state] of this.spawnerStates) {
      const entry: { name: string; definition: SpawnerModuleDefinition; isExecuted?: boolean; waveState?: WaveState } = {
        name,
        definition: state.definition as SpawnerModuleDefinition,
      };
      
      // Include isExecuted state for all spawners to prevent re-execution on load
      if (state.isExecuted) {
        entry.isExecuted = true;
      }
      
      // Include wave state for wave spawners
      if (state.waveState) {
        entry.waveState = { ...state.waveState };
      }
      
      runtime.push(entry);
    }
    
    return runtime;
  }
  
  /**
   * Serialize spawner state for save/load
   * Includes wave state for wave spawners
   */
  serializeState(): Record<string, { 
    entityIds: number[]; 
    positions: Position[];
    waveState?: WaveState;
  }> {
    const result: Record<string, { 
      entityIds: number[]; 
      positions: Position[];
      waveState?: WaveState;
    }> = {};
    
    for (const [name, state] of this.spawnerStates) {
      if (state.result) {
        result[name] = {
          entityIds: state.result.entityIds,
          positions: state.result.positions,
        };
        
        // Include wave state if present
        if (state.waveState) {
          result[name].waveState = { ...state.waveState };
        }
      }
    }
    
    return result;
  }
  
  /**
   * Clear all spawner state
   */
  clear(): void {
    this.spawnerStates.clear();
    this._defaults = {};
  }
  
  /**
   * Check all spawners with triggers and execute those whose triggers have fired
   * Should be called each frame after trigger.update() but before trigger.resetFiredFlags()
   * 
   * This implements the ECS pattern: spawners poll trigger state instead of using callbacks
   */
  checkTriggersAndExecute(): void {
    const trigger = this.getTriggerModule();
    
    // Check all registered spawners for trigger associations
    for (const [spawnerName, state] of this.spawnerStates) {
      const def = state.definition;
      
      // Check composite spawners with triggers
      if (def.type === 'composite' && (def.params as CompositeParams).trigger) {
        const triggerName = `${spawnerName}_composite`;
        const triggerState = trigger.getState(triggerName);
        
        if (triggerState?.hasFired) {
          // For interval triggers, allow repeat executions
          // For one-shot triggers (immediate, time), only execute once
          const triggerDef = triggerState.definition;
          const isRepeatableTrigger = triggerDef.type === 'interval' || 
                                      (triggerDef.type === 'event' && !triggerDef.params.once) ||
                                      (triggerDef.type === 'condition' && !triggerDef.params.once) ||
                                      (triggerDef.type === 'proximity' && !triggerDef.params.once);
          
          if (isRepeatableTrigger || !state.isExecuted) {
            this.execute(spawnerName);
          }
        }
      }
      
      // Check wave spawners for wave triggers
      if (def.type === 'composite' && (def.params as CompositeParams).schedule) {
        const waveParams = compositeToWaveParams(def.params as CompositeParams)!;
        for (let waveIndex = 0; waveIndex < waveParams.waves.length; waveIndex++) {
          const triggerName = `${spawnerName}_wave_${waveIndex}`;
          const triggerState = trigger.getState(triggerName);
          
          if (triggerState?.hasFired) {
            this.triggerNextWave(spawnerName);
          }
        }
        
        // Check for loop trigger
        if (state.loopTriggerName) {
          const loopTriggerState = trigger.getState(state.loopTriggerName);
          if (loopTriggerState?.hasFired && state.waveState) {
            // Reset wave state and restart from wave 0
            state.waveState.currentWaveIndex = 0;
            state.waveState.lastWaveTime = state.waveState.timeSinceStart;
            // Trigger first wave of the loop
            this.triggerNextWave(spawnerName);
          }
        }
      }
    }
  }
  
  // ============================================================================
  // Wave Spawner Runtime Control (Phase 5)
  // ============================================================================
  
  /**
   * Pause a wave spawner
   */
  pauseWave(name: string): void {
    const state = this.spawnerStates.get(name);
    if (!state) {
      console.warn(`Spawner '${name}' not found`);
      return;
    }
    if (!state.waveState) {
      console.warn(`Spawner '${name}' is not a wave spawner`);
      return;
    }
    state.waveState.isActive = false;
  }
  
  /**
   * Resume a wave spawner
   */
  resumeWave(name: string): void {
    const state = this.spawnerStates.get(name);
    if (!state) {
      console.warn(`Spawner '${name}' not found`);
      return;
    }
    if (!state.waveState) {
      console.warn(`Spawner '${name}' is not a wave spawner`);
      return;
    }
    state.waveState.isActive = true;
  }
  
  /**
   * Reset a wave spawner to initial state
   */
  resetWave(name: string): void {
    const state = this.spawnerStates.get(name);
    if (!state) {
      console.warn(`Spawner '${name}' not found`);
      return;
    }
    if (!state.waveState) {
      console.warn(`Spawner '${name}' is not a wave spawner`);
      return;
    }
    state.waveState = {
      currentWaveIndex: 0,
      timeSinceStart: 0,
      lastWaveTime: 0,
      isActive: (compositeToWaveParams(state.definition.params as CompositeParams)?.active) !== false,
      isComplete: false,
    };
    state.isExecuted = false;
    state.result = undefined;
  }
  
  /**
   * Manually trigger the next wave
   */
  triggerNextWave(name: string): SpawnerResult | undefined {
    const state = this.spawnerStates.get(name);
    if (!state) {
      console.warn(`Spawner '${name}' not found`);
      return undefined;
    }
    if (!state.waveState) {
      console.warn(`Spawner '${name}' is not a wave spawner`);
      return undefined;
    }
    
    const waveParams = compositeToWaveParams(state.definition.params as CompositeParams);
    if (!waveParams) {
      return undefined;
    }
    let waveIndex = state.waveState.currentWaveIndex;
    
    if (waveIndex >= waveParams.waves.length) {
      if (waveParams.loop) {
        state.waveState.currentWaveIndex = 0;
        waveIndex = 0;
      } else {
        state.waveState.isComplete = true;
        return undefined;
      }
    }
    
    // Execute just this wave using the internal helper
    const wave = waveParams.waves[waveIndex];
    const terrainSize = this.getTerrainSize(waveParams.bounds);
    const heightOffset = waveParams.heightOffset ?? 0;
    
    const result = executeWaveInternal(
      this.ctx,
      waveParams,
      wave,
      waveIndex,
      terrainSize,
      heightOffset
    );
    
    // Merge result with existing spawner result
    if (state.result) {
      state.result.entityIds.push(...result.entityIds);
      state.result.positions.push(...result.positions);
    } else {
      state.result = result;
    }
    
    // Advance wave index
    state.waveState.currentWaveIndex++;
    state.waveState.lastWaveTime = state.waveState.timeSinceStart;
    
    // Check if all waves are complete
    if (state.waveState.currentWaveIndex >= waveParams.waves.length && !waveParams.loop) {
      state.waveState.isComplete = true;
    }
    
    return result;
  }
  
  /**
   * Setup trigger for a composite spawner (Phase 6.1)
   * Creates a trigger that executes the composite spawner when fired
   * 
   * @param spawnerName Name of the composite spawner
   * @param params Composite spawner parameters
   */
  /**
   * Setup trigger for a composite spawner
   * The trigger's hasFired state will be checked by checkTriggersAndExecute()
   */
  private setupCompositeSpawnerTrigger(spawnerName: string, params: CompositeParams): void {
    if (!params.trigger) return;
    
    const trigger = this.getTriggerModule();
    const triggerName = `${spawnerName}_composite`;
    
    // Register trigger - checkTriggersAndExecute() will poll hasFired and execute spawner
    trigger.register(triggerName, params.trigger);
  }
  
  /**
   * Setup triggers for a wave spawner (Phase 6.1)
   * Creates time-based triggers for each wave
   * 
   * Note: delay=0 waves are handled by the wave spawner executor (executeWave)
   * which runs during initial spawner execution. This method only sets up triggers
   * for delayed waves (delay > 0).
   * 
   * @param spawnerName Name of the wave spawner
   * @param params Wave spawner parameters
   * @param alreadyElapsedTime Time already elapsed (for save/load restoration)
   */
  /**
   * Setup triggers for a wave spawner (Phase 6.1)
   * Creates time-based triggers for each wave
   * checkTriggersAndExecute() will poll hasFired and call triggerNextWave()
   * 
   * Note: delay=0 waves are handled by the wave spawner executor (executeWave)
   * which runs during initial spawner execution. This method only sets up triggers
   * for delayed waves (delay > 0).
   * 
   * @param spawnerName Name of the wave spawner
   * @param params Wave spawner parameters
   * @param alreadyElapsedTime Time already elapsed (for save/load restoration)
   */
  private setupWaveTriggersForSpawner(spawnerName: string, params: WaveParams, alreadyElapsedTime: number = 0): void {
    const trigger = this.getTriggerModule();
    let cumulativeDelay = 0;
    
    // Create triggers for waves with delays
    // (delay=0 waves are handled by executeWave executor during initial execution)
    for (let waveIndex = 0; waveIndex < params.waves.length; waveIndex++) {
      const wave = params.waves[waveIndex];
      cumulativeDelay += wave.delay;
      
      // Skip waves that should have already fired (when restoring from save)
      if (cumulativeDelay <= alreadyElapsedTime) continue;
      
      // Skip waves with cumulative delay of 0 (executed by executor)
      if (cumulativeDelay === 0) continue;
      
      const triggerName = `${spawnerName}_wave_${waveIndex}`;
      
      // Calculate delay accounting for already-elapsed time
      const adjustedDelay = cumulativeDelay - alreadyElapsedTime;
      
      // Register trigger - checkTriggersAndExecute() will poll hasFired and call triggerNextWave()
      trigger.register(triggerName, { type: 'time', params: { delay: adjustedDelay } });
    }
    
    // If looping, set up interval trigger for repeated waves
    if (params.loop) {
      const totalDuration = cumulativeDelay;
      if (totalDuration > 0) {
        const triggerName = `${spawnerName}_loop`;
        
        // Calculate initial delay accounting for already-elapsed time
        const adjustedInitialDelay = Math.max(0, totalDuration - alreadyElapsedTime);
        
        trigger.register(
          triggerName,
          { 
            type: 'interval', 
            params: { 
              interval: totalDuration,
              initialDelay: adjustedInitialDelay
            } 
          }
        );
        
        // Store the loop trigger name for this spawner so checkTriggersAndExecute can handle it
        const state = this.spawnerStates.get(spawnerName);
        if (state) {
          state.loopTriggerName = triggerName;
        }
      }
    }
  }
  
  /**
   * Execute a specific wave at an index
   * Used by trigger callbacks
   * 
   * @param spawnerName Name of the wave spawner
   * @param waveIndex Index of the wave to execute
   */
  private executeWaveAtIndex(spawnerName: string, waveIndex: number): void {
    const state = this.spawnerStates.get(spawnerName);
    if (!state || !state.waveState || !state.waveState.isActive) {
      return;
    }
    
    const waveParams = compositeToWaveParams(state.definition.params as CompositeParams);
    if (!waveParams) {
      return;
    }
    if (waveIndex >= waveParams.waves.length) {
      return;
    }
    
    // Update wave state
    state.waveState.currentWaveIndex = waveIndex;
    state.waveState.lastWaveTime = state.waveState.timeSinceStart;
    
    // Execute the wave using the standalone function
    const wave = waveParams.waves[waveIndex];
    const terrainSize = this.getTerrainSize(waveParams.bounds);
    const heightOffset = waveParams.heightOffset ?? 0;
    
    const result = executeWaveInternal(
      this.ctx,
      waveParams,
      wave,
      waveIndex,
      terrainSize,
      heightOffset
    );
    
    // Accumulate results
    if (!state.result) {
      state.result = result;
    } else {
      state.result.entityIds.push(...result.entityIds);
      state.result.positions.push(...result.positions);
    }
    
    // Move to next wave index
    state.waveState.currentWaveIndex = waveIndex + 1;
    
    // Check if all waves complete
    if (state.waveState.currentWaveIndex >= waveParams.waves.length && !waveParams.loop) {
      state.waveState.isComplete = true;
    }
  }
  
  /**
   * Update trigger timing and execute triggered spawners
   * Call this every frame with deltaTime in seconds
   * 
   * This method follows the ECS pattern:
   * 1. Reset hasFired flags from previous frame
   * 2. Update trigger timing (sets hasFired for triggers that should fire)
   * 3. Check and execute spawners whose triggers fired
   */
  update(deltaTime: number): void {
    const trigger = this.getTriggerModule();
    
    // 1. Reset hasFired flags from previous frame
    trigger.resetFiredFlags();
    
    // 2. Update trigger module for timing
    trigger.update(deltaTime);
    
    // 3. Check and execute spawners whose triggers fired
    this.checkTriggersAndExecute();
    
    // Update wave state time tracking for serialization and status queries
    for (const [name, state] of this.spawnerStates) {
      if (state.waveState && state.waveState.isActive) {
        state.waveState.timeSinceStart += deltaTime;
      }
    }
  }
  
  /**
   * Get the wave state for a spawner
   */
  getWaveState(name: string): WaveState | undefined {
    return this.spawnerStates.get(name)?.waveState;
  }
  
  /**
   * Get the current population count for a spawner (number of spawned entities)
   */
  getPopulation(name: string): number {
    const result = this.getResult(name);
    return result?.entityIds.length ?? 0;
  }
  
  // ============================================================================
  // Extension API (Phase 2)
  // ============================================================================
  
  /**
   * Register a composite spawner type executor
   * Note: Named registerSpawnerExecutor instead of registerType to avoid
   * conflict with Module base class. The spawner module's extension API
   * is intentionally different since it registers executors (functions)
   * rather than factories (constructors).
   */
  registerSpawnerExecutor<T extends BaseSpawnerParams>(type: string, executor: SpawnerExecutor<T>): void {
    registerSpawnerType(type, executor);
  }
  
  /**
   * Register a custom placement primitive
   */
  registerPlacementPrimitive<T>(type: string, generator: (params: T, ctx?: ECSContext) => Position[]): void {
    this.getPlacementModule().registerType(type, (params: T) => ({
      place: () => generator(params, this.ctx)
    }));
  }
  
  /**
   * Register a custom selection strategy
   */
  registerSelectionStrategy<T>(type: string, selector: (params: T, index: number, position: Position, ctx?: ECSContext) => string): void {
    this.getSelectionModule().registerType(type, (params: T) => ({
      select: (index: number, position: Position, ctx?: ECSContext) => selector(params, index, position, ctx)
    }));
  }
  
  /**
   * Register a custom constraint checker
   */
  registerConstraintChecker<T>(type: string, checker: (params: T, position: Position, ctx: ECSContext, heightField?: string) => boolean): void {
    this.getConstraintsModule().registerType(type, (params: T) => ({
      check: (position: Position, ctx: ECSContext, heightField?: string) => checker(params, position, ctx, heightField)
    }));
  }
  
  /**
   * Register a custom post-spawn hook
   */
  registerHook<T>(type: string, executor: (params: T, entityId: number, position: Position, ctx: ECSContext) => void): void {
    registerPostSpawnHook(type, executor);
  }
  
  /**
   * Get available extension types
   */
  getAvailableTypes(): {
    spawners: string[];
    placements: string[];
    selections: string[];
    constraints: string[];
  } {
    return {
      spawners: getSpawnerTypes(),
      placements: this.getPlacementModule().getRegisteredTypes(),
      selections: this.getSelectionModule().getRegisteredTypes(),
      constraints: this.getConstraintsModule().getRegisteredTypes(),
    };
  }
}

// ============================================================================
// Module Factory
// ============================================================================

export const spawnerModule = (ctx: ECSContext) => new SpawnerModule(ctx);
