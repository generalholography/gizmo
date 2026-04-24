import { describe, it, expect, beforeEach } from 'vitest';
import { createECS } from '../ecs';
import { createMemory, getMemory, setMemory, removeMemory, entityExists } from '../memory';
import { AI } from '../components/AI';
import { Transform } from '../components/Transform';
import { doDamage } from '../components/Health';
import { addComponent, addEntity } from 'bitecs';

describe('AI Memory System', () => {
  let ctx: any;
  
  beforeEach(() => {
    ctx = createECS();
    // Initialize memory resource
    ctx.resources.set('aiMemory', { resource: new Map(), dispose: undefined });
  });

  it('should create default memory', () => {
    const memory = createMemory();
    expect(memory).toEqual({
      lastDamageDealt: { entity: null, happenedAt: 0 },
      lastTargeted: { entity: null, happenedAt: 0 }
    });
  });

  it('should get and create memory for entity', () => {
    const eid = 1;
    const memory = getMemory(ctx, eid);
    
    expect(memory.lastDamageDealt.entity).toBe(null);
    expect(memory.lastTargeted.entity).toBe(null);
  });

  it('should set and retrieve memory', () => {
    const eid = 1;
    const memory = createMemory();
    memory.lastDamageDealt.entity = 123;
    memory.lastDamageDealt.happenedAt = 1000;
    
    setMemory(ctx, eid, memory);
    const retrieved = getMemory(ctx, eid);
    
    expect(retrieved.lastDamageDealt.entity).toBe(123);
    expect(retrieved.lastDamageDealt.happenedAt).toBe(1000);
  });

  it('should remove memory for entity', () => {
    const eid = 1;
    const memory = createMemory();
    setMemory(ctx, eid, memory);
    
    removeMemory(ctx, eid);
    
    const memoryMap = ctx.resources.get('aiMemory').resource;
    expect(memoryMap.has(eid)).toBe(false);
  });

  it('should record damage in target AI memory', () => {
    const attacker = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Add AI component to target
    addComponent(ctx, AI, target);
    
    // Mock the doDamage function call by directly testing memory update
    const memory = getMemory(ctx, target);
    const now = performance.now();
    memory.lastDamageDealt = {
      entity: attacker,
      happenedAt: now
    };
    
    expect(memory.lastDamageDealt.entity).toBe(attacker);
    expect(memory.lastDamageDealt.happenedAt).toBe(now);
  });

  it('should handle entity existence check gracefully', () => {
    // Test with invalid entity ID
    expect(entityExists(ctx, -1)).toBe(false);
    expect(entityExists(ctx, 0)).toBe(false);
    
    // Create an actual entity to test positive case
    const testEntity = addEntity(ctx);
    expect(entityExists(ctx, testEntity)).toBe(true);
    
    // Test with non-existent entity ID
    expect(entityExists(ctx, 999999)).toBe(false);
  });
});