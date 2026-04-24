import { defineQuery, hasComponent } from "bitecs";
import * as RAPIER from "@dimforge/rapier3d-compat";

import { ECSContext, getModule, getResource } from "../ecs";
import { Transform } from "../components/Transform";
import { MotionSource } from "../components/MotionSource";
import { _RuntimeCharacterControllerData } from "../components/_RuntimeCharacterControllerData";
import { motionSourceModule } from "../../modules/motionSource";
import { DC_BIT } from "./motion";
import { getName } from "../components/Info";

const characterControllerQuery = defineQuery([MotionSource, Transform, _RuntimeCharacterControllerData]);
const INTERSECTION_MASK = (DC_BIT << 16) | (DC_BIT); // Only test against dynamic colliders

export const characterUnstickSystem = (ctx: ECSContext): void => {
  const frameNumber = getResource<number>(ctx, 'frameNumber') || 0;
  const motionSourceMod = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource');
  const shapeCache = getResource<Map<string, RAPIER.Capsule>>(ctx, 'intersectionShapeCache');

  if (!motionSourceMod || !shapeCache) {
    // Module/cache not available, skip this frame
    return;
  }

  const entities = characterControllerQuery(ctx);

  // Performance optimization: only process 1/5 of entities per frame
  const partition = frameNumber % 5;
  const entitiesInPartition = entities.filter((_, index) => index % 5 === partition);

  for (const eid of entitiesInPartition) {
    try {
      const motionSourceDef = motionSourceMod.get(MotionSource.motionSourceId[eid]);

      // Only process character controllers
      if (!motionSourceDef?.controller || motionSourceDef.controller.type !== "character") {
        continue;
      }

      const colliderHandle = _RuntimeCharacterControllerData.colliderHandle[eid];
      if (!colliderHandle) continue;

      const collider = ctx.rapier.world.getCollider(colliderHandle);
      if (!collider) continue;

      const rigidbody = collider.parent();
      if (!rigidbody) continue;

      // In creative mode, skip unsticking to allow free movement
      if (hasComponent(ctx, _RuntimeCharacterControllerData, eid) && _RuntimeCharacterControllerData.creativeMode[eid]) {
        continue;
      }

      // Create a slightly smaller shape for intersection testing (border offset)
      const originalShape = collider.shape as RAPIER.Capsule;
      if (!originalShape || typeof originalShape.radius !== 'number' || typeof originalShape.halfHeight !== 'number') {
        continue; // Not a capsule shape
      }

      const borderOffset = 0.1; // Small offset to only detect deeper penetrations
      const testRadius = Math.max(originalShape.radius - borderOffset, 0.01);
      const testHalfHeight = originalShape.halfHeight; // Only offset radius, not half height

      // Create cache key and get or create cached shape
      const cacheKey = `capsule:${testRadius}:${testHalfHeight}`;
      let testShape = shapeCache.get(cacheKey);
      if (!testShape) {
        testShape = new RAPIER.Capsule(testHalfHeight, testRadius);
        shapeCache.set(cacheKey, testShape);
      }

      // Test intersection with the cached shape
      const hit = ctx.rapier.world.intersectionWithShape(
        collider.translation(),
        collider.rotation(),
        testShape,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        INTERSECTION_MASK,
        undefined,
        rigidbody, // Exclude the character's own rigidbody
        undefined,
      );

      // If intersection detected, nudge character up
      if (hit) {
        if (!hit.parent().isDynamic()) {
          const nudgeAmount = Math.max((originalShape.halfHeight + (originalShape.radius * 2)) * 0.2, 0.2); // Nudge up 20% of the capsule height or just 0.2m min
          Transform.y[eid] += nudgeAmount;
          rigidbody.setTranslation({
            x: Transform.x[eid],
            y: Transform.y[eid],
            z: Transform.z[eid]
          }, true);
        }
      }
    } catch (error) {
      console.warn(`Error in characterUnstickSystem for entity ${eid}:`, error);
    }
  }
};