import * as RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import * as RECAST from "@recast-navigation/core";
import { Crowd, CrowdAgent } from "@recast-navigation/core";
import { addCrowdAgent, getCrowd, updateCrowd } from "../../modules/navMesh";
import { ECSContext, getModule, getResource } from "../ecs";
import { defineQuery, hasComponent } from "bitecs";
import { _InputState, _RuntimeCharacterControllerData, AI, Body, MotionSource, Transform } from "../components";
import { motionSourceModule } from "../../modules/motionSource";
import { AIState } from "../components/AI";
import { CC_BIT, DC_BIT, getEntityFromBody } from "./motion";
import { decode } from "../../utils/strings";
import { calculateBodyBounds, pitchY, yawXZ, getWorldSpaceBoundsCenter } from "../../utils/geometry";
import { getRelationship as areEntitiesHostile, getRelationship, Relationship } from "../components/Health";
import { getMemory, entityExists } from "../memory";
import { bodyModule } from "../../modules/body";
import { getSpawnTransform } from "../../modules/renderer";

export enum AIActionType {
    NONE,
    ATTACK,
    INTERACTWITH,   //TODO
    ESCAPE,         //TODO
}

export type AIAction = {
    targetEid: number | null; // target entity ID, null if no target
    type: AIActionType
}

const AIQuery = defineQuery([AI, Transform]);

const queryShapes = new Map<number, RAPIER.Ball>();
const IDENTITY_ROT = RAPIER.RotationOps.identity();
const SIGHT_MASK = (DC_BIT << 16) | (DC_BIT | CC_BIT);


function prioritizeNextAction(ctx: ECSContext, eid: number): AIAction {
    const action: AIAction = {
        targetEid: null,
        type: AIActionType.NONE
    };

    const entityPos = { x: Transform.x[eid], y: Transform.y[eid], z: Transform.z[eid] };
    const entityRb = ctx.rapier.world.bodies.get(MotionSource.bodyHandle[eid]) ?? undefined;

    // Get AI memory for this entity
    let memory;
    try {
        memory = getMemory(ctx, eid);
    } catch (error) {
        console.warn('Failed to get AI memory, falling back to basic behavior:', error);
        return findClosestVisibleTarget(ctx, eid, entityPos, entityRb);
    }

    const currentTime = performance.now();

    // FIRST PRIORITY: Attack whoever last damaged this entity (if they exist in world)
    if (memory.lastDamageDealt.entity !== null && entityExists(ctx, memory.lastDamageDealt.entity)) {
        const damageDealer = memory.lastDamageDealt.entity;

        // Check if still hostile
        if (getRelationship(ctx, eid, damageDealer) === Relationship.HOSTILE) {
            action.targetEid = damageDealer;
            action.type = AIActionType.ATTACK;
            return action; // Early return - highest priority
        }
    }

    // SECOND PRIORITY: Use last targeted entity (if < 5 seconds ago) as starting point for search
    let startingTarget: number | null = null;
    let startingDistance = Number.MAX_VALUE;

    if (memory.lastTargeted.entity !== null &&
        entityExists(ctx, memory.lastTargeted.entity) &&
        (currentTime - memory.lastTargeted.happenedAt) < 5000) { // 5 seconds

        const lastTarget = memory.lastTargeted.entity;

        // Check if still hostile and calculate distance
        if (getRelationship(ctx, eid, lastTarget) === Relationship.HOSTILE) {
            const targetPos = { x: Transform.x[lastTarget], y: Transform.y[lastTarget], z: Transform.z[lastTarget] };
            const distance = Math.sqrt(
                (targetPos.x - entityPos.x) ** 2 +
                (targetPos.y - entityPos.y) ** 2 +
                (targetPos.z - entityPos.z) ** 2
            );

            startingTarget = lastTarget;
            startingDistance = distance;
        }
    }

    // THIRD PRIORITY: Find closest visible target (original logic with starting point)
    const foundAction = findClosestVisibleTarget(ctx, eid, entityPos, entityRb, startingTarget, startingDistance);

    return foundAction;
}

