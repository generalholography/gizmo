import { describe, expect, it } from 'vitest';
import {
  getBooleanFlag,
  getStringFlag,
  parseCliArgs,
  parseOptionalNumber,
} from '../argParser';

describe('CLI arg parser', () => {
  it('parses command, positionals, and flags', () => {
    const parsed = parseCliArgs([
      'call',
      '--world',
      'world.json',
      '--command=add-entity',
      'extra',
      '--no-auto-save',
    ]);

    expect(parsed.command).toBe('call');
    expect(parsed.positionals).toEqual(['extra']);
    expect(getStringFlag(parsed, 'world')).toBe('world.json');
    expect(getStringFlag(parsed, 'command')).toBe('add-entity');
    expect(getBooleanFlag(parsed, 'no-auto-save')).toBe(true);
  });

  it('parses optional numbers and rejects invalid values', () => {
    const parsed = parseCliArgs(['resource', '--stable-id', '42']);
    expect(parseOptionalNumber(getStringFlag(parsed, 'stable-id'), 'stable-id')).toBe(42);
    expect(() => parseOptionalNumber('nope', 'stable-id')).toThrow("Expected --stable-id to be a number, received 'nope'.");
  });

  it('keeps use command positional arguments', () => {
    const parsed = parseCliArgs(['use', '@gizmo3d/engine/src/worlds/demo.json']);
    expect(parsed.command).toBe('use');
    expect(parsed.positionals).toEqual(['@gizmo3d/engine/src/worlds/demo.json']);
  });

  it('supports positional nouns for resource and call', () => {
    const resource = parseCliArgs(['resource', 'world-state-summary']);
    const call = parseCliArgs(['call', 'add-entity', '--params', '{"x":1}']);

    expect(resource.positionals).toEqual(['world-state-summary']);
    expect(call.positionals).toEqual(['add-entity']);
    expect(getStringFlag(call, 'params')).toBe('{"x":1}');
  });
});
