/**
 * Body Command
 * Modify entity body geometry - requires entity respawn
 */

import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { spawn } from '../../spawn';
import { despawn, getEntityBundle } from '../../despawn';
import { hasComponent } from 'bitecs';
import { Transform } from '../../components/Transform';
import { Body as BodyComponent } from '../../components/Body';
import type { Body } from '../../schema';
import type { EngineAPI } from '../../..';

export class ModifyBodyCommand implements EditorCommand {
  description: string;
  private oldEid: number;
  private newEid: number | null = null;
  private fullBundle: any;

  constructor(
    private ctx: ECSContext,
    private engine: EngineAPI,
    eid: number,
    private oldBody: Body,
    private newBody: Body
  ) {
    this.oldEid = eid;
    this.description = `Modify Body Geometry`;
    
    // Capture the full entity bundle for restore
    this.fullBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
  }

  execute(): void {
    // Respawn entity with new body
    this.newEid = this.respawnWithBody(this.newBody);
    console.log(`[ModifyBody] Respawned entity ${this.oldEid} as ${this.newEid} with new body`);
  }

  undo(): void {
    if (this.newEid === null) {
      console.warn('[ModifyBody] Cannot undo: entity was never respawned');
      return;
    }

    // Despawn the modified entity
    despawn(this.ctx, this.newEid);

    // Restore original entity with old body
    const originalBundle = { ...this.fullBundle, Body: this.oldBody };
    this.oldEid = spawn(this.ctx, originalBundle);

    console.log(`[ModifyBody] Restored original entity as ${this.oldEid}`);
    this.newEid = null;
  }

  redo(): void {
    this.execute();
  }

  private respawnWithBody(body: Body): number {
    const eid = this.newEid ?? this.oldEid;

    // Capture current entity state
    if (!hasComponent(this.ctx, BodyComponent, eid)) {
      console.error('[ModifyBody] Entity has no Body component');
      return eid;
    }

    const bundle = getEntityBundle(this.ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    // Despawn current entity
    despawn(this.ctx, eid);

    // Spawn with new body
    const newBundle = { ...bundle, Body: body };
    const newEid = spawn(this.ctx, newBundle);

    return newEid;
  }

  /**
   * Get the current entity ID (after execute/redo)
   */
  getCurrentEntityId(): number {
    return this.newEid ?? this.oldEid;
  }
}
