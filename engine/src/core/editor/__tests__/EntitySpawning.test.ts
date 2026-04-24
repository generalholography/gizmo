/**
 * Entity Spawning Tests for Editor
 * Tests proper entity spawning format and initialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createECS, setResource } from '../../ecs';
import { spawn } from '../../spawn';
import { Transform } from '../../components/Transform';
import { hasComponent } from 'bitecs';

describe('Entity Spawning for Editor', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createECS();
    
    // Set up minimal world metadata
    setResource(ctx, 'metadata', {
      title: "Test World",
      dimensions: [{
        name: "base",
        gravity: -20,
        sky: {
          color: "#87CEEB"
        }
      }]
    });
  });

  describe('Spawn Multiple Entities', () => {
    it('should spawn multiple entities without conflicts', () => {
      const eid1 = spawn(ctx, { Transform: { x: 0 } });
      const eid2 = spawn(ctx, { Transform: { x: 5 } });
      const eid3 = spawn(ctx, { Transform: { x: 10 } });

      expect(eid1).not.toBe(eid2);
      expect(eid2).not.toBe(eid3);
      expect(eid1).not.toBe(eid3);

      expect(Transform.x[eid1]).toBe(0);
      expect(Transform.x[eid2]).toBe(5);
      expect(Transform.x[eid3]).toBe(10);
    });
  });

  describe('Bundle Format', () => {
    it('should accept pure bundle without archetype', () => {
      const bundle = {
        Transform: { x: 1, y: 2, z: 3 }
      };

      const eid = spawn(ctx, bundle);

      expect(eid).toBeGreaterThanOrEqual(0);
      expect(hasComponent(ctx, Transform, eid)).toBe(true);
      expect(Transform.x[eid]).toBe(1);
      expect(Transform.y[eid]).toBe(2);
      expect(Transform.z[eid]).toBe(3);
    });
  });

  describe('Transform Defaults', () => {
    it('should provide default transform when not specified', () => {
      const eid = spawn(ctx, { Info: { name: "Test" } });

      expect(hasComponent(ctx, Transform, eid)).toBe(true);
      expect(Transform.x[eid]).toBeDefined();
      expect(Transform.y[eid]).toBeDefined();
      expect(Transform.z[eid]).toBeDefined();
      expect(Transform.qw[eid]).toBe(1); // Identity quaternion
    });
  });
});
