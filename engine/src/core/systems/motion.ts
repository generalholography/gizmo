import { addComponent, defineQuery, enterQuery, exitQuery, hasComponent } from "bitecs";
import * as RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

import { ECSContext, getModule, getResource } from "../ecs";
import { Transform } from "../components/Transform";
import { MotionSource } from "../components/MotionSource";
import { Velocity } from "../components/Velocity";
import { Held } from "../components/Held";
import { Animation } from "../components/Animation";
import { bodyModule } from "../../modules/body";
import { Body } from "../components";
import { motionSourceModule } from "../../modules/motionSource";
import { calculateBodyBounds } from "../../utils/geometry";
import { _RuntimeCharacterControllerData } from "../components/_RuntimeCharacterControllerData";
import { LazyMap } from "../../utils/lazyMap";
import { getRuleModule } from "../../modules/rule";
import {
  AnimatedColliderBinding,
  clearAnimatedColliderBindings,
  registerAnimatedColliderBindings
} from "./animatedColliderSync";

/*
* Collision groups:
* DC - Dynamic Collider
* DS - Dynamic Sensor
* CC - Character Controller
* CS - Character Sensor

Row collides with column:
   | DC | DS | CC | CS | 
DC | XX | XX | XX |    |
DS | XX |    | XX |    |
CC | XX | XX |    | XX |  Don't collide with other character controllers
CS |    |    | XX |    |  Only use this to detect other characters for soft collision, collision simulation

*/

export const DC_BIT = 0b0001;
export const DS_BIT = 0b0010;
export const CC_BIT = 0b0100;
export const CS_BIT = 0b1000;

// DC: member=DC; can hit DC, CC, and be seen by DS
export const DC_MASK = (DC_BIT << 16) | (DC_BIT | DS_BIT | CC_BIT);
// DS: member=DS; wants DC and CC
export const DS_MASK = (DS_BIT << 16) | (DC_BIT | CC_BIT);
// CC: member=CC; wants DC, and to be seen by DS & CS
export const CC_MASK = (CC_BIT << 16) | (DC_BIT | DS_BIT | CS_BIT);
// CS: member=CS; wants CC only
export const CS_MASK = (CS_BIT << 16) | (CC_BIT);

const motionQ = defineQuery([MotionSource, Transform]);
const motionEnterQ = enterQuery(motionQ);
const motionExitQ = exitQuery(motionQ);

export function getEntityFromBody(ctx: ECSContext, handle: number): number | undefined {
  const handleToEntity = getResource<Map<number, number>>(ctx, 'handleToEntity')!;
  return handleToEntity.get(handle);
}

