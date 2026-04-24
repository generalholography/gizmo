import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnerModule, spawnerModule } from '../spawner';
import { ECSContext } from '../../core/ecs';
import { placementModule } from '../spawner/placement';
import { selectionModule } from '../spawner/selection';
import { constraintsModule } from '../spawner/constraints';
import { path3dModule } from '../path3d';

vi.mock('../../core/spawn', () => ({
  spawn: vi.fn((ctx) => {
    const eid = (ctx as any)._nextEid || 1;
    (ctx as any)._nextEid = eid + 1;
    return eid;
  }),
}));

const mockFieldModule = {
  get: vi.fn(() => ({ sample3D: vi.fn(() => 1) })),
  resolve: vi.fn((name) => name),
};

function createMockContext(): ECSContext {
  const ctx = {
    _nextEid: 1,
    modules: new Map(),
  } as unknown as ECSContext;

  ctx.modules.set('field', mockFieldModule as any);
  ctx.modules.set('archetype', { get: vi.fn(() => ({})), resolve: vi.fn((name) => name) } as any);
  ctx.modules.set('path3d', path3dModule(ctx));
  ctx.modules.set('placement', placementModule(ctx));
  ctx.modules.set('selection', selectionModule(ctx));
  ctx.modules.set('constraints', constraintsModule(ctx));

  return ctx;
}

describe('Spawner Module - Canonical Defaults/Waves', () => {
  let ctx: ECSContext;
  let spawner: SpawnerModule;

  beforeEach(() => {
    ctx = createMockContext();
    spawner = spawnerModule(ctx);
    vi.clearAllMocks();
  });

  it('applies defaults and allows override', () => {
    spawner.setDefaults({ heightField: 'terrain', heightOffset: 0.1, transform: { scale: 1.2 } });

    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'defaults',
        placement: { type: 'random', params: { bounds: { x: [-5, 5], z: [-5, 5] }, count: 3 } },
        selection: { type: 'single', params: { entity: 'rock' } },
        heightOffset: 0.5,
      },
    });

    const def = spawner.getSpawnerDefinition('defaults');
    expect(def?.params.heightField).toBe('terrain');
    expect(def?.params.heightOffset).toBe(0.5);
    expect(def?.params.transform?.scale).toBe(1.2);
  });

  it('supports excludeSpawner constraint in canonical format', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'anchor',
        placement: { type: 'points', params: { positions: [{ x: 0, y: 0, z: 0 }] } },
        selection: { type: 'single', params: { entity: 'well' } },
      },
    });

    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'nearby',
        placement: { type: 'random', params: { bounds: { x: [-2, 2], z: [-2, 2] }, count: 20 } },
        selection: { type: 'single', params: { entity: 'bush' } },
        constraints: [{ type: 'excludeSpawner', spawner: 'anchor', radius: 1 }],
      },
    });

    expect(spawner.getResult('nearby')).toBeDefined();
  });

  it('initializes and advances composite schedule wave state', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'waves',
        placement: { type: 'random', params: { bounds: { x: [-10, 10], z: [-10, 10] }, count: 1 } },
        selection: { type: 'single', params: { entity: 'enemy' } },
        schedule: {
          entity: 'enemy',
          bounds: { x: [-10, 10], z: [-10, 10] },
          waves: [{ delay: 0, count: 2 }, { delay: 5, count: 3 }],
        },
      },
    });

    const initial = spawner.getWaveState('waves');
    expect(initial).toBeDefined();

    spawner.update(6);

    const updated = spawner.getWaveState('waves');
    expect(updated?.currentWaveIndex).toBeGreaterThanOrEqual(1);
  });

  it('serializes and restores execution and wave state', () => {
    const savedWaveState = {
      currentWaveIndex: 1,
      timeSinceStart: 12,
      lastWaveTime: 10,
      isActive: true,
      isComplete: false,
    };

    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'restored',
        placement: { type: 'random', params: { bounds: { x: [-10, 10], z: [-10, 10] }, count: 1 } },
        selection: { type: 'single', params: { entity: 'enemy' } },
        schedule: {
          entity: 'enemy',
          bounds: { x: [-10, 10], z: [-10, 10] },
          waves: [{ delay: 0, count: 2 }, { delay: 10, count: 3 }],
        },
      },
    }, { isExecuted: true, waveState: savedWaveState });

    const state = spawner.getWaveState('restored');
    expect(state?.currentWaveIndex).toBe(1);
    expect(spawner.isExecuted('restored')).toBe(true);

    const runtime = spawner.getRuntimeDefinitions();
    expect(runtime.find((d) => d.name === 'restored')?.waveState).toBeDefined();
  });
});
