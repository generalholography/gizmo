import { getModule, getResource, ECSContext } from './ecs';
import * as THREE from 'three';
import * as Components from './components';
import { hasComponent, removeEntity } from 'bitecs';
import { decode } from '../utils/strings';
import { getCrowd } from '../modules/navMesh';
import { removeMemory } from './memory';
import { ParticleShapeType } from './particles';
import { 
  cleanupEntityStores, 
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
  StockStore
} from '../modules/entityStore';
import { eidSetToStableIdSet } from '../utils/stableId';
import type { SerializeEntityOptions, SerializationMetadata } from './worldSchema';
import type { ArchetypeBundle as ArchetypeBundleType } from '../modules/archetype';
import type { Metrics } from './metrics';
import { getRuleModule } from '../modules/rule';

// Re-export for backward compatibility
export type ArchetypeBundle = ArchetypeBundleType;

// Runtime-only components that should not be serialized by default
const RUNTIME_COMPONENTS = new Set([
  'Velocity',
  '_InputState',
  '_RuntimeCharacterControllerData',
  'DamageFlash',
  'SpawnedAt',
  'Held',  // Runtime relationship
]);

/**
 * Deep equality check for objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Strip runtime data from component data
 */
function stripRuntimeData(componentData: any): any {
  const stripped = { ...componentData };
  delete stripped.coolDownRemaining;
  delete stripped.needsCooldownReset;
  delete stripped.timeRemaining;
  delete stripped.hasFired;
  return stripped;
}

/**
 * Serialize a component with module resolution support
 */
function serializeComponent(
  ctx: ECSContext,
  compName: string,
  eid: number,
  options: SerializeEntityOptions
): any {
  const comps = Components as any;
  const comp = comps[compName];
  const { includeRuntime = true, useDelta = false } = options;

  if (compName === 'Transform') {
    return {
      x: comp.x[eid],
      y: comp.y[eid],
      z: comp.z[eid],
      qx: comp.qx[eid],
      qy: comp.qy[eid],
      qz: comp.qz[eid],
      qw: comp.qw[eid],
      sx: comp.sx[eid],
      sy: comp.sy[eid],
      sz: comp.sz[eid],
    };
  }

  if (compName === 'StableID') {
    return { id: comp.id[eid] };
  }

  if (compName === 'Body') {
    const bodyModule = getModule(ctx, 'body');
    const bodyId = comp.bodyId[eid];
    if (useDelta) {
      const serialized = bodyModule?.serializeDefinition(bodyId, { useDelta: true });
      return serialized;
    }
    return bodyModule?.getDefinition(bodyId);
  }

  if (compName === 'MotionSource') {
    const msModule = getModule(ctx, 'motionSource');
    const msId = comp.motionSourceId[eid];
    if (useDelta) {
      return msModule?.serializeDefinition(msId, { useDelta: true });
    }
    return msModule?.getDefinition(msId);
  }

  if (compName === 'Animation') {
    const animModule = getModule(ctx, 'animation');
    const animId = comp.animationId[eid];
    if (useDelta) {
      return animModule?.serializeDefinition(animId, { useDelta: true });
    }
    const def = animModule?.getDefinition(animId);
    if (def && 'params' in def && (def as any).params?.clips) {
      return (def as any).params;
    }
    return def;
  }

  if (compName === 'ParticleEmitter') {
    const color = new THREE.Color(
      comp.colorR[eid] ?? 1,
      comp.colorG[eid] ?? 1,
      comp.colorB[eid] ?? 1
    );

    const shapeType = comp.shapeType[eid] ?? ParticleShapeType.Point;
    let shape: any;
    if (shapeType === ParticleShapeType.Box) {
      shape = {
        type: 'box',
        size: {
          x: comp.shapeX[eid] ?? 1,
          y: comp.shapeY[eid] ?? 1,
          z: comp.shapeZ[eid] ?? 1,
        }
      };
    } else if (shapeType === ParticleShapeType.Sphere) {
      shape = {
        type: 'sphere',
        radius: comp.shapeRadius[eid] ?? 1,
      };
    } else {
      shape = { type: 'point' };
    }

    const speedMin = comp.speedMin[eid] ?? 1;
    const speedMax = comp.speedMax[eid] ?? speedMin;
    const speed = speedMin === speedMax ? speedMin : { min: speedMin, max: speedMax };

    return {
      rate: comp.rate[eid] ?? 0,
      burst: comp.burst[eid] ?? 0,
      maxParticles: comp.maxParticles[eid] ?? 200,
      lifetime: comp.lifetime[eid] ?? 1.5,
      duration: comp.duration[eid] ?? 0,
      speed,
      spread: comp.spread[eid] ?? 0.25,
      size: comp.size[eid] ?? 0.2,
      opacity: comp.opacity[eid] ?? 1,
      gravity: comp.gravity[eid] ?? 0,
      color: `#${color.getHexString()}`,
      direction: {
        x: comp.directionX[eid] ?? 0,
        y: comp.directionY[eid] ?? 1,
        z: comp.directionZ[eid] ?? 0,
      },
      shape,
      localSpace: (comp.localSpace[eid] ?? 0) === 1,
    };
  }

  if (compName === 'Player') {
    return {};
  }

  if (compName === 'AI') {
    return {
      isAggressive: comp.isAggressive[eid] ? true : false,
      awarenessRange: comp.awarenessRange[eid] || 32,
    };
  }

  if (compName === 'Health') {
    return {
      value: comp.value[eid],
      maxValue: comp.maxValue[eid] || comp.value[eid],
    };
  }

  if (compName === 'Info') {
    return {
      name: decode(comp.name[eid]),
      description: decode(comp.description[eid]),
    };
  }

  if (compName === 'Faction') {
    return {
      id: decode(comp.id[eid]),
    };
  }

  if (compName === 'StaticCamera') {
    return {
      fov: comp.fov[eid],
      lookAtX: comp.lookAtX[eid],
      lookAtY: comp.lookAtY[eid],
      lookAtZ: comp.lookAtZ[eid],
    };
  }

  // ArchetypeRef is now handled via entity store, not as a component

  // Generic component serialization
  const data: any = {};
  for (const field in comp) {
    if (typeof comp[field] === 'object' && comp[field][eid] !== undefined) {
      data[field] = comp[field][eid];
    }
  }
  return Object.keys(data).length > 0 ? data : undefined;
}