export const motionSystem = (ctx: ECSContext): void => {
  const sensorIntersectionPairs = getResource<LazyMap<number, Set<number>>>(ctx, 'sensorIntersectionPairs');
  const eventQueue = getResource<RAPIER.EventQueue>(ctx, 'eventQueue');
  const dt = getResource<number>(ctx, 'deltaTime') || 1 / 60;
  const handleToEntity = getResource<Map<number, number>>(ctx, 'handleToEntity')!;

  const bodyMod = getModule<ReturnType<typeof bodyModule>>(ctx, 'body');
  const motionSourceMod = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource');

  for (const eid of motionEnterQ(ctx)) {
    const motionSourceRes = motionSourceMod.get(MotionSource.motionSourceId[eid]);
    const motionSourceDef = motionSourceMod.getDefinition(MotionSource.motionSourceId[eid]);
    let rbDesc: RAPIER.RigidBodyDesc;

    const isHeld = hasComponent(ctx, Held, eid);

    if (isHeld) {
      rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    } else if (motionSourceRes.bodyType === "static") {
      rbDesc = RAPIER.RigidBodyDesc.fixed();
    } else if (motionSourceRes.bodyType === "kinematic") {
      rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    } else {
      rbDesc = RAPIER.RigidBodyDesc.dynamic();
      const m = motionSourceRes.mass || 0;
      if (m > 0) rbDesc.setAdditionalMass(m);
      rbDesc.setGravityScale(motionSourceRes?.gravityScale ?? 1);
    }

    rbDesc.setTranslation(
      Transform.x[eid],
      Transform.y[eid],
      Transform.z[eid]
    );
    rbDesc.setRotation({
      w: Transform.qw[eid],
      x: Transform.qx[eid],
      y: Transform.qy[eid],
      z: Transform.qz[eid]
    });

    if (hasComponent(ctx, Velocity, eid)) {
      rbDesc.setLinvel(
        Velocity.x[eid] || 0,
        Velocity.y[eid] || 0,
        Velocity.z[eid] || 0
      );
    }

    const rb = ctx.rapier.world.createRigidBody(rbDesc);
    handleToEntity.set(rb.handle, eid);

    // Create colliders from Body component if it exists
    if (!isHeld) {
      if (hasComponent(ctx, Body, eid)) {
        const bodyDef = bodyMod.get(Body.bodyId[eid]);

        if (motionSourceRes.controller) {
          if (motionSourceRes.controller.type === "character") {
            // get a simplified capsule collider based on body size
            const bounds = calculateBodyBounds(bodyDef.parts);
            const r = (Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z)) / 2;
            const h = Math.max(((bounds.max.y - bounds.min.y) / 2) - r, 0);

            const colliderDesc = RAPIER.ColliderDesc.capsule(h, r); //TODO: cache
            colliderDesc.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
            colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

            // Need to offset the collider to be centered on the body's bounds
            // Center is in local space since bodyDef is wrt the entity origin
            let center = new THREE.Vector3();
            bounds.getCenter(center);
            colliderDesc.setTranslation(center.x, center.y, center.z);

            const collider = ctx.rapier.world.createCollider(colliderDesc, rb);
            collider.setCollisionGroups(CC_MASK);
            const sensor = ctx.rapier.world.createCollider(colliderDesc, rb);
            sensor.setSensor(true);
            sensor.setCollisionGroups(CS_MASK);

            addComponent(ctx, _RuntimeCharacterControllerData, eid);
            _RuntimeCharacterControllerData.colliderHandle[eid] = collider.handle;
            _RuntimeCharacterControllerData.sensorHandle[eid] = sensor.handle;
            // Initialize canFly from definition and creativeMode to false
            _RuntimeCharacterControllerData.canFly[eid] = motionSourceDef?.params?.canFly ? 1 : 0;
            _RuntimeCharacterControllerData.creativeMode[eid] = 0;

            // tryUnstickCharacter(ctx, rb, collider, eid);

          } else if (motionSourceRes.controller.type === "vehicle") {
            // Placeholder for vehicle controller setup
            console.warn("Vehicle controllers are not yet implemented.");
          }
        } else {
          const selectedColliders = selectColliderDescsForBody(bodyDef, motionSourceRes.bodyType);
          const animatedColliderBindings: AnimatedColliderBinding[] = [];
          for (let colliderIndex = 0; colliderIndex < selectedColliders.descs.length; colliderIndex++) {
            const colliderDesc = selectedColliders.descs[colliderIndex];
            if (colliderDesc) {
              const initialColliderLocalMatrix = matrixFromColliderDesc(colliderDesc);
              const createdCollider = ctx.rapier.world.createCollider(colliderDesc, rb);
              createdCollider.setCollisionGroups(DC_MASK);
              const targetPath = selectedColliders.paths?.[colliderIndex];
              if (targetPath && hasComponent(ctx, Animation, eid)) {
                animatedColliderBindings.push({
                  colliderHandle: createdCollider.handle,
                  targetPath: [...targetPath],
                  initialColliderLocalMatrix
                });
              }

              if (createdCollider.handle === 0xFFFFFFFF || rapierHandleToUint32(createdCollider.handle) === 0xFFFFFFFF) {
                console.error(`Collider created with NO_COLLIDER_ID for entity ${eid}`);
              }
            }
          }
          registerAnimatedColliderBindings(ctx, eid, animatedColliderBindings);
        }
      }

      const ruleModule = getRuleModule(ctx);
      const inRangeRules = ruleModule.getEntityRulesByTrigger(eid, 'entityInRange');
      let maxRange = 0;
      for (const ruleDef of inRangeRules) {
        const triggerRange = (ruleDef.trigger as any)?.params?.range;
        if (typeof triggerRange === 'number' && triggerRange > maxRange) {
          maxRange = triggerRange;
        }
      }

      if (maxRange > 0) {
        const colliderDesc = RAPIER.ColliderDesc.ball(maxRange)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        const coll = ctx.rapier.world.createCollider(colliderDesc, rb);
        coll.setCollisionGroups(DS_MASK);
      }
    }

    MotionSource.bodyHandle[eid] = rb.handle;
  }

  ctx.rapier.world.timestep = dt;
  ctx.rapier.world.step(eventQueue);

  const eids = motionQ(ctx);
  for (let i = 0; i < eids.length; ++i) {
    const eid = eids[i];
    const rb = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[eid]);
    if (!rb) continue;

    const pos = rb.translation();
    const rot = rb.rotation();
    const vel = rb.linvel();

    Transform.x[eid] = pos.x;
    Transform.y[eid] = pos.y;
    Transform.z[eid] = pos.z;

    // Kinematic rbs rotation is handled in the motion source controller
    if (!rb.isKinematic()) {
      Transform.qx[eid] = rot.x;
      Transform.qy[eid] = rot.y;
      Transform.qz[eid] = rot.z;
      Transform.qw[eid] = rot.w;
    }

    if (hasComponent(ctx, Velocity, eid)) {
      Velocity.x[eid] = vel.x;
      Velocity.y[eid] = vel.y;
      Velocity.z[eid] = vel.z;
    }
  }

  for (const eid of motionExitQ(ctx)) {
    const handle = MotionSource.bodyHandle[eid];
    if (handle !== undefined) {
      // get rb from handle
      const rb = ctx.rapier.world.getRigidBody(handle);
      for (let i = 0; i < rb.numColliders(); i++) {
        const collider = rb.collider(i);
        if (collider.isSensor()) {
          sensorIntersectionPairs.delete(collider.handle);
        }
      }
      // Add back if the below line is not working
      // while (rb.numColliders() > 0) {
      //   const collider = rb.collider(0);
      //   ctx.rapier.world.removeCollider(collider, true);
      // }
      ctx.rapier.world.removeRigidBody(rb);
      handleToEntity.delete(handle);
      clearAnimatedColliderBindings(ctx, eid);
      MotionSource.bodyHandle[eid] = undefined;
    }
  }
}

