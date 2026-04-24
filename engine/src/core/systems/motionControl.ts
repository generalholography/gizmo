import { defineQuery, hasComponent } from "bitecs";
import { Held, MountedBy } from "../components";
import { MotionSource } from "../components/MotionSource";
import { ECSContext, getModule } from "../ecs";
import { motionSourceModule } from "../../modules/motionSource";
import { getEntityFromBody } from "./motion";
import { getRuleModule } from "../../modules/rule";
import { parseInputState } from "../components/_InputState";
import { dismount } from "../components/MountedBy";
import { triggerUseAnimation } from "./animation";
import { getStore, InventoryStore, Store } from "../../modules/entityStore";
import { getSpatialTriggerRuntime } from "./spatialTriggerRuntime";

const motionControlQ = defineQuery([MotionSource]);

export function handleInteractAtTarget(
  ctx: ECSContext,
  interactorEid: number,
  interactTarget: number,
  interactDistance: number,
  interactRange: number
): void {
  const spatial = getSpatialTriggerRuntime(ctx);
  const ruleFired = spatial.emitInteract(interactorEid, interactTarget, interactDistance, interactRange);
  if (ruleFired) {
    triggerUseAnimation(ctx, interactorEid);
  }
}

export function handleCollisionTriggerAtTarget(
  ctx: ECSContext,
  source: number,
  target: number,
): void {
  const spatial = getSpatialTriggerRuntime(ctx);
  spatial.emitCollisionEnter("motionControl", source, target);
}

export const motionControlSystem = (ctx: ECSContext): void => {
  const eids = motionControlQ(ctx);
  const spatial = getSpatialTriggerRuntime(ctx);
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i];
    const motionSourceDef = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource').get(MotionSource.motionSourceId[eid]);
    const held = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');

    const input = parseInputState(ctx, eid);

    if (motionSourceDef.apply) {
      if (hasComponent(ctx, MountedBy, eid) && input.interact > 1) {
        dismount(ctx, eid);
        continue;
      }
      motionSourceDef.apply(eid, input);
    }

    const controller = motionSourceDef.controller;

    if (controller && controller.type === "character") {
      const cc = controller.controller;

      if (cc) {
        for (let c = 0; c < cc.numComputedCollisions(); c++) {
          const coll = cc.computedCollision(c);
          if (!coll || !coll.collider) continue;
          const rb2 = coll.collider.parent();
          if (!rb2) continue;
          const targetEid = getEntityFromBody(ctx, rb2.handle);
          if (targetEid === undefined) continue;

          handleCollisionTriggerAtTarget(ctx, eid, targetEid);
          handleCollisionTriggerAtTarget(ctx, targetEid, eid);
        }
      }
    }

    const heldEntry = held.get(eid);
    // Use held item for actions only if it exists AND selectedItemIndex is not -1
    const inventories = getStore<InventoryStore>(ctx, "inventory");
    const inv = inventories.get(eid);
    const hasValidHeldItem = heldEntry && inv && inv.selected >= 0;

    const ruleModule = getRuleModule(ctx);

    const primaryActor =
      hasValidHeldItem && ruleModule.hasEngineTriggerForEntity(heldEntry.eid, 'primaryAction')
        ? heldEntry.eid
        : eid;
    const secondaryActor =
      hasValidHeldItem && ruleModule.hasEngineTriggerForEntity(heldEntry.eid, 'secondaryAction')
        ? heldEntry.eid
        : eid;

    // Handle OnInteract separately with its own raycast
    if (input.interact > 0) {
      const interactRange = 7;
      const hit = spatial.resolveRaycastTarget(eid, interactRange, true);
      const interactTarget = hit.targetEid;
      const interactDistance = hit.distance;

      if (interactTarget !== undefined) {
        handleInteractAtTarget(ctx, eid, interactTarget, interactDistance, interactRange);
      }
    }

    // Handle OnPrimary/SecondaryAction with separate raycast logic
    let actionTarget: number | undefined = undefined;

    if (input.primary > 0 || input.secondary > 0) {
      const maxActionRange = spatial.computeMaxActionRange(
        primaryActor,
        secondaryActor,
        input.primary > 0,
        input.secondary > 0,
        7,
      );

      // Explicit range of 0 means self-use action (no look target required).
      if (maxActionRange > 0) {
        actionTarget = spatial.resolveRaycastTarget(eid, maxActionRange, true).targetEid;
      }
    }

    const primaryRuleFired =
      input.primary > 0 &&
      ruleModule.emitEngineTrigger('primaryAction', {
        self: primaryActor,
        other: actionTarget ?? eid,
        user: eid,
      }) > 0;
    if (primaryRuleFired) {
      triggerUseAnimation(ctx, primaryActor);
    }

    const secondaryRuleFired =
      input.secondary > 0 &&
      ruleModule.emitEngineTrigger('secondaryAction', {
        self: secondaryActor,
        other: actionTarget ?? eid,
        user: eid,
      }) > 0;
    if (secondaryRuleFired) {
      triggerUseAnimation(ctx, secondaryActor);
    }
  }

  // Clear per-frame dedupe state for this system.
  spatial.clearScope("motionControl");
};
