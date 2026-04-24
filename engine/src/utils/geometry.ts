import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { BodyResolved } from "../modules/body";
import { hasComponent } from "bitecs";
import { Body, Transform as TransformComponent } from "../core/components";
import { ECSContext, getModule } from "../core/ecs";

export class Transform {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;

    constructor(
        position = new THREE.Vector3(0, 0, 0),
        rotation: THREE.Quaternion | THREE.Euler = new THREE.Quaternion(),
        scale = new THREE.Vector3(1, 1, 1)
    ) {
        this.position = position;
        this.rotation = rotation instanceof THREE.Euler
            ? new THREE.Quaternion().setFromEuler(rotation)
            : rotation;
        this.scale = scale;
    }

    setRotationFromEuler(euler: THREE.Euler): void {
        this.rotation.setFromEuler(euler);
    }

    get xAxis(): THREE.Vector3 {
        const xAxis = new THREE.Vector3(1, 0, 0);
        return xAxis.applyQuaternion(this.rotation);
    }

    get yAxis(): THREE.Vector3 {
        const yAxis = new THREE.Vector3(0, 1, 0);
        return yAxis.applyQuaternion(this.rotation);
    }

    get zAxis(): THREE.Vector3 {
        const zAxis = new THREE.Vector3(0, 0, -1);
        return zAxis.applyQuaternion(this.rotation);
    }
}

/**
 * Calculate bounding box from body parts recursively in local space
 */
export function calculateLocalBodyBounds(parts: BodyResolved["parts"]): THREE.Box3 {
    const box = new THREE.Box3();

    for (const part of parts) {
        // Only process geometry parts for bounds calculation
        if (part.type !== "geometry") continue;

        const localTransform = part.localTransform || new THREE.Matrix4();

        // Create a bounding box from the geometry
        const geometry = part.mesh;

        // Apply transform to the geometry and calculate bounds
        if (geometry.boundingBox) {
            geometry.computeBoundingBox();
        }

        if (geometry.boundingBox) {
            const partBox = geometry.boundingBox.clone();
            partBox.applyMatrix4(localTransform);
            box.union(partBox);
        } else {
            // If no bounding box, try to compute from position attribute
            const position = geometry.getAttribute('position');
            if (position && position instanceof THREE.BufferAttribute) {
                const partBox = new THREE.Box3().setFromBufferAttribute(position);
                partBox.applyMatrix4(localTransform);
                box.union(partBox);
            }
        }

        // Recursively process children
        if (part.children && part.children.length > 0) {
            const childBox = calculateLocalBodyBounds(part.children);
            box.union(childBox);
        }
    }

    return box;
}

/**
 * Calculate bounding box from body parts recursively
 */
export function calculateBodyBounds(parts: BodyResolved["parts"], parentTransform?: THREE.Matrix4): THREE.Box3 {
    const box = new THREE.Box3();

    for (const part of parts) {
        // Only process geometry parts for bounds calculation
        if (part.type !== "geometry") continue;

        const localTransform = part.localTransform || new THREE.Matrix4();
        const worldTransform = parentTransform ?
            new THREE.Matrix4().multiplyMatrices(parentTransform, localTransform) :
            localTransform;

        // Create a bounding box from the geometry
        const geometry = part.mesh;

        // Apply transform to the geometry and calculate bounds
        if (geometry.boundingBox) {
            geometry.computeBoundingBox();
        }

        if (geometry.boundingBox) {
            const partBox = geometry.boundingBox.clone();
            partBox.applyMatrix4(worldTransform);
            box.union(partBox);
        } else {
            // If no bounding box, try to compute from position attribute
            const position = geometry.getAttribute('position');
            if (position && position instanceof THREE.BufferAttribute) {
                const partBox = new THREE.Box3().setFromBufferAttribute(position);
                partBox.applyMatrix4(worldTransform);
                box.union(partBox);
            }
        }

        // Recursively process children
        if (part.children && part.children.length > 0) {
            const childBox = calculateBodyBounds(part.children, worldTransform);
            box.union(childBox);
        }
    }

    return box;
}

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Yaw in XZ plane (rotation around Y axis).
 * Returns radians.
 */
export function yawXZ(from: Vec3, to: Vec3): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return Math.atan2(dx, dz);
}

/**
 * Pitch (tilt up/down around X axis).
 * Returns radians.
 */
export function pitchY(from: Vec3, to: Vec3): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const hDist = Math.sqrt(dx * dx + dz * dz);
    return Math.atan2(dy, hDist);
}

/**
 * Get world space bounds center for an entity with a Body component
 * @param ctx - ECS context
 * @param eid - Entity ID
 * @returns World space bounds center, or null if entity has no body
 */
export function getWorldSpaceBoundsCenter(ctx: ECSContext, eid: number): Vec3 | null {
    if (!hasComponent(ctx, Body, eid)) {
        return null;
    }

    try {
        const bodyMod = getModule(ctx, 'body');
        const bodyDef = bodyMod.get(Body.bodyId[eid]);
        
        const entityPos = {
            x: TransformComponent.x[eid] || 0,
            y: TransformComponent.y[eid] || 0,
            z: TransformComponent.z[eid] || 0
        };

        // Transform cached local bounds center to world space
        const localBoundsCenter = new THREE.Vector3();
        bodyDef.localBounds.getCenter(localBoundsCenter);
        
        // Apply entity's world position to get bounds center in world space
        return {
            x: entityPos.x + localBoundsCenter.x,
            y: entityPos.y + localBoundsCenter.y,
            z: entityPos.z + localBoundsCenter.z
        };
    } catch (error) {
        return null;
    }
}

export function setWorldRotationFromEuler(object: THREE.Object3D, x: number, y: number, z: number) {
    const euler = new THREE.Euler(x, y, z, "YXZ");

    // make a quaternion from the world euler
    const q = new THREE.Quaternion().setFromEuler(euler);

    // if the object has a parent, convert world → local
    if (object.parent) {
        const parentInv = object.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        object.quaternion.copy(parentInv.multiply(q));
    } else {
        // no parent, just set directly
        object.quaternion.copy(q);
    }
}