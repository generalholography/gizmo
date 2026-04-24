import { Module } from "./Module";
import { ECSContext, getModule, getResource } from "../core/ecs";
import { hasComponent, addComponent } from "bitecs";
import { Inventory, addToInventory, inventoryChanged } from "../core/inventory";
import { despawn, getEntityBundle } from "../core/despawn";
import { Metrics } from "../core/metrics";
import { Owner, Held, _InputState, Transform, StableID, MotionSource, Player } from "../core/components";
import { spawn, ArchetypeRef } from "../core/spawn";
import { Mounting, MountedBy } from "../core/components";
import * as THREE from "three";
import { getName } from "../core/components/Info";
import { getSpawnTransform } from "./renderer";
import { getTimeAliveInSeconds, SpawnedAt } from "../core/components/SpawnedAt";
import { doDamage, doHeal, Health } from "../core/components/Health";
import { Effect, ActionEffect, EffectBase, ParticleEmitter as ParticleEmitterDefinition, Vector3, EffectType, EFFECT_TYPE_OPTIONS } from "../core/schema";
import { syncObject3DTransformFromECS } from "../core/systems/bodyRendering";
import { EntityStoreModule, getStore, InventoryStore, LazySetStore, StockStore, Store } from "./entityStore";
import { getRuleModule } from "./rule";
import { resolveEffectTarget } from "./effectTargetResolver";

export type EffectContext = {
  hitPosition?: THREE.Vector3;
};

type EffectResolutionContext = {
  self: number;
  other?: number;
  user?: number;
};

export interface EffectResolved {
  apply: (actor: number | undefined, target?: number, context?: EffectContext, resolutionContext?: EffectResolutionContext) => boolean;
}

export const RUNTIME_EFFECT_TYPES: EffectType[] = [...EFFECT_TYPE_OPTIONS];

function resolveVector3(value: Vector3 | undefined, fallback: THREE.Vector3): THREE.Vector3 {
  if (Array.isArray(value)) {
    return new THREE.Vector3(value[0] ?? fallback.x, value[1] ?? fallback.y, value[2] ?? fallback.z);
  }
  if (value && typeof value === 'object') {
    return new THREE.Vector3(value.x ?? fallback.x, value.y ?? fallback.y, value.z ?? fallback.z);
  }
  return fallback.clone();
}

function cloneEntityDefinition(value: string | Record<string, any>): string | Record<string, any> {
  if (typeof value === "string") return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall back to JSON clone.
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.floor(numeric));
}

function resolveStoreEffectSubject(
  ctx: ECSContext,
  subject: unknown,
  target: number | undefined,
  resolutionContext: EffectResolutionContext | undefined,
): number | undefined {
  if (subject === undefined || subject === "target") return target;
  if (subject === "self") return resolutionContext?.self;
  if (subject === "other") return resolutionContext?.other;
  if (subject === "user") return resolutionContext?.user;
  if (subject === "owner") {
    if (target === undefined || !hasComponent(ctx, Owner, target)) return undefined;
    return Owner.eid[target];
  }
  return target;
}

function getInventoryEntitySignature(definition: unknown): { archetype?: string; name?: string } {
  if (typeof definition === "string") {
    return { archetype: definition };
  }

  if (!definition || typeof definition !== "object") {
    return {};
  }

  const source = definition as Record<string, any>;
  const archetype = typeof source._meta?.archetype === "string"
    ? source._meta.archetype
    : (typeof source.archetype === "string" ? source.archetype : undefined);
  const name = typeof source.Info?.name === "string"
    ? source.Info.name
    : (typeof source.name === "string" ? source.name : undefined);

  return { archetype, name };
}

function matchesInventoryEntitySignature(
  signature: { archetype?: string; name?: string },
  requestedArchetype?: string,
  requestedName?: string,
): boolean {
  // Archetype is the stable/native identifier for inventory entity entries.
  // If archetype is supplied, we prefer it. Name is only a fallback for inline
  // bundle entries that may not retain explicit archetype metadata.
  if (requestedArchetype) {
    if (signature.archetype !== undefined) {
      return signature.archetype === requestedArchetype;
    }
    if (requestedName) {
      return signature.name === requestedName;
    }
    return false;
  }

  if (requestedName) {
    return signature.name === requestedName;
  }

  return false;
}

