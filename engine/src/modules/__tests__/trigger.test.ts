import { beforeEach, describe, expect, it } from "vitest";
import { createECS, setResource } from "../../core/ecs";
import { Metrics } from "../../core/metrics";
import { TriggerModule, triggerModule } from "../trigger";

describe("TriggerModule", () => {
  let ctx: any;
  let trigger: TriggerModule;
  let metrics: Metrics;

  beforeEach(() => {
    ctx = createECS();
    metrics = new Metrics(ctx);
    setResource(ctx, "metrics", metrics);
    trigger = triggerModule(ctx);
  });

  it("fires immediate triggers on registration", () => {
    trigger.register("now", { type: "immediate", params: {} });
    const state = trigger.getState("now");
    expect(state?.hasFired).toBe(true);
    expect(state?.isComplete).toBe(true);
  });

  it("fires time triggers once after delay", () => {
    trigger.register("delayed", { type: "time", params: { delay: 2 } });

    trigger.update(1);
    expect(trigger.getState("delayed")?.hasFired).toBe(false);

    trigger.resetFiredFlags();
    trigger.update(1);
    expect(trigger.getState("delayed")?.hasFired).toBe(true);
    expect(trigger.getState("delayed")?.isComplete).toBe(true);
  });

  it("fires interval triggers repeatedly and catches up on large delta", () => {
    trigger.register("interval", {
      type: "interval",
      params: { interval: 1, initialDelay: 0, maxCount: 5 },
    });

    trigger.update(2.6);
    const state = trigger.getState("interval");
    expect(state?.fireCount).toBe(3);
    expect(state?.isComplete).toBe(false);

    trigger.resetFiredFlags();
    trigger.update(2.6);
    expect(trigger.getState("interval")?.fireCount).toBe(5);
    expect(trigger.getState("interval")?.isComplete).toBe(true);
  });

  it("supports event triggers and once semantics", () => {
    trigger.register("evt_repeat", { type: "event", params: { event: "ping" } });
    trigger.register("evt_once", { type: "event", params: { event: "ping", once: true } });

    trigger.emit("ping");
    expect(trigger.getState("evt_repeat")?.hasFired).toBe(true);
    expect(trigger.getState("evt_once")?.hasFired).toBe(true);
    expect(trigger.getState("evt_once")?.isComplete).toBe(true);

    trigger.resetFiredFlags();
    trigger.emit("ping");
    expect(trigger.getState("evt_repeat")?.hasFired).toBe(true);
    expect(trigger.getState("evt_repeat")?.fireCount).toBe(2);
    expect(trigger.getState("evt_once")?.hasFired).toBe(false);
    expect(trigger.getState("evt_once")?.fireCount).toBe(1);
  });

  it("pauses and resumes triggers", () => {
    trigger.register("paused_time", { type: "time", params: { delay: 1 } });
    trigger.pause("paused_time");

    trigger.update(2);
    expect(trigger.getState("paused_time")?.hasFired).toBe(false);

    trigger.resume("paused_time");
    trigger.update(1);
    expect(trigger.getState("paused_time")?.hasFired).toBe(true);
  });

  it("resets trigger state", () => {
    trigger.register("reset_me", { type: "interval", params: { interval: 0.5 } });
    trigger.update(1.5);
    expect(trigger.getState("reset_me")?.fireCount).toBe(3);

    trigger.reset("reset_me");
    const state = trigger.getState("reset_me");
    expect(state?.fireCount).toBe(0);
    expect(state?.timeSinceStart).toBe(0);
    expect(state?.isComplete).toBe(false);
    expect(state?.isActive).toBe(true);
  });

  it("removes triggers", () => {
    trigger.register("remove_me", { type: "event", params: { event: "bye" } });
    expect(trigger.getTriggerNames()).toContain("remove_me");
    trigger.remove("remove_me");
    expect(trigger.getTriggerNames()).not.toContain("remove_me");
  });

  it("evaluates condition triggers against subject metrics", () => {
    const conditionTraces: any[] = [];
    setResource(ctx, "conditionTraceBuffer", conditionTraces);

    trigger.register("score_gate", {
      type: "condition",
      params: {
        subject: "Player",
        condition: {
          type: "greaterThanOrEqual",
          params: { metric: "score", targetValue: 10 },
        },
        checkInterval: 0.5,
        once: true,
      },
    });

    trigger.update(0.5);
    expect(trigger.getState("score_gate")?.hasFired).toBe(false);

    metrics.set("Player", "score", 12);
    trigger.resetFiredFlags();
    trigger.update(0.5);
    expect(trigger.getState("score_gate")?.hasFired).toBe(true);
    expect(trigger.getState("score_gate")?.isComplete).toBe(true);
    expect(trigger.getState("score_gate")?.lastConditionTrace?.source?.system).toBe("trigger");
    expect(conditionTraces.length).toBeGreaterThanOrEqual(2);
  });

  it("serializes trigger runtime state", () => {
    trigger.register("serial", {
      type: "interval",
      params: { interval: 1, initialDelay: 0.5, maxCount: 10 },
    });
    trigger.update(2.5);

    const serialized = trigger.serializeState();
    expect(serialized.serial).toBeDefined();
    expect(serialized.serial.fireCount).toBeGreaterThan(0);
    expect(serialized.serial.timeSinceStart).toBeGreaterThan(0);
  });
});
