import { defineComponent, Types } from "bitecs";

export const _RuntimeCharacterControllerData = defineComponent({
    colliderHandle: Types.f64,
    sensorHandle: Types.f64,
    softPushVelocity: [Types.f32, 3],
    knockbackVector: [Types.f32, 3],
    canFly: Types.ui8, // 0 = false, 1 = true
    creativeMode: Types.ui8, // 0 = false, 1 = true
});