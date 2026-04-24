import * as THREE from 'three';
import { BodyResolved, BodyResolvedNode } from '../modules/body';

export const Z_TIE_BREAK_STEP = -1e-6;

/** Semi-transparent blue overlay used for selected CSG source part proxies. */
const CSG_PROXY_SELECTED_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/** Semi-transparent blue overlay used for selected mirrored-deform parts. */
const MIRROR_PROXY_SELECTED_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export interface MeshHierarchyOptions {
  /** Whether to set mesh.name from part.tag */
  setMeshNames?: boolean;
  /** Map to store original materials for damage flash system */
  originalMaterialsMap?: Map<number, THREE.Material>;
  /** Whether meshes should cast shadows */
  castShadow?: boolean;
  /** Whether meshes should receive shadows */
  receiveShadow?: boolean;
  /** Array to collect all lights created during hierarchy building */
  lightsCollector?: THREE.Light[];
  /** Enable z tie-breaking to reduce z-fighting using small per-mesh clip-space offsets. */
  useZTieBreaking?: boolean;
}

export function buildMeshHierarchy(
  parent: THREE.Object3D,
  parts: BodyResolved["parts"],
  options: MeshHierarchyOptions = {}
): void {
  const { setMeshNames = false, originalMaterialsMap, castShadow = true, receiveShadow = true, lightsCollector, useZTieBreaking = false } = options;

  // Counter to assign increasing z-bumps to later-defined primitives
  let zBumpIndex = 0;
  // Per-body random offset to de-synchronize across different bodies
  let baseZOffset = 0;
  if (useZTieBreaking) {
    baseZOffset = Math.round(Math.random()) * Z_TIE_BREAK_STEP;
  }

  const addPart = (parentObj: THREE.Object3D, part: BodyResolvedNode, currentPath: number[]) => {
    const canonicalPath = part.definitionPath ?? currentPath;
    if (part.type === 'group') {
      const group = new THREE.Group();
      if (setMeshNames && part.tag) {
        group.name = part.tag;
      }
      if (part.localTransform) {
        group.applyMatrix4(part.localTransform);
      }
      parentObj.add(group);

      if (part.children && part.children.length > 0) {
        for (let k = 0; k < part.children.length; k++) {
          addPart(group, part.children[k], [...currentPath, k]);
        }
      }
      return;
    }

    if (part.type === "geometry") {
      // Handle geometry part
      const mesh = new THREE.Mesh(part.mesh, part.material);
      
      // Store body-definition path so selection can identify this mesh without hierarchy walking.
      mesh.userData.bodyPartPath = canonicalPath;
      mesh.userData.instancePath = [...currentPath];

      // Apply local transform if present
      if (part.localTransform) {
        mesh.applyMatrix4(part.localTransform);
      }
      
      // Set mesh name from tag if requested
      if (setMeshNames && part.tag) {
        mesh.name = part.tag;
      }
      
      // Configure shadow properties
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      if (part.material.transparent) {
        mesh.castShadow = false; // Disable shadow casting for transparent materials
      }
      
      // Store original material if map is provided
      if (originalMaterialsMap) {
        originalMaterialsMap.set(mesh.id, part.material);
      }

      // set ignoreCollisions in userData for reference when building navMesh
      mesh.userData.ignoreCollisions = part.ignoreCollisions || false;

      // If requested, apply a tiny per-mesh z bump via per-draw uniform update
      if (useZTieBreaking) {
        const zBumpValue = baseZOffset + zBumpIndex * Z_TIE_BREAK_STEP;
        zBumpIndex++;
        mesh.userData.zBump = zBumpValue;
        // Update the shared material's uniform per draw call
        mesh.onBeforeRender = (_renderer, _scene, _camera, _geometry, material) => {
          const anyMat: any = material as any;
          const shader = anyMat?.userData?.shader;
          if (anyMat?.userData?.supportsZBump && shader?.uniforms?.zBump) {
            shader.uniforms.zBump.value = mesh.userData.zBump ?? 0;
          }
        };
      }

      // Create invisible proxy hit-meshes for each CSG source part.
      // These allow the editor to select individual source primitives of a CSG group
      // even though their geometry is merged into a single combined mesh at runtime.
      if (part.csgSourceProxies && part.csgSourceProxies.length > 0) {
        for (const proxy of part.csgSourceProxies) {
          const proxyMesh = new THREE.Mesh(proxy.geometry, CSG_PROXY_SELECTED_MATERIAL.clone());
          proxyMesh.visible = false; // invisible by default; shown when selected
          proxyMesh.castShadow = false;
          proxyMesh.receiveShadow = false;
          proxyMesh.name = `csg-proxy-${proxy.sourceIndex}`;
          // Scale very slightly outward so the overlay doesn't z-fight with the merged CSG mesh.
          proxyMesh.scale.setScalar(1.002);
          proxyMesh.userData.isCsgSourceProxy = true;
          proxyMesh.userData.csgSourceIndex = proxy.sourceIndex;
          proxyMesh.userData.bodyPartPath = [...canonicalPath, proxy.sourceIndex];
          proxyMesh.userData.instancePath = [...currentPath, proxy.sourceIndex];
          // Store the definition path of the merged CSG part so the editor can derive
          // the full source-part path as [...csgMergedPartPath, csgSourceIndex].
          proxyMesh.userData.csgMergedPartPath = canonicalPath;
          parentObj.add(proxyMesh);
        }
      }

      // Create an invisible overlay proxy for mirrored-symmetry primitives.
      // When selected in the editor this proxy is shown so mirrored halves read
      // as one selectable source part.
      if (part.hasMirrorSymmetry === true) {
        const mirrorProxy = new THREE.Mesh(part.mesh, MIRROR_PROXY_SELECTED_MATERIAL.clone());
        mirrorProxy.visible = false;
        mirrorProxy.castShadow = false;
        mirrorProxy.receiveShadow = false;
        mirrorProxy.name = 'mirror-proxy';
        mirrorProxy.scale.setScalar(1.002);
        mirrorProxy.userData.isMirrorPartProxy = true;
        mirrorProxy.userData.bodyPartPath = canonicalPath;
        mirrorProxy.userData.mirrorPartPath = canonicalPath;
        mirrorProxy.userData.instancePath = [...currentPath];

        if (part.localTransform) {
          mirrorProxy.applyMatrix4(part.localTransform);
        }

        parentObj.add(mirrorProxy);
      }
      
      parentObj.add(mesh);
      
      // Recursively add children
      if (part.children && part.children.length > 0) {
        for (let k = 0; k < part.children.length; k++) {
          addPart(mesh, part.children[k], [...currentPath, k]);
        }
      }
    } else if (part.type === "light") {
      // Handle light part - need to actually clone the light
      // since the definition is shared/cached
      const light = part.light.clone();
      
      // Apply local transform if present
      if (part.localTransform) {
        light.applyMatrix4(part.localTransform);
      }
      
      // Set light name from tag if requested
      if (setMeshNames && part.tag) {
        light.name = part.tag;
      }
      
      // Lights should never cast shadows (only the main directional light casts shadows)
      light.castShadow = false;
      
      // Collect light reference if collector is provided
      if (lightsCollector && (light instanceof THREE.PointLight || light instanceof THREE.SpotLight)) {
        lightsCollector.push(light);
      }
      
      parentObj.add(light);
      
      // For spot lights, add the target to the scene
      if (light instanceof THREE.SpotLight) {
        parentObj.add(light.target);
      }
      
      // Recursively add children
      if (part.children && part.children.length > 0) {
        for (let k = 0; k < part.children.length; k++) {
          addPart(light, part.children[k], [...currentPath, k]);
        }
      }
    }
  };

  // Add all parts to the parent, tracking definition paths starting at [i].
  for (let i = 0; i < parts.length; i++) {
    addPart(parent, parts[i], [i]);
  }
}