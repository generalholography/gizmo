import { defineComponent, Types } from "bitecs";

export const OnPrimaryAction = defineComponent({
  effectsId: Types.ui32, // ID for the array of effects stored in a separate resource
  coolDown: Types.f32, // Base cooldown time for this component
  coolDownRemaining: Types.f32,
});