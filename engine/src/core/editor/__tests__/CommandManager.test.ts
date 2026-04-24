/**
 * Command Manager Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { CommandManager, EditorCommand } from '../CommandManager';

class TestCommand implements EditorCommand {
  description: string;
  executeCount = 0;
  undoCount = 0;
  redoCount = 0;

  constructor(desc: string) {
    this.description = desc;
  }

  execute(): void {
    this.executeCount++;
  }

  undo(): void {
    this.undoCount++;
  }

  redo(): void {
    this.redoCount++;
  }
}

describe('CommandManager', () => {
  it('should execute a command', () => {
    const manager = new CommandManager();
    const cmd = new TestCommand('Test');

    manager.execute(cmd);

    expect(cmd.executeCount).toBe(1);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('should undo a command', () => {
    const manager = new CommandManager();
    const cmd = new TestCommand('Test');

    manager.execute(cmd);
    expect(manager.undo()).toBe(true);

    expect(cmd.undoCount).toBe(1);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);
  });

  it('should redo a command', () => {
    const manager = new CommandManager();
    const cmd = new TestCommand('Test');

    manager.execute(cmd);
    manager.undo();
    expect(manager.redo()).toBe(true);

    expect(cmd.redoCount).toBe(1);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('should clear redo stack when new command is executed', () => {
    const manager = new CommandManager();
    const cmd1 = new TestCommand('Command 1');
    const cmd2 = new TestCommand('Command 2');

    manager.execute(cmd1);
    manager.undo();
    expect(manager.canRedo()).toBe(true);

    manager.execute(cmd2);
    expect(manager.canRedo()).toBe(false);
  });

  it('should return false when undo/redo stack is empty', () => {
    const manager = new CommandManager();

    expect(manager.undo()).toBe(false);
    expect(manager.redo()).toBe(false);
  });

  it('should get command descriptions', () => {
    const manager = new CommandManager();
    const cmd = new TestCommand('My Command');

    expect(manager.getUndoDescription()).toBeNull();
    
    manager.execute(cmd);
    expect(manager.getUndoDescription()).toBe('My Command');
    
    manager.undo();
    expect(manager.getUndoDescription()).toBeNull();
    expect(manager.getRedoDescription()).toBe('My Command');
  });

  it('should limit stack size', () => {
    const manager = new CommandManager();
    const commands: TestCommand[] = [];

    // Execute 60 commands (max is 50)
    for (let i = 0; i < 60; i++) {
      const cmd = new TestCommand(`Command ${i}`);
      commands.push(cmd);
      manager.execute(cmd);
    }

    // Should only be able to undo 50 times
    let undoCount = 0;
    while (manager.undo()) {
      undoCount++;
    }

    expect(undoCount).toBe(50);
  });

  it('should clear all history', () => {
    const manager = new CommandManager();
    const cmd = new TestCommand('Test');

    manager.execute(cmd);
    manager.clear();

    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
  });
});
