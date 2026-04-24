import { describe, it, expect, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { effectModule, applyEffectWithRange } from '../../modules/effect';
import { Health } from '../../core/components/Health';
import { Faction } from '../../core/components/Faction';
import { Info } from '../../core/components/Info';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { EffectWithRange } from '../../core/schema';

function makeCtx(): ECSContext {
  const world = createWorld() as ECSContext;
  
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

  setResource(world, 'renderObjects', new Map());
  setResource(world, 'metrics', {
    increment: vi.fn()
  });

  world.modules.set('effect', effectModule(world));

  return world;
}

describe('Ranged Effects Logic', () => {
  it('should apply effect when within range', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Set up target with health
    addComponent(ctx, Health, target);
    addComponent(ctx, Faction, target);
    addComponent(ctx, Info, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 10;

    const rangedEffect: EffectWithRange = {
      type: "damage",
      params: { amount: 3 },
      target: "other",
      range: 5.0
    };

    // Apply effect within range
    const success = applyEffectWithRange(ctx, rangedEffect, actor, target, 3.0);

    expect(success).toBe(true);
    expect(Health.value[target]).toBe(7); // Damage applied
  });

  it('should not apply effect when out of range', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Set up target with health
    addComponent(ctx, Health, target);
    addComponent(ctx, Faction, target);
    addComponent(ctx, Info, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 10;

    const rangedEffect: EffectWithRange = {
      type: "damage",
      params: { amount: 3 },
      target: "other",
      range: 5.0
    };

    // Apply effect out of range
    const success = applyEffectWithRange(ctx, rangedEffect, actor, target, 7.0);

    expect(success).toBe(false);
    expect(Health.value[target]).toBe(10); // No damage applied
  });

  it('should apply effect when no range specified', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Set up target with health
    addComponent(ctx, Health, target);
    addComponent(ctx, Faction, target);
    addComponent(ctx, Info, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 10;

    const effect = {
      type: "damage",
      params: { amount: 3 },
      target: "other"
    };

    // Apply effect with no range constraint
    const success = applyEffectWithRange(ctx, effect, actor, target, 100.0);

    expect(success).toBe(true);
    expect(Health.value[target]).toBe(7); // Damage applied
  });
});