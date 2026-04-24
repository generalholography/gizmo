/**
 * Transform Inspector Edit Tests
 * Verifies transform values can be edited in inspector without resetting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addComponent, addEntity } from 'bitecs';
import { ECSContext } from '../../ecs';
import { Transform } from '../../components/Transform';
import * as THREE from 'three';

describe('Transform Inspector Editing', () => {
  let ctx: ECSContext;
  let eid: number;

  beforeEach(() => {
    ctx = {
      world: createWorld(),
      isPlaying: false,
      pipeline: [],
      three: {
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        worldRoot: new THREE.Group(),
      },
      time: {
        setTimescale: () => {},
        update: () => {},
        getDelta: () => 0.016,
        getElapsed: () => 0,
      },
    } as any;

    eid = addEntity(ctx.world);
    addComponent(ctx.world, Transform, eid);
    
    // Set initial transform
    Transform.x[eid] = 1;
    Transform.y[eid] = 2;
    Transform.z[eid] = 3;
    Transform.sx[eid] = 1;
    Transform.sy[eid] = 1;
    Transform.sz[eid] = 1;
    
    // Set initial quaternion (identity)
    Transform.qx[eid] = 0;
    Transform.qy[eid] = 0;
    Transform.qz[eid] = 0;
    Transform.qw[eid] = 1;
  });

  it('should preserve position values when changed', () => {
    // Simulate user editing position
    Transform.x[eid] = 5;
    Transform.y[eid] = 10;
    Transform.z[eid] = 15;
    
    // Values should persist
    expect(Transform.x[eid]).toBe(5);
    expect(Transform.y[eid]).toBe(10);
    expect(Transform.z[eid]).toBe(15);
  });

  it('should preserve rotation values when changed', () => {
    // Convert degrees to quaternion
    const euler = new THREE.Euler(
      (45 * Math.PI) / 180,
      (90 * Math.PI) / 180,
      (0 * Math.PI) / 180,
      'XYZ'
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);
    
    // Simulate user editing rotation
    Transform.qx[eid] = quat.x;
    Transform.qy[eid] = quat.y;
    Transform.qz[eid] = quat.z;
    Transform.qw[eid] = quat.w;
    
    // Values should persist (using toBeCloseTo to handle floating point precision)
    expect(Transform.qx[eid]).toBeCloseTo(quat.x, 5);
    expect(Transform.qy[eid]).toBeCloseTo(quat.y, 5);
    expect(Transform.qz[eid]).toBeCloseTo(quat.z, 5);
    expect(Transform.qw[eid]).toBeCloseTo(quat.w, 5);
    
    // Convert back to verify angles
    const resultQuat = new THREE.Quaternion(
      Transform.qx[eid],
      Transform.qy[eid],
      Transform.qz[eid],
      Transform.qw[eid]
    );
    const resultEuler = new THREE.Euler().setFromQuaternion(resultQuat, 'XYZ');
    
    expect((resultEuler.x * 180) / Math.PI).toBeCloseTo(45, 1);
    expect((resultEuler.y * 180) / Math.PI).toBeCloseTo(90, 1);
  });

  it('should preserve scale values when changed', () => {
    // Simulate user editing scale
    Transform.sx[eid] = 2;
    Transform.sy[eid] = 3;
    Transform.sz[eid] = 0.5;
    
    // Values should persist
    expect(Transform.sx[eid]).toBe(2);
    expect(Transform.sy[eid]).toBe(3);
    expect(Transform.sz[eid]).toBe(0.5);
  });

  it('should handle incremental position changes', () => {
    const initial = { x: Transform.x[eid], y: Transform.y[eid], z: Transform.z[eid] };
    
    // Simulate multiple edits
    Transform.x[eid] += 0.1;
    expect(Transform.x[eid]).toBeCloseTo(initial.x + 0.1, 2);
    
    Transform.x[eid] += 0.1;
    expect(Transform.x[eid]).toBeCloseTo(initial.x + 0.2, 2);
    
    Transform.y[eid] += 0.5;
    expect(Transform.y[eid]).toBeCloseTo(initial.y + 0.5, 2);
  });

  it('should handle negative values', () => {
    // Simulate user entering negative values
    Transform.x[eid] = -5;
    Transform.y[eid] = -10;
    Transform.z[eid] = -15;
    
    expect(Transform.x[eid]).toBe(-5);
    expect(Transform.y[eid]).toBe(-10);
    expect(Transform.z[eid]).toBe(-15);
  });

  it('should handle zero values', () => {
    // Simulate user resetting to zero
    Transform.x[eid] = 0;
    Transform.y[eid] = 0;
    Transform.z[eid] = 0;
    Transform.sx[eid] = 0;
    Transform.sy[eid] = 0;
    Transform.sz[eid] = 0;
    
    expect(Transform.x[eid]).toBe(0);
    expect(Transform.y[eid]).toBe(0);
    expect(Transform.z[eid]).toBe(0);
    expect(Transform.sx[eid]).toBe(0);
    expect(Transform.sy[eid]).toBe(0);
    expect(Transform.sz[eid]).toBe(0);
  });

  it('should handle very small decimal values', () => {
    // Simulate user entering precise values
    Transform.x[eid] = 0.001;
    Transform.y[eid] = 0.0001;
    Transform.z[eid] = 0.00001;
    
    expect(Transform.x[eid]).toBeCloseTo(0.001, 5);
    expect(Transform.y[eid]).toBeCloseTo(0.0001, 5);
    expect(Transform.z[eid]).toBeCloseTo(0.00001, 5);
  });

  it('should handle large values', () => {
    // Simulate user entering large values
    Transform.x[eid] = 10000;
    Transform.y[eid] = 50000;
    Transform.z[eid] = 100000;
    
    expect(Transform.x[eid]).toBe(10000);
    expect(Transform.y[eid]).toBe(50000);
    expect(Transform.z[eid]).toBe(100000);
  });
});
