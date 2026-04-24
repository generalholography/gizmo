import * as THREE from 'three';
import { hasComponent } from 'bitecs';
import { ECSContext, getModule, getResource, setResource } from '../../ecs';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Transform } from '../../components/Transform';
import { Body as BodyComponent } from '../../components/Body';
import { rebuildBodyRenderObject, syncObject3DTransformFromECS } from '../bodyRendering';
import type { TransformState } from '../../editor/commands/BulkTransformCommand';
import type { Body, Node } from '../../schema';
import { getPartAtPath, replacePartAtPath } from '../../editor/utils/bodyParts';
import {
  type BodyPartLocalTransform,
  type CompositeBody,
  decomposeMatrixToLocalTransform,
  getBodyPartWorldTransformFromDefinition
} from './bodyPartTransforms';
import type { BodyPartSelectionAddress, BodyPartSelectionTarget } from './proxyTargets';

function cloneCompositeBody(body: CompositeBody): CompositeBody {
  return JSON.parse(JSON.stringify(body)) as CompositeBody;
}

function quaternionToEuler(rotation: THREE.Quaternion): { x: number; y: number; z: number } {
  const euler = new THREE.Euler().setFromQuaternion(rotation, 'XYZ');
  return { x: euler.x, y: euler.y, z: euler.z };
}

function pathKey(path: number[]): string {
  return JSON.stringify(path);
}

function withLocalTransform(part: Node, transform: BodyPartLocalTransform): Node {
  return {
    ...part,
    localPosition: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
    localRotation: quaternionToEuler(transform.rotation),
    localScale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z }
  };
}

function definitionPathFromTarget(target: BodyPartSelectionTarget | undefined): number[] | undefined {
  if (!target) return undefined;
  return target.address?.definitionPath ?? target.path;
}

function buildAddressFromPath(path: number[]): BodyPartSelectionAddress {
  return {
    definitionPath: [...path],
    instancePath: [...path],
  };
}

