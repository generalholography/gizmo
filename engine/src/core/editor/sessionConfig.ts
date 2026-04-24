import type { ECSContext } from '../ecs';
import { getResource, setResource } from '../ecs';
import { Transform } from '../components/Transform';
import { defineQuery } from 'bitecs';
import { stableIdToEid } from '../../utils/stableId';

export type EditorSessionScope = 'asset' | 'pack' | 'world';

export interface EditorSessionCapabilities {
  showHierarchyTab: boolean;
  showPrefabsTab: boolean;
  showAssetsTab: boolean;
  showTasksTab: boolean;
  showAnimationTab: boolean;
  showSimulationTab: boolean;
  showRenderTab: boolean;
  showLoadButton: boolean;
  showSpawnTools: boolean;
  showPlayControls: boolean;
  keepPrimarySelection: boolean;
  directPartSelection: boolean;
}

export interface EditorSessionConfig {
  scope?: EditorSessionScope;
  primaryEntityStableId?: number;
  capabilities?: Partial<EditorSessionCapabilities>;
}

export interface ResolvedEditorSessionConfig {
  scope: EditorSessionScope;
  primaryEntityStableId?: number;
  capabilities: EditorSessionCapabilities;
}

const assetPrimaryEntityQuery = defineQuery([Transform]);

const DEFAULT_WORLD_CAPABILITIES: EditorSessionCapabilities = {
  showHierarchyTab: true,
  showPrefabsTab: true,
  showAssetsTab: true,
  showTasksTab: true,
  showAnimationTab: true,
  showSimulationTab: true,
  showRenderTab: true,
  showLoadButton: true,
  showSpawnTools: true,
  showPlayControls: true,
  keepPrimarySelection: false,
  directPartSelection: false,
};

const DEFAULT_ASSET_CAPABILITIES: EditorSessionCapabilities = {
  showHierarchyTab: true,
  showPrefabsTab: false,
  showAssetsTab: false,
  showTasksTab: false,
  showAnimationTab: false,
  showSimulationTab: false,
  showRenderTab: false,
  showLoadButton: false,
  showSpawnTools: false,
  showPlayControls: false,
  keepPrimarySelection: true,
  directPartSelection: true,
};

export function resolveEditorSessionConfig(
  config?: EditorSessionConfig,
): ResolvedEditorSessionConfig {
  const scope = config?.scope ?? 'world';
  const baseCapabilities =
    scope === 'asset' ? DEFAULT_ASSET_CAPABILITIES : DEFAULT_WORLD_CAPABILITIES;

  return {
    scope,
    primaryEntityStableId:
      typeof config?.primaryEntityStableId === 'number' ? config.primaryEntityStableId : undefined,
    capabilities: {
      ...baseCapabilities,
      ...(config?.capabilities ?? {}),
    },
  };
}

export function getResolvedEditorSessionConfig(ctx: ECSContext): ResolvedEditorSessionConfig {
  const config = getResource<ResolvedEditorSessionConfig | undefined>(ctx, 'editorSessionConfig', true);
  return config ?? resolveEditorSessionConfig();
}

export function findAssetPrimaryEntity(ctx: ECSContext): number | undefined {
  const existing = getResource<number | undefined>(ctx, 'assetPrimaryEntity', true);
  if (existing !== undefined) return existing;
  const sessionConfig = getResolvedEditorSessionConfig(ctx);
  if (typeof sessionConfig.primaryEntityStableId === 'number') {
    const targeted = stableIdToEid(ctx, sessionConfig.primaryEntityStableId);
    if (targeted !== undefined) {
      setResource(ctx, 'assetPrimaryEntity', targeted);
      return targeted;
    }
  }
  const eids = assetPrimaryEntityQuery(ctx);
  const next = eids[0];
  if (next !== undefined) {
    setResource(ctx, 'assetPrimaryEntity', next);
  }
  return next;
}
