/**
 * BulkTransformCommand Tests
 * Tests for bulk transform operations with undo/redo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BulkTransformCommand, type EntityTransform, type TransformState } from '../BulkTransformCommand';
import { createECS, setResource } from '../../../ecs';
import { spawn } from '../../../spawn';
import { Transform } from '../../../components/Transform';
import { hasComponent } from 'bitecs';

describe('BulkTransformCommand', () => {
  let ctx: ReturnType<typeof createECS>;
  
  beforeEach(() => {
    ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
    // Set up renderObjects map (required for syncObject3DTransformFromECS)
    setResource(ctx, 'renderObjects', new Map());
  });
  
  const createTransformState = (x: number, y: number, z: number): TransformState => ({
    x, y, z,
    qx: 0, qy: 0, qz: 0, qw: 1,
    sx: 1, sy: 1, sz: 1
  });
  
  it('should transform multiple entities', () => {
    // Spawn 3 entities
    const eid1 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 0 } } });
    const eid2 = spawn(ctx, { Transform: { position: { x: 5, y: 0, z: 0 } } });
    const eid3 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 5 } } });
    
    // Create bulk transform command
    const transforms: EntityTransform[] = [
      {
        eid: eid1,
        oldTransform: createTransformState(0, 0, 0),
        newTransform: createTransformState(2, 0, 0),
      },
      {
        eid: eid2,
        oldTransform: createTransformState(5, 0, 0),
        newTransform: createTransformState(7, 0, 0),
      },
      {
        eid: eid3,
        oldTransform: createTransformState(0, 0, 5),
        newTransform: createTransformState(2, 0, 5),
      }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    
    // Execute
    command.execute();
    
    // Verify all entities moved
    expect(Transform.x[eid1]).toBeCloseTo(2);
    expect(Transform.x[eid2]).toBeCloseTo(7);
    expect(Transform.x[eid3]).toBeCloseTo(2);
  });
  
  it('should undo all transforms in reverse order', () => {
    // Spawn 2 entities
    const eid1 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 0 } } });
    const eid2 = spawn(ctx, { Transform: { position: { x: 5, y: 0, z: 0 } } });
    
    const transforms: EntityTransform[] = [
      {
        eid: eid1,
        oldTransform: createTransformState(0, 0, 0),
        newTransform: createTransformState(10, 0, 0),
      },
      {
        eid: eid2,
        oldTransform: createTransformState(5, 0, 0),
        newTransform: createTransformState(15, 0, 0),
      }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    command.execute();
    
    // Undo
    command.undo();
    
    // Verify all entities returned to original positions
    expect(Transform.x[eid1]).toBeCloseTo(0);
    expect(Transform.x[eid2]).toBeCloseTo(5);
  });
  
  it('should redo transforms correctly', () => {
    const eid1 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 0 } } });
    
    const transforms: EntityTransform[] = [
      {
        eid: eid1,
        oldTransform: createTransformState(0, 0, 0),
        newTransform: createTransformState(5, 5, 5),
      }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    command.execute();
    command.undo();
    
    // Redo
    command.redo();
    
    // Verify position after redo
    expect(Transform.x[eid1]).toBeCloseTo(5);
    expect(Transform.y[eid1]).toBeCloseTo(5);
    expect(Transform.z[eid1]).toBeCloseTo(5);
  });
  
  it('should handle rotation and scale transforms', () => {
    const eid1 = spawn(ctx, { Transform: { position: { x: 0, y: 0, z: 0 } } });
    
    const transforms: EntityTransform[] = [
      {
        eid: eid1,
        oldTransform: {
          x: 0, y: 0, z: 0,
          qx: 0, qy: 0, qz: 0, qw: 1,
          sx: 1, sy: 1, sz: 1
        },
        newTransform: {
          x: 0, y: 0, z: 0,
          qx: 0.707, qy: 0, qz: 0, qw: 0.707, // 90 degree rotation around X
          sx: 2, sy: 2, sz: 2 // Double scale
        }
      }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    command.execute();
    
    // Verify rotation
    expect(Transform.qx[eid1]).toBeCloseTo(0.707);
    expect(Transform.qw[eid1]).toBeCloseTo(0.707);
    
    // Verify scale
    expect(Transform.sx[eid1]).toBeCloseTo(2);
    expect(Transform.sy[eid1]).toBeCloseTo(2);
    expect(Transform.sz[eid1]).toBeCloseTo(2);
  });
  
  it('should report correct entity count', () => {
    const eid1 = spawn(ctx, { Transform: {} });
    const eid2 = spawn(ctx, { Transform: {} });
    const eid3 = spawn(ctx, { Transform: {} });
    
    const transforms: EntityTransform[] = [
      { eid: eid1, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) },
      { eid: eid2, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) },
      { eid: eid3, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) },
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    
    expect(command.getEntityCount()).toBe(3);
  });
  
  it('should have descriptive description for single entity', () => {
    const eid1 = spawn(ctx, { Transform: {} });
    
    const transforms: EntityTransform[] = [
      { eid: eid1, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    
    expect(command.description).toBe('Transform 1 entity');
  });
  
  it('should have descriptive description for multiple entities', () => {
    const eid1 = spawn(ctx, { Transform: {} });
    const eid2 = spawn(ctx, { Transform: {} });
    
    const transforms: EntityTransform[] = [
      { eid: eid1, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) },
      { eid: eid2, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    
    expect(command.description).toBe('Transform 2 entities');
  });
  
  it('should handle entities without Transform component gracefully', () => {
    // Create command for non-existent entity (edge case)
    const transforms: EntityTransform[] = [
      { eid: 99999, oldTransform: createTransformState(0, 0, 0), newTransform: createTransformState(1, 0, 0) }
    ];
    
    const command = new BulkTransformCommand(ctx, transforms);
    
    // Should not throw
    expect(() => command.execute()).not.toThrow();
    expect(() => command.undo()).not.toThrow();
  });
});
