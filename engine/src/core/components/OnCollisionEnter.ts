import { defineComponent, Types } from "bitecs";

export const OnCollisionEnter = defineComponent({
  effectsId: Types.ui32, // ID for the array of effects stored in a separate resource
  coolDown: Types.f32, // Base cooldown time for this component
  coolDownRemaining: Types.f32, // Remaining cooldown time
  needsCooldownReset: Types.ui8
});