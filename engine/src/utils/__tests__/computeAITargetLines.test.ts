import { describe, it, expect, beforeEach } from 'vitest';
import { computeAITargetLines } from '../computeAITargetLines';
import { ECSContext } from '../../core/ecs';
import { createWorld, addComponent, addEntity } from 'bitecs';
import { AI, Transform } from '../../core/components';

describe('computeAITargetLines', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createWorld() as ECSContext;
    ctx.modules = new Map();
    ctx.resources = new Map();
    ctx.pipeline = [];
    ctx.isPlaying = true;
    ctx.three = {} as any;
    ctx.rapier = {} as any;
    ctx.input = {} as any;
  });

  it('should return empty arrays when no AI entities exist', () => {
    const result = computeAITargetLines(ctx);
    expect(result.vertices).toEqual([]);
    expect(result.colors).toEqual([]);
  });

  it('should compute line data for AI entities with targets', () => {
    // Create an AI entity
    const eid = addEntity(ctx);
    addComponent(ctx, AI, eid);
    addComponent(ctx, Transform, eid);
    
    // Set entity position
    Transform.x[eid] = 0;
    Transform.y[eid] = 1;
    Transform.z[eid] = 0;
    
    // Set target position
    AI._target[eid][0] = 5;
    AI._target[eid][1] = 1;
    AI._target[eid][2] = 5;
    
    const result = computeAITargetLines(ctx);
    
    // Should have one line (2 vertices, 6 coordinates)
    expect(result.vertices).toHaveLength(6);
    expect(result.colors).toHaveLength(6);
    
    // Check line goes from entity to target
    expect(result.vertices).toEqual([0, 1, 0, 5, 1, 5]);
    expect(result.colors).toEqual([1, 0, 0, 1, 0, 0]); // Red color for both points
  });

  it('should skip lines when target is same as current position', () => {
    // Create an AI entity
    const eid = addEntity(ctx);
    addComponent(ctx, AI, eid);
    addComponent(ctx, Transform, eid);
    
    // Set entity position
    Transform.x[eid] = 0;
    Transform.y[eid] = 1;
    Transform.z[eid] = 0;
    
    // Set target position same as entity position
    AI._target[eid][0] = 0;
    AI._target[eid][1] = 1;
    AI._target[eid][2] = 0;
    
    const result = computeAITargetLines(ctx);
    
    // Should have no lines since target is same as position
    expect(result.vertices).toEqual([]);
    expect(result.colors).toEqual([]);
  });

  it('should handle multiple AI entities', () => {
    // Create two AI entities
    const eid1 = addEntity(ctx);
    addComponent(ctx, AI, eid1);
    addComponent(ctx, Transform, eid1);
    
    const eid2 = addEntity(ctx);
    addComponent(ctx, AI, eid2);
    addComponent(ctx, Transform, eid2);
    
    // Set first entity
    Transform.x[eid1] = 0;
    Transform.y[eid1] = 0;
    Transform.z[eid1] = 0;
    AI._target[eid1][0] = 1;
    AI._target[eid1][1] = 0;
    AI._target[eid1][2] = 0;
    
    // Set second entity
    Transform.x[eid2] = 2;
    Transform.y[eid2] = 0;
    Transform.z[eid2] = 2;
    AI._target[eid2][0] = 3;
    AI._target[eid2][1] = 0;
    AI._target[eid2][2] = 3;
    
    const result = computeAITargetLines(ctx);
    
    // Should have two lines (4 vertices, 12 coordinates)
    expect(result.vertices).toHaveLength(12);
    expect(result.colors).toHaveLength(12);
    
    // All colors should be red
    expect(result.colors).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
  });
});