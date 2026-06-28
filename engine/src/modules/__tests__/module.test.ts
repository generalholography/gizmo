import { describe, it, expect } from 'vitest';
import { Module } from '../Module';

interface Def { type: string; params: any; }

const ctx = {} as any;

describe('Module', () => {
  it('register stores definition and resolves value', () => {
    const mod = new Module<Def, string>(ctx, { foo: p => `foo:${p.val}` });
    const result = mod.register('a', { type: 'foo', params: { val: 1 } });
    expect(result).toBe('foo:1');
    const id = mod.resolve('a');
    expect(mod.get(id)).toBe('foo:1');
    expect(mod.getDefinition(id)).toEqual({ type: 'foo', params: { val: 1 } });
  });

  it('fallbacks to default factory when type missing', () => {
    const mod = new Module<Def, string>(ctx, { foo: p => `foo:${p.val}` });
    const id = mod.resolve({ type: 'bar', params: { val: 2 } });
    expect(mod.get(id)).toBe('foo:2');
  });

  it('register can clone existing definition with overrides', () => {
    const mod = new Module<Def, string>(ctx, { foo: p => `foo:${p.val}` });
    mod.register('base', { type: 'foo', params: { val: 1, extra: 'a' } });
    const res = mod.register('copy', 'base', { params: { val: 2 } });
    expect(res).toBe('foo:2');
    const copyId = mod.resolve('copy');
    expect(mod.get(copyId)).toBe('foo:2');
    expect(mod.getDefinition(copyId)).toEqual({ type: 'foo', params: { val: 2, extra: 'a' } });
    const baseId = mod.resolve('base');
    expect(mod.getDefinition(baseId)).toEqual({ type: 'foo', params: { val: 1, extra: 'a' } });
  });

  it('caches resolved objects', () => {
    const mod = new Module<Def, object>(ctx, { foo: () => ({}) });
    const id1 = mod.resolve({ type: 'foo', params: {} });
    const id2 = mod.resolve({ type: 'foo', params: {} });
    expect(id1).toBe(id2);
    expect(mod.get(id1)).toBe(mod.get(id2));
  });

  it('replaceDefinition invalidates the previous resolved resource for the same name', () => {
    const mod = new Module<Def, string>(ctx, { foo: p => `foo:${p.val}` });
    mod.register('terrainHeight', { type: 'foo', params: { val: 1 } });
    const oldId = mod.resolve('terrainHeight');
    expect(mod.get(oldId)).toBe('foo:1');

    mod.replaceDefinition('terrainHeight', { type: 'foo', params: { val: 2 } });
    const newId = mod.resolve('terrainHeight');

    expect(newId).not.toBe(oldId);
    expect(mod.get(newId)).toBe('foo:2');
    expect(mod.get(oldId)).toBeUndefined();
  });
});