function findClosestVisibleTarget(
    ctx: ECSContext,
    eid: number,
    entityPos: { x: number, y: number, z: number },
    entityRb: RAPIER.RigidBody | undefined,
    startingTargetEid: number | null = null,
    startingDistance: number = Number.MAX_VALUE
): AIAction {
    const action: AIAction = {
        targetEid: startingTargetEid,
        type: startingTargetEid ? AIActionType.ATTACK : AIActionType.NONE
    };

    // Use getSpawnTransform to get better entityPos for visibility raycasts
    const spawnTransform = getSpawnTransform(ctx, eid);
    const raycastEntityPos = {
        x: spawnTransform.position.x,
        y: spawnTransform.position.y,
        z: spawnTransform.position.z
    };

    if (!queryShapes.has(AI.awarenessRange[eid])) {
        if (queryShapes.size > 100) {
            console.warn("Too many awareness range shapes in queryShapes, clearing");
            queryShapes.clear();
        }
        queryShapes.set(AI.awarenessRange[eid], new RAPIER.Ball(AI.awarenessRange[eid]));
    }

    let distanceToTarget = startingDistance;

    ctx.rapier.world.intersectionsWithShape(
        entityPos, // Still use original entityPos for intersectionsWithShape
        IDENTITY_ROT,
        queryShapes.get(AI.awarenessRange[eid]),
        (collider) => {
            const colliderParentHandle = collider.parent().handle;
            const otherEid = getEntityFromBody(ctx, colliderParentHandle);

            if (getRelationship(ctx, eid, otherEid) !== Relationship.HOSTILE) {
                return true; // continue to next collider
            }

            // Use helper method to get world space bounds center of target for accurate targeting
            const targetBoundsCenter = getWorldSpaceBoundsCenter(ctx, otherEid);
            const targetPos = targetBoundsCenter || collider.parent().translation();

            const dir = {
                x: targetPos.x - raycastEntityPos.x,
                y: targetPos.y - raycastEntityPos.y,
                z: targetPos.z - raycastEntityPos.z
            };

            // Awareness cone implementation
            const distanceToTargetPos = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
            const innerAwarenessRadius = AI.awarenessRange[eid] * 0.2; // 20% of awareness range
            
            // If target is outside the inner radius, check if it's within the awareness cone
            if (distanceToTargetPos > innerAwarenessRadius) {
                // Get agent's forward direction from transform
                const agentTransform = getSpawnTransform(ctx, eid);
                const forwardVec = new THREE.Vector3(0, 0, -1); // Default forward in Three.js
                forwardVec.applyQuaternion(agentTransform.rotation);
                
                // Calculate angle between forward direction and target direction on XZ plane
                const targetDirXZ = { x: dir.x, z: dir.z };
                const forwardDirXZ = { x: forwardVec.x, z: forwardVec.z };
                
                // Normalize vectors for angle calculation
                const targetMagnitudeXZ = Math.sqrt(targetDirXZ.x * targetDirXZ.x + targetDirXZ.z * targetDirXZ.z);
                const forwardMagnitudeXZ = Math.sqrt(forwardDirXZ.x * forwardDirXZ.x + forwardDirXZ.z * forwardDirXZ.z);
                
                if (targetMagnitudeXZ > 0 && forwardMagnitudeXZ > 0) {
                    const targetNormXZ = { x: targetDirXZ.x / targetMagnitudeXZ, z: targetDirXZ.z / targetMagnitudeXZ };
                    const forwardNormXZ = { x: forwardDirXZ.x / forwardMagnitudeXZ, z: forwardDirXZ.z / forwardMagnitudeXZ };
                    
                    // Calculate dot product for angle
                    const dotProduct = targetNormXZ.x * forwardNormXZ.x + targetNormXZ.z * forwardNormXZ.z;
                    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // Clamp to avoid NaN
                    
                    // 160 degree cone = 80 degrees on each side
                    const maxAngle = (160 * Math.PI) / 360; // 80 degrees in radians
                    
                    if (angle > maxAngle) {
                        return true; // Target is outside awareness cone, skip it
                    }
                }
            }

            const ray = new RAPIER.Ray(raycastEntityPos, dir);
            const rayHit = ctx.rapier.world.castRay(
                ray,
                AI.awarenessRange[eid],
                true,
                RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
                SIGHT_MASK,
                undefined,
                entityRb,
                undefined
            );

            if (rayHit.collider.parent().handle !== colliderParentHandle) {
                return true; // continue to next collider
            }

            const toi = rayHit.timeOfImpact;
            if (toi < distanceToTarget) {
                distanceToTarget = toi;
                action.targetEid = otherEid;
                action.type = AIActionType.ATTACK; // prioritize attack action
            }
            return true; // continue to next collider
        },
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        SIGHT_MASK,
        undefined,
        entityRb,
        undefined
    );

    return action;
}

