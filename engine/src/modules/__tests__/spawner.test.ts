import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnerModule, spawnerModule } from '../spawner';
import { ECSContext } from '../../core/ecs';
import { placementModule } from '../spawner/placement';
import { selectionModule } from '../spawner/selection';
import { constraintsModule } from '../spawner/constraints';
import { path3dModule } from '../path3d';
import { spawn } from '../../core/spawn';

vi.mock('../../core/spawn', () => ({
  spawn: vi.fn((ctx) => {
    const eid = (ctx as any)._nextEid || 1;
    (ctx as any)._nextEid = eid + 1;
    return eid;
  }),
}));

const mockFieldModule = {
  get: vi.fn(() => ({ sample3D: vi.fn(() => 0.25) })),
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

describe('SpawnerModule (Canonical)', () => {
  let ctx: ECSContext;
  let spawner: SpawnerModule;

  beforeEach(() => {
    ctx = createMockContext();
    spawner = spawnerModule(ctx);
    vi.clearAllMocks();
  });

  it('registers and executes composite random placement', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'trees',
        placement: { type: 'random', params: { bounds: { x: [-10, 10], z: [-10, 10] }, count: 8 } },
        selection: { type: 'single', params: { entity: 'tree' } },
      },
    });

    const result = spawner.getResult('trees');
    expect(result).toBeDefined();
    expect(result!.entityIds.length).toBe(8);
    expect(result!.positions.length).toBe(8);
  });

  it('supports weighted selection with canonical composite', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'weighted',
        placement: { type: 'random', params: { bounds: { x: [-5, 5], z: [-5, 5] }, count: 20 } },
        selection: {
          type: 'weighted',
          params: { options: [{ entity: 'oak', weight: 0.8 }, { entity: 'pine', weight: 0.2 }] },
        },
      },
    });

    const result = spawner.getResult('weighted');
    expect(result).toBeDefined();
    expect(result!.entityIds.length).toBe(20);
  });

  it('supports deferred execution', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'deferred',
        immediate: false,
        placement: { type: 'points', params: { positions: [{ x: 0, y: 0, z: 0 }] } },
        selection: { type: 'single', params: { entity: 'marker' } },
      },
    });

    expect(spawner.isExecuted('deferred')).toBe(false);
    expect(spawner.getResult('deferred')).toBeUndefined();

    spawner.execute('deferred');

    expect(spawner.isExecuted('deferred')).toBe(true);
    expect(spawner.getResult('deferred')?.entityIds.length).toBe(1);
  });

  it('returns available canonical extension types', () => {
    const types = spawner.getAvailableTypes();
    expect(types.spawners).toContain('composite');
    expect(types.placements).toContain('random');
    expect(types.placements).toContain('grid');
    expect(types.selections).toContain('single');
    expect(types.constraints).toContain('distance');
  });

  it('applies tangent orientation for polyline placement when ry is not explicitly set', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'polyline_tangent',
        placement: {
          type: 'polyline',
          params: {
            path: {
              type: 'line',
              params: {
                start: { x: 0, y: 0, z: 0 },
                end: { x: 10, y: 0, z: 0 },
                segments: 1,
              },
            },
            spacing: 5,
            orientation: 'tangent',
          },
        },
        selection: { type: 'single', params: { entity: 'marker' } },
      },
    });

    const spawnCalls = vi.mocked(spawn).mock.calls;
    expect(spawnCalls.length).toBeGreaterThan(0);
    const firstTransform = spawnCalls[0]?.[2]?.Transform as Record<string, number>;
    expect(firstTransform.ry).toBeCloseTo(Math.PI / 2, 5);
  });

  it('applies fixed orientation yaw for polyline placement', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'polyline_fixed',
        placement: {
          type: 'polyline',
          params: {
            path: {
              type: 'line',
              params: {
                start: { x: 0, y: 0, z: 0 },
                end: { x: 10, y: 0, z: 0 },
                segments: 1,
              },
            },
            spacing: 5,
            orientation: 'fixed',
            fixedYaw: Math.PI,
          },
        },
        selection: { type: 'single', params: { entity: 'marker' } },
      },
    });

    const spawnCalls = vi.mocked(spawn).mock.calls;
    expect(spawnCalls.length).toBeGreaterThan(0);
    const firstTransform = spawnCalls[0]?.[2]?.Transform as Record<string, number>;
    expect(firstTransform.ry).toBeCloseTo(Math.PI, 5);
  });

  it('ignores legacy alignToPath and falls back to default orientation', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'legacy_align_to_path',
        placement: {
          type: 'polyline',
          params: {
            path: {
              type: 'line',
              params: {
                start: { x: 0, y: 0, z: 0 },
                end: { x: 10, y: 0, z: 0 },
                segments: 1,
              },
            },
            spacing: 5,
            alignToPath: true,
          },
        } as any,
        selection: { type: 'single', params: { entity: 'marker' } },
      },
    });

    const spawnCalls = vi.mocked(spawn).mock.calls;
    expect(spawnCalls.length).toBeGreaterThan(0);
    const firstTransform = spawnCalls[0]?.[2]?.Transform as Record<string, number>;
    expect(firstTransform.ry).toBeUndefined();
  });
});
