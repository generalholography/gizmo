import { describe, expect, it } from "vitest";
import { migrateLegacyOnComponentsDeep } from "../migrations/legacyOnMigration";

describe("legacy On* migration utility", () => {
  it("converts legacy gameplay components into Rules entries", () => {
    const input = {
      Info: { name: "Legacy Sword" },
      OnPrimaryAction: {
        effects: [
          { type: "spawnEntityFrom", target: "self", params: { entity: "arrow" }, range: 10 },
          { type: "emitEvent", target: "self", params: { name: "fired" }, range: 12 },
        ],
        coolDown: 0.5,
        coolDownRemaining: 0.2,
      },
      OnInteract: {
        effects: [{ type: "discover", target: "self", params: {} }],
      },
    };

    const migrated = migrateLegacyOnComponentsDeep(input);
    const value = migrated.value as any;

    expect(migrated.migratedBundleCount).toBe(1);
    expect(migrated.migratedRuleCount).toBe(2);
    expect(value.OnPrimaryAction).toBeUndefined();
    expect(value.OnInteract).toBeUndefined();
    expect(Array.isArray(value.Rules)).toBe(true);
    expect(value.Rules).toHaveLength(2);
    const primaryRule = value.Rules.find((rule: any) => rule?.trigger?.type === "primaryAction");
    const interactRule = value.Rules.find((rule: any) => rule?.trigger?.type === "interact");

    expect(primaryRule).toMatchObject({
      trigger: { type: "primaryAction", params: { range: 12 } },
      cooldown: 0.5,
      __cooldownRemaining: 0.2,
    });
    expect(interactRule).toMatchObject({
      trigger: { type: "interact" },
    });
  });

  it("maps OnTimeElapsed to time trigger params", () => {
    const migrated = migrateLegacyOnComponentsDeep({
      OnTimeElapsed: {
        effects: [{ type: "kill", target: "self", params: {} }],
        time: 4,
        repeat: 1,
      },
    });
    const value = migrated.value as any;
    expect(value.Rules[0]).toMatchObject({
      trigger: { type: "time", params: { delay: 4, repeat: true } },
    });
  });

  it("preserves existing Rules and appends migrated ones", () => {
    const migrated = migrateLegacyOnComponentsDeep({
      Rules: [{ trigger: { type: "event", params: { event: "x" } }, actions: [] }],
      OnDie: { effects: [{ type: "emitEvent", target: "self", params: { name: "died" } }] },
    });
    const value = migrated.value as any;
    expect(value.Rules).toHaveLength(2);
    expect(value.Rules[0].trigger.type).toBe("event");
    expect(value.Rules[1].trigger.type).toBe("die");
  });
});