class EffectModule extends Module<EffectBase, EffectResolved> {
  constructor(ctx: ECSContext) {
    const factories: Record<EffectType, (params: any) => EffectResolved> = {
      addToInventory: (params: any) => {
        const count = normalizePositiveInteger(params?.count, 1);
        const item = params?.item as string | Record<string, any> | undefined;
        const subject = params?.subject;

        return {
          apply: (_actor?: number, target?: number, _context?: EffectContext, resolutionContext?: EffectResolutionContext): boolean => {
            if (!item) return false;

            const inventoryEid = resolveStoreEffectSubject(ctx, subject, target, resolutionContext);
            if (inventoryEid === undefined) return false;

            const inventories = getStore<InventoryStore>(ctx, "inventory");
            const inv = inventories.get(inventoryEid);
            if (!inv) return false;

            const availableSlots: number[] = [];
            for (let i = 0; i < inv.size; i++) {
              if (inv.slots[i] === null) availableSlots.push(i);
            }

            if (availableSlots.length < count) return false;

            for (let i = 0; i < count; i++) {
              const slotIndex = availableSlots[i];
              inv.slots[slotIndex] = {
                type: "entity",
                definition: cloneEntityDefinition(item),
              };
            }

            inventoryChanged(ctx, inventoryEid);
            return true;
          },
        };
      },
      removeFromInventory: (params: any) => {
        const count = normalizePositiveInteger(params?.count, 1);
        const requestedArchetype = typeof params?.archetype === "string" && params.archetype.trim().length > 0
          ? params.archetype.trim()
          : undefined;
        const requestedName = typeof params?.name === "string" && params.name.trim().length > 0
          ? params.name.trim()
          : undefined;
        const subject = params?.subject;

        return {
          apply: (_actor?: number, target?: number, _context?: EffectContext, resolutionContext?: EffectResolutionContext): boolean => {
            if (!requestedArchetype && !requestedName) return false;

            const inventoryEid = resolveStoreEffectSubject(ctx, subject, target, resolutionContext);
            if (inventoryEid === undefined) return false;

            const inventories = getStore<InventoryStore>(ctx, "inventory");
            const inv = inventories.get(inventoryEid);
            if (!inv) return false;

            const matchingSlots: number[] = [];
            for (let i = 0; i < inv.size; i++) {
              const slot = inv.slots[i];
              if (!slot || slot.type !== "entity") continue;

              const signature = getInventoryEntitySignature(slot.definition);
              if (!matchesInventoryEntitySignature(signature, requestedArchetype, requestedName)) continue;
              matchingSlots.push(i);
            }

            if (matchingSlots.length < count) return false;

            for (let i = 0; i < count; i++) {
              inv.slots[matchingSlots[i]] = null;
            }

            inventoryChanged(ctx, inventoryEid);
            return true;
          },
        };
      },
      incrementStock: (params: any) => {
        const stockName = typeof params?.stock === "string" && params.stock.trim().length > 0
          ? params.stock.trim()
          : "";
        const delta = Number(params?.delta ?? 0);
        const subject = params?.subject;

        return {
          apply: (_actor?: number, target?: number, _context?: EffectContext, resolutionContext?: EffectResolutionContext): boolean => {
            if (!stockName || !Number.isFinite(delta)) return false;

            const stockEid = resolveStoreEffectSubject(ctx, subject, target, resolutionContext);
            if (stockEid === undefined) return false;

            const entityStore = getModule<EntityStoreModule>(ctx, "entityStore", true);
            if (!entityStore || !entityStore.hasStore(stockName) || entityStore.getStoreType(stockName) !== "stock") {
              return false;
            }

            const stocks = getStore<StockStore>(ctx, stockName);
            const current = stocks.get(stockEid);
            if (!current) return false;

            const min = current.min ?? 0;
            const max = current.max;
            const nextCurrent = Math.max(min, Math.min(max, current.current + delta));
            stocks.set(stockEid, { ...current, current: nextCurrent, min });

            if (stockName === "health" && hasComponent(ctx, Health, stockEid)) {
              Health.value[stockEid] = nextCurrent;
              Health.maxValue[stockEid] = max;
            }

            return true;
          },
        };
      },
      setMetric: (params: any) => {
        const metric = typeof params?.metric === "string" && params.metric.trim().length > 0
          ? params.metric.trim()
          : "";
        const rawSubtype = typeof params?.subpath === "string" ? params.subpath : params?.subtype;
        const subtype = typeof rawSubtype === "string" && rawSubtype.trim().length > 0
          ? rawSubtype.trim()
          : undefined;
        const value = Number(params?.value);
        const subject = params?.subject;

        return {
          apply: (_actor?: number, target?: number, _context?: EffectContext, resolutionContext?: EffectResolutionContext): boolean => {
            if (!metric || !Number.isFinite(value)) return false;
            const metrics = getResource<Metrics>(ctx, "metrics");
            if (!metrics) return false;

            const metricEid = resolveStoreEffectSubject(ctx, subject, target, resolutionContext);
            if (metricEid === undefined) return false;

            if (subtype) {
              metrics.set(metricEid, metric, subtype, value);
            } else {
              metrics.set(metricEid, metric, value);
            }

            return true;
          },
        };
      },
      incrementMetric: (params: any) => {
        const metric = typeof params?.metric === "string" && params.metric.trim().length > 0
          ? params.metric.trim()
          : "";
        const rawSubtype = typeof params?.subpath === "string" ? params.subpath : params?.subtype;
        const subtype = typeof rawSubtype === "string" && rawSubtype.trim().length > 0
          ? rawSubtype.trim()
          : undefined;
        const delta = Number(params?.delta ?? 1);
        const subject = params?.subject;

        return {
          apply: (_actor?: number, target?: number, _context?: EffectContext, resolutionContext?: EffectResolutionContext): boolean => {
            if (!metric || !Number.isFinite(delta)) return false;
            const metrics = getResource<Metrics>(ctx, "metrics");
            if (!metrics) return false;

            const metricEid = resolveStoreEffectSubject(ctx, subject, target, resolutionContext);
            if (metricEid === undefined) return false;

            if (subtype) {
              metrics.increment(metricEid, metric, subtype, delta);
            } else {
              metrics.increment(metricEid, metric, delta);
            }

            return true;
          },
        };
      },
      damage: (params: any) => {
        const amount = params?.amount ?? 1;
        const knockback = params?.knockback ?? 1;
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (target === undefined) return false;
            return doDamage(ctx, hasComponent(ctx, Owner, actor) ? Owner.eid[actor] : actor, target, amount, knockback);
          },
        };
      },
      heal: (params: any) => {
        const amount = params?.amount ?? 1;
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (target === undefined) return false;
            return doHeal(ctx, hasComponent(ctx, Owner, actor) ? Owner.eid[actor] : actor, target, amount);
          },
        };
      },
      discover: (_params: any) => {
        const discoveries = getStore<LazySetStore>(ctx, 'discoveredBy');
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (actor === undefined || target === undefined) return false;
            if (!hasComponent(ctx, _InputState, actor)) return false;

            // Check if the actor has already discovered the target
            // Store uses eids at runtime (converted to stableIds during serialization)
            if (discoveries.get(target).has(actor)) return false;

            const metrics = getResource<Metrics>(ctx, 'metrics');
            const name = getName(ctx, target) ?? 'unknown';
            metrics.increment(actor, 'discoveries', name);

            // Store entity IDs - will be converted to stableIds during serialization
            discoveries.get(target).add(actor);
            return true;
          },
        };
      },
      mount: (params: any) => {
        const off: [number, number, number] = params?.offset ?? [0, 0, 0];
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (actor === undefined || target === undefined) return false;
            addComponent(ctx, Mounting, actor);
            Mounting.target[actor] = target;
            Mounting.offsetX[actor] = off[0];
            Mounting.offsetY[actor] = off[1];
            Mounting.offsetZ[actor] = off[2];

            addComponent(ctx, MountedBy, target);
            MountedBy.eid[target] = actor;
            return true;
          },
        };
      },
      teleport: (params: any) => {
        const position = params?.position ?? { x: 0, y: 0, z: 0 };
        return {
          apply: (actor?: number, target?: number): boolean => {
            const targetEid = target;
            if (targetEid === undefined) return false;
            if (hasComponent(ctx, Transform, targetEid)) {
              Transform.x[targetEid] = position.x ?? position[0] ?? 0;
              Transform.y[targetEid] = position.y ?? position[1] ?? 0;
              Transform.z[targetEid] = position.z ?? position[2] ?? 0;
              // Need to also sync runtime Three/Rapier objects
              syncObject3DTransformFromECS(ctx, targetEid);
              if (hasComponent(ctx, MotionSource, targetEid)) {
                const rb = ctx.rapier.world.bodies.get(MotionSource.bodyHandle[targetEid]);
                if (rb) {
                  rb.setTranslation({ x: Transform.x[targetEid], y: Transform.y[targetEid], z: Transform.z[targetEid] }, true);
                  rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
                  rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
                }
              }
              return true;
            }
            return false;
          },
        };
      },
      kill: (_params: any) => {
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (target === undefined) return false;

            // Check if the target being killed is a held item
            const held = getStore<Store<{ eid: number; slot: number }>>(ctx, "heldItems");
            const inventories = getStore<InventoryStore>(ctx, 'inventory');
            // Find if this entity is held by someone
            for (const [holderEid, heldData] of held.entries()) {
              if (heldData.eid === target) {
                // Remove the item from the holder's inventory
                const inv = inventories.get(holderEid);
                if (inv && heldData.slot >= 0 && heldData.slot < inv.size) {
                  inv.slots[heldData.slot] = null;
                  inventoryChanged(ctx, holderEid);
                }
                break;
              }
            }

            // Kill target naturally if it has Health, otherwise just despawn
            if (hasComponent(ctx, Health, target)) {
              doDamage(ctx, actor, target, Health.value[target], 0); // No knockback for kill effect
              return true;
            } else {
              despawn(ctx, target);
              return true;
            }
          },
        };
      },
      getPickedUp: (_params: any) => {
        const pickedUpBy = getStore<LazySetStore>(ctx, 'pickedUpBy');
        const metrics = getResource<Metrics>(ctx, 'metrics');
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (target === undefined || actor === undefined) return false;
            const inventories = getStore<InventoryStore>(ctx, 'inventory');
            const inv = inventories.get(actor);
            if (inv) {
              // Check if this is the first time this actor has picked up this target
              // Store uses eids at runtime (converted to stableIds during serialization)
              const isFirstPickup = !pickedUpBy.get(target).has(actor);
              
              // Add actor to pickedUpBy BEFORE getting the bundle
              // so the bundle includes the updated pickedUpBy data
              if (isFirstPickup) {
                pickedUpBy.get(target).add(actor);
              }
              
              // Get entity bundle AFTER updating pickedUpBy
              // This ensures the bundle going into inventory includes the current pickup
              const bundle = getEntityBundle(ctx, target);
              
              if (addToInventory(inv, { type: 'entity', definition: bundle })) {
                if (isFirstPickup) {
                  console.log(`Entity ${target} (stableId: ${StableID.id[target]}) picked up by ${actor} (stableId: ${StableID.id[actor]})`);
                  metrics.increment(actor, 'items picked up', bundle?.Info?.name);
                }
                despawn(ctx, target);
                inventoryChanged(ctx, actor);
                return true;
              } else {
                // If addToInventory failed, remove the actor from pickedUpBy
                if (isFirstPickup) {
                  pickedUpBy.get(target).delete(actor);
                }
              }
            }
            return false;
          },
        };
      },
      spawnEntityFrom: (params: any) => {
        const entity: ArchetypeRef = params?.entity;
        const velocity = params?.velocity ?? 0;
        return {
          apply: (actor?: number, target?: number): boolean => {
            const sourceEid = target;
            if (target === undefined) return false;

            if (!entity) {
              console.error(`No entity specified for spawnEntityFrom effect on actor ${actor}. Skipping`);
              return false;
            }

            // Get spawn transform from the source entity
            const t = getSpawnTransform(ctx, sourceEid);
            const spawnPos = t.position.clone();
            const vel = t.zAxis.clone().multiplyScalar(velocity);
            const owner = hasComponent(ctx, Held, sourceEid) ? Held.eid[sourceEid] : sourceEid;

            spawn(ctx, entity, {
              Transform: {
                x: spawnPos.x,
                y: spawnPos.y,
                z: spawnPos.z,
                qx: t.rotation.x,
                qy: t.rotation.y,
                qz: t.rotation.z,
                qw: t.rotation.w,
              },
              Velocity: { x: vel.x, y: vel.y, z: vel.z },
              Owner: { eid: owner },
            });
            return true;
          },
        };
      },
      spawnAtHit: (params: any) => {
        const entity: ArchetypeRef = params?.entity;
        const velocity = params?.velocity ?? 0;
        return {
          apply: (actor?: number, target?: number, context?: EffectContext): boolean => {
            const sourceEid = target;
            if (target === undefined || !context?.hitPosition) return false;

            if (!entity) {
              console.error(`No entity specified for spawnAtHit effect on actor ${actor}. Skipping`);
              return false;
            }

            const t = getSpawnTransform(ctx, sourceEid);
            const spawnPos = context.hitPosition.clone();
            const yawOnly = new THREE.Quaternion();
            const yaw = new THREE.Euler().setFromQuaternion(t.rotation, 'YXZ').y;
            yawOnly.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawOnly);
            const vel = forward.clone().multiplyScalar(velocity);
            const owner = hasComponent(ctx, Held, sourceEid) ? Held.eid[sourceEid] : sourceEid;

            spawn(ctx, entity, {
              Transform: {
                x: spawnPos.x,
                y: spawnPos.y,
                z: spawnPos.z,
                qx: yawOnly.x,
                qy: yawOnly.y,
                qz: yawOnly.z,
                qw: yawOnly.w,
              },
              Velocity: { x: vel.x, y: vel.y, z: vel.z },
              Owner: { eid: owner },
            });
            return true;
          },
        };
      },
      emitParticles: (params: { emitter?: ParticleEmitterDefinition; position?: Vector3; duration?: number }) => {
        const emitter = params?.emitter;
        const positionOverride = params?.position;
        const duration = params?.duration ?? emitter?.duration ?? 0;
        return {
          apply: (_actor?: number, target?: number, context?: EffectContext): boolean => {
            if (!emitter) {
              console.error(`No emitter specified for emitParticles effect. Skipping`);
              return false;
            }

            let spawnPos = new THREE.Vector3();
            if (positionOverride) {
              spawnPos = resolveVector3(positionOverride, spawnPos);
            } else if (context?.hitPosition) {
              spawnPos = context.hitPosition.clone();
            } else if (target !== undefined && hasComponent(ctx, Transform, target)) {
              spawnPos.set(Transform.x[target], Transform.y[target], Transform.z[target]);
            }

            const bundle: Record<string, any> = {
              Transform: {
                x: spawnPos.x,
                y: spawnPos.y,
                z: spawnPos.z,
              },
              ParticleEmitter: {
                ...emitter,
                duration: emitter.duration ?? duration,
              },
              Info: {
                name: 'Particle Burst',
                description: 'Effect spawned particle burst',
              },
            };

            if (duration > 0) {
              bundle.Rules = [{
                trigger: { type: 'time', params: { delay: duration } },
                actions: { type: 'kill', target: 'self', params: {} },
              }];
            }

            spawn(ctx, bundle);
            return true;
          },
        };
      },

      emitEvent: (params: any) => {
        const name = params?.name;
        const payload = params?.payload;
        return {
          apply: (actor?: number, target?: number): boolean => {
            if (!name || typeof name !== 'string') return false;
            const rule = getRuleModule(ctx);
            rule.emitGlobalEvent(name, { actor, target, payload });
            return true;
          },
        };
      },
      popup: (params: any) => {
        const text = params?.text ?? "No text provided";
        return {
          apply: (actor?: number, target?: number): boolean => {    
            // Only allow popups if the target is a player
            if (target === undefined || !hasComponent(ctx, Player, target)) {
              return false;
            }     

            // Access the showTextModal function from the UI context
            const showTextModal = (ctx as any).showTextModal;
            if (showTextModal) {
              showTextModal(text);
              return true;
            }
            
            console.warn("Text modal function not available");
            return false;
          },
        };
      }
    };
    super(ctx, factories);
  }
}

