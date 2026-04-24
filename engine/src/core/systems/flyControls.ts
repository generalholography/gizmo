import { ECSContext, getResource } from '../ecs';
import * as THREE from 'three';
import { EditorCameraState } from '../editorCameraController';

export const editorCameraSystem = (ctx: ECSContext): void => {
  const camera = ctx.three.camera;
  const cameraState = getResource<EditorCameraState>(ctx, 'editorCameraState');
  // Use editorDeltaTime which is real time delta, not affected by timescale
  // This ensures camera movement works in editor mode even when ctx.isPlaying is false
  const dt = getResource<number>(ctx, 'editorDeltaTime') || getResource<number>(ctx, 'deltaTime') || 0;

  if (!camera || !cameraState) return;

  // Movement speed
  const moveSpeed = 10 * dt;

  // Calculate movement direction relative to camera orientation (XZ plane only)
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  
  // Get camera forward direction projected onto XZ plane
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  
  // Get right vector (perpendicular to forward on XZ plane)
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  // Apply movement
  const movement = new THREE.Vector3();
  
  if (cameraState.moveForward) movement.add(forward);
  if (cameraState.moveBackward) movement.sub(forward);
  if (cameraState.moveRight) movement.add(right);
  if (cameraState.moveLeft) movement.sub(right);
  if (cameraState.moveUp) movement.y += 1;
  if (cameraState.moveDown) movement.y -= 1;

  if (movement.length() > 0) {
    movement.normalize().multiplyScalar(moveSpeed);
    camera.position.add(movement);
  }

  // Apply rotation (pitch and yaw only, no roll)
  camera.rotation.order = 'YXZ';
  camera.rotation.y = cameraState.yaw;
  camera.rotation.x = cameraState.pitch;
  camera.rotation.z = 0; // No roll
};
