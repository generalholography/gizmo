import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Module } from '../Module';
import { createWorld } from 'bitecs';
import type { ECSContext } from '../../core/ecs';
import { Timer } from 'three/addons/misc/Timer.js';

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
  return world;
}

describe('Module registry cleanup', () => {
  let ctx: ECSContext;
  
  beforeEach(() => {
    ctx = createTestContext();
  });
  
  it('should start with empty registries', () => {
    const module = new Module(ctx, {
      test: (params) => ({ value: params.value })
    });
    
    expect(Object.keys(module.definitionsByName).length).toBe(0);
  });
  
  it('should accumulate definitions when registering', () => {
    const module = new Module(ctx, {
      test: (params) => ({ value: params.value })
    });
    
    module.register('def1', { type: 'test', params: { value: 1 } });
    expect(Object.keys(module.definitionsByName).length).toBe(1);
    
    module.register('def2', { type: 'test', params: { value: 2 } });
    expect(Object.keys(module.definitionsByName).length).toBe(2);
    
    module.register('def3', { type: 'test', params: { value: 3 } });
    expect(Object.keys(module.definitionsByName).length).toBe(3);
  });
  
  it('should clear all registries when clear() is called', () => {
    const module = new Module(ctx, {
      test: (params) => ({ value: params.value })
    });
    
    // Register multiple definitions
    for (let i = 0; i < 10; i++) {
      module.register(`def${i}`, { type: 'test', params: { value: i } });
    }
    
    expect(Object.keys(module.definitionsByName).length).toBe(10);
    
    // Clear module
    module.clear();
    expect(Object.keys(module.definitionsByName).length).toBe(0);
  });
  
  it('should call dispose on resources with dispose methods', () => {
    let disposeCount = 0;
    
    const module = new Module(ctx, {
      test: (params) => ({
        value: params.value,
        dispose: () => { disposeCount++; }
      })
    });
    
    // Register multiple definitions
    module.register('def1', { type: 'test', params: { value: 1 } });
    module.register('def2', { type: 'test', params: { value: 2 } });
    module.register('def3', { type: 'test', params: { value: 3 } });
    
    // Clear should call dispose on all resources
    module.clear();
    expect(disposeCount).toBe(3);
  });
  
  it('should handle multiple clear() calls safely', () => {
    const module = new Module(ctx, {
      test: (params) => ({ value: params.value })
    });
    
    module.register('def1', { type: 'test', params: { value: 1 } });
    
    module.clear();
    expect(Object.keys(module.definitionsByName).length).toBe(0);
    
    // Second clear should not throw
    expect(() => module.clear()).not.toThrow();
  });
  
  it('should handle dispose errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const module = new Module(ctx, {
      test: (params) => ({
        value: params.value,
        dispose: () => {
          throw new Error('Dispose failed');
        }
      })
    });
    
    module.register('def1', { type: 'test', params: { value: 1 } });
    
    // Clear should not throw even if dispose fails
    expect(() => module.clear()).not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    consoleWarnSpy.mockRestore();
  });
  
  it('should clear built-in definitions set', () => {
    const module = new Module(ctx, {
      test: (params) => ({ value: params.value })
    });
    
    module.addDefinition('builtin1', { type: 'test', params: { value: 1 } }, true);
    module.addDefinition('builtin2', { type: 'test', params: { value: 2 } }, true);
    
    const builtIns = module.getBuiltInDefinitions();
    expect(builtIns.length).toBe(2);
    
    module.clear();
    
    const builtInsAfter = module.getBuiltInDefinitions();
    expect(builtInsAfter.length).toBe(0);
  });
  
  it('should work with complex resources', () => {
    let geometryDisposed = false;
    let materialDisposed = false;
    
    const module = new Module(ctx, {
      mesh: (params) => ({
        geometry: {
          dispose: () => { geometryDisposed = true; }
        },
        material: {
          dispose: () => { materialDisposed = true; }
        },
        dispose: function() {
          this.geometry.dispose();
          this.material.dispose();
        }
      })
    });
    
    module.register('mesh1', { type: 'mesh', params: {} });
    
    module.clear();
    
    expect(geometryDisposed).toBe(true);
    expect(materialDisposed).toBe(true);
  });
});