function updateTargetPos(
    nextAction: AIAction,
    eid: number,
    crowd: Crowd,
    dt: number,
    navBasePos: { x: number; y: number; z: number }
) {
    if (nextAction.targetEid === null) {
        AI._state[eid] = AIState.WANDER;
        AI._targetEid[eid] = -1;
    } else {
        AI._state[eid] = AIState.CHASE;
        AI._targetEid[eid] = nextAction.targetEid;
        AI._target[eid][0] = Transform.x[nextAction.targetEid];
        AI._target[eid][1] = Transform.y[nextAction.targetEid];
        AI._target[eid][2] = Transform.z[nextAction.targetEid];
        AI._updateTargetCooldown[eid] = 0; // reset cooldown
    }

    if (AI._state[eid] === AIState.WANDER) {
        if (AI._updateTargetCooldown[eid] <= 0) {
            // Use snapped/agent position to sample wander points
            const around = navBasePos ?? { x: Transform.x[eid], y: Transform.y[eid], z: Transform.z[eid] };
            const range = Math.max(1, AI.awarenessRange[eid] || 1);

            const res = crowd.navMeshQuery.findRandomPointAroundCircle(around, range);
            if (res.success) {
                AI._target[eid][0] = res.randomPoint.x;
                AI._target[eid][1] = res.randomPoint.y;
                AI._target[eid][2] = res.randomPoint.z;
                AI._updateTargetCooldown[eid] = Math.random() * 2 + 5; // 5-7 seconds
            } else {
                // Fallback so target never stays (0,0,0)
                AI._target[eid][0] = around.x;
                AI._target[eid][1] = around.y;
                AI._target[eid][2] = around.z;
                AI._updateTargetCooldown[eid] = 1.0; // retry soon
            }
        } else {
            AI._updateTargetCooldown[eid] = Math.max(0, AI._updateTargetCooldown[eid] - dt);
        }
    }
}

