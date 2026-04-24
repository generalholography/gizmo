import { defineComponent, Types } from "bitecs";

export const OnTimeElapsed = defineComponent({
  effectsId: Types.ui32, // ID for the array of effects stored in a separate resource
  duration: Types.f32, // Time in seconds before firing
  timeRemaining: Types.f32, // Countdown timer
  repeat: Types.ui8, // Whether to re-arm after firing
  hasFired: Types.ui8 // Tracks if the one-shot has already executed
});
