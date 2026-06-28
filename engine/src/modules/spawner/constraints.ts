/**
 * Constraints Module
 * 
 * Follows Module pattern for:
 * - Serialization support
 * - Maintainability
 * - Usability
 * - Runtime extensibility
 * 
 * Core Principles Followed:
 * 1. ✅ Extends Module<ConstraintDefinition, ConstraintResolved>
 * 2. ✅ Uses {type, params} structure
 * 3. ✅ Uses registerType() for constraint checkers
 * 4. ✅ register() returns ConstraintResolved
 * 5. ✅ Calls addDefinition() for all registrations
 * 6. ✅ Built-in constraints registered in constructor
 */

import { Position, Constraint, ConstraintDefinition, ExclusionZone } from './types';
import { ECSContext, getModule, getResource } from "../../core/ecs";
import { Module } from "../Module";
import type { FieldResolved } from "../field";
import type { WorldMetadata } from "../../core/schema";
import { Path3DModule } from "../path3d";
import { defineQuery, hasComponent } from 'bitecs';
import { Transform } from '../../core/components/Transform';
import { Info, getName } from '../../core/components/Info';

// ============================================================================
// Default terrain size for normalization when not specified
// ============================================================================

export const DEFAULT_NORMALIZATION_SIZE = 100;

// ============================================================================
// Terrain Settings Cache
// ============================================================================

/**
 * Terrain settings resolved from dimension configuration
 */
export interface TerrainSettings {
  heightField: string;
  size: number;
  heightOffset: number;
}

function normalizeTerrainSize(size: any): number {
  if (typeof size === 'object' && size !== null) {
    const x = Number(size.x ?? size.width ?? DEFAULT_NORMALIZATION_SIZE);
    const z = Number(size.z ?? size.depth ?? x);
    return Math.max(
      Number.isFinite(x) && x > 0 ? x : DEFAULT_NORMALIZATION_SIZE,
      Number.isFinite(z) && z > 0 ? z : DEFAULT_NORMALIZATION_SIZE,
    );
  }

  const uniform = Number(size ?? DEFAULT_NORMALIZATION_SIZE);
  return Number.isFinite(uniform) && uniform > 0 ? uniform : DEFAULT_NORMALIZATION_SIZE;
}

/**
 * Get terrain settings from the current dimension
 * Falls back to spawnerDefaults if dimension terrain is not configured
 */
export function getTerrainSettings(ctx: ECSContext): TerrainSettings | undefined {
  // Safely check for resources - may not exist in test environments
  if (!ctx.resources) {
    return undefined;
  }
  
  const metadata = getResource<WorldMetadata>(ctx, 'metadata', true);
  if (!metadata?.dimensions?.[0]?.terrain) {
    return undefined;
  }
  
  const terrain = metadata.dimensions[0].terrain;
  if (terrain.enabled === false || typeof terrain.heightField !== 'string') {
    return undefined;
  }

  return {
    heightField: terrain.heightField,
    size: normalizeTerrainSize(terrain.size),
    heightOffset: terrain.heightOffset ?? 0,
  };
}

// ============================================================================
// Height Field Sampling Helper
// ============================================================================

/** Sample height from field at position */
export function sampleHeight(
  ctx: ECSContext,
  fieldName: string | undefined,
  x: number,
  z: number,
  terrainSize: number = DEFAULT_NORMALIZATION_SIZE
): number {
  if (!fieldName) return 0;
  
  const fieldModule = getModule(ctx, 'field');
  if (!fieldModule) return 0;
  
  try {
    const field = fieldModule.get(fieldModule.resolve(fieldName)) as FieldResolved;
    if (field && field.sample3D) {
      return field.sample3D(x / terrainSize, 0, z / terrainSize);
    }
  } catch (e) {
    console.warn(`Failed to sample height field '${fieldName}':`, e);
  }
  
  return 0;
}

/** Calculate slope at a position by sampling height field */
export function calculateSlope(
  ctx: ECSContext,
  fieldName: string,
  x: number,
  z: number,
  sampleRadius: number = 1,
  terrainSize: number = DEFAULT_NORMALIZATION_SIZE
): number {
  const fieldModule = getModule(ctx, 'field');
  if (!fieldModule) return 0;
  
  try {
    const field = fieldModule.get(fieldModule.resolve(fieldName)) as FieldResolved;
    if (!field?.sample3D) return 0;
    
    // Sample at 4 cardinal directions
    const h0 = field.sample3D(x / terrainSize, 0, z / terrainSize);
    const hN = field.sample3D(x / terrainSize, 0, (z + sampleRadius) / terrainSize);
    const hS = field.sample3D(x / terrainSize, 0, (z - sampleRadius) / terrainSize);
    const hE = field.sample3D((x + sampleRadius) / terrainSize, 0, z / terrainSize);
    const hW = field.sample3D((x - sampleRadius) / terrainSize, 0, z / terrainSize);
    
    // Calculate gradient
    const dzdx = (hE - hW) / (2 * sampleRadius);
    const dzdy = (hN - hS) / (2 * sampleRadius);
    
    // Slope magnitude (0 = flat, 1 = 45 degrees, >1 = steeper)
    const gradient = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
    
    // Normalize to 0-1 range where 1 = 45 degrees (slope of 1)
    return Math.min(gradient, 1);
  } catch (e) {
    console.warn(`Failed to calculate slope from field '${fieldName}':`, e);
    return 0;
  }
}

