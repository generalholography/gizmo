import { defineQuery } from "bitecs";
import { ECSContext, } from "../ecs";
import { _InputState, Player } from "../components";

const playerQuery = defineQuery([Player]);

export const updatePlayerInputState = (ctx: ECSContext) => {
    for (const eid of playerQuery(ctx)) {
        _InputState.moveX[eid] = ctx.input.moveX;
        _InputState.moveY[eid] = ctx.input.moveY;
        _InputState.moveZ[eid] = ctx.input.moveZ;
        _InputState.yaw[eid] = ctx.input.yaw;
        _InputState.pitch[eid] = ctx.input.pitch;
        _InputState.interact[eid] = ctx.input.interact;
        _InputState.primary[eid] = ctx.input.primary;
        _InputState.secondary[eid] = ctx.input.secondary;
        _InputState.sprint[eid] = ctx.input.sprint ? 1 : 0;
    }
}