export function ensureTransformDragLifecycle(
  ctx: ECSContext,
  transformControls: TransformControls,
  getCompositeBody: (eid: number) => CompositeBody | undefined,
  transformEpsilon = 0.0001
): void {
  const transformControlsDraggingChangeListener = getResource<((event: any) => void)>(ctx, 'transformControlsDraggingChangeListener', true);

  if (transformControlsDraggingChangeListener) return;

  const applyBodyPreviewForEntity = (
    eid: number,
    baseBody: CompositeBody,
    updates: Array<{ path: number[]; transform: BodyPartLocalTransform }>
  ): void => {
    const bodyModule = getModule<any>(ctx, 'body') as { resolve: (body: Body) => number } | undefined;
    if (!bodyModule || updates.length === 0) return;

    let previewBody = cloneCompositeBody(baseBody);
    for (const update of updates) {
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
  };

  let initialTransform: TransformState | null = null;
  let initialTransforms: Map<number, TransformState> = new Map();
  let initialPrimaryTransform: TransformState | null = null;
  let initialBodyPartTransform: { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3 } | null = null;
  let initialBodyPartMatrices: { worldMatrix: THREE.Matrix4; parentWorldMatrix: THREE.Matrix4 } | null = null;
  let initialBodyDefinition: CompositeBody | null = null;
  let initialBodyId: number | null = null;
  let bodyPartPath: number[] | null = null;
  let initialBodyPartTransforms: Map<string, {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;
    worldMatrix: THREE.Matrix4;
    parentWorldMatrix: THREE.Matrix4;
  }> = new Map();
  let initialPrimaryPartTransform: { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3 } | null = null;

  const handleDraggingChanged = (event: any) => {
    const selectedEntity = getResource<number | undefined>(ctx, 'selectedEntity', true);
    const selectedEntitiesResource = getResource<number[] | undefined>(ctx, 'selectedEntities', true);
    if (event.value === true) {
      console.info('[editorSelection] TransformControls dragging started', {
        mode: transformControls?.mode,
        object: transformControls?.object?.name,
        selectedEntity,
        selectedEntities: selectedEntitiesResource,
        selectedBodyPartPaths: getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true),
        selectedBodyPartPath: getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true)
      });
    }
    if (selectedEntity === undefined && selectedEntitiesResource?.length) {
      console.warn(
        '[editorSelection] Dragging change ignored due to missing primary selection; multi-select snapshot unavailable',
        {
          selectedEntities: selectedEntitiesResource,
          bodyPartPaths: getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true),
          bodyPartPath: getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true)
        }
      );
    }
    if (selectedEntity === undefined || !hasComponent(ctx, Transform, selectedEntity)) return;

    const selectedBodyPartPaths = getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true);
    const selectedBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
    const primaryBodyPartPath = selectedBodyPartPath ?? selectedBodyPartPaths?.[0];
    const isMultiPartSelected = selectedBodyPartPaths && selectedBodyPartPaths.length > 1;
    const isBodyPartSelected = !!(primaryBodyPartPath && primaryBodyPartPath.length > 0) || !!(selectedBodyPartPaths && selectedBodyPartPaths.length > 0);

    if (event.value === true) {
      if (isBodyPartSelected) {
        setResource(ctx, 'partPreviewDirtySubtreeSignatures', undefined);
        const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
        const entityRoot = renderObjects?.get(selectedEntity);

        if (isMultiPartSelected && entityRoot && selectedBodyPartPaths) {
          initialBodyPartTransforms.clear();
          const bodyDefinition = getCompositeBody(selectedEntity);
          const selectedBodyPartSelectionTargets = getResource<Map<string, BodyPartSelectionTarget> | undefined>(ctx, 'selectedBodyPartSelectionTargets', true);
          initialBodyDefinition = bodyDefinition ? cloneCompositeBody(bodyDefinition) : null;
          initialBodyId = BodyComponent.bodyId[selectedEntity];
          setResource(ctx, 'partPreviewBaseBody', initialBodyDefinition ?? undefined);
          setResource(ctx, 'partPreviewBaseBodyId', initialBodyId ?? undefined);

          for (const partPath of selectedBodyPartPaths) {
            const target = selectedBodyPartSelectionTargets?.get(pathKey(partPath));
            let resolved = getBodyPartWorldTransformFromDefinition(bodyDefinition, partPath, entityRoot.matrixWorld);
            if (target && target.entityId === selectedEntity) {
              const localMatrix = target.parentWorldMatrix.clone().invert().multiply(target.worldMatrix);
              resolved = {
                localTransform: decomposeMatrixToLocalTransform(localMatrix),
                worldMatrix: target.worldMatrix.clone(),
                parentWorldMatrix: target.parentWorldMatrix.clone()
              };
            }
            if (!resolved) continue;

            initialBodyPartTransforms.set(pathKey(partPath), {
              position: resolved.localTransform.position.clone(),
              rotation: resolved.localTransform.rotation.clone(),
              scale: resolved.localTransform.scale.clone(),
              worldMatrix: resolved.worldMatrix.clone(),
              parentWorldMatrix: resolved.parentWorldMatrix.clone()
            });
          }

          const partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
          if (partCentroidHelper) {
            setResource(ctx, 'partCentroidInitial', {
              x: partCentroidHelper.position.x,
              y: partCentroidHelper.position.y,
              z: partCentroidHelper.position.z,
              qx: partCentroidHelper.quaternion.x,
              qy: partCentroidHelper.quaternion.y,
              qz: partCentroidHelper.quaternion.z,
              qw: partCentroidHelper.quaternion.w,
              sx: partCentroidHelper.scale.x,
              sy: partCentroidHelper.scale.y,
              sz: partCentroidHelper.scale.z
            });
          }

          const primaryPath = selectedBodyPartPaths[0];
          const primaryTarget = selectedBodyPartSelectionTargets?.get(pathKey(primaryPath));
          let primaryResolved = getBodyPartWorldTransformFromDefinition(bodyDefinition, primaryPath, entityRoot.matrixWorld);
          if (primaryTarget && primaryTarget.entityId === selectedEntity) {
            const primaryLocalMatrix = primaryTarget.parentWorldMatrix.clone().invert().multiply(primaryTarget.worldMatrix);
            primaryResolved = {
              localTransform: decomposeMatrixToLocalTransform(primaryLocalMatrix),
              worldMatrix: primaryTarget.worldMatrix.clone(),
              parentWorldMatrix: primaryTarget.parentWorldMatrix.clone()
            };
          }
          if (primaryResolved) {
            initialPrimaryPartTransform = {
              position: primaryResolved.localTransform.position.clone(),
              rotation: primaryResolved.localTransform.rotation.clone(),
              scale: primaryResolved.localTransform.scale.clone()
            };
            bodyPartPath = [...primaryPath];
          }

          setResource(ctx, 'multiPartInitialTransforms', new Map(initialBodyPartTransforms));
          setResource(ctx, 'multiPartPrimaryInitial', initialPrimaryPartTransform);
        } else if (entityRoot && primaryBodyPartPath) {
          const bodyDefinition = getCompositeBody(selectedEntity);
          const selectedBodyPartSelectionTarget = getResource<BodyPartSelectionTarget | undefined>(ctx, 'selectedBodyPartSelectionTarget', true);
          const targetMatchesPrimary = !!(
            selectedBodyPartSelectionTarget &&
            selectedBodyPartSelectionTarget.entityId === selectedEntity &&
            definitionPathFromTarget(selectedBodyPartSelectionTarget)?.length === primaryBodyPartPath.length &&
            definitionPathFromTarget(selectedBodyPartSelectionTarget)?.every((value, index) => value === primaryBodyPartPath[index])
          );
          initialBodyDefinition = bodyDefinition ? cloneCompositeBody(bodyDefinition) : null;
          initialBodyId = BodyComponent.bodyId[selectedEntity];
          setResource(ctx, 'partPreviewBaseBody', initialBodyDefinition ?? undefined);
          setResource(ctx, 'partPreviewBaseBodyId', initialBodyId ?? undefined);

          let resolved = getBodyPartWorldTransformFromDefinition(bodyDefinition, primaryBodyPartPath, entityRoot.matrixWorld);
          if (targetMatchesPrimary && selectedBodyPartSelectionTarget) {
            const localMatrix = selectedBodyPartSelectionTarget.parentWorldMatrix
              .clone()
              .invert()
              .multiply(selectedBodyPartSelectionTarget.worldMatrix);

            resolved = {
              localTransform: decomposeMatrixToLocalTransform(localMatrix),
              worldMatrix: selectedBodyPartSelectionTarget.worldMatrix.clone(),
              parentWorldMatrix: selectedBodyPartSelectionTarget.parentWorldMatrix.clone()
            };
          }

          if (resolved) {
            initialBodyPartTransform = {
              position: resolved.localTransform.position.clone(),
              rotation: resolved.localTransform.rotation.clone(),
              scale: resolved.localTransform.scale.clone()
            };
            initialBodyPartMatrices = {
              worldMatrix: resolved.worldMatrix.clone(),
              parentWorldMatrix: resolved.parentWorldMatrix.clone()
            };
            bodyPartPath = [...primaryBodyPartPath];
            setResource(ctx, 'partPreviewSingleMatrices', initialBodyPartMatrices);
            setResource(ctx, 'partPreviewSinglePath', bodyPartPath);
          }
        }
      } else {
        const selectedEntitiesResource = getResource<number[] | undefined>(ctx, 'selectedEntities', true);

        if (selectedEntitiesResource && selectedEntitiesResource.length > 1) {
          initialTransforms.clear();
          for (const eid of selectedEntitiesResource) {
            if (hasComponent(ctx, Transform, eid)) {
              initialTransforms.set(eid, {
                x: Transform.x[eid],
                y: Transform.y[eid],
                z: Transform.z[eid],
                qx: Transform.qx[eid],
                qy: Transform.qy[eid],
                qz: Transform.qz[eid],
                qw: Transform.qw[eid],
                sx: Transform.sx[eid],
                sy: Transform.sy[eid],
                sz: Transform.sz[eid],
              });
            }
          }

          const centroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'centroidHelper', true);
          if (centroidHelper) {
            initialPrimaryTransform = {
              x: centroidHelper.position.x,
              y: centroidHelper.position.y,
              z: centroidHelper.position.z,
              qx: centroidHelper.quaternion.x,
              qy: centroidHelper.quaternion.y,
              qz: centroidHelper.quaternion.z,
              qw: centroidHelper.quaternion.w,
              sx: centroidHelper.scale.x,
              sy: centroidHelper.scale.y,
              sz: centroidHelper.scale.z,
            };
            setResource(ctx, 'centroidInitial', initialPrimaryTransform);
          }
          setResource(ctx, 'multiSelectInitialTransforms', new Map(initialTransforms));
          setResource(ctx, 'multiSelectPrimaryInitial', initialPrimaryTransform);
        } else {
          initialTransform = {
            x: Transform.x[selectedEntity],
            y: Transform.y[selectedEntity],
            z: Transform.z[selectedEntity],
            qx: Transform.qx[selectedEntity],
            qy: Transform.qy[selectedEntity],
            qz: Transform.qz[selectedEntity],
            qw: Transform.qw[selectedEntity],
            sx: Transform.sx[selectedEntity],
            sy: Transform.sy[selectedEntity],
            sz: Transform.sz[selectedEntity],
          };
        }
      }
    } else if (event.value === false) {
      if (isBodyPartSelected && initialBodyPartTransforms.size > 0 && selectedBodyPartPaths) {
        const partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
        const partCentroidInitial = getResource<{ x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number; sx: number; sy: number; sz: number } | undefined>(ctx, 'partCentroidInitial', true);

        if (partCentroidHelper && partCentroidInitial) {
          partCentroidHelper.updateMatrixWorld(true);

          const initialMatrix = new THREE.Matrix4().compose(
            new THREE.Vector3(partCentroidInitial.x, partCentroidInitial.y, partCentroidInitial.z),
            new THREE.Quaternion(partCentroidInitial.qx, partCentroidInitial.qy, partCentroidInitial.qz, partCentroidInitial.qw),
            new THREE.Vector3(partCentroidInitial.sx, partCentroidInitial.sy, partCentroidInitial.sz)
          );
          const deltaMatrix = partCentroidHelper.matrixWorld.clone().multiply(initialMatrix.clone().invert());

          const transforms: Array<{
            eid: number;
            address: BodyPartSelectionAddress;
            path: number[];
            oldTransform: { position: any; rotation: any; scale: any };
            newTransform: { position: any; rotation: any; scale: any };
          }> = [];
          let anyChanged = false;

          for (const partPath of selectedBodyPartPaths) {
            const initialTransform = initialBodyPartTransforms.get(pathKey(partPath));
            if (!initialTransform) continue;

            const finalWorldMatrix = deltaMatrix.clone().multiply(initialTransform.worldMatrix);
            const finalLocalMatrix = initialTransform.parentWorldMatrix.clone().invert().multiply(finalWorldMatrix);
            const finalTransform = decomposeMatrixToLocalTransform(finalLocalMatrix);

            const positionChanged = initialTransform.position.distanceTo(finalTransform.position) > transformEpsilon;
            const rotationChanged = initialTransform.rotation.angleTo(finalTransform.rotation) > transformEpsilon;
            const scaleChanged = initialTransform.scale.distanceTo(finalTransform.scale) > transformEpsilon;

            if (positionChanged || rotationChanged || scaleChanged) {
              anyChanged = true;
              transforms.push({
                eid: selectedEntity,
                address: buildAddressFromPath(partPath),
                path: partPath,
                oldTransform: {
                  position: { x: initialTransform.position.x, y: initialTransform.position.y, z: initialTransform.position.z },
                  rotation: { x: initialTransform.rotation.x, y: initialTransform.rotation.y, z: initialTransform.rotation.z, w: initialTransform.rotation.w },
                  scale: { x: initialTransform.scale.x, y: initialTransform.scale.y, z: initialTransform.scale.z }
                },
                newTransform: {
                  position: { x: finalTransform.position.x, y: finalTransform.position.y, z: finalTransform.position.z },
                  rotation: { x: finalTransform.rotation.x, y: finalTransform.rotation.y, z: finalTransform.rotation.z, w: finalTransform.rotation.w },
                  scale: { x: finalTransform.scale.x, y: finalTransform.scale.y, z: finalTransform.scale.z }
                }
              });
            }
          }

          if (anyChanged && transforms.length > 0) {
            setResource(ctx, 'pendingBulkBodyPartTransformCommand', {
              transforms,
              timestamp: Date.now()
            });
          }

          if (!anyChanged && initialBodyId !== null) {
            BodyComponent.bodyId[selectedEntity] = initialBodyId;
            rebuildBodyRenderObject(ctx, selectedEntity);
            syncObject3DTransformFromECS(ctx, selectedEntity);
          }
        }

        initialBodyPartTransforms.clear();
        initialPrimaryPartTransform = null;
        initialBodyDefinition = null;
        initialBodyId = null;
        setResource(ctx, 'partPreviewBaseBody', undefined);
        setResource(ctx, 'partPreviewBaseBodyId', undefined);
        setResource(ctx, 'partPreviewSingleMatrices', undefined);
        setResource(ctx, 'partPreviewSinglePath', undefined);
        setResource(ctx, 'multiPartInitialTransforms', undefined);
        setResource(ctx, 'multiPartPrimaryInitial', undefined);
        setResource(ctx, 'partPreviewDirtySubtreeSignatures', undefined);
      } else if (isBodyPartSelected && initialBodyPartTransform && bodyPartPath) {
        const partCentroidHelper = getResource<THREE.Object3D | undefined>(ctx, 'partCentroidHelper', true);
        if (partCentroidHelper && initialBodyPartMatrices) {
          partCentroidHelper.updateMatrixWorld(true);
          const finalLocalMatrix = initialBodyPartMatrices.parentWorldMatrix.clone().invert().multiply(partCentroidHelper.matrixWorld);
          const finalBodyPartTransform = decomposeMatrixToLocalTransform(finalLocalMatrix);

          const positionChanged = initialBodyPartTransform.position.distanceTo(finalBodyPartTransform.position) > transformEpsilon;
          const rotationChanged = initialBodyPartTransform.rotation.angleTo(finalBodyPartTransform.rotation) > transformEpsilon;
          const scaleChanged = initialBodyPartTransform.scale.distanceTo(finalBodyPartTransform.scale) > transformEpsilon;

          if (positionChanged || rotationChanged || scaleChanged) {
            setResource(ctx, 'pendingBodyPartTransformCommand', {
              eid: selectedEntity,
              address: buildAddressFromPath(bodyPartPath),
              path: bodyPartPath,
              initialTransform: {
                position: { x: initialBodyPartTransform.position.x, y: initialBodyPartTransform.position.y, z: initialBodyPartTransform.position.z },
                rotation: { x: initialBodyPartTransform.rotation.x, y: initialBodyPartTransform.rotation.y, z: initialBodyPartTransform.rotation.z, w: initialBodyPartTransform.rotation.w },
                scale: { x: initialBodyPartTransform.scale.x, y: initialBodyPartTransform.scale.y, z: initialBodyPartTransform.scale.z }
              },
              finalTransform: {
                position: { x: finalBodyPartTransform.position.x, y: finalBodyPartTransform.position.y, z: finalBodyPartTransform.position.z },
                rotation: { x: finalBodyPartTransform.rotation.x, y: finalBodyPartTransform.rotation.y, z: finalBodyPartTransform.rotation.z, w: finalBodyPartTransform.rotation.w },
                scale: { x: finalBodyPartTransform.scale.x, y: finalBodyPartTransform.scale.y, z: finalBodyPartTransform.scale.z }
              },
              timestamp: Date.now()
            });
          } else if (initialBodyId !== null) {
            BodyComponent.bodyId[selectedEntity] = initialBodyId;
            rebuildBodyRenderObject(ctx, selectedEntity);
            syncObject3DTransformFromECS(ctx, selectedEntity);
          }
        }
        initialBodyPartTransform = null;
        initialBodyPartMatrices = null;
        initialBodyDefinition = null;
        initialBodyId = null;
        bodyPartPath = null;
        setResource(ctx, 'partPreviewBaseBody', undefined);
        setResource(ctx, 'partPreviewBaseBodyId', undefined);
        setResource(ctx, 'partPreviewSingleMatrices', undefined);
        setResource(ctx, 'partPreviewSinglePath', undefined);
        setResource(ctx, 'partPreviewDirtySubtreeSignatures', undefined);
      } else if (initialTransforms.size > 0) {
        const transforms: Array<{ eid: number; oldTransform: any; newTransform: any }> = [];
        let anyChanged = false;

        for (const [eid, oldTransform] of initialTransforms.entries()) {
          if (hasComponent(ctx, Transform, eid)) {
            const newTransform = {
              x: Transform.x[eid],
              y: Transform.y[eid],
              z: Transform.z[eid],
              qx: Transform.qx[eid],
              qy: Transform.qy[eid],
              qz: Transform.qz[eid],
              qw: Transform.qw[eid],
              sx: Transform.sx[eid],
              sy: Transform.sy[eid],
              sz: Transform.sz[eid],
            };

            const changed = Object.keys(oldTransform).some(
              key => Math.abs(oldTransform[key as keyof TransformState] - newTransform[key as keyof TransformState]) > transformEpsilon
            );

            if (changed) {
              anyChanged = true;
              transforms.push({ eid, oldTransform, newTransform });
            }
          }
        }

        if (anyChanged && transforms.length > 0) {
          setResource(ctx, 'pendingBulkTransformCommand', {
            transforms,
            timestamp: Date.now()
          });
        }

        initialTransforms.clear();
        initialPrimaryTransform = null;
        setResource(ctx, 'multiSelectInitialTransforms', undefined);
        setResource(ctx, 'multiSelectPrimaryInitial', undefined);
      } else if (initialTransform) {
        const finalTransform = {
          x: Transform.x[selectedEntity],
          y: Transform.y[selectedEntity],
          z: Transform.z[selectedEntity],
          qx: Transform.qx[selectedEntity],
          qy: Transform.qy[selectedEntity],
          qz: Transform.qz[selectedEntity],
          qw: Transform.qw[selectedEntity],
          sx: Transform.sx[selectedEntity],
          sy: Transform.sy[selectedEntity],
          sz: Transform.sz[selectedEntity],
        };

        const changed = Object.keys(initialTransform).some(
          key => Math.abs(initialTransform[key as keyof TransformState] - finalTransform[key as keyof TransformState]) > transformEpsilon
        );

        if (changed) {
          setResource(ctx, 'pendingTransformCommand', {
            eid: selectedEntity,
            initialTransform,
            finalTransform,
            timestamp: Date.now()
          });
        }

        initialTransform = null;
      }
    }
  };

  transformControls.addEventListener('dragging-changed', handleDraggingChanged);
  setResource(ctx, 'transformControlsDraggingChangeListener', handleDraggingChanged, () => {
    transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
  });
}
