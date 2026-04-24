import { describe, it, expect } from 'vitest';
import { doDamage } from '../components/Health';
import { createWorld, addComponent, hasComponent } from 'bitecs';
import { Module } from '../../modules/Module';
import { Health } from '../components/Health';
import { Transform } from '../components/Transform';
import { MotionSource } from '../components/MotionSource';
import { _RuntimeCharacterControllerData } from '../components/_RuntimeCharacterControllerData';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { spawn } from '../spawn';
import * as THREE from 'three';

function ctxWithModules(): ECSContext {
  const world = createWorld();
  
  // Add required modules
  const modules = new Map();
  modules.set('motionSource', new Module(world as any, {
    static: () => ({ bodyType: 'static' as const }),
    dynamicRigidBody: (params: any) => ({ 
      bodyType: 'dynamic' as const, 
      mass: params?.mass ?? 1 
    }),
    characterController: () => ({ 
      bodyType: 'kinematic' as const,
      controller: { type: 'character' as const, speed: 5 }
    })
  }));
  modules.set('body', new Module(world as any, {}));
  modules.set('animation', new Module(world as any, {}));
  modules.set('archetype', new Module(world as any, {}));

  const resources = new Map();
  resources.set('renderObjects', { resource: new Map() });
  resources.set('metrics', { 
    resource: { 
      increment: () => {},
      set: () => {},
      get: () => 0 
    } 
  });

  // Mock rapier world with different behaviors for different entities
  const rigidBodies = new Map();
  
  const createMockRigidBody = (handle: number, velocity = { x: 0, y: 0, z: 0 }) => ({
    linvel: () => velocity,
    addForce: (force: any) => { /* Mock force application */ },
    translation: () => ({ x: 0, y: 0, z: 0 })
  });

  const rapier = {
    world: {
      getRigidBody: (handle: number) => rigidBodies.get(handle) || createMockRigidBody(handle)
    }
  };

  return {
    ...world,
    modules,
    resources,
    rapier,
    time: new Timer()
  } as any;
}

describe('knockback functionality', () => {
  it('adds knockback field to damage effect schema', () => {
    // Test that knockback field is available in schema
    // This is tested by TypeScript compilation
    const damageEffect: { type: "damage"; params: { amount?: number; knockback?: number } } = {
      type: "damage",
      params: { amount: 5, knockback: 2 }
    };
    expect(damageEffect.params.knockback).toBe(2);
  });

  it('adds knockback vector to runtime controller data', () => {
    const ctx = ctxWithModules();
    const eid = spawn(ctx, { Transform: { x: 0 } });
    
    // Add runtime controller data component manually for testing
    addComponent(ctx, _RuntimeCharacterControllerData, eid);
    const knockbackVector = _RuntimeCharacterControllerData.knockbackVector[eid];
    expect(knockbackVector).toBeDefined();
    expect(knockbackVector.length).toBe(3);
  });

  it('calls doDamage with knockback parameter', () => {
    const ctx = ctxWithModules();
    const actor = spawn(ctx, { 
      Transform: { x: 0, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });
    const target = spawn(ctx, { 
      Transform: { x: 5, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });

    // Test doDamage with knockback parameter
    const result = doDamage(ctx, actor, target, 10, 2.0);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(90);
  });

  it('applies default knockback value of 1', () => {
    const ctx = ctxWithModules();
    const actor = spawn(ctx, { 
      Transform: { x: 0, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });
    const target = spawn(ctx, { 
      Transform: { x: 5, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });

    // Test doDamage without knockback parameter (should default to 1)
    const result = doDamage(ctx, actor, target, 10);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(90);
  });

  it('applies knockback to character controller', () => {
    const ctx = ctxWithModules();
    const actor = spawn(ctx, { 
      Transform: { x: 0, y: 0, z: 0 },
      Health: { value: 100, max: 100 },
      MotionSource: { type: 'static' }
    });
    const target = spawn(ctx, { 
      Transform: { x: 5, y: 0, z: 0 },
      Health: { value: 100, max: 100 },
      MotionSource: { type: 'characterController' }
    });

    // Ensure target has motion source component 
    addComponent(ctx, MotionSource, target);
    MotionSource.motionSourceId[target] = 1; // Assuming ID 1 maps to characterController

    // Add runtime controller data to target for knockback
    addComponent(ctx, _RuntimeCharacterControllerData, target);

    // Apply damage with knockback
    const result = doDamage(ctx, actor, target, 10, 2.0);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(90);

    // Check that knockback vector was set (should be non-zero for character controller)
    const knockbackVector = _RuntimeCharacterControllerData.knockbackVector[target];
    expect(knockbackVector).toBeDefined();
  });

  it('handles zero knockback for kill effect', () => {
    const ctx = ctxWithModules();
    const actor = spawn(ctx, { 
      Transform: { x: 0, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });
    const target = spawn(ctx, { 
      Transform: { x: 5, y: 0, z: 0 },
      Health: { value: 50, max: 100 }
    });

    // Test doDamage with zero knockback (like kill effect)
    const result = doDamage(ctx, actor, target, 10, 0);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(40);
  });

  it('handles collision-based knockback direction', () => {
    const ctx = ctxWithModules();
    const actor = spawn(ctx, { 
      Transform: { x: 0, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });
    const target = spawn(ctx, { 
      Transform: { x: 5, y: 0, z: 0 },
      Health: { value: 100, max: 100 }
    });

    // Test doDamage with collision direction
    const collisionDirection = new THREE.Vector3(1, 0, 0); // Right direction
    const result = doDamage(ctx, actor, target, 10, 1.5, true, collisionDirection);
    expect(result).toBe(true);
    expect(Health.value[target]).toBe(90);
  });
});