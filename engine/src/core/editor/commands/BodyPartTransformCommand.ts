/**
 * Body Part Transform Command
 * Records and reverts body part local transform changes for undo/redo
 * 
 * Note: Uses despawn-respawn pattern for consistency with other body commands
 * (AddBodyPartCommand, ModifyComponentCommand). This ensures proper module
 * re-registration and mesh rebuilding.
 */

import * as THREE from 'three';
import { ECSContext, getModule } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { spawn } from '../../spawn';
import { despawn, getEntityBundle } from '../../despawn';
import { hasComponent } from 'bitecs';
import { Body as BodyComponent } from '../../components/Body';
import { stableIdToEid } from '../../../utils/stableId';
import type { Body, Node } from '../../schema';
import { getPartAtPath, replacePartAtPath, type CompositeBody } from '../utils/bodyParts';
import type { BodyPartSelectionAddress } from '../../systems/editorSelection/proxyTargets';
import { selectSingleBodyPart } from './selectionResources';

interface LocalTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Convert quaternion to Euler angles (radians) using THREE.js
 */
function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { x: number; y: number; z: number } {
  const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  return { x: euler.x, y: euler.y, z: euler.z };
}

export class BodyPartTransformCommand implements EditorCommand {
  description: string;
  private oldEid: number;
  private newEid: number | null = null;
  private fullBundle: any;
  private stableId?: number;
  private readonly address: BodyPartSelectionAddress;

  constructor(
    private ctx: ECSContext,
    eid: number,
    pathOrAddress: number[] | BodyPartSelectionAddress,
    private oldTransform: LocalTransform,
    private newTransform: LocalTransform
  ) {
    this.oldEid = eid;
    this.description = `Move body part`;
    this.address = Array.isArray(pathOrAddress)
      ? { definitionPath: [...pathOrAddress], instancePath: [...pathOrAddress] }
      : {
          definitionPath: [...pathOrAddress.definitionPath],
          instancePath: pathOrAddress.instancePath ? [...pathOrAddress.instancePath] : undefined,
        };
    
    // Capture the full entity bundle for restore
    this.fullBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.stableId = this.fullBundle?.StableID?.id;
  }

  execute(): void {
    this.applyTransform(this.newTransform);
  }

  undo(): void {
    this.applyTransform(this.oldTransform);
  }

  redo(): void {
    this.execute();
  }

  private applyTransform(transform: LocalTransform): void {
    const eid = this.resolveCurrentEid();
    if (eid === null) {
      console.warn('[BodyPartTransformCommand] Cannot apply - target entity missing');
      return;
    }

    // Get current bundle
    const currentBundle = getEntityBundle(this.ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    
    // Check if entity has composite body
    const body = currentBundle.Body as Body | undefined;
    if (!body || body.type !== 'composite') {
      console.warn('[BodyPartTransformCommand] Entity does not have composite body');
      return;
    }

    // Get the part at path
    const partPath = this.address.definitionPath;
    const part = getPartAtPath(body as CompositeBody, partPath);
    if (!part) {
      console.warn('[BodyPartTransformCommand] Part not found at path:', partPath);
      return;
    }

    // Convert quaternion to euler for schema
    const euler = quaternionToEuler(transform.rotation);

    // Update part with new transform
    const updatedPart: Node = {
      ...part,
      localPosition: transform.position,
      localRotation: { x: euler.x, y: euler.y, z: euler.z },
      localScale: transform.scale,
    };

    // Replace part in body
    const newBody = replacePartAtPath(body as CompositeBody, partPath, updatedPart);
    if (!newBody) {
      console.warn('[BodyPartTransformCommand] Failed to update body');
      return;
    }

    despawn(this.ctx, eid);

    const newBundle = { ...currentBundle, Body: newBody };
    this.newEid = spawn(this.ctx, newBundle);

    // Re-select entity and body part
    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
    if (resolved !== undefined && resolved !== null) {
      selectSingleBodyPart(this.ctx, resolved, partPath, this.address);
    }

    console.log(`[BodyPartTransformCommand] Updated body part transform for entity ${eid} -> ${this.newEid}`);
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

  getCurrentEntityId(): number {
    return this.newEid ?? this.oldEid;
  }
}
