import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnerModule, spawnerModule, Position } from '../spawner';
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
  get: vi.fn(() => ({
    sample3D: vi.fn((x, _y, z) => Math.sin(x * 4) * 0.5 + Math.cos(z * 4) * 0.5),
  })),
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

describe('Spawner Module - Canonical Extensions', () => {
  let ctx: ECSContext;
  let spawner: SpawnerModule;

  beforeEach(() => {
    ctx = createMockContext();
    spawner = spawnerModule(ctx);
    vi.clearAllMocks();
  });

  it('registers custom spawner executor type', () => {
    spawner.registerSpawnerExecutor('ring', (_ctx, params: any) => {
      const positions = Array.from({ length: params.count }, (_, i) => ({
        x: params.center.x + Math.cos((i / params.count) * Math.PI * 2) * params.radius,
        y: params.center.y,
        z: params.center.z + Math.sin((i / params.count) * Math.PI * 2) * params.radius,
      }));
      return { entityIds: positions.map((_, i) => i + 1), positions };
    });

    expect(spawner.getAvailableTypes().spawners).toContain('ring');
  });

  it('registers and uses custom placement primitive', () => {
    spawner.registerPlacementPrimitive('hexgrid', (params: { center: Position; count: number; radius: number }) =>
      Array.from({ length: params.count }, (_, i) => ({
        x: params.center.x + Math.cos((i / Math.max(1, params.count)) * Math.PI * 2) * params.radius,
        y: params.center.y,
        z: params.center.z + Math.sin((i / Math.max(1, params.count)) * Math.PI * 2) * params.radius,
      }))
    );

    const placement = ctx.modules.get('placement') as any;
    const positions = placement.generate({
      type: 'hexgrid',
      params: { center: { x: 0, y: 0, z: 0 }, radius: 2, count: 7 },
    });

    expect(positions.length).toBe(7);
  });

  it('registers custom selection strategy', () => {
    spawner.registerSelectionStrategy('altitudeBased', (params: any, _i, position) => {
      if (position.y > 2) return params.high;
      if (position.y < -2) return params.low;
      return params.mid;
    });

    const selection = ctx.modules.get('selection') as any;
    expect(selection.select({ type: 'altitudeBased', params: { high: 'a', mid: 'b', low: 'c' } }, 0, { x: 0, y: 3, z: 0 }, ctx)).toBe('a');
    expect(selection.select({ type: 'altitudeBased', params: { high: 'a', mid: 'b', low: 'c' } }, 0, { x: 0, y: -3, z: 0 }, ctx)).toBe('c');
  });

  it('supports canonical cluster placement', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'clusters',
        placement: {
          type: 'cluster',
          params: {
            bounds: { x: [-30, 30], z: [-30, 30] },
            clusterCount: 3,
            perCluster: 4,
            clusterRadius: 2,
            clusterSeparation: 6,
          },
        },
        selection: { type: 'single', params: { entity: 'mushroom' } },
      },
    });

    const result = spawner.getResult('clusters');
    expect(result).toBeDefined();
    expect(result!.entityIds.length).toBe(12);
  });

  it('supports canonical polyline placement', () => {
    spawner.registerSpawner({
      type: 'composite',
      params: {
        name: 'pathlike',
        placement: {
          type: 'polyline',
          params: {
            path: {
              type: 'polyline',
              params: {
                points: [
                  { x: 0, y: 0, z: 0 },
                  { x: 10, y: 0, z: 0 },
                  { x: 20, y: 0, z: 5 },
                ],
                closed: false,
              },
            },
            spacing: 5,
          },
        },
        selection: { type: 'single', params: { entity: 'marker' } },
      },
    });

    const result = spawner.getResult('pathlike');
    expect(result).toBeDefined();
    expect(result!.positions.length).toBeGreaterThan(0);
  });
});
