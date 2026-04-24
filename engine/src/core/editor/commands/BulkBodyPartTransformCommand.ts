import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import * as THREE from 'three';
import { hasComponent } from 'bitecs';
import { despawn, getEntityBundle } from '../../despawn';
import { spawn } from '../../spawn';
import { Body as BodyComponent } from '../../components/Body';
import { stableIdToEid } from '../../../utils/stableId';
import type { Body, Node } from '../../schema';
import { getPartAtPath, replacePartAtPath, type CompositeBody } from '../utils/bodyParts';
import type { BodyPartSelectionAddress } from '../../systems/editorSelection/proxyTargets';
import { selectMultipleBodyParts } from './selectionResources';

/**
 * Transform data for a single body part in bulk operation
 */
export interface BodyPartTransformData {
  eid: number;
  address?: BodyPartSelectionAddress;
  path: number[];
  oldTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
  };
  newTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
  };
}

function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { x: number; y: number; z: number } {
  const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  return { x: euler.x, y: euler.y, z: euler.z };
}

/**
 * Command that transforms multiple body parts within the same entity.
 * Uses Composite pattern to wrap multiple BodyPartTransformCommand instances.
 * Provides single undo/redo for all part transforms.
 */
export class BulkBodyPartTransformCommand implements EditorCommand {
  readonly description: string;
  private readonly transforms: BodyPartTransformData[];
  private oldEid: number;
  private newEid: number | null = null;
  private fullBundle: any;
  private stableId?: number;

  constructor(ctx: ECSContext, transforms: BodyPartTransformData[]) {
    if (transforms.length === 0) {
      throw new Error('BulkBodyPartTransformCommand requires at least one transform');
    }
    this.ctx = ctx;
    this.transforms = transforms.map((transform) => ({
      ...transform,
      path: [...transform.path],
      address: transform.address
        ? {
            definitionPath: [...transform.address.definitionPath],
            instancePath: transform.address.instancePath ? [...transform.address.instancePath] : undefined,
          }
        : undefined,
    }));
    this.oldEid = transforms[0].eid;
    this.fullBundle = getEntityBundle(ctx, this.oldEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.stableId = this.fullBundle?.StableID?.id;

    // Generate description
    this.description = `Transform ${transforms.length} body part${transforms.length > 1 ? 's' : ''}`;
  }

  private ctx: ECSContext;

  execute(): void {
    this.apply('newTransform');
  }

  undo(): void {
    this.apply('oldTransform');
  }

  redo(): void {
    this.execute();
  }

  private apply(kind: 'oldTransform' | 'newTransform'): void {
    const eid = this.resolveCurrentEid();
    if (eid === null) {
      console.warn('[BulkBodyPartTransformCommand] Cannot apply - target entity missing');
      return;
    }

    const currentBundle = getEntityBundle(this.ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    const body = currentBundle.Body as Body | undefined;
    if (!body || body.type !== 'composite') {
      console.warn('[BulkBodyPartTransformCommand] Entity does not have composite body');
      return;
    }

    let updatedBody: CompositeBody = JSON.parse(JSON.stringify(body)) as CompositeBody;
    let appliedCount = 0;

    for (const transformData of this.transforms) {
      const path = transformData.address?.definitionPath ?? transformData.path;
      const part = getPartAtPath(updatedBody, path);
      if (!part) {
        console.warn('[BulkBodyPartTransformCommand] Part not found at path:', path);
        continue;
      }

      const transform = transformData[kind];
      const euler = quaternionToEuler(transform.rotation);
      const updatedPart: Node = {
        ...part,
        localPosition: transform.position,
        localRotation: { x: euler.x, y: euler.y, z: euler.z },
        localScale: transform.scale,
      };

      const nextBody = replacePartAtPath(updatedBody, path, updatedPart);
      if (!nextBody) {
        console.warn('[BulkBodyPartTransformCommand] Failed to update part at path:', path);
        continue;
      }
      updatedBody = nextBody;
      appliedCount++;
    }

    if (appliedCount === 0) {
      return;
    }

    despawn(this.ctx, eid);

    const newBundle = { ...currentBundle, Body: updatedBody };
    this.newEid = spawn(this.ctx, newBundle);

    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
    if (resolved !== undefined && resolved !== null) {
      const selectedPaths = this.transforms.map((t) => [...(t.address?.definitionPath ?? t.path)]);
      selectMultipleBodyParts(
        this.ctx,
        resolved,
        selectedPaths,
        this.transforms.map((t) => t.address ?? {
          definitionPath: [...t.path],
          instancePath: [...t.path],
        }),
      );
    }
  }

  private resolveCurrentEid(): number | null {
    const stableEid = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : undefined;
    const candidate = stableEid ?? this.newEid ?? this.oldEid;

    if (candidate === undefined || candidate === null) {
      return null;
    }

    if (!hasComponent(this.ctx, BodyComponent, candidate)) {
      return null;
    }

    this.oldEid = candidate;
    return candidate;
  }
}
