import { addEntity, addComponent, hasComponent, getEntityComponents, defineQuery } from "bitecs";
import * as THREE from "three";
import * as Components from "./components";
import { identityTransform } from "./components/Transform";
import { ECSContext, getModule, getResource, setResource } from "./ecs";
import { ArchetypeBundle } from "../modules/archetype";
import { inventoryChanged } from "./inventory";
import { encode, decode, writeEncodedString } from "../utils/strings";
import { SpawnedAt } from "./components/SpawnedAt";
import { NO_FACTION_ID } from "./components/Faction";
import { AI, AIState } from "./components/AI";
import { applyParticleEmitterDefinition } from "./particles";
import {
  getStore,
  InventoryStore,
  LazySetStore, 
  MetricsStore, 
  UnlockedAchievementsStore,
  AIMemoryStore,
  HeldItemsStore,
  InventoryCooldownsStore,
  ArchetypeRefStore,
  StableIdReferenceStore,
  StockStore,
  Store
} from "../modules/entityStore";
import { stableIdSetToEidSet } from "../utils/stableId";
import type { Metrics } from "./metrics";
import { syncObject3DTransformFromECS } from "./systems/bodyRendering";
import { getRuleModule, RuleDefinition } from "../modules/rule";
import { LEGACY_EFFECT_COMPONENT_KEYS } from "./migrations/legacyOnMigration";

export type ArchetypeRef = string | ArchetypeBundle;

// Query to find existing player entities
const playerQuery = defineQuery([Components.Player]);

// Deferred entity references - stored during spawning, resolved after all entities are created
// This is needed because when entity A references entity B by stableId, B might not exist yet
type DeferredEntityReference = {
  eid: number;
  storeName: 'discoveredBy' | 'pickedUpBy';
  stableIds: number[];
};
const deferredEntityReferences: DeferredEntityReference[] = [];

function applyReferenceStoreFromStableIds(
  ctx: ECSContext,
  eid: number,
  storeName: 'discoveredBy' | 'pickedUpBy',
  stableIds: number[]
) {
  const eidSet = stableIdSetToEidSet(ctx, new Set(stableIds));
  if (eidSet.size === stableIds.length) {
    const store = getStore<StableIdReferenceStore>(ctx, storeName);
    store.set(eid, eidSet);
  } else if (eidSet.size === 0 && stableIds.length > 0) {
    const store = getStore<StableIdReferenceStore>(ctx, storeName);
    store.set(eid, new Set(stableIds));
  } else {
    addDeferredEntityReference(ctx, eid, storeName, stableIds);
  }
}

function applyStoresComponent(ctx: ECSContext, eid: number, stores: any[]): void {
  let entityStore = getModule(ctx, 'entityStore') as any;
  if (!entityStore) {
    getStore(ctx, 'inventory');
    entityStore = getModule(ctx, 'entityStore') as any;
  }
  if (!entityStore) return;

  for (const entry of stores) {
    const storeName = entry?.store ?? entry?.id;
    if (!storeName || typeof storeName !== 'string') continue;

    // Backward compatibility + dynamic stock instances in Stores payload
    const candidateValue = entry?.value ?? entry?.params;
    if (!entityStore.hasStore(storeName) && (entry?.type === 'stock' || candidateValue?.current !== undefined || candidateValue?.max !== undefined)) {
      entityStore.registerStoreInstance(storeName, 'stock');
    }

    const storeType = entityStore.getStoreType(storeName);
    if (!storeType) continue;

    const store = entityStore.getStore(storeName);
    const value = entry?.value ?? entry?.params;

    if (storeName === 'discoveredBy' || storeName === 'pickedUpBy') {
      const stableIds = Array.isArray(value) ? value : (Array.isArray(value?.stableIds) ? value.stableIds : []);
      applyReferenceStoreFromStableIds(ctx, eid, storeName, stableIds);
      continue;
    }

    if (storeType === 'stock') {
      const stockValue = {
        current: value?.current ?? 0,
        max: value?.max ?? 1,
        min: value?.min ?? 0,
      };
      store.deserialize(eid, stockValue);
      continue;
    }

    if (storeName === 'inventory') {
      store.deserialize(eid, value);

      if (!hasComponent(ctx, Components.Inventory, eid)) {
        addComponent(ctx, Components.Inventory, eid);
      }

      const invStore = getStore<InventoryStore>(ctx, 'inventory');
      const inv = invStore.get(eid);
      const selected = value?.selected ?? value?.selectedItemIndex ?? inv?.selected ?? 0;

      Components.Inventory.size[eid] = inv?.size ?? value?.size ?? 0;
      Components.Inventory.selected[eid] = selected;
      if (inv) {
        inv.selected = selected;
      }

      inventoryChanged(ctx, eid);
      continue;
    }

    store.deserialize(eid, value);
  }
}


