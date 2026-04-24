import { ECSContext, getModule, setModule } from "../core/ecs";
import { Inventory, createInventory, InventoryItem } from "../core/inventory";
import { ReactiveMap } from "../utils/reactiveTypes";
import { Module } from "./Module";

export interface SerializableStore<T, S = any> {
  serialize(eid: number): S | undefined;
  deserialize(eid: number, data: S): void;
}

export class Store<T> {
  protected readonly map: Map<number, T>;

  constructor(initial?: Map<number, T>) {
    this.map = initial ?? new Map<number, T>();
  }

  get(eid: number): T | undefined {
    return this.map.get(eid);
  }

  set(eid: number, value: T): void {
    this.map.set(eid, value);
  }

  delete(eid: number): void {
    this.map.delete(eid);
  }

  entries(): IterableIterator<[number, T]> {
    return this.map.entries();
  }

  has(eid: number): boolean {
    return this.map.has(eid);
  }

  [Symbol.iterator](): IterableIterator<[number, T]> {
    return this.map[Symbol.iterator]();
  }
}

export class SetStore extends Store<Set<number>> implements SerializableStore<Set<number>, number[]> {
  serialize(eid: number): number[] | undefined {
    const value = this.get(eid);
    if (!value) return undefined;
    return Array.from(value);
  }

  deserialize(eid: number, data: number[]): void {
    this.set(eid, new Set(data));
  }
}

export class LazySetStore extends SetStore {
  override get(eid: number): Set<number> {
    let value = super.get(eid);
    if (!value) {
      value = new Set<number>();
      this.set(eid, value);
    }
    return value;
  }
}

/**
 * Store for entity references that need to persist across saves/loads.
 * 
 * IMPORTANT: This store works with entity IDs (eids) at runtime, but serialization
 * must convert to/from StableIDs. The conversion is handled in despawn.ts and spawn.ts.
 * 
 * Runtime: Stores entity IDs (eids) - used by systems
 * Serialization: Converts to StableIDs - persists across saves
 * Deserialization: Converts from StableIDs back to eids - restores references
 */
export class StableIdReferenceStore extends LazySetStore {
  // Inherits LazySetStore behavior - stores eids at runtime
  // Serialization conversion handled externally in despawn/spawn
}

// Store for unlocked achievements (entity -> set of achievement names)
export class UnlockedAchievementsStore extends Store<Set<string>> implements SerializableStore<Set<string>, string[]> {
  override get(eid: number): Set<string> {
    let value = super.get(eid);
    if (!value) {
      value = new Set<string>();
      this.set(eid, value);
    }
    return value;
  }

  serialize(eid: number): string[] | undefined {
    const value = super.get(eid);
    if (!value || value.size === 0) return undefined;
    return Array.from(value);
  }

  deserialize(eid: number, data: string[]): void {
    this.set(eid, new Set(data));
  }
}

// Store for metrics (entity -> metric data)
export interface MetricData {
  [metricName: string]: {
    __value: number;
    [type: string]: number;
  };
}

export class MetricsStore extends Store<MetricData> implements SerializableStore<MetricData, MetricData> {
  serialize(eid: number): MetricData | undefined {
    const value = this.get(eid);
    if (!value) return undefined;
    // Deep copy to avoid mutations
    const copy: MetricData = {};
    for (const [metric, data] of Object.entries(value)) {
      copy[metric] = { ...data };
    }
    return copy;
  }

  deserialize(eid: number, data: MetricData): void {
    // Deep copy to avoid mutations
    const copy: MetricData = {};
    for (const [metric, metricData] of Object.entries(data)) {
      copy[metric] = { ...metricData };
    }
    this.set(eid, copy);
  }
}

export type InventorySlot = InventoryItem | null;

export type StockValue = { current: number; max: number; min?: number };

export class StockStore extends Store<StockValue> implements SerializableStore<StockValue, StockValue> {
  override get(eid: number): StockValue {
    const value = super.get(eid);
    if (value) return value;
    const initial: StockValue = { current: 0, max: 1, min: 0 };
    this.set(eid, initial);
    return initial;
  }

  serialize(eid: number): StockValue | undefined {
    const value = super.get(eid);
    if (!value) return undefined;
    return { ...value };
  }

  deserialize(eid: number, data: StockValue): void {
    this.set(eid, {
      current: data?.current ?? 0,
      max: data?.max ?? 1,
      min: data?.min ?? 0,
    });
  }
}

