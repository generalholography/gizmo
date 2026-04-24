import { describe, it, expect, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import type { ECSContext } from '../ecs';
import { setResource, setModule } from '../ecs';
import { LazyMap } from '../../utils/lazyMap';
import { collisionSystem } from '../systems/collision';
import { motionSourceModule } from '../../modules/motionSource';
import { Health, Player } from '../components';
import { getStore, StockStore } from '../../modules/entityStore';
import { getPlayerHealthValues } from '../ui/HUD/HealthBar';
import { handleInteractAtTarget } from '../systems/motionControl';
import { canShowInteractPrompt } from '../ui/HUD/LookAtInfoText';
import { handleCollisionTriggerAtTarget } from '../systems/motionControl';

function makeCtx(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    input: {} as any,
    time: { getElapsed: () => 0 } as any,
    rapier: { world: { getRigidBody: () => undefined } } as any,
  });
  setResource(world, 'effectsArrays', new Map());
  setResource(world, 'activeAnimations', new Map());
  return world;
}

describe('stores/rules runtime regressions', () => {
  it('HealthBar values prefer authoritative health stock over legacy Health component values', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);

    addComponent(ctx, Player, eid);
    addComponent(ctx, Health, eid);

    Health.value[eid] = 1;
    Health.maxValue[eid] = 1;

    const healthStore = getStore<StockStore>(ctx, 'health');
    healthStore.set(eid, { current: 12, max: 20, min: 0 });

    expect(getPlayerHealthValues(ctx, eid)).toEqual({ value: 12, maxValue: 20 });
  });

  it('interact trigger checks Rules even when target has no legacy OnInteract component', () => {
    const ctx = makeCtx();
    const interactor = addEntity(ctx);
    const target = addEntity(ctx);

    const emitEngineTrigger = vi.fn(() => 1);
    setModule(ctx, 'rule', {
      emitEngineTrigger,
    } as any);

    handleInteractAtTarget(ctx, interactor, target, 1, 7);

    expect(emitEngineTrigger).toHaveBeenCalledTimes(1);
    expect(emitEngineTrigger).toHaveBeenCalledWith('interact', { self: target, other: interactor, user: interactor });
  });

  it('interact prompt visibility includes rules-based interactables', () => {
    const ctx = makeCtx();
    const target = addEntity(ctx);

    setModule(ctx, 'rule', {
      hasEngineTriggerForEntity: (eid: number, triggerType: string) => eid === target && triggerType === 'interact',
    } as any);

    expect(canShowInteractPrompt(ctx, target)).toBe(true);
  });

  it('character-controller collision checks both directed rule contexts for the same pair', () => {
    const ctx = makeCtx();

    const calls: Array<{ self: number; other: number }> = [];
    setModule(ctx, 'rule', {
      emitEngineTrigger: (_trigger: string, context: { self: number; other: number }) => {
        calls.push(context);
        return 0;
      },
    } as any);

    handleCollisionTriggerAtTarget(ctx, 10, 11);
    handleCollisionTriggerAtTarget(ctx, 11, 10);

    expect(calls).toEqual([
      { self: 10, other: 11 },
      { self: 11, other: 10 },
    ]);
  });

  it('collision trigger checks Rules even without legacy OnCollisionEnter component', () => {
    const ctx = makeCtx();
    const source = addEntity(ctx);
    const target = addEntity(ctx);

    const emitEngineTrigger = vi.fn(() => 1);
    setModule(ctx, 'rule', {
      emitEngineTrigger,
    } as any);

    handleCollisionTriggerAtTarget(ctx, source, target);

    expect(emitEngineTrigger).toHaveBeenCalledTimes(1);
    expect(emitEngineTrigger).toHaveBeenCalledWith('collisionEnter', { self: source, other: target });
  });

  it('collision system evaluates rule collisions for both directed contexts in one physical contact', () => {
    const ctx = makeCtx();
    const player = addEntity(ctx);
    const hazard = addEntity(ctx);

    const calls: Array<{ self: number; other: number }> = [];
    setModule(ctx, 'rule', {
      emitEngineTrigger: (_trigger: string, context: { self: number; other: number }) => {
        calls.push(context);
        return context.self === hazard ? 1 : 0;
      },
    } as any);

    const rbByHandle = new Map<number, any>([
      [100, { handle: 100 }],
      [200, { handle: 200 }],
    ]);
    const colliderByHandle = new Map<number, any>([
      [1, { isSensor: () => false, parent: () => rbByHandle.get(100) }],
      [2, { isSensor: () => false, parent: () => rbByHandle.get(200) }],
    ]);

    (ctx as any).rapier = {
      world: {
        getCollider: (handle: number) => colliderByHandle.get(handle),
      },
    };

    setResource(ctx, 'handleToEntity', new Map<number, number>([
      [100, player],
      [200, hazard],
    ]));
    setResource(ctx, 'collisionEventCallbacks', []);
    setResource(ctx, 'sensorIntersectionPairs', new LazyMap<number, Set<number>>(() => new Set<number>()));
    setResource(ctx, 'eventQueue', {
      drainCollisionEvents: (cb: (h1: number, h2: number, started: boolean) => void) => cb(1, 2, true),
    } as any);
    setModule(ctx, 'motionSource', motionSourceModule(ctx as any) as any);

    collisionSystem(ctx);

    expect(calls).toEqual([
      { self: player, other: hazard },
      { self: hazard, other: player },
    ]);
  });


});