function resolveVector3(value: any, fallback: { x: number; y: number; z: number }) {
  if (Array.isArray(value)) {
    return {
      x: value[0] ?? fallback.x,
      y: value[1] ?? fallback.y,
      z: value[2] ?? fallback.z,
    };
  }

  if (value && typeof value === 'object') {
    return {
      x: value.x ?? fallback.x,
      y: value.y ?? fallback.y,
      z: value.z ?? fallback.z,
    };
  }

  return fallback;
}

/**
 * Add a deferred entity reference to be resolved later
 * @param ctx ECS context
 * @param eid Entity ID that owns the reference
 * @param storeName Name of the store to populate
 * @param stableIds Array of stableIds to convert to eids
 */
function addDeferredEntityReference(
  ctx: ECSContext,
  eid: number,
  storeName: 'discoveredBy' | 'pickedUpBy',
  stableIds: number[]
) {
  deferredEntityReferences.push({ eid, storeName, stableIds });
}

/**
 * Restore all deferred entity references after all entities have been spawned
 * This should be called by initializeWorld after spawning all entities
 * @param ctx ECS context
 */
export function restoreDeferredEntityReferences(ctx: ECSContext) {
  for (const ref of deferredEntityReferences) {
    const eidSet = stableIdSetToEidSet(ctx, new Set(ref.stableIds));
    const store = getStore<StableIdReferenceStore>(ctx, ref.storeName);
    store.set(ref.eid, eidSet);
  }
  // Clear the deferred references after restoring
  deferredEntityReferences.length = 0;
}

export function spawn(
  ctx: ECSContext,
  ref: ArchetypeRef,
  overrides: Record<string, any> = {}
) {
  const eid = addEntity(ctx);
  const archetype = getModule(ctx, 'archetype');

  // Handle bundles with _meta.archetype (delta serialization)
  let archetypeName: string | undefined;
  let base: ArchetypeBundle;

  if (typeof ref === "string") {
    archetypeName = ref;
    base = archetype.get(archetype.resolve(ref));
  } else {
    // Check if bundle has archetype metadata
    if (ref._meta?.archetype) {
      archetypeName = ref._meta.archetype;
      // Spawn from archetype with bundle as overrides
      try {
        const archetypeBase = archetype.get(archetype.resolve(archetypeName));
        base = archetypeBase;
        // Merge the bundle (excluding _meta) as overrides
        const { _meta, ...bundleOverrides } = ref;
        applyBundle(ctx, eid, base);
        applyBundle(ctx, eid, bundleOverrides);
        applyBundle(ctx, eid, overrides);
        
        // Track archetype reference in store
        const archetypeStore = getStore<ArchetypeRefStore>(ctx, 'archetypeRef');
        archetypeStore.set(eid, archetypeName);
        
        // Ensure defaults and return early
        ensureDefaults(ctx, eid);
        return eid;
      } catch (e) {
        // Archetype doesn't exist, fall back to using bundle as-is
        console.warn(`Archetype '${archetypeName}' not found, using bundle as-is`);
        base = ref;
        archetypeName = undefined;
      }
    } else {
      base = ref;
    }
  }

  applyBundle(ctx, eid, base);
  applyBundle(ctx, eid, overrides);

  // Track archetype reference if spawned from named archetype
  if (archetypeName) {
    const archetypeStore = getStore<ArchetypeRefStore>(ctx, 'archetypeRef');
    archetypeStore.set(eid, archetypeName);
  }

  ensureDefaults(ctx, eid);

  return eid;
}

