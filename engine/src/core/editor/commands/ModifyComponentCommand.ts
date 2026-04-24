/**
 * Generic Modify Component Command
 * Universal command for modifying any component with automatic field merging
 * Supports both structural (requires respawn) and non-structural (hot-swap) components
 */

import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { spawn } from '../../spawn';
import { despawn, getEntityBundle } from '../../despawn';
import { applyBundle } from '../../spawn';
import type { EngineAPI } from '../../..';
import { stableIdToEid } from '../../../utils/stableId';
import { selectSingleEntity } from './selectionResources';

type ModifyComponentCommandOptions = {
  previousComponentData?: any;
  previousBundle?: any;
};

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value: any): value is Record<string, any> {
  if (value === null || typeof value !== 'object') return false;
  return Object.getPrototypeOf(value) === Object.prototype;
}

export class ModifyComponentCommand implements EditorCommand {
  description: string;
  private oldEid: number;
  private newEid: number | null = null;
  private fullBundle: any;
  private oldComponentData: any;
  private stableId?: number;

  constructor(
    private ctx: ECSContext,
    private engine: EngineAPI,
    eid: number,
    private componentName: string,
    private newComponentData: any,
    private isStructural: boolean,
    options?: ModifyComponentCommandOptions
  ) {
    this.oldEid = eid;
    this.description = `Modify ${componentName}`;
    
    // Capture the full entity bundle for restore
    const capturedBundle = options?.previousBundle ?? getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    this.fullBundle = cloneValue(capturedBundle);
    
    // Store old component data separately for easier access
    this.oldComponentData = options?.previousComponentData !== undefined
      ? cloneValue(options.previousComponentData)
      : cloneValue(this.fullBundle?.[componentName]);
    this.newComponentData = cloneValue(this.newComponentData);
    this.stableId = this.fullBundle?.StableID?.id;
  }

  execute(): void {
    console.log(`[ModifyComponentCommand] Executing for ${this.componentName}, isStructural: ${this.isStructural}`);
    console.log(`[ModifyComponentCommand] New component data:`, JSON.stringify(this.newComponentData, null, 2));
    
    if (this.isStructural) {
      // Structural component: respawn entity with merged data
      this.respawnEntity();
    } else {
      // Non-structural: just update component data
      this.updateComponent();
    }
  }

  undo(): void {
    const targetEid = this.resolveCurrentEid();

    if (this.isStructural && targetEid !== null) {
      // Despawn modified entity and restore original
      despawn(this.ctx, targetEid);

      // Restore with old component data
      const restoreBundle = { ...this.fullBundle };
      this.oldEid = spawn(this.ctx, restoreBundle);
      this.newEid = null;
      selectSingleEntity(this.ctx, this.oldEid);

      console.log(`[ModifyComponent] Restored ${this.componentName} for entity ${this.oldEid}`);
      return;
    }

    if (targetEid !== null) {
      // Restore old component data
      applyBundle(this.ctx, targetEid, {
        [this.componentName]: this.oldComponentData
      });

      this.oldEid = targetEid;
      console.log(`[ModifyComponent] Reverted ${this.componentName} for entity ${targetEid}`);
    }
  }

  redo(): void {
    this.execute();
  }

  private respawnEntity(): void {
    const eid = this.resolveCurrentEid();

    if (eid === null) {
      console.warn(`[ModifyComponentCommand] Cannot respawn - target entity missing`);
      return;
    }
    
    // Get current bundle (may have changed since command creation)
    const currentBundle = getEntityBundle(this.ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    
    console.log(`[ModifyComponentCommand] Current bundle before merge:`, JSON.stringify(currentBundle, null, 2));
    
    // Merge new component data with current bundle
    const currentComponent = currentBundle?.[this.componentName] ?? {};
    const mergedComponent = isPlainObject(currentComponent) && isPlainObject(this.newComponentData)
      ? {
          ...currentComponent,
          ...this.newComponentData,
        }
      : cloneValue(this.newComponentData);
    const mergedBundle = {
      ...currentBundle,
      [this.componentName]: mergedComponent,
    };
    
    console.log(`[ModifyComponentCommand] Merged bundle after applying ${this.componentName}:`, JSON.stringify(mergedBundle, null, 2));
    
    despawn(this.ctx, eid);

    // Spawn with merged data
    this.newEid = spawn(this.ctx, mergedBundle);

    const resolved = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.newEid;
    selectSingleEntity(this.ctx, resolved);

    console.log(`[ModifyComponentCommand] Respawned entity ${eid} as ${this.newEid} with updated ${this.componentName}`);
  }

  private updateComponent(): void {
    const targetEid = this.resolveCurrentEid();

    if (targetEid === null) {
      console.warn(`[ModifyComponent] Cannot update ${this.componentName} - target entity missing`);
      return;
    }

    // Apply component change directly (hot-swap)
    const currentBundle = getEntityBundle(this.ctx, targetEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    const currentComponent = currentBundle?.[this.componentName] ?? {};
    const mergedComponent = isPlainObject(currentComponent) && isPlainObject(this.newComponentData)
      ? {
          ...currentComponent,
          ...this.newComponentData,
        }
      : cloneValue(this.newComponentData);

    applyBundle(this.ctx, targetEid, {
      [this.componentName]: mergedComponent,
    });

    this.oldEid = targetEid;
    console.log(`[ModifyComponent] Updated ${this.componentName} for entity ${targetEid}`);
  }

  /**
   * Get the current entity ID (after execute/redo)
   */
  getCurrentEntityId(): number {
    return this.newEid ?? this.oldEid;
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
