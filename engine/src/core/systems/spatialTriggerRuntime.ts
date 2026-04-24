import { hasComponent } from "bitecs";
import RAPIER from "@dimforge/rapier3d-compat";
import { ECSContext, getResource, setResource } from "../ecs";
import { Held } from "../components";
import { MotionSource } from "../components/MotionSource";
import { getSpawnTransform } from "../../modules/renderer";
import { getRuleModule } from "../../modules/rule";
import { getEntityFromBody } from "./motion";

function makeDirectedPairKey(source: number, target: number): bigint {
  return (BigInt(source) << 32n) | BigInt(target);
}

export type SpatialTriggerScope = "motionControl" | "collisionSystem";

export type RaycastTargetResult = {
  targetEid?: number;
  distance: number;
};

export class SpatialTriggerRuntime {
  private readonly collisionPairsByScope = new Map<SpatialTriggerScope, Set<bigint>>();
  private readonly rangePairsByScope = new Map<SpatialTriggerScope, Set<bigint>>();

  constructor(private readonly ctx: ECSContext) {}

  private getScopeSet(
    map: Map<SpatialTriggerScope, Set<bigint>>,
    scope: SpatialTriggerScope,
  ): Set<bigint> {
    let set = map.get(scope);
    if (!set) {
      set = new Set<bigint>();
      map.set(scope, set);
    }
    return set;
  }

  emitInteract(interactorEid: number, targetEid: number, distance: number, range: number): boolean {
    if (distance > range) return false;
    return getRuleModule(this.ctx).emitEngineTrigger("interact", {
      self: targetEid,
      other: interactorEid,
      user: interactorEid,
    }) > 0;
  }

  emitCollisionEnter(scope: SpatialTriggerScope, source: number, target: number): boolean {
    const pairKey = makeDirectedPairKey(source, target);
    const pairs = this.getScopeSet(this.collisionPairsByScope, scope);
    if (pairs.has(pairKey)) return false;
    pairs.add(pairKey);
    return getRuleModule(this.ctx).emitEngineTrigger("collisionEnter", { self: source, other: target }) > 0;
  }

  emitEntityInRange(scope: SpatialTriggerScope, source: number, target: number): boolean {
    const pairKey = makeDirectedPairKey(source, target);
    const pairs = this.getScopeSet(this.rangePairsByScope, scope);
    if (pairs.has(pairKey)) return false;
    pairs.add(pairKey);
    return getRuleModule(this.ctx).emitEngineTrigger("entityInRange", { self: source, other: target }) > 0;
  }

  resolveRaycastTarget(sourceEid: number, maxRange: number, excludeHeld = true): RaycastTargetResult {
    if (maxRange <= 0) return { targetEid: undefined, distance: Infinity };

    const t = getSpawnTransform(this.ctx, sourceEid);
    const ray = new RAPIER.Ray(t.position, t.zAxis.normalize());
    const sourceBody = hasComponent(this.ctx, MotionSource, sourceEid)
      ? this.ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[sourceEid])
      : undefined;

    const hit = this.ctx.rapier.world.castRay(
      ray,
      maxRange,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      sourceBody,
    );

    if (!hit?.collider) return { targetEid: undefined, distance: Infinity };

    const rb = hit.collider.parent();
    if (!rb) return { targetEid: undefined, distance: Infinity };

    const targetEid = getEntityFromBody(this.ctx, rb.handle);
    if (targetEid === undefined) return { targetEid: undefined, distance: Infinity };
    if (excludeHeld && hasComponent(this.ctx, Held, targetEid)) {
      return { targetEid: undefined, distance: Infinity };
    }

    const distance = (hit as any).timeOfImpact ?? (hit as any).toi ?? Infinity;
    return { targetEid, distance };
  }

  computeMaxActionRange(
    primaryActor: number,
    secondaryActor: number,
    includePrimary: boolean,
    includeSecondary: boolean,
    defaultRange = 7,
  ): number {
    const ruleModule = getRuleModule(this.ctx);
    let maxActionRange = 0;
    let hasExplicitActionRange = false;

    if (includePrimary) {
      const primaryRules = ruleModule.getEntityRulesByTrigger(primaryActor, "primaryAction");
      for (const ruleDef of primaryRules) {
        const triggerRange = (ruleDef.trigger as any)?.params?.range;
        if (typeof triggerRange === "number") {
          hasExplicitActionRange = true;
          if (triggerRange > maxActionRange) maxActionRange = triggerRange;
        }
      }
    }

    if (includeSecondary) {
      const secondaryRules = ruleModule.getEntityRulesByTrigger(secondaryActor, "secondaryAction");
      for (const ruleDef of secondaryRules) {
        const triggerRange = (ruleDef.trigger as any)?.params?.range;
        if (typeof triggerRange === "number") {
          hasExplicitActionRange = true;
          if (triggerRange > maxActionRange) maxActionRange = triggerRange;
        }
      }
    }

    return hasExplicitActionRange ? maxActionRange : defaultRange;
  }

  clearScope(scope: SpatialTriggerScope): void {
    this.getScopeSet(this.collisionPairsByScope, scope).clear();
    this.getScopeSet(this.rangePairsByScope, scope).clear();
  }
}

export function getSpatialTriggerRuntime(ctx: ECSContext): SpatialTriggerRuntime {
  const existing = getResource<SpatialTriggerRuntime>(ctx, "spatialTriggerRuntime", true);
  if (existing) return existing;
  const runtime = new SpatialTriggerRuntime(ctx);
  setResource(ctx, "spatialTriggerRuntime", runtime);
  return runtime;
}
