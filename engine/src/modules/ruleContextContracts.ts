import { Effect, EffectTarget } from "../core/schema";

export const RULE_TRIGGER_TYPE_OPTIONS = [
  "immediate",
  "event",
  "interact",
  "collisionEnter",
  "entityInRange",
  "timeElapsed",
  "die",
  "primaryAction",
  "secondaryAction",
  "time",
  "interval",
  "proximity",
] as const;

export type RuleTriggerType = typeof RULE_TRIGGER_TYPE_OPTIONS[number];
export type RuleContextValueName = "self" | "other" | "user";
export type RuleContextAvailability = "guaranteed" | "optional" | "unavailable";

export type TriggerContextContract = {
  trigger: RuleTriggerType;
  description: string;
  context: Record<RuleContextValueName, RuleContextAvailability>;
};

export type RuleTargetValidationIssue = {
  trigger: RuleTriggerType;
  target: EffectTarget;
  path: string;
  reason: "target_unavailable_for_trigger";
  message: string;
};

export type RuntimeRuleContext = {
  self: number;
  other?: number;
  user?: number;
};

export type RuntimeTargetAssertion =
  | { valid: true; target: EffectTarget; contextKey: RuleContextValueName }
  | {
      valid: false;
      target: EffectTarget;
      contextKey: RuleContextValueName;
      reason: "target_unavailable_for_trigger" | "missing_context_value";
      message: string;
    };

export const RULE_TRIGGER_CONTEXT_CONTRACTS: Record<RuleTriggerType, TriggerContextContract> = {
  immediate: {
    trigger: "immediate",
    description: "Runs once at rule registration for the owning entity.",
    context: { self: "guaranteed", other: "unavailable", user: "unavailable" },
  },
  event: {
    trigger: "event",
    description: "Runs on global event dispatch. `other`/`user` are payload-dependent.",
    context: { self: "guaranteed", other: "optional", user: "optional" },
  },
  interact: {
    trigger: "interact",
    description: "Entity interaction. `other` and `user` are the interactor.",
    context: { self: "guaranteed", other: "guaranteed", user: "guaranteed" },
  },
  collisionEnter: {
    trigger: "collisionEnter",
    description: "Physical collision contact pair.",
    context: { self: "guaranteed", other: "guaranteed", user: "unavailable" },
  },
  entityInRange: {
    trigger: "entityInRange",
    description: "Sensor/proximity overlap pair.",
    context: { self: "guaranteed", other: "guaranteed", user: "unavailable" },
  },
  timeElapsed: {
    trigger: "timeElapsed",
    description: "Elapsed-time trigger (legacy alias of delayed time trigger).",
    context: { self: "guaranteed", other: "unavailable", user: "unavailable" },
  },
  die: {
    trigger: "die",
    description: "Death event for the entity. `other` is the killer/source.",
    context: { self: "guaranteed", other: "guaranteed", user: "unavailable" },
  },
  primaryAction: {
    trigger: "primaryAction",
    description: "Primary action from an acting entity/item; `user` is the controlling actor.",
    context: { self: "guaranteed", other: "guaranteed", user: "guaranteed" },
  },
  secondaryAction: {
    trigger: "secondaryAction",
    description: "Secondary action from an acting entity/item; `user` is the controlling actor.",
    context: { self: "guaranteed", other: "guaranteed", user: "guaranteed" },
  },
  time: {
    trigger: "time",
    description: "Delayed timer firing.",
    context: { self: "guaranteed", other: "unavailable", user: "unavailable" },
  },
  interval: {
    trigger: "interval",
    description: "Periodic timer firing.",
    context: { self: "guaranteed", other: "unavailable", user: "unavailable" },
  },
  proximity: {
    trigger: "proximity",
    description: "Spatial proximity rule trigger.",
    context: { self: "guaranteed", other: "unavailable", user: "unavailable" },
  },
};

function normalizeTarget(target: EffectTarget | string | undefined): EffectTarget {
  if (target === "other" || target === "user" || target === "self") return target;
  return "self";
}

export function getTargetContextKey(target: EffectTarget | string | undefined): RuleContextValueName {
  const normalized = normalizeTarget(target);
  if (normalized === "other") return "other";
  if (normalized === "user") return "user";
  return "self";
}

function getContextAvailability(
  triggerType: RuleTriggerType,
  target: EffectTarget | string | undefined,
): RuleContextAvailability {
  const contract = RULE_TRIGGER_CONTEXT_CONTRACTS[triggerType];
  const key = getTargetContextKey(target);
  return contract.context[key];
}

function collectUnavailableTargetIssues(
  triggerType: RuleTriggerType,
  effects: Effect[] | undefined,
  pathPrefix: string,
  issues: RuleTargetValidationIssue[],
): void {
  if (!effects?.length) return;
  for (let i = 0; i < effects.length; i++) {
    const effect = effects[i];
    const target = normalizeTarget(effect?.target as EffectTarget | undefined);
    const availability = getContextAvailability(triggerType, target);
    const path = `${pathPrefix}[${i}]`;
    if (availability === "unavailable") {
      issues.push({
        trigger: triggerType,
        target,
        path,
        reason: "target_unavailable_for_trigger",
        message: `Rule trigger '${triggerType}' cannot resolve target '${target}' at ${path}.`,
      });
    }
    collectUnavailableTargetIssues(triggerType, effect?.onSuccess, `${path}.onSuccess`, issues);
    collectUnavailableTargetIssues(triggerType, effect?.onFailure, `${path}.onFailure`, issues);
  }
}

export function validateRuleTargetsForTrigger(
  triggerType: RuleTriggerType,
  effects: Effect[] | undefined,
  pathPrefix: string,
): RuleTargetValidationIssue[] {
  const issues: RuleTargetValidationIssue[] = [];
  collectUnavailableTargetIssues(triggerType, effects, pathPrefix, issues);
  return issues;
}

export function assertRuleEffectTargetAtRuntime(
  triggerType: RuleTriggerType,
  effect: Effect,
  context: RuntimeRuleContext,
): RuntimeTargetAssertion {
  const target = normalizeTarget(effect.target);
  const contextKey = getTargetContextKey(target);
  const availability = getContextAvailability(triggerType, target);

  if (availability === "unavailable") {
    return {
      valid: false,
      target,
      contextKey,
      reason: "target_unavailable_for_trigger",
      message: `Trigger '${triggerType}' does not support target '${target}'.`,
    };
  }

  if (contextKey !== "self" && typeof context[contextKey] !== "number") {
    return {
      valid: false,
      target,
      contextKey,
      reason: "missing_context_value",
      message: `Trigger '${triggerType}' expected context '${contextKey}' for target '${target}', but it was missing.`,
    };
  }

  return { valid: true, target, contextKey };
}
