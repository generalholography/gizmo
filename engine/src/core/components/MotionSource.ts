import { defineComponent, Types } from "bitecs";

// NB: I have not definitively tested that this works as sentinel but it should
// UINT32_MAX in rust is used for invalid in rapier source code
export const NO_COLLIDER_ID = 0xFFFFFFFF;

export const MotionSource = defineComponent({
  motionSourceId: Types.ui32,
  bodyHandle: Types.f64,
  isGrounded: Types.ui8,
});