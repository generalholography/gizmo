import { EffectTarget } from "../core/schema";

export type EffectTargetResolutionMode = "rule" | "action";
type EffectContextKey = "self" | "other" | "user";
type EffectActorKey = EffectContextKey | "userOrOther";
type TargetTableKey = EffectTarget | "default";

type EffectResolutionTableEntry = {
  target: EffectContextKey;
  actor: EffectActorKey;
};

type EffectResolutionTable = Record<
  EffectTargetResolutionMode,
  Record<TargetTableKey, EffectResolutionTableEntry>
>;

export type EffectResolutionContext = {
  self: number;
  other?: number;
  user?: number;
};

export type EffectTargetResolution =
  | {
      ok: true;
      resolvedTarget: EffectTarget;
      targetKey: EffectContextKey;
      actorKey: EffectActorKey;
      target: number;
      actor?: number;
    }
  | {
      ok: false;
      resolvedTarget: EffectTarget;
      targetKey: EffectContextKey;
      actorKey: EffectActorKey;
      reason: "missing_target_context";
      missing: "other" | "user";
      message: string;
    };

const EFFECT_TARGET_RESOLUTION_TABLE: EffectResolutionTable = {
  rule: {
    default: { target: "self", actor: "userOrOther" },
    self: { target: "self", actor: "userOrOther" },
    other: { target: "other", actor: "self" },
    user: { target: "user", actor: "self" },
  },
  action: {
    default: { target: "self", actor: "user" },
    self: { target: "self", actor: "user" },
    other: { target: "other", actor: "user" },
    user: { target: "user", actor: "self" },
  },
};

function normalizeTarget(target: EffectTarget | string | undefined): TargetTableKey {
  if (target === "self" || target === "other" || target === "user") return target;
  return "default";
}

function resolveFromContext(key: EffectActorKey, context: EffectResolutionContext): number | undefined {
  if (key === "self") return context.self;
  if (key === "other") return context.other;
  if (key === "user") return context.user;
  return context.user ?? context.other;
}

export function resolveEffectTarget(
  mode: EffectTargetResolutionMode,
  requestedTarget: EffectTarget | string | undefined,
  context: EffectResolutionContext,
): EffectTargetResolution {
  const normalizedTarget = normalizeTarget(requestedTarget);
  const entry = EFFECT_TARGET_RESOLUTION_TABLE[mode][normalizedTarget];
  const target = resolveFromContext(entry.target, context);
  const actor = resolveFromContext(entry.actor, context);

  if (typeof target !== "number") {
    const missingKey: "other" | "user" = entry.target === "other" ? "other" : "user";
    return {
      ok: false,
      resolvedTarget: normalizedTarget === "default" ? "self" : normalizedTarget,
      targetKey: entry.target,
      actorKey: entry.actor,
      reason: "missing_target_context",
      missing: missingKey,
      message: `Missing '${entry.target}' context for target '${normalizedTarget}'.`,
    };
  }

  return {
    ok: true,
    resolvedTarget: normalizedTarget === "default" ? "self" : normalizedTarget,
    targetKey: entry.target,
    actorKey: entry.actor,
    target,
    actor,
  };
}
