import { describe, it, expect, vi } from 'vitest';
import { createWorld } from 'bitecs';
import { spawn } from '../spawn';
import { doDamage, Health } from '../components/Health';
import { Player } from '../components/Player';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import EventEmitter from '../../utils/eventEmitter';
import { Module } from '../../modules/Module';

function createTestContext(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    three: {} as any,
    rapier: {} as any,
    input: {} as any,
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    time: new Timer()
  });
  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));
  
  // Set up required resources for Health component
  world.resources.set('metrics', { resource: { increment: vi.fn() } });
  world.resources.set('lifecycleEvents', { resource: new EventEmitter() });
  world.resources.set('renderObjects', { resource: new Map(), dispose: undefined });
  world.resources.set('nextStableId', { resource: 0, dispose: undefined });
  
  return world;
}

describe('death screen integration', () => {
  it('emits player death event when player health reaches zero', () => {
    const ctx = createTestContext();
    const lifecycleEvents = ctx.resources.get('lifecycleEvents')?.resource as EventEmitter;
    
    // Spy on the player death event
    const deathEventSpy = vi.fn();
    lifecycleEvents.on('player_death', deathEventSpy);
    
    // Create a player entity with health
    const playerEid = spawn(ctx, {
      Player: {},
      Health: { value: 100, maxValue: 100 }
    });
    
    // Create an enemy entity (attacker)
    const enemyEid = spawn(ctx, {
      Health: { value: 100, maxValue: 100 }
    });
    
    // Deal fatal damage to the player
    doDamage(ctx, enemyEid, playerEid, 150);
    
    // Verify that the player death event was emitted
    expect(deathEventSpy).toHaveBeenCalledTimes(1);
    
    const eventData = deathEventSpy.mock.calls[0][0];
    expect(eventData.playerEid).toBe(playerEid);
    expect(eventData.killerEid).toBe(enemyEid);
  });

  it('does not emit player death event for non-player entities', () => {
    const ctx = createTestContext();
    const lifecycleEvents = ctx.resources.get('lifecycleEvents')?.resource as EventEmitter;
    
    // Spy on the player death event
    const deathEventSpy = vi.fn();
    lifecycleEvents.on('player_death', deathEventSpy);
    
    // Create a non-player entity with health
    const enemyEid = spawn(ctx, {
      Health: { value: 100, maxValue: 100 }
    });
    
    // Create an attacker
    const attackerEid = spawn(ctx, {
      Health: { value: 100, maxValue: 100 }
    });
    
    // Deal fatal damage to the non-player
    doDamage(ctx, attackerEid, enemyEid, 150);
    
    // Verify that no player death event was emitted
    expect(deathEventSpy).not.toHaveBeenCalled();
  });

  it('handles self-damage (suicide) correctly', () => {
    const ctx = createTestContext();
    const lifecycleEvents = ctx.resources.get('lifecycleEvents')?.resource as EventEmitter;
    
    // Spy on the player death event
    const deathEventSpy = vi.fn();
    lifecycleEvents.on('player_death', deathEventSpy);
    
    // Create a player entity with health
    const playerEid = spawn(ctx, {
      Player: {},
      Health: { value: 100, maxValue: 100 }
    });
    
    // Player damages themselves (fall damage, etc.)
    doDamage(ctx, playerEid, playerEid, 150);
    
    // Verify that the player death event was emitted with no killer
    expect(deathEventSpy).toHaveBeenCalledTimes(1);
    
    const eventData = deathEventSpy.mock.calls[0][0];
    expect(eventData.playerEid).toBe(playerEid);
    expect(eventData.killerEid).toBeUndefined();
    expect(eventData.killerName).toBeUndefined();
  });
});