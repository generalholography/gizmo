/**
 * Selection Utilities Tests
 * Tests for multi-selection helper functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  computeSelectionCentroid,
  computeComponentIntersection,
  deepEqual,
  MIXED_VALUE_SENTINEL
} from '../selectionUtils';
import { createECS, setResource } from '../../../ecs';
import { spawn } from '../../../spawn';
import { Transform } from '../../../components/Transform';

describe('Selection Utilities', () => {
  let ctx: ReturnType<typeof createECS>;
  
  beforeEach(() => {
    ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
  });
  
  describe('computeSelectionCentroid', () => {
    it('should return null for empty selection', () => {
      const centroid = computeSelectionCentroid(ctx, []);
      expect(centroid).toBeNull();
    });
    
    it('should compute centroid for single entity', () => {
      const eid = spawn(ctx, { Transform: { position: { x: 5, y: 10, z: 15 } } });
      const centroid = computeSelectionCentroid(ctx, [eid]);
      
      expect(centroid).not.toBeNull();
      expect(centroid!.x).toBeCloseTo(5);
      expect(centroid!.y).toBeCloseTo(10);
      expect(centroid!.z).toBeCloseTo(15);
    });
    
    it('should compute centroid for multiple entities', () => {
      const eid1 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 0 } } });
      const eid2 = spawn(ctx, { Transform: { position: { x: 6, y: 0, z: 0 } } });
      const eid3 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 6 } } });
      
      const centroid = computeSelectionCentroid(ctx, [eid1, eid2, eid3]);
      
      expect(centroid).not.toBeNull();
      // Centroid should be at (2, 0, 2)
      expect(centroid!.x).toBeCloseTo(2);
      expect(centroid!.y).toBeCloseTo(0);
      expect(centroid!.z).toBeCloseTo(2);
    });
    
    it('should compute centroid correctly with all entities having Transform', () => {
      const eid1 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 0 } } });
      const eid2 = spawn(ctx, { Info: { name: 'test' } }); // spawn() adds Transform by default
      const eid3 = spawn(ctx, { Transform: { position: { x: 6, y: 0, z: 0 } } });
      
      const centroid = computeSelectionCentroid(ctx, [eid1, eid2, eid3]);
      
      expect(centroid).not.toBeNull();
      // Average of (0, 0, 6) / 3 = 2
      expect(centroid!.x).toBeCloseTo(2);
    });
  });
  
  describe('computeComponentIntersection', () => {
    it('should return empty array for empty input', () => {
      const intersection = computeComponentIntersection([]);
      expect(intersection).toEqual([]);
    });
    
    it('should return all components for single entity', () => {
      const set1 = new Set(['Transform', 'Body', 'Health']);
      const intersection = computeComponentIntersection([set1]);
      
      expect(intersection).toHaveLength(3);
      expect(intersection).toContain('Transform');
      expect(intersection).toContain('Body');
      expect(intersection).toContain('Health');
    });
    
    it('should compute intersection of two sets', () => {
      const set1 = new Set(['Transform', 'Body', 'Health']);
      const set2 = new Set(['Transform', 'Body', 'AI']);
      
      const intersection = computeComponentIntersection([set1, set2]);
      
      expect(intersection).toHaveLength(2);
      expect(intersection).toContain('Transform');
      expect(intersection).toContain('Body');
      expect(intersection).not.toContain('Health');
      expect(intersection).not.toContain('AI');
    });
    
    it('should compute intersection of multiple sets', () => {
      const set1 = new Set(['Transform', 'Body', 'Health', 'Info']);
      const set2 = new Set(['Transform', 'Body', 'AI', 'Info']);
      const set3 = new Set(['Transform', 'Body', 'Faction', 'Info']);
      
      const intersection = computeComponentIntersection([set1, set2, set3]);
      
      expect(intersection).toHaveLength(3);
      expect(intersection).toContain('Transform');
      expect(intersection).toContain('Body');
      expect(intersection).toContain('Info');
    });
    
    it('should return empty intersection for disjoint sets', () => {
      const set1 = new Set(['Transform', 'Body']);
      const set2 = new Set(['Health', 'AI']);
      
      const intersection = computeComponentIntersection([set1, set2]);
      
      expect(intersection).toHaveLength(0);
    });
  });
  
  describe('deepEqual', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual(5, 5)).toBe(true);
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
    });
    
    it('should return false for different primitives', () => {
      expect(deepEqual(5, 10)).toBe(false);
      expect(deepEqual('hello', 'world')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
    });
    
    it('should handle null and undefined', () => {
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual(null, 0)).toBe(false);
      expect(deepEqual(undefined, undefined)).toBe(true);
    });
    
    it('should compare arrays deeply', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([], [])).toBe(true);
    });
    
    it('should compare nested arrays', () => {
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
      expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
    });
    
    it('should compare objects deeply', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(deepEqual({}, {})).toBe(true);
    });
    
    it('should compare nested objects', () => {
      expect(deepEqual(
        { a: 1, b: { c: 2, d: 3 } },
        { a: 1, b: { c: 2, d: 3 } }
      )).toBe(true);
      
      expect(deepEqual(
        { a: 1, b: { c: 2, d: 3 } },
        { a: 1, b: { c: 2, d: 4 } }
      )).toBe(false);
    });
    
    it('should handle mixed objects and arrays', () => {
      expect(deepEqual(
        { a: [1, 2], b: { c: 3 } },
        { a: [1, 2], b: { c: 3 } }
      )).toBe(true);
      
      expect(deepEqual(
        { a: [1, 2], b: { c: 3 } },
        { a: [1, 3], b: { c: 3 } }
      )).toBe(false);
    });
    
    it('should return false for different types', () => {
      expect(deepEqual(5, '5')).toBe(false);
      expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
      expect(deepEqual(null, {})).toBe(false);
    });
  });
  
  describe('MIXED_VALUE_SENTINEL', () => {
    it('should be a unique symbol', () => {
      expect(typeof MIXED_VALUE_SENTINEL).toBe('symbol');
    });
    
    it('should not equal any other value', () => {
      expect(MIXED_VALUE_SENTINEL).not.toBe('MIXED');
      expect(MIXED_VALUE_SENTINEL).not.toBe(null);
      expect(MIXED_VALUE_SENTINEL).not.toBe(undefined);
    });
    
    it('should equal itself', () => {
      expect(MIXED_VALUE_SENTINEL).toBe(MIXED_VALUE_SENTINEL);
    });
  });
});
