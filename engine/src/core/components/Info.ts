import { defineComponent, hasComponent, Types } from "bitecs";
import { ECSContext } from "../ecs";
import { decode } from "../../utils/strings";
import { KILL_PLANE_EID, KILL_PLANE_NAME } from "../systems/killPlane";

export const Info = defineComponent({
    name: [Types.ui8, 128],
    description: [Types.ui8, 256],
})

export function getName(ctx: ECSContext, eid: number): string | undefined {
    if (eid === KILL_PLANE_EID) return KILL_PLANE_NAME;
    if (!hasComponent(ctx, Info, eid)) return String(eid);
    const name = decode(Info.name[eid]);
    if (!name) return String(eid);
    return name;
}