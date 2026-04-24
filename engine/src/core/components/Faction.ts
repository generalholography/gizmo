import { defineComponent, Types } from "bitecs";

export const NO_FACTION_ID = "_unaligned";

export const Faction = defineComponent({
    id: [Types.ui8, 128],
});
