import { describe, it, expect } from 'vitest';
import { LazyMap } from '../lazyMap';

describe('LazyMap', () => {
  it('creates values lazily', () => {
    const map = new LazyMap<number, string>(() => 'created');
    expect(map.getRaw(1)).toBeUndefined();
    const value = map.get(1);
    expect(value).toBe('created');
    expect(map.getRaw(1)).toBe('created');
  });
});
