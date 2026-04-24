import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../eventEmitter';

describe('EventEmitter', () => {
  it('emits to listeners', () => {
    const emitter = new EventEmitter<number>();
    const fn = vi.fn();
    emitter.on('a', fn);
    emitter.emit('a', 1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('off removes listener', () => {
    const emitter = new EventEmitter<number>();
    const fn = vi.fn();
    emitter.on('a', fn);
    emitter.off('a', fn);
    emitter.emit('a', 2);
    expect(fn).not.toHaveBeenCalled();
  });

  it('once only fires once', () => {
    const emitter = new EventEmitter<number>();
    const fn = vi.fn();
    emitter.once('a', fn);
    emitter.emit('a', 1);
    emitter.emit('a', 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('removeAllListeners clears all listeners', () => {
    const emitter = new EventEmitter<number>();
    const fn = vi.fn();
    emitter.on('a', fn);
    emitter.removeAllListeners();
    emitter.emit('a', 3);
    expect(fn).not.toHaveBeenCalled();
  });
});
