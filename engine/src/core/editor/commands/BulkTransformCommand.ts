/**
 * Bulk Transform Command
 * Applies transform changes to multiple entities as a single undo/redo operation
 * Uses the Composite Command pattern to wrap individual TransformCommands
 */

import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { TransformCommand } from './TransformCommand';
import { eidToStableId } from '../../../utils/stableId';

export interface TransformState {
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

export interface EntityTransform {
  eid: number;
  oldTransform: TransformState;
  newTransform: TransformState;
  entityName?: string;
}

/**
 * BulkTransformCommand - Transform multiple entities with single undo/redo
 * 
 * This command uses the Composite pattern to wrap multiple TransformCommands,
 * allowing bulk operations to be undone/redone as a single action.
 */
export class BulkTransformCommand implements EditorCommand {
  description: string;
  private commands: TransformCommand[] = [];
  
  constructor(
    private ctx: ECSContext,
    transforms: EntityTransform[]
  ) {
    this.description = `Transform ${transforms.length} ${transforms.length === 1 ? 'entity' : 'entities'}`;
    
    // Create individual TransformCommand for each entity
    transforms.forEach(({ eid, oldTransform, newTransform, entityName }) => {
      const stableId = eidToStableId(ctx, eid);
      const cmd = new TransformCommand(
        ctx,
        eid,
        oldTransform,
        newTransform,
        entityName,
        stableId
      );
      this.commands.push(cmd);
    });
  }
  
  execute(): void {
    // Execute all transform commands
    this.commands.forEach(cmd => cmd.execute());
  }
  
  undo(): void {
    // Undo in reverse order for correctness
    [...this.commands].reverse().forEach(cmd => cmd.undo());
  }
  
  redo(): void {
    this.execute();
  }
  
  /**
   * Get the number of entities affected by this command
   */
  getEntityCount(): number {
    return this.commands.length;
  }
}
