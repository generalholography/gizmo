import { describe, expect, it } from 'vitest';
import { setResource, getResource, type ECSContext } from '../../../ecs';
import { applySelectionFromClick } from '../selectionState';

function createMockCtx(): ECSContext {
  return {
    resources: new Map(),
    modules: new Map(),
    pipeline: [],
    isPlaying: false,
    input: {} as any,
    three: {} as any,
    rapier: {} as any,
    time: { connect() {}, disconnect() {}, update() {} } as any,
  } as ECSContext;
}

describe('applySelectionFromClick', () => {
  it('keeps entity clicks idempotent instead of toggling the same entity off', () => {
    const ctx = createMockCtx();
    setResource(ctx, 'selectedEntity', 12);
    setResource(ctx, 'selectedEntities', [12]);

    applySelectionFromClick(ctx, 12, undefined, undefined, false, false);

    expect(getResource(ctx, 'selectedEntity', true)).toBe(12);
    expect(getResource(ctx, 'selectedEntities', true)).toEqual([12]);
    expect(getResource(ctx, 'selectedBodyPartPath', true)).toBeUndefined();
    expect(getResource(ctx, 'selectedBodyPartPaths', true)).toBeUndefined();
  });

  it('clears selection when clicking empty space', () => {
    const ctx = createMockCtx();
    setResource(ctx, 'selectedEntity', 12);
    setResource(ctx, 'selectedEntities', [12]);

    applySelectionFromClick(ctx, undefined, undefined, undefined, false, false);

    expect(getResource(ctx, 'selectedEntity', true)).toBeUndefined();
    expect(getResource(ctx, 'selectedEntities', true)).toBeUndefined();
  });

  it('replaces stale multi-part state with a single part selection on shift-click', () => {
    const ctx = createMockCtx();
    setResource(ctx, 'selectedEntity', 12);
    setResource(ctx, 'selectedEntities', [12]);
    setResource(ctx, 'selectedBodyPartPath', [0, 0]);
    setResource(ctx, 'selectedBodyPartPaths', [[0, 0], [0, 1]]);

    applySelectionFromClick(ctx, 12, [1, 2], undefined, false, true);

    expect(getResource(ctx, 'selectedEntity', true)).toBe(12);
    expect(getResource(ctx, 'selectedEntities', true)).toEqual([12]);
    expect(getResource(ctx, 'selectedBodyPartPath', true)).toEqual([1, 2]);
    expect(getResource(ctx, 'selectedBodyPartPaths', true)).toEqual([[1, 2]]);
  });

  it('clears stale part arrays on plain entity selection', () => {
    const ctx = createMockCtx();
    setResource(ctx, 'selectedEntity', 12);
    setResource(ctx, 'selectedEntities', [12]);
    setResource(ctx, 'selectedBodyPartPath', [0]);
    setResource(ctx, 'selectedBodyPartPaths', [[0], [1]]);

    applySelectionFromClick(ctx, 12, undefined, undefined, false, false);

    expect(getResource(ctx, 'selectedEntity', true)).toBe(12);
    expect(getResource(ctx, 'selectedEntities', true)).toEqual([12]);
    expect(getResource(ctx, 'selectedBodyPartPath', true)).toBeUndefined();
    expect(getResource(ctx, 'selectedBodyPartPaths', true)).toBeUndefined();
  });

  it('reselects the primary asset entity when clicking empty space in asset scope', () => {
    const ctx = createMockCtx();
    setResource(ctx, 'editorSessionConfig', {
      scope: 'asset',
      capabilities: {
        keepPrimarySelection: true,
        directPartSelection: true,
      },
    });
    setResource(ctx, 'assetPrimaryEntity', 42);

    applySelectionFromClick(ctx, undefined, undefined, undefined, false, false);

    expect(getResource(ctx, 'selectedEntity', true)).toBe(42);
    expect(getResource(ctx, 'selectedEntities', true)).toEqual([42]);
  });

  it('selects body parts directly without shift in asset scope', () => {
    const ctx = createMockCtx();
    setResource(ctx, 'editorSessionConfig', {
      scope: 'asset',
      capabilities: {
        keepPrimarySelection: true,
        directPartSelection: true,
      },
    });

    applySelectionFromClick(ctx, 7, [1, 0], undefined, false, false);

    expect(getResource(ctx, 'selectedEntity', true)).toBe(7);
    expect(getResource(ctx, 'selectedEntities', true)).toEqual([7]);
    expect(getResource(ctx, 'selectedBodyPartPath', true)).toEqual([1, 0]);
    expect(getResource(ctx, 'selectedBodyPartPaths', true)).toEqual([[1, 0]]);
  });
});
