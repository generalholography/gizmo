export interface SelectionSnapshot {
  selectedEntities: number[];
  selectedPartPaths: number[][] | null;
}

function clonePartPaths(partPaths: number[][] | null | undefined): number[][] | null {
  return partPaths && partPaths.length > 0 ? partPaths.map((path) => [...path]) : null;
}

function areNumberArraysEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function arePartPathListsEqual(left: number[][] | null, right: number[][] | null): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;

  return left.every((path, index) =>
    path.length === right[index].length && path.every((value, pathIndex) => value === right[index][pathIndex])
  );
}

export function normalizeSelectionSnapshot(
  selectedEntity: number | undefined,
  selectedEntities: number[] | undefined,
  selectedBodyPartPath: number[] | undefined,
  selectedBodyPartPaths?: number[][] | undefined,
): SelectionSnapshot {
  const normalizedPartPaths = selectedBodyPartPaths && selectedBodyPartPaths.length > 0
    ? selectedBodyPartPaths.map((path) => [...path])
    : selectedBodyPartPath && selectedBodyPartPath.length > 0
      ? [[...selectedBodyPartPath]]
      : null;

  return {
    selectedEntities: selectedEntities && selectedEntities.length > 0
      ? [...selectedEntities]
      : selectedEntity !== undefined
        ? [selectedEntity]
        : [],
    selectedPartPaths: normalizedPartPaths,
  };
}

export function selectionSnapshotsEqual(left: SelectionSnapshot, right: SelectionSnapshot): boolean {
  return areNumberArraysEqual(left.selectedEntities, right.selectedEntities)
    && arePartPathListsEqual(left.selectedPartPaths, right.selectedPartPaths);
}

export function shouldApplyEcsSelection(
  uiSelection: SelectionSnapshot,
  ecsSelection: SelectionSnapshot,
  multiSelectMode: boolean,
): boolean {
  if (selectionSnapshotsEqual(uiSelection, ecsSelection)) return false;
  if (!multiSelectMode) return true;

  // Preserve explicit hierarchy multi-selection unless ECS is clearing or narrowing to a single target.
  return ecsSelection.selectedEntities.length <= 1;
}

export function cloneSelectionSnapshot(selection: SelectionSnapshot): SelectionSnapshot {
  return {
    selectedEntities: [...selection.selectedEntities],
    selectedPartPaths: clonePartPaths(selection.selectedPartPaths),
  };
}