// New function to apply effects following the schema.ts Effect format
export function applyEffect(
  ctx: ECSContext,
  effect: Effect,
  self: number,
  other?: number,
  context?: EffectContext,
  user?: number,
): boolean {
  const effectMod = getModule<EffectModule>(ctx, 'effect');
  const resolvedEffect = effectMod.get(effectMod.resolve(effect));

  const resolution = resolveEffectTarget("rule", effect.target, { self, other, user });
  if (!resolution.ok) {
    const failedResolution = resolution as Extract<typeof resolution, { ok: false }>;
    console.warn(`[rules] Failed to resolve effect target '${effect.target ?? "self"}': ${failedResolution.message}`);
    if (effect.onFailure) {
      for (const failureEffect of effect.onFailure) {
        applyEffect(ctx, failureEffect, self, other, context, user);
      }
    }
    return false;
  }

  const success = resolvedEffect.apply(resolution.actor, resolution.target, context, { self, other, user });

  // Handle onSuccess and onFailure effects based on the actual result
  if (success && effect.onSuccess) {
    for (const successEffect of effect.onSuccess) {
      applyEffect(ctx, successEffect, self, other, context, user);
    }
  } else if (!success && effect.onFailure) {
    for (const failureEffect of effect.onFailure) {
      applyEffect(ctx, failureEffect, self, other, context, user);
    }
  }

  return success;
}

