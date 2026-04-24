import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { Transform } from '../../../components/Transform';
import { MotionSource } from '../../../components/MotionSource';
import type { ECSContext } from '../../../ecs';
import { syncTransformTargets } from '../TransformEditor';

const buildCtx = (isKinematic: boolean) => {
  const world = createWorld() as unknown as ECSContext;
  world.resources = new Map();
  world.modules = new Map();
  world.pipeline = [];
  world.time = { connect: () => {}, disconnect: () => {} } as any;
  world.isPlaying = false;
  world.input = {} as any;
  world.three = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as any,
    worldRoot: new THREE.Group(),
  };

  const eid = addEntity(world);
  addComponent(world, Transform, eid);
  addComponent(world, MotionSource, eid);
  MotionSource.bodyHandle[eid] = 7;

  const rigidBody = {
    isKinematic: vi.fn(() => isKinematic),
    setNextKinematicTranslation: vi.fn(),
    setNextKinematicRotation: vi.fn(),
    setTranslation: vi.fn(),
    setRotation: vi.fn(),
  };
  const getRigidBody = vi.fn(() => rigidBody);
  world.rapier = { world: { getRigidBody } as any } as any;

  const renderObj = new THREE.Object3D();
  world.resources.set('renderObjects', { resource: new Map([[eid, renderObj]]) });

  Transform.x[eid] = 1;
  Transform.y[eid] = 2;
  Transform.z[eid] = 3;
  Transform.qx[eid] = 0.1;
  Transform.qy[eid] = 0.2;
  Transform.qz[eid] = 0.3;
  Transform.qw[eid] = 0.4;
  Transform.sx[eid] = 1.5;
  Transform.sy[eid] = 1.6;
  Transform.sz[eid] = 1.7;

  return { ctx: world, eid, rigidBody, getRigidBody, renderObj };
};

describe('syncTransformTargets', () => {
  it('updates renderer object and dynamic rigid body', () => {
    const { ctx, eid, rigidBody, renderObj } = buildCtx(false);

    syncTransformTargets(ctx, eid);

    expect(renderObj.position.toArray()).toEqual([1, 2, 3]);
    expect(renderObj.quaternion.w).toBeCloseTo(0.4);
    expect(renderObj.scale.x).toBeCloseTo(1.5);
    expect(renderObj.scale.y).toBeCloseTo(1.6);
    expect(renderObj.scale.z).toBeCloseTo(1.7);
    expect(rigidBody.setTranslation).toHaveBeenCalledWith({ x: 1, y: 2, z: 3 }, true);
    const rotationArgs = rigidBody.setRotation.mock.calls[0];
    const rotation = rotationArgs[0];
    expect(rotation.x).toBeCloseTo(0.1);
    expect(rotation.y).toBeCloseTo(0.2);
    expect(rotation.z).toBeCloseTo(0.3);
    expect(rotation.w).toBeCloseTo(0.4);
    expect(rotationArgs[1]).toBe(true);
    expect(rigidBody.setNextKinematicTranslation).not.toHaveBeenCalled();
  });

  it('updates kinematic rigid body with next targets', () => {
    const { ctx, eid, rigidBody } = buildCtx(true);

    syncTransformTargets(ctx, eid);

    expect(rigidBody.setNextKinematicTranslation).toHaveBeenCalledWith({ x: 1, y: 2, z: 3 });
    const rotationArg = rigidBody.setNextKinematicRotation.mock.calls[0][0];
    expect(rotationArg.x).toBeCloseTo(0.1);
    expect(rotationArg.y).toBeCloseTo(0.2);
    expect(rotationArg.z).toBeCloseTo(0.3);
    expect(rotationArg.w).toBeCloseTo(0.4);
    expect(rigidBody.setTranslation).not.toHaveBeenCalled();
  });
});
