import { describe, it, expect } from 'vitest';
import { createECS, resetECS, getResource, setResource } from '../../ecs';
import { EditorCameraState } from '../../editorCameraController';

describe('Editor Camera State Preservation', () => {
  it('should preserve editorCameraState across resetECS calls', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    // Create an initial camera state with some input flags set
    const initialCameraState: EditorCameraState = {
      moveForward: true,
      moveBackward: false,
      moveLeft: true,
      moveRight: false,
      moveUp: false,
      moveDown: true,
      isRotating: true,
      lastMouseX: 100,
      lastMouseY: 200,
      yaw: 1.5,
      pitch: -0.5,
    };

    setResource(ctx, 'editorCameraState', initialCameraState);

    // Verify state is set
    const stateBeforeReset = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(stateBeforeReset).toBeDefined();
    expect(stateBeforeReset?.moveForward).toBe(true);
    expect(stateBeforeReset?.moveLeft).toBe(true);
    expect(stateBeforeReset?.moveDown).toBe(true);
    expect(stateBeforeReset?.yaw).toBe(1.5);

    // Call resetECS (simulating world load)
    resetECS(ctx);

    // Verify state is preserved after reset
    const stateAfterReset = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(stateAfterReset).toBeDefined();
    expect(stateAfterReset?.moveForward).toBe(true);
    expect(stateAfterReset?.moveLeft).toBe(true);
    expect(stateAfterReset?.moveDown).toBe(true);
    expect(stateAfterReset?.yaw).toBe(1.5);
    expect(stateAfterReset?.pitch).toBe(-0.5);
  });

  it('should preserve keyboard input state when user is holding keys during world load', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    // Simulate user holding W and D keys
    const cameraState: EditorCameraState = {
      moveForward: true,
      moveBackward: false,
      moveLeft: false,
      moveRight: true,
      moveUp: false,
      moveDown: false,
      isRotating: false,
      lastMouseX: 0,
      lastMouseY: 0,
      yaw: 0,
      pitch: 0,
    };

    setResource(ctx, 'editorCameraState', cameraState);

    // Simulate world load which calls resetECS
    resetECS(ctx);

    // Verify keyboard state is preserved (user still holding keys)
    const preservedState = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(preservedState?.moveForward).toBe(true);
    expect(preservedState?.moveRight).toBe(true);
    expect(preservedState?.moveBackward).toBe(false);
    expect(preservedState?.moveLeft).toBe(false);
  });

  it('should not error if editorCameraState does not exist before resetECS', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    // Don't set editorCameraState - it might not exist in non-editor modes
    expect(() => resetECS(ctx)).not.toThrow();

    // Verify editorCameraState is still undefined after reset
    const state = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(state).toBeUndefined();
  });

  it('should preserve rotation state during right-click drag across world load', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    // Simulate user rotating camera (right-click held)
    const cameraState: EditorCameraState = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      isRotating: true,
      lastMouseX: 500,
      lastMouseY: 300,
      yaw: 2.1,
      pitch: -1.2,
    };

    setResource(ctx, 'editorCameraState', cameraState);

    // Simulate world load
    resetECS(ctx);

    // Verify rotation state and mouse position are preserved
    const preservedState = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(preservedState?.isRotating).toBe(true);
    expect(preservedState?.lastMouseX).toBe(500);
    expect(preservedState?.lastMouseY).toBe(300);
    expect(preservedState?.yaw).toBe(2.1);
    expect(preservedState?.pitch).toBe(-1.2);
  });

  it('should preserve isPlaying=false and editorCameraState together', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    const cameraState: EditorCameraState = {
      moveForward: true,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      isRotating: false,
      lastMouseX: 0,
      lastMouseY: 0,
      yaw: 0,
      pitch: 0,
    };

    setResource(ctx, 'editorCameraState', cameraState);

    // Both should be preserved
    resetECS(ctx);

    expect(ctx.isPlaying).toBe(false);
    const preservedState = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(preservedState?.moveForward).toBe(true);
  });

  it('should preserve editorCameraCleanup function across resetECS to keep event listeners active', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    // Create mock cleanup function
    let cleanupCalled = false;
    const mockCleanup = () => {
      cleanupCalled = true;
    };

    // Create camera state and cleanup function (simulating initEditorCameraController)
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
      pitch: 0,
    };

    setResource(ctx, 'editorCameraState', cameraState);
    setResource(ctx, 'editorCameraCleanup', mockCleanup, (cleanup) => cleanup());

    // Verify cleanup is set
    const cleanupBeforeReset = getResource(ctx, 'editorCameraCleanup');
    expect(cleanupBeforeReset).toBeDefined();
    expect(cleanupCalled).toBe(false); // Should not have been called yet

    // Call resetECS (simulating play/stop cycle with world reload)
    resetECS(ctx);

    // Verify cleanup was NOT called (because we preserve it)
    expect(cleanupCalled).toBe(false);

    // Verify cleanup function is still available after reset
    const cleanupAfterReset = getResource(ctx, 'editorCameraCleanup');
    expect(cleanupAfterReset).toBeDefined();
    expect(typeof cleanupAfterReset).toBe('function');

    // Verify it's the same function
    expect(cleanupAfterReset).toBe(mockCleanup);
  });

  it('should handle play/stop cycle without losing camera event listeners', () => {
    const ctx = createECS();
    ctx.isPlaying = false;

    // Initial setup (editor mode)
    const cameraState: EditorCameraState = {
      moveForward: true, // User is holding W
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      isRotating: false,
      lastMouseX: 0,
      lastMouseY: 0,
      yaw: 1.0,
      pitch: -0.3,
    };

    let cleanupCallCount = 0;
    const cleanup = () => { cleanupCallCount++; };

    setResource(ctx, 'editorCameraState', cameraState);
    setResource(ctx, 'editorCameraCleanup', cleanup, (c) => c());

    // Simulate entering play mode (isPlaying = true)
    ctx.isPlaying = true;

    // Simulate exiting play mode -> loadWorld -> resetECS
    ctx.isPlaying = false;
    resetECS(ctx);

    // Cleanup should NOT have been called (event listeners still active)
    expect(cleanupCallCount).toBe(0);

    // Camera state should be preserved (user still holding W)
    const stateAfterCycle = getResource<EditorCameraState>(ctx, 'editorCameraState');
    expect(stateAfterCycle?.moveForward).toBe(true);
    expect(stateAfterCycle?.yaw).toBe(1.0);

    // Cleanup function should still be available
    const cleanupAfterCycle = getResource(ctx, 'editorCameraCleanup');
    expect(cleanupAfterCycle).toBeDefined();
    expect(cleanupAfterCycle).toBe(cleanup);
  });
});
