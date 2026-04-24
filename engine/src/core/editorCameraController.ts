import * as THREE from 'three';
import { ECSContext, setResource } from './ecs';
import { isTextEditingActive } from './utils/textEditingGuards';

// Unity-style editor camera state
export interface EditorCameraState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  moveUp: boolean;
  moveDown: boolean;
  isRotating: boolean;
  lastMouseX: number;
  lastMouseY: number;
  yaw: number;
  pitch: number;
}

export interface EditorCameraController {
  cleanup: () => void;
}

/**
 * Initializes Unity-style editor camera controls
 * @param ctx ECS context
 * @param camera Three.js camera
 * @param domElement Canvas element for event listeners
 * @returns Controller with cleanup function
 */
export function initEditorCameraController(
  ctx: ECSContext,
  camera: THREE.Camera,
  domElement: HTMLElement
): EditorCameraController {
  // Initial camera position
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);

  // Initialize camera state
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
    pitch: -Math.PI / 6, // Initial pitch looking slightly down
  };

  // Set initial rotation
  camera.rotation.order = 'YXZ';
  camera.rotation.y = cameraState.yaw;
  camera.rotation.x = cameraState.pitch;

  // Keyboard event handlers
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || isTextEditingActive(event.target)) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'w': cameraState.moveForward = true; break;
      case 's': cameraState.moveBackward = true; break;
      case 'a': cameraState.moveLeft = true; break;
      case 'd': cameraState.moveRight = true; break;
      case 'e': cameraState.moveUp = true; break;
      case 'q': cameraState.moveDown = true; break;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.defaultPrevented || isTextEditingActive(event.target)) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'w': cameraState.moveForward = false; break;
      case 's': cameraState.moveBackward = false; break;
      case 'a': cameraState.moveLeft = false; break;
      case 'd': cameraState.moveRight = false; break;
      case 'e': cameraState.moveUp = false; break;
      case 'q': cameraState.moveDown = false; break;
    }
  };

  // Mouse event handlers for camera rotation
  const onMouseDown = (event: MouseEvent) => {
    if (event.button === 2) { // Right-click
      cameraState.isRotating = true;
      cameraState.lastMouseX = event.clientX;
      cameraState.lastMouseY = event.clientY;
    }
  };

  const onMouseUp = (event: MouseEvent) => {
    if (event.button === 2) {
      cameraState.isRotating = false;
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    if (cameraState.isRotating) {
      const deltaX = event.clientX - cameraState.lastMouseX;
      const deltaY = event.clientY - cameraState.lastMouseY;

      // Rotation sensitivity
      const sensitivity = 0.002;

      // Update yaw (horizontal rotation)
      cameraState.yaw -= deltaX * sensitivity;

      // Update pitch (vertical rotation) with clamping
      cameraState.pitch -= deltaY * sensitivity;
      cameraState.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraState.pitch));

      cameraState.lastMouseX = event.clientX;
      cameraState.lastMouseY = event.clientY;
    }
  };

  // Prevent context menu on right-click
  const preventContext = (e: Event) => e.preventDefault();

  // Add event listeners
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  domElement.addEventListener('mousedown', onMouseDown);
  domElement.addEventListener('mouseup', onMouseUp);
  domElement.addEventListener('mousemove', onMouseMove);
  domElement.addEventListener('contextmenu', preventContext);

  // Store camera state in ECS context
  setResource(ctx, 'editorCameraState', cameraState);

  // Return controller with cleanup function
  return {
    cleanup: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('contextmenu', preventContext);
    }
  };
}
