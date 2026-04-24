/**
 * Insert Body Part Command
 * Adds an existing body part definition into a composite body entity
 */

import { hasComponent } from 'bitecs';
import { EditorCommand } from '../CommandManager';
import { despawn, getEntityBundle } from '../../despawn';
import { spawn } from '../../spawn';
import { Body as BodyComponent } from '../../components/Body';
import { type ECSContext } from '../../ecs';
import { stableIdToEid } from '../../../utils/stableId';
import type { Body, Node } from '../../schema';
import { appendPartAtPath, type CompositeBody } from '../utils/bodyParts';
import { selectSingleBodyPart, selectSingleEntity } from './selectionResources';

export class InsertBodyPartCommand implements EditorCommand {
  description: string;
  private oldEid: number;
  private newEid: number | null = null;
  private fullBundle: any;
  private stableId?: number;
  private insertedPath: number[] | null = null;

  constructor(
    private ctx: ECSContext,
    eid: number,
    private part: Node,
    private parentPath: number[]
  ) {
    this.oldEid = eid;
    this.description = 'Paste body part';

    this.fullBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.stableId = this.fullBundle?.StableID?.id;
  }

  execute(): void {
    const eid = this.resolveAndUpdateCurrentEid();
    if (eid === null) {
      console.warn('[InsertBodyPart] Cannot execute - target entity missing');
      return;
    }

    const currentBundle = getEntityBundle(this.ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    const body = currentBundle.Body as Body | undefined;
    if (!body || body.type !== 'composite') {
      console.warn('[InsertBodyPart] Entity does not have composite body');
      return;
    }

    const updated = appendPartAtPath(body as CompositeBody, this.parentPath, this.part);
    if (!updated) {
      console.warn('[InsertBodyPart] Failed to append part at path', this.parentPath);
      return;
    }

    this.insertedPath = updated.path;

    despawn(this.ctx, eid);

    const newBundle = { ...currentBundle, Body: updated.body };
    this.newEid = spawn(this.ctx, newBundle);

    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
    if (resolved !== undefined && resolved !== null) {
      if (this.insertedPath) {
        selectSingleBodyPart(this.ctx, resolved, this.insertedPath);
      } else {
        selectSingleEntity(this.ctx, resolved);
      }
    }

    console.log(`[InsertBodyPart] Added body part to entity ${eid} -> ${this.newEid}`);
  }

  undo(): void {
    const eid = this.resolveAndUpdateCurrentEid();
    if (eid === null) {
      console.warn('[InsertBodyPart] Cannot undo - target entity missing');
      return;
    }

    despawn(this.ctx, eid);

    this.oldEid = spawn(this.ctx, this.fullBundle);
    this.newEid = null;

    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.oldEid;
    selectSingleEntity(this.ctx, resolved);

    console.log(`[InsertBodyPart] Restored original entity as ${this.oldEid}`);
  }

  redo(): void {
    this.execute();
  }

  private resolveAndUpdateCurrentEid(): number | null {
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

  getInsertedPartPath(): number[] | null {
    return this.insertedPath ? [...this.insertedPath] : null;
  }
}
