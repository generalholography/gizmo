import { defineQuery, hasComponent } from "bitecs";
import { ECSContext } from "../ecs";
import { Mounting } from "../components/Mounting";
import { MotionSource } from "../components/MotionSource";

const mountQ = defineQuery([Mounting, MotionSource]);

export const mountSystem = (ctx: ECSContext) => {
  for (const eid of mountQ(ctx)) {
    const target = Mounting.target[eid];
    if (target === undefined) continue;

    const riderHandle = MotionSource.bodyHandle[eid];
    const targetHandle = MotionSource.bodyHandle[target];
    const riderRb = ctx.rapier.world.getRigidBody(riderHandle);
    const targetRb = ctx.rapier.world.getRigidBody(targetHandle);

    if (riderRb && targetRb) {
      const pos = targetRb.translation();
      const rot = targetRb.rotation();
      riderRb.setNextKinematicTranslation({
        x: pos.x + Mounting.offsetX[eid],
        y: pos.y + Mounting.offsetY[eid],
        z: pos.z + Mounting.offsetZ[eid],
      });
      riderRb.setNextKinematicRotation(rot);
    }

    // // sync look direction
    // if (hasComponent(ctx, LookDirection, eid) && hasComponent(ctx, LookDirection, target)) {
    //   LookDirection.yaw[eid] = LookDirection.yaw[target];
    //   LookDirection.pitch[eid] = LookDirection.pitch[target];
    // }
  }
};
