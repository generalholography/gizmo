import { describe, expect, it } from 'vitest';
import { createECS, getModule, setResource } from '../ecs';
import { initialize } from '../initializeWorld';
import { serializeWorld } from '../serializeWorld';
import {
  registerRuntimeModuleType,
  unregisterRuntimeModuleType,
  upsertRuntimeModuleInstance,
} from '../runtimeModuleTypes';

describe('runtime module types', () => {
  function createContext() {
    const ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
    setResource(ctx, 'metadata', { title: 'Runtime Type Test', description: '' });
    return ctx;
  }

  it('serializes and restores persisted runtime module types and instances', () => {
    const ctx = createContext();

    registerRuntimeModuleType(ctx, {
      moduleName: 'field',
      typeName: 'radialPulse',
      description: 'Distance-based pulse field',
      parameterSchema: {
        type: 'object',
        properties: {
          radius: { type: 'number' },
          amplitude: { type: 'number' },
        },
      },
      factorySource:
        '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
    });
    upsertRuntimeModuleInstance(ctx, 'field', 'pulseMask', {
      type: 'radialPulse',
      params: { radius: 0.5, amplitude: 2 },
    });

    const fieldModule = getModule<any>(ctx, 'field')!;
    const resolved = fieldModule.get(fieldModule.resolve('pulseMask'));
    expect(resolved.sample3D(0.1, 0, 0.1)).toBe(2);
    expect(resolved.sample3D(1, 0, 1)).toBe(0);

    const serialized = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
    expect(serialized.moduleTypes).toEqual([
      expect.objectContaining({
        moduleName: 'field',
        typeName: 'radialPulse',
        description: 'Distance-based pulse field',
      }),
    ]);
    expect(serialized.modules?.field).toEqual([
      expect.objectContaining({
        name: 'pulseMask',
        definition: {
          type: 'radialPulse',
          params: { radius: 0.5, amplitude: 2 },
        },
      }),
    ]);

    const restoredCtx = createContext();
    initialize(restoredCtx, serialized);

    const restoredFieldModule = getModule<any>(restoredCtx, 'field')!;
    const restored = restoredFieldModule.get(restoredFieldModule.resolve('pulseMask'));
    expect(restored.sample3D(0.1, 0, 0.1)).toBe(2);
    expect(restored.sample3D(1, 0, 1)).toBe(0);
  });

  it('prevents removing a runtime module type while instances still reference it', () => {
    const ctx = createContext();

    registerRuntimeModuleType(ctx, {
      moduleName: 'field',
      typeName: 'radialPulse',
      factorySource:
        '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
    });
    upsertRuntimeModuleInstance(ctx, 'field', 'pulseMask', {
      type: 'radialPulse',
      params: { radius: 1, amplitude: 1 },
    });

    expect(() => unregisterRuntimeModuleType(ctx, 'field', 'radialPulse')).toThrow(
      "Cannot remove module type 'field:radialPulse' while module instances still reference it",
    );
  });

  it('does not allow the runtime registry API to remove untracked built-in module types', () => {
    const ctx = createContext();

    expect(() => unregisterRuntimeModuleType(ctx, 'field', 'simplex')).toThrow(
      "Runtime module type 'field:simplex' is not managed by the runtime extensibility registry",
    );
  });
});