export class InventoryStore extends Store<Inventory> implements SerializableStore<Inventory, any> {
  serialize(eid: number) {
    const inv = this.get(eid);
    if (!inv) return undefined;
    const items: (string | Record<string, any>)[] = [];
    for (let i = 0; i < inv.size; i++) {
      const slot = inv.slots[i];
      if (slot === null) continue;
      if (slot.type === "entity") {
        items[i] = slot.definition as any;
      } else if (slot.type === "material") {
        items[i] = { ...slot.definition, amount: slot.amount } as any;
      }
    }
    return { size: inv.size, selectedItemIndex: inv.selected, items };
  }

  deserialize(eid: number, data: any) {
    const size = data.size ?? 0;
    const inv = createInventory(size);
    inv.selected = data.selected ?? data.selectedItemIndex ?? 0;
    if (data.items && Array.isArray(data.items)) {
      for (let i = 0; i < data.items.length && i < size; i++) {
        const item = data.items[i];
        if (!item) continue;
        if (typeof item === "string") {
          inv.slots[i] = { type: "entity", definition: item };
        } else if (item.type && !item.Body && !item.Info) {
          inv.slots[i] = { type: "material", definition: item, amount: item.amount ?? 1 } as any;
        } else {
          inv.slots[i] = { type: "entity", definition: item };
        }
      }
    }
    this.set(eid, inv);
  }
}

// Store for AI memory (entity -> memory data)
export class AIMemoryStore extends Store<any> implements SerializableStore<any, any> {
  serialize(eid: number): any | undefined {
    const value = this.get(eid);
    if (!value) return undefined;
    // Deep copy to avoid mutations
    return JSON.parse(JSON.stringify(value));
  }

  deserialize(eid: number, data: any): void {
    // Deep copy to avoid mutations
    this.set(eid, JSON.parse(JSON.stringify(data)));
  }
}

// Store for held items (entity -> held item reference)
export class HeldItemsStore extends Store<{ eid: number; slot: number }> 
  implements SerializableStore<{ eid: number; slot: number }, { eid: number; slot: number }> {
  
  serialize(eid: number): { eid: number; slot: number } | undefined {
    return this.get(eid);
  }

  deserialize(eid: number, data: { eid: number; slot: number }): void {
    this.set(eid, data);
  }
}

