/**
 * Placement Module
 * 
 * Follows Module pattern for:
 * - Serialization support
 * - Maintainability
 * - Usability
 * - Runtime extensibility
 * 
 * Core Principles Followed:
 * 1. ✅ Extends Module<PlacementDefinition, PlacementResolved>
 * 2. ✅ Uses {type, params} structure
 * 3. ✅ Uses registerType() for placement generators
 * 4. ✅ register() returns PlacementResolved
 * 5. ✅ Calls addDefinition() for all registrations
 * 6. ✅ Built-in placements registered in constructor
 * 
 * PlacementResolved follows Selection/Effect pattern:
 * - PlacementResolved = { place: () => Position[] }
 * - Each call to place() generates fresh positions
 * - Ensures randomness for random/poisson placements
 * - No caching workarounds needed
 */

import { Position, Bounds, Range, PlacementDefinition } from './types';
import { ECSContext, getModule } from "../../core/ecs";
import { Module } from "../Module";
import type { FieldResolved } from "../field";
import { Path3DModule } from "../path3d";

function toPosition(value: any, fallback: Position = { x: 0, y: 0, z: 0 }): Position {
  return {
    x: Number.isFinite(value?.x) ? value.x : fallback.x,
    y: Number.isFinite(value?.y) ? value.y : fallback.y,
    z: Number.isFinite(value?.z) ? value.z : fallback.z,
  };
}

