import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext } from '../../core/ecs';
import { bodyModule } from '../body';
import { Light } from '../../core/schema';

describe('Light support', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createECS();
  });

  it('should resolve a point light in body module', () => {
    const body = bodyModule(ctx);
    
    const pointLight: Light = {
      light: {
        type: 'point',
        params: {
          intensity: 2,
          range: 10,
          color: '#ffffff'
        }
      },
      localPosition: [0, 5, 0],
      tag: 'testLight'
    };

    const bodyDef = {
      type: 'composite' as const,
      params: {
        parts: [pointLight]
      }
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);

    expect(resolved.parts).toBeDefined();
    const lightParts = resolved.parts.filter(p => p.type === 'light');
    expect(lightParts.length).toBe(1);
    expect(lightParts[0].type).toBe('light');
    if (lightParts[0].type === 'light') {
      expect(lightParts[0].light).toBeInstanceOf(THREE.PointLight);
      expect(lightParts[0].tag).toBe('testLight');
      
      const light = lightParts[0].light as THREE.PointLight;
      expect(light.intensity).toBe(2);
      expect(light.distance).toBe(10);
    }
  });

  it('should resolve a spot light in body module', () => {
    const body = bodyModule(ctx);
    
    const spotLight: Light = {
      light: {
        type: 'spot',
        params: {
          intensity: 3,
          range: 15,
          beamAngle: Math.PI / 4,
          color: '#ffaa00',
          direction: [0, -1, 0]
        }
      },
      localPosition: [0, 10, 0],
      tag: 'spotTest'
    };

    const bodyDef = {
      type: 'composite' as const,
      params: {
        parts: [spotLight]
      }
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);

    expect(resolved.parts).toBeDefined();
    const lightParts = resolved.parts.filter(p => p.type === 'light');
    expect(lightParts.length).toBe(1);
    expect(lightParts[0].type).toBe('light');
    if (lightParts[0].type === 'light') {
      expect(lightParts[0].light).toBeInstanceOf(THREE.SpotLight);
      expect(lightParts[0].tag).toBe('spotTest');
      
      const light = lightParts[0].light as THREE.SpotLight;
      expect(light.intensity).toBe(3);
      expect(light.distance).toBe(15);
      expect(light.angle).toBe(Math.PI / 4);
    }
  });

  it('should handle mixed primitives and lights', () => {
    const body = bodyModule(ctx);
    
    const bodyDef = {
      type: 'composite' as const,
      params: {
        parts: [
          {
            geometry: { type: 'box' as const, params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
            material: { type: 'solid' as const, params: { color: '#ff0000' } },
            ignoreCollisions: true // Skip collider generation to avoid RAPIER mock issues
          },
          {
            light: {
              type: 'point' as const,
              params: {
                intensity: 1,
                range: 5,
                color: '#ffffff'
              }
            }
          }
        ]
      }
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);

    expect(resolved.parts.length).toBe(2);
    const geometryParts = resolved.parts.filter(p => p.type === 'geometry');
    const lightParts = resolved.parts.filter(p => p.type === 'light');
    expect(geometryParts.length).toBe(1);
    expect(lightParts.length).toBe(1);
  });

  it('should apply local transforms to lights', () => {
    const body = bodyModule(ctx);
    
    const pointLight: Light = {
      light: {
        type: 'point',
        params: {
          intensity: 1,
          range: 10,
          color: '#ffffff'
        }
      },
      localPosition: [5, 10, 3],
      localRotation: [0, Math.PI / 2, 0],
      localScale: [1, 1, 1]
    };

    const bodyDef = {
      type: 'composite' as const,
      params: {
        parts: [pointLight]
      }
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);

    const lightParts = resolved.parts.filter(p => p.type === 'light');
    expect(lightParts.length).toBe(1);
    expect(lightParts[0].localTransform).toBeDefined();
    
    const transform = lightParts[0].localTransform!;
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(transform);
    
    expect(position.x).toBeCloseTo(5);
    expect(position.y).toBeCloseTo(10);
    expect(position.z).toBeCloseTo(3);
  });

  it('should handle lights with children', () => {
    const body = bodyModule(ctx);
    
    const lightWithChild: Light = {
      light: {
        type: 'point',
        params: {
          intensity: 1,
          range: 10,
          color: '#ffffff'
        }
      },
      children: [
        {
          geometry: { type: 'sphere' as const, params: { radius: 0.5 } },
          material: { type: 'solid' as const, params: { color: '#ffff00' } },
          ignoreCollisions: true // Skip collider generation to avoid RAPIER mock issues
        }
      ]
    };

    const bodyDef = {
      type: 'composite' as const,
      params: {
        parts: [lightWithChild]
      }
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);

    const lightParts = resolved.parts.filter(p => p.type === 'light');
    expect(lightParts.length).toBe(1);
    expect(lightParts[0].children).toBeDefined();
    expect(lightParts[0].children!.length).toBe(1);
  });
});
