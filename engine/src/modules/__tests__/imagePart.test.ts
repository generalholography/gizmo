import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createECS } from '../../core/ecs';
import { bodyModule } from '../body';
import { materialModule } from '../material';
import type { Body } from '../../core/schema';

describe('image body parts', () => {
  it('resolves image material with a texture-backed basic material', () => {
    const ctx = createECS();
    const materials = materialModule(ctx);

    const resolved = materials.get(materials.resolve({
      type: 'image',
      params: {
        src: '/fixtures/reference.png',
        opacity: 0.65,
        doubleSided: true,
      },
    }));

    expect(resolved).toBeInstanceOf(THREE.MeshBasicMaterial);
    const material = resolved as THREE.MeshBasicMaterial;
    expect(material.map).toBeTruthy();
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.65);
    expect(material.side).toBe(THREE.DoubleSide);
  });

  it('treats image primitives as non-colliding geometry by default', () => {
    const ctx = createECS();
    const bodies = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            geometry: { type: 'image', params: { width: 8, height: 6 } },
            material: { type: 'image', params: { src: '/fixtures/reference.png' } },
            localRotation: { x: -Math.PI / 2, y: 0, z: 0 },
          },
        ],
      },
    };

    const resolved = bodies.get(bodies.resolve(bodyDef));
    expect(resolved.parts).toHaveLength(1);
    const imagePart = resolved.parts[0];
    expect(imagePart.type).toBe('geometry');
    if (imagePart.type !== 'geometry') {
      throw new Error('Expected geometry part');
    }
    expect(imagePart.ignoreCollisions).toBe(true);
    expect(imagePart.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(resolved.colliders).toHaveLength(0);
    imagePart.mesh.computeBoundingBox();
    expect(imagePart.mesh.boundingBox?.max.x).toBeCloseTo(4);
    expect(imagePart.mesh.boundingBox?.max.y).toBeCloseTo(3);
  });
});
