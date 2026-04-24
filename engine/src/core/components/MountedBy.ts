import { defineComponent, hasComponent, removeComponent, Types } from "bitecs";
import { Mounting } from "./Mounting";

export function dismount(ctx: any, mountEid: number) {
  if (hasComponent(ctx, MountedBy, mountEid)) {
    const rider = MountedBy.eid[mountEid];
    removeComponent(ctx, MountedBy, mountEid);
    if (hasComponent(ctx, Mounting, rider)) {
      removeComponent(ctx, Mounting, rider);
    }
  }
}

export const MountedBy = defineComponent({
  eid: Types.ui32,
});
