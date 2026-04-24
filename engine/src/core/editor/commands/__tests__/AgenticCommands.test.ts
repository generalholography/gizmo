import { beforeEach, describe, expect, it } from 'vitest';
import { createECS } from '../../../ecs';
import { TerminateCommand } from '../TerminateCommand';
import { NoOpCommand } from '../NoOpCommand';

describe('TerminateCommand', () => {
  let ctx: ReturnType<typeof createECS>;

  beforeEach(() => {
    ctx = createECS();
  });

  it('should create a terminate command with message and success flag', () => {
    const message = 'Task completed successfully';
    const command = new TerminateCommand(message, true);

    expect(command.getMessage()).toBe(message);
    expect(command.isSuccess()).toBe(true);
    expect(command.description).toBe(`Terminate: ${message}`);
  });

  it('should default success to true if not provided', () => {
    const command = new TerminateCommand('Done');

    expect(command.isSuccess()).toBe(true);
  });

  it('should allow success to be false', () => {
    const command = new TerminateCommand('Failed to complete', false);

    expect(command.isSuccess()).toBe(false);
    expect(command.getMessage()).toBe('Failed to complete');
  });

  it('should be a no-op on execute/undo/redo', () => {
    const command = new TerminateCommand('Test');

    // These should not throw
    expect(() => command.execute()).not.toThrow();
    expect(() => command.undo()).not.toThrow();
    expect(() => command.redo()).not.toThrow();
  });
});

describe('NoOpCommand', () => {
  it('should create a command with description', () => {
    const description = 'Read resource: entity-list';
    const command = new NoOpCommand(description);

    expect(command.description).toBe(description);
  });

  it('should be a no-op on execute/undo/redo', () => {
    const command = new NoOpCommand('Test');

    // These should not throw
    expect(() => command.execute()).not.toThrow();
    expect(() => command.undo()).not.toThrow();
    expect(() => command.redo()).not.toThrow();
  });
});
