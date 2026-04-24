import { defineQuery, enterQuery, exitQuery, hasComponent, removeComponent } from "bitecs";
import * as THREE from "three";
import { ECSContext, getModule, getResource, setResource } from "../ecs";
import { Transform } from "../components/Transform";
import { Body } from "../components/Body";
import { Player } from "../components";
import { DamageFlash } from "../components/DamageFlash";
import { _InputState } from "../components/_InputState";
import { getTaggedObjects } from "../../modules/renderer";
import { setWorldRotationFromEuler } from "../../utils/geometry";
import { buildMeshHierarchy } from "../../utils/meshHierarchy";
import { bodyModule } from "../../modules/body";
import { getUseLights } from "../settings";

export const damageFlashMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.FrontSide });

const bodyRenderQ = defineQuery([Body, Transform]);
const bodyRenderNew = enterQuery(bodyRenderQ);
const bodyRenderExit = exitQuery(bodyRenderQ);

let lastUseLightsState: boolean | undefined = undefined;

export function rebuildBodyRenderObject(ctx: ECSContext, eid: number): void {
  const { worldRoot } = ctx.three;
  const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
  if (!objects) return;

  const existing = objects.get(eid);
  if (existing) {
    worldRoot.remove(existing);
    objects.delete(eid);
    const originalMaterialsMap = getResource<Map<number, THREE.Material>>(ctx, 'originalMaterialsMap');
    existing.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originalMaterialsMap?.delete(child.id);
      }
    });
  }

  if (!hasComponent(ctx, Body, eid)) {
    return;
  }

  const bodyId = Body.bodyId[eid];
  const bodyMod = getModule<ReturnType<typeof bodyModule>>(ctx, 'body');
  const def = bodyMod?.get(bodyId);
  if (!def || !Array.isArray(def.parts)) {
    console.warn(`[bodyRendering] Skipping entity ${eid}: unresolved/invalid body definition for bodyId=${bodyId}`);
    return;
  }
  const group = new THREE.Group();
  const root = new THREE.Object3D();
  root.name = 'root';
  group.add(root);

  let entityLights = getResource<Map<number, THREE.Light[]>>(ctx, 'entityLights');
  if (!entityLights) {
    entityLights = new Map();
    setResource(ctx, 'entityLights', entityLights);
  }

  const previousLights = entityLights.get(eid);
  if (previousLights) {
    entityLights.delete(eid);
  }

  const originalMaterialsMap = getResource<Map<number, THREE.Material>>(ctx, 'originalMaterialsMap');
  const lights: THREE.Light[] = [];
  const useLightsEnabled = getUseLights(ctx);

  buildMeshHierarchy(root, def.parts, {
    setMeshNames: true,
    originalMaterialsMap,
    castShadow: true,
    receiveShadow: true,
    lightsCollector: lights,
    useZTieBreaking: false
  });

  if (lights.length > 0) {
    entityLights.set(eid, lights);
    for (const light of lights) {
      light.visible = useLightsEnabled;
    }
  }

  worldRoot.add(group);
  objects.set(eid, group);
  if (hasComponent(ctx, Player, eid)) {
    group.name = `Player-${eid}`;
  }
}

