import * as THREE from 'three';
import { findBodyPartPath } from './picking';

export type BodyPartSelectionAddress = {
  definitionPath: number[];
  instancePath?: number[];
};

export type BodyPartSelectionTarget = {
  entityId?: number;
  address: BodyPartSelectionAddress;
  /** @deprecated Prefer address.definitionPath */
  path: number[];
  worldMatrix: THREE.Matrix4;
  parentWorldMatrix: THREE.Matrix4;
};

function cloneParentWorldMatrix(entityRoot: THREE.Object3D, hitMesh: THREE.Object3D): THREE.Matrix4 {
  const parent = hitMesh.parent;
  if (!parent) {
    return entityRoot.matrixWorld.clone();
  }

  return parent.matrixWorld.clone();
}

function buildSelectionTarget(
  entityRoot: THREE.Object3D,
  hitMesh: THREE.Object3D,
  definitionPath: number[]
): BodyPartSelectionTarget {
  hitMesh.updateWorldMatrix(true, false);
  const metadataInstancePath = hitMesh.userData.instancePath as number[] | undefined;
  const hierarchyInstancePath = findBodyPartPath(entityRoot, hitMesh);
  const instancePath = (Array.isArray(metadataInstancePath) ? metadataInstancePath : hierarchyInstancePath) ?? definitionPath;

  return {
    address: {
      definitionPath: [...definitionPath],
      instancePath: [...instancePath],
    },
    path: [...definitionPath],
    worldMatrix: hitMesh.matrixWorld.clone(),
    parentWorldMatrix: cloneParentWorldMatrix(entityRoot, hitMesh)
  };
}

export function resolveBodyPartSelectionTargetFromHit(
  entityRoot: THREE.Object3D,
  hitMesh: THREE.Object3D
): BodyPartSelectionTarget | undefined {
  const directPath = hitMesh.userData.bodyPartPath as number[] | undefined;
  if (Array.isArray(directPath)) {
    return buildSelectionTarget(entityRoot, hitMesh, directPath);
  }

  if (hitMesh.userData.isMirrorPartProxy) {
    const mirrorPath = hitMesh.userData.mirrorPartPath as number[] | undefined;
    if (mirrorPath !== undefined) {
      return buildSelectionTarget(entityRoot, hitMesh, mirrorPath);
    }
  }

  if (hitMesh.userData.isCsgSourceProxy) {
    const mergedPath = hitMesh.userData.csgMergedPartPath as number[] | undefined;
    const sourceIndex = hitMesh.userData.csgSourceIndex as number | undefined;
    if (mergedPath !== undefined && sourceIndex !== undefined) {
      return buildSelectionTarget(entityRoot, hitMesh, [...mergedPath, sourceIndex]);
    }
  }

  const foundPath = findBodyPartPath(entityRoot, hitMesh);
  if (!foundPath) return undefined;
  return buildSelectionTarget(entityRoot, hitMesh, foundPath);
}

export function resolveBodyPartPathFromHit(entityRoot: THREE.Object3D, hitMesh: THREE.Object3D): number[] | undefined {
  return resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh)?.address.definitionPath;
}
