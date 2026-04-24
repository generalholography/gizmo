import { describe, expect, it } from 'vitest';
import { ECSContext } from '../../core/ecs';
import { shape2dModule } from '../shape2d';

function createMockContext(): ECSContext {
  return {
    modules: new Map(),
    resources: new Map(),
  } as unknown as ECSContext;
}

describe('Shape2DModule', () => {
  it('normalizes polyline with closed default false', () => {
    const module = shape2dModule(createMockContext());
    const resolved = module.resolveShape({
      type: 'polyline',
      params: { points: [{ u: 0, v: 0 }, { u: 1, v: 0 }] },
    });

    expect(resolved.closed).toBe(false);
    expect(resolved.points.length).toBe(2);
  });

  it('forces polygon to closed true', () => {
    const module = shape2dModule(createMockContext());
    const resolved = module.resolveShape({
      type: 'polygon',
      params: { points: [{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 0, v: 1 }] },
    });

    expect(resolved.closed).toBe(true);
    expect(resolved.points.length).toBe(3);
  });

  it('clamps circle segments and radius', () => {
    const module = shape2dModule(createMockContext());
    const resolved = module.resolveShape({
      type: 'circle',
      params: { radius: -5, segments: 2 },
    });

    expect(resolved.points.length).toBe(3);
    expect(resolved.closed).toBe(true);
    expect(resolved.points.every((point) => point.u === 0 && point.v === 0)).toBe(true);
  });

  it('resolves rectangle to four closed points', () => {
    const module = shape2dModule(createMockContext());
    const resolved = module.resolveShape({
      type: 'rectangle',
      params: { width: 4, height: 2, center: { u: 1, v: 1 } },
    });

    expect(resolved.closed).toBe(true);
    expect(resolved.points).toEqual([
      { u: -1, v: 0 },
      { u: 3, v: 0 },
      { u: 3, v: 2 },
      { u: -1, v: 2 },
    ]);
  });
});