// Store for inventory cooldowns (entity -> cooldown map)
export class InventoryCooldownsStore extends Store<ReactiveMap<number>>
  implements SerializableStore<ReactiveMap<number>, Record<string, number>> {
  
  serialize(eid: number): Record<string, number> | undefined {
    const map = this.get(eid);
    if (!map || map.size === 0) return undefined;
    
    const obj: Record<string, number> = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  deserialize(eid: number, data: Record<string, number>): void {
    const map = new ReactiveMap<number>();
    for (const [key, value] of Object.entries(data)) {
      map.set(key, value);
    }
    this.set(eid, map);
  }
}

// Store for archetype references (entity -> archetype name string)
export class ArchetypeRefStore extends Store<string> 
  implements SerializableStore<string, string> {
  
  serialize(eid: number): string | undefined {
    return this.get(eid);
  }

  deserialize(eid: number, data: string): void {
    this.set(eid, data);
  }
}

export class RulesStore extends Store<any[]> implements SerializableStore<any[], any[]> {
  serialize(eid: number): any[] | undefined {
    return this.get(eid);
  }

  deserialize(eid: number, data: any[]): void {
    this.set(eid, Array.isArray(data) ? data : []);
  }
}

type StoreOptions = {
  globalSerializable?: boolean;
};

type StoreInstanceMeta = {
  type: string;
  globalSerializable: boolean;
};

export class EntityStoreModule extends Module<{ type: string; params: any }, Store<any>> {
  private readonly instances: Map<string, Store<any>> = new Map();
  private readonly typeFactories: Map<string, () => Store<any>> = new Map();
  private readonly instanceMeta: Map<string, StoreInstanceMeta> = new Map();

  constructor(ctx: ECSContext) {
    super(ctx, {});
  }

  registerStoreType(type: string, factory: () => Store<any>): void {
    this.typeFactories.set(type, factory);
    this.registerType(type, () => {
      const created = factory();
      return created;
    });
  }

  registerStoreInstance(name: string, type: string, options: StoreOptions = {}): void {
    const factory = this.typeFactories.get(type);
    if (!factory) {
      throw new Error(`Store type '${type}' not registered`);
    }
    if (this.instances.has(name)) return;

    const instance = factory();
    this.instances.set(name, instance);
    this.instanceMeta.set(name, { type, globalSerializable: options.globalSerializable ?? false });

    this.addDefinition(name, { type, params: {} } as any, true);
    this.markAsBuiltIn(name);
    this.resolve(name);
  }

  registerStore(name: string, factory: () => Store<any>, options: StoreOptions = {}): void {
    this.registerStoreType(name, factory);
    this.registerStoreInstance(name, name, options);
  }

  hasStore(name: string): boolean {
    return this.instances.has(name);
  }

  getStoreType(name: string): string | undefined {
    return this.instanceMeta.get(name)?.type;
  }

  listStoreInstances(): Array<{ name: string; type: string }> {
    return Array.from(this.instanceMeta.entries()).map(([name, meta]) => ({ name, type: meta.type }));
  }

  getStore<T extends Store<any>>(name: string): T {
    const store = this.instances.get(name);
    if (!store) {
      throw new Error(`Store '${name}' not registered`);
    }
    return store as T;
  }

  serializeAll(): Record<string, any> {
    const serialized: Record<string, any> = {};
    for (const [name, store] of this.instances.entries()) {
      const meta = this.instanceMeta.get(name);
      if (!meta?.globalSerializable) continue;
      if (!(store as any as SerializableStore<any>).serialize) continue;

      const entries: Record<number, any> = {};
      for (const [eid] of store.entries()) {
        const data = (store as any as SerializableStore<any>).serialize(eid);
        if (data !== undefined) entries[eid] = data;
      }
      serialized[name] = entries;
    }
    return serialized;
  }

  hydrateAll(data: Record<string, any>): void {
    for (const [name, entries] of Object.entries(data || {})) {
      const store = this.instances.get(name);
      const meta = this.instanceMeta.get(name);
      if (!meta?.globalSerializable || !store) continue;
      if ((store as any as SerializableStore<any>).deserialize) {
        for (const [eidStr, value] of Object.entries(entries as Record<string, any>)) {
          (store as any as SerializableStore<any>).deserialize(Number(eidStr), value);
        }
      }
    }
  }

  forEachStore(fn: (name: string, store: Store<any>) => void): void {
    for (const [name, store] of this.instances.entries()) {
      fn(name, store);
    }
  }
}

export function entityStoreModule(ctx: ECSContext): EntityStoreModule {
  const module = new EntityStoreModule(ctx);

  module.registerStoreType("inventory", () => new InventoryStore());
  module.registerStoreType("stock", () => new StockStore());
  module.registerStoreType("stableIdSet", () => new StableIdReferenceStore());
  module.registerStoreType("heldItems", () => new HeldItemsStore());
  module.registerStoreType("aiMemory", () => new AIMemoryStore());
  module.registerStoreType("inventoryCooldowns", () => new InventoryCooldownsStore());
  module.registerStoreType("archetypeRef", () => new ArchetypeRefStore());
  module.registerStoreType("rules", () => new RulesStore());
  module.registerStoreType("unlockedAchievements", () => new UnlockedAchievementsStore());
  module.registerStoreType("metrics", () => new MetricsStore());

  module.registerStoreInstance("inventory", "inventory");
  module.registerStoreInstance("health", "stock");
  module.registerStoreInstance("discoveredBy", "stableIdSet");
  module.registerStoreInstance("pickedUpBy", "stableIdSet");
  module.registerStoreInstance("heldItems", "heldItems");
  module.registerStoreInstance("aiMemory", "aiMemory");
  module.registerStoreInstance("inventoryCooldowns", "inventoryCooldowns");
  module.registerStoreInstance("archetypeRef", "archetypeRef");
  module.registerStoreInstance("rules", "rules");
  module.registerStoreInstance("unlockedAchievements", "unlockedAchievements");
  module.registerStoreInstance("metrics", "metrics");

  return module;
}

export function getStore<T extends Store<any>>(ctx: ECSContext, name: string): T {
  let mod = getModule<EntityStoreModule>(ctx, "entityStore");
  if (!mod) {
    mod = entityStoreModule(ctx);
    setModule(ctx, "entityStore", mod);
  }
  return mod.getStore<T>(name);
}

export function cleanupEntityStores(ctx: ECSContext, eid: number): void {
  const mod = getModule<EntityStoreModule>(ctx, "entityStore");
  if (!mod) return;

  mod.forEachStore((name, store) => {
    if (store.has(eid)) {
      store.delete(eid);
    }

    if (store instanceof SetStore || store instanceof LazySetStore) {
      for (const [owner, set] of store.entries()) {
        if (owner === eid) continue;
        if (set.delete(eid) && set.size === 0 && store.has(owner)) {
          store.delete(owner);
        }
      }
    }
  });
}
