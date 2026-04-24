import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { ECSContext, getModule, getResource, setResource } from '../ecs';
import { getEntityFromBody } from './motion';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Transform } from '../components/Transform';
import { MotionSource } from '../components/MotionSource';
import { Body as BodyComponent } from '../components/Body';
import { hasComponent } from 'bitecs';
import { rebuildBodyRenderObject, syncObject3DTransformFromECS } from './bodyRendering';
import type { TransformState } from '../editor/commands/BulkTransformCommand';
import { computeSelectionCentroid } from '../editor/utils/selectionUtils';
import type { ArchetypeRef } from '../spawn';
import type { Body, Node } from '../schema';
import { getPartAtPath, replacePartAtPath } from '../editor/utils/bodyParts';
import { collectTransformGizmoPickers } from './editorSelection/picking';
import { resolveBodyPartSelectionTargetFromHit, type BodyPartSelectionTarget } from './editorSelection/proxyTargets';
import { applySelectionFromClick } from './editorSelection/selectionState';
import { ensureTransformDragLifecycle } from './editorSelection/dragLifecycle';
import { isTextEditingActive } from '../utils/textEditingGuards';
import {
  type BodyPartLocalTransform,
  type CompositeBody,
  decomposeMatrixToLocalTransform,
  getBodyPartWorldTransformFromDefinition
} from './editorSelection/bodyPartTransforms';

// Epsilon for detecting transform changes (avoid floating point precision issues)
const TRANSFORM_EPSILON = 0.0001;

function cloneCompositeBody(body: CompositeBody): CompositeBody {
  return JSON.parse(JSON.stringify(body)) as CompositeBody;
}

function quaternionToEuler(rotation: THREE.Quaternion): { x: number; y: number; z: number } {
  const euler = new THREE.Euler().setFromQuaternion(rotation, 'XYZ');
  return { x: euler.x, y: euler.y, z: euler.z };
}

function withLocalTransform(part: Node, transform: BodyPartLocalTransform): Node {
  return {
    ...part,
    localPosition: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
    localRotation: quaternionToEuler(transform.rotation),
    localScale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z }
  };
}

function pathKey(path: number[]): string {
  return JSON.stringify(path);
}

function selectionTargetKey(path: number[]): string {
  return JSON.stringify(path);
}

function definitionPathFromTarget(target: BodyPartSelectionTarget | undefined): number[] | undefined {
  if (!target) return undefined;
  return target.address?.definitionPath ?? target.path;
}

function isCsgSourceProxyMesh(mesh: THREE.Object3D | null): boolean {
  return !!mesh?.userData?.isCsgSourceProxy;
}

function buildCanonicalSelectionTargetFromDefinition(
  bodyDefinition: CompositeBody | undefined,
  selectionPath: number[],
  entityWorldMatrix: THREE.Matrix4,
  hitTarget: BodyPartSelectionTarget
): BodyPartSelectionTarget | undefined {
  const canonical = getBodyPartWorldTransformFromDefinition(bodyDefinition, selectionPath, entityWorldMatrix);
  if (!canonical) return undefined;

  return {
    ...hitTarget,
    worldMatrix: canonical.worldMatrix.clone(),
    parentWorldMatrix: canonical.parentWorldMatrix.clone(),
    address: {
      definitionPath: [...selectionPath],
      instancePath: hitTarget.address?.instancePath ? [...hitTarget.address.instancePath] : [...selectionPath],
    },
    path: [...selectionPath],
  };
}

