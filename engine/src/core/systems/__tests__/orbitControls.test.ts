import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createWorld } from 'bitecs';
import type { ECSContext } from '../../ecs';
import { setResource } from '../../ecs';
import { orbitControlsSystem } from '../orbitControls';

function createCtx(): ECSContext {
  const world = createWorld() as unknown as ECSContext;
  world.resources = new Map();
  world.modules = new Map();
  world.pipeline = [];
  world.time = { connect: () => {}, disconnect: () => {}, update: () => {} } as any;
  world.isPlaying = false;
  world.input = {} as any;
  world.rapier = { world: {} as any } as any;
  world.three = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as any,
    worldRoot: new THREE.Group(),
  };
  return world;
}

describe('orbitControlsSystem', () => {
  it('does not warn when orbit control resources are absent', () => {
    const ctx = createCtx();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    orbitControlsSystem(ctx);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('updates controls and marks initial adjustment complete', () => {
    const ctx = createCtx();
    const mockControls = {
      target: new THREE.Vector3(),
      enableZoom: false,
      enablePan: false,
      enableRotate: false,
      update: vi.fn(),
    };
    setResource(ctx, 'orbitControls', mockControls as any);
    setResource(ctx, 'deltaTime', 0.016);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.position.set(4, 0, 0);
    ctx.three.scene.add(mesh);

    orbitControlsSystem(ctx);

    expect(mockControls.enableZoom).toBe(true);
    expect(mockControls.enablePan).toBe(true);
    expect(mockControls.enableRotate).toBe(true);
    expect(mockControls.update).toHaveBeenCalledWith(0.016);
    expect(ctx.resources.get('orbitControlsInitialAdjusted')?.resource).toBe(true);
  });
});
