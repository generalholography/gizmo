import { defineQuery, addComponent } from "bitecs";
import * as THREE from "three";
import { ECSContext } from "../ecs";
import { Inventory as InventoryComp } from "../components/Inventory";
import { Player } from "../components/Player";
import { Transform } from "../components/Transform";
import { MotionSource } from "../components/MotionSource";
import { Held } from "../components/Held";
import { Inventory as InventoryData } from "../inventory";
import { spawn } from "../spawn";
import { despawn, getEntityBundle } from "../despawn";
import { getHeldItemTransform } from "../../modules/renderer";
import { syncObject3DTransformFromECS } from "./bodyRendering";
import { getStore, InventoryStore, Store } from "../../modules/entityStore";

const q = defineQuery([InventoryComp, Transform, MotionSource]);

export const heldItemSystem = (ctx: ECSContext) => {
  const inventories = getStore<InventoryStore>(ctx, "inventory");
  const held = getStore<Store<{ eid: number; slot: number }>>(ctx, "heldItems");

  for (const eid of q(ctx)) {
    const inv = inventories.get(eid);
    if (!inv) continue;

    // Skip held item rendering when selectedItemIndex is -1 (no item held)
    if (inv.selected < 0) {
      const entry = held.get(eid);
      if (entry) {
        despawn(ctx, entry.eid);
        held.delete(eid);
      }
      continue;
    }

    const heldTransform = getHeldItemTransform(ctx, eid);
    if (!heldTransform) continue;
    const targetPos = new THREE.Vector3(heldTransform.x, heldTransform.y, heldTransform.z);
    const quat = new THREE.Quaternion(heldTransform.qx, heldTransform.qy, heldTransform.qz, heldTransform.qw);

    const entry = held.get(eid);
    if (!entry || entry.slot !== inv.selected) {
      if (entry) {
        despawn(ctx, entry.eid);
        held.delete(eid);
      }
      const item = inv.slots[inv.selected];
      if (item && item.type === "entity") {
        const newEid = spawn(ctx, item.definition, { Transform: targetPos });
        addComponent(ctx, Held, newEid);
        Held.eid[newEid] = eid;
        held.set(eid, { eid: newEid, slot: inv.selected });
      } else {
        continue;
      }
    }
    const current = held.get(eid);
    if (!current) continue;
    const rbHandle = MotionSource.bodyHandle[current.eid];
    if (!rbHandle) continue;
    const rb = ctx.rapier.world.getRigidBody(rbHandle);
    if (rb) {
      // Using setTranslation vs setNextKinematicTranslation
      // to ensure the physics body is updated immediately
      // This is important for the renderer to sync correctly
      // Otherwise the model may appear 1 frame behind
      rb.setTranslation(targetPos, false);
      rb.setRotation(quat, false);
    }
    Transform.x[current.eid] = targetPos.x;
    Transform.y[current.eid] = targetPos.y;
    Transform.z[current.eid] = targetPos.z;
    Transform.qx[current.eid] = quat.x;
    Transform.qy[current.eid] = quat.y;
    Transform.qz[current.eid] = quat.z;
    Transform.qw[current.eid] = quat.w;

    // Need to force sync renderer transforms to ensure model is not 1 frame behind
    syncObject3DTransformFromECS(ctx, current.eid);

    // Update the inventory representation of the held item as well
    const def = getEntityBundle(ctx, current.eid);
    if (inv.slots[current.slot]?.type === "entity") {
      inv.slots[current.slot].definition = def;
    }
  }
};
