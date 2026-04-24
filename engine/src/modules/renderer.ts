import * as THREE from "three";
import { MeshDefinition } from "./mesh";
import { MaterialDefinition } from "./material";
import { Module } from "./Module";
import { ECSContext, getModule, getResource } from "../core/ecs";
import { Held, _InputState, Transform, Body } from "../core/components";
import { hasComponent } from "bitecs";
import * as GEO from "../utils/geometry";

export type RendererPartTag = "head" | "heldItemAnchor"

export type RendererPart = {
  mesh: string | MeshDefinition;
  material: string | MaterialDefinition;
  localTransform?: number[]; // Flattened Matrix4
  /** optional position offset [x, y, z] */
  offset?: [number, number, number];
  /** optional rotation in radians [rx, ry, rz] */
  rotation?: [number, number, number];
  tag?: RendererPartTag;
};

export type RendererDefinition = {
  type: "composite";
  params: {
    parts: RendererPart[];
  };
};

export interface RendererResolved {
  parts: {
    mesh: THREE.BufferGeometry;
    material: THREE.Material;
    localTransform?: THREE.Matrix4;
    tag?: RendererPartTag;
  }[];
}

const emptyMesh: MeshDefinition = {
  type: "none",
  params: {},
}

const emptyMaterial: MaterialDefinition = {
  type: "solid",
  params: {}
};

class RendererModule extends Module<RendererDefinition, RendererResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {
      composite: (params: RendererDefinition["params"]) => {
        const parts = (params?.parts ?? []).map((p: RendererPart) => {
          const meshModule = getModule(ctx, "mesh");
          const materialModule = getModule(ctx, "material");
          const meshId = meshModule.resolve(p.mesh ?? emptyMesh);
          const materialId = materialModule.resolve(p.material ?? emptyMaterial);
          let local: THREE.Matrix4 | undefined;
          if (p.localTransform) {
            local = new THREE.Matrix4().fromArray(p.localTransform);
          } else if (p.offset || p.rotation) {
            const pos = p.offset
              ? new THREE.Vector3(p.offset[0], p.offset[1], p.offset[2])
              : new THREE.Vector3();
            const euler = p.rotation
              ? new THREE.Euler(p.rotation[0], p.rotation[1], p.rotation[2])
              : new THREE.Euler();
            const quat = new THREE.Quaternion().setFromEuler(euler);
            local = new THREE.Matrix4().compose(
              pos,
              quat,
              new THREE.Vector3(1, 1, 1)
            );
          }
          return {
            mesh: meshModule.get(meshId),
            material: materialModule.get(materialId),
            localTransform: local,
            tag: p.tag,
          };
        });
        return { parts };
      },
    });
  }

  // Overload resolve
  resolve(def: string): number;
  resolve(def: RendererDefinition): number;
  resolve(def: { parts: RendererPart[] }): number;
  resolve(def: string | RendererDefinition | { parts: RendererPart[] }): number {
    if (typeof def === "string") {
      return super.resolve(def);
    }
    if ((def as RendererDefinition).type) {
      return super.resolve(def as RendererDefinition);
    }
    return super.resolve({ type: "composite", params: def as { parts: RendererPart[] } });
  }
}

export const rendererModule = (ctx: ECSContext) => new RendererModule(ctx);

/**
* Helper to get the list of Object3Ds for a given tag from the Object3D hierarchy for a given eid.
* @param ctx - ECS Context
* @param eid - Entity id
* @param tag - Tag to look up
* @returns Array of Object3D for the tag for the eid, or empty array if none.
*/
export function getTaggedObjects(
  ctx: ECSContext,
  eid: number,
  tag: RendererPartTag
): THREE.Object3D[] {
  const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
  const rootObject = objects?.get(eid);
  if (!rootObject) return [];
  
  const taggedObjects: THREE.Object3D[] = [];
  
  // Traverse the Object3D hierarchy and collect objects with the specified tag
  rootObject.traverse((object) => {
    if (object.name === tag) {
      taggedObjects.push(object);
    }
  });
  
  return taggedObjects;
}

