import { ECSContext } from "./ecs";
import { getSettingsOverride } from "./ui/settings/settingsOverrides";
import { detectMobile } from "../utils/deviceDetection";

// Centralized settings keys
export const SETTINGS_KEYS = {
  MOUSE_SENSITIVITY: 'game_settings_mouse_sensitivity',
  SSAO_QUALITY: 'game_settings_ssao_quality',
  SHADOW_QUALITY: 'game_settings_shadow_quality',
  ANTIALIAS: 'game_settings_antialias',
  BRYCE_MODE: 'game_settings_bryce_mode',
  RENDER_SCALE: 'game_settings_render_scale',
  USE_LIGHTS: 'game_settings_use_lights',
  DEBUG_GLTF_TIMING: 'game_settings_debug_gltf_timing',
} as const;

// Types mirrored from UI
export type RenderScale = number;
export type SSAOQuality = 'off' | 'low' | 'med' | 'high' | 'ultra';
export type ShadowQuality = 'off' | 'low' | 'med' | 'high';

// Render scale options
export const RENDER_SCALES: RenderScale[] = [0.5, 1.0];

export function getRenderScale(ctx?: ECSContext): RenderScale {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.RENDER_SCALE) : undefined;
  if (ov !== undefined) {
    const parsedOv = parseFloat(ov);
    return RENDER_SCALES.includes(parsedOv) ? parsedOv : 1.0;
  }
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.RENDER_SCALE) : null;
  const defaultValue = (typeof devicePixelRatio !== 'undefined' && devicePixelRatio >= 2.0) ? 0.5 : 1.0;
  const parsed = stored ? parseFloat(stored) : defaultValue;
  return RENDER_SCALES.includes(parsed) ? parsed : 1.0;
}

export function setRenderScale(value: RenderScale): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.RENDER_SCALE, value.toString());
}

export function getMouseSensitivity(ctx?: ECSContext): number {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.MOUSE_SENSITIVITY) : undefined;
  if (ov !== undefined) return parseFloat(ov);
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.MOUSE_SENSITIVITY) : null;
  return stored ? parseFloat(stored) : 1.0;
}

export function setMouseSensitivity(value: number): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.MOUSE_SENSITIVITY, value.toString());
}

export function getSSAOQuality(ctx?: ECSContext): SSAOQuality {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.SSAO_QUALITY) : undefined;
  if (ov !== undefined) return ov as SSAOQuality;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.SSAO_QUALITY) : null;
  let defaultValue: SSAOQuality = 'med';
  if (detectMobile()) defaultValue = 'off';
  return (stored as SSAOQuality) || defaultValue;
}

export function setSSAOQuality(value: SSAOQuality): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.SSAO_QUALITY, value);
}

export function getAntialias(ctx?: ECSContext): boolean {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.ANTIALIAS) : undefined;
  if (ov !== undefined) return ov !== 'false' && ov !== false;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.ANTIALIAS) : null;
  return stored !== 'false';
}

export function setAntialias(value: boolean): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.ANTIALIAS, value.toString());
}

export function getShadowQuality(ctx?: ECSContext): ShadowQuality {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.SHADOW_QUALITY) : undefined;
  if (ov !== undefined) return ov as ShadowQuality;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.SHADOW_QUALITY) : null;
  let defaultValue: ShadowQuality = 'med';
  if (detectMobile()) defaultValue = 'low';
  return (stored as ShadowQuality) || defaultValue;
}

export function setShadowQuality(value: ShadowQuality): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.SHADOW_QUALITY, value);
}

export function getBryceMode(ctx?: ECSContext): boolean {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.BRYCE_MODE) : undefined;
  if (ov !== undefined) return ov === true || ov === 'true';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.BRYCE_MODE) : null;
  return stored === 'true';
}

export function setBryceMode(value: boolean): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.BRYCE_MODE, value.toString());
}

export function getUseLights(ctx?: ECSContext): boolean {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.USE_LIGHTS) : undefined;
  if (ov !== undefined) return ov !== false || ov !== 'false';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.USE_LIGHTS) : null;
  return stored !== 'false';
}

export function setUseLights(value: boolean): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEYS.USE_LIGHTS, value.toString());
}

export function getGltfTimingDebug(ctx?: ECSContext): boolean {
  const ov = ctx ? getSettingsOverride(ctx, SETTINGS_KEYS.DEBUG_GLTF_TIMING) : undefined;
  if (ov !== undefined) return ov === true || ov === 'true';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEYS.DEBUG_GLTF_TIMING) : null;
  return stored === 'true';
}