export const bodyRenderingSystem = (ctx: ECSContext): void => {
  const { scene, worldRoot } = ctx.three;
  const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects')!;
  const startTime = getResource<number>(ctx, 'startTime')!;
  const originalMaterialsMap = getResource<Map<number, THREE.Material>>(ctx, 'originalMaterialsMap')!;
  
  // Get or create the lights resource
  let entityLights = getResource<Map<number, THREE.Light[]>>(ctx, 'entityLights');
  if (!entityLights) {
    entityLights = new Map();
    setResource(ctx, 'entityLights', entityLights);
  }
  
  // Check if use lights setting has changed
  const currentUseLightsState = getUseLights(ctx);
  if (lastUseLightsState !== currentUseLightsState) {
    // Setting changed, update all registered lights
    for (const lights of entityLights.values()) {
      for (const light of lights) {
        light.visible = currentUseLightsState;
      }
    }
    lastUseLightsState = currentUseLightsState;
  }

  const all = bodyRenderQ(ctx);
  const newEntities = bodyRenderNew(ctx);

  for (const eid of newEntities) {
    rebuildBodyRenderObject(ctx, eid);
  }

  for (let i = 0; i < all.length; ++i) {
    const eid = all[i];
    syncObject3DTransformFromECS(ctx, eid);
    const obj = objects.get(eid);
    if (!obj) continue;
    const time = Date.now() / 1000 - startTime;

    // Apply head rotation based on InputState if present
    if (hasComponent(ctx, _InputState, eid)) {
      const headObjects = getTaggedObjects(ctx, eid, "head");
      if (headObjects.length > 0) {
        const yaw = _InputState.yaw[eid] ?? 0;
        const pitch = _InputState.pitch[eid] ?? 0;
        
        for (const headObj of headObjects) {
          // Apply pitch and yaw rotation to head objects
          // Clamp pitch to prevent over-rotation
          const clampedPitch = Math.min(Math.max(pitch, -Math.PI / 2), Math.PI / 2);
          setWorldRotationFromEuler(headObj, clampedPitch, yaw, 0);
        }
      }
    }

    if (hasComponent(ctx, DamageFlash, eid)) {
      if (ctx.time.getElapsed() - DamageFlash.startTime[eid] > 0.200) {
        removeComponent(ctx, DamageFlash, eid);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = originalMaterialsMap.get(child.id) || child.material;
          }
        });
      }
    } else {
      obj.traverse((child) => {
        const mat: any = (child as THREE.Mesh).material;
        if (mat && mat.uniforms && mat.uniforms.time) {
          mat.uniforms.time.value = time;
        }
      });
    }
  }

  // --- Part translucent overlay (CSG source + mirrored deform) ---
  // Keep exactly one proxy mesh visible, hide all others.
  const selectedEntity = getResource<number | undefined>(ctx, 'selectedEntity', true);
  const selectedBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
  let activeSelectionProxy = getResource<THREE.Mesh | undefined>(ctx, 'activeSelectionProxy', true);

  // Discard a stale activeSelectionProxy reference (e.g. after an entity's render object was rebuilt).
  if (activeSelectionProxy && !activeSelectionProxy.parent) {
    activeSelectionProxy = undefined;
    setResource(ctx, 'activeSelectionProxy', undefined);
  }

  // Determine the proxy mesh that SHOULD be visible right now.
  let targetProxy: THREE.Mesh | undefined;
  if (selectedEntity !== undefined && selectedBodyPartPath && objects) {
    const entityObj = objects.get(selectedEntity);
    if (entityObj) {
      if (selectedBodyPartPath.length >= 2) {
        const mergedPartPath = selectedBodyPartPath.slice(0, -1);
        const sourceIndex = selectedBodyPartPath[selectedBodyPartPath.length - 1];
        entityObj.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.userData.isCsgSourceProxy === true &&
            child.userData.csgSourceIndex === sourceIndex
          ) {
            const mergedPath = child.userData.csgMergedPartPath as number[] | undefined;
            if (
              mergedPath &&
              mergedPath.length === mergedPartPath.length &&
              mergedPath.every((v, j) => v === mergedPartPath[j])
            ) {
              targetProxy = child;
            }
          }
        });
      }

      if (!targetProxy) {
        entityObj.traverse((child) => {
          if (
            targetProxy === undefined &&
            child instanceof THREE.Mesh &&
            child.userData.isMirrorPartProxy === true
          ) {
            const mirrorPath = child.userData.mirrorPartPath as number[] | undefined;
            if (
              mirrorPath &&
              mirrorPath.length === selectedBodyPartPath.length &&
              mirrorPath.every((v, j) => v === selectedBodyPartPath[j])
            ) {
              targetProxy = child;
            }
          }
        });
      }
    }
  }

  if (targetProxy !== activeSelectionProxy) {
    // Hide the previously active proxy.
    if (activeSelectionProxy) {
      activeSelectionProxy.visible = false;
    }
    // Show the new target proxy.
    if (targetProxy) {
      targetProxy.visible = true;
    }
    setResource(ctx, 'activeSelectionProxy', targetProxy);
  }
  // --- end part overlay ---

  for (const eid of bodyRenderExit(ctx)) {
    const obj = objects.get(eid);
    if (obj) {
      worldRoot.remove(obj);
      objects.delete(eid);
      obj.traverse((child) => {
        const originalMaterialsMap = getResource<Map<number, THREE.Material>>(ctx, 'originalMaterialsMap')!;
        if (child instanceof THREE.Mesh) originalMaterialsMap.delete(child.id);
      });
    }
    // Clean up lights for this entity
    entityLights!.delete(eid);
  }
}

export function syncObject3DTransformFromECS(ctx: ECSContext, eid: number) {
  const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects', true);
  if (!objects) return;
  const obj = objects.get(eid);
  if (!obj) return;
  obj.position.set(Transform.x[eid], Transform.y[eid], Transform.z[eid]);
  obj.quaternion.set(
    Transform.qx[eid],
    Transform.qy[eid],
    Transform.qz[eid],
    Transform.qw[eid]
  );
  obj.scale.set(Transform.sx[eid], Transform.sy[eid], Transform.sz[eid]);
  obj.updateMatrixWorld();
}
