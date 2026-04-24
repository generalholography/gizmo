import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { Health, doHeal } from '../../core/components/Health';
import { applyEffect, effectModule } from '../effect';
import { Effect } from '../../core/schema';
import { Timer } from 'three/examples/jsm/misc/Timer.js';

function makeCtx(): ECSContext {
  const world = createWorld() as ECSContext;
  
  // Add basic required properties
  Object.assign(world, {
    time: new Timer(),
    three: { scene: { remove: vi.fn() } },
    rapier: { world: { removeRigidBody: vi.fn() } },
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    input: {} as any
  });

  // Set up required resources
  setResource(world, 'renderObjects', new Map());
  setResource(world, 'metrics', {
    increment: vi.fn()
  });

  // Add effect module
  world.modules.set('effect', effectModule(world));

  return world;
}

describe('Heal Effect', () => {
  let ctx: ECSContext;
  let healer: number;
  let target: number;

  beforeEach(() => {
    ctx = makeCtx();
    healer = addEntity(ctx);
    target = addEntity(ctx);
    
    // Add health component to target
    addComponent(ctx, Health, target);
  });

  describe('doHeal function', () => {
    it('should heal target when they have health below max', () => {
      // Set up target with partial health
      Health.value[target] = 10;
      Health.maxValue[target] = 20;

      const result = doHeal(ctx, healer, target, 5);

      expect(result).toBe(true);
      expect(Health.value[target]).toBe(15);
    });

    it('should not heal above max health', () => {
      // Set up target with partial health
      Health.value[target] = 18;
      Health.maxValue[target] = 20;

      const result = doHeal(ctx, healer, target, 5);

      expect(result).toBe(true);
      expect(Health.value[target]).toBe(20); // Should cap at max
    });

    it('should return false when target is already at max health', () => {
      // Set up target with full health
      Health.value[target] = 20;
      Health.maxValue[target] = 20;

      const result = doHeal(ctx, healer, target, 5);

      expect(result).toBe(false);
      expect(Health.value[target]).toBe(20); // Should remain unchanged
    });

    it('should return false when target has no health component', () => {
      // Don't set up health component for target
      const result = doHeal(ctx, healer, target, 5);

      expect(result).toBe(false);
    });

    it('should heal exact amount when it fits within max health', () => {
      Health.value[target] = 5;
      Health.maxValue[target] = 20;

      const result = doHeal(ctx, healer, target, 10);

      expect(result).toBe(true);
      expect(Health.value[target]).toBe(15);
    });
  });

  describe('heal effect via applyEffect', () => {
    it('should apply heal effect correctly', () => {
      Health.value[target] = 10;
      Health.maxValue[target] = 20;

      const effect: Effect = {
        type: "heal",
        params: { amount: 5 },
        target: "other"
      };

      const result = applyEffect(ctx, effect, healer, target);

      expect(result).toBe(true);
      expect(Health.value[target]).toBe(15);
    });

    it('should fail when target is at max health', () => {
      Health.value[target] = 20;
      Health.maxValue[target] = 20;

      const effect: Effect = {
        type: "heal",
        params: { amount: 5 },
        target: "other"
      };

      const result = applyEffect(ctx, effect, healer, target);

      expect(result).toBe(false);
      expect(Health.value[target]).toBe(20);
    });

    it('should work with default heal amount of 1', () => {
      Health.value[target] = 10;
      Health.maxValue[target] = 20;

      const effect: Effect = {
        type: "heal",
        target: "other"
      };

      const result = applyEffect(ctx, effect, healer, target);

      expect(result).toBe(true);
      expect(Health.value[target]).toBe(11);
    });
  });
});