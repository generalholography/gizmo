import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createECS, setResource } from '../../ecs';
import {
  clearAnimatedColliderBindings,
  prepareAnimatedColliderBindings,
  registerAnimatedColliderBindings,
  syncAnimatedColliders
} from '../animatedColliderSync';

function translationMatrix(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z);
}

describe('animated collider sync', () => {
  it('updates collider local pose from the animated body part object', () => {
    const ctx = createECS();
    const collider = {
      setTranslationWrtParent: vi.fn(),
      setRotationWrtParent: vi.fn(),
    };
    (ctx as any).rapier = { world: { getCollider: vi.fn(() => collider) } };

    const eid = 7;
    const entityRoot = new THREE.Group();
    const animatedRoot = new THREE.Object3D();
    animatedRoot.name = 'root';
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(2, 0, 0);
    mesh.userData.bodyPartPath = [0];
    animatedRoot.add(mesh);
    entityRoot.add(animatedRoot);
    setResource(ctx, 'renderObjects', new Map([[eid, entityRoot]]));

    registerAnimatedColliderBindings(ctx, eid, [{
      colliderHandle: 123,
      targetPath: [0],
      initialColliderLocalMatrix: translationMatrix(2, 0, 0),
    }]);

    prepareAnimatedColliderBindings(ctx, eid);
    animatedRoot.rotation.z = Math.PI / 2;
    syncAnimatedColliders(ctx, eid);

    expect(collider.setTranslationWrtParent).toHaveBeenCalledTimes(1);
    expect(collider.setTranslationWrtParent).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.closeTo(0, 5),
      y: expect.closeTo(2, 5),
      z: expect.closeTo(0, 5),
    }));
    expect(collider.setRotationWrtParent).toHaveBeenCalledWith(expect.objectContaining({
      z: expect.closeTo(Math.SQRT1_2, 5),
      w: expect.closeTo(Math.SQRT1_2, 5),
    }));
  });

  it('preserves collider offsets relative to the animated part', () => {
    const ctx = createECS();
    const collider = {
      setTranslationWrtParent: vi.fn(),
      setRotationWrtParent: vi.fn(),
    };
    (ctx as any).rapier = { world: { getCollider: vi.fn(() => collider) } };

    const eid = 9;
    const entityRoot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(1, 0, 0);
    mesh.userData.bodyPartPath = [2, 1];
    entityRoot.add(mesh);
    setResource(ctx, 'renderObjects', new Map([[eid, entityRoot]]));

    registerAnimatedColliderBindings(ctx, eid, [{
      colliderHandle: 456,
      targetPath: [2, 1],
      initialColliderLocalMatrix: translationMatrix(1.5, 0, 0),
    }]);

    prepareAnimatedColliderBindings(ctx, eid);
    mesh.position.set(3, 0, 0);
    syncAnimatedColliders(ctx, eid);

    expect(collider.setTranslationWrtParent).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.closeTo(3.5, 5),
      y: expect.closeTo(0, 5),
      z: expect.closeTo(0, 5),
    }));
  });

  it('clears bindings when an entity leaves physics', () => {
    const ctx = createECS();
    registerAnimatedColliderBindings(ctx, 1, [{
      colliderHandle: 1,
      targetPath: [0],
      initialColliderLocalMatrix: new THREE.Matrix4(),
    }]);

    clearAnimatedColliderBindings(ctx, 1);
    const bindings = ctx.resources.get('animatedColliderBindings')?.resource as Map<number, unknown[]>;
    expect(bindings.has(1)).toBe(false);
  });
});
