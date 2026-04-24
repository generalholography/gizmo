import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from 'bitecs';
import { Module } from '../Module';
import { applyActionEffect, applyEffect, effectModule } from '../effect';
import type { ECSContext } from '../../core/ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';

vi.mock('../renderer', () => ({
  getSpawnTransform: vi.fn(() => ({
    position: { x: 1, y: 2, z: 3, clone() { return { x: 1, y: 2, z: 3 }; } },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    zAxis: { clone() { return { multiplyScalar() { return { x: 0, y: 0, z: -1 }; } }; } },
  })),
}));

vi.mock('../../core/spawn', () => ({
  spawn: vi.fn(() => 123),
}));

import { spawn } from '../../core/spawn';
import { getSpawnTransform } from '../renderer';

function ctxWithModules(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    three: {} as any,
    rapier: {} as any,
    input: {} as any,
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    time: new Timer(),
  });

  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));
  world.modules.set('effect', effectModule(world));
  return world;
}

describe('applyEffect user target compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves target:user from explicit user context in rule effects', () => {
    const ctx = ctxWithModules();
    const effect = {
      type: 'spawnEntityFrom',
      target: 'user',
      params: { entity: 'friendly_skeleton', velocity: 0 },
    } as any;

    const self = 11;
    const other = 33;
    const user = 99;
    const ok = applyEffect(ctx, effect, self, other, undefined, user);

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(getSpawnTransform).toHaveBeenCalledWith(ctx, user);
  });

  it('uses the same target resolution table for action effects', () => {
    const ctx = ctxWithModules();
    const effect = {
      type: 'spawnEntityFrom',
      target: 'user',
      params: { entity: 'friendly_skeleton', velocity: 0 },
    } as any;

    const self = 21;
    const user = 44;
    const other = 55;
    const ok = applyActionEffect(ctx, effect, self, user, other);

    expect(ok).toBe(true);
    expect(getSpawnTransform).toHaveBeenCalledWith(ctx, user);
  });
});
