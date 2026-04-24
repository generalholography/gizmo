import { defineComponent, Types } from "bitecs";

export const MAX_HOTBAR_SIZE = 10;

export const Inventory = defineComponent({
  size: Types.ui8,
  selected: Types.i8,
});
