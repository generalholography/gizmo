import { describe, expect, it, vi } from "vitest";
import * as effectModule from "../effect";
import { createECS } from "../../core/ecs";
import { setResource } from "../../core/ecs";
import { getRuleModule, RuleDefinition } from "../rule";
import { Metrics } from "../../core/metrics";

describe("rule module trigger semantics", () => {
  it("indexes dedicated engine triggers separately from global custom events", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);

    rule.registerEntityRule("r_interact", 1, { trigger: { type: "interact" }, actions: [] } as RuleDefinition);
    rule.registerEntityRule("r_global", 2, { trigger: { type: "event", params: { event: "custom_evt" } }, actions: [] } as RuleDefinition);

    expect((rule as any).engineTriggerIndex.get("interact").has("r_interact")).toBe(true);
    expect((rule as any).globalEventIndex.get("custom_evt").has("r_global")).toBe(true);
  });

  it("queues and drains global events during update", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    rule.registerEntityRule("r_global", 2, { trigger: { type: "event", params: { event: "custom_evt" } }, actions: [] } as RuleDefinition);

    rule.emitGlobalEvent("custom_evt", { other: 99 });
    expect((rule as any).globalEventQueue.length).toBe(1);

    setResource(ctx, "deltaTime", 1 / 60);
    rule.update(1 / 60);
    expect((rule as any).globalEventQueue.length).toBe(0);
  });

  it("replaceEntityRules clears old registrations", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);

    rule.registerEntityRule("r_a", 1, { trigger: { type: "interact" }, actions: [] } as RuleDefinition);
    rule.replaceEntityRules(1, [{ trigger: { type: "die" }, actions: [] } as RuleDefinition]);

    expect((rule as any).engineTriggerIndex.get("interact").has("r_a")).toBe(false);
    expect((rule as any).engineTriggerIndex.get("die").size).toBe(1);
  });

  it("reports per-entity engine trigger presence for UI/runtime checks", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);

    rule.registerEntityRule("r_interact", 10, { trigger: { type: "interact" }, actions: [] } as RuleDefinition);
    rule.registerEntityRule("r_die", 10, { trigger: { type: "die" }, actions: [] } as RuleDefinition);

    expect(rule.hasEngineTriggerForEntity(10, "interact")).toBe(true);
    expect(rule.hasEngineTriggerForEntity(10, "die")).toBe(true);
    expect(rule.hasEngineTriggerForEntity(10, "entityInRange")).toBe(false);
    expect(rule.hasEngineTriggerForEntity(11, "interact")).toBe(false);
  });

  it("event-triggered rules execute every configured action operation (including spawn effects)", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);

    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("r_listener", 7, {
      trigger: { type: "event", params: { event: "lab_global_ping" } },
      actions: [
        { type: "emitParticles", target: "self", params: { emitter: { burst: 1 } } } as any,
        { type: "spawnEntityFrom", target: "self", params: { entity: "lab_orb", velocity: 1 } } as any,
      ],
    } as RuleDefinition);

    rule.emitGlobalEvent("lab_global_ping", { payload: { source: "test" } });
    rule.update(1 / 60);

    expect(applyEffectSpy).toHaveBeenCalledTimes(2);
    expect(applyEffectSpy).toHaveBeenNthCalledWith(1, ctx, expect.objectContaining({ type: "emitParticles" }), 7, undefined, undefined, undefined);
    expect(applyEffectSpy).toHaveBeenNthCalledWith(2, ctx, expect.objectContaining({ type: "spawnEntityFrom" }), 7, undefined, undefined, undefined);

    applyEffectSpy.mockRestore();
  });

  it("skips effects that use unavailable trigger context targets and records trace reasons", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);
    const traces: any[] = [];

    setResource(ctx, "ruleTraceEnabled", true);
    setResource(ctx, "ruleTraceBuffer", traces);

    rule.registerEntityRule("r_collision_invalid_target", 5, {
      trigger: { type: "collisionEnter" },
      actions: [{ type: "damage", target: "user", params: { amount: 1 } } as any],
    } as RuleDefinition);

    const fired = rule.emitEngineTrigger("collisionEnter", { self: 5, other: 9 });

    expect(fired).toBe(0);
    expect(applyEffectSpy).not.toHaveBeenCalled();
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({
      trigger: "collisionEnter",
      fired: false,
      reason: "actions_skipped",
      effects: [
        expect.objectContaining({
          reason: "target_unavailable_for_trigger",
        }),
      ],
    });

    applyEffectSpy.mockRestore();
  });

  it("requires runtime user context when a primaryAction effect targets user", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);
    const traces: any[] = [];

    setResource(ctx, "ruleTraceEnabled", true);
    setResource(ctx, "ruleTraceBuffer", traces);

    rule.registerEntityRule("r_primary_user_target", 7, {
      trigger: { type: "primaryAction" },
      actions: [{ type: "heal", target: "user", params: { amount: 2 } } as any],
    } as RuleDefinition);

    const firedWithoutUser = rule.emitEngineTrigger("primaryAction", { self: 7, other: 11 });
    expect(firedWithoutUser).toBe(0);
    expect(traces[0].effects[0].reason).toBe("missing_context_value");

    const firedWithUser = rule.emitEngineTrigger("primaryAction", { self: 7, other: 11, user: 12 });
    expect(firedWithUser).toBe(1);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);

    applyEffectSpy.mockRestore();
  });

  it("executes engine-trigger rules in deterministic priority order with stable registration tie-breaks", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("r_high_b", 42, {
      trigger: { type: "interact" },
      priority: 10,
      actions: [{ type: "emitEvent", target: "self", params: { name: "high_b" } } as any],
    } as RuleDefinition);
    rule.registerEntityRule("r_low", 42, {
      trigger: { type: "interact" },
      priority: 0,
      actions: [{ type: "emitEvent", target: "self", params: { name: "low" } } as any],
    } as RuleDefinition);
    rule.registerEntityRule("r_high_a", 42, {
      trigger: { type: "interact" },
      priority: 10,
      actions: [{ type: "emitEvent", target: "self", params: { name: "high_a" } } as any],
    } as RuleDefinition);

    rule.emitEngineTrigger("interact", { self: 42, other: 5, user: 5 });

    const orderedNames = applyEffectSpy.mock.calls.map((call) => call[1]?.params?.name);
    expect(orderedNames).toEqual(["high_b", "high_a", "low"]);

    applyEffectSpy.mockRestore();
  });

  it("executes global-event rules in deterministic priority order", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("evt_low", 1, {
      trigger: { type: "event", params: { event: "ordered_evt" } },
      priority: 1,
      actions: [{ type: "emitEvent", target: "self", params: { name: "evt_low" } } as any],
    } as RuleDefinition);
    rule.registerEntityRule("evt_high", 2, {
      trigger: { type: "event", params: { event: "ordered_evt" } },
      priority: 5,
      actions: [{ type: "emitEvent", target: "self", params: { name: "evt_high" } } as any],
    } as RuleDefinition);

    rule.emitGlobalEvent("ordered_evt", {});
    rule.update(1 / 60);

    const orderedNames = applyEffectSpy.mock.calls.map((call) => call[1]?.params?.name);
    expect(orderedNames).toEqual(["evt_high", "evt_low"]);

    applyEffectSpy.mockRestore();
  });

  it("executes update-driven time rules in deterministic priority order", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("time_low", 10, {
      trigger: { type: "time", params: { delay: 1 } },
      priority: -2,
      actions: [{ type: "emitEvent", target: "self", params: { name: "time_low" } } as any],
    } as RuleDefinition);
    rule.registerEntityRule("time_high", 11, {
      trigger: { type: "time", params: { delay: 1 } },
      priority: 20,
      actions: [{ type: "emitEvent", target: "self", params: { name: "time_high" } } as any],
    } as RuleDefinition);

    rule.update(1);

    const orderedNames = applyEffectSpy.mock.calls.map((call) => call[1]?.params?.name);
    expect(orderedNames).toEqual(["time_high", "time_low"]);

    applyEffectSpy.mockRestore();
  });

  it("supports timeElapsed trigger as a delayed timer alias", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("time_elapsed_alias", 12, {
      trigger: { type: "timeElapsed", params: { delay: 0.5 } },
      actions: [{ type: "emitEvent", target: "self", params: { name: "time_elapsed_fired" } } as any],
    } as RuleDefinition);

    rule.update(0.25);
    expect(applyEffectSpy).toHaveBeenCalledTimes(0);

    rule.update(0.25);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);
    expect(applyEffectSpy.mock.calls[0][1]?.params?.name).toBe("time_elapsed_fired");

    applyEffectSpy.mockRestore();
  });

  it("evaluates composable conditions before running actions", () => {
    const ctx: any = createECS();
    setResource(ctx, "metrics", new Metrics(ctx));
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);
    const metrics = ctx.resources.get("metrics")?.resource as any;

    rule.registerEntityRule("r_conditional_interact", 33, {
      trigger: { type: "interact" },
      condition: {
        type: "all",
        params: {
          conditions: [
            {
              type: "compare",
              params: {
                operator: "gte",
                left: { type: "metric", params: { metric: "score", subject: "Player" } },
                right: { type: "literal", params: { value: 5 } },
              },
            },
            {
              type: "compare",
              params: {
                operator: "eq",
                left: { type: "metric", params: { metric: "rank", subject: "Player" } },
                right: { type: "literal", params: { value: 2 } },
              },
            },
          ],
        },
      },
      actions: [{ type: "emitEvent", target: "self", params: { name: "condition_passed" } } as any],
    } as RuleDefinition);

    metrics.set("Player", "score", 5);
    metrics.set("Player", "rank", 1);
    const firstAttempt = rule.emitEngineTrigger("interact", { self: 33, other: 1, user: 1 });
    expect(firstAttempt).toBe(0);
    expect(applyEffectSpy).toHaveBeenCalledTimes(0);

    metrics.set("Player", "rank", 2);
    const secondAttempt = rule.emitEngineTrigger("interact", { self: 33, other: 1, user: 1 });
    expect(secondAttempt).toBe(1);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);

    applyEffectSpy.mockRestore();
  });

  it("supports canonical interval trigger + top-level condition in update loop", () => {
    const ctx: any = createECS();
    setResource(ctx, "metrics", new Metrics(ctx));
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);
    const metrics = ctx.resources.get("metrics")?.resource as any;

    rule.registerEntityRule("r_condition_trigger", 44, {
      trigger: {
        type: "interval",
        params: {
          interval: 0.5,
          maxCount: 1,
        },
      },
      condition: {
        type: "compare",
        params: {
          operator: "gte",
          left: { type: "metric", params: { metric: "coins", subject: "Player" } },
          right: { type: "literal", params: { value: 10 } },
        },
      },
      actions: [{ type: "emitEvent", target: "self", params: { name: "coins_ready" } } as any],
    } as RuleDefinition);

    metrics.set("Player", "coins", 10);
    rule.update(0.5);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);

    // maxCount=1 should prevent additional firings.
    rule.update(0.5);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);

    applyEffectSpy.mockRestore();
  });

  it("records canonical condition traces for rule condition evaluation", () => {
    const ctx: any = createECS();
    setResource(ctx, "metrics", new Metrics(ctx));
    setResource(ctx, "ruleTraceEnabled", true);
    const ruleTraces: any[] = [];
    const conditionTraces: any[] = [];
    setResource(ctx, "ruleTraceBuffer", ruleTraces);
    setResource(ctx, "conditionTraceBuffer", conditionTraces);

    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);
    const metrics = ctx.resources.get("metrics")?.resource as any;

    rule.registerEntityRule("r_trace_condition", 101, {
      trigger: { type: "interact" },
      condition: {
        type: "compare",
        params: {
          operator: "gte",
          left: { type: "metric", params: { metric: "energy", subject: "Player" } },
          right: { type: "literal", params: { value: 5 } },
        },
      },
      actions: [{ type: "emitEvent", target: "self", params: { name: "ready" } } as any],
    } as RuleDefinition);

    metrics.set("Player", "energy", 6);
    const fired = rule.emitEngineTrigger("interact", { self: 101, other: 1, user: 1 });

    expect(fired).toBe(1);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);
    expect(ruleTraces).toHaveLength(1);
    expect(ruleTraces[0].conditionPassed).toBe(true);
    expect(ruleTraces[0].conditionTrace?.type).toBe("compare");
    expect(conditionTraces).toHaveLength(1);
    expect(conditionTraces[0].source?.system).toBe("rule");
    expect(conditionTraces[0].source?.name).toBe("r_trace_condition");

    applyEffectSpy.mockRestore();
  });

  it("executes explicit action sequence control flow and halts on first failed child by default", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);
    const traces: any[] = [];
    setResource(ctx, "ruleTraceEnabled", true);
    setResource(ctx, "ruleTraceBuffer", traces);

    rule.registerEntityRule("r_sequence_halt", 14, {
      trigger: { type: "collisionEnter" },
      actions: {
        type: "sequence",
        params: {
          actions: [
            {
              type: "heal",
              target: "user",
              params: { amount: 1 },
            },
            {
              type: "emitEvent",
              target: "self",
              params: { name: "should_not_run" },
            },
          ],
        },
      },
    } as RuleDefinition);

    const fired = rule.emitEngineTrigger("collisionEnter", { self: 14, other: 22 });

    expect(fired).toBe(0);
    expect(applyEffectSpy).not.toHaveBeenCalled();
    expect(traces).toHaveLength(1);
    expect(traces[0].actionTrace?.type).toBe("sequence");
    expect(traces[0].actionTrace?.reason).toBe("sequence_halted");
    expect(traces[0].operations).toHaveLength(1);
    expect(traces[0].operations[0].reason).toBe("target_unavailable_for_trigger");

    applyEffectSpy.mockRestore();
  });

  it("supports firstSuccess action control flow for first-success fallback behavior", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("r_selector", 18, {
      trigger: { type: "interact" },
      actions: {
        type: "firstSuccess",
        params: {
          actions: [
            {
              type: "heal",
              target: "user",
              params: { amount: 1 },
            },
            {
              type: "emitEvent",
              target: "self",
              params: { name: "selector_fallback" },
            },
          ],
        },
      },
    } as RuleDefinition);

    const fired = rule.emitEngineTrigger("interact", { self: 18, other: 99 });
    expect(fired).toBe(1);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);
    expect(applyEffectSpy.mock.calls[0][1]?.params?.name).toBe("selector_fallback");

    applyEffectSpy.mockRestore();
  });

  it("supports conditional action nodes with explicit else branch", () => {
    const ctx: any = createECS();
    setResource(ctx, "metrics", new Metrics(ctx));
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect").mockReturnValue(true);

    rule.registerEntityRule("r_if_else", 21, {
      trigger: { type: "interact" },
      actions: {
        type: "if",
        params: {
          condition: {
            type: "compare",
            params: {
              operator: "gte",
              left: { type: "metric", params: { metric: "xp", subject: "Player" } },
              right: { type: "literal", params: { value: 10 } },
            },
          },
          then: {
            type: "emitEvent",
            target: "self",
            params: { name: "if_then" },
          },
          else: {
            type: "emitEvent",
            target: "self",
            params: { name: "if_else" },
          },
        },
      },
    } as RuleDefinition);

    const fired = rule.emitEngineTrigger("interact", { self: 21, other: 5, user: 5 });
    expect(fired).toBe(1);
    expect(applyEffectSpy).toHaveBeenCalledTimes(1);
    expect(applyEffectSpy.mock.calls[0][1]?.params?.name).toBe("if_else");

    applyEffectSpy.mockRestore();
  });

  it("supports parallel action control flow with successPolicy any", () => {
    const ctx: any = createECS();
    const rule = getRuleModule(ctx);
    const applyEffectSpy = vi.spyOn(effectModule, "applyEffect")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const traces: any[] = [];
    setResource(ctx, "ruleTraceEnabled", true);
    setResource(ctx, "ruleTraceBuffer", traces);

    rule.registerEntityRule("r_parallel_any", 22, {
      trigger: { type: "interact" },
      actions: {
        type: "parallel",
        params: {
          successPolicy: "any",
          actions: [
            {
              type: "emitEvent",
              target: "self",
              params: { name: "parallel_fail" },
            },
            {
              type: "emitEvent",
              target: "self",
              params: { name: "parallel_success" },
            },
          ],
        },
      },
    } as RuleDefinition);

    const fired = rule.emitEngineTrigger("interact", { self: 22, other: 1, user: 1 });
    expect(fired).toBe(1);
    expect(applyEffectSpy).toHaveBeenCalledTimes(2);
    expect(traces).toHaveLength(1);
    expect(traces[0].actionTrace?.type).toBe("parallel");
    expect(traces[0].reason).toBe("action_applied");

    applyEffectSpy.mockRestore();
  });

});
