import { defineComponent, Types } from "bitecs";

export const Mounting = defineComponent({
  target: Types.ui32,
  offsetX: Types.f32,
  offsetY: Types.f32,
  offsetZ: Types.f32,
});