function selectColliderDescsForBody(
  bodyDef: {
    colliders: RAPIER.ColliderDesc[];
    colliderDefinitionPaths?: Array<number[] | undefined>;
    localBounds: THREE.Box3;
    hasGroupMeshOperations?: boolean
  },
  bodyType: 'static' | 'dynamic' | 'kinematic'
): { descs: RAPIER.ColliderDesc[]; paths?: Array<number[] | undefined> } {
  const needsSimplified = Boolean(bodyDef.hasGroupMeshOperations) && (bodyType === 'dynamic' || bodyType === 'kinematic');
  if (!needsSimplified) {
    return { descs: bodyDef.colliders, paths: bodyDef.colliderDefinitionPaths };
  }

  const simplified = buildBoundsColliderDescs(bodyDef.localBounds);
  if (simplified.length === 0) {
    return { descs: bodyDef.colliders, paths: bodyDef.colliderDefinitionPaths };
  }

  return { descs: simplified };
}

function matrixFromColliderDesc(desc: RAPIER.ColliderDesc): THREE.Matrix4 {
  const t = desc.translation ?? { x: 0, y: 0, z: 0 };
  const r = desc.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
  return new THREE.Matrix4().compose(
    new THREE.Vector3(t.x, t.y, t.z),
    new THREE.Quaternion(r.x, r.y, r.z, r.w),
    new THREE.Vector3(1, 1, 1)
  );
}

function buildBoundsColliderDescs(bounds: THREE.Box3): RAPIER.ColliderDesc[] {
  if (!bounds || bounds.isEmpty()) {
    return [];
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const hx = Math.max(size.x * 0.5, 0.001);
  const hy = Math.max(size.y * 0.5, 0.001);
  const hz = Math.max(size.z * 0.5, 0.001);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
  colliderDesc.setTranslation(center.x, center.y, center.z);

  return [colliderDesc];
}

// potentially useful for debugging
export function rapierHandleToUint32(handle) {
  const f64 = new Float64Array([handle])   // store the JS number
  const u32 = new Uint32Array(f64.buffer)  // view same memory as u32s
  return u32[0]                            // low 32 bits = Rapier handle
}
