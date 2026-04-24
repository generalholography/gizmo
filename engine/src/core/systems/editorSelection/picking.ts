import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

/**
 * Find the body part path (indices) from entity root to hit mesh
 * Returns array of indices representing path through body parts tree
 * e.g., [0, 1] means first child of root, then second child of that
 */
export function findBodyPartPath(entityRoot: THREE.Object3D, hitMesh: THREE.Object3D): number[] | undefined {
  const rootChild = entityRoot.children.find(c => c.name === 'root');
  if (!rootChild) return undefined;

  const path: number[] = [];
  let current: THREE.Object3D | null = hitMesh;
  const ancestors: THREE.Object3D[] = [];

  while (current && current !== rootChild) {
    ancestors.unshift(current);
    current = current.parent;
  }

  if (current !== rootChild) {
    return undefined;
  }

  let parent: THREE.Object3D = rootChild;
  for (const ancestor of ancestors) {
    const index = parent.children.indexOf(ancestor);
    if (index === -1) return undefined;
    path.push(index);
    parent = ancestor;
  }

  return path.length > 0 ? path : undefined;
}

export function collectTransformGizmoPickers(
  transformControls: TransformControls & { _gizmo?: any },
  missingPickerModes?: Set<string>
): THREE.Object3D[] {
  const gizmo = transformControls?._gizmo;
  if (!gizmo) {
    if (missingPickerModes && !missingPickerModes.has('missing-gizmo')) {
      console.warn('[editorSelection] TransformControls._gizmo is missing; gizmo hit-testing disabled');
      missingPickerModes.add('missing-gizmo');
    }
    return [];
  }

  const pickerGroup =
    gizmo?.picker?.[transformControls.mode] ||
    gizmo?.[transformControls.mode]?.pickers ||
    gizmo?.[transformControls.mode]?.picker;

  const pickerObjects = (pickerGroup?.children as THREE.Object3D[]) || [];

  if (pickerObjects.length === 0 && missingPickerModes && !missingPickerModes.has(transformControls.mode)) {
    const availableKeys = Object.keys(gizmo).filter(key => key !== 'camera' && key !== 'picker' && key !== 'gizmo');
    console.warn(
      `[editorSelection] No gizmo pickers found for mode "${transformControls.mode}"; available gizmo keys: ${availableKeys.join(', ') || 'none'}`
    );
    missingPickerModes.add(transformControls.mode);
  }

  return pickerObjects;
}
