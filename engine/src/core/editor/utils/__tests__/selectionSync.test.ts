import { describe, expect, it } from 'vitest';
import {
  cloneSelectionSnapshot,
  normalizeSelectionSnapshot,
  selectionSnapshotsEqual,
  shouldApplyEcsSelection,
} from '../selectionSync';

describe('selectionSync helpers', () => {
  it('normalizes ECS resources into a canonical selection snapshot', () => {
    expect(normalizeSelectionSnapshot(7, undefined, [1, 2])).toEqual({
      selectedEntities: [7],
      selectedPartPaths: [[1, 2]],
    });

    expect(normalizeSelectionSnapshot(undefined, [3, 4], undefined)).toEqual({
      selectedEntities: [3, 4],
      selectedPartPaths: null,
    });

    expect(normalizeSelectionSnapshot(5, [5], [0], [[2, 1], [3, 4]])).toEqual({
      selectedEntities: [5],
      selectedPartPaths: [[2, 1], [3, 4]],
    });
  });

  it('compares exact selection snapshots instead of only the primary entity', () => {
    expect(selectionSnapshotsEqual(
      { selectedEntities: [1], selectedPartPaths: null },
      { selectedEntities: [1], selectedPartPaths: null },
    )).toBe(true);

    expect(selectionSnapshotsEqual(
      { selectedEntities: [1], selectedPartPaths: null },
      { selectedEntities: [1], selectedPartPaths: [[0]] },
    )).toBe(false);
  });

  it('allows ECS clear or single selection to override stale multi-select UI state', () => {
    const uiSelection = {
      selectedEntities: [5, 6],
      selectedPartPaths: null,
    };

    expect(shouldApplyEcsSelection(uiSelection, {
      selectedEntities: [],
      selectedPartPaths: null,
    }, true)).toBe(true);

    expect(shouldApplyEcsSelection(uiSelection, {
      selectedEntities: [5],
      selectedPartPaths: null,
    }, true)).toBe(true);
  });

  it('clones snapshots defensively', () => {
    const original = {
      selectedEntities: [9],
      selectedPartPaths: [[0, 1]],
    };

    const clone = cloneSelectionSnapshot(original);
    clone.selectedEntities[0] = 3;
    clone.selectedPartPaths?.[0].push(2);

    expect(original).toEqual({
      selectedEntities: [9],
      selectedPartPaths: [[0, 1]],
    });
  });
});
