import * as THREE from "three";
import { ECSContext, getResource, setResource } from "../ecs";

export interface AnimatedColliderBinding {
  colliderHandle: number;
  targetPath: number[];
  initialColliderLocalMatrix: THREE.Matrix4;
  targetToColliderMatrix?: THREE.Matrix4;
  lastSignature?: string;
}

const _entityInverse = new THREE.Matrix4();
const _targetLocal = new THREE.Matrix4();
const _nextColliderLocal = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();

function pathsEqual(a: unknown, b: number[]): boolean {
  return Array.isArray(a) && a.length === b.length && a.every((value, index) => value === b[index]);
}

function findObjectByBodyPartPath(root: THREE.Object3D, path: number[]): THREE.Object3D | undefined {
  let match: THREE.Object3D | undefined;
  root.traverse((object) => {
    if (!match && pathsEqual(object.userData?.bodyPartPath, path)) {
      match = object;
    }
  });
  return match;
}

function matrixSignature(matrix: THREE.Matrix4): string {
  const e = matrix.elements;
  return [
    e[12].toFixed(5),
    e[13].toFixed(5),
    e[14].toFixed(5),
    e[0].toFixed(5),
    e[1].toFixed(5),
    e[2].toFixed(5),
    e[4].toFixed(5),
    e[5].toFixed(5),
    e[6].toFixed(5),
    e[8].toFixed(5),
    e[9].toFixed(5),
    e[10].toFixed(5),
  ].join(",");
}

function getBindings(ctx: ECSContext): Map<number, AnimatedColliderBinding[]> {
  let bindings = getResource<Map<number, AnimatedColliderBinding[]>>(ctx, "animatedColliderBindings", true);
  if (!bindings) {
    bindings = new Map();
    setResource(ctx, "animatedColliderBindings", bindings);
  }
  return bindings;
}

export function registerAnimatedColliderBindings(
  ctx: ECSContext,
  eid: number,
  nextBindings: AnimatedColliderBinding[]
): void {
  if (nextBindings.length === 0) return;
  const bindings = getBindings(ctx);
  bindings.set(eid, [...(bindings.get(eid) ?? []), ...nextBindings]);
}

export function clearAnimatedColliderBindings(ctx: ECSContext, eid: number): void {
  const bindings = getResource<Map<number, AnimatedColliderBinding[]>>(ctx, "animatedColliderBindings", true);
  bindings?.delete(eid);
}

export function prepareAnimatedColliderBindings(ctx: ECSContext, eid: number): void {
  const bindings = getResource<Map<number, AnimatedColliderBinding[]>>(ctx, "animatedColliderBindings", true)?.get(eid);
  if (!bindings || bindings.length === 0) return;

  const renderObject = getResource<Map<number, THREE.Object3D>>(ctx, "renderObjects", true)?.get(eid);
  if (!renderObject) return;

  renderObject.updateMatrixWorld(true);
  _entityInverse.copy(renderObject.matrixWorld).invert();

  for (const binding of bindings) {
    if (binding.targetToColliderMatrix) continue;
    const target = findObjectByBodyPartPath(renderObject, binding.targetPath);
    if (!target) continue;

    target.updateMatrixWorld(true);
    _targetLocal.multiplyMatrices(_entityInverse, target.matrixWorld);
    binding.targetToColliderMatrix = _targetLocal.clone().invert().multiply(binding.initialColliderLocalMatrix);
  }
}

export function syncAnimatedColliders(ctx: ECSContext, eid: number): void {
  const bindings = getResource<Map<number, AnimatedColliderBinding[]>>(ctx, "animatedColliderBindings", true)?.get(eid);
  if (!bindings || bindings.length === 0) return;

  const renderObject = getResource<Map<number, THREE.Object3D>>(ctx, "renderObjects", true)?.get(eid);
  if (!renderObject) return;

  renderObject.updateMatrixWorld(true);
  _entityInverse.copy(renderObject.matrixWorld).invert();

  for (const binding of bindings) {
    if (!binding.targetToColliderMatrix) continue;

    const target = findObjectByBodyPartPath(renderObject, binding.targetPath);
    if (!target) continue;

    target.updateMatrixWorld(true);
    _targetLocal.multiplyMatrices(_entityInverse, target.matrixWorld);
    _nextColliderLocal.multiplyMatrices(_targetLocal, binding.targetToColliderMatrix);

    const signature = matrixSignature(_nextColliderLocal);
    if (signature === binding.lastSignature) continue;
    binding.lastSignature = signature;

    const collider = ctx.rapier.world.getCollider(binding.colliderHandle);
    if (!collider) continue;

    _nextColliderLocal.decompose(_position, _quaternion, _scale);
    collider.setTranslationWrtParent({ x: _position.x, y: _position.y, z: _position.z });
    collider.setRotationWrtParent({ x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w });
  }
}
