/**
 * Transform Command
 * Records and reverts transform changes for undo/redo
 */

import { ECSContext } from '../../ecs';
import { Transform } from '../../components/Transform';
import { EditorCommand } from '../CommandManager';
import { hasComponent } from 'bitecs';
import { syncObject3DTransformFromECS } from '../../systems/bodyRendering';
import { stableIdToEid } from '../../../utils/stableId';

interface TransformState {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  sx: number;
  sy: number;
  sz: number;
}

export class TransformCommand implements EditorCommand {
  description: string;
  
  constructor(
    private ctx: ECSContext,
    private eid: number,
    private oldTransform: TransformState,
    private newTransform: TransformState,
    private entityName?: string,
    private stableId?: number
  ) {
    this.description = `Move ${entityName || `Entity #${eid}`}`;
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
  
  private applyTransform(transform: TransformState): void {
    const targetEid = this.resolveEid();
    if (targetEid === null) {
      console.warn(
        `[TransformCommand] Entity ${this.stableId ?? this.eid} no longer exists or has no Transform component`
      );
      return;
    }

    Transform.x[targetEid] = transform.x;
    Transform.y[targetEid] = transform.y;
    Transform.z[targetEid] = transform.z;
    Transform.qx[targetEid] = transform.qx;
    Transform.qy[targetEid] = transform.qy;
    Transform.qz[targetEid] = transform.qz;
    Transform.qw[targetEid] = transform.qw;
    Transform.sx[targetEid] = transform.sx;
    Transform.sy[targetEid] = transform.sy;
    Transform.sz[targetEid] = transform.sz;

    // Sync visual representation
    syncObject3DTransformFromECS(this.ctx, targetEid);
  }

  private resolveEid(): number | null {
    const stableIdEid = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : undefined;
    const candidateEid = stableIdEid ?? this.eid;

    if (!hasComponent(this.ctx, Transform, candidateEid)) {
      return null;
    }

    // Update internal eid to latest resolved value to reduce future lookups
    this.eid = candidateEid;
    return candidateEid;
  }
  
  /**
   * Capture current transform state from entity
   */
  static captureTransform(ctx: ECSContext, eid: number): TransformState {
    return {
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
  }
}
