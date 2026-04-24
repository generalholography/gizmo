import { describe, expect, it } from 'vitest';
import {
  getPartAtPath,
  hydrateCompositeBodyTypes,
  inferBodyNodeType,
  removePartAtPath,
  replacePartAtPath,
  type CompositeBody,
} from '../bodyParts';

function createComposite(parts: any[]): CompositeBody {
  return {
    type: 'composite',
    params: {
      parts: parts as any,
    },
  } as CompositeBody;
}

describe('bodyParts utils', () => {
  it('infers group type for operation nodes and children-only nodes', () => {
    expect(inferBodyNodeType({ operation: { type: 'mirror' } } as any)).toBe('group');
    expect(inferBodyNodeType({ children: [{}] } as any)).toBe('group');
  });

  it('hydrates missing types recursively for mixed node trees', () => {
    const body = createComposite([
      {
        operation: { type: 'mirror' },
        children: [
          { geometry: { type: 'box', params: {} }, children: [] },
          { light: { type: 'point', params: {} }, children: [] },
        ],
      },
    ]);

    const hydrated = hydrateCompositeBodyTypes(body)!;

    expect((hydrated.params.parts[0] as any).type).toBe('group');
    expect(((hydrated.params.parts[0] as any).children[0] as any).type).toBe('primitive');
    expect(((hydrated.params.parts[0] as any).children[1] as any).type).toBe('light');
  });

  it('gets and replaces parts at canonical paths without mutating source body', () => {
    const original = createComposite([
      {
        type: 'group',
        operation: { type: 'none' },
        children: [
          { type: 'primitive', geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } }, children: [] },
        ],
      },
    ]);

    const selected = getPartAtPath(original, [0, 0]);
    expect((selected as any)?.geometry?.type).toBe('box');

    const replacement = { ...(selected as any), geometry: { type: 'sphere', params: { radius: 2 } } } as any;
    const updated = replacePartAtPath(original, [0, 0], replacement)!;

    expect((getPartAtPath(updated, [0, 0]) as any)?.geometry?.type).toBe('sphere');
    expect((getPartAtPath(original, [0, 0]) as any)?.geometry?.type).toBe('box');
  });

  it('removes parts at canonical paths without mutating source body', () => {
    const original = createComposite([
      {
        type: 'group',
        operation: { type: 'none' },
        children: [
          { type: 'primitive', geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } }, children: [] },
          { type: 'primitive', geometry: { type: 'sphere', params: { radius: 1 } }, children: [] },
        ],
      },
    ]);

    const updated = removePartAtPath(original, [0, 0])!;

    expect((getPartAtPath(updated, [0, 0]) as any)?.geometry?.type).toBe('sphere');
    expect((getPartAtPath(original, [0, 0]) as any)?.geometry?.type).toBe('box');
  });
});
