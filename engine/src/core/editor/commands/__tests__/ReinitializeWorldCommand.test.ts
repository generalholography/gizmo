import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { createECS, getResource, setResource } from '../../../ecs';
import { ReinitializeWorldCommand } from '../ReinitializeWorldCommand';
import type { WorldDefinition } from '../../../worldSchema';

describe('ReinitializeWorldCommand', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createECS();

    const rendererMock = { setClearColor: vi.fn() };
    ctx.three = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: rendererMock as any,
      worldRoot: new THREE.Group(),
    };

    ctx.rapier = {
      world: {
        gravity: { x: 0, y: -9.81, z: 0 },
      },
    };

    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#87ceeb') },
        bottomColor: { value: new THREE.Color('#87ceeb') },
        cloudsColor: { value: new THREE.Color('#ffffff') },
        cloudsCoverage: { value: 0.5 },
        starsIntensity: { value: 0 },
        sunDirection: { value: new THREE.Vector3() },
        sunColor: { value: new THREE.Color('#ffffff') },
        sunIntensity: { value: 1 },
      },
    });

    const skyboxObjects = {
      skybox: new THREE.Mesh(new THREE.SphereGeometry(1), skyMaterial),
      ambientLight: new THREE.AmbientLight(0xffffff),
      directionalLight: new THREE.DirectionalLight('#ffffff', 1),
      lightTarget: new THREE.Object3D(),
    };

    setResource(ctx, 'skybox', skyboxObjects);
    setResource(ctx, 'metadata', {
      title: 'Initial',
      description: '',
      tags: [],
      brandColors: ['#111111', '#222222'],
      dimensions: [
        {
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#87ceeb',
            sun: {
              color: '#fffaed',
              intensity: 1.1,
              timeOfDay: 1200,
            },
            clouds: {
              color: '#ffffff',
              coverage: 0.5,
            },
            stars: {
              intensity: 0,
            },
          },
        },
      ],
    });
    setResource(ctx, 'timeOfDay', 1200);
  });

  it('updates visual world resources immediately on execute', () => {
    const newDefinition: WorldDefinition = {
      title: 'Updated',
      brandColors: ['#123456'],
      dimensions: [
        {
          name: 'base',
          gravity: -6,
          useDayNightCycle: false,
          sky: {
            color: '#ff0000',
            sun: {
              color: '#ffeedd',
              intensity: 2.0,
              timeOfDay: 600,
            },
            clouds: {
              color: '#dddddd',
              coverage: 0.2,
            },
            stars: {
              intensity: 0.7,
            },
          },
        },
      ],
    };

    const command = new ReinitializeWorldCommand(ctx, newDefinition);
    command.execute();

    const updatedMetadata = getResource(ctx, 'metadata');
    expect(updatedMetadata.dimensions[0].sky.color).toBe('#ff0000');

    const skybox = getResource(ctx, 'skybox');
    const material = skybox.skybox.material as THREE.ShaderMaterial;
    expect(material.uniforms.topColor.value.getHexString()).toBe('ff0000');
    expect(material.uniforms.cloudsCoverage.value).toBeCloseTo(0.2);
    expect(material.uniforms.starsIntensity.value).toBeCloseTo(0.7);

    expect((ctx.three.renderer.setClearColor as any).mock.calls.at(-1)[0].getHexString()).toBe('ff0000');
    expect(skybox.directionalLight.intensity).toBeCloseTo(1.6);
    expect(getResource(ctx, 'timeOfDay')).toBe(600);
    expect((ctx.rapier.world as any).gravity.y).toBe(-6);
  });
});
