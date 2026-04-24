import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { Health } from '../../core/components/Health';
import { Transform } from '../../core/components/Transform';
import coinsEntity from '../../data/coins';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { applyEffect, effectModule } from '../effect';

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
  });
  setResource(world, 'effectsArrays', new Map());
  setResource(world, 'metrics', { increment: vi.fn() });
  world.modules.set('effect', effectModule(world));
  return world;
}

function getRule(type: string) {
  return coinsEntity.Rules.find((rule: any) => rule.trigger.type === type);
}

describe('Coins Entity', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it('coins entity defines Rules-based entityInRange heal with cooldown', () => {
    const rangeRule = getRule('entityInRange');
    expect(rangeRule).toBeDefined();
    expect(rangeRule.cooldown).toBe(1.0);
    expect(rangeRule.trigger.params.range).toBe(2.0);
  });

  it('coins should have proper heal effect configuration', () => {
    const rangeRule = getRule('entityInRange');
    const healEffect = rangeRule.actions[0];
    expect(healEffect.type).toBe('heal');
    expect(healEffect.params.amount).toBe(1);
    expect(healEffect.range).toBe(2.0);
  });

  it('coins should heal nearby entities', () => {
    const targetEid = addEntity(ctx);
    addComponent(ctx, Health, targetEid);
    addComponent(ctx, Transform, targetEid);
    Health.value[targetEid] = 50;
    Health.maxValue[targetEid] = 100;

    const healEffect = getRule('entityInRange').actions[0];
    const success = applyEffect(ctx, healEffect, 1, targetEid);

    expect(success).toBe(true);
    expect(Health.value[targetEid]).toBe(51);
  });

  it('coins should not heal entities already at max health', () => {
    const targetEid = addEntity(ctx);
    addComponent(ctx, Health, targetEid);
    addComponent(ctx, Transform, targetEid);
    Health.value[targetEid] = 100;
    Health.maxValue[targetEid] = 100;

    const healEffect = getRule('entityInRange').actions[0];
    const success = applyEffect(ctx, healEffect, 1, targetEid);

    expect(success).toBe(false);
    expect(Health.value[targetEid]).toBe(100);
  });

  it('coins should define Rules-based interact pickup', () => {
    const interactRule = getRule('interact');
    expect(interactRule).toBeDefined();
    expect(interactRule.actions[0].type).toBe('getPickedUp');
  });
});
