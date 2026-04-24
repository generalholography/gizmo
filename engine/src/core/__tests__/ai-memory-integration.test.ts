import { describe, it, expect, beforeEach } from 'vitest';
import { createECS } from '../ecs';
import { getMemory } from '../memory';
import { doDamage } from '../components/Health';
import { AI } from '../components/AI';
import { Health } from '../components/Health';
import { addComponent, addEntity } from 'bitecs';

describe('AI Memory Integration', () => {
  let ctx: any;
  
  beforeEach(() => {
    ctx = createECS();
    // Initialize required resources
    ctx.resources.set('aiMemory', { resource: new Map(), dispose: undefined });
    ctx.resources.set('metrics', { resource: { increment: () => {} }, dispose: undefined });
    ctx.resources.set('renderObjects', { resource: new Map(), dispose: undefined });
  });

  it('should record aggressor in target memory when AI takes damage', () => {
    const attacker = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Add AI component to target
    addComponent(ctx, AI, target);
    addComponent(ctx, Health, target);
    
    // Set health for target
    Health.value[target] = 100;
    Health.maxValue[target] = 100;
    
    // Deal damage
    doDamage(ctx, attacker, target, 25);
    
    // Check if memory was updated
    const memory = getMemory(ctx, target);
    expect(memory.lastDamageDealt.entity).toBe(attacker);
    expect(memory.lastDamageDealt.happenedAt).toBeGreaterThan(0);
    expect(Health.value[target]).toBe(75);
  });

  it('should not record memory for non-AI entities', () => {
    const attacker = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Only add Health component to target (no AI)
    addComponent(ctx, Health, target);
    
    // Set health for target
    Health.value[target] = 100;
    Health.maxValue[target] = 100;
    
    // Deal damage
    doDamage(ctx, attacker, target, 25);
    
    // Check that no memory was created
    const memoryMap = ctx.resources.get('aiMemory').resource;
    expect(memoryMap.has(target)).toBe(false);
    expect(Health.value[target]).toBe(75);
  });

  it('should handle damage gracefully when memory system fails', () => {
    const attacker = addEntity(ctx);
    const target = addEntity(ctx);
    
    // Add AI component to target
    addComponent(ctx, AI, target);
    addComponent(ctx, Health, target);
    
    // Set health for target
    Health.value[target] = 100;
    Health.maxValue[target] = 100;
    
    // Remove memory resource to simulate failure
    ctx.resources.delete('aiMemory');
    
    // Deal damage - should not crash
    expect(() => {
      doDamage(ctx, attacker, target, 25);
    }).not.toThrow();
    
    // Damage should still be applied
    expect(Health.value[target]).toBe(75);
  });
});