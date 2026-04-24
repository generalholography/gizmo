import { removeComponent } from 'bitecs';
import * as Components from '../../components';
import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { applyBundle, spawn } from '../../spawn';
import { despawn, getEntityBundle } from '../../despawn';
import { stableIdToEid } from '../../../utils/stableId';
import { selectSingleEntity } from './selectionResources';

export class RemoveComponentCommand implements EditorCommand {
  description: string;
  private previousBundle: any;
  private removedData: any;
  private oldEid: number;
  private newEid: number | null = null;
  private stableId?: number;

  constructor(
    private ctx: ECSContext,
    eid: number,
    private componentName: string,
    private isStructural: boolean
  ) {
    this.description = `Remove ${componentName}`;
    this.oldEid = eid;
    this.previousBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.removedData = this.previousBundle[componentName];
    this.stableId = this.previousBundle?.StableID?.id;
  }

  execute(): void {
    const targetEid = this.resolveCurrentEid();
    if (targetEid === null) {
      console.warn(`[RemoveComponentCommand] Cannot execute - target entity missing`);
      return;
    }

    if (this.isStructural) {
      const currentBundle = getEntityBundle(this.ctx, targetEid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });
      const { [this.componentName]: _removed, ...rest } = currentBundle;
      
      despawn(this.ctx, targetEid);
      this.newEid = spawn(this.ctx, rest);
      
      // Update selection after successful respawn to avoid flicker
      const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
      selectSingleEntity(this.ctx, resolved);
    } else {
      const comp = (Components as any)[this.componentName];
      if (comp) {
        removeComponent(this.ctx, comp, targetEid);
      }
      this.oldEid = targetEid;
    }
  }

  undo(): void {
    const targetEid = this.resolveCurrentEid();
    
    if (this.isStructural && targetEid !== null) {
      despawn(this.ctx, targetEid);
      this.oldEid = spawn(this.ctx, this.previousBundle);
      this.newEid = null;
      selectSingleEntity(this.ctx, this.oldEid);
      return;
    }

    if (targetEid !== null && this.removedData !== undefined) {
      applyBundle(this.ctx, targetEid, { [this.componentName]: this.removedData });
      this.oldEid = targetEid;
    }
  }

  redo(): void {
    this.execute();
  }

  private resolveCurrentEid(): number | null {
    const stableEid = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : undefined;
    const candidate = stableEid ?? this.newEid ?? this.oldEid;

    if (candidate === undefined || candidate === null) {
      return null;
    }

    this.oldEid = candidate;
    return candidate;
  }
}
