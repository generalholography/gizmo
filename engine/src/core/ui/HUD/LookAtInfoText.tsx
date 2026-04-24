import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { getEntityFromBody } from "../../systems/motion";
import { useAPI } from "../App";
import { MotionSource, Info } from "../../components";
import { hasComponent } from "bitecs";
import { Tag, Typography } from "antd";
import { getModule } from "../../ecs";
import { getEntityBundle } from "../../despawn";
import { ENGINE_UI_ROOT_ID } from "../../..";
import { decode } from "../../../utils/strings";
import { getRuleModule } from "../../../modules/rule";

type LookedAt = {
    eid: number,
}

const LOOKAT_SHOW_NAME_RAYCAST_RANGE = 12;

export function canShowInteractPrompt(ctx: any, eid: number | undefined): boolean {
    if (eid === undefined) return false;
    return getRuleModule(ctx).hasEngineTriggerForEntity(eid, 'interact');
}

export default function LookAtInfoText() {
    const api = useAPI();
    const [lookedAt, setLookedAt] = useState<LookedAt | undefined>(undefined);
    const [isInInteractionRange, setIsInInteractionRange] = useState<boolean>(false);
    const prevHitRef = useRef<number | undefined>(undefined);

    const showDeepData = api.isDebugMode();

    useEffect(() => {
        if (!api) return;
        let running = true;
        const ctx = api.ecsWorld;
        const camera = api.camera;
        const rapierWorld: RAPIER.World = api.physicsWorld;

        function castLookRay() {
            const playerEid = api.getPlayerEid();
            if (playerEid === undefined) return;

            // Camera world position and direction
            const origin = new THREE.Vector3();
            camera.getWorldPosition(origin);
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);

            // Raycast
            const ray = new RAPIER.Ray(origin, direction);
            let hit = rapierWorld.castRay(
                ray,
                LOOKAT_SHOW_NAME_RAYCAST_RANGE,
                true,
                RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
                undefined,
                undefined,
                ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[playerEid])
            );
            // if (!hit) {
            //     hit = rapierWorld.castRay(
            //         ray,
            //         LOOKAT_SHOW_NAME_RAYCAST_RANGE,
            //         true,
            //         undefined,
            //         undefined,
            //         undefined,
            //         ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[playerEid])
            //     );
            // }

            let hitEid: number | undefined = undefined;
            let hitDistance: number | undefined = undefined;
            if (hit && hit.collider) {
                const rb = hit.collider.parent();
                if (rb) {
                    hitEid = getEntityFromBody(ctx, rb.handle);
                    hitDistance = hit.timeOfImpact;
                }
            }

            // Set isInInteractionRange
            if (
                hitEid !== undefined &&
                canShowInteractPrompt(ctx, hitEid) &&
                hitDistance !== undefined
            ) {
                // Use default interaction range of 7 for UI
                const range = 7;
                setIsInInteractionRange(hitDistance <= range);
            } else {
                setIsInInteractionRange(false);
            }

            // Force rerender every frame there is a hit if showing deep data for responsive updates
            if (prevHitRef.current !== hitEid || (showDeepData && hitEid)) {
                prevHitRef.current = hitEid;
                setLookedAt({ eid: hitEid });
            }
        }

        let frameId: number;
        function loop() {
            if (!running) return;
            castLookRay();
            frameId = requestAnimationFrame(loop);
        }
        loop();

        return () => {
            running = false;
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [api, showDeepData]);

    if (!api || lookedAt === undefined) return null;

    const ctx = api.ecsWorld;

    const name = hasComponent(ctx, Info, lookedAt.eid) ?
        decode(Info.name[lookedAt.eid]) :
        null;

    let interactionText = null;
    if (canShowInteractPrompt(ctx, lookedAt.eid)) {
        interactionText = `to interact`; // For now, just show generic text
    }

    let deepData: string | null = null;
    if (showDeepData) {
        try {
            const bundle = getEntityBundle(ctx, lookedAt.eid);
            if (bundle) {
                const bundleString = JSON.stringify(bundle, null, 2);
                if (bundleString !== "{}") {
                    deepData = bundleString
                }
            }
        } catch (e) {
            deepData = "Error serializing entity bundle";
        }
    }

    return (
        <>
            <Typography.Text style={{ fontWeight: 'bolder', whiteSpace: 'normal', wordBreak: 'normal', display: 'block', textAlign: 'center' }}>
                {name}
            </Typography.Text>
            <Typography.Text
                type={isInInteractionRange ? undefined : "secondary"}
                style={{
                    whiteSpace: 'nowrap',
                    wordBreak: 'normal',
                    display: 'block',
                    textAlign: 'center'
                }}
            >
                {interactionText && <><Tag>{"E"}</Tag>{interactionText}</>}
            </Typography.Text >
            {deepData && ReactDOM.createPortal(
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        right: 0,
                        zIndex: 9999,
                        background: "rgba(0,0,0,0.85)",
                        color: "#fff",
                        fontSize: "10px",
                        padding: "8px 16px",
                        maxHeight: "40vh",
                        overflow: "auto",
                        pointerEvents: "auto",
                        width: "40vw",
                        boxSizing: "border-box",
                    }}
                >
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                        {deepData}
                    </pre>
                </div>, document.getElementById(ENGINE_UI_ROOT_ID)
            )}
        </>
    );
}