// Builds a bundle from the entity without removing it
export function getEntityBundle(
  ctx: ECSContext, 
  eid: number,
  options: SerializeEntityOptions = {}
): ArchetypeBundle {
  const {
    includeRuntime = true,
    includeRuntimeComponents = false,
    useDelta = false,
    componentFilter
  } = options;

  const comps = Components as any;
  const bundle: ArchetypeBundle = {};

  // Get archetype reference for delta serialization
  let archetypeName: string | undefined;
  let archetypeBundle: ArchetypeBundle | undefined;

  const archetypeStore = getStore<ArchetypeRefStore>(ctx, 'archetypeRef');
  archetypeName = archetypeStore.get(eid);
  
  if (useDelta && archetypeName) {
    const archetypeModule = getModule(ctx, 'archetype');
    try {
      const archetypeId = archetypeModule?.resolve(archetypeName);
      if (archetypeId !== undefined) {
        archetypeBundle = archetypeModule?.get(archetypeId);
      }
    } catch (e) {
      // Archetype no longer exists, fall back to full serialization
      archetypeBundle = undefined;
    }
  }

  // Add metadata
  const meta: SerializationMetadata & { storesSchemaVersion?: number } = {
    serializedAt: Date.now(),
    engineVersion: '0.3.0', // TODO: Get from package.json
    storesSchemaVersion: 1,
  };

  if (archetypeName) {
    meta.archetype = archetypeName;
  }

  bundle._meta = meta;

  // Serialize all components
  for (const compName in comps) {
    const comp = comps[compName];
    
    // Skip if not a component or entity doesn't have it
    if (typeof comp !== 'object' || !hasComponent(ctx, comp, eid)) {
      continue;
    }

    // Skip runtime components unless explicitly included
    if (RUNTIME_COMPONENTS.has(compName) && !includeRuntimeComponents) {
      continue;
    }

    // Apply custom filter if provided
    if (componentFilter && !componentFilter(compName)) {
      continue;
    }

    // Serialize the component
    const componentData = serializeComponent(ctx, compName, eid, options);
    if (componentData === undefined) continue;

    // Delta serialization: compare with archetype
    if (useDelta && archetypeBundle && archetypeBundle[compName]) {
      const archetypeComponentData = archetypeBundle[compName];
      if (deepEqual(componentData, archetypeComponentData)) {
        // Skip if identical to archetype
        continue;
      }
    }

    bundle[compName] = componentData;
  }

  // Always serialize core stores (not runtime-dependent)
  const inventories = getStore<InventoryStore>(ctx, 'inventory');
  const serializedInventory = inventories?.serialize(eid);
  if (serializedInventory) {
    bundle.Inventory = serializedInventory;
  }

  const entityStore = getModule(ctx, 'entityStore') as any;
  const stockEntries = (entityStore?.listStoreInstances?.() || []).filter((entry: any) => entry.type === 'stock');
  const serializedStock: Record<string, any> = {};
  for (const entry of stockEntries) {
    const value = getStore<StockStore>(ctx, entry.name).serialize(eid);
    if (value !== undefined) {
      serializedStock[entry.name] = value;
    }
  }
  if (Object.keys(serializedStock).length > 0) {
    bundle.Stock = serializedStock;
  }

  const ruleModule = getRuleModule(ctx);
  const serializedRules = ruleModule.getEntityRulesForSerialization(eid);
  if (serializedRules && serializedRules.length > 0) {
    bundle.Rules = serializedRules;
  }

  const stores: any[] = [];
  if (serializedInventory) {
    stores.push({ store: 'inventory', value: serializedInventory });
  }
  if (Object.keys(serializedStock).length > 0) {
    for (const [key, value] of Object.entries(serializedStock)) {
      stores.push({
        store: key,
        value: {
          current: (value as any)?.current ?? 0,
          max: (value as any)?.max ?? 1,
          min: (value as any)?.min ?? 0,
        },
      });
    }
  }

  // discoveredBy and pickedUpBy store entity IDs at runtime, but need to serialize as stableIds
  const discoveredByStore = getStore<StableIdReferenceStore>(ctx, 'discoveredBy');
  const discoveredByEids = discoveredByStore?.get(eid);
  if (discoveredByEids && discoveredByEids.size > 0) {
    // Convert eids to stableIds for serialization
    const stableIds = eidSetToStableIdSet(ctx, discoveredByEids);
    if (stableIds.size > 0) {
      bundle.DiscoveredBy = Array.from(stableIds);
    } else {
      bundle.DiscoveredBy = Array.from(discoveredByEids);
    }
    stores.push({ store: 'discoveredBy', value: bundle.DiscoveredBy });
  }

  const pickedUpByStore = getStore<StableIdReferenceStore>(ctx, 'pickedUpBy');
  const pickedUpByEids = pickedUpByStore?.get(eid);
  if (pickedUpByEids && pickedUpByEids.size > 0) {
    // Convert eids to stableIds for serialization
    const stableIds = eidSetToStableIdSet(ctx, pickedUpByEids);
    if (stableIds.size > 0) {
      bundle.PickedUpBy = Array.from(stableIds);
    } else {
      bundle.PickedUpBy = Array.from(pickedUpByEids);
    }
    stores.push({ store: 'pickedUpBy', value: bundle.PickedUpBy });
  }

  if (stores.length > 0) {
    bundle.Stores = stores;
  }

  // Serialize runtime stores if requested
  if (includeRuntime) {
    // Serialize metrics from MetricsStore (single source of truth)
    const metricsStore = getStore<MetricsStore>(ctx, 'metrics');
    const serializedMetrics = metricsStore?.serialize(eid);
    if (serializedMetrics) {
      bundle.Metrics = serializedMetrics;
    }

    const unlockedAchievementsStore = getStore<UnlockedAchievementsStore>(ctx, 'unlockedAchievements');
    const serializedAchievements = unlockedAchievementsStore?.serialize(eid);
    if (serializedAchievements && serializedAchievements.length > 0) {
      bundle.UnlockedAchievements = serializedAchievements;
    }

    const aiMemoryStore = getStore<AIMemoryStore>(ctx, 'aiMemory');
    const serializedAIMemory = aiMemoryStore?.serialize(eid);
    if (serializedAIMemory) {
      bundle.AIMemory = serializedAIMemory;
    }

    // HeldItems is runtime state only - should not be serialized
    // It will be reconstructed from inventory by heldItemSystem after load
    // Serializing entity IDs would be invalid after load since entities get new IDs

    const cooldownsStore = getStore<InventoryCooldownsStore>(ctx, 'inventoryCooldowns');
    const serializedCooldowns = cooldownsStore?.serialize(eid);
    if (serializedCooldowns) {
      bundle.InventoryCooldowns = serializedCooldowns;
    }
  }

  return bundle;
}

