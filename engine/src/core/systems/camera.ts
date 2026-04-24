import { defineQuery } from "bitecs";
import * as THREE from "three";
import { Transform } from "../components/Transform";
import { Player } from "../components/Player";
import { ECSContext, getResource } from "../ecs";
import { _InputState } from "../components";
import { getTaggedObjects } from "../../modules/renderer";

const playerCameraQ = defineQuery([Player, Transform, _InputState]);

export const cameraSystem = (ctx: ECSContext) => {
  const { camera } = ctx.three;
  const eids = playerCameraQ(ctx);
  if (!camera || eids.length === 0) return;

  eids.sort((a, b) => a - b); // ensure consistent order

  const eid = eids[0];

  // Get the first "head" tagged object position, fallback to Transform if not found
  let pos: THREE.Vector3 | undefined;
  const headObjs = getTaggedObjects(ctx, eid, "head");
  if (headObjs.length > 0) {
    pos = headObjs[0].getWorldPosition(new THREE.Vector3());
  }
  if (!pos) {
    console.warn(`No head object found for entity ${eid}, using Transform position.`);
    pos = new THREE.Vector3(
      Transform.x[eid],
      Transform.y[eid] + 1.5,
      Transform.z[eid]
    );
  }
  (camera as THREE.PerspectiveCamera).position.copy(pos);

  // When an XR session is active, the XR camera's pose should come from the headset,
  // so skip overriding rotation here.
  const xrActive = getResource<boolean>(ctx, "xrSessionActive") ?? false;
  if (xrActive) return;

  const yaw = _InputState.yaw[eid] ?? 0;
  const pitch = _InputState.pitch[eid] ?? 0;
  (camera as THREE.PerspectiveCamera).rotation.set(
    Math.min(Math.max(pitch, -Math.PI / 2), Math.PI / 2),
    yaw,
    0,
    "ZYX"
  );
}