function quantizePreviewValue(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

function transformSignature(transform: BodyPartLocalTransform): string {
  const p = transform.position;
  const r = transform.rotation;
  const s = transform.scale;
  return [
    quantizePreviewValue(p.x),
    quantizePreviewValue(p.y),
    quantizePreviewValue(p.z),
    quantizePreviewValue(r.x),
    quantizePreviewValue(r.y),
    quantizePreviewValue(r.z),
    quantizePreviewValue(r.w),
    quantizePreviewValue(s.x),
    quantizePreviewValue(s.y),
    quantizePreviewValue(s.z),
  ].join(',');
}

function isCsgGroupNode(node: Node | undefined): boolean {
  if (!node) return false;
  const maybeGroup = node as any;
  return maybeGroup.type === 'group' && maybeGroup.operation?.type && maybeGroup.operation.type !== 'none';
}

function isDeformedPrimitiveNode(node: Node | undefined): boolean {
  if (!node) return false;
  const maybeGroup = node as any;
  if (maybeGroup.type !== 'group') return false;
  const opType = maybeGroup.operation?.type;
  return opType === 'taper' || opType === 'mirror';
}

function deriveDirtySubtreePath(body: CompositeBody, path: number[]): number[] {
  for (let depth = path.length; depth > 0; depth--) {
    const candidatePath = path.slice(0, depth);
    const candidateNode = getPartAtPath(body, candidatePath);
    if (isCsgGroupNode(candidateNode) || isDeformedPrimitiveNode(candidateNode)) {
      return candidatePath;
    }
  }

  return path.length > 0 ? [path[0]] : path;
}

type PreviewUpdate = { path: number[]; transform: BodyPartLocalTransform };

function buildDirtySubtreeSignatures(baseBody: CompositeBody, updates: PreviewUpdate[]): Map<string, string> {
  const grouped = new Map<string, string[]>();

  for (const update of updates) {
    const subtreePath = deriveDirtySubtreePath(baseBody, update.path);
    const subtreeKey = pathKey(subtreePath);
    const signature = `${pathKey(update.path)}:${transformSignature(update.transform)}`;
    const bucket = grouped.get(subtreeKey);
    if (bucket) bucket.push(signature);
    else grouped.set(subtreeKey, [signature]);
  }

  const result = new Map<string, string>();
  for (const [subtreeKey, entries] of grouped.entries()) {
    entries.sort();
    result.set(subtreeKey, entries.join('|'));
  }

  return result;
}

export { collectTransformGizmoPickers } from './editorSelection/picking';

// Position a centroid helper unless it is actively being dragged
export function positionHelperAtCentroid(
  helper: THREE.Object3D | undefined,
  centroid: THREE.Vector3 | undefined,
  transformControls?: TransformControls
): void {
  if (!helper || !centroid) return;

  const draggingThisHelper = !!transformControls?.dragging && transformControls.object === helper;
  if (draggingThisHelper) return;

  helper.position.copy(centroid);
  helper.quaternion.set(0, 0, 0, 1);
  helper.scale.set(1, 1, 1);
}

export const editorSelectionSystem = (ctx: ECSContext): void => {
  const { scene, camera, renderer } = ctx.three;
  const rapierWorld = ctx.rapier.world;
  const transformControls = getResource<TransformControls>(ctx, 'transformControls');
  const editorClickListener = getResource<((e: MouseEvent) => void)>(ctx, 'editorClickListener');
  const editorKeyListener = getResource<((e: KeyboardEvent) => void)>(ctx, 'editorKeyListener');
  const gizmoPickerDiagnostics = new Set<string>();

  const getCompositeBody = (eid: number): CompositeBody | undefined => {
    if (!hasComponent(ctx, BodyComponent, eid)) return undefined;
    const bodyModule = getModule<any>(ctx, 'body') as { getDefinition: (id: number) => Body | undefined } | undefined;
    if (!bodyModule) return undefined;
    const definition = bodyModule.getDefinition(BodyComponent.bodyId[eid]) as Body | undefined;
    return definition?.type === 'composite' ? definition : undefined;
  };

  const applyBodyPreviewForEntity = (
    eid: number,
    baseBody: CompositeBody,
    updates: PreviewUpdate[]
  ): void => {
    const bodyModule = getModule<any>(ctx, 'body') as { resolve: (body: Body) => number } | undefined;
    if (!bodyModule || updates.length === 0) return;

    let dirtySubtreeSignatures = getResource<Map<string, string> | undefined>(ctx, 'partPreviewDirtySubtreeSignatures', true);
    if (!dirtySubtreeSignatures) {
      dirtySubtreeSignatures = new Map<string, string>();
      setResource(ctx, 'partPreviewDirtySubtreeSignatures', dirtySubtreeSignatures);
    }

    const nextDirtySubtreeSignatures = buildDirtySubtreeSignatures(baseBody, updates);
    const changedSubtreeKeys = new Set<string>();
    for (const [subtreeKey, signature] of nextDirtySubtreeSignatures.entries()) {
      const scopedKey = `${eid}:${subtreeKey}`;
      const prev = dirtySubtreeSignatures.get(scopedKey);
      if (prev !== signature) {
        changedSubtreeKeys.add(scopedKey);
        dirtySubtreeSignatures.set(scopedKey, signature);
      }
    }

    if (changedSubtreeKeys.size === 0) {
      return;
    }

    const filteredUpdates = updates.filter((update) => {
      const subtreePath = deriveDirtySubtreePath(baseBody, update.path);
      return changedSubtreeKeys.has(`${eid}:${pathKey(subtreePath)}`);
    });

    if (filteredUpdates.length === 0) {
      return;
    }

    const previewStart = performance.now();

    let previewBody = cloneCompositeBody(baseBody);
    for (const update of filteredUpdates) {
      const currentPart = getPartAtPath(previewBody, update.path);
      if (!currentPart) continue;
      const replacement = withLocalTransform(currentPart, update.transform);
      const next = replacePartAtPath(previewBody, update.path, replacement);
      if (!next) continue;
      previewBody = next;
    }

    BodyComponent.bodyId[eid] = bodyModule.resolve(previewBody);
    rebuildBodyRenderObject(ctx, eid);
    syncObject3DTransformFromECS(ctx, eid);

    const previewDurationMs = performance.now() - previewStart;
    if (previewDurationMs > 10) {
      console.warn('[editorSelection] Slow body preview rebuild', {
        eid,
        durationMs: Number(previewDurationMs.toFixed(2)),
        dirtySubtreeCount: changedSubtreeKeys.size,
        updateCount: filteredUpdates.length,
      });
    }
  };

  if (transformControls) {
    ensureTransformDragLifecycle(ctx, transformControls, getCompositeBody, TRANSFORM_EPSILON);
  }

  if (!editorClickListener) {
    // Set up click listener for entity selection or spawning
    const handleClick = (event: MouseEvent) => {
      // Only handle left clicks
      if (event.button !== 0) return;

      // Don't select when clicking on transform controls
      if (transformControls?.dragging) return;

      // Check if shift is held for body part operations
      const shiftHeld = event.shiftKey;
      
      // Check if Ctrl/Cmd is held for multi-select
      const ctrlHeld = event.ctrlKey || event.metaKey;

      // Get mouse position in normalized device coordinates (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      // Cast ray from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // If the user is clicking on the gizmo itself, let TransformControls handle it
      // and skip all selection/spawn logic so we don't clear multi-select state
      const activeSelectedEntity = getResource<number | undefined>(ctx, 'selectedEntity', true);
      const activeSelectedEntities = getResource<number[] | undefined>(ctx, 'selectedEntities', true);
      const activeSelectedBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
      const activeSelectedBodyPartPaths = getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true);
      const hasActiveSelection =
        activeSelectedEntity !== undefined ||
        (activeSelectedEntities?.length ?? 0) > 0 ||
        (activeSelectedBodyPartPath?.length ?? 0) > 0 ||
        (activeSelectedBodyPartPaths?.length ?? 0) > 0;

      if (transformControls && transformControls.object && hasActiveSelection) {
        const pickerObjects = collectTransformGizmoPickers(transformControls, gizmoPickerDiagnostics);
        if (pickerObjects.length) {
          const gizmoHits = raycaster.intersectObjects(pickerObjects, true);
          if (gizmoHits.length > 0) return;
        }
      }

      // Check if a spawn tool is active
      const spawnTool = getResource<string | null>(ctx, 'editorSpawnTool', true);
      const spawnArchetype = getResource<ArchetypeRef | null>(ctx, 'editorSpawnArchetype', true);
      
      // Get render objects for raycasting
      const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
      
      if (spawnTool && spawnArchetype) {
        // Spawn mode: raycast to find spawn position
        let spawnPosition = { x: 0, y: 0, z: 0 };
        let hitEntityId: number | undefined = undefined;
        let hitMesh: THREE.Object3D | null = null;
        let hitPoint: THREE.Vector3 | null = null;
        let hitNormal: THREE.Vector3 | null = null;
        
        // Try to hit existing objects or ground plane
        if (renderObjects) {
          const selectableObjects: THREE.Object3D[] = [];
          renderObjects.forEach(obj => selectableObjects.push(obj));
          
          const intersects = raycaster.intersectObjects(selectableObjects, true);
          if (intersects.length > 0) {
            // Spawn at hit point
            hitPoint = intersects[0].point.clone();
            hitMesh = intersects[0].object;
            hitNormal = intersects[0].face?.normal?.clone() || null;
            spawnPosition = {
              x: hitPoint.x,
              y: hitPoint.y,
              z: hitPoint.z,
            };
            
            // Find which entity was hit
            let obj: THREE.Object3D | null = hitMesh;
            while (obj) {
              for (const [eid, entityObj] of renderObjects.entries()) {
                if (entityObj === obj) {
                  hitEntityId = eid;
                  break;
                }
              }
              if (hitEntityId !== undefined) break;
              obj = obj.parent;
            }
            
            // Shift+spawn on composite body: add as body part
            if (shiftHeld && hitEntityId !== undefined && hasComponent(ctx, BodyComponent, hitEntityId)) {
              // Get entity world transform for local position calculation
              const entityRoot = renderObjects.get(hitEntityId);
              if (entityRoot) {
                // Calculate local position relative to entity
                const worldInverse = entityRoot.matrixWorld.clone().invert();
                const localPoint = hitPoint.clone().applyMatrix4(worldInverse);
                
                // Apply snapping if enabled
                const editorSnapping = getResource<boolean>(ctx, 'editorSnapping', true);
                if (editorSnapping) {
                  localPoint.x = Math.round(localPoint.x);
                  localPoint.y = Math.round(localPoint.y);
                  localPoint.z = Math.round(localPoint.z);
                }
                
                // Store body part add request
                setResource(ctx, 'pendingBodyPartAddRequest', {
                  entityId: hitEntityId,
                  archetype: spawnArchetype,
                  localPosition: { x: localPoint.x, y: localPoint.y, z: localPoint.z },
                  timestamp: Date.now()
                });
                return;
              }
            }
          } else {
            // No hit - spawn on ground plane (y=0) at camera distance
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const intersectPoint = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
              spawnPosition = {
                x: intersectPoint.x,
                y: intersectPoint.y,
                z: intersectPoint.z,
              };
            } else {
              // Fallback: spawn 10 units in front of camera
              const direction = raycaster.ray.direction.clone().multiplyScalar(10);
              const position = raycaster.ray.origin.clone().add(direction);
              spawnPosition = { x: position.x, y: position.y, z: position.z };
            }
          }
        }
        
        // Apply snapping to world spawn position if enabled
        const editorSnapping = getResource<boolean>(ctx, 'editorSnapping', true);
        if (editorSnapping) {
          spawnPosition.x = Math.round(spawnPosition.x);
          spawnPosition.y = Math.round(spawnPosition.y);
          spawnPosition.z = Math.round(spawnPosition.z);
        }
        
        // Store spawn request for UI to pick up (UI will execute AddEntityCommand)
        setResource(ctx, 'pendingSpawnRequest', {
          archetype: spawnArchetype,
          position: spawnPosition,
          timestamp: Date.now()
        });
        return; // Don't do selection when spawning
      }
      
      let selectedEid: number | undefined = undefined;
      let selectedBodyPartPath: number[] | undefined = undefined;
      let selectedBodyPartTarget: BodyPartSelectionTarget | undefined = undefined;
      let hitMesh: THREE.Object3D | null = null;
      
      // In edit mode (when not playing), use Three.js raycasting on rendered meshes
      // In play mode, use Rapier raycasting for physics-accurate selection
      if (!ctx.isPlaying) {
        // Three.js raycasting for edit mode
        // Only raycast against objects in renderObjects (entity meshes)
        if (renderObjects) {
          const selectableObjects: THREE.Object3D[] = [];
          renderObjects.forEach(obj => {
            selectableObjects.push(obj);
          });
          
          const intersects = raycaster.intersectObjects(selectableObjects, true);
          
          if (intersects.length > 0) {
            hitMesh = intersects[0].object;
            
            // Find the entity ID from the intersected object
            // Walk up the hierarchy to find the root entity object
            let obj: THREE.Object3D | null = hitMesh;
            while (obj && !renderObjects.has(selectedEid!)) {
              // Check if this object is an entity root
              for (const [eid, entityObj] of renderObjects.entries()) {
                if (entityObj === obj) {
                  selectedEid = eid;
                  break;
                }
              }
              if (selectedEid === undefined) {
                obj = obj.parent;
              } else {
                break;
              }
            }
            
            // If shift is held and we hit a composite body, find the body part path.
            // CSG source proxy meshes carry their definition path directly in userData,
            // so we don't need to walk the THREE.js hierarchy for those.
            if (shiftHeld && selectedEid !== undefined && hasComponent(ctx, BodyComponent, selectedEid)) {
              const entityRoot = renderObjects.get(selectedEid);
              if (entityRoot && hitMesh) {
                const bodyDefinition = getCompositeBody(selectedEid);
                selectedBodyPartTarget = resolveBodyPartSelectionTargetFromHit(entityRoot, hitMesh);
                selectedBodyPartPath = selectedBodyPartTarget?.address.definitionPath;

                if (selectedBodyPartPath && bodyDefinition && !getPartAtPath(bodyDefinition, selectedBodyPartPath)) {
                  selectedBodyPartPath = undefined;
                  selectedBodyPartTarget = undefined;
                } else if (
                  selectedBodyPartTarget &&
                  selectedBodyPartPath &&
                  isCsgSourceProxyMesh(hitMesh)
                ) {
                  const normalizedTarget = buildCanonicalSelectionTargetFromDefinition(
                    bodyDefinition,
                    selectedBodyPartPath,
                    entityRoot.matrixWorld,
                    selectedBodyPartTarget
                  );
                  if (normalizedTarget) {
                    selectedBodyPartTarget = normalizedTarget;
                  }
                } else if (selectedBodyPartTarget && selectedBodyPartPath) {
                  const normalizedTarget = buildCanonicalSelectionTargetFromDefinition(
                    bodyDefinition,
                    selectedBodyPartPath,
                    entityRoot.matrixWorld,
                    selectedBodyPartTarget
                  );
                  if (normalizedTarget) {
                    selectedBodyPartTarget = normalizedTarget;
                  }
                }
              }
            }
          }
        }
      } else {
        // Rapier raycasting for play mode (physics-accurate)
        const origin = raycaster.ray.origin;
        const direction = raycaster.ray.direction;
        const ray = new RAPIER.Ray(origin, direction);
        const hit = rapierWorld.castRay(
          ray,
          1000, // max distance
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
        );

        if (hit && hit.collider) {
          const rb = hit.collider.parent();
          if (rb) {
            selectedEid = getEntityFromBody(ctx, rb.handle);
          }
        }
      }

      applySelectionFromClick(ctx, selectedEid, selectedBodyPartPath, selectedBodyPartTarget, ctrlHeld, shiftHeld);
    };

    renderer.domElement.addEventListener('mousedown', handleClick);
    // Store with disposal function to clean up properly
    setResource(ctx, 'editorClickListener', handleClick, (handler) => {
      renderer.domElement.removeEventListener('mousedown', handler);
    });
  }

  if (!editorKeyListener && transformControls) {
    // Set up keyboard shortcuts for transform controls
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEditingActive(event.target)) {
        return;
      }

      if (!transformControls) return;
      
      // Handle Shift for snapping
      if (event.key === 'Shift') {
        // Enable snapping when Shift is pressed
        transformControls.setTranslationSnap(1); // Translation snapped to units of 1
        transformControls.setRotationSnap(Math.PI / 4); // Rotation snapped to units of PI/4 (45 degrees)
        transformControls.setScaleSnap(0.5); // Scale snapped to units of 0.5
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case 'v': // Select
          // Select mode doesn't change transform controls mode
          setResource(ctx, 'editorTool', 'select');
          // Clear spawn tool when selecting transform tool
          setResource(ctx, 'editorSpawnTool', null);
          setResource(ctx, 'editorSpawnArchetype', null);
          console.log('Transform mode: Select');
          break;
        case 'j': // Translate
          transformControls.setMode('translate');
          setResource(ctx, 'editorTool', 'translate');
          // Clear spawn tool when selecting transform tool
          setResource(ctx, 'editorSpawnTool', null);
          setResource(ctx, 'editorSpawnArchetype', null);
          console.log('Transform mode: Translate');
          break;
        case 'k': // Rotate
          transformControls.setMode('rotate');
          setResource(ctx, 'editorTool', 'rotate');
          // Clear spawn tool when selecting transform tool
          setResource(ctx, 'editorSpawnTool', null);
          setResource(ctx, 'editorSpawnArchetype', null);
          console.log('Transform mode: Rotate');
          break;
        case 'l': // Scale
          transformControls.setMode('scale');
          setResource(ctx, 'editorTool', 'scale');
          // Clear spawn tool when selecting transform tool
          setResource(ctx, 'editorSpawnTool', null);
          setResource(ctx, 'editorSpawnArchetype', null);
          console.log('Transform mode: Scale');
          break;
        case 'x': // Toggle space
          const currentSpace = transformControls.space === 'world' ? 'local' : 'world';
          transformControls.setSpace(currentSpace);
          console.log('Transform space:', currentSpace);
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEditingActive(event.target)) {
        return;
      }

      if (!transformControls) return;
      
      // Disable snapping when Shift is released
      if (event.key === 'Shift') {
        transformControls.setTranslationSnap(null);
        transformControls.setRotationSnap(null);
        transformControls.setScaleSnap(null);
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    // Store with disposal function to clean up properly
    setResource(ctx, 'editorKeyListener', handleKey, (handler) => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', handleKeyUp);
    });
  }

  // Update transform controls to follow selected entity
  const selectedEntity = getResource<number | undefined>(ctx, 'selectedEntity', true);
  const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
  let transformControlsInScene = getResource<boolean>(ctx, 'transformControlsInScene', true);
  
  // Get editor state from ECS resources (set by EditorContext)
  const editorTool = getResource<string>(ctx, 'editorTool', true);
  const editorTransformSpace = getResource<string>(ctx, 'editorTransformSpace', true);
  const editorSnapping = getResource<boolean>(ctx, 'editorSnapping', true);

  if (transformControls) {
    // Sync tool mode from editor state
    if (editorTool) {
      const toolMap: Record<string, 'translate' | 'rotate' | 'scale'> = {
        'translate': 'translate',
        'rotate': 'rotate',
        'scale': 'scale'
      };
      const mode = toolMap[editorTool];
      if (mode && transformControls.mode !== mode) {
        transformControls.setMode(mode);
      }
    }
    
    // Sync transform space from editor state
    if (editorTransformSpace) {
      const space = editorTransformSpace as 'world' | 'local';
      if (transformControls.space !== space) {
        transformControls.setSpace(space);
      }
    }
    
    // Sync snapping from editor state
    if (editorSnapping !== undefined) {
      if (editorSnapping) {
        transformControls.setTranslationSnap(1);
        transformControls.setRotationSnap(Math.PI / 4);
        transformControls.setScaleSnap(0.5);
      } else {
        transformControls.setTranslationSnap(null);
        transformControls.setRotationSnap(null);
        transformControls.setScaleSnap(null);
      }
    }
    
    // Get body part path from selection
    const selectedBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
    const selectedEntities = getResource<number[] | undefined>(ctx, 'selectedEntities', true);
    const selectedBodyPartPaths = getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true);
    const selectedBodyPartSelectionTarget = getResource<BodyPartSelectionTarget | undefined>(ctx, 'selectedBodyPartSelectionTarget', true);
    const selectedBodyPartSelectionTargets = getResource<Map<string, BodyPartSelectionTarget> | undefined>(ctx, 'selectedBodyPartSelectionTargets', true);
    const primaryBodyPartPath = selectedBodyPartPath ?? selectedBodyPartPaths?.[0];
    
    // Check for multi-selection (entities or parts)
    const isMultiEntitySelected = selectedEntities && selectedEntities.length > 1;
    const isMultiPartSelected = selectedBodyPartPaths && selectedBodyPartPaths.length > 1;
    const selectionTargetMatchesPrimary = !!(
      selectedEntity !== undefined &&
      selectedBodyPartSelectionTarget &&
      selectedBodyPartSelectionTarget.entityId === selectedEntity &&
      primaryBodyPartPath &&
      definitionPathFromTarget(selectedBodyPartSelectionTarget)?.length === primaryBodyPartPath.length &&
      definitionPathFromTarget(selectedBodyPartSelectionTarget)?.every((value, index) => value === primaryBodyPartPath[index])
    );

    if (
      selectedBodyPartSelectionTarget &&
      (!selectionTargetMatchesPrimary || isMultiPartSelected)
    ) {
      setResource(ctx, 'selectedBodyPartSelectionTarget', undefined);
    }
    
    if (selectedEntity !== undefined && renderObjects?.has(selectedEntity)) {
      const entityObj = renderObjects.get(selectedEntity);
      
      // Determine what object to attach transform controls to
      let targetObj: THREE.Object3D | undefined = entityObj;
      const isBodyPartSelected = !!(primaryBodyPartPath && primaryBodyPartPath.length > 0);
      const hasAnyPartSelection = isBodyPartSelected || !!(selectedBodyPartPaths && selectedBodyPartPaths.length > 0);
      
      // Handle multi-entity selection with centroid
      if (isMultiEntitySelected && !isBodyPartSelected) {
        // Create or get centroid helper
        let centroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'centroidHelper', true);
        if (!centroidHelper) {
          centroidHelper = new THREE.Object3D();
          centroidHelper.name = 'centroidHelper';
          scene.add(centroidHelper);
          setResource(ctx, 'centroidHelper', centroidHelper);
        }
        
        // Calculate and update centroid position
        const centroid = computeSelectionCentroid(ctx, selectedEntities);
        if (centroid) {
          positionHelperAtCentroid(centroidHelper, centroid, transformControls);
          targetObj = centroidHelper;
        }
      }
      // Handle multi-part selection with centroid
      else if (isMultiPartSelected && entityObj) {
        // Create or get part centroid helper
        let partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
        if (!partCentroidHelper) {
          partCentroidHelper = new THREE.Object3D();
          partCentroidHelper.name = 'partCentroidHelper';
          scene.add(partCentroidHelper);
          setResource(ctx, 'partCentroidHelper', partCentroidHelper);
        }
        
        // Calculate centroid of all selected parts using WORLD positions from body definition
        const bodyDefinition = getCompositeBody(selectedEntity);
        let sumX = 0, sumY = 0, sumZ = 0;
        let validParts = 0;
        for (const partPath of selectedBodyPartPaths) {
          const target = selectedBodyPartSelectionTargets?.get(selectionTargetKey(partPath));
          const worldPosition = new THREE.Vector3();
          if (target && target.entityId === selectedEntity) {
            worldPosition.setFromMatrixPosition(target.worldMatrix);
          } else {
            const resolved = getBodyPartWorldTransformFromDefinition(bodyDefinition, partPath, entityObj.matrixWorld);
            if (!resolved) continue;
            worldPosition.setFromMatrixPosition(resolved.worldMatrix);
          }

          sumX += worldPosition.x;
          sumY += worldPosition.y;
          sumZ += worldPosition.z;
          validParts++;
        }
        
        if (validParts > 0) {
          positionHelperAtCentroid(
            partCentroidHelper,
            new THREE.Vector3(sumX / validParts, sumY / validParts, sumZ / validParts),
            transformControls
          );
          targetObj = partCentroidHelper;
        }
      }
      // Handle single part selection
      else if (isBodyPartSelected && entityObj) {
        // Single body part selected - attach gizmo to a virtual helper resolved from source path
        let partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
        if (!partCentroidHelper) {
          partCentroidHelper = new THREE.Object3D();
          partCentroidHelper.name = 'partCentroidHelper';
          scene.add(partCentroidHelper);
          setResource(ctx, 'partCentroidHelper', partCentroidHelper);
        }

        const bodyDefinition = getCompositeBody(selectedEntity);
        const currentSelectionTarget = selectionTargetMatchesPrimary ? selectedBodyPartSelectionTarget : undefined;
        const resolved = currentSelectionTarget
          ? { worldMatrix: currentSelectionTarget.worldMatrix }
          : getBodyPartWorldTransformFromDefinition(bodyDefinition, primaryBodyPartPath!, entityObj.matrixWorld);

        if (resolved) {
          const draggingThisHelper = !!transformControls?.dragging && transformControls.object === partCentroidHelper;
          if (!draggingThisHelper) {
            resolved.worldMatrix.decompose(partCentroidHelper.position, partCentroidHelper.quaternion, partCentroidHelper.scale);
          }
          targetObj = partCentroidHelper;
        }
      }
      
      if (targetObj && transformControls.object !== targetObj) {
        transformControls.attach(targetObj);
        // Add transform controls helper to scene if not already added
        if (!transformControlsInScene) {
          scene.add(transformControls.getHelper());
          setResource(ctx, 'transformControlsInScene', true);
        }
      }

      // Sync Transform component when object is moved by TransformControls
      // Update continuously when control is attached to sync position/rotation changes  
      if (transformControls.object) {
        // Check if we're transforming a centroid helper for multi-entity selection
        const centroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'centroidHelper', true);
        const isCentroidHelper = transformControls.object === centroidHelper;
        
        // Check for multi-part selection
        const selectedBodyPartPaths = getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true);
        const isMultiPartSelected = selectedBodyPartPaths && selectedBodyPartPaths.length > 1;
        const previewBaseBody = getResource<CompositeBody | undefined>(ctx, 'partPreviewBaseBody', true);
        const previewSingleMatrices = getResource<{ worldMatrix: THREE.Matrix4; parentWorldMatrix: THREE.Matrix4 } | undefined>(ctx, 'partPreviewSingleMatrices', true);
        const previewSinglePath = getResource<number[] | undefined>(ctx, 'partPreviewSinglePath', true);
        
        // Check if we're transforming a part centroid helper
        const partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
        const isPartCentroidHelper = transformControls.object === partCentroidHelper;
        
        if (isCentroidHelper && isMultiEntitySelected) {
          // Multi-entity centroid transform
          const storedInitialTransforms = getResource<Map<number, TransformState> | undefined>(ctx, 'multiSelectInitialTransforms', true);
          const storedCentroidInitial = getResource<{ x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number; sx: number; sy: number; sz: number } | undefined>(ctx, 'centroidInitial', true);
          
          if (storedCentroidInitial && storedInitialTransforms) {
            // Calculate delta from centroid helper's initial state
            const deltaX = centroidHelper.position.x - storedCentroidInitial.x;
            const deltaY = centroidHelper.position.y - storedCentroidInitial.y;
            const deltaZ = centroidHelper.position.z - storedCentroidInitial.z;
            
            const currentQuat = centroidHelper.quaternion.clone();
            const initialQuat = new THREE.Quaternion(
              storedCentroidInitial.qx,
              storedCentroidInitial.qy,
              storedCentroidInitial.qz,
              storedCentroidInitial.qw
            );
            const deltaQuat = currentQuat.clone().multiply(initialQuat.clone().invert());
            
            const scaleFactorX = storedCentroidInitial.sx !== 0 ? centroidHelper.scale.x / storedCentroidInitial.sx : 1;
            const scaleFactorY = storedCentroidInitial.sy !== 0 ? centroidHelper.scale.y / storedCentroidInitial.sy : 1;
            const scaleFactorZ = storedCentroidInitial.sz !== 0 ? centroidHelper.scale.z / storedCentroidInitial.sz : 1;
            
            // Apply transform to all selected entities
            for (const eid of selectedEntities) {
              if (hasComponent(ctx, Transform, eid)) {
                const initialState = storedInitialTransforms.get(eid);
                if (!initialState) continue;
                
                // Apply position delta
                Transform.x[eid] = initialState.x + deltaX;
                Transform.y[eid] = initialState.y + deltaY;
                Transform.z[eid] = initialState.z + deltaZ;
                
                // Apply rotation delta
                const initialEntityQuat = new THREE.Quaternion(
                  initialState.qx,
                  initialState.qy,
                  initialState.qz,
                  initialState.qw
                );
                const newEntityQuat = initialEntityQuat.clone().premultiply(deltaQuat);
                Transform.qx[eid] = newEntityQuat.x;
                Transform.qy[eid] = newEntityQuat.y;
                Transform.qz[eid] = newEntityQuat.z;
                Transform.qw[eid] = newEntityQuat.w;
                
                // Apply scale factor
                Transform.sx[eid] = initialState.sx * scaleFactorX;
                Transform.sy[eid] = initialState.sy * scaleFactorY;
                Transform.sz[eid] = initialState.sz * scaleFactorZ;
                
                // Update physics body if present
                if (hasComponent(ctx, MotionSource, eid)) {
                  const handle = MotionSource.bodyHandle[eid];
                  if (handle !== undefined) {
                    const rb = ctx.rapier.world.getRigidBody(handle);
                    if (rb) {
                      const translation = { x: Transform.x[eid], y: Transform.y[eid], z: Transform.z[eid] };
                      const rotation = { x: Transform.qx[eid], y: Transform.qy[eid], z: Transform.qz[eid], w: Transform.qw[eid] };
                      
                      if (rb.isKinematic()) {
                        rb.setNextKinematicTranslation(translation);
                        rb.setNextKinematicRotation(rotation as any);
                      } else {
                        rb.setTranslation(translation, true);
                        rb.setRotation(rotation as any, true);
                      }
                    }
                  }
                }
                
                syncObject3DTransformFromECS(ctx, eid);
              }
            }
          }
        } else if ((isPartCentroidHelper && isMultiPartSelected) || (isPartCentroidHelper && isBodyPartSelected)) {
          if (!transformControls.dragging || !entityObj || !previewBaseBody) {
            // Body-part transforms are finalized from helper world-space deltas on drag end.
          } else if (isMultiPartSelected && selectedBodyPartPaths) {
            const storedInitialPartTransforms = getResource<Map<string, {
              position: THREE.Vector3;
              rotation: THREE.Quaternion;
              scale: THREE.Vector3;
              worldMatrix: THREE.Matrix4;
              parentWorldMatrix: THREE.Matrix4;
            }> | undefined>(ctx, 'multiPartInitialTransforms', true);
            const storedPartCentroidInitial = getResource<{ x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number; sx: number; sy: number; sz: number } | undefined>(ctx, 'partCentroidInitial', true);

            if (storedInitialPartTransforms && storedPartCentroidInitial && partCentroidHelper) {
              partCentroidHelper.updateMatrixWorld(true);
              const initialMatrix = new THREE.Matrix4().compose(
                new THREE.Vector3(storedPartCentroidInitial.x, storedPartCentroidInitial.y, storedPartCentroidInitial.z),
                new THREE.Quaternion(storedPartCentroidInitial.qx, storedPartCentroidInitial.qy, storedPartCentroidInitial.qz, storedPartCentroidInitial.qw),
                new THREE.Vector3(storedPartCentroidInitial.sx, storedPartCentroidInitial.sy, storedPartCentroidInitial.sz)
              );
              const deltaMatrix = partCentroidHelper.matrixWorld.clone().multiply(initialMatrix.clone().invert());

              const updates: Array<{ path: number[]; transform: BodyPartLocalTransform }> = [];
              for (const partPath of selectedBodyPartPaths) {
                const initialState = storedInitialPartTransforms.get(JSON.stringify(partPath));
                if (!initialState) continue;

                const finalWorldMatrix = deltaMatrix.clone().multiply(initialState.worldMatrix);
                const finalLocalMatrix = initialState.parentWorldMatrix.clone().invert().multiply(finalWorldMatrix);
                updates.push({ path: partPath, transform: decomposeMatrixToLocalTransform(finalLocalMatrix) });
              }

              applyBodyPreviewForEntity(selectedEntity, previewBaseBody, updates);
            }
          } else if (isBodyPartSelected && previewSingleMatrices && previewSinglePath && partCentroidHelper) {
            partCentroidHelper.updateMatrixWorld(true);
            const finalLocalMatrix = previewSingleMatrices.parentWorldMatrix.clone().invert().multiply(partCentroidHelper.matrixWorld);
            applyBodyPreviewForEntity(selectedEntity, previewBaseBody, [{ path: previewSinglePath, transform: decomposeMatrixToLocalTransform(finalLocalMatrix) }]);
          }
        } else {
          // Entity selected (not body part) - update entity transform
          const obj = transformControls.object;
          
          // Check if multiple entities are selected
          const selectedEntitiesResource = getResource<number[] | undefined>(ctx, 'selectedEntities', true);
          const isMultiSelect = selectedEntitiesResource && selectedEntitiesResource.length > 1;
          
          // Get stored initial transforms from ECS resources
          const storedInitialTransforms = getResource<Map<number, TransformState> | undefined>(ctx, 'multiSelectInitialTransforms', true);
          const storedPrimaryInitial = getResource<TransformState | undefined>(ctx, 'multiSelectPrimaryInitial', true);
          
          if (isMultiSelect && storedPrimaryInitial && storedInitialTransforms) {
            // Multi-entity: calculate delta from initial state and apply to all
            // Calculate delta from the primary entity's INITIAL state (not current)
            const deltaX = obj.position.x - storedPrimaryInitial.x;
            const deltaY = obj.position.y - storedPrimaryInitial.y;
            const deltaZ = obj.position.z - storedPrimaryInitial.z;
            
            // Create quaternions for rotation delta calculation
            const currentQuat = new THREE.Quaternion(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
            const initialQuat = new THREE.Quaternion(
              storedPrimaryInitial.qx,
              storedPrimaryInitial.qy,
              storedPrimaryInitial.qz,
              storedPrimaryInitial.qw
            );
            const deltaQuat = currentQuat.clone().multiply(initialQuat.clone().invert());
            
            // Scale factor from initial state (prevent division by zero)
            const scaleFactorX = storedPrimaryInitial.sx !== 0 ? obj.scale.x / storedPrimaryInitial.sx : 1;
            const scaleFactorY = storedPrimaryInitial.sy !== 0 ? obj.scale.y / storedPrimaryInitial.sy : 1;
            const scaleFactorZ = storedPrimaryInitial.sz !== 0 ? obj.scale.z / storedPrimaryInitial.sz : 1;
            
            // Apply transform to all selected entities based on their initial states
            for (const eid of selectedEntitiesResource) {
              if (hasComponent(ctx, Transform, eid)) {
                const initialState = storedInitialTransforms.get(eid);
                if (!initialState) continue;
                
                // Apply position delta from initial position
                Transform.x[eid] = initialState.x + deltaX;
                Transform.y[eid] = initialState.y + deltaY;
                Transform.z[eid] = initialState.z + deltaZ;
                
                // Apply rotation delta from initial rotation
                const initialEntityQuat = new THREE.Quaternion(
                  initialState.qx,
                  initialState.qy,
                  initialState.qz,
                  initialState.qw
                );
                const newEntityQuat = initialEntityQuat.clone().premultiply(deltaQuat);
                Transform.qx[eid] = newEntityQuat.x;
                Transform.qy[eid] = newEntityQuat.y;
                Transform.qz[eid] = newEntityQuat.z;
                Transform.qw[eid] = newEntityQuat.w;
                
                // Apply scale factor from initial scale
                Transform.sx[eid] = initialState.sx * scaleFactorX;
                Transform.sy[eid] = initialState.sy * scaleFactorY;
                Transform.sz[eid] = initialState.sz * scaleFactorZ;
                
                // Update physics body if present
                if (hasComponent(ctx, MotionSource, eid)) {
                  const handle = MotionSource.bodyHandle[eid];
                  if (handle !== undefined) {
                    const rb = ctx.rapier.world.getRigidBody(handle);
                    if (rb) {
                      const translation = { x: Transform.x[eid], y: Transform.y[eid], z: Transform.z[eid] };
                      const rotation = { x: Transform.qx[eid], y: Transform.qy[eid], z: Transform.qz[eid], w: Transform.qw[eid] };

                      if (rb.isKinematic()) {
                        rb.setNextKinematicTranslation(translation);
                        rb.setNextKinematicRotation(rotation as any);
                      } else {
                        rb.setTranslation(translation, true);
                        rb.setRotation(rotation as any, true);
                      }
                    }
                  }
                }
              }
            }
          } else {
            // Single entity: update as before
            Transform.x[selectedEntity] = obj.position.x;
            Transform.y[selectedEntity] = obj.position.y;
            Transform.z[selectedEntity] = obj.position.z;
            Transform.qx[selectedEntity] = obj.quaternion.x;
            Transform.qy[selectedEntity] = obj.quaternion.y;
            Transform.qz[selectedEntity] = obj.quaternion.z;
            Transform.qw[selectedEntity] = obj.quaternion.w;
            Transform.sx[selectedEntity] = obj.scale.x;
            Transform.sy[selectedEntity] = obj.scale.y;
            Transform.sz[selectedEntity] = obj.scale.z;

            // If the entity has a Rapier rigid body, update it as well so physics stays in sync
            if (hasComponent(ctx, MotionSource, selectedEntity)) {
              const handle = MotionSource.bodyHandle[selectedEntity];
              if (handle !== undefined) {
                const rb = ctx.rapier.world.getRigidBody(handle);
                if (rb) {
                  const translation = { x: Transform.x[selectedEntity], y: Transform.y[selectedEntity], z: Transform.z[selectedEntity] };
                  const rotation = { x: Transform.qx[selectedEntity], y: Transform.qy[selectedEntity], z: Transform.qz[selectedEntity], w: Transform.qw[selectedEntity] };

                  if (rb.isKinematic()) {
                    // For kinematic bodies, set next kinematic target
                    rb.setNextKinematicTranslation(translation);
                    rb.setNextKinematicRotation(rotation as any);
                  } else {
                    // For dynamic/fixed bodies, teleport and wake up
                    rb.setTranslation(translation, true);
                    rb.setRotation(rotation as any, true);
                  }
                }
              }
            }
          }
          syncObject3DTransformFromECS(ctx, selectedEntity);
        }
      }
    } else {
      // No selection, detach transform controls
      if (transformControls.object) {
        transformControls.detach();
      }
      // Remove from scene if present
      if (transformControlsInScene) {
        scene.remove(transformControls.getHelper());
        setResource(ctx, 'transformControlsInScene', false);
      }
    }
    
    // Clean up centroid helpers when not needed
    if (!isMultiEntitySelected) {
      const centroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'centroidHelper', true);
      if (centroidHelper && transformControls?.object === centroidHelper) {
        transformControls.detach();
      }
    }
    const hasAnyPartSelectionNow = !!(
      (selectedBodyPartPath && selectedBodyPartPath.length > 0) ||
      (selectedBodyPartPaths && selectedBodyPartPaths.length > 0)
    );
    if (!hasAnyPartSelectionNow) {
      const partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
      if (partCentroidHelper && transformControls?.object === partCentroidHelper) {
        transformControls.detach();
      }
    }
  }
};
