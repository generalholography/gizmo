import { describe, expect, it } from 'vitest';
import { parseStdioServerArgs } from '../parseArgs';

describe('parseStdioServerArgs', () => {
  it('parses world path and auto-save flag', () => {
    expect(parseStdioServerArgs(['--world', '/tmp/demo.json', '--no-auto-save'])).toEqual({
      worldFilePath: '/tmp/demo.json',
      autoSave: false,
      allowWorldScripts: false,
    });
  });

  it('parses world-script opt-in flag', () => {
    expect(parseStdioServerArgs(['--world', '/tmp/demo.json', '--allow-world-scripts'])).toEqual({
      worldFilePath: '/tmp/demo.json',
      autoSave: true,
      allowWorldScripts: true,
    });
  });

  it('requires a world path', () => {
    expect(() => parseStdioServerArgs([])).toThrow(/Missing required --world/);
  });
});
