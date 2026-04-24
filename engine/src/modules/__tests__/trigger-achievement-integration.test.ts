import { describe, it, expect, beforeEach } from "vitest";
import { createECS, setResource } from "../../core/ecs";
import { Metrics } from "../../core/metrics";
import { checkAchievementsFor, AchievementsResource, UnlockedAchievements } from "../../core/achievements";
import { ReactiveMap, ReactiveSet } from "../../utils/reactiveTypes";
import { LazyMap } from "../../utils/lazyMap";
import { TriggerModule, triggerModule } from "../trigger";
import { ConditionDefinition } from "../condition";

describe("Trigger-Achievement Integration", () => {
  let ctx: any;
  let trigger: TriggerModule;
  let metrics: Metrics;
  let achievements: AchievementsResource;
  let unlocked: UnlockedAchievements;

  beforeEach(() => {
    ctx = createECS();
    metrics = new Metrics(ctx);
    achievements = new ReactiveMap<any>();
    unlocked = new LazyMap<any, ReactiveSet<string>>(() => new ReactiveSet<string>());

    setResource(ctx, "metrics", metrics);
    setResource(ctx, "achievements", achievements);
    setResource(ctx, "unlockedAchievements", unlocked);

    trigger = triggerModule(ctx);
  });

  it("reuses the same condition for achievement and trigger", () => {
    const firstKill: ConditionDefinition = {
      type: "greaterThanOrEqual",
      params: { metric: "enemies_defeated", targetValue: 1 },
    };

    achievements.set("First Kill", {
      description: "Defeat your first enemy",
      condition: firstKill,
    });

    trigger.register("first_kill_reward", {
      type: "condition",
      params: {
        subject: "Player",
        condition: firstKill,
        checkInterval: 0.25,
        once: true,
      },
    });

    trigger.update(0.25);
    expect(trigger.getState("first_kill_reward")?.hasFired).toBe(false);
    expect(unlocked.get("Player").has("First Kill")).toBe(false);

    metrics.set("Player", "enemies_defeated", 1);
    checkAchievementsFor(ctx, "Player");
    trigger.resetFiredFlags();
    trigger.update(0.25);

    expect(unlocked.get("Player").has("First Kill")).toBe(true);
    expect(trigger.getState("first_kill_reward")?.hasFired).toBe(true);
  });

  it("supports composite condition trees across both systems", () => {
    const composite: ConditionDefinition = {
      type: "all",
      params: {
        conditions: [
          { type: "greaterThanOrEqual", params: { metric: "level", targetValue: 10 } },
          { type: "greaterThanOrEqual", params: { metric: "experience", targetValue: 1000 } },
        ],
      },
    };

    achievements.set("Experienced Warrior", {
      description: "Reach level 10 with 1000 experience",
      condition: composite,
    });

    trigger.register("experienced_reward", {
      type: "condition",
      params: {
        subject: "Player",
        condition: composite,
        checkInterval: 0.5,
        once: true,
      },
    });

    metrics.set("Player", "level", 10);
    checkAchievementsFor(ctx, "Player");
    trigger.update(0.5);
    expect(unlocked.get("Player").has("Experienced Warrior")).toBe(false);
    expect(trigger.getState("experienced_reward")?.hasFired).toBe(false);

    metrics.set("Player", "experience", 1000);
    checkAchievementsFor(ctx, "Player");
    trigger.resetFiredFlags();
    trigger.update(0.5);

    expect(unlocked.get("Player").has("Experienced Warrior")).toBe(true);
    expect(trigger.getState("experienced_reward")?.hasFired).toBe(true);
  });

  it("supports per-subject condition triggers", () => {
    const threshold: ConditionDefinition = {
      type: "greaterThanOrEqual",
      params: { metric: "score", targetValue: 100 },
    };

    trigger.register("p1_threshold", {
      type: "condition",
      params: { subject: "Player1", condition: threshold, checkInterval: 1, once: true },
    });
    trigger.register("p2_threshold", {
      type: "condition",
      params: { subject: "Player2", condition: threshold, checkInterval: 1, once: true },
    });

    metrics.set("Player1", "score", 100);
    metrics.set("Player2", "score", 50);
    trigger.update(1);

    expect(trigger.getState("p1_threshold")?.hasFired).toBe(true);
    expect(trigger.getState("p2_threshold")?.hasFired).toBe(false);
  });

  it("supports named reusable condition references across achievements and triggers", () => {
    const conditionLibrary = ctx.modules.get("condition") as any;
    conditionLibrary.register("score_at_least", {
      type: "compare",
      params: {
        operator: "gte",
        left: { type: "metric", params: { metric: "score" } },
        right: { type: "parameter", params: { name: "minScore", defaultValue: 0 } },
      },
    });

    const levelGate: ConditionDefinition = {
      type: "reference",
      params: {
        name: "score_at_least",
        args: { minScore: { type: "literal", params: { value: 3 } } },
      },
    };

    achievements.set("Three Point Starter", {
      description: "Reach score 3",
      condition: levelGate,
    });

    trigger.register("three_point_trigger", {
      type: "condition",
      params: {
        subject: "Player",
        condition: levelGate,
        checkInterval: 1,
        once: true,
      },
    });

    metrics.set("Player", "score", 3);
    checkAchievementsFor(ctx, "Player");
    trigger.update(1);

    expect(unlocked.get("Player").has("Three Point Starter")).toBe(true);
    expect(trigger.getState("three_point_trigger")?.hasFired).toBe(true);
  });
});
