import { Effect } from "../schema";
import { RuleDefinition, RuleTrigger } from "../../modules/rule";
import { buildActionSequenceFromEffects } from "../../modules/action";

export const LEGACY_EFFECT_COMPONENT_KEYS = [
  "OnInteract",
  "OnCollisionEnter",
  "OnEntityInRange",
  "OnPrimaryAction",
  "OnSecondaryAction",
  "OnTimeElapsed",
  "OnDie",
] as const;

export type LegacyEffectComponentKey = typeof LEGACY_EFFECT_COMPONENT_KEYS[number];

type LegacyEffectComponentPayload = {
  effects?: Effect[];
  coolDown?: number;
  coolDownRemaining?: number;
  repeat?: boolean | number;
  time?: number;
  duration?: number;
};

const LEGACY_KEY_TO_TRIGGER: Record<LegacyEffectComponentKey, RuleTrigger["type"]> = {
  OnInteract: "interact",
  OnCollisionEnter: "collisionEnter",
  OnEntityInRange: "entityInRange",
  OnPrimaryAction: "primaryAction",
  OnSecondaryAction: "secondaryAction",
  OnTimeElapsed: "time",
  OnDie: "die",
};

function getMaxEffectRange(effects: Effect[]): number | undefined {
  let maxRange = -1;
  for (const effect of effects) {
    const candidate = (effect as any)?.range;
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > maxRange) {
      maxRange = candidate;
    }
  }
  return maxRange >= 0 ? maxRange : undefined;
}

export function convertLegacyEffectComponentToRule(
  key: LegacyEffectComponentKey,
  payload: LegacyEffectComponentPayload | undefined,
): RuleDefinition {
  const effects = Array.isArray(payload?.effects) ? payload!.effects : [];
  const triggerType = LEGACY_KEY_TO_TRIGGER[key];
  const maxRange = getMaxEffectRange(effects);

  let trigger: RuleTrigger;
  if (triggerType === "time") {
    const delayCandidate = payload?.time ?? payload?.duration ?? 0;
    const delay = typeof delayCandidate === "number" && Number.isFinite(delayCandidate) ? Math.max(0, delayCandidate) : 0;
    trigger = {
      type: "time",
      params: {
        delay,
        repeat: payload?.repeat === true || payload?.repeat === 1,
      },
    };
  } else if (triggerType === "primaryAction" || triggerType === "secondaryAction" || triggerType === "entityInRange") {
    trigger = maxRange !== undefined
      ? { type: triggerType, params: { range: maxRange } }
      : { type: triggerType };
  } else {
    trigger = { type: triggerType } as RuleTrigger;
  }

  const rule: RuleDefinition = {
    trigger,
    actions: buildActionSequenceFromEffects(effects),
  };

  if (typeof payload?.coolDown === "number" && Number.isFinite(payload.coolDown) && payload.coolDown > 0) {
    rule.cooldown = payload.coolDown;
  }

  if (
    typeof payload?.coolDownRemaining === "number" &&
    Number.isFinite(payload.coolDownRemaining) &&
    payload.coolDownRemaining > 0
  ) {
    rule.__cooldownRemaining = payload.coolDownRemaining;
  }

  return rule;
}

export type LegacyMigrationResult<T> = {
  value: T;
  migratedBundleCount: number;
  migratedRuleCount: number;
  removedLegacyKeys: LegacyEffectComponentKey[];
};

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrateBundle(bundle: Record<string, any>): {
  nextBundle: Record<string, any>;
  migratedRuleCount: number;
  removedLegacyKeys: LegacyEffectComponentKey[];
} {
  const nextBundle: Record<string, any> = { ...bundle };
  const existingRules = Array.isArray(nextBundle.Rules) ? [...nextBundle.Rules] : [];
  let migratedRuleCount = 0;
  const removedLegacyKeys: LegacyEffectComponentKey[] = [];

  for (const key of LEGACY_EFFECT_COMPONENT_KEYS) {
    if (!(key in nextBundle)) continue;
    const payload = nextBundle[key] as LegacyEffectComponentPayload | undefined;
    const rule = convertLegacyEffectComponentToRule(key, payload);
    existingRules.push(rule);
    delete nextBundle[key];
    removedLegacyKeys.push(key);
    migratedRuleCount++;
  }

  if (migratedRuleCount > 0) {
    nextBundle.Rules = existingRules;
  }

  return { nextBundle, migratedRuleCount, removedLegacyKeys };
}

export function migrateLegacyOnComponentsDeep<T>(input: T): LegacyMigrationResult<T> {
  let migratedBundleCount = 0;
  let migratedRuleCount = 0;
  const removedLegacyKeys: LegacyEffectComponentKey[] = [];

  const visit = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map((entry) => visit(entry));
    }
    if (!isPlainObject(value)) return value;

    const transformed: Record<string, any> = {};
    for (const [key, entry] of Object.entries(value)) {
      transformed[key] = visit(entry);
    }

    const hasLegacyKeys = LEGACY_EFFECT_COMPONENT_KEYS.some((key) => key in transformed);
    if (!hasLegacyKeys) return transformed;

    const migrated = migrateBundle(transformed);
    if (migrated.migratedRuleCount > 0) {
      migratedBundleCount++;
      migratedRuleCount += migrated.migratedRuleCount;
      removedLegacyKeys.push(...migrated.removedLegacyKeys);
    }
    return migrated.nextBundle;
  };

  return {
    value: visit(input),
    migratedBundleCount,
    migratedRuleCount,
    removedLegacyKeys,
  };
}