export const updateAISystem = (ctx: ECSContext) => {
    const deltaTime = getResource<number>(ctx, 'deltaTime') || 1 / 60;
    const crowd = getCrowd(ctx);
    const crowdAgentsMap = getResource<Map<number, CrowdAgent>>(ctx, 'crowdAgents');
    const bodyMod = getModule<ReturnType<typeof bodyModule>>(ctx, 'body');
    const motionSourceMod = getModule<ReturnType<typeof motionSourceModule>>(ctx, "motionSource");

    const eids = AIQuery(ctx);

    for (const eid of eids) {
        // Resolve agent position (at base, not center)
        let entityPos = {
            x: Transform.x[eid] || 0,
            y: Transform.y[eid] || 0,
            z: Transform.z[eid] || 0
        };
        if (crowd) {
            let entityPosSnapRes = crowd.navMeshQuery.findClosestPoint(entityPos, { halfExtents: { x: 0.1, y: 100, z: 0.1 } });
            if (RECAST.statusSucceed(entityPosSnapRes.status)) {
                entityPos = entityPosSnapRes.point;
            }
        }

        let agent = crowdAgentsMap.get(eid);
        // If no agent exists, create one
        if (!agent) {
            if (!crowd) {
                continue
            }

            let speed = 5; // Default speed
            if (hasComponent(ctx, MotionSource, eid)) {
                const motionSource = motionSourceMod.get(MotionSource.motionSourceId[eid]);
                if (motionSource && motionSource.controller) {
                    if (motionSource.controller.type === "character") {
                        speed = motionSource.controller.speed;
                    }
                }
            }

            // Get bounds of body to determine agent size
            let r = 0.5;
            let h = 2;
            if (hasComponent(ctx, Body, eid)) {
                const bodyDef = bodyMod.get(Body.bodyId[eid]);
                // Use cached local bounds
                const size = new THREE.Vector3();
                bodyDef.localBounds.getSize(size);
                r = Math.max(size.x, size.z) / 2;
                h = size.y;
            }

            agent = addCrowdAgent(ctx, entityPos, {
                radius: r,
                height: h,
                maxSpeed: speed,
                maxAcceleration: 15.0
            });

            if (agent) {
                crowdAgentsMap.set(eid, agent);
            } else {
                console.warn('Failed to create crowd agent for entity', eid);
                continue
            }
        }

        // Needed to reset agents position - we are driving them with orchestrators.
        // Agent y is at the base of the agent, so offset by half height
        agent.teleport(entityPos);

        {
            const t0 = AI._target[eid][0];
            const t1 = AI._target[eid][1];
            const t2 = AI._target[eid][2];
            const invalid =
                !Number.isFinite(t0) || !Number.isFinite(t1) || !Number.isFinite(t2) ||
                (t0 === 0 && t1 === 0 && t2 === 0);
            if (invalid) {
                AI._target[eid][0] = entityPos.x;
                AI._target[eid][1] = entityPos.y;
                AI._target[eid][2] = entityPos.z;
            }
        }

        const nextAction = prioritizeNextAction(ctx, eid);

        // Record the targeted entity in memory if not null
        if (nextAction.targetEid !== null) {
            try {
                const memory = getMemory(ctx, eid);
                memory.lastTargeted = {
                    entity: nextAction.targetEid,
                    happenedAt: performance.now()
                };
            } catch (error) {
                console.warn('Failed to update AI memory for targeting:', error);
            }
        }

        updateTargetPos(nextAction, eid, crowd, deltaTime, entityPos);

        _InputState.interact[eid] = nextAction.type === AIActionType.INTERACTWITH ? 1 : 0;
        _InputState.primary[eid] = nextAction.type === AIActionType.ATTACK ? 1 : 0;
        _InputState.secondary[eid] = nextAction.type === AIActionType.ATTACK ? 1 : 0;

        // request needs to come before updateCrowd
        let targetVec = {
            x: AI._target[eid][0],
            y: AI._target[eid][1],
            z: AI._target[eid][2]
        };

        // Guard against zero/invalid target -> fall back to current position
        const invalidTarget =
            !Number.isFinite(targetVec.x) || !Number.isFinite(targetVec.y) || !Number.isFinite(targetVec.z) ||
            (targetVec.x === 0 && targetVec.y === 0 && targetVec.z === 0);
        if (invalidTarget) {
            targetVec = entityPos;
        }

        const snapRes = crowd.navMeshQuery.findClosestPoint(targetVec, { halfExtents: { x: 1, y: 100, z: 1 } });
        if (snapRes.success) {
            targetVec = snapRes.point;
        }
        agent.requestMoveTarget(targetVec);
    }

    const didUpdate = updateCrowd(ctx, deltaTime);

    if (didUpdate) {
        // Now update the input state based on the agent's desired velocity
        for (const eid of eids) {
            // Get or create crowd agent for this entity
            let crowdAgentsMap = getResource<Map<number, CrowdAgent>>(ctx, 'crowdAgents');

            let agent = crowdAgentsMap.get(eid);

            // Get entity's current position
            const entityPos = {
                x: Transform.x[eid] || 0,
                y: Transform.y[eid] || 0,
                z: Transform.z[eid] || 0
            };

            const agentVel = agent.desiredVelocity();

            // Convert velocity to movement input
            let moveX = 0, moveY = 0, moveZ = 0;
            const velLength = Math.sqrt(agentVel.x * agentVel.x + agentVel.z * agentVel.z);

            if (velLength > 0.001) {
                // Get entity's current yaw for local space conversion
                const entityYaw = _InputState.yaw[eid] || 0;

                // Transform velocity to local space relative to entity's orientation
                const localX = Math.cos(entityYaw) * agentVel.x - Math.sin(entityYaw) * agentVel.z;
                const localZ = Math.sin(entityYaw) * agentVel.x + Math.cos(entityYaw) * agentVel.z;

                moveX = localX;
                moveY = agentVel.y;
                moveZ = localZ;
            }

            // Determine target position for aiming
            let targetVec = {
                x: AI._target[eid][0] || entityPos.x,
                y: AI._target[eid][1] || entityPos.y,
                z: AI._target[eid][2] || entityPos.z
            };

            // Safe yaw computation (avoid NaN -> frozen 0)
            const yawCandidate = yawXZ(entityPos, targetVec) + Math.PI;
            const prevYaw = _InputState.yaw[eid];
            const yaw = Number.isFinite(yawCandidate)
                ? yawCandidate
                : (Number.isFinite(prevYaw) ? prevYaw : 0);

            let pitch = 0;
            const targetEid = AI._targetEid[eid];
            if (targetEid !== undefined && targetEid !== -1) {
                const worldBoundsCenter = getWorldSpaceBoundsCenter(ctx, targetEid);
                if (worldBoundsCenter) {
                    const yawAim = yawXZ(entityPos, worldBoundsCenter) + Math.PI;
                    const pitchAim = pitchY(entityPos, worldBoundsCenter);
                    if (Number.isFinite(yawAim)) {
                        _InputState.yaw[eid] = yawAim;
                    }
                    if (Number.isFinite(pitchAim)) {
                        pitch = pitchAim;
                    }
                } else {
                    _InputState.yaw[eid] = yaw;
                }
            } else {
                _InputState.yaw[eid] = yaw;
            }

            _InputState.moveX[eid] = moveX;
            _InputState.moveY[eid] = moveY;
            _InputState.moveZ[eid] = moveZ;
            _InputState.pitch[eid] = pitch;
            _InputState.sprint[eid] = 0;
        }
    }
}