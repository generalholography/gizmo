import { describe, expect, it, vi } from "vitest";
import { createWorld } from "bitecs";
import type { ECSContext } from "../../ecs";
import { getSpatialTriggerRuntime } from "../spatialTriggerRuntime";

function makeCtx(ruleOverrides?: Partial<any>): ECSContext {
  const world = createWorld() as ECSContext;
  const emitEngineTrigger = vi.fn(() => 1);
  Object.assign(world, {
    modules: new Map([
      ["rule", {
        emitEngineTrigger,
        getEntityRulesByTrigger: vi.fn(() => []),
        ...ruleOverrides,
      }],
    ]),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    input: {} as any,
    time: { getElapsed: () => 0 } as any,
    rapier: { world: {} } as any,
  });
  return world;
}

describe("spatial trigger runtime", () => {
  it("deduplicates directed collision pairs per scope and frame", () => {
    const ctx = makeCtx();
    const runtime = getSpatialTriggerRuntime(ctx);
    const emit = (ctx.modules.get("rule") as any).emitEngineTrigger as ReturnType<typeof vi.fn>;

    expect(runtime.emitCollisionEnter("collisionSystem", 1, 2)).toBe(true);
    expect(runtime.emitCollisionEnter("collisionSystem", 1, 2)).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);

    runtime.clearScope("collisionSystem");
    expect(runtime.emitCollisionEnter("collisionSystem", 1, 2)).toBe(true);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("keeps dedupe state isolated per spatial scope", () => {
    const ctx = makeCtx();
    const runtime = getSpatialTriggerRuntime(ctx);
    const emit = (ctx.modules.get("rule") as any).emitEngineTrigger as ReturnType<typeof vi.fn>;

    runtime.emitCollisionEnter("collisionSystem", 9, 10);
    runtime.emitCollisionEnter("motionControl", 9, 10);

    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("computes action range from rule trigger params with default fallback", () => {
    const getEntityRulesByTrigger = vi.fn((eid: number, triggerType: string) => {
      if (eid === 100 && triggerType === "primaryAction") {
        return [{ trigger: { type: "primaryAction", params: { range: 4 } } }];
      }
      if (eid === 200 && triggerType === "secondaryAction") {
        return [{ trigger: { type: "secondaryAction", params: { range: 9 } } }];
      }
      return [];
    });

    const ctx = makeCtx({ getEntityRulesByTrigger });
    const runtime = getSpatialTriggerRuntime(ctx);

    expect(runtime.computeMaxActionRange(100, 200, true, true, 7)).toBe(9);
    expect(runtime.computeMaxActionRange(100, 200, false, false, 7)).toBe(7);
  });

  it("emits interact trigger with user/interactor context", () => {
    const ctx = makeCtx();
    const runtime = getSpatialTriggerRuntime(ctx);
    const emit = (ctx.modules.get("rule") as any).emitEngineTrigger as ReturnType<typeof vi.fn>;

    expect(runtime.emitInteract(5, 8, 2, 7)).toBe(true);
    expect(runtime.emitInteract(5, 8, 9, 7)).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("interact", { self: 8, other: 5, user: 5 });
  });
});
