import { describe, it, expect, vi } from 'vitest';
import { createWorld } from 'bitecs';
import { Module } from '../Module';
import { effectModule } from '../effect';
import { Transform } from '../../core/components';
import type { ECSContext } from '../../core/ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import * as THREE from 'three';
import * as GEO from '../../utils/geometry';

// Mock the renderer module to control getSpawnTransform
vi.mock('../renderer', () => ({
  getSpawnTransform: vi.fn()
}));

// Mock the spawn function
vi.mock('../../core/spawn', () => ({
  spawn: vi.fn()
}));

import { getSpawnTransform } from '../renderer';
import { spawn } from '../../core/spawn';

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
    time: new Timer()
  });
  
  // Mock archetype module - just return the bundle passed in
  world.modules.set('archetype', new Module(world, { 
    bundle: (p: any) => p
  }));
  
  // Add effect module
  world.modules.set('effect', effectModule(world));
  
  return world;
}

describe.skip('spawn effect rotation (legacy spawn effect removed)', () => {
  it('should spawn with rotation from spawnRay direction', () => {
    const ctx = ctxWithModules();
    const effect = ctx.modules.get('effect')!;
    
    // Mock getSpawnTransform to return a valid Transform object
    (getSpawnTransform as any).mockReturnValue(new GEO.Transform(
      new THREE.Vector3(0, 0, 0),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    ));
    
    // Clear previous calls and set up mock
    vi.clearAllMocks();
    (spawn as any).mockReturnValue(1);
    
    const spawnEffect = effect.get(effect.resolve({
      type: 'spawn',
      params: {
        entity: { Transform: {} },  // Entity bundle without Controller
        velocity: [10, 0, 0]
      }
    }));
    
    const actorEid = 1;
    spawnEffect.apply(actorEid);
    
    // Verify spawn was called with rotation
    expect(spawn).toHaveBeenCalledTimes(1);
    const spawnCall = (spawn as any).mock.calls[0];
    const spawnOverrides = spawnCall[2];
    
    expect(spawnOverrides.Transform).toBeDefined();
    expect(spawnOverrides.Transform.qx).toBeDefined();
    expect(spawnOverrides.Transform.qy).toBeDefined();
    expect(spawnOverrides.Transform.qz).toBeDefined();
    expect(spawnOverrides.Transform.qw).toBeDefined();
  });
  
  it('should apply yaw-only rotation for entities with Controller component', () => {
    const ctx = ctxWithModules();
    const effect = ctx.modules.get('effect')!;
    
    // Mock getSpawnTransform to return a valid Transform object
    (getSpawnTransform as any).mockReturnValue(new GEO.Transform(
      new THREE.Vector3(0, 0, 0),
      new THREE.Euler(0, Math.PI / 2, 0),
      new THREE.Vector3(1, 1, 1)
    ));
    
    vi.clearAllMocks();
    (spawn as any).mockReturnValue(1);
    
    const spawnEffect = effect.get(effect.resolve({
      type: 'spawn',
      params: {
        entity: { Transform: {}, Controller: { controllerId: 1 } },  // Has Controller component
        velocity: [10, 0, 0]
      }
    }));
    
    const actorEid = 1;
    spawnEffect.apply(actorEid);
    
    // Verify yaw rotation was applied (approximately 90 degrees around Y-axis)
    expect(spawn).toHaveBeenCalledTimes(1);
    const spawnCall = (spawn as any).mock.calls[0];
    const transform = spawnCall[2].Transform;
    
    const quat = new THREE.Quaternion(transform.qx, transform.qy, transform.qz, transform.qw);
    
    // Check that the quaternion rotates the forward vector (-Z) to the right (+X)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(quat);
    
    // Should be pointing roughly in the +X direction (allowing for floating point precision)
    expect(forward.x).toBeCloseTo(-1, 3);
    expect(forward.y).toBeCloseTo(0, 3);
    expect(forward.z).toBeCloseTo(0, 3);
  });
  
  it('should apply full rotation for entities without Controller component', () => {
    const ctx = ctxWithModules();
    const effect = ctx.modules.get('effect')!;
    
    // Mock getSpawnTransform to return a valid Transform object
    (getSpawnTransform as any).mockReturnValue(new GEO.Transform(
      new THREE.Vector3(0, 0, 0),
      new THREE.Euler(0, Math.PI / 2, 0),
      new THREE.Vector3(1, 1, 1)
    ));
    
    vi.clearAllMocks();
    (spawn as any).mockReturnValue(1);
    
    const spawnEffect = effect.get(effect.resolve({
      type: 'spawn',
      params: {
        entity: { Transform: {} },  // No Controller component
        velocity: [10, 0, 0]
      }
    }));
    
    const actorEid = 1;
    spawnEffect.apply(actorEid);
    
    // Verify that full rotation was applied
    expect(spawn).toHaveBeenCalledTimes(1);
    const spawnCall = (spawn as any).mock.calls[0];
    const transform = spawnCall[2].Transform;
    
    const quat = new THREE.Quaternion(transform.qx, transform.qy, transform.qz, transform.qw);
    
    // Check that the quaternion rotates the forward vector (-Z) to the right (+X)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(quat);
    
    // Should be pointing roughly in the +X direction
    expect(forward.x).toBeCloseTo(-1, 3);
    expect(forward.y).toBeCloseTo(0, 3);
    expect(forward.z).toBeCloseTo(0, 3);
  });
});
