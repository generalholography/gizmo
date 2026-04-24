import { defineComponent, hasComponent, Types } from "bitecs";
import { InputState } from "../input";
import { ECSContext } from "../ecs";
import { MountedBy } from "./MountedBy";

export const _InputState = defineComponent({
    moveX: Types.f32,
    moveY: Types.f32,
    moveZ: Types.f32,
    yaw: Types.f32,
    pitch: Types.f32,
    interact: Types.f32,
    primary: Types.f32,
    secondary: Types.f32,
    sprint: Types.ui8,
});

/**
 * Parse the input state for an entity, following mount hierarchy if needed.
 * @param ctx ECS context
 * @param eid Entity ID
 * @returns InputState
 */
export function parseInputState(ctx: ECSContext, eid: number): InputState {
    if (hasComponent(ctx, MountedBy, eid)) {
        const rider = MountedBy.eid[eid];
        return parseInputState(ctx, rider);
    }
    return {
        moveX: _InputState.moveX[eid] || 0,
        moveY: _InputState.moveY[eid] || 0,
        moveZ: _InputState.moveZ[eid] || 0,
        yaw: _InputState.yaw[eid] || 0,
        pitch: _InputState.pitch[eid] || 0,
        interact: _InputState.interact[eid] || 0,
        primary: _InputState.primary[eid] || 0,
        secondary: _InputState.secondary[eid] || 0,
        sprint: !!_InputState.sprint[eid],
    }
}