function ensureDefaults(ctx: ECSContext, eid: number) {

  // ensure a default Transform component exists
  if (!hasComponent(ctx, Components.Transform, eid)) {
    addComponent(ctx, Components.Transform, eid);
    const t = identityTransform;
    Components.Transform.x[eid] = t.x;
    Components.Transform.y[eid] = t.y;
    Components.Transform.z[eid] = t.z;
    Components.Transform.qx[eid] = t.qx;
    Components.Transform.qy[eid] = t.qy;
    Components.Transform.qz[eid] = t.qz;
    Components.Transform.qw[eid] = t.qw;
    Components.Transform.sx[eid] = t.sx;
    Components.Transform.sy[eid] = t.sy;
    Components.Transform.sz[eid] = t.sz;
  }

  const hasStableId = hasComponent(ctx, Components.StableID, eid);
  const currentStableId = hasStableId ? Components.StableID.id[eid] : undefined;
  if (!hasStableId || typeof currentStableId !== 'number' || Number.isNaN(currentStableId)) {
    if (!hasStableId) {
      addComponent(ctx, Components.StableID, eid);
    }
    let sid = getResource<number | undefined>(ctx, 'nextStableId', true);
    if (typeof sid !== 'number' || Number.isNaN(sid)) {
      sid = 0;
      setResource(ctx, 'nextStableId', sid);
    }
    Components.StableID.id[eid] = sid;
    setResource(ctx, 'nextStableId', sid + 1);
  }

  // ensure a default MotionSource component exists
  if (!hasComponent(ctx, Components.MotionSource, eid)) {
    addComponent(ctx, Components.MotionSource, eid);
    const motionSourceModule = getModule(ctx, 'motionSource', true);
    if (motionSourceModule) {
      Components.MotionSource.motionSourceId[eid] = motionSourceModule.resolve({ type: 'static', params: {} });
    }
  }

  // If everything successful, add the SpawnedAt component
  if (!hasComponent(ctx, SpawnedAt, eid)) {
    addComponent(ctx, SpawnedAt, eid);
    SpawnedAt.timestamp[eid] = ctx.time.getElapsed();
  }
}

const LEGACY_EFFECT_COMPONENTS = new Set(LEGACY_EFFECT_COMPONENT_KEYS);

