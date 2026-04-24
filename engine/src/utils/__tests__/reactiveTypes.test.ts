import { describe, it, expect, vi } from 'vitest';
import { Atom, ReactiveMap, ReactiveSet, ReactiveArray } from '../reactiveTypes';

describe('Reactive utilities', () => {
  it('Atom emits when set', () => {
    const atom = new Atom(1);
    const fn = vi.fn();
    atom.on(fn);
    atom.set(2);
    expect(atom.get()).toBe(2);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it('ReactiveMap emits set events', () => {
    const map = new ReactiveMap<number>();
    const fn = vi.fn();
    map.on('set', fn);
    map.set('a', 5);
    expect(fn).toHaveBeenCalledWith(5);
  });

  it('ReactiveSet emits add and delete', () => {
    const set = new ReactiveSet<number>();
    const adds = vi.fn();
    const dels = vi.fn();
    set.on('add', adds);
    set.on('delete', dels);
    set.add(1);
    set.delete(1);
    expect(adds).toHaveBeenCalledWith(1);
    expect(dels).toHaveBeenCalledWith(1);
  });

  it('ReactiveArray emits push and pop', () => {
    const arr = new ReactiveArray<number>();
    const pushFn = vi.fn();
    const popFn = vi.fn();
    arr.on('push', pushFn);
    arr.on('pop', popFn);
    arr.push(1);
    arr.pop();
    expect(pushFn).toHaveBeenCalledWith(0);
    expect(popFn).toHaveBeenCalledWith(0);
  });
});
