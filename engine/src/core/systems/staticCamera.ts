import { defineQuery } from "bitecs";
import * as THREE from "three";
import { Transform } from "../components/Transform";
import { StaticCamera } from "../components/StaticCamera";
import { ECSContext } from "../ecs";

const staticCameraQuery = defineQuery([StaticCamera, Transform]);

export const staticCameraSystem = (ctx: ECSContext) => {
  const { camera } = ctx.three;
  const eids = staticCameraQuery(ctx);
  
  if (!camera || eids.length === 0) return;

  // Use the first static camera entity found
  eids.sort((a, b) => a - b);
  const eid = eids[0];

  // Set camera position from Transform
  (camera as THREE.PerspectiveCamera).position.set(
    Transform.x[eid],
    Transform.y[eid],
    Transform.z[eid]
  );

  // Set FOV if it's different
  const fov = StaticCamera.fov[eid];
  if (fov > 0 && (camera as THREE.PerspectiveCamera).fov !== fov) {
    (camera as THREE.PerspectiveCamera).fov = fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }

  // Look at the target position
  const lookAt = new THREE.Vector3(
    StaticCamera.lookAtX[eid],
    StaticCamera.lookAtY[eid],
    StaticCamera.lookAtZ[eid]
  );
  camera.lookAt(lookAt);
};
