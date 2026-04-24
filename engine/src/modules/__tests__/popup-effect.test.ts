import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { ECSContext, setResource } from '../../core/ecs';
import { applyEffect, effectModule } from '../effect';
import { Effect } from '../../core/schema';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { Player } from '../../core/components';

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
    input: {} as any,
    showTextModal: vi.fn() // Mock the showTextModal function
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

describe('Popup Effect', () => {
  let ctx: ECSContext;
  let playerEntity: number;

  beforeEach(() => {
    ctx = makeCtx();
    playerEntity = addEntity(ctx);
    addComponent(ctx, Player, playerEntity);
  });

  it('should show text modal when popup effect is applied to player', () => {
    const effect: Effect = {
      type: "popup",
      params: { text: "Hello World!" },
      target: "other"
    };

    const result = applyEffect(ctx, effect, playerEntity, playerEntity);

    expect(result).toBe(true);
    expect((ctx as any).showTextModal).toHaveBeenCalledWith("Hello World!");
  });

  it('should use default text when no text is provided', () => {
    const effect: Effect = {
      type: "popup",
      params: {},
      target: "other"
    };

    const result = applyEffect(ctx, effect, playerEntity, playerEntity);

    expect(result).toBe(true);
    expect((ctx as any).showTextModal).toHaveBeenCalledWith("No text provided");
  });

  it('should fail when actor is not a player (no InputState)', () => {
    const nonPlayerEntity = addEntity(ctx);
    
    const effect: Effect = {
      type: "popup",
      params: { text: "Hello World!" },
      target: "other"
    };

    const result = applyEffect(ctx, effect, nonPlayerEntity, nonPlayerEntity);

    expect(result).toBe(false);
    expect((ctx as any).showTextModal).not.toHaveBeenCalled();
  });

  it('should fail when showTextModal function is not available', () => {
    // Remove the showTextModal function
    delete (ctx as any).showTextModal;

    const effect: Effect = {
      type: "popup",
      params: { text: "Hello World!" },
      target: "other"
    };

    const result = applyEffect(ctx, effect, playerEntity, playerEntity);

    expect(result).toBe(false);
  });
});
