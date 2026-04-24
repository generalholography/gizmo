import { setResource, type ECSContext } from '../../ecs';
import type { BodyPartSelectionAddress } from '../../systems/editorSelection/proxyTargets';

export function clearSelectedBodyParts(ctx: ECSContext): void {
  setResource(ctx, 'selectedBodyPartPath', undefined);
  setResource(ctx, 'selectedBodyPartPaths', undefined);
  setResource(ctx, 'selectedBodyPartAddress', undefined);
  setResource(ctx, 'selectedBodyPartAddresses', undefined);
  setResource(ctx, 'selectedBodyPartSelectionTarget', undefined);
  setResource(ctx, 'selectedBodyPartSelectionTargets', undefined);
}

export function selectSingleEntity(ctx: ECSContext, eid: number | null | undefined): void {
  if (eid === undefined || eid === null) {
    setResource(ctx, 'selectedEntity', undefined);
    setResource(ctx, 'selectedEntities', undefined);
    clearSelectedBodyParts(ctx);
    return;
  }

  setResource(ctx, 'selectedEntity', eid);
  setResource(ctx, 'selectedEntities', [eid]);
  clearSelectedBodyParts(ctx);
}

export function selectSingleBodyPart(
  ctx: ECSContext,
  eid: number,
  path: number[],
  address?: BodyPartSelectionAddress,
  addresses?: BodyPartSelectionAddress[],
): void {
  setResource(ctx, 'selectedEntity', eid);
  setResource(ctx, 'selectedEntities', [eid]);
  setResource(ctx, 'selectedBodyPartPath', [...path]);
  setResource(ctx, 'selectedBodyPartPaths', [[...path]]);
  setResource(ctx, 'selectedBodyPartAddress', address ?? {
    definitionPath: [...path],
    instancePath: [...path],
  });
  setResource(ctx, 'selectedBodyPartAddresses', addresses ?? [address ?? {
    definitionPath: [...path],
    instancePath: [...path],
  }]);
  setResource(ctx, 'selectedBodyPartSelectionTarget', undefined);
  setResource(ctx, 'selectedBodyPartSelectionTargets', undefined);
}

export function selectMultipleBodyParts(
  ctx: ECSContext,
  eid: number,
  paths: number[][],
  addresses?: BodyPartSelectionAddress[],
): void {
  const normalizedPaths = paths.map((path) => [...path]);
  const normalizedAddresses = addresses ?? normalizedPaths.map((path) => ({
    definitionPath: [...path],
    instancePath: [...path],
  }));

  setResource(ctx, 'selectedEntity', eid);
  setResource(ctx, 'selectedEntities', [eid]);
  setResource(ctx, 'selectedBodyPartPath', normalizedPaths[0] ? [...normalizedPaths[0]] : undefined);
  setResource(ctx, 'selectedBodyPartPaths', normalizedPaths.length > 0 ? normalizedPaths : undefined);
  setResource(ctx, 'selectedBodyPartAddress', normalizedAddresses[0]);
  setResource(ctx, 'selectedBodyPartAddresses', normalizedAddresses.length > 0 ? normalizedAddresses : undefined);
  setResource(ctx, 'selectedBodyPartSelectionTarget', undefined);
  setResource(ctx, 'selectedBodyPartSelectionTargets', undefined);
}
