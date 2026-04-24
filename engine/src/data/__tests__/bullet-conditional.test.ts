import { describe, it, expect, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { effectModule, applyEffect } from '../../modules/effect';
import { Health } from '../../core/components/Health';
import { Info } from '../../core/components/Info';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import bullet from '../bullet';

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
  setResource(world, 'metrics', { increment: vi.fn() });
  world.modules.set('effect', effectModule(world));
  return world;
}

describe('Bullet Conditional Effects', () => {
  it('defines entityInRange rule with damage + self-kill effects', () => {
    const rule = bullet.Rules[0];
    expect(rule.trigger.type).toBe('entityInRange');
    expect(rule.actions[0].type).toBe('damage');
    expect(rule.actions[1].type).toBe('kill');
  });

  it('damage effect succeeds when target has health', () => {
    const ctx = makeCtx();
    const bulletEntity = addEntity(ctx);
    const target = addEntity(ctx);

    addComponent(ctx, Health, target);
    addComponent(ctx, Info, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 10;

    const damageEffect = bullet.Rules[0].actions[0];
    const success = applyEffect(ctx, damageEffect as any, bulletEntity, target);

    expect(success).toBe(true);
    expect(Health.value[target]).toBe(8);
  });

  it('damage effect fails when target has no health component', () => {
    const ctx = makeCtx();
    const bulletEntity = addEntity(ctx);
    const target = addEntity(ctx);

    const damageEffect = bullet.Rules[0].actions[0];
    const success = applyEffect(ctx, damageEffect as any, bulletEntity, target);

    expect(success).toBe(false);
  });
});
