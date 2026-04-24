/**
 * Bulk Duplicate Command
 * Duplicate multiple entities with single undo/redo operation
 */

import { ECSContext } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { DuplicateEntityCommand } from './EntityCommand';
import { BulkCommand } from './BulkCommand';
import { hasComponent } from 'bitecs';
import { Info } from '../../components/Info';
import { decode } from '../../../utils/strings';

/**
 * BulkDuplicateCommand - Duplicate multiple entities at once
 * 
 * Wraps multiple DuplicateEntityCommand instances into a single bulk operation.
 * Applies smart grid-based offsets to prevent entities from spawning on top of each other.
 * 
 * @example
 * const bulkDuplicate = new BulkDuplicateCommand(ctx, [eid1, eid2, eid3]);
 * commandManager.execute(bulkDuplicate);
 * // All entities duplicated with grid spacing, single undo removes all
 */
export class BulkDuplicateCommand implements EditorCommand {
  description: string;
  private commands: DuplicateEntityCommand[] = [];
  private bulkCommand: BulkCommand | null = null;
  
  constructor(
    private ctx: ECSContext,
    private sourceEids: number[],
    private baseOffset: { x?: number; y?: number; z?: number } = { x: 1, z: 1 }
  ) {
    // Generate descriptive name
    const entityNames = sourceEids.map(eid => {
      if (hasComponent(ctx, Info, eid)) {
        return decode(Info.name[eid]);
      }
      return `Entity #${eid}`;
    }).slice(0, 3);
    
    const namePreview = entityNames.join(', ');
    const remaining = sourceEids.length - 3;
    const suffix = remaining > 0 ? ` and ${remaining} more` : '';
    
    if (sourceEids.length === 1) {
      this.description = `Duplicate ${entityNames[0]}`;
    } else if (sourceEids.length <= 3) {
      this.description = `Duplicate ${namePreview}`;
    } else {
      this.description = `Duplicate ${namePreview}${suffix}`;
    }
    
    // Create individual duplicate commands with grid offsets
    this.commands = sourceEids.map((eid, index) => {
      // Apply grid offset: each entity gets offset * index
      const offset = {
        x: (baseOffset.x || 0) * (index + 1),
        y: (baseOffset.y || 0) * (index + 1),
        z: (baseOffset.z || 0) * (index + 1),
      };
      
      return new DuplicateEntityCommand(ctx, eid, offset);
    });
    
    // Wrap in bulk command
    this.bulkCommand = new BulkCommand(this.commands, this.description);
  }
  
  execute(): void {
    if (this.bulkCommand) {
      this.bulkCommand.execute();
    }
    console.log(`[BulkDuplicate] Duplicated ${this.sourceEids.length} entities`);
  }
  
  undo(): void {
    if (this.bulkCommand) {
      this.bulkCommand.undo();
    }
    console.log(`[BulkDuplicate] Removed ${this.sourceEids.length} duplicates`);
  }
  
  redo(): void {
    if (this.bulkCommand) {
      this.bulkCommand.redo();
    }
  }
  
  /**
   * Get the entity IDs of all duplicated entities
   */
  getDuplicatedEntityIds(): number[] {
    return this.commands
      .map(cmd => cmd.getDuplicatedEntityId())
      .filter((eid): eid is number => eid !== null);
  }
  
  /**
   * Get the source entity IDs that were duplicated
   */
  getSourceEntityIds(): number[] {
    return this.sourceEids;
  }
  
  /**
   * Get the underlying bulk command
   */
  getBulkCommand(): BulkCommand | null {
    return this.bulkCommand;
  }
}
