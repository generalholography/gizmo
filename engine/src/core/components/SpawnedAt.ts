import { defineComponent, Types } from "bitecs";
import { ECSContext, getResource } from "../ecs";

export const SpawnedAt = defineComponent({
    timestamp: Types.f32
})

export function getTimeAliveInSeconds(ctx: ECSContext, eid: number): number {
    if (
        SpawnedAt.timestamp[eid] === null ||
        SpawnedAt.timestamp[eid] === undefined
    ) return 0;
    return ctx.time.getElapsed() - SpawnedAt.timestamp[eid];
}