import { describe, expect, it, vi } from 'vitest';
import { ECSContext } from '../../core/ecs';
import { path3dModule } from '../path3d';
import { placementModule } from '../spawner/placement';

function createMockContext(): ECSContext {
  return {
    modules: new Map(),
    resources: new Map(),
  } as unknown as ECSContext;
}

describe('PlacementModule', () => {
  it('generates bounded random positions with deterministic random sequence', () => {
    const ctx = createMockContext();
    const module = placementModule(ctx);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const positions = module.generate({
      type: 'random',
      params: {
        bounds: { x: [-10, 10], z: [-20, 20] },
        count: 3,
      },
    } as any);

    randomSpy.mockRestore();

    expect(positions).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ]);
  });

  it('returns points placement as a copied array', () => {
    const ctx = createMockContext();
    const module = placementModule(ctx);

    const source = [{ x: 1, y: 2, z: 3 }];
    const positions = module.generate({ type: 'points', params: { positions: source } } as any);

    expect(positions).toEqual(source);
    expect(positions).not.toBe(source);
  });

  it('supports polyline placement through canonical path3d resolution', () => {
    const ctx = createMockContext();
    ctx.modules.set('path3d', path3dModule(ctx));
    const module = placementModule(ctx);

    const positions = module.generate({
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
      },
    } as any);

    expect(positions).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
    ]);
  });

  it('applies canonical polyline offset perpendicular to tangent', () => {
    const ctx = createMockContext();
    ctx.modules.set('path3d', path3dModule(ctx));
    const module = placementModule(ctx);

    const positions = module.generate({
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
        offset: 2,
      },
    } as any);

    expect(positions).toEqual([
      { x: 0, y: 0, z: 2 },
      { x: 5, y: 0, z: 2 },
    ]);
  });
});