/** Helper: Distance from point to line segment */
function distanceToSegment(p: Position, a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  
  if (lengthSq === 0) {
    // a and b are the same point
    return Math.hypot(p.x - a.x, p.z - a.z);
  }
  
  // Project p onto line ab, clamped to segment
  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const closestX = a.x + t * dx;
  const closestZ = a.z + t * dz;
  
  return Math.hypot(p.x - closestX, p.z - closestZ);
}

// ============================================================================
// Spawner Result Reference for excludeSpawner constraint
// ============================================================================

/** 
 * Store for spawner results that can be referenced by excludeSpawner constraint
 * This is set by the SpawnerModule when registering spawners
 */
let spawnerResultsGetter: ((name: string) => { positions: Position[] } | undefined) | null = null;

/** Set the function to get spawner results (called by SpawnerModule) */
export function setSpawnerResultsGetter(getter: (name: string) => { positions: Position[] } | undefined): void {
  spawnerResultsGetter = getter;
}

// ============================================================================
// Constraint Resolved Type
// ============================================================================

/**
 * Resolved constraint - a function that checks if a position passes the constraint
 */
export interface ConstraintResolved {
  check: (position: Position, ctx: ECSContext, heightField?: string) => boolean;
}

// ============================================================================
// Constraints Module Class
// ============================================================================

