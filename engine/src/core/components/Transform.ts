import { defineComponent, Types } from "bitecs";
export const Transform = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  qx: Types.f32,
  qy: Types.f32,
  qz: Types.f32,
  qw: Types.f32,
  sx: Types.f32,
  sy: Types.f32,
  sz: Types.f32
});

// convenient defaults
export const identityTransform = {
  x: 0, y: 0, z: 0,
  qx: 0, qy: 0, qz: 0, qw: 1,
  sx: 1, sy: 1, sz: 1
};
