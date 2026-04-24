import { describe, it, expect } from 'vitest';
import type { ConsoleCommand } from '../../..';

describe('Console Commands', () => {
  it('should define help command', () => {
    const help: ConsoleCommand = () => {
      return 'Available commands: /help';
    };
    
    expect(help()).toBe('Available commands: /help');
  });

  it('should handle async commands', async () => {
    const asyncCommand: ConsoleCommand = async (arg: string) => {
      return `Processed: ${arg}`;
    };
    
    const result = await asyncCommand('test');
    expect(result).toBe('Processed: test');
  });

  it('should handle commands with multiple arguments', async () => {
    const multiArgCommand: ConsoleCommand = async (arg1: string, arg2: string) => {
      return `Args: ${arg1}, ${arg2}`;
    };
    
    const result = await multiArgCommand('foo', 'bar');
    expect(result).toBe('Args: foo, bar');
  });

  it('should handle commands that return null', () => {
    const nullCommand: ConsoleCommand = () => {
      return null;
    };
    
    expect(nullCommand()).toBeNull();
  });

  it('should handle commands that return undefined', () => {
    const undefinedCommand: ConsoleCommand = () => {
      return undefined;
    };
    
    expect(undefinedCommand()).toBeUndefined();
  });
});