export class ConstraintsModule extends Module<ConstraintDefinition, ConstraintResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {});

    const transformQuery = defineQuery([Transform]);
    
    // Register all built-in constraint types
    this.registerType('slope', (params: any) => ({
      check: (position: Position, ctx: ECSContext, heightField?: string) => {
        const field = params.field || heightField;
        if (!field) {
          // No height field, can't check slope - pass by default
          return true;
        }
        
        const slope = calculateSlope(ctx, field, position.x, position.z, params.sampleRadius ?? 1);
        
        if (params.min !== undefined && slope < params.min) return false;
        if (params.max !== undefined && slope > params.max) return false;
        
        return true;
      }
    }));
    
    this.registerType('altitude', (params: any) => ({
      check: (position: Position, ctx: ECSContext, heightField?: string) => {
        const field = params.field || heightField;
        const y = field ? sampleHeight(ctx, field, position.x, position.z) : position.y;
        
        if (params.min !== undefined && y < params.min) return false;
        if (params.max !== undefined && y > params.max) return false;
        
        return true;
      }
    }));
    
    this.registerType('noise', (params: any) => ({
      check: (position: Position, ctx: ECSContext) => {
        const fieldModule = getModule(ctx, 'field');
        if (!fieldModule) return true;
        
        try {
          const field = fieldModule.get(fieldModule.resolve(params.field)) as FieldResolved;
          if (field?.sample3D) {
            const value = field.sample3D(
              position.x / DEFAULT_NORMALIZATION_SIZE,
              0,
              position.z / DEFAULT_NORMALIZATION_SIZE
            );
            const normalized = (value + 1) / 2; // Convert from [-1,1] to [0,1]
            
            if (params.min !== undefined && normalized < params.min) return false;
            if (params.max !== undefined && normalized > params.max) return false;
          }
        } catch (e) {
          // Field not found, pass by default
        }
        
        return true;
      }
    }));
    
    this.registerType('distance', (params: any) => ({
      check: (position: Position) => {
        const points = Array.isArray(params.from) ? params.from : [params.from];
        
        for (const point of points) {
          const dist = Math.hypot(position.x - point.x, position.z - point.z);
          if (params.min !== undefined && dist < params.min) return false;
          if (params.max !== undefined && dist > params.max) return false;
        }
        
        return true;
      }
    }));
    
    this.registerType('exclude', (params: any) => ({
      check: (position: Position) => {
        for (const zone of params.zones) {
          const dist = Math.hypot(position.x - zone.center.x, position.z - zone.center.z);
          if (dist < zone.radius) return false;
        }
        return true;
      }
    }));
    
    this.registerType('pathDistance', (params: any) => ({
      check: (position: Position) => {
        const { path, min, max } = params;
        const pathModule = getModule<Path3DModule>(this.ctx, 'path3d');
        if (!pathModule) {
          throw new Error("Missing required module 'path3d'");
        }
        const resolvedPath = pathModule.resolvePath(path);
        const points = resolvedPath.points;
        
        if (points.length < 2) return true;
        
        // Find minimum distance to any segment of the path
        let minDist = Infinity;
        
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i];
          const b = points[i + 1];
          
          // Calculate distance from point to line segment
          const dist = distanceToSegment(position, a, b);
          minDist = Math.min(minDist, dist);
        }
        
        if (min !== undefined && minDist < min) return false;
        if (max !== undefined && minDist > max) return false;
        
        return true;
      }
    }));
    
    this.registerType('entityDistance', (params: any) => ({
      check: (position: Position, ctx: ECSContext) => {
        const min = Number.isFinite(params.min) ? params.min : undefined;
        const max = Number.isFinite(params.max) ? params.max : undefined;
        const entityType = typeof params.entityType === 'string' ? params.entityType : undefined;

        const candidates = transformQuery(ctx).filter((eid) => {
          if (!entityType) return true;
          if (!hasComponent(ctx, Info, eid)) return false;
          return getName(ctx, eid) === entityType;
        });

        if (candidates.length === 0) {
          return true;
        }

        let nearestDistance = Infinity;
        for (const eid of candidates) {
          const dx = position.x - Transform.x[eid];
          const dz = position.z - Transform.z[eid];
          const distance = Math.hypot(dx, dz);
          if (distance < nearestDistance) {
            nearestDistance = distance;
          }
        }

        if (min !== undefined && nearestDistance < min) return false;
        if (max !== undefined && nearestDistance > max) return false;
        return true;
      }
    }));
    
    this.registerType('density', (params: any) => ({
      check: (position: Position, ctx: ECSContext) => {
        const maxPerUnit = Number.isFinite(params.maxPerUnit) ? params.maxPerUnit : undefined;
        if (maxPerUnit === undefined || maxPerUnit < 0) return true;

        const unitSize = Number.isFinite(params.unitSize) && params.unitSize > 0 ? params.unitSize : 10;
        const cellX = Math.floor(position.x / unitSize);
        const cellZ = Math.floor(position.z / unitSize);

        let countInCell = 0;
        for (const eid of transformQuery(ctx)) {
          const existingCellX = Math.floor(Transform.x[eid] / unitSize);
          const existingCellZ = Math.floor(Transform.z[eid] / unitSize);
          if (existingCellX === cellX && existingCellZ === cellZ) {
            countInCell++;
            if (countInCell >= maxPerUnit) {
              return false;
            }
          }
        }

        return true;
      }
    }));
    
    this.registerType('excludeSpawner', (params: any) => ({
      check: (position: Position, ctx: ECSContext) => {
        if (!spawnerResultsGetter) {
          console.warn('excludeSpawner constraint: spawner results getter not set');
          return true;
        }
        
        const result = spawnerResultsGetter(params.spawner);
        if (!result || !result.positions || result.positions.length === 0) {
          // Spawner not found or no results yet - warn and pass by default
          // This allows spawner order independence but may mask typos
          console.warn(`excludeSpawner constraint: spawner '${params.spawner}' has no results yet. ` +
            'Ensure referenced spawners are defined before this spawner or set immediate: false.');
          return true;
        }
        
        // Check distance from all spawned positions
        for (const spawnedPos of result.positions) {
          const dist = Math.hypot(position.x - spawnedPos.x, position.z - spawnedPos.z);
          if (dist < params.radius) {
            return false;
          }
        }
        
        return true;
      }
    }));
  }
  
  /**
   * Check if a position passes a constraint
   */
  check(
    constraint: ConstraintDefinition,
    position: Position,
    ctx: ECSContext,
    heightField?: string
  ): boolean {
    const id = this.resolve(constraint);
    const resolved = this.get(id);
    return resolved.check(position, ctx, heightField);
  }
  
  /**
   * Check if a position passes all constraints
   */
  passesAll(
    constraints: Constraint[] | ConstraintDefinition[] | undefined,
    position: Position,
    ctx: ECSContext,
    heightField?: string
  ): boolean {
    if (!constraints || constraints.length === 0) return true;
    
    for (const constraint of constraints) {
      // Check if constraint is already in ConstraintDefinition format {type, params}
      // or in old flat format {type, param1, param2, ...}
      let definition: ConstraintDefinition;
      if ('params' in constraint && typeof constraint.params === 'object') {
        // Already in ConstraintDefinition format
        definition = constraint as ConstraintDefinition;
      } else {
        // Old flat format - convert to ConstraintDefinition
        const { type, ...params } = constraint;
        definition = { type, params };
      }
      
      if (!this.check(definition, position, ctx, heightField)) {
        return false;
      }
    }
    
    return true;
  }
}

// ============================================================================
// Module Factory
// ============================================================================

export const constraintsModule = (ctx: ECSContext) => new ConstraintsModule(ctx);
