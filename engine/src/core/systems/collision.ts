import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { getEntityFromBody } from './motion';
import { ECSContext, getModule, getResource } from '../ecs';
import { hasComponent } from 'bitecs';
import { LazyMap } from '../../utils/lazyMap';
import { MotionSource, MountedBy } from '../components';
import { motionSourceModule } from '../../modules/motionSource';
import { _RuntimeCharacterControllerData } from '../components/_RuntimeCharacterControllerData';
import { getSpatialTriggerRuntime } from './spatialTriggerRuntime';


const XZ = {x: 1, y: 0, z: 1};

export type CollisionEventCallback = (eid1: number, eid2: number) => void;

export function addCollisionEvent(ctx: ECSContext, callback: CollisionEventCallback) {
    const callbacks = getResource<CollisionEventCallback[]>(ctx, 'collisionEventCallbacks');
    callbacks.push(callback);
    console.log(`Collision event callback added: ${callback.name} - Total: ${callbacks.length}`);
}

// Helpers
function handleOnCollisionEnter(ctx: ECSContext, source: number, target: number) {
    const spatial = getSpatialTriggerRuntime(ctx);
    spatial.emitCollisionEnter('collisionSystem', source, target);
}

function handleOnEntityInRange(ctx: ECSContext, source: number, target: number) {
    const spatial = getSpatialTriggerRuntime(ctx);
    spatial.emitEntityInRange('collisionSystem', source, target);
}

export const collisionSystem = (ctx: ECSContext): void => {
    const callbacks = getResource<CollisionEventCallback[]>(ctx, 'collisionEventCallbacks');
    const sensorIntersectionPairs = getResource<LazyMap<number, Set<number>>>(ctx, 'sensorIntersectionPairs');
    const eventQueue = getResource<RAPIER.EventQueue>(ctx, 'eventQueue');

    // Process collision events
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
        const world = ctx.rapier.world;
        const c1 = world.getCollider(handle1);
        const c2 = world.getCollider(handle2);
        const rb1 = c1?.parent();
        const rb2 = c2?.parent();

        if (started) {
            if (c1?.isSensor() && !(c2?.isSensor())) {
                // If c1 is a sensor, store the intersection pair
                sensorIntersectionPairs.get(handle1).add(handle2);
            }
            if (c2?.isSensor() && !(c1?.isSensor())) {
                // If c2 is a sensor, store the intersection pair
                sensorIntersectionPairs.get(handle2).add(handle1);
            }
        } else {
            // If the collision ended, remove the intersection pair
            if (c1?.isSensor() && sensorIntersectionPairs.has(handle1)) {
                sensorIntersectionPairs.get(handle1).delete(handle2);
            }
            if (c2?.isSensor() && sensorIntersectionPairs.has(handle2)) {
                sensorIntersectionPairs.get(handle2).delete(handle1);
            }
        }

        if (!started) return;
        const entity1 = rb1 ? getEntityFromBody(ctx, rb1.handle) : undefined;
        const entity2 = rb2 ? getEntityFromBody(ctx, rb2.handle) : undefined;
        if (entity1 !== undefined && entity2 !== undefined) {
            const isSensor1 = c1?.isSensor() || false;
            const isSensor2 = c2?.isSensor() || false;

            // these were the old checks, idk if important
            // const apply1 = !isSensor2 || isSensor1;
            // const apply2 = !isSensor1 || isSensor2;
            const apply1 = !isSensor2 && !isSensor1;
            const apply2 = !isSensor1 && !isSensor2;

            if (apply1) {
                handleOnCollisionEnter(ctx, entity1, entity2);
            }

            if (apply2) {
                handleOnCollisionEnter(ctx, entity2, entity1);
            }

            for (const callback of callbacks) {
                callback(entity1, entity2);
                callback(entity2, entity1);
            }
        }
    });

    const world = ctx.rapier.world;
    const motionSourceMod = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource');

    // TODO: this can get kind of laggy if many sensor contact pairs, maybe check less?
    sensorIntersectionPairs.forEach((set, handle1) => {
        if (set.size > 0) {
            const c1 = world.getCollider(handle1);
            const rb1 = c1?.parent();
            const entity1 = rb1 ? getEntityFromBody(ctx, rb1.handle) : undefined;

            set.forEach((handle2) => {
                const c2 = world.getCollider(handle2);
                const rb2 = c2?.parent();
                const entity2 = rb2 ? getEntityFromBody(ctx, rb2.handle) : undefined;
                if (entity1 !== undefined && entity2 !== undefined) {

                    const ms1 = motionSourceMod.get(MotionSource.motionSourceId[entity1]);
                    const areMountPair = 
                    (hasComponent(ctx, MountedBy, entity1) && MountedBy.eid[entity1] === entity2) ||
                    (hasComponent(ctx, MountedBy, entity2) && MountedBy.eid[entity2] === entity1);
                    
                    // check if this is a character controller sensor collision
                    if (
                        ms1?.controller?.type === 'character' && 
                        c1.handle === _RuntimeCharacterControllerData.sensorHandle[entity1] // make sure it's the character controller's associated sensor, not another sensor
                        && !areMountPair    // don't trigger if one is mounting the other
                    ) {
                        // treat it like a collision event
                        handleOnCollisionEnter(ctx, entity1, entity2);

                        if (
                            c1.shape.type === RAPIER.ShapeType.Capsule &&
                            c2.shape.type === RAPIER.ShapeType.Capsule
                        ) {
                            //this is probably slow as shit
                            const r1 = (c1.shape as RAPIER.Capsule).radius;
                            const r2 = (c2.shape as RAPIER.Capsule).radius;
                            const d = new THREE.Vector3().copy(rb1.translation()).multiply(XZ).distanceTo(new THREE.Vector3().copy(rb2.translation()).multiply(XZ));
                            const overlap = (r1 + r2) - d;
                            const intensity = 5;
                            const mag = Math.min(intensity, overlap * intensity);
                            const vec = new THREE.Vector3().subVectors(rb1.translation(), rb2.translation()).multiply(XZ).normalize().multiplyScalar(mag);

                            // Soft push velocity for character controller
                            _RuntimeCharacterControllerData.softPushVelocity[entity1][0] = vec.x;
                            _RuntimeCharacterControllerData.softPushVelocity[entity1][1] = 0//rb1.translation().y - rb2.translation().y;
                            _RuntimeCharacterControllerData.softPushVelocity[entity1][2] = vec.z;
                        } else {
                            console.warn(`Sensor collision with character controller for entity ${entity1} ${entity2} but shape is not capsule`);
                        }
                    }

                    handleOnEntityInRange(ctx, entity1, entity2);
                }
            });
        }
    });

    // Reset per-frame dedupe state for this system.
    getSpatialTriggerRuntime(ctx).clearScope('collisionSystem');
}
