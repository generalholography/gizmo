/**
 * Bulk Command
 * Generic abstraction for executing multiple commands as a single operation
 * Uses Composite pattern to wrap array of EditorCommand instances
 */

import { EditorCommand } from '../CommandManager';

/**
 * BulkCommand - Wraps multiple commands into single undo/redo operation
 * 
 * This is a generic command wrapper that allows any type of EditorCommand
 * to be executed in bulk. Useful for operations like deleting, duplicating,
 * or modifying multiple entities/parts at once.
 * 
 * @example
 * const deleteCommands = entities.map(eid => new DeleteEntityCommand(ctx, eid));
 * const bulkDelete = new BulkCommand(deleteCommands, 'Delete 5 Entities');
 * commandManager.execute(bulkDelete);
 */
export class BulkCommand implements EditorCommand {
  description: string;
  
  constructor(
    private commands: EditorCommand[],
    private operationName: string
  ) {
    this.description = operationName;
  }
  
  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }
  
  undo(): void {
    // Undo in reverse order to maintain proper state restoration
    [...this.commands].reverse().forEach(cmd => cmd.undo());
  }
  
  redo(): void {
    this.execute();
  }
  
  /**
   * Get the wrapped commands
   */
  getCommands(): EditorCommand[] {
    return this.commands;
  }
  
  /**
   * Get the number of commands in this bulk operation
   */
  getCommandCount(): number {
    return this.commands.length;
  }
}

/**
 * Type-safe factory function for creating bulk commands
 * 
 * @param items - Array of items to create commands for
 * @param commandFactory - Factory function that creates a command for each item
 * @param operationName - Description for the bulk operation
 * @returns BulkCommand instance
 * 
 * @example
 * const bulkDelete = createBulkCommand(
 *   selectedEntities,
 *   (eid) => new DeleteEntityCommand(ctx, eid),
 *   `Delete ${selectedEntities.length} Entities`
 * );
 */
export function createBulkCommand<T extends EditorCommand>(
  items: any[],
  commandFactory: (item: any) => T,
  operationName: string
): BulkCommand {
  const commands = items.map(item => commandFactory(item));
  return new BulkCommand(commands, operationName);
}
