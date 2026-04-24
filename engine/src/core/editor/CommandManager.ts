/**
 * Command Manager for Undo/Redo functionality
 * Implements the Command pattern for editor operations
 */

export interface EditorCommand {
  /** Execute the command */
  execute(): void;
  
  /** Undo the command */
  undo(): void;
  
  /** Redo the command (by default, calls execute again) */
  redo(): void;
  
  /** Description for UI display */
  description: string;
}

export class CommandManager {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private maxStackSize: number = 50;
  
  /**
   * Execute a command and add it to the undo stack
   */
  execute(command: EditorCommand): void {
    command.execute();
    
    // Add to undo stack
    this.undoStack.push(command);
    
    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new command is executed
    this.redoStack = [];
  }
  
  /**
   * Undo the last command
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) {
      return false;
    }
    
    command.undo();
    this.redoStack.push(command);
    return true;
  }
  
  /**
   * Redo the last undone command
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) {
      return false;
    }
    
    command.redo();
    this.undoStack.push(command);
    return true;
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Get description of next undo command
   */
  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command ? command.description : null;
  }
  
  /**
   * Get description of next redo command
   */
  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command ? command.description : null;
  }
  
  /**
   * Clear all undo/redo history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
