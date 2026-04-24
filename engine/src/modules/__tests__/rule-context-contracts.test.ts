import { describe, expect, it } from "vitest";
import { assertRuleEffectTargetAtRuntime, validateRuleTargetsForTrigger } from "../ruleContextContracts";

describe("rule context contracts", () => {
  it("rejects static trigger/target combinations that are never available", () => {
    const issues = validateRuleTargetsForTrigger(
      "die",
      [{ type: "heal", target: "user", params: { amount: 1 } } as any],
      "actions",
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      trigger: "die",
      target: "user",
      reason: "target_unavailable_for_trigger",
    });
  });

  it("rejects runtime target resolution when required optional context is missing", () => {
    const assertion = assertRuleEffectTargetAtRuntime(
      "event",
      { type: "heal", target: "other", params: { amount: 1 } } as any,
      { self: 1 },
    );

    expect(assertion.valid).toBe(false);
    if (!assertion.valid) {
      expect(assertion.reason).toBe("missing_context_value");
    }
  });

  it("accepts runtime target resolution when context is present", () => {
    const assertion = assertRuleEffectTargetAtRuntime(
      "interact",
      { type: "heal", target: "user", params: { amount: 1 } } as any,
      { self: 5, other: 9, user: 9 },
    );

    expect(assertion.valid).toBe(true);
  });
});
