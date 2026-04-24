import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ECSContext, getResource, setResource } from '../ecs';

export const orbitControlsSystem = (ctx: ECSContext): void => {
  const orbitControls = getResource<OrbitControls>(ctx, 'orbitControls', true);
  const dt = getResource<number>(ctx, 'deltaTime', true) || 0;
  const initialAdjusted = getResource<boolean>(ctx, 'orbitControlsInitialAdjusted', true);

  if (!orbitControls) return;

  const { scene, camera } = ctx.three;
  if (!scene || !camera) return;

  if (!initialAdjusted) {
    const boundingBox = new THREE.Box3().setFromObject(scene);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxExtent = Math.max(size.x, size.z);

    if (orbitControls.target.distanceTo(center) > 0.1) {
      const existingOffset = camera.position.clone().sub(orbitControls.target);
      orbitControls.target.copy(center);
      camera.position.copy(center).add(existingOffset);
    }

    setResource(ctx, 'orbitControlsInitialAdjusted', true);
  }

  orbitControls.enableZoom = true;
  orbitControls.enablePan = true;
  orbitControls.enableRotate = true;

  orbitControls.update(dt);
};
