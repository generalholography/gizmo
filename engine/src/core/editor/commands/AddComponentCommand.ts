import { removeComponent } from 'bitecs';
import * as Components from '../../components';
import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { applyBundle, spawn } from '../../spawn';
import { despawn, getEntityBundle } from '../../despawn';
import { stableIdToEid } from '../../../utils/stableId';
import { selectSingleEntity } from './selectionResources';

export class AddComponentCommand implements EditorCommand {
  description: string;
  private originalBundle: any;
  private oldEid: number;
  private newEid: number | null = null;
  private stableId?: number;

  constructor(
    private ctx: ECSContext,
    eid: number,
    private componentName: string,
    private componentData: any,
    private isStructural: boolean
  ) {
    this.description = `Add ${componentName}`;
    this.oldEid = eid;
    this.originalBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.stableId = this.originalBundle?.StableID?.id;
  }

  execute(): void {
    const targetEid = this.resolveCurrentEid();
    if (targetEid === null) {
      console.warn(`[AddComponentCommand] Cannot execute - target entity missing`);
      return;
    }

    if (this.isStructural) {
      const currentBundle = getEntityBundle(this.ctx, targetEid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });
      const merged = {
        ...currentBundle,
        [this.componentName]: this.componentData,
      };
      
      despawn(this.ctx, targetEid);
      this.newEid = spawn(this.ctx, merged);
      
      // Update selection after successful respawn to avoid flicker
      const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
      selectSingleEntity(this.ctx, resolved);
    } else {
      applyBundle(this.ctx, targetEid, {
        [this.componentName]: this.componentData,
      });
      this.oldEid = targetEid;
    }
  }

  undo(): void {
    const targetEid = this.resolveCurrentEid();
    
    if (this.isStructural && targetEid !== null) {
      despawn(this.ctx, targetEid);
      this.oldEid = spawn(this.ctx, this.originalBundle);
      this.newEid = null;
      selectSingleEntity(this.ctx, this.oldEid);
      return;
    }

    if (targetEid !== null) {
      const comp = (Components as any)[this.componentName];
      if (comp) {
        removeComponent(this.ctx, comp, targetEid);
      }
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
