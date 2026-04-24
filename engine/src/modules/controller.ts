import { Module } from "./Module";
import type { InputState } from "../core/input";
import { MotionSource } from "../core/components/MotionSource";
import { MountedBy } from "../core/components/MountedBy";
import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { ECSContext, getResource } from "../core/ecs";
import { getEntityFromBody } from "../core/systems/motion";
import { addComponent, hasComponent } from "bitecs";
import { Transform } from "../core/components";

export type ControllerDefinition = {
  type: "onFoot" | "zeroGravity";
  params: Record<string, any>;
};

export interface ControllerResolved {
  controller: RAPIER.KinematicCharacterController;
  apply: (eid: number, input: InputState) => void;
}

export const controllerModule = (ctx: ECSContext) =>
  new Module<ControllerDefinition, ControllerResolved>(ctx, {
    onFoot: (params: any) => {
      const offset: number = params?.offset ?? 0.05;
      const speed: number = params?.speed ?? 5;
      const sprintSpeed: number = params?.sprintSpeed ?? speed * 2;
      const jumpHeight: number = params?.jumpHeight ?? 5;
      const cc = ctx.rapier.world.createCharacterController(offset);
      cc.setApplyImpulsesToDynamicBodies(true);
      cc.enableSnapToGround(0.05);
      cc.setMaxSlopeClimbAngle(Math.PI / 2); // Allow climbing any slope?
      const up = new THREE.Vector3(0, 1, 0);
      return {
        controller: cc,
        apply: (eid: number, input: InputState) => {
          const rb = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[eid]);
          
          if (!rb) return;
          const dt = getResource<number>(ctx, 'deltaTime') || 1 / 60;

          const quat = new THREE.Quaternion();
          quat.setFromAxisAngle(up, input.yaw);

          // Kinematic bodies impart massive rotational inertia
          // to others so we need to handle model rotation separate
          if (hasComponent(ctx, Transform, eid)) {
            Transform.qx[eid] = quat.x;
            Transform.qy[eid] = quat.y;
            Transform.qz[eid] = quat.z;
            Transform.qw[eid] = quat.w;
          }

          const fwd = new THREE.Vector3(input.moveX, 0, input.moveZ);
          fwd.applyQuaternion(quat);
          if (fwd.length() > 1) {
            fwd.normalize();
          }

          const collider = rb.numColliders() > 0 ? rb.collider(0) : null;
          if (!collider) return;

          let velY = rb.linvel().y; // Start with current vertical velocity
          if (MotionSource.isGrounded[eid] === 0) {
            velY += ctx.rapier.world.gravity.y * dt; // Apply vertical velocity if not grounded
          } else {
            velY = 0; // Reset vertical velocity if grounded
            if (input.moveY > 0.5) {
              velY += Math.sqrt(2 * jumpHeight * -ctx.rapier.world.gravity.y); // Jump impulse
            }
          }

          const moveSpeed = input.sprint ? sprintSpeed : speed;
          const desired: RAPIER.Vector = {
            x: fwd.x * moveSpeed * dt,
            y: velY * dt, // Use calculated vertical velocity
            z: fwd.z * moveSpeed * dt,
          };

          cc.computeColliderMovement(
            collider,
            desired,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            (collider) => {
            if (collider.isSensor()) return false;
            const collidedEid = getEntityFromBody(ctx, collider.parent().handle)
            if (hasComponent(ctx, MountedBy, eid)) {
              return MountedBy.eid[eid] !== collidedEid; // prevent collision with mounted entity
            }
            return true;
          }
          );
          const mv = cc.computedMovement();
          MotionSource.isGrounded[eid] = cc.computedGrounded() ? 1 : 0;
          const pos = rb.translation();
          rb.setNextKinematicTranslation({ x: pos.x + mv.x, y: pos.y + mv.y, z: pos.z + mv.z });
        },
      };
    },
    zeroGravity: (params: any) => {
      const offset: number = params.offset ?? 0.05;
      const speed: number = params.speed ?? 5;
      const sprintSpeed: number = params.sprintSpeed ?? speed * 2;
      const cc = ctx.rapier.world.createCharacterController(offset);
      cc.setApplyImpulsesToDynamicBodies(true);
      const up = new THREE.Vector3(0, 1, 0);
      return {
        controller: cc,
        apply: (eid: number, input: InputState) => {
          const rb = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[eid]);
          if (!rb) return;
          const dt = getResource<number>(ctx, 'deltaTime') || 1 / 60;

          const quat = new THREE.Quaternion();
          quat.setFromAxisAngle(up, input.yaw);
          rb.setNextKinematicRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });

          const fwd = new THREE.Vector3(input.moveX, 0, input.moveZ);
          if (fwd.lengthSq() > 0) {
            fwd.applyQuaternion(quat).normalize();
          }

          const collider = rb.numColliders() > 0 ? rb.collider(0) : null;
          if (!collider) return;

          const moveSpeed = input.sprint ? sprintSpeed : speed;
          const desired: RAPIER.Vector = {
            x: fwd.x * moveSpeed * dt,
            y: input.moveY * moveSpeed * dt,
            z: fwd.z * moveSpeed * dt,
          };

          cc.computeColliderMovement(
            collider,
            desired,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            (collider) => {
            if (collider.isSensor()) return false;
            const collidedEid = getEntityFromBody(ctx, collider.parent().handle)
            if (hasComponent(ctx, MountedBy, eid)) {
              return MountedBy.eid[eid] !== collidedEid; // prevent collision with mounted entity
            }
            return true;
          }
          );

          const mv = cc.computedMovement();
          const pos = rb.translation();
          rb.setNextKinematicTranslation({ x: pos.x + mv.x, y: pos.y + mv.y, z: pos.z + mv.z });
        },
      };
    },
  });
