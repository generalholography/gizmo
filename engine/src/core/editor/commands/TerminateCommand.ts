/**
 * TerminateCommand - Signals completion of agentic editing task
 * This is a no-op command used to signal that an agentic loop should terminate
 */

import type { EditorCommand } from '../CommandManager';

export class TerminateCommand implements EditorCommand {
  description: string;
  
  constructor(
    private message: string,
    private success: boolean = true,
  ) {
    this.description = `Terminate: ${message}`;
  }
  
  execute(): void {
    // No-op: terminate is handled by the task worker
  }
  
  undo(): void {
    // No-op: cannot undo termination
  }
  
  redo(): void {
    // No-op
  }
  
  getMessage(): string {
    return this.message;
  }
  
  isSuccess(): boolean {
    return this.success;
  }
}
