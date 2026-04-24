import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createECS, setResource } from '../ecs';
import { ViewportCameraCommand } from '../editor/commands/ViewportCameraCommand';
import type { EditorCameraState } from '../editorCameraController';
import {
  computeViewportFrameForEntity,
  getViewportCameraPose,
} from '../viewportCamera';

function createTestContext() {
  const ctx = createECS();
  ctx.three = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000),
    renderer: {
      setClearColor: () => undefined,
    } as any,
    worldRoot: new THREE.Group(),
  };
  return ctx;
}

describe('viewportCamera', () => {
  it('updates and restores the viewport camera pose with undo/redo semantics', () => {
    const ctx = createTestContext();
    const camera = ctx.three.camera as THREE.PerspectiveCamera;
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);

    const cameraState: EditorCameraState = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      isRotating: false,
      lastMouseX: 0,
      lastMouseY: 0,
      yaw: 0,
      pitch: -Math.PI / 6,
    };
    setResource(ctx, 'editorCameraState', cameraState);

    const initialPose = getViewportCameraPose(ctx);
    const command = new ViewportCameraCommand(ctx, {
      position: { x: 4, y: 6, z: 18 },
      lookAt: { x: 1, y: 2, z: 3 },
      fov: 55,
    });

    command.execute();
    const movedPose = getViewportCameraPose(ctx);
    expect(movedPose.position).toEqual({ x: 4, y: 6, z: 18 });
    expect(movedPose.lookAt.x).toBeCloseTo(1, 5);
    expect(movedPose.lookAt.y).toBeCloseTo(2, 5);
    expect(movedPose.lookAt.z).toBeCloseTo(3, 5);
    expect(movedPose.fov).toBe(55);
    expect(cameraState.yaw).not.toBe(0);

    command.undo();
    const restoredPose = getViewportCameraPose(ctx);
    expect(restoredPose.position.x).toBeCloseTo(initialPose.position.x, 5);
    expect(restoredPose.position.y).toBeCloseTo(initialPose.position.y, 5);
    expect(restoredPose.position.z).toBeCloseTo(initialPose.position.z, 5);

    command.redo();
    const redonePose = getViewportCameraPose(ctx);
    expect(redonePose.position).toEqual({ x: 4, y: 6, z: 18 });
    expect(redonePose.fov).toBe(55);
  });

  it('computes a framing pose for a rendered entity', () => {
    const ctx = createTestContext();
    const camera = ctx.three.camera as THREE.PerspectiveCamera;
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 6, 2),
      new THREE.MeshBasicMaterial(),
    );
    mesh.position.set(10, 3, -4);
    mesh.updateMatrixWorld(true);

    setResource(ctx, 'renderObjects', new Map([[42, mesh]]));

    const frame = computeViewportFrameForEntity(ctx, 42, { padding: 1.4, fov: 50 });
    expect(frame.lookAt.x).toBeCloseTo(10, 1);
    expect(frame.lookAt.y).toBeCloseTo(3, 1);
    expect(frame.lookAt.z).toBeCloseTo(-4, 1);
    expect(frame.position.z).toBeGreaterThan(frame.lookAt.z);
    expect(frame.fov).toBe(50);
  });
});