// New function to apply ActionEffect with support for "user" target
export function applyActionEffect(
  ctx: ECSContext,
  effect: ActionEffect,
  self: number,
  user: number,
  other?: number,
  context?: EffectContext,
): boolean {
  const effectMod = getModule<EffectModule>(ctx, 'effect');
  const resolvedEffect = effectMod.get(effectMod.resolve(effect as EffectBase));

  const resolution = resolveEffectTarget("action", effect.target, { self, other, user });
  if (!resolution.ok) {
    const failedResolution = resolution as Extract<typeof resolution, { ok: false }>;
    console.warn(`[rules] Failed to resolve action effect target '${effect.target}': ${failedResolution.message}`);
    if (effect.onFailure) {
      for (const failureEffect of effect.onFailure) {
        applyActionEffect(ctx, failureEffect, self, user, other, context);
      }
    }
    return false;
  }

  const success = resolvedEffect.apply(resolution.actor, resolution.target, context, { self, other, user });

  // Handle onSuccess and onFailure effects based on the actual result
  if (success && effect.onSuccess) {
    for (const successEffect of effect.onSuccess) {
      applyActionEffect(ctx, successEffect, self, user, other, context);
    }
  } else if (!success && effect.onFailure) {
    for (const failureEffect of effect.onFailure) {
      applyActionEffect(ctx, failureEffect, self, user, other, context);
    }
  }

  return success;
}

// Helper function to apply multiple effects and return overall success
export function applyEffects(ctx: ECSContext, effects: Effect[], self: number, other?: number): boolean {
  let anySuccess = false;
  for (const effect of effects) {
    if (applyEffect(ctx, effect, self, other, undefined, undefined)) {
      anySuccess = true;
    }
  }
  return anySuccess;
}

// Helper function to apply effects with range check for EffectWithRange
export function applyEffectWithRange(
  ctx: ECSContext,
  effect: Effect & { range?: number },
  self: number,
  other?: number,
  actualRange?: number,
  user?: number,
): boolean {
  const effectRange = (effect as any).range || 0;
  if (effectRange > 0 && actualRange !== undefined && actualRange > effectRange) {
    return false; // Out of range, consider it a failure
  }
  return applyEffect(ctx, effect, self, other, undefined, user);
}

export const effectModule = (ctx: ECSContext) => new EffectModule(ctx);