function toBounds(value: any): Bounds {
  const minX = Number.isFinite(value?.x?.[0]) ? value.x[0] : 0;
  const maxX = Number.isFinite(value?.x?.[1]) ? value.x[1] : minX;
  const minZ = Number.isFinite(value?.z?.[0]) ? value.z[0] : 0;
  const maxZ = Number.isFinite(value?.z?.[1]) ? value.z[1] : minZ;
  const minY = Number.isFinite(value?.y?.[0]) ? value.y[0] : 0;
  const maxY = Number.isFinite(value?.y?.[1]) ? value.y[1] : minY;

  return {
    x: [minX, maxX],
    z: [minZ, maxZ],
    ...(value?.y ? { y: [minY, maxY] } : {}),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Get a random number in a range */
export function randomInRange(range: Range): number {
  return range.min + Math.random() * (range.max - range.min);
}

/** Resolve a count value (number or range) */
export function resolveCount(count: number | Range): number {
  if (typeof count === 'number') return Math.floor(count);
  return Math.floor(randomInRange(count));
}

/** Resolve a number or range to a value */
export function resolveValue(value: number | Range | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  if (typeof value === 'number') return value;
  return randomInRange(value);
}

// ============================================================================
// Placement Resolved Type
// ============================================================================

/**
 * Resolved placement - a function that generates positions
 * Similar to SelectionResolved and EffectResolved patterns
 */
export interface PlacementResolved {
  place: () => Position[];
}

// ============================================================================
// Placement Module Class
// ============================================================================

export class PlacementModule extends Module<PlacementDefinition, PlacementResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {});
    
    // Register all built-in placement types
    this.registerType('random', (params: any): PlacementResolved => ({
      place: () => {
        const bounds = toBounds(params?.bounds);
        const count = Math.max(0, resolveCount(params?.count ?? 0));
        const positions: Position[] = [];
        
        for (let i = 0; i < count; i++) {
          positions.push({
            x: bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
            y: bounds.y?.[0] ?? 0,
            z: bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]),
          });
        }
        
        return positions;
      }
    }));
    
    this.registerType('grid', (params: any): PlacementResolved => ({
      place: () => {
        const positions: Position[] = [];
        const bounds = toBounds(params?.bounds);
        const spacingX = Math.max(0.0001, typeof params?.spacing === 'number' ? params.spacing : (params?.spacing?.x ?? 1));
        const spacingZ = Math.max(0.0001, typeof params?.spacing === 'number' ? params.spacing : (params?.spacing?.z ?? 1));
        const jitter = Number.isFinite(params?.jitter) ? params.jitter : 0;
        
        for (let x = bounds.x[0]; x <= bounds.x[1]; x += spacingX) {
          for (let z = bounds.z[0]; z <= bounds.z[1]; z += spacingZ) {
            positions.push({
              x: x + (Math.random() - 0.5) * 2 * jitter,
              y: 0,
              z: z + (Math.random() - 0.5) * 2 * jitter,
            });
          }
        }
        
        return positions;
      }
    }));
    
    this.registerType('points', (params: any): PlacementResolved => ({
      place: () => {
        const source = Array.isArray(params?.positions) ? params.positions : [];
        return source.map((value: any) => toPosition(value));
      }
    }));

    this.registerType('cluster', (params: any): PlacementResolved => ({
      place: () => {
        const bounds = toBounds(params?.bounds);
        const clusterCount = Math.max(0, resolveCount(params?.clusterCount ?? 0));
        const clusterSeparation = Number.isFinite(params?.clusterSeparation) ? params.clusterSeparation : undefined;
        const positions: Position[] = [];
        const centers: Position[] = [];

        if (clusterCount <= 0) return positions;

        const maxAttempts = Math.max(clusterCount * 6, 12);
        let attempts = 0;

        while (centers.length < clusterCount && attempts < maxAttempts) {
          attempts++;
          const candidate: Position = {
            x: bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
            y: bounds.y
              ? bounds.y[0] + Math.random() * (bounds.y[1] - bounds.y[0])
              : 0,
            z: bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]),
          };

          if (clusterSeparation && clusterSeparation > 0) {
            const tooClose = centers.some((center) =>
              Math.hypot(candidate.x - center.x, candidate.z - center.z) < clusterSeparation,
            );
            if (tooClose) continue;
          }

          centers.push(candidate);
        }

        for (const center of centers) {
          const perCluster = Math.max(1, resolveCount(params?.perCluster ?? 1));
          const clusterRadius = Math.max(0.01, resolveValue(params?.clusterRadius, 5));

          for (let index = 0; index < perCluster; index++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterRadius;
            positions.push({
              x: center.x + Math.cos(angle) * distance,
              y: center.y,
              z: center.z + Math.sin(angle) * distance,
            });
          }
        }

        return positions;
      }
    }));
    
    this.registerType('circle', (params: any): PlacementResolved => ({
      place: () => {
        const positions: Position[] = [];
        const center = toPosition(params?.center);
        const radius = Math.max(0, Number.isFinite(params?.radius) ? params.radius : 1);
        const count = Math.max(0, Math.floor(Number.isFinite(params?.count) ? params.count : 8));
        
        for (let i = 0; i < count; i++) {
          const angle = (i / Math.max(1, count)) * Math.PI * 2;
          positions.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y,
            z: center.z + Math.sin(angle) * radius,
          });
        }
        
        return positions;
      }
    }));
    
    this.registerType('line', (params: any): PlacementResolved => ({
      place: () => {
        const positions: Position[] = [];
        const start = toPosition(params?.start, { x: -1, y: 0, z: 0 });
        const end = toPosition(params?.end, { x: 1, y: 0, z: 0 });
        const count = Math.max(0, Math.floor(Number.isFinite(params?.count) ? params.count : 2));
        
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? i / (count - 1) : 0;
          positions.push({
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t,
          });
        }
        
        return positions;
      }
    }));
    
    this.registerType('polyline', (params: any): PlacementResolved => ({
      place: () => {
        const positions: Position[] = [];
        const pathModule = getModule<Path3DModule>(this.ctx, 'path3d');
        if (!pathModule) {
          throw new Error("Missing required module 'path3d'");
        }

        const fallbackPath = {
          type: 'line',
          params: {
            start: { x: 0, y: 0, z: 0 },
            end: { x: 1, y: 0, z: 0 },
            segments: 1,
          },
        };
        const resolvedPath = pathModule.resolvePath((params?.path ?? fallbackPath) as any);
        const points = resolvedPath.points ?? [];
        const spacing = Math.max(0.0001, Number.isFinite(params?.spacing) ? params.spacing : 1);
        const offset = resolveValue(params.offset, 0);
        const closed = resolvedPath.closed ?? false;
        
        if (points.length < 2) return positions;
        
        // Calculate total path length and segments
        const segments: { start: Position; end: Position; length: number }[] = [];
        let totalLength = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          const length = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
          segments.push({ start, end, length });
          totalLength += length;
        }
        
        // Add closing segment if closed
        if (closed && points.length > 2) {
          const start = points[points.length - 1];
          const end = points[0];
          const length = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
          segments.push({ start, end, length });
          totalLength += length;
        }
        
        // Place entities along path at regular intervals
        let currentDist = 0;
        let segmentIndex = 0;
        let segmentDist = 0;
        
        while (currentDist <= totalLength && segmentIndex < segments.length) {
          const segment = segments[segmentIndex];
          const t = segmentDist / segment.length;
          const dx = segment.end.x - segment.start.x;
          const dz = segment.end.z - segment.start.z;
          const segmentLen = Math.hypot(dx, dz);
          const nx = segmentLen > 1e-6 ? -dz / segmentLen : 0;
          const nz = segmentLen > 1e-6 ? dx / segmentLen : 0;
          
          positions.push({
            x: segment.start.x + (segment.end.x - segment.start.x) * t + nx * offset,
            y: segment.start.y + (segment.end.y - segment.start.y) * t,
            z: segment.start.z + (segment.end.z - segment.start.z) * t + nz * offset,
          });
          
          currentDist += spacing;
          segmentDist += spacing;
          
          // Move to next segment if needed
          while (segmentIndex < segments.length && segmentDist >= segments[segmentIndex].length) {
            segmentDist -= segments[segmentIndex].length;
            segmentIndex++;
          }
        }
        
        return positions;
      }
    }));
    
    this.registerType('poisson', (params: any): PlacementResolved => ({
      place: () => {
        const bounds = toBounds(params?.bounds);
        const minDistance = Math.max(0.0001, Number.isFinite(params?.minDistance) ? params.minDistance : 1);
        const maxAttempts = Math.max(1, Math.floor(Number.isFinite(params?.maxAttempts) ? params.maxAttempts : 30));
        const positions: Position[] = [];
        const cellSize = minDistance / Math.sqrt(2);
        
        const width = bounds.x[1] - bounds.x[0];
        const height = bounds.z[1] - bounds.z[0];
        const gridWidth = Math.ceil(width / cellSize);
        const gridHeight = Math.ceil(height / cellSize);
        
        // Grid for spatial lookup (-1 means empty)
        const grid: number[][] = Array(gridWidth).fill(null).map(() => Array(gridHeight).fill(-1));
        const activeList: number[] = [];
        
        // Helper to get grid cell
        const getGridCell = (x: number, z: number): [number, number] => {
          return [
            Math.floor((x - bounds.x[0]) / cellSize),
            Math.floor((z - bounds.z[0]) / cellSize)
          ];
        };
        
        // Check if position is valid (far enough from all neighbors)
        const isValidPosition = (x: number, z: number): boolean => {
          const [gx, gz] = getGridCell(x, z);
          
          // Check 5x5 neighborhood
          for (let i = Math.max(0, gx - 2); i <= Math.min(gridWidth - 1, gx + 2); i++) {
            for (let j = Math.max(0, gz - 2); j <= Math.min(gridHeight - 1, gz + 2); j++) {
              const idx = grid[i][j];
              if (idx >= 0) {
                const other = positions[idx];
                const dist = Math.hypot(x - other.x, z - other.z);
                if (dist < minDistance) return false;
              }
            }
          }
          return true;
        };
        
        // Add initial point
        const initialX = bounds.x[0] + Math.random() * width;
        const initialZ = bounds.z[0] + Math.random() * height;
        positions.push({ x: initialX, y: 0, z: initialZ });
        const [gx, gz] = getGridCell(initialX, initialZ);
        grid[gx][gz] = 0;
        activeList.push(0);
        
        // Process active list
        while (activeList.length > 0) {
          const activeIdx = Math.floor(Math.random() * activeList.length);
          const pointIdx = activeList[activeIdx];
          const point = positions[pointIdx];
          let found = false;
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDistance + Math.random() * minDistance;
            const newX = point.x + Math.cos(angle) * dist;
            const newZ = point.z + Math.sin(angle) * dist;
            
            // Check bounds
            if (newX < bounds.x[0] || newX > bounds.x[1] || newZ < bounds.z[0] || newZ > bounds.z[1]) {
              continue;
            }
            
            if (isValidPosition(newX, newZ)) {
              const newIdx = positions.length;
              positions.push({ x: newX, y: 0, z: newZ });
              const [ngx, ngz] = getGridCell(newX, newZ);
              grid[ngx][ngz] = newIdx;
              activeList.push(newIdx);
              found = true;
              break;
            }
          }
          
          if (!found) {
            activeList.splice(activeIdx, 1);
          }
        }
        
        return positions;
      }
    }));
    
    this.registerType('spiral', (params: any): PlacementResolved => ({
      place: () => {
        const positions: Position[] = [];
        const center = toPosition(params?.center);
        const startRadius = Number.isFinite(params?.startRadius) ? params.startRadius : 0.2;
        const endRadius = Number.isFinite(params?.endRadius) ? params.endRadius : 1;
        const turns = Number.isFinite(params?.turns) ? params.turns : 2;
        const count = Math.max(0, Math.floor(Number.isFinite(params?.count) ? params.count : 8));
        
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? i / (count - 1) : 0;
          const angle = t * turns * Math.PI * 2;
          const radius = startRadius + (endRadius - startRadius) * t;
          
          positions.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y,
            z: center.z + Math.sin(angle) * radius,
          });
        }
        
        return positions;
      }
    }));
  }
  
  /**
   * Generate positions from a placement definition
   * 
   * Resolves the placement definition to a PlacementResolved object,
   * then calls its place() method to generate positions.
   * 
   * This follows the established pattern from Selection and Effect modules.
   * Each call to place() generates fresh positions, which is important for
   * non-deterministic placements (random, poisson) to vary between executions.
   */
  generate(placement: PlacementDefinition): Position[] {
    const id = this.resolve(placement);
    const resolved = this.get(id);
    return resolved.place();
  }
}

// ============================================================================
// Module Factory
// ============================================================================

export const placementModule = (ctx: ECSContext) => new PlacementModule(ctx);
