import { defineComponent, Types } from "bitecs";

export const OnDie = defineComponent({
  effectsId: Types.ui32, // ID for the array of effects stored in a separate resource
});