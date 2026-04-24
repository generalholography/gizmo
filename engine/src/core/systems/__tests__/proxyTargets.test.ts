import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { resolveBodyPartPathFromHit, resolveBodyPartSelectionTargetFromHit } from '../editorSelection/proxyTargets';

describe('resolveBodyPartPathFromHit', () => {
  it('prefers canonical bodyPartPath metadata when present', () => {
    const entityRoot = new THREE.Object3D();
    const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hitMesh.userData.bodyPartPath = [4, 2, 0];
    hitMesh.userData.instancePath = [7, 8, 9];
    hitMesh.userData.isMirrorPartProxy = true;
    hitMesh.userData.mirrorPartPath = [9, 9, 9];
    entityRoot.add(hitMesh);

    const target = resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh);

    expect(target?.address.definitionPath).toEqual([4, 2, 0]);
    expect(target?.address.instancePath).toEqual([7, 8, 9]);
    expect(resolveBodyPartPathFromHit(entityRoot, hitMesh)).toEqual([4, 2, 0]);
  });

  it('maps mirror proxy hits to mirrorPartPath', () => {
    const entityRoot = new THREE.Object3D();
    const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hitMesh.userData.isMirrorPartProxy = true;
    hitMesh.userData.mirrorPartPath = [2, 1, 0];
    entityRoot.add(hitMesh);

    const target = resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh);

    expect(target?.address.definitionPath).toEqual([2, 1, 0]);
    expect(resolveBodyPartPathFromHit(entityRoot, hitMesh)).toEqual([2, 1, 0]);
  });

  it('maps CSG source proxy hits to [...mergedPath, sourceIndex]', () => {
    const entityRoot = new THREE.Object3D();
    const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hitMesh.userData.isCsgSourceProxy = true;
    hitMesh.userData.csgMergedPartPath = [3];
    hitMesh.userData.csgSourceIndex = 4;
    entityRoot.add(hitMesh);

    const target = resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh);

    expect(target?.address.definitionPath).toEqual([3, 4]);
    expect(resolveBodyPartPathFromHit(entityRoot, hitMesh)).toEqual([3, 4]);
  });

  it('returns instance world and parent matrices for mirrored proxy targets', () => {
    const entityRoot = new THREE.Object3D();
    entityRoot.position.set(10, 0, 0);

    const mirrorGroup = new THREE.Object3D();
    mirrorGroup.scale.set(-1, 1, 1);

    const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hitMesh.userData.isMirrorPartProxy = true;
    hitMesh.userData.mirrorPartPath = [1, 2, 3];
    hitMesh.position.set(2, 0, 0);

    mirrorGroup.add(hitMesh);
    entityRoot.add(mirrorGroup);
    entityRoot.updateWorldMatrix(true, true);

    const target = resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh);

    expect(target?.path).toEqual([1, 2, 3]);
    expect(target?.address.definitionPath).toEqual([1, 2, 3]);
    expect(target?.address.instancePath).toEqual([1, 2, 3]);

    const expectedWorld = hitMesh.matrixWorld.clone().elements;
    const expectedParent = mirrorGroup.matrixWorld.clone().elements;
    expect(target?.worldMatrix.elements).toEqual(expectedWorld);
    expect(target?.parentWorldMatrix.elements).toEqual(expectedParent);
  });

  it('keeps mirrored instance path while mapping edits to canonical source definition path', () => {
    const entityRoot = new THREE.Object3D();
    const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hitMesh.userData.bodyPartPath = [0, 1];
    hitMesh.userData.instancePath = [3, 0, 1];
    entityRoot.add(hitMesh);

    const target = resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh);

    expect(target?.address.definitionPath).toEqual([0, 1]);
    expect(target?.address.instancePath).toEqual([3, 0, 1]);
  });
});
