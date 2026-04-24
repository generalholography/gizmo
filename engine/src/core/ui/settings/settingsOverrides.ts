// Central store for runtime settings overrides supplied via EngineConfig.
// Keys match values in SETTINGS_KEYS. Values override localStorage.

import { ECSContext, getResource, setResource } from "../../ecs";

export function setSettingsOverrides(ctx: ECSContext, newOverrides: Record<string, any> | undefined | null) {
    setResource(ctx, 'settingsOverrides', newOverrides ? { ...newOverrides } : {});
}

export function getSettingsOverride(ctx: ECSContext, key: string) {
    const overrides = getResource(ctx, 'settingsOverrides', true) || {};
    return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : undefined;
}
