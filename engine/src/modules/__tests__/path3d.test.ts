import { describe, expect, it } from 'vitest';
import { ECSContext } from '../../core/ecs';
import { path3dModule } from '../path3d';

function createMockContext(): ECSContext {
  return {
    modules: new Map(),
    resources: new Map(),
  } as unknown as ECSContext;
}

describe('Path3DModule', () => {
  it('normalizes line with segment interpolation', () => {
    const module = path3dModule(createMockContext());
    const resolved = module.resolvePath({
      type: 'line',
      params: {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        segments: 2,
      },
    });

    expect(resolved.closed).toBe(false);
    expect(resolved.points).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
  });

  it('clamps circle segments and closes the path', () => {
    const module = path3dModule(createMockContext());
    const resolved = module.resolvePath({
      type: 'circle',
      params: { center: { x: 0, y: 2, z: 0 }, radius: 3, segments: 2 },
    });

    expect(resolved.closed).toBe(true);
    expect(resolved.points.length).toBe(3);
    expect(resolved.points.every((point) => point.y === 2)).toBe(true);
  });

  it('defaults circle center and segments when omitted', () => {
    const module = path3dModule(createMockContext());
    const resolved = module.resolvePath({
      type: 'circle',
      params: { radius: 2 },
    } as any);

    expect(resolved.closed).toBe(true);
    expect(resolved.points.length).toBe(24);
    expect(resolved.points.every((point) => point.y === 0)).toBe(true);
  });

  it('keeps rectangle closed by default and allows open override', () => {
    const module = path3dModule(createMockContext());
    const closedRect = module.resolvePath({
      type: 'rectangle',
      params: { center: { x: 0, y: 0, z: 0 }, width: 4, depth: 2 },
    });

    const openRect = module.resolvePath({
      type: 'rectangle',
      params: { center: { x: 0, y: 0, z: 0 }, width: 4, depth: 2, closed: false },
    });

    expect(closedRect.closed).toBe(true);
    expect(openRect.closed).toBe(false);
    expect(closedRect.points.length).toBe(4);
  });
});