// Bundles the entity, performs cleanup/removal, and returns the bundle
export function despawn(
  ctx: ECSContext, 
  eid: number,
  options: SerializeEntityOptions = {}
): ArchetypeBundle {
  const bundle = getEntityBundle(ctx, eid, options);

  // Cleanup held items if this entity has any
  const held = getStore<any>(ctx, "heldItems");
  if (held) {
    const heldEntry = held.get(eid);
    if (heldEntry) {
      // Despawn the held item entity
      despawn(ctx, heldEntry.eid);
      held.delete(eid);
    }
  }

  // Also check if this entity is being held by another entity and clean that up
  if (held) {
    for (const [holderEid, heldData] of held.entries()) {
      if (heldData.eid === eid) {
        held.delete(holderEid);
        break;
      }
    }
  }

  cleanupEntityStores(ctx, eid);
  try {
    getRuleModule(ctx).removeEntityRules(eid);
  } catch {}

  // Cleanup crowd agent if present
  const crowdAgents = getResource<Map<number, any>>(ctx, 'crowdAgents');
  if (crowdAgents && crowdAgents.has(eid)) {
    const agent = crowdAgents.get(eid);
    if (agent) {
      try {
        const crowd = getCrowd(ctx);
        if (crowd) {
          crowd.removeAgent(agent);
        }
      } catch (error) {
        console.error('Failed to remove crowd agent during despawn:', error);
      }
    }
    crowdAgents.delete(eid);
  }

  // Cleanup AI memory if present
  try {
    removeMemory(ctx, eid);
  } catch (error) {
    console.warn('Failed to remove AI memory during despawn:', error);
  }

  removeEntity(ctx, eid);
  return bundle;
}