export function applyBundle(ctx: ECSContext, eid: number, bundle: Record<string, any>) {
  const hasStoresComponent = Array.isArray(bundle.Stores);

  for (const compName in bundle) {
    try {
      if (
        hasStoresComponent &&
        (compName === "Inventory" || compName === "Stock" || compName === "DiscoveredBy" || compName === "PickedUpBy")
      ) {
        // Stores is authoritative; legacy store compatibility fields should not override it.
        continue;
      }

      // Skip metadata
      if (compName === "_meta") {
        continue;
      }

      if (compName === "Stores") {
        applyStoresComponent(ctx, eid, Array.isArray(bundle.Stores) ? bundle.Stores : []);
        continue;
      }

      if (LEGACY_EFFECT_COMPONENTS.has(compName as any)) {
        throw new Error(
          `Deprecated legacy component '${compName}' is no longer supported. Migrate this entity to Rules (use scripts/migrate-legacy-on-bundles.mjs for bundle migration support).`,
        );
      }

      // Handle entity reference stores - try to resolve immediately, defer if entities don't exist yet
      // These are stored as stableIds during serialization and need to be converted to eids
      if (compName === "DiscoveredBy" || compName === "PickedUpBy") {
        const storeName = compName === "DiscoveredBy" ? 'discoveredBy' : 'pickedUpBy';
        const stableIds = bundle[compName] as number[];
        applyReferenceStoreFromStableIds(ctx, eid, storeName, stableIds);
        continue;
      }
      if (compName === "Metrics") {
        // Load metrics into MetricsStore (single source of truth)
        const metricsStore = getStore<MetricsStore>(ctx, 'metrics');
        metricsStore.deserialize(eid, bundle[compName]);
        
        // Also load into Metrics resource for backward compatibility
        // Systems can continue using Metrics.get/set, which will sync back to MetricsStore
        const metricsResource = getResource<Metrics>(ctx, 'metrics');
        if (metricsResource) {
          const metricsData = bundle[compName];
          for (const metricKey in metricsData) {
            const metricValue = metricsData[metricKey];
            if (typeof metricValue === 'object' && metricValue.__value !== undefined) {
              // Set subtypes first - these will automatically update __value
              let hasSubtypes = false;
              for (const subtype in metricValue) {
                if (subtype !== '__value') {
                  metricsResource.set(eid, metricKey, subtype, metricValue[subtype]);
                  hasSubtypes = true;
                }
              }
              
              // Only set the main value if there are no subtypes
              if (!hasSubtypes) {
                metricsResource.set(eid, metricKey, metricValue.__value);
              }
            }
          }
        }
        continue;
      }
      if (compName === "UnlockedAchievements") {
        const unlockedAchievementsStore = getStore<UnlockedAchievementsStore>(ctx, 'unlockedAchievements');
        unlockedAchievementsStore.deserialize(eid, bundle[compName]);
        continue;
      }
      if (compName === "AIMemory") {
        const aiMemoryStore = getStore<AIMemoryStore>(ctx, 'aiMemory');
        aiMemoryStore.deserialize(eid, bundle[compName]);
        continue;
      }
      // HeldItems is runtime state only - should not be deserialized
      // It will be reconstructed from inventory by heldItemSystem
      if (compName === "HeldItems") {
        continue;
      }
      if (compName === "InventoryCooldowns") {
        const cooldownsStore = getStore<InventoryCooldownsStore>(ctx, 'inventoryCooldowns');
        cooldownsStore.deserialize(eid, bundle[compName]);
        continue;
      }
      if (compName === "Stock") {
        let entityStore = getModule(ctx, 'entityStore') as any;
        if (!entityStore) {
          getStore(ctx, 'inventory');
          entityStore = getModule(ctx, 'entityStore') as any;
        }
        const stockMap = bundle[compName] || {};
        for (const [stockName, stockValue] of Object.entries(stockMap)) {
          if (!entityStore.hasStore(stockName)) {
            entityStore.registerStoreInstance(stockName, 'stock');
          }
          const stockStore = getStore<StockStore>(ctx, stockName);
          stockStore.deserialize(eid, stockValue as any);
        }
        continue;
      }
      if (compName === "Rules") {
        const ruleDefinitions = Array.isArray(bundle[compName]) ? bundle[compName] : [];
        const rulesStore = getStore<Store<RuleDefinition[]>>(ctx, 'rules');
        rulesStore.set(eid, ruleDefinitions as RuleDefinition[]);
        getRuleModule(ctx).replaceEntityRules(eid, ruleDefinitions as RuleDefinition[]);
        continue;
      }

      const comp = (Components as any)[compName];
      if (!comp) throw new Error(`Unknown component '${compName}'`);

      // Special handling for StaticCamera - only allow in display mode
      if (compName === "StaticCamera") {
        const displayMode = getResource<boolean>(ctx, 'displayMode');
        if (!displayMode) {
          console.warn(`StaticCamera component for entity ${eid} ignored - only available in display mode`);
          continue;
        }
      }

      // Special handling for Player component to prevent duplicates
      if (compName === "Player") {
        // Check if a Player entity already exists
        const existingPlayers = playerQuery(ctx);
        if (existingPlayers.length > 0) {
          // Player already exists, don't add Player component
          // Instead, add AI component and copy faction from existing player
          console.log(`Player already exists (entity ${existingPlayers[0]}), converting spawn to AI instead`);
          
          // Get the existing player's faction
          const existingPlayerId = existingPlayers[0];
          let existingPlayerFaction = "player_faction"; // default fallback
          if (hasComponent(ctx, Components.Faction, existingPlayerId)) {
            existingPlayerFaction = decode(Components.Faction.id[existingPlayerId]);
          }
          
          // Add AI component instead of Player
          if (!hasComponent(ctx, Components.AI, eid)) {
            addComponent(ctx, Components.AI, eid);
            const ai = Components.AI;
            ai.isAggressive[eid] = 1; // Make AI aggressive
            ai.awarenessRange[eid] = 32; // Default awareness range
            ai._state[eid] = AIState.WANDER;
          }
          
          // Add Faction component with same faction as player
          if (!hasComponent(ctx, Components.Faction, eid)) {
            addComponent(ctx, Components.Faction, eid);
            Components.Faction.id[eid] = encode(existingPlayerFaction);
          }

          if (!hasComponent(ctx, Components.Info, eid)) {
            addComponent(ctx, Components.Info, eid);
          }
          Components.Info.name[eid] = encode("Friendly NPC");
          
          // Add input state for AI
          addComponent(ctx, Components._InputState, eid);
          
          // Skip the rest of the Player component processing
          continue;
        } else {
          // No existing player, add Player component normally
          if (!hasComponent(ctx, comp, eid)) addComponent(ctx, comp, eid);
          addComponent(ctx, Components._InputState, eid);
          continue;
        }
      }

      if (!hasComponent(ctx, comp, eid)) addComponent(ctx, comp, eid);

      const fields = bundle[compName];

      if (compName === "Body") {
        // Quick check to override hasInterior if MotionSource is NOT static. 
        // This prevents weird in-game behiavor but leads to inconcsistent editing experience.
        // Todo: revisit this decision later.
        if (bundle?.MotionSource?.type !== 'static') {
          if (fields?.params?.hasInterior) {
            fields.params.hasInterior = false;
          }
        }
        comp.bodyId[eid] = getModule(ctx, 'body').resolve(fields);
      }
      else if (compName === "MotionSource") {
        comp.motionSourceId[eid] = getModule(ctx, 'motionSource').resolve(fields);
      }
      else if (compName === "AI") {
        const ai = (comp as typeof AI);
        ai.isAggressive[eid] = fields.isAggressive ? 1 : 0;
        ai.awarenessRange[eid] = fields.awarenessRange || 32; // Default
        ai._state[eid] = AIState.WANDER;
        addComponent(ctx, Components._InputState, eid);
      }
      else if (compName === "Animation") {
        comp.animationId[eid] = getModule(ctx, 'animation').resolve(fields);
      }
      else if (compName === "Inventory") {
        const inventories = getStore<InventoryStore>(ctx, 'inventory');
        inventories.deserialize(eid, fields);
        const inv = inventories.get(eid);
        const selected = fields.selected ?? fields.selectedItemIndex ?? inv?.selected ?? 0;

        comp.size[eid] = inv?.size ?? fields.size ?? 0;
        comp.selected[eid] = selected;
        if (inv) {
          inv.selected = selected;
        }

        inventoryChanged(ctx, eid);
      }
      else if (compName === "Transform") {
        const position = resolveVector3(fields.position, {
          x: fields.x ?? 0,
          y: fields.y ?? 0,
          z: fields.z ?? 0,
        });

        const rotation = resolveVector3(fields.rotation, {
          x: fields.rx ?? 0,
          y: fields.ry ?? 0,
          z: fields.rz ?? 0,
        });

        const scale = resolveVector3(fields.scale, {
          x: fields.sx ?? 1,
          y: fields.sy ?? 1,
          z: fields.sz ?? 1,
        });

        const euler = new THREE.Euler(
          rotation.x ?? 0,
          rotation.y ?? 0,
          rotation.z ?? 0
        );
        const quat = new THREE.Quaternion().setFromEuler(euler).normalize();

        const quatSet = (
          fields.qx !== undefined &&
          fields.qy !== undefined &&
          fields.qz !== undefined &&
          fields.qw !== undefined
        );

        comp.qx[eid] = quatSet ? fields.qx : quat.x;
        comp.qy[eid] = quatSet ? fields.qy : quat.y;
        comp.qz[eid] = quatSet ? fields.qz : quat.z;
        comp.qw[eid] = quatSet ? fields.qw : quat.w;

        comp.x[eid] = position.x ?? 0;
        comp.y[eid] = position.y ?? 0;
        comp.z[eid] = position.z ?? 0;
        comp.sx[eid] = scale.x ?? 1;
        comp.sy[eid] = scale.y ?? 1;
        comp.sz[eid] = scale.z ?? 1;

        // Keep the scene graph in sync when transforms change outside systems (e.g., inspector edits)
        syncObject3DTransformFromECS(ctx, eid);
      }
      else if (compName === "Health") {
        comp.value[eid] = fields.value ?? 10;
        comp.maxValue[eid] = fields.maxValue ?? comp.value[eid];
        const healthStore = getStore<StockStore>(ctx, "health");
        healthStore.set(eid, { current: comp.value[eid], max: comp.maxValue[eid], min: 0 });
      }
      else if (compName === "Info") {
        writeEncodedString(comp.name[eid] as Uint8Array, fields.name ?? "Entity");
        writeEncodedString(comp.description[eid] as Uint8Array, fields.description ?? "No description");
      }
      else if (compName === "Faction") {
        writeEncodedString(comp.id[eid] as Uint8Array, fields.id || NO_FACTION_ID);
      }
      else if (compName === "StaticCamera") {
        comp.fov[eid] = fields.fov ?? 75;
        
        // Handle lookAt which can be provided in multiple formats
        if (fields.lookAt && typeof fields.lookAt === 'object') {
          comp.lookAtX[eid] = fields.lookAt.x ?? 0;
          comp.lookAtY[eid] = fields.lookAt.y ?? 0;
          comp.lookAtZ[eid] = fields.lookAt.z ?? 0;
        } else {
          // Use individual coordinates if provided, otherwise default to 0
          comp.lookAtX[eid] = fields.lookAtX ?? 0;
          comp.lookAtY[eid] = fields.lookAtY ?? 0;
        comp.lookAtZ[eid] = fields.lookAtZ ?? 0;
        }
      }
      else if (compName === "ParticleEmitter") {
        applyParticleEmitterDefinition(eid, fields);
      }
      else {
        for (const field in fields) {
          comp[field][eid] = fields[field];
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Deprecated legacy component')) {
        throw error;
      }
      console.error(`Error applying component ${compName} to entity ${eid}:`, error);
      continue;
    }
  }
  // console.log(`Applied bundle to entity ${eid}:`, bundle);
}
