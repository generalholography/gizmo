import * as THREE from 'three';
import { getResource, setResource, type ECSContext } from './ecs';
import type { EditorCameraState } from './editorCameraController';

export interface ViewportCameraPose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  direction: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  fov?: number;
}

export interface ViewportCameraSetOptions {
  position?: { x?: number; y?: number; z?: number };
  lookAt?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number; w?: number } | { x?: number; y?: number; z?: number };
  fov?: number;
}

export interface FrameSelectionOptions {
  padding?: number;
  fov?: number;
}

export interface ViewportFrameResult {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  fov?: number;
}

function toSerializableVector3(vector: THREE.Vector3) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function toSerializableQuaternion(quaternion: THREE.Quaternion) {
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

function normalizeVector3(
  value: { x?: number; y?: number; z?: number } | undefined,
  fallback: THREE.Vector3,
): THREE.Vector3 {
  return new THREE.Vector3(
    typeof value?.x === 'number' ? value.x : fallback.x,
    typeof value?.y === 'number' ? value.y : fallback.y,
    typeof value?.z === 'number' ? value.z : fallback.z,
  );
}

function normalizeQuaternion(
  rotation: ViewportCameraSetOptions['rotation'],
  fallback: THREE.Quaternion,
): THREE.Quaternion {
  if (!rotation) {
    return fallback.clone();
  }

  if (typeof (rotation as any).w === 'number') {
    const quaternion = new THREE.Quaternion(
      (rotation as any).x ?? 0,
      (rotation as any).y ?? 0,
      (rotation as any).z ?? 0,
      (rotation as any).w ?? 1,
    );
    quaternion.normalize();
    return quaternion;
  }

  const euler = new THREE.Euler(
    (rotation as any).x ?? 0,
    (rotation as any).y ?? 0,
    (rotation as any).z ?? 0,
    'XYZ',
  );
  return new THREE.Quaternion().setFromEuler(euler);
}

function syncEditorCameraState(ctx: ECSContext, quaternion: THREE.Quaternion): void {
  const cameraState = getResource<EditorCameraState>(ctx, 'editorCameraState', true);
  if (!cameraState) {
    return;
  }

  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  cameraState.yaw = euler.y;
  cameraState.pitch = euler.x;
  cameraState.isRotating = false;
}

export function getViewportCameraPose(ctx: ECSContext): ViewportCameraPose {
  const camera = ctx.three.camera as THREE.PerspectiveCamera;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const storedLookAt = getResource<{ x: number; y: number; z: number }>(ctx, 'viewportCameraLookAt', true);
  const lookAt = storedLookAt
    ? new THREE.Vector3(storedLookAt.x, storedLookAt.y, storedLookAt.z)
    : camera.position.clone().add(direction);

  return {
    position: toSerializableVector3(camera.position),
    rotation: toSerializableQuaternion(camera.quaternion),
    direction: toSerializableVector3(direction),
    lookAt: toSerializableVector3(lookAt),
    fov: camera.isPerspectiveCamera ? camera.fov : undefined,
  };
}

export function applyViewportCameraPose(ctx: ECSContext, options: ViewportCameraSetOptions): ViewportCameraPose {
  const camera = ctx.three.camera as THREE.PerspectiveCamera;
  const nextPosition = normalizeVector3(options.position, camera.position);

  camera.position.copy(nextPosition);

  if (typeof options.fov === 'number' && camera.isPerspectiveCamera) {
    camera.fov = options.fov;
    camera.updateProjectionMatrix();
  }

  let nextQuaternion = camera.quaternion.clone();

  if (options.lookAt) {
    const lookAt = normalizeVector3(options.lookAt, new THREE.Vector3());
    camera.lookAt(lookAt);
    nextQuaternion.copy(camera.quaternion);
    setResource(ctx, 'viewportCameraLookAt', toSerializableVector3(lookAt));
  } else if (options.rotation) {
    nextQuaternion = normalizeQuaternion(options.rotation, camera.quaternion);
    camera.quaternion.copy(nextQuaternion);
    setResource(ctx, 'viewportCameraLookAt', undefined);
  }

  camera.updateMatrixWorld(true);
  syncEditorCameraState(ctx, nextQuaternion);

  return getViewportCameraPose(ctx);
}

function getPerspectiveCamera(ctx: ECSContext): THREE.PerspectiveCamera {
  const camera = ctx.three.camera as THREE.PerspectiveCamera;
  if (!camera?.isPerspectiveCamera) {
    throw new Error('Viewport camera framing requires a perspective camera.');
  }
  return camera;
}

export function computeViewportFrameForBounds(
  ctx: ECSContext,
  box: THREE.Box3,
  options: FrameSelectionOptions = {},
): ViewportFrameResult {
  if (box.isEmpty()) {
    throw new Error('Cannot frame an empty bounding box.');
  }

  const camera = getPerspectiveCamera(ctx);
  const currentPose = getViewportCameraPose(ctx);
  const currentDirection = new THREE.Vector3(
    currentPose.direction.x,
    currentPose.direction.y,
    currentPose.direction.z,
  ).normalize();
  if (currentDirection.lengthSq() < 0.0001) {
    currentDirection.set(0, 0, -1);
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (maxSize <= 0) {
    throw new Error('Cannot frame bounds with zero size.');
  }

  const targetFov = typeof options.fov === 'number' ? options.fov : camera.fov;
  const padding = typeof options.padding === 'number' ? options.padding : 2;
  const fitHeightDistance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(targetFov * 0.5)));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = Math.max(fitHeightDistance, fitWidthDistance) * padding + maxSize * 0.5;

  return {
    position: toSerializableVector3(center.clone().sub(currentDirection.multiplyScalar(distance))),
    lookAt: toSerializableVector3(center),
    fov: targetFov,
  };
}

export function frameViewportBounds(
  ctx: ECSContext,
  box: THREE.Box3,
  options: FrameSelectionOptions = {},
): ViewportCameraPose {
  return applyViewportCameraPose(ctx, computeViewportFrameForBounds(ctx, box, options));
}

export function computeViewportFrameForEntity(
  ctx: ECSContext,
  eid: number,
  options: FrameSelectionOptions = {},
): ViewportFrameResult {
  const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects', true);
  if (!renderObjects) {
    throw new Error('Render objects are not available for viewport framing.');
  }

  const target = renderObjects.get(eid);
  if (!target) {
    throw new Error(`Entity ${eid} does not have a render object.`);
  }

  const box = new THREE.Box3().setFromObject(target);
  return computeViewportFrameForBounds(ctx, box, options);
}

export function frameViewportEntity(
  ctx: ECSContext,
  eid: number,
  options: FrameSelectionOptions = {},
): ViewportCameraPose {
  return applyViewportCameraPose(ctx, computeViewportFrameForEntity(ctx, eid, options));
}
