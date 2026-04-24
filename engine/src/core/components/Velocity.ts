import { defineComponent, Types } from "bitecs";

export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

export const zeroVelocity = { x: 0, y: 0, z: 0 };
