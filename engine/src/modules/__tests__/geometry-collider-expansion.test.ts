import { describe, it, expect } from 'vitest';
import { createECS } from '../../core/ecs';
import { colliderModule } from '../collider';

describe('geometry collider expansion', () => {
  it('generates a roundedBox collider from primitive geometry', () => {
    const ctx = createECS();
    const collider = colliderModule(ctx);

    const colliderId = collider.resolve({
      type: 'fromPrimitive',
      params: {
        geometry: {
          type: 'roundedBox',
          params: { lengthX: 1.6, lengthY: 1.2, lengthZ: 1.0, radius: 0.2, pivot: 'bottom' },
        },
        scale: { x: 1, y: 1, z: 1 },
      },
    });

    const resolved = collider.get(colliderId);
    const descs = resolved.getDesc();

    expect(descs.length).toBe(1);
  });

  it('applies torus bottom pivot for compact torus collider path', () => {
    const ctx = createECS();
    const collider = colliderModule(ctx);

    const minorRadius = 0.24;
    const colliderId = collider.resolve({
      type: 'fromPrimitive',
      params: {
        geometry: {
          type: 'torus',
          params: { majorRadius: 0.75, minorRadius, pivot: 'bottom' },
        },
        scale: { x: 1, y: 1, z: 1 },
      },
    });

    const resolved = collider.get(colliderId);
    const descs = resolved.getDesc();

    expect(descs.length).toBe(1);
    expect(descs[0].translation.y).toBeCloseTo(minorRadius, 5);
  });

  it('applies torus bottom pivot for segmented torus collider path', () => {
    const ctx = createECS();
    const collider = colliderModule(ctx);

    const minorRadius = 0.2;
    const colliderId = collider.resolve({
      type: 'fromPrimitive',
      params: {
        geometry: {
          type: 'torus',
          params: { majorRadius: 2.0, minorRadius, pivot: 'bottom' },
        },
        scale: { x: 1, y: 1, z: 1 },
      },
    });

    const resolved = collider.get(colliderId);
    const descs = resolved.getDesc();

    expect(descs.length).toBeGreaterThan(1);
    expect(descs[0].translation.y).toBeCloseTo(minorRadius, 5);
  });

  it('supports canonical lathe profile objects for collider generation', () => {
    const ctx = createECS();
    const collider = colliderModule(ctx);

    const colliderId = collider.resolve({
      type: 'fromPrimitive',
      params: {
        geometry: {
          type: 'lathe',
          params: {
            profile: {
              type: 'polyline',
              params: {
                points: [
                  { u: 0.0, v: 0.0 },
                  { u: 0.3, v: 0.4 },
                  { u: 0.2, v: 1.0 },
                ],
              },
            },
            pivot: 'bottom',
          },
        },
        scale: { x: 1, y: 1, z: 1 },
      },
    });

    const resolved = collider.get(colliderId);
    const descs = resolved.getDesc();

    expect(descs.length).toBe(1);
  });

  it('supports canonical extrudedPolygon shape objects for collider generation', () => {
    const ctx = createECS();
    const collider = colliderModule(ctx);

    const colliderId = collider.resolve({
      type: 'fromPrimitive',
      params: {
        geometry: {
          type: 'extrudedPolygon',
          params: {
            shape: {
              type: 'polygon',
              params: {
                points: [
                  { u: -0.6, v: -0.4 },
                  { u: 0.6, v: -0.5 },
                  { u: 0.7, v: 0.3 },
                  { u: -0.5, v: 0.5 },
                ],
              },
            },
            height: 1.0,
            pivot: 'bottom',
          },
        },
        scale: { x: 1, y: 1, z: 1 },
      },
    });

    const resolved = collider.get(colliderId);
    const descs = resolved.getDesc();

    expect(descs.length).toBe(1);
  });
});