// helpers
export function getSpawnTransform(ctx: ECSContext, eid: number): GEO.Transform {
  //TODO: do this properly after Renderer parenting is implemented
  try {
    // Handle Held chain
    let numIter = 0;
    while (hasComponent(ctx, Held, eid) && numIter < 10) {
      eid = Held.eid[eid];
      numIter++;
    }
    if (numIter >= 10) {
      console.error(`getSpawnTransform: Too many iterations for eid ${eid}, possible Held chain loop.`);
    }

    const headObjs = getTaggedObjects(ctx, eid, "head");
    if (headObjs.length > 0) {
      const head = headObjs[0];
      const origin = head.getWorldPosition(new THREE.Vector3());
      let forward = new THREE.Vector3(0, 0, -1);

      //TODO GIO: eventually use the head's rotation to determine forward vector
      // when the renderer parenting is implemented
      let q = new THREE.Quaternion();
      if (hasComponent(ctx, _InputState, eid)) {
        const yaw = _InputState.yaw[eid] ?? 0;
        const pitch = _InputState.pitch[eid] ?? 0;
        q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        forward.applyQuaternion(q).normalize();
      }
      const spawnPos = origin.clone().add(forward);
      // return new THREE.Ray(spawnPos, forward);
      return new GEO.Transform(spawnPos, q);
    } else if (hasComponent(ctx, Body, eid)) {
      // If no head tagged object but entity has Body component, use world space bounds center
      const worldBoundsCenter = GEO.getWorldSpaceBoundsCenter(ctx, eid);
      if (worldBoundsCenter) {
        const origin = new THREE.Vector3(worldBoundsCenter.x, worldBoundsCenter.y, worldBoundsCenter.z);
        
        let q = new THREE.Quaternion();
        
        // Check if entity has InputState component for rotation
        if (hasComponent(ctx, _InputState, eid)) {
          const yaw = _InputState.yaw[eid] ?? 0;
          const pitch = _InputState.pitch[eid] ?? 0;
          q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        } else {
          // Use Transform component's rotation
          q.set(
            Transform.qx[eid] ?? 0,
            Transform.qy[eid] ?? 0,
            Transform.qz[eid] ?? 0,
            Transform.qw[eid] ?? 1
          );
        }
        
        return new GEO.Transform(origin, q);
      }
    } else if (hasComponent(ctx, Transform, eid)) {
      // Fallback to Transform component if no head tagged object found
      const origin = new THREE.Vector3(
        Transform.x[eid],
        Transform.y[eid],
        Transform.z[eid]
      );
      
      let q = new THREE.Quaternion();
      
      // Check if entity has InputState component for rotation
      if (hasComponent(ctx, _InputState, eid)) {
        const yaw = _InputState.yaw[eid] ?? 0;
        const pitch = _InputState.pitch[eid] ?? 0;
        q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      } else {
        // Use Transform component's rotation
        q.set(
          Transform.qx[eid] ?? 0,
          Transform.qy[eid] ?? 0,
          Transform.qz[eid] ?? 0,
          Transform.qw[eid] ?? 1
        );
      }
      
      return new GEO.Transform(origin, q);
    }
  } catch (error) {
    console.error(`Error getting spawn ray for entity ${eid}:`, error);
  }

  // fallback: origin at (0,0,0), direction (0,0,1)
  // return new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
  return new GEO.Transform(new THREE.Vector3(), new THREE.Quaternion());
}

export function getHeldItemTransform(
  ctx: ECSContext,
  eid: number
): { x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number } | null {
  // First, check for "heldItemAnchor" tagged objects
  const heldItemAnchors = getTaggedObjects(ctx, eid, "heldItemAnchor");
  if (heldItemAnchors.length > 0) {
    const anchor = heldItemAnchors[0];
    const worldPosition = anchor.getWorldPosition(new THREE.Vector3());
    const worldQuaternion = anchor.getWorldQuaternion(new THREE.Quaternion());
    
    return {
      x: worldPosition.x,
      y: worldPosition.y,
      z: worldPosition.z,
      qx: worldQuaternion.x,
      qy: worldQuaternion.y,
      qz: worldQuaternion.z,
      qw: worldQuaternion.w,
    };
  }

  // Fallback to the existing logic
  // TODO: this is all placeholder. eventually we will just use the transform of the
  // tagged "itemAnchor" object, but for now we need to compute a position
  // based on the Control input and the spawn ray direction.
  const t = getSpawnTransform(ctx, eid);
  let pos = t.position.clone();
  let quat = new THREE.Quaternion();
  let yaw = 0, pitch = 0;

  if (hasComponent(ctx, _InputState, eid)) {
    yaw = _InputState.yaw[eid] ?? 0;
    pitch = _InputState.pitch[eid] ?? 0;
    quat.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

    // Offset: right and down relative to yaw/pitch
    // Right vector in camera space is (1,0,0), down is (0,-1,0)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(quat);
    pos.add(right.multiplyScalar(0.3));
    pos.add(down.multiplyScalar(0.2));
  } else {
    // fallback: look along ray direction projected to XZ
    const fwdXZ = t.zAxis.clone();
    fwdXZ.y = 0;
    fwdXZ.normalize();
    if (fwdXZ.lengthSq() < 1e-6) fwdXZ.set(0, 0, 1);
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwdXZ);

    // Offset right and down in world axes
    pos.add(new THREE.Vector3(0.3, -0.2, 0));
  }
  return {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    qx: quat.x,
    qy: quat.y,
    qz: quat.z,
    qw: quat.w,
  };
}
