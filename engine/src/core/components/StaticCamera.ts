import { defineComponent, Types } from "bitecs";

export const StaticCamera = defineComponent({
  fov: Types.f32,
  lookAtX: Types.f32,
  lookAtY: Types.f32,
  lookAtZ: Types.f32,
});
