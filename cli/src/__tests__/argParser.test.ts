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

  it('supports global flags before commands and short flags', () => {
    const version = parseCliArgs(['--version']);
    const help = parseCliArgs(['-h', 'start']);
    const verboseHelp = parseCliArgs(['start', '-hv']);

    expect(version.command).toBe(null);
    expect(getBooleanFlag(version, 'version')).toBe(true);
    expect(help.command).toBe('start');
    expect(getBooleanFlag(help, 'h')).toBe(true);
    expect(verboseHelp.command).toBe('start');
    expect(getBooleanFlag(verboseHelp, 'h')).toBe(true);
    expect(getBooleanFlag(verboseHelp, 'v')).toBe(true);
  });

  it('treats tokens after -- as positionals', () => {
    const parsed = parseCliArgs(['call', '--', '--not-a-flag']);

    expect(parsed.command).toBe('call');
    expect(parsed.positionals).toEqual(['--not-a-flag']);
    expect(getStringFlag(parsed, 'not-a-flag')).toBeUndefined();
  });
});
