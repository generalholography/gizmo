/**
 * Bulk Delete Command
 * Delete multiple entities with single undo/redo operation
 */

import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { DeleteEntityCommand } from './EntityCommand';
import { BulkCommand, createBulkCommand } from './BulkCommand';
import { hasComponent } from 'bitecs';
import { Info } from '../../components/Info';
import { decode } from '../../../utils/strings';

/**
 * BulkDeleteCommand - Delete multiple entities at once
 * 
 * Wraps multiple DeleteEntityCommand instances into a single bulk operation.
 * Each entity's state is captured individually for proper undo restoration.
 * 
 * @example
 * const bulkDelete = new BulkDeleteCommand(ctx, [eid1, eid2, eid3]);
 * commandManager.execute(bulkDelete);
 * // All entities deleted, single undo restores all
 */
export class BulkDeleteCommand implements EditorCommand {
  description: string;
  private bulkCommand: BulkCommand;
  
  constructor(
    private ctx: ECSContext,
    private eids: number[]
  ) {
    // Generate descriptive name
    const entityNames = eids.map(eid => {
      if (hasComponent(ctx, Info, eid)) {
        return decode(Info.name[eid]);
      }
      return `Entity #${eid}`;
    }).slice(0, 3); // Show first 3 names
    
    const namePreview = entityNames.join(', ');
    const remaining = eids.length - 3;
    const suffix = remaining > 0 ? ` and ${remaining} more` : '';
    
    if (eids.length === 1) {
      this.description = `Delete ${entityNames[0]}`;
    } else if (eids.length <= 3) {
      this.description = `Delete ${namePreview}`;
    } else {
      this.description = `Delete ${namePreview}${suffix}`;
    }
    
    // Create bulk command wrapping individual delete commands
    this.bulkCommand = createBulkCommand(
      eids,
      (eid) => new DeleteEntityCommand(ctx, eid),
      this.description
    );
  }
  
  execute(): void {
    this.bulkCommand.execute();
    console.log(`[BulkDelete] Deleted ${this.eids.length} entities`);
  }
  
  undo(): void {
    this.bulkCommand.undo();
    console.log(`[BulkDelete] Restored ${this.eids.length} entities`);
  }
  
  redo(): void {
    this.bulkCommand.redo();
  }
  
  /**
   * Get the entity IDs that were deleted
   */
  getDeletedEntityIds(): number[] {
    return this.eids;
  }
  
  /**
   * Get the underlying bulk command
   */
  getBulkCommand(): BulkCommand {
    return this.bulkCommand;
  }
}
