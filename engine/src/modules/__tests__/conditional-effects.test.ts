import { describe, it, expect, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { applyEffect, effectModule } from '../effect';
import { Health } from '../../core/components/Health';
import { Transform } from '../../core/components/Transform';
import { Info } from '../../core/components/Info';
import { Faction } from '../../core/components/Faction';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { Effect } from '../../core/schema';
import { encode } from '../../utils/strings';

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

describe('Conditional Effects', () => {
  it('should execute onSuccess effects when primary effect succeeds', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Set up target with health
    addComponent(ctx, Health, target);
    addComponent(ctx, Faction, target);
    addComponent(ctx, Info, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 10;

    // Mock despawn to track if it was called
    const despawnSpy = vi.fn();
    vi.doMock('../../core/despawn', () => ({
      despawn: despawnSpy
    }));

    const effect: Effect = {
      type: "damage",
      params: { amount: 5 },
      target: "other",
      onSuccess: [
        {
          type: "kill",
          target: "other"
        }
      ]
    };

    // Apply the effect
    const success = applyEffect(ctx, effect, actor, target);

    // Should succeed and trigger kill effect
    expect(success).toBe(true);
    expect(Health.value[target]).toBeLessThanOrEqual(0);
  });

  it('should execute onFailure effects when primary effect fails', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Don't set up health component so damage will fail
    const teleportSpy = vi.fn();
    vi.doMock('./effect', () => ({
      ...vi.importActual('./effect'),
    }));

    const effect: Effect = {
      type: "damage",
      params: { amount: 5 },
      target: "other",
      onFailure: [
        {
          type: "teleport",
          params: { position: { x: 10, y: 0, z: 0 } },
          target: "self"
        }
      ]
    };

    // Apply the effect
    const success = applyEffect(ctx, effect, actor, target);

    // Should fail and trigger teleport effect
    expect(success).toBe(false);
  });

  it('should not execute onSuccess effects when primary effect fails', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Don't set up health so damage fails
    const killSpy = vi.fn();

    const effect: Effect = {
      type: "damage",
      params: { amount: 5 },
      target: "other",
      onSuccess: [
        {
          type: "kill",
          target: "other"
        }
      ]
    };

    // Apply the effect
    const success = applyEffect(ctx, effect, actor, target);

    // Should fail and not trigger kill effect
    expect(success).toBe(false);
  });

  it('should handle friendly fire correctly', () => {
    const ctx = makeCtx();
    const actor = addEntity(ctx);
    const target = addEntity(ctx);

    // Set up both entities with same faction (friendly)
    addComponent(ctx, Health, target);
    addComponent(ctx, Faction, actor);
    addComponent(ctx, Faction, target);
    addComponent(ctx, Info, target);
    Health.value[target] = 10;
    Health.maxValue[target] = 10;

    // Set same faction ID using encoded string
    Faction.id[actor] = encode("friendly");
    Faction.id[target] = encode("friendly");

    const effect: Effect = {
      type: "damage",
      params: { amount: 5 },
      target: "other",
      onSuccess: [
        {
          type: "kill",
          target: "other"
        }
      ],
      onFailure: [
        {
          type: "teleport",
          params: { position: { x: 0, y: 10, z: 0 } },
          target: "self"
        }
      ]
    };

    // Apply the effect
    const success = applyEffect(ctx, effect, actor, target);

    // Should fail due to friendly fire and trigger failure effect
    expect(success).toBe(false);
    expect(Health.value[target]).toBe(10); // Health should be unchanged
  });
});
