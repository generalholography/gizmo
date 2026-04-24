import { ECSContext, getResource, setResource } from '../../ecs';
import type { BodyPartSelectionAddress, BodyPartSelectionTarget } from './proxyTargets';
import { findAssetPrimaryEntity, getResolvedEditorSessionConfig } from '../../editor/sessionConfig';

function buildAddressFromPath(path: number[] | undefined): BodyPartSelectionAddress | undefined {
  if (!path || path.length === 0) return undefined;
  return {
    definitionPath: [...path],
    instancePath: [...path],
  };
}

function cloneAddress(address: BodyPartSelectionAddress | undefined): BodyPartSelectionAddress | undefined {
  if (!address) return undefined;
  return {
    definitionPath: [...address.definitionPath],
    instancePath: address.instancePath ? [...address.instancePath] : undefined,
  };
}

function setSingleEntitySelection(ctx: ECSContext, eid: number | undefined): void {
  setResource(ctx, 'selectedEntity', eid);
  setResource(ctx, 'selectedEntities', eid !== undefined ? [eid] : undefined);
}

function clearPartSelection(ctx: ECSContext): void {
  setResource(ctx, 'selectedBodyPartPath', undefined);
  setResource(ctx, 'selectedBodyPartPaths', undefined);
  setResource(ctx, 'selectedBodyPartAddress', undefined);
  setResource(ctx, 'selectedBodyPartAddresses', undefined);
  setResource(ctx, 'selectedBodyPartSelectionTarget', undefined);
  setResource(ctx, 'selectedBodyPartSelectionTargets', undefined);
}

function setSinglePartSelection(
  ctx: ECSContext,
  partPath: number[],
  partAddress: BodyPartSelectionAddress | undefined,
  partTarget: BodyPartSelectionTarget | undefined,
): void {
  const nextPath = [...partPath];
  const nextAddress = cloneAddress(partAddress);

  setResource(ctx, 'selectedBodyPartPath', nextPath);
  setResource(ctx, 'selectedBodyPartPaths', [[...nextPath]]);
  setResource(ctx, 'selectedBodyPartAddress', nextAddress);
  setResource(ctx, 'selectedBodyPartAddresses', nextAddress ? [nextAddress] : undefined);
  setResource(ctx, 'selectedBodyPartSelectionTarget', partTarget);
  setResource(
    ctx,
    'selectedBodyPartSelectionTargets',
    partTarget ? new Map([[JSON.stringify(nextPath), partTarget]]) : undefined,
  );
}

export function applySelectionFromClick(
  ctx: ECSContext,
  selectedEid: number | undefined,
  selectedBodyPartPath: number[] | undefined,
  selectedBodyPartTarget: BodyPartSelectionTarget | undefined,
  ctrlHeld: boolean,
  shiftHeld: boolean
): void {
  const sessionConfig = getResolvedEditorSessionConfig(ctx);
  const normalizedBodyPartTarget = selectedEid !== undefined && selectedBodyPartTarget
    ? { ...selectedBodyPartTarget, entityId: selectedEid }
    : undefined;
  const normalizedBodyPartAddress = normalizedBodyPartTarget?.address ?? buildAddressFromPath(selectedBodyPartPath);

  const currentSelection = getResource<number | undefined>(ctx, 'selectedEntity', true);
  const currentBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);

  if (sessionConfig.capabilities.directPartSelection) {
    if (selectedEid !== undefined) {
      setSingleEntitySelection(ctx, selectedEid);
      if (selectedBodyPartPath && selectedBodyPartPath.length > 0) {
        setSinglePartSelection(ctx, selectedBodyPartPath, normalizedBodyPartAddress, normalizedBodyPartTarget);
      } else {
        clearPartSelection(ctx);
      }
      return;
    }

    if (sessionConfig.capabilities.keepPrimarySelection) {
      const primaryEntity = findAssetPrimaryEntity(ctx);
      if (primaryEntity !== undefined) {
        setSingleEntitySelection(ctx, primaryEntity);
        clearPartSelection(ctx);
      }
      return;
    }
  }

  if (selectedEid !== undefined) {
    if (ctrlHeld && !shiftHeld) {
      clearPartSelection(ctx);
      setResource(ctx, 'pendingMultiSelectToggle', {
        eid: selectedEid,
        timestamp: Date.now()
      });
    }
    else if (ctrlHeld && shiftHeld) {
      if (selectedBodyPartPath && selectedBodyPartPath.length > 0) {
        setResource(ctx, 'selectedBodyPartSelectionTarget', normalizedBodyPartTarget);
        setResource(ctx, 'selectedBodyPartAddress', normalizedBodyPartAddress);
        setResource(ctx, 'pendingMultiPartToggle', {
          eid: selectedEid,
          partPath: selectedBodyPartPath,
          partAddress: normalizedBodyPartAddress,
          timestamp: Date.now()
        });
      }
    }
    else if (shiftHeld && !ctrlHeld) {
      if (currentSelection === selectedEid) {
        if (selectedBodyPartPath && selectedBodyPartPath.length > 0) {
          const samePath = currentBodyPartPath &&
            selectedBodyPartPath.length === currentBodyPartPath.length &&
            selectedBodyPartPath.every((v, i) => v === currentBodyPartPath[i]);

          if (samePath) {
            clearPartSelection(ctx);
          } else {
            setSingleEntitySelection(ctx, selectedEid);
            setSinglePartSelection(ctx, selectedBodyPartPath, normalizedBodyPartAddress, normalizedBodyPartTarget);
          }
        } else {
          setSingleEntitySelection(ctx, selectedEid);
          clearPartSelection(ctx);
        }
      } else {
        setSingleEntitySelection(ctx, selectedEid);
        if (selectedBodyPartPath && selectedBodyPartPath.length > 0) {
          setSinglePartSelection(ctx, selectedBodyPartPath, normalizedBodyPartAddress, normalizedBodyPartTarget);
        } else {
          clearPartSelection(ctx);
        }
      }
    }
    else {
      setSingleEntitySelection(ctx, selectedEid);
      clearPartSelection(ctx);
    }
  } else {
    if (!ctrlHeld) {
      if (sessionConfig.capabilities.keepPrimarySelection) {
        const primaryEntity = findAssetPrimaryEntity(ctx);
        setSingleEntitySelection(ctx, primaryEntity);
      } else {
        setSingleEntitySelection(ctx, undefined);
      }
      clearPartSelection(ctx);
    }
  }
}
