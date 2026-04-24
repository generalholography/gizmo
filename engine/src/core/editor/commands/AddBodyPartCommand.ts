/**
 * Add Body Part Command
 * Adds a primitive to a composite body entity at a specified local position
 */

import { ECSContext, getModule } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { spawn } from '../../spawn';
import { despawn, getEntityBundle } from '../../despawn';
import { hasComponent } from 'bitecs';
import { Body as BodyComponent } from '../../components/Body';
import { stableIdToEid } from '../../../utils/stableId';
import type { Body, Primitive, Node } from '../../schema';
import { selectSingleEntity } from './selectionResources';

/**
 * Geometry configurations for spawn tools
 */
const SPAWN_TOOL_GEOMETRIES: Record<string, Primitive['geometry']> = {
  cube: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
  sphere: { type: 'sphere', params: { radius: 0.5 } },
  cylinder: { type: 'cylinder', params: { radius: 0.5, height: 1 } },
  cone: { type: 'cone', params: { radius: 0.5, height: 1 } },
  pyramid: { type: 'pyramid', params: { width: 1, height: 1, depth: 1 } },
};

/**
 * Default materials for spawn tools
 */
const SPAWN_TOOL_MATERIALS: Record<string, any> = {
  cube: { type: 'solid', params: { color: '#dddddd' } },
  sphere: { type: 'solid', params: { color: '#88ccff' } },
  cylinder: { type: 'solid', params: { color: '#ffcc88' } },
  cone: { type: 'solid', params: { color: '#cc88ff' } },
  pyramid: { type: 'solid', params: { color: '#ffff88' } },
};

export class AddBodyPartCommand implements EditorCommand {
  description: string;
  private oldEid: number;
  private newEid: number | null = null;
  private fullBundle: any;
  private stableId?: number;

  constructor(
    private ctx: ECSContext,
    eid: number,
    private archetype: string,
    private localPosition: { x: number; y: number; z: number }
  ) {
    this.oldEid = eid;
    this.description = `Add ${archetype} body part`;
    
    // Capture the full entity bundle for restore
    this.fullBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.stableId = this.fullBundle?.StableID?.id;
  }

  execute(): void {
    const eid = this.resolveAndUpdateCurrentEid();
    if (eid === null) {
      console.warn('[AddBodyPart] Cannot execute - target entity missing');
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
      console.warn('[AddBodyPart] Entity does not have composite body');
      return;
    }

    // Create new body part
    const geometry = SPAWN_TOOL_GEOMETRIES[this.archetype] || SPAWN_TOOL_GEOMETRIES.cube;
    const material = SPAWN_TOOL_MATERIALS[this.archetype] || SPAWN_TOOL_MATERIALS.cube;
    
    const newPart: Primitive = {
      geometry,
      material,
      localPosition: this.localPosition,
    };

    // Add to parts array
    const newBody: Body = {
      type: 'composite',
      params: {
        ...body.params,
        parts: [...body.params.parts, newPart],
      },
    };

    despawn(this.ctx, eid);

    const newBundle = { ...currentBundle, Body: newBody };
    this.newEid = spawn(this.ctx, newBundle);

    // Re-select entity
    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
    selectSingleEntity(this.ctx, resolved);

    console.log(`[AddBodyPart] Added ${this.archetype} body part to entity ${eid} -> ${this.newEid}`);
  }

  undo(): void {
    const eid = this.resolveAndUpdateCurrentEid();
    if (eid === null) {
      console.warn('[AddBodyPart] Cannot undo - target entity missing');
      return;
    }

    despawn(this.ctx, eid);

    // Restore original entity
    this.oldEid = spawn(this.ctx, this.fullBundle);
    this.newEid = null;

    // Re-select entity
    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.oldEid;
    selectSingleEntity(this.ctx, resolved);

    console.log(`[AddBodyPart] Restored original entity as ${this.oldEid}`);
  }

  redo(): void {
    this.execute();
  }

  /**
   * Resolve current entity ID, updating internal tracking state
   * Note: This method has a side effect of updating this.oldEid for tracking
   */
  private resolveAndUpdateCurrentEid(): number | null {
    const stableEid = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : undefined;
    const candidate = stableEid ?? this.newEid ?? this.oldEid;

    if (candidate === undefined || candidate === null) {
      return null;
    }

    this.oldEid = candidate;
    return candidate;
  }

  getCurrentEntityId(): number {
    return this.newEid ?? this.oldEid;
  }
}
