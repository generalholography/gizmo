import { ECSContext, setResource, getResource } from "../core/ecs";
import { Effect, EffectWithRange } from "../core/schema";

// Simple ID-based storage for effect arrays
let nextEffectsId = 1;

export function registerEffectsArray(ctx: ECSContext, effects: Effect[] | EffectWithRange[]): number {
  const effectsArrays = getResource<Map<number, Effect[] | EffectWithRange[]>>(ctx, 'effectsArrays') || new Map();
  const id = nextEffectsId++;
  effectsArrays.set(id, effects);
  setResource(ctx, 'effectsArrays', effectsArrays);
  return id;
}

export function getEffectsArray(ctx: ECSContext, id: number): Effect[] | EffectWithRange[] | undefined {
  const effectsArrays = getResource<Map<number, Effect[] | EffectWithRange[]>>(ctx, 'effectsArrays');
  return effectsArrays?.get(id);
}