/**
 * Editor Camera Movement Tests
 * Verifies camera movement works in editor mode when not playing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from 'bitecs';
import { ECSContext, setResource, getResource } from '../../ecs';
import { editorCameraSystem } from '../../systems/flyControls';
import { EditorCameraState } from '../../editorCameraController';
import * as THREE from 'three';

describe('Editor Camera Movement', () => {
  let ctx: ECSContext;
  let camera: THREE.PerspectiveCamera;
  let cameraState: EditorCameraState;

  beforeEach(() => {
    ctx = {
      world: createWorld(),
      isPlaying: false,
      pipeline: [],
      resources: new Map(),
      three: {
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        worldRoot: new THREE.Group(),
      },
      time: {
        setTimescale: () => {},
        update: () => {},
        getDelta: () => 0.016,
        getElapsed: () => 0,
      },
    } as any;

    camera = ctx.three.camera as THREE.PerspectiveCamera;
    camera.position.set(0, 10, 10);
    
    // Initialize camera state
    cameraState = {
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
    setResource(ctx, 'deltaTime', 0.016);
  });

  it('should move camera forward when moveForward is true', () => {
    const initialZ = camera.position.z;
    
    cameraState.moveForward = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved forward (negative Z direction when looking at origin)
    expect(camera.position.z).not.toBe(initialZ);
  });

  it('should move camera backward when moveBackward is true', () => {
    const initialZ = camera.position.z;
    
    cameraState.moveBackward = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved backward
    expect(camera.position.z).not.toBe(initialZ);
  });

  it('should move camera right when moveRight is true', () => {
    const initialX = camera.position.x;
    
    cameraState.moveRight = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved to the right
    expect(camera.position.x).not.toBe(initialX);
  });

  it('should move camera left when moveLeft is true', () => {
    const initialX = camera.position.x;
    
    cameraState.moveLeft = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved to the left
    expect(camera.position.x).not.toBe(initialX);
  });

  it('should move camera up when moveUp is true', () => {
    const initialY = camera.position.y;
    
    cameraState.moveUp = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved up
    expect(camera.position.y).toBeGreaterThan(initialY);
  });

  it('should move camera down when moveDown is true', () => {
    const initialY = camera.position.y;
    
    cameraState.moveDown = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved down
    expect(camera.position.y).toBeLessThan(initialY);
  });

  it('should apply camera rotation from yaw and pitch', () => {
    cameraState.yaw = Math.PI / 4; // 45 degrees
    cameraState.pitch = -Math.PI / 6; // -30 degrees
    
    editorCameraSystem(ctx);
    
    expect(camera.rotation.y).toBe(cameraState.yaw);
    expect(camera.rotation.x).toBe(cameraState.pitch);
    expect(camera.rotation.z).toBe(0); // No roll
  });

  it('should work when ctx.isPlaying is false (editor mode)', () => {
    ctx.isPlaying = false;
    const initialPosition = camera.position.clone();
    
    cameraState.moveForward = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved even when not playing
    expect(camera.position.distanceTo(initialPosition)).toBeGreaterThan(0);
  });

  it('should still work when ctx.isPlaying is true (play mode)', () => {
    ctx.isPlaying = true;
    const initialPosition = camera.position.clone();
    
    cameraState.moveForward = true;
    editorCameraSystem(ctx);
    
    // Camera should have moved in play mode too
    expect(camera.position.distanceTo(initialPosition)).toBeGreaterThan(0);
  });

  it('should not move when no movement flags are set', () => {
    const initialPosition = camera.position.clone();
    
    // All movement flags are false
    editorCameraSystem(ctx);
    
    // Camera should not have moved
    expect(camera.position.x).toBe(initialPosition.x);
    expect(camera.position.y).toBe(initialPosition.y);
    expect(camera.position.z).toBe(initialPosition.z);
  });
});
