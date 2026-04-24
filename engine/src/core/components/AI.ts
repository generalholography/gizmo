import { defineComponent, Types } from "bitecs";

export enum AIState {
    WANDER,
    CHASE,
}

export const AI = defineComponent({
    isAggressive: Types.ui8, // 0 or 1
    awarenessRange: Types.f32, // Range within which the AI can detect entities
    _state: Types.ui8, // AIState
    _updateTargetCooldown: Types.f32, // Cooldown for getting the next position
    _target: [Types.f32, 3], // Target position (x, y, z)
    _targetEid: Types.i32, // Target entity ID (-1 if no target)
})