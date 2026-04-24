import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext } from '../../core/ecs';
import { meshModule } from '../mesh';
import { colliderModule } from '../collider';
import { Primitive } from '../../core/schema';

describe('ExtrudedPolygon Primitive', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createECS();
    ctx.modules.set('mesh', meshModule(ctx));
    ctx.modules.set('collider', colliderModule(ctx));
  });

  it('should create a mesh from extrudedPolygon geometry', () => {
    const geometry: Primitive['geometry'] = {
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0, v: 0 },
              { u: 2, v: 0 },
              { u: 2, v: 2 },
              { u: 0, v: 2 },
            ],
          },
        },
        height: 3,
      },
    };

    const meshMod = ctx.modules.get('mesh')!;
    const meshId = meshMod.resolve(geometry);
    const mesh = meshMod.get(meshId);

    expect(mesh).toBeInstanceOf(THREE.BufferGeometry);
    expect(mesh.getAttribute('position')).toBeDefined();
    expect(mesh.getAttribute('normal')).toBeDefined();
  });

  it('should create a mesh from extrudedPolygon with array points', () => {
    const geometry: Primitive['geometry'] = {
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0, v: 0 },
              { u: 1, v: 0 },
              { u: 1, v: 1 },
              { u: 0, v: 1 },
            ],
          },
        },
        height: 2,
      },
    };

    const meshMod = ctx.modules.get('mesh')!;
    const meshId = meshMod.resolve(geometry);
    const mesh = meshMod.get(meshId);

    expect(mesh).toBeInstanceOf(THREE.BufferGeometry);
  });

  it('should handle triangular polygon', () => {
    const geometry: Primitive['geometry'] = {
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0, v: 0 },
              { u: 1, v: 0 },
              { u: 0.5, v: 1 },
            ],
          },
        },
        height: 1.5,
      },
    };

    const meshMod = ctx.modules.get('mesh')!;
    const meshId = meshMod.resolve(geometry);
    const mesh = meshMod.get(meshId);

    expect(mesh).toBeInstanceOf(THREE.BufferGeometry);
  });

  it('should handle complex polygon (hexagon)', () => {
    const geometry: Primitive['geometry'] = {
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 1, v: 0 },
              { u: 0.5, v: 0.866 },
              { u: -0.5, v: 0.866 },
              { u: -1, v: 0 },
              { u: -0.5, v: -0.866 },
              { u: 0.5, v: -0.866 },
            ],
          },
        },
        height: 2,
      },
    };

    const meshMod = ctx.modules.get('mesh')!;
    const meshId = meshMod.resolve(geometry);
    const mesh = meshMod.get(meshId);

    expect(mesh).toBeInstanceOf(THREE.BufferGeometry);
  });

  it('should fallback to box when fewer than 3 points provided', () => {
    const geometry: Primitive['geometry'] = {
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0, v: 0 },
              { u: 1, v: 0 },
            ],
          },
        },
        height: 1,
      },
    };

    const meshMod = ctx.modules.get('mesh')!;
    const meshId = meshMod.resolve(geometry);
    const mesh = meshMod.get(meshId);

    // Should still create a geometry (fallback box)
    expect(mesh).toBeInstanceOf(THREE.BufferGeometry);
  });

  it('should apply pivot offset correctly', () => {
    const geometry: Primitive['geometry'] = {
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0, v: 0 },
              { u: 1, v: 0 },
              { u: 1, v: 1 },
              { u: 0, v: 1 },
            ],
          },
        },
        height: 2,
        pivot: 'bottom',
      },
    };

    const meshMod = ctx.modules.get('mesh')!;
    const meshId = meshMod.resolve(geometry);
    const mesh = meshMod.get(meshId);

    expect(mesh).toBeInstanceOf(THREE.BufferGeometry);
    // With bottom pivot, geometry should remain at base y=0
    mesh.computeBoundingBox();
    const boundingBox = mesh.boundingBox!;
    // Bottom pivot means base stays near y=0, top extends to height
    expect(boundingBox.min.y).toBeCloseTo(0, 1);
    expect(boundingBox.max.y).toBeCloseTo(2, 1);
  });
});
