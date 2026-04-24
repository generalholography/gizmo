/**
 * Selection Utilities
 * Helper functions for multi-entity selection operations
 */

import * as THREE from 'three';
import { ECSContext, getResource } from '../../ecs';
import { Transform } from '../../components/Transform';
import { hasComponent } from 'bitecs';

/**
 * Compute the centroid (average position) of selected entities
 * Used for placing the transform gizmo at the center of selection
 */
export function computeSelectionCentroid(
  ctx: ECSContext,
  eids: number[]
): THREE.Vector3 | null {
  if (eids.length === 0) return null;
  
  const validEids = eids.filter(eid => hasComponent(ctx, Transform, eid));
  if (validEids.length === 0) return null;
  
  const centroid = new THREE.Vector3(0, 0, 0);
  
  validEids.forEach(eid => {
    centroid.x += Transform.x[eid];
    centroid.y += Transform.y[eid];
    centroid.z += Transform.z[eid];
  });
  
  centroid.divideScalar(validEids.length);
  return centroid;
}

/**
 * Compute the bounding box that contains all selected entities
 * Useful for visualization and bulk operations
 */
export function computeSelectionBounds(
  ctx: ECSContext,
  eids: number[]
): THREE.Box3 | null {
  if (eids.length === 0) return null;
  
  const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
  if (!renderObjects) return null;
  
  const bounds = new THREE.Box3();
  let hasValidBounds = false;
  
  eids.forEach(eid => {
    const obj = renderObjects.get(eid);
    if (obj) {
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        bounds.union(box);
        hasValidBounds = true;
      }
    }
  });
  
  return hasValidBounds ? bounds : null;
}

/**
 * Compute the intersection of components across multiple entities
 * Returns component names that ALL entities have in common
 * Used for the unified inspector to show shared fields
 */
export function computeComponentIntersection(
  componentSets: Set<string>[]
): string[] {
  if (componentSets.length === 0) return [];
  if (componentSets.length === 1) return Array.from(componentSets[0]);
  
  // Start with first set
  const intersection = new Set(componentSets[0]);
  
  // Intersect with remaining sets
  for (let i = 1; i < componentSets.length; i++) {
    const currentSet = componentSets[i];
    // Remove components not in current set
    intersection.forEach(comp => {
      if (!currentSet.has(comp)) {
        intersection.delete(comp);
      }
    });
  }
  
  return Array.from(intersection);
}

/**
 * Check if two values are deeply equal
 * Used to determine if field values are the same across multiple entities
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    // Handle arrays
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      return a.every((val, idx) => deepEqual(val, b[idx]));
    }
    
    // Handle objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Sentinel value to indicate mixed field values across entities
 */
export const MIXED_VALUE_SENTINEL = Symbol('MIXED_VALUE');
