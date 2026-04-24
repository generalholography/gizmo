import { Module } from "./Module";
import type { InputState } from "../core/input";
import { MotionSource as MotionSourceComponent } from "../core/components/MotionSource";
import { MountedBy } from "../core/components/MountedBy";
import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { ECSContext, getResource } from "../core/ecs";
import { CC_MASK, getEntityFromBody } from "../core/systems/motion";
import { addComponent, hasComponent } from "bitecs";
import { Transform } from "../core/components";
import { _RuntimeCharacterControllerData } from "../core/components/_RuntimeCharacterControllerData";

// Adapted schema for the module system (params is required)
type MotionSourceModuleSchema =
  | { type: "static"; params: any }
  | { type: "dynamicRigidBody"; params: any }
  | { type: "characterController"; params: any }
  | { type: "vehicleController"; params: any };

export type Controller =
  | {
    type: "character";
    controller: RAPIER.KinematicCharacterController;
    speed: number;
    jumpHeight: number; //TODO: implement jump height
  }
  | {
    type: "vehicle";
    controller: RAPIER.DynamicRayCastVehicleController; // Placeholder for vehicle controller
    speed: number;
  }

export interface MotionSourceResolved {
  bodyType: "static" | "dynamic" | "kinematic";
  mass?: number;
  gravityScale?: number;
  controller?: Controller;
  apply?: (eid: number, input: InputState) => void;
}

export const motionSourceModule = (ctx: ECSContext) =>
  new Module<MotionSourceModuleSchema, MotionSourceResolved>(ctx, {
    static: (params: any) => ({
      bodyType: "static" as const,
    }),

    dynamicRigidBody: (params: any) => ({
      bodyType: "dynamic" as const,
      mass: params?.mass ?? 1,
      gravityScale: params?.gravityScale ?? 1,
    }),

    characterController: (params: any): MotionSourceResolved => {
      const offset: number = params?.offset ?? 0.05;
      const speed: number = params?.speed ?? 5;
      const sprintSpeed: number = params?.sprintSpeed ?? speed * 2;
      const jumpHeight: number = params?.jumpHeight ?? 5;
      const canFlyInitial: boolean = params?.canFly ?? false;

      const cc = ctx.rapier.world.createCharacterController(offset);
      cc.setApplyImpulsesToDynamicBodies(true);

      cc.enableSnapToGround(0.05);
      cc.setMaxSlopeClimbAngle(Math.PI / 2); // Allow climbing any slope?
      const up = new THREE.Vector3(0, 1, 0);

      return {
        bodyType: "kinematic" as const,
        controller: {
          type: "character",
          controller: cc,
          speed,
          jumpHeight,
        },
        apply: (eid: number, input: InputState) => {
          const rb = ctx.rapier.world.getRigidBody(MotionSourceComponent.bodyHandle[eid]);

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

          const moveSpeed = input.sprint ? sprintSpeed : speed;

          let velY = 0;
          
          // Read canFly from _RuntimeCharacterControllerData component
          const canFlyNow = hasComponent(ctx, _RuntimeCharacterControllerData, eid) && 
                            _RuntimeCharacterControllerData.canFly[eid] === 1;
          if (canFlyNow) {
            velY = input.moveY * moveSpeed;
          } else {
            velY = rb.linvel().y; // Start with current vertical velocity
            if (MotionSourceComponent.isGrounded[eid] === 0) {
              velY += ctx.rapier.world.gravity.y * dt; // Apply vertical velocity if not grounded
            } else {
              velY = 0; // Reset vertical velocity if grounded
              if (input.moveY > 0.5) {
                velY += Math.sqrt(2 * jumpHeight * -ctx.rapier.world.gravity.y); // Jump impulse
              }
            }
          }

          const desired: RAPIER.Vector = {
            x: fwd.x * moveSpeed * dt,
            y: velY * dt, // Use calculated vertical velocity
            z: fwd.z * moveSpeed * dt,
          };

          // Apply soft push velocity if available
          if (_RuntimeCharacterControllerData.softPushVelocity[eid]) {
            desired.x += _RuntimeCharacterControllerData.softPushVelocity[eid][0] * dt;
            desired.y += _RuntimeCharacterControllerData.softPushVelocity[eid][1] * dt;
            desired.z += _RuntimeCharacterControllerData.softPushVelocity[eid][2] * dt;

            // Reset after applying
            _RuntimeCharacterControllerData.softPushVelocity[eid][0] = 0;
            _RuntimeCharacterControllerData.softPushVelocity[eid][1] = 0;
            _RuntimeCharacterControllerData.softPushVelocity[eid][2] = 0;
          }

          // Apply knockback vector if available
          if (_RuntimeCharacterControllerData.knockbackVector[eid]) {
            desired.x += _RuntimeCharacterControllerData.knockbackVector[eid][0] * dt;
            desired.y += _RuntimeCharacterControllerData.knockbackVector[eid][1] * dt;
            desired.z += _RuntimeCharacterControllerData.knockbackVector[eid][2] * dt;

            // Decay knockback vector
            const isGrounded = MotionSourceComponent.isGrounded[eid] === 1;
            const decayFactor = isGrounded ? 0.85 : 0.95; // Stronger decay if grounded
            _RuntimeCharacterControllerData.knockbackVector[eid][0] *= decayFactor;
            _RuntimeCharacterControllerData.knockbackVector[eid][1] = 0; // Y is treated as velocity - need to treat knockback in y as an impulse
            _RuntimeCharacterControllerData.knockbackVector[eid][2] *= decayFactor;
          }

          cc.computeColliderMovement(
            collider,
            desired,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            _RuntimeCharacterControllerData.creativeMode[eid] 
            ? 0 // allows noclip in creative mode (no collisions calculated) 
            : CC_MASK,
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
          MotionSourceComponent.isGrounded[eid] = cc.computedGrounded() ? 1 : 0;
          
          // Project knockback vector on collision normals to disperse energy
          if (_RuntimeCharacterControllerData.knockbackVector[eid]) {
            const numCollisions = cc.numComputedCollisions();
            if (numCollisions > 0) {
              for (let i = 0; i < numCollisions; i++) {
                const collision = cc.computedCollision(i);
                if (collision && collision.normal1 && collision.normal1.y < 0.9) { // Skip mostly vertical normals (floors)
                  const normal = new THREE.Vector3(collision.normal1.x, collision.normal1.y, collision.normal1.z);
                  const knockback = new THREE.Vector3(
                    _RuntimeCharacterControllerData.knockbackVector[eid][0],
                    _RuntimeCharacterControllerData.knockbackVector[eid][1],
                    _RuntimeCharacterControllerData.knockbackVector[eid][2]
                  );
                  
                  // Project knockback onto the plane defined by the collision normal
                  const projectedKnockback = knockback.clone().projectOnPlane(normal);
                  
                  _RuntimeCharacterControllerData.knockbackVector[eid][0] = projectedKnockback.x;
                  _RuntimeCharacterControllerData.knockbackVector[eid][1] = projectedKnockback.y;
                  _RuntimeCharacterControllerData.knockbackVector[eid][2] = projectedKnockback.z;
                }
              }
            }
          }
          
          const pos = rb.translation();
          rb.setNextKinematicTranslation({ x: pos.x + mv.x, y: pos.y + mv.y, z: pos.z + mv.z });
        },
      };
    },

    vehicleController: (params: any) => {
      // Stub for vehicle controller
      console.warn("Vehicle controller not yet implemented");
      return {
        bodyType: "kinematic" as const,
      };
    },
  });