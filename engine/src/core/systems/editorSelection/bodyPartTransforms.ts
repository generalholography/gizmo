import * as THREE from 'three';
import type { Body, Node, Vector3 } from '../../schema';

export type CompositeBody = Extract<Body, { type: 'composite' }>;

export type BodyPartLocalTransform = {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
};

export type BodyPartWorldTransform = {
  localTransform: BodyPartLocalTransform;
  worldMatrix: THREE.Matrix4;
  parentWorldMatrix: THREE.Matrix4;
};

function vectorToThree(v?: Vector3, fallback = new THREE.Vector3(0, 0, 0)): THREE.Vector3 {
  if (!v) return fallback.clone();
  if (Array.isArray(v)) {
    return new THREE.Vector3(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
  }
  return new THREE.Vector3(v.x ?? 0, v.y ?? 0, v.z ?? 0);
}

function localMatrixFromNode(node: Node): THREE.Matrix4 {
  const position = vectorToThree(node.localPosition, new THREE.Vector3(0, 0, 0));
  const rotationEuler = vectorToThree(node.localRotation, new THREE.Vector3(0, 0, 0));
  const scale = vectorToThree(node.localScale, new THREE.Vector3(1, 1, 1));
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotationEuler.x, rotationEuler.y, rotationEuler.z));
  return new THREE.Matrix4().compose(position, rotation, scale);
}

export function decomposeMatrixToLocalTransform(matrix: THREE.Matrix4): BodyPartLocalTransform {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, rotation, scale);
  return { position, rotation, scale };
}

export function getBodyPartWorldTransformFromDefinition(
  body: CompositeBody | undefined,
  path: number[],
  entityWorldMatrix: THREE.Matrix4
): BodyPartWorldTransform | undefined {
  if (!body || path.length === 0) return undefined;

  let children: Node[] | undefined = body.params.parts;
  let parentMatrixInBody = new THREE.Matrix4().identity();
  let node: Node | undefined;

  for (let i = 0; i < path.length; i++) {
    const index = path[i];
    if (!children || index < 0 || index >= children.length) return undefined;
    node = children[index];
    children = node.children;
    if (!node) return undefined;

    if (i < path.length - 1) {
      parentMatrixInBody = parentMatrixInBody.clone().multiply(localMatrixFromNode(node));
    }
  }

  if (!node) return undefined;

  const nodeLocalMatrix = localMatrixFromNode(node);
  const nodeWorldInBody = parentMatrixInBody.clone().multiply(nodeLocalMatrix);
  const nodeWorldMatrix = entityWorldMatrix.clone().multiply(nodeWorldInBody);
  const parentWorldMatrix = entityWorldMatrix.clone().multiply(parentMatrixInBody);

  return {
    localTransform: decomposeMatrixToLocalTransform(nodeLocalMatrix),
    worldMatrix: nodeWorldMatrix,
    parentWorldMatrix
  };
}
