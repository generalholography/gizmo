/**
 * NoOpCommand - A command that does nothing
 * Used for read-only operations like resource queries
 */

import type { EditorCommand } from '../CommandManager';

export class NoOpCommand implements EditorCommand {
  constructor(public description: string) {}
  
  execute(): void {
    // No-op
  }
  
  undo(): void {
    // No-op
  }
  
  redo(): void {
    // No-op
  }
}
