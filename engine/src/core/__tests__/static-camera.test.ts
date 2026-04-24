import { describe, it, expect } from 'vitest';
import { createWorld, hasComponent } from 'bitecs';
import { spawn } from '../spawn';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { StaticCamera } from '../components/StaticCamera';
import { Transform } from '../components/Transform';

function ctxWithModules(displayMode: boolean = false): ECSContext {
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
  
  // Add motionSource module mock
  class MockMotionSourceModule extends Module<any, any> {
    private mockRegistry: Record<number, any> = {};
    private mockDefinitions: Record<number, any> = {};
    
    constructor(ctx: any) {
      super(ctx, {});
    }
    
    resolve(def: any): number {
      const str = JSON.stringify(def);
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      const id = hash >>> 0;
      this.mockRegistry[id] = { bodyType: "static" };
      this.mockDefinitions[id] = def;
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id] || { bodyType: "static" };
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }
    
    clear(): void {
      this.mockRegistry = {};
      this.mockDefinitions = {};
    }
  }
  
  world.modules.set('motionSource', new MockMotionSourceModule(world));
  
  // Set display mode as a resource using the proper format
  world.resources.set('displayMode', { resource: displayMode, dispose: undefined });
  
  return world;
}

describe('StaticCamera component', () => {
  it('should spawn StaticCamera entity in display mode with default values', () => {
    const ctx = ctxWithModules(true);
    
    const cameraEid = spawn(ctx, {
      Transform: { x: 10, y: 20, z: 30 },
      StaticCamera: {}
    });
    
    expect(hasComponent(ctx, StaticCamera, cameraEid)).toBe(true);
    expect(hasComponent(ctx, Transform, cameraEid)).toBe(true);
    
    // Check default values
    expect(StaticCamera.fov[cameraEid]).toBe(75);
    expect(StaticCamera.lookAtX[cameraEid]).toBe(0);
    expect(StaticCamera.lookAtY[cameraEid]).toBe(0);
    expect(StaticCamera.lookAtZ[cameraEid]).toBe(0);
  });

  it('should spawn StaticCamera entity with custom fov and lookAt', () => {
    const ctx = ctxWithModules(true);
    
    const cameraEid = spawn(ctx, {
      Transform: { x: 0, y: 50, z: 50 },
      StaticCamera: {
        fov: 60,
        lookAt: { x: 10, y: 5, z: 0 }
      }
    });
    
    expect(hasComponent(ctx, StaticCamera, cameraEid)).toBe(true);
    expect(StaticCamera.fov[cameraEid]).toBe(60);
    expect(StaticCamera.lookAtX[cameraEid]).toBe(10);
    expect(StaticCamera.lookAtY[cameraEid]).toBe(5);
    expect(StaticCamera.lookAtZ[cameraEid]).toBe(0);
  });

  it('should spawn StaticCamera entity with separate lookAt coordinates', () => {
    const ctx = ctxWithModules(true);
    
    const cameraEid = spawn(ctx, {
      Transform: { x: 5, y: 10, z: 15 },
      StaticCamera: {
        fov: 90,
        lookAtX: 1,
        lookAtY: 2,
        lookAtZ: 3
      }
    });
    
    expect(hasComponent(ctx, StaticCamera, cameraEid)).toBe(true);
    expect(StaticCamera.fov[cameraEid]).toBe(90);
    expect(StaticCamera.lookAtX[cameraEid]).toBe(1);
    expect(StaticCamera.lookAtY[cameraEid]).toBe(2);
    expect(StaticCamera.lookAtZ[cameraEid]).toBe(3);
  });

  it('should NOT spawn StaticCamera component when not in display mode', () => {
    const ctx = ctxWithModules(false); // display mode = false
    
    const cameraEid = spawn(ctx, {
      Transform: { x: 10, y: 20, z: 30 },
      StaticCamera: {
        fov: 60,
        lookAt: { x: 0, y: 0, z: 0 }
      }
    });
    
    // StaticCamera component should not be added
    expect(hasComponent(ctx, StaticCamera, cameraEid)).toBe(false);
    // But Transform should still exist
    expect(hasComponent(ctx, Transform, cameraEid)).toBe(true);
  });
});
