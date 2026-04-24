import { describe, expect, it, beforeEach } from "vitest";
import { createECS, ECSContext, getModule } from "../../core/ecs";
import { createInventory } from "../../core/inventory";
import {
  EntityStoreModule,
  getStore,
  cleanupEntityStores,
  InventoryStore,
  LazySetStore,
  SetStore,
  StockStore,
  RulesStore,
} from "../entityStore";

let ctx: ECSContext;

beforeEach(() => {
  ctx = createECS();
});

describe("entityStore module", () => {
  it("exposes default stores via module registration", () => {
    const inventoryStore = getStore<InventoryStore>(ctx, "inventory");
    expect(inventoryStore).toBeInstanceOf(InventoryStore);

    const module = getModule<EntityStoreModule>(ctx, "entityStore");
    expect(module).toBeDefined();
    expect(module?.getStore("inventory")).toBe(inventoryStore);
  });


  it("registers and serializes stock and rules stores", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const stockStore = module.getStore<StockStore>("health");
    const rulesStore = module.getStore<RulesStore>("rules");

    stockStore.set(1, { current: 40, max: 100, min: 0 });
    rulesStore.set(1, [{ trigger: { type: 'event', params: { event: 'interact' } }, actions: [] } as any]);

    const stockSerialized = stockStore.serialize(1);
    const rulesSerialized = rulesStore.serialize(1);

    expect(stockSerialized).toEqual({ current: 40, max: 100, min: 0 });
    expect(Array.isArray(rulesSerialized)).toBe(true);
    expect((rulesSerialized ?? [])[0].trigger.type).toBe('event');
  });
  it("recreates the module when missing", () => {
    ctx.modules.delete("entityStore");
    const inventoryStore = getStore<InventoryStore>(ctx, "inventory");

    expect(ctx.modules.get("entityStore")).toBeDefined();
    expect(inventoryStore).toBeInstanceOf(InventoryStore);
  });

  it("serializes inventory per-entity and hydrates via store helpers", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const inventoryStore = module.getStore<InventoryStore>("inventory");

    const eid = 42;
    const inv = createInventory(3);
    inv.selected = 1;
    inv.slots[0] = { type: "entity", definition: "crate" } as any;
    inv.slots[1] = {
      type: "material",
      definition: { type: "Material", name: "Iron" } as any,
      amount: 4,
    } as any;
    inventoryStore.set(eid, inv);

    const serialized = inventoryStore.serialize(eid)!;

    const ctx2 = createECS();
    const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
    module2.getStore<InventoryStore>("inventory").deserialize(eid, serialized);

    const hydratedInv = module2.getStore<InventoryStore>("inventory").get(eid)!;
    expect(hydratedInv.size).toBe(3);
    expect(hydratedInv.selected).toBe(1);
    expect(hydratedInv.slots[0]).toEqual({ type: "entity", definition: "crate" });
    expect(hydratedInv.slots[1]).toEqual({
      type: "material",
      definition: { type: "Material", name: "Iron", amount: 4 },
      amount: 4,
    });
  });

  it("serializes discovered sets per-entity and hydrates them", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

    const eid = 42;
    discoveredStore.get(eid).add(7);
    discoveredStore.get(eid).add(8);

    // Per-entity serialization via store method
    const serialized = discoveredStore.serialize(eid)!;
    expect(serialized).toEqual([7, 8]);

    const ctx2 = createECS();
    const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
    const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");
    discoveredStore2.deserialize(eid, serialized);

    const hydratedSet = discoveredStore2.get(eid);
    expect(hydratedSet.size).toBe(2);
    expect(hydratedSet.has(7)).toBe(true);
    expect(hydratedSet.has(8)).toBe(true);
  });

  it("returns singleton instances per store name", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const invA = module.getStore<InventoryStore>("inventory");
    const invB = module.getStore<InventoryStore>("inventory");

    expect(invA).toBe(invB);

    const discoveredA = getStore<LazySetStore>(ctx, "discoveredBy");
    const discoveredB = getStore<LazySetStore>(ctx, "discoveredBy");
    expect(discoveredA).toBe(discoveredB);
  });

  it("cleans up entity entries and references", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const inventoryStore = module.getStore<InventoryStore>("inventory");
    const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

    const eid = 5;
    const inv = createInventory(1);
    inv.slots[0] = { type: "entity", definition: "crate" } as any;
    inventoryStore.set(eid, inv);

    discoveredStore.get(eid).add(9);
    discoveredStore.get(99).add(eid);

    cleanupEntityStores(ctx, eid);

    expect(inventoryStore.has(eid)).toBe(false);
    expect(discoveredStore.has(eid)).toBe(false);
    expect(discoveredStore.get(99).has(eid)).toBe(false);
  });

  it("provides default sets and serializes lazily created entries per-entity", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const discovered = module.getStore<LazySetStore>("discoveredBy");

    const eid = 13;
    const setRef = discovered.get(eid);
    expect(setRef.size).toBe(0);

    setRef.add(2);
    setRef.add(3);

    // Per-entity serialization
    const serialized = discovered.serialize(eid);
    expect(serialized).toEqual([2, 3]);
  });

  it("omits non-serializable stores from global serialization output", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const held = module.getStore<SetStore>("heldItems");
    held.set(5, new Set([9]));

    const serialized = module.serializeAll();
    // heldItems, discoveredBy, and pickedUpBy should not be in global serialization
    expect(serialized.heldItems).toBeUndefined();
    expect(serialized.discoveredBy).toBeUndefined();
    expect(serialized.pickedUpBy).toBeUndefined();
  });

  it("serializes and deserializes discoveredBy and pickedUpBy per-entity", () => {
    const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
    const discoveredStore = module.getStore<LazySetStore>("discoveredBy");
    const pickedUpStore = module.getStore<LazySetStore>("pickedUpBy");

    const eid = 100;
    discoveredStore.get(eid).add(1);
    discoveredStore.get(eid).add(2);
    pickedUpStore.get(eid).add(3);
    pickedUpStore.get(eid).add(4);

    // Serialize per-entity
    const discoveredSerialized = discoveredStore.serialize(eid)!;
    const pickedUpSerialized = pickedUpStore.serialize(eid)!;

    expect(discoveredSerialized).toEqual([1, 2]);
    expect(pickedUpSerialized).toEqual([3, 4]);

    // Create new context and deserialize
    const ctx2 = createECS();
    const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
    const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");
    const pickedUpStore2 = module2.getStore<LazySetStore>("pickedUpBy");

    discoveredStore2.deserialize(eid, discoveredSerialized);
    pickedUpStore2.deserialize(eid, pickedUpSerialized);

    expect(discoveredStore2.get(eid).size).toBe(2);
    expect(discoveredStore2.get(eid).has(1)).toBe(true);
    expect(discoveredStore2.get(eid).has(2)).toBe(true);

    expect(pickedUpStore2.get(eid).size).toBe(2);
    expect(pickedUpStore2.get(eid).has(3)).toBe(true);
    expect(pickedUpStore2.get(eid).has(4)).toBe(true);
  });

  describe("Store base class", () => {
    it("has() returns false for non-existent entities", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const store = module.getStore("inventory");
      
      expect(store.has(999)).toBe(false);
    });

    it("entries() returns iterable of all entries", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const inventoryStore = module.getStore<InventoryStore>("inventory");
      
      const eid1 = 10;
      const eid2 = 20;
      inventoryStore.set(eid1, createInventory(1));
      inventoryStore.set(eid2, createInventory(2));
      
      const entries = Array.from(inventoryStore.entries());
      expect(entries.length).toBe(2);
      expect(entries.some(([eid]) => eid === eid1)).toBe(true);
      expect(entries.some(([eid]) => eid === eid2)).toBe(true);
    });

    it("supports iterator protocol", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const inventoryStore = module.getStore<InventoryStore>("inventory");
      
      const eid1 = 30;
      const eid2 = 40;
      inventoryStore.set(eid1, createInventory(1));
      inventoryStore.set(eid2, createInventory(2));
      
      const entries = [];
      for (const [eid, inv] of inventoryStore) {
        entries.push([eid, inv]);
      }
      
      expect(entries.length).toBe(2);
      expect(entries.some(([eid]) => eid === eid1)).toBe(true);
      expect(entries.some(([eid]) => eid === eid2)).toBe(true);
    });

    it("get() returns undefined for non-existent entity", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const store = module.getStore("inventory");
      
      expect(store.get(888)).toBeUndefined();
    });
  });

  describe("SetStore", () => {
    it("serializes empty set as empty array", () => {
      const setStore = new SetStore();
      const eid = 50;
      setStore.set(eid, new Set());
      
      const serialized = setStore.serialize(eid);
      expect(serialized).toEqual([]);
    });

    it("returns undefined when serializing non-existent entity", () => {
      const setStore = new SetStore();
      
      const serialized = setStore.serialize(999);
      expect(serialized).toBeUndefined();
    });

    it("deserializes array back to Set", () => {
      const setStore = new SetStore();
      const eid = 60;
      
      setStore.deserialize(eid, [1, 2, 3]);
      
      const set = setStore.get(eid);
      expect(set).toBeDefined();
      expect(set?.size).toBe(3);
      expect(set?.has(1)).toBe(true);
      expect(set?.has(2)).toBe(true);
      expect(set?.has(3)).toBe(true);
    });
  });

  describe("LazySetStore", () => {
    it("returns same reference on multiple gets", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const lazyStore = module.getStore<LazySetStore>("discoveredBy");
      
      const eid = 70;
      const set1 = lazyStore.get(eid);
      const set2 = lazyStore.get(eid);
      
      expect(set1).toBe(set2);
      set1.add(5);
      expect(set2.has(5)).toBe(true);
    });

    it("creates different sets for different entities", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const lazyStore = module.getStore<LazySetStore>("discoveredBy");
      
      const eid1 = 80;
      const eid2 = 90;
      
      const set1 = lazyStore.get(eid1);
      const set2 = lazyStore.get(eid2);
      
      expect(set1).not.toBe(set2);
      set1.add(1);
      expect(set2.has(1)).toBe(false);
    });
  });

  describe("InventoryStore edge cases", () => {
    it("deserializes inventory with missing selectedItemIndex", () => {
      const inventoryStore = new InventoryStore();
      const eid = 100;
      
      inventoryStore.deserialize(eid, {
        size: 3,
        items: ["sword"],
      });
      
      const inv = inventoryStore.get(eid);
      expect(inv).toBeDefined();
      expect(inv?.selected).toBe(0);
    });

    it("deserializes inventory with legacy 'selected' field", () => {
      const inventoryStore = new InventoryStore();
      const eid = 110;
      
      inventoryStore.deserialize(eid, {
        size: 3,
        selected: 2,
        items: ["sword"],
      });
      
      const inv = inventoryStore.get(eid);
      expect(inv?.selected).toBe(2);
    });

    it("handles inventory with no items array", () => {
      const inventoryStore = new InventoryStore();
      const eid = 120;
      
      inventoryStore.deserialize(eid, {
        size: 5,
        selectedItemIndex: 0,
      });
      
      const inv = inventoryStore.get(eid);
      expect(inv).toBeDefined();
      expect(inv?.size).toBe(5);
      expect(inv?.slots.every((slot) => slot === null)).toBe(true);
    });

    it("handles items array with null/undefined entries", () => {
      const inventoryStore = new InventoryStore();
      const eid = 130;
      
      inventoryStore.deserialize(eid, {
        size: 3,
        selectedItemIndex: 0,
        items: ["sword", null, undefined, "axe"],
      });
      
      const inv = inventoryStore.get(eid);
      expect(inv?.slots[0]).toEqual({ type: "entity", definition: "sword" });
      expect(inv?.slots[1]).toBeNull();
      expect(inv?.slots[2]).toBeNull();
    });

    it("handles material items with missing amount", () => {
      const inventoryStore = new InventoryStore();
      const eid = 140;
      
      inventoryStore.deserialize(eid, {
        size: 2,
        selectedItemIndex: 0,
        items: [{ type: "Material", name: "Wood" }],
      });
      
      const inv = inventoryStore.get(eid);
      const slot = inv?.slots[0] as any;
      expect(slot?.type).toBe("material");
      expect(slot?.amount).toBe(1);
    });

    it("limits items to inventory size", () => {
      const inventoryStore = new InventoryStore();
      const eid = 150;
      
      inventoryStore.deserialize(eid, {
        size: 2,
        selectedItemIndex: 0,
        items: ["sword", "axe", "bow", "shield"],
      });
      
      const inv = inventoryStore.get(eid);
      expect(inv?.size).toBe(2);
      expect(inv?.slots[0]).toBeDefined();
      expect(inv?.slots[1]).toBeDefined();
      expect(inv?.slots[2]).toBeUndefined();
    });

    it("serializes empty inventory correctly", () => {
      const inventoryStore = new InventoryStore();
      const eid = 160;
      const inv = createInventory(3);
      
      inventoryStore.set(eid, inv);
      
      const serialized = inventoryStore.serialize(eid);
      expect(serialized).toEqual({
        size: 3,
        selectedItemIndex: 0,
        items: [],
      });
    });
  });

  describe("EntityStoreModule registration", () => {
    it("throws error when getting unregistered store", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      
      expect(() => module.getStore("nonExistentStore")).toThrow(
        "Store 'nonExistentStore' not registered"
      );
    });

    it("registers store with globalSerializable option", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      module.registerStore(
        "testGlobalStore",
        () => new SetStore(),
        { globalSerializable: true }
      );
      
      const store = module.getStore<SetStore>("testGlobalStore");
      store.set(200, new Set([1, 2, 3]));
      
      const serialized = module.serializeAll();
      expect(serialized.testGlobalStore).toBeDefined();
      expect(serialized.testGlobalStore[200]).toEqual([1, 2, 3]);
    });

    it("excludes non-global stores from serializeAll", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      module.registerStore("testLocalStore", () => new SetStore());
      
      const store = module.getStore<SetStore>("testLocalStore");
      store.set(210, new Set([4, 5, 6]));
      
      const serialized = module.serializeAll();
      expect(serialized.testLocalStore).toBeUndefined();
    });

    it("forEachStore iterates over all registered stores", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      
      const storeNames: string[] = [];
      module.forEachStore((name, store) => {
        storeNames.push(name);
      });
      
      expect(storeNames.length).toBeGreaterThan(0);
      expect(storeNames).toContain("inventory");
      expect(storeNames).toContain("discoveredBy");
      expect(storeNames).toContain("pickedUpBy");
      expect(storeNames).toContain("heldItems");
      expect(storeNames).toContain("aiMemory");
      expect(storeNames).toContain("inventoryCooldowns");
    });
  });

  describe("Global serialization and hydration", () => {
    it("hydrateAll handles empty data", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      
      expect(() => module.hydrateAll({})).not.toThrow();
    });

    it("hydrateAll handles null/undefined data", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      
      expect(() => module.hydrateAll(null as any)).not.toThrow();
      expect(() => module.hydrateAll(undefined as any)).not.toThrow();
    });

    it("hydrateAll skips non-registered stores", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      
      expect(() =>
        module.hydrateAll({
          nonExistentStore: { 1: [1, 2, 3] },
        })
      ).not.toThrow();
    });

    it("hydrateAll skips non-global stores", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      module.registerStore("testLocalStore2", () => new SetStore());
      
      const store = module.getStore<SetStore>("testLocalStore2");
      
      module.hydrateAll({
        testLocalStore2: { 220: [7, 8, 9] },
      });
      
      // Should not have hydrated since it's not global
      expect(store.has(220)).toBe(false);
    });

    it("hydrateAll only processes stores marked as globalSerializable", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      module.registerStore(
        "testGlobalStore2",
        () => new SetStore(),
        { globalSerializable: true }
      );
      
      const store = module.getStore<SetStore>("testGlobalStore2");
      
      module.hydrateAll({
        testGlobalStore2: { 230: [10, 11, 12] },
      });
      
      expect(store.has(230)).toBe(true);
      expect(Array.from(store.get(230)!)).toEqual([10, 11, 12]);
    });
  });

  describe("cleanupEntityStores edge cases", () => {
    it("handles cleanup when entity is not in any store", () => {
      expect(() => cleanupEntityStores(ctx, 9999)).not.toThrow();
    });

    it("cleans up entity from multiple stores", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const inventoryStore = module.getStore<InventoryStore>("inventory");
      const discoveredStore = module.getStore<LazySetStore>("discoveredBy");
      
      const eid = 240;
      inventoryStore.set(eid, createInventory(1));
      discoveredStore.get(eid).add(1);
      discoveredStore.get(eid).add(2);
      
      cleanupEntityStores(ctx, eid);
      
      expect(inventoryStore.has(eid)).toBe(false);
      expect(discoveredStore.has(eid)).toBe(false);
    });

    it("removes entity from other entities' sets", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const discoveredStore = module.getStore<LazySetStore>("discoveredBy");
      
      const entityToClean = 250;
      const owner1 = 251;
      const owner2 = 252;
      
      discoveredStore.get(owner1).add(entityToClean);
      discoveredStore.get(owner1).add(999);
      discoveredStore.get(owner2).add(entityToClean);
      
      cleanupEntityStores(ctx, entityToClean);
      
      expect(discoveredStore.get(owner1).has(entityToClean)).toBe(false);
      expect(discoveredStore.get(owner1).has(999)).toBe(true);
      expect(discoveredStore.get(owner2).has(entityToClean)).toBe(false);
    });

    it("removes empty sets after cleaning entity references", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const discoveredStore = module.getStore<LazySetStore>("discoveredBy");
      
      const entityToClean = 260;
      const owner = 261;
      
      discoveredStore.get(owner).add(entityToClean);
      
      cleanupEntityStores(ctx, entityToClean);
      
      expect(discoveredStore.has(owner)).toBe(false);
    });

    it("does not remove sets with remaining items", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const pickedUpStore = module.getStore<LazySetStore>("pickedUpBy");
      
      const entityToClean = 270;
      const owner = 271;
      
      pickedUpStore.get(owner).add(entityToClean);
      pickedUpStore.get(owner).add(999);
      
      cleanupEntityStores(ctx, entityToClean);
      
      expect(pickedUpStore.has(owner)).toBe(true);
      expect(pickedUpStore.get(owner).size).toBe(1);
      expect(pickedUpStore.get(owner).has(999)).toBe(true);
    });
  });

  describe("Default stores integration", () => {
    it("heldItems store is properly registered", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const heldItems = module.getStore("heldItems");
      
      expect(heldItems).toBeDefined();
      
      const eid = 300;
      heldItems.set(eid, { eid: 301, slot: 0 });
      
      expect(heldItems.get(eid)).toEqual({ eid: 301, slot: 0 });
    });

    it("aiMemory store is properly registered", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const aiMemory = module.getStore("aiMemory");
      
      expect(aiMemory).toBeDefined();
      
      const eid = 310;
      const memoryData = { lastSeenTarget: 320, lastSeenTime: 12345 };
      aiMemory.set(eid, memoryData);
      
      expect(aiMemory.get(eid)).toEqual(memoryData);
    });

    it("inventoryCooldowns store is properly registered", () => {
      const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
      const cooldowns = module.getStore("inventoryCooldowns");
      
      expect(cooldowns).toBeDefined();
    });
  });

  describe("Deep serialization and reloading scenarios", () => {
    describe("Complete save/load cycles", () => {
      it("serializes and reloads multiple entities with different store types", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");
        const pickedUpStore = module.getStore<LazySetStore>("pickedUpBy");

        // Create multiple entities with various data
        const player1 = 1000;
        const player2 = 1001;
        const chest = 1002;

        // Player 1: inventory + discovered + picked up
        const inv1 = createInventory(5);
        inv1.selected = 2;
        inv1.slots[0] = { type: "entity", definition: "sword" } as any;
        inv1.slots[1] = { type: "material", definition: { type: "Material", name: "Gold" } as any, amount: 10 } as any;
        inv1.slots[2] = { type: "entity", definition: "shield" } as any;
        inventoryStore.set(player1, inv1);
        discoveredStore.get(player1).add(chest);
        discoveredStore.get(player1).add(2000);
        pickedUpStore.get(player1).add(chest);

        // Player 2: inventory only
        const inv2 = createInventory(3);
        inv2.slots[0] = { type: "entity", definition: "axe" } as any;
        inventoryStore.set(player2, inv2);

        // Chest: discovered by both players
        discoveredStore.get(chest).add(player1);
        discoveredStore.get(chest).add(player2);

        // Serialize all entities individually
        const serializedData = {
          [player1]: {
            inventory: inventoryStore.serialize(player1),
            discoveredBy: discoveredStore.serialize(player1),
            pickedUpBy: pickedUpStore.serialize(player1),
          },
          [player2]: {
            inventory: inventoryStore.serialize(player2),
            discoveredBy: discoveredStore.serialize(player2),
            pickedUpBy: pickedUpStore.serialize(player2),
          },
          [chest]: {
            discoveredBy: discoveredStore.serialize(chest),
            pickedUpBy: pickedUpStore.serialize(chest),
          },
        };

        // Create new context and reload
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const inventoryStore2 = module2.getStore<InventoryStore>("inventory");
        const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");
        const pickedUpStore2 = module2.getStore<LazySetStore>("pickedUpBy");

        // Deserialize all entities
        Object.entries(serializedData).forEach(([eidStr, data]) => {
          const eid = Number(eidStr);
          if (data.inventory) inventoryStore2.deserialize(eid, data.inventory);
          if (data.discoveredBy) discoveredStore2.deserialize(eid, data.discoveredBy);
          if (data.pickedUpBy) pickedUpStore2.deserialize(eid, data.pickedUpBy);
        });

        // Verify Player 1
        const reloadedInv1 = inventoryStore2.get(player1)!;
        expect(reloadedInv1.size).toBe(5);
        expect(reloadedInv1.selected).toBe(2);
        expect(reloadedInv1.slots[0]).toEqual({ type: "entity", definition: "sword" });
        expect(reloadedInv1.slots[1]?.type).toBe("material");
        expect((reloadedInv1.slots[1] as any)?.amount).toBe(10);
        expect(reloadedInv1.slots[2]).toEqual({ type: "entity", definition: "shield" });
        expect(discoveredStore2.get(player1).has(chest)).toBe(true);
        expect(discoveredStore2.get(player1).has(2000)).toBe(true);
        expect(pickedUpStore2.get(player1).has(chest)).toBe(true);

        // Verify Player 2
        const reloadedInv2 = inventoryStore2.get(player2)!;
        expect(reloadedInv2.slots[0]).toEqual({ type: "entity", definition: "axe" });

        // Verify Chest
        expect(discoveredStore2.get(chest).has(player1)).toBe(true);
        expect(discoveredStore2.get(chest).has(player2)).toBe(true);
      });

      it("handles large-scale serialization of many entities", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

        // Create 100 entities
        const entityCount = 100;
        const entities: number[] = [];
        for (let i = 0; i < entityCount; i++) {
          const eid = 2000 + i;
          entities.push(eid);

          // Alternate between inventory and discovered data
          if (i % 2 === 0) {
            const inv = createInventory(3);
            inv.slots[0] = { type: "entity", definition: `item_${i}` } as any;
            inventoryStore.set(eid, inv);
          } else {
            discoveredStore.get(eid).add(i);
            discoveredStore.get(eid).add(i + 1);
          }
        }

        // Serialize all
        const serializedData: Record<number, any> = {};
        entities.forEach(eid => {
          serializedData[eid] = {
            inventory: inventoryStore.serialize(eid),
            discoveredBy: discoveredStore.serialize(eid),
          };
        });

        // Create new context and reload
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const inventoryStore2 = module2.getStore<InventoryStore>("inventory");
        const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");

        entities.forEach(eid => {
          const data = serializedData[eid];
          if (data.inventory) inventoryStore2.deserialize(eid, data.inventory);
          if (data.discoveredBy) discoveredStore2.deserialize(eid, data.discoveredBy);
        });

        // Verify sample entities
        const sampleEven = 2000;
        const reloadedInv = inventoryStore2.get(sampleEven)!;
        expect(reloadedInv.slots[0]).toEqual({ type: "entity", definition: "item_0" });

        const sampleOdd = 2001;
        expect(discoveredStore2.get(sampleOdd).has(1)).toBe(true);
        expect(discoveredStore2.get(sampleOdd).has(2)).toBe(true);

        // Verify counts - only non-empty stores should be present
        let invCount = 0;
        let discoveredCount = 0;
        for (const [eid, inv] of inventoryStore2.entries()) {
          if (entities.includes(eid)) invCount++;
        }
        // Count only sets with data (not empty sets)
        for (const [eid, set] of discoveredStore2.entries()) {
          if (entities.includes(eid) && set.size > 0) discoveredCount++;
        }
        expect(invCount).toBe(50); // Half had inventories
        expect(discoveredCount).toBe(50); // Half had discovered sets
      });

      it("preserves data integrity through multiple serialize/deserialize cycles", () => {
        const module1 = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore1 = module1.getStore<InventoryStore>("inventory");
        
        const eid = 3000;
        const originalInv = createInventory(4);
        originalInv.selected = 1;
        originalInv.slots[0] = { type: "entity", definition: "rare_sword" } as any;
        originalInv.slots[1] = { type: "material", definition: { type: "Material", name: "Diamond" } as any, amount: 42 } as any;
        originalInv.slots[3] = { type: "entity", definition: { custom: "data", nested: { value: 123 } } } as any;
        inventoryStore1.set(eid, originalInv);

        // Cycle 1: serialize and deserialize
        let serialized = inventoryStore1.serialize(eid)!;
        
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const inventoryStore2 = module2.getStore<InventoryStore>("inventory");
        inventoryStore2.deserialize(eid, serialized);

        // Cycle 2: serialize again and deserialize to new context
        serialized = inventoryStore2.serialize(eid)!;
        
        const ctx3 = createECS();
        const module3 = getModule<EntityStoreModule>(ctx3, "entityStore")!;
        const inventoryStore3 = module3.getStore<InventoryStore>("inventory");
        inventoryStore3.deserialize(eid, serialized);

        // Cycle 3: one more time
        serialized = inventoryStore3.serialize(eid)!;
        
        const ctx4 = createECS();
        const module4 = getModule<EntityStoreModule>(ctx4, "entityStore")!;
        const inventoryStore4 = module4.getStore<InventoryStore>("inventory");
        inventoryStore4.deserialize(eid, serialized);

        // Verify data is still intact
        const finalInv = inventoryStore4.get(eid)!;
        expect(finalInv.size).toBe(4);
        expect(finalInv.selected).toBe(1);
        expect(finalInv.slots[0]).toEqual({ type: "entity", definition: "rare_sword" });
        expect(finalInv.slots[1]?.type).toBe("material");
        expect((finalInv.slots[1] as any)?.amount).toBe(42);
        expect(finalInv.slots[3]).toEqual({ type: "entity", definition: { custom: "data", nested: { value: 123 } } });
      });

      it("handles interleaved operations during serialization", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

        const entity1 = 4000;
        const entity2 = 4001;
        const entity3 = 4002;

        // Initial state
        discoveredStore.get(entity1).add(100);
        discoveredStore.get(entity1).add(101);
        discoveredStore.get(entity2).add(200);

        // Serialize entity1
        const serialized1 = discoveredStore.serialize(entity1)!;

        // Modify after serialization
        discoveredStore.get(entity1).add(102); // Should not affect serialized1
        discoveredStore.get(entity2).add(201);
        discoveredStore.get(entity3).add(300);

        // Serialize entity2 and entity3
        const serialized2 = discoveredStore.serialize(entity2)!;
        const serialized3 = discoveredStore.serialize(entity3)!;

        // Verify serialized data reflects state at time of serialization
        expect(serialized1).toEqual([100, 101]); // Should not include 102
        expect(serialized2).toEqual([200, 201]);
        expect(serialized3).toEqual([300]);

        // Create new context and reload
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");

        discoveredStore2.deserialize(entity1, serialized1);
        discoveredStore2.deserialize(entity2, serialized2);
        discoveredStore2.deserialize(entity3, serialized3);

        expect(discoveredStore2.get(entity1).size).toBe(2);
        expect(discoveredStore2.get(entity1).has(100)).toBe(true);
        expect(discoveredStore2.get(entity1).has(101)).toBe(true);
        expect(discoveredStore2.get(entity1).has(102)).toBe(false); // Should not be present
      });
    });

    describe("Incremental and partial serialization", () => {
      it("supports partial entity updates without affecting other entities", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");

        const player1 = 5000;
        const player2 = 5001;

        // Set up initial state for both players
        const inv1 = createInventory(3);
        inv1.slots[0] = { type: "entity", definition: "sword" } as any;
        inventoryStore.set(player1, inv1);

        const inv2 = createInventory(3);
        inv2.slots[0] = { type: "entity", definition: "axe" } as any;
        inventoryStore.set(player2, inv2);

        // Serialize only player1
        const serialized1 = inventoryStore.serialize(player1)!;

        // Create new context
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const inventoryStore2 = module2.getStore<InventoryStore>("inventory");

        // Set up player2 in new context first
        inventoryStore2.set(player2, createInventory(3));

        // Now deserialize player1 - should not affect player2
        inventoryStore2.deserialize(player1, serialized1);

        // Verify player1 was loaded
        const reloadedInv1 = inventoryStore2.get(player1)!;
        expect(reloadedInv1.slots[0]).toEqual({ type: "entity", definition: "sword" });

        // Verify player2 still exists with empty inventory
        const player2Inv = inventoryStore2.get(player2)!;
        expect(player2Inv).toBeDefined();
        expect(player2Inv.slots[0]).toBeNull();
      });

      it("allows overwriting existing entity data with deserialize", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");

        const eid = 6000;

        // Initial data
        const inv1 = createInventory(3);
        inv1.slots[0] = { type: "entity", definition: "old_sword" } as any;
        inventoryStore.set(eid, inv1);

        // Serialize
        const serialized1 = inventoryStore.serialize(eid)!;

        // Modify
        const inv2 = createInventory(3);
        inv2.slots[0] = { type: "entity", definition: "new_sword" } as any;
        inv2.slots[1] = { type: "entity", definition: "shield" } as any;
        inventoryStore.set(eid, inv2);

        // Deserialize old data (should overwrite)
        inventoryStore.deserialize(eid, serialized1);

        // Verify old data is restored
        const reloadedInv = inventoryStore.get(eid)!;
        expect(reloadedInv.slots[0]).toEqual({ type: "entity", definition: "old_sword" });
        expect(reloadedInv.slots[1]).toBeNull(); // Should not have shield
      });

      it("handles sparse entity IDs in serialization", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

        // Use non-sequential entity IDs
        const sparseIds = [10, 100, 1000, 10000, 100000];
        sparseIds.forEach(eid => {
          discoveredStore.get(eid).add(eid + 1);
        });

        // Serialize all
        const serialized = sparseIds.map(eid => ({
          eid,
          data: discoveredStore.serialize(eid)!,
        }));

        // Create new context and reload
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");

        serialized.forEach(({ eid, data }) => {
          discoveredStore2.deserialize(eid, data);
        });

        // Verify all sparse IDs
        sparseIds.forEach(eid => {
          expect(discoveredStore2.get(eid).has(eid + 1)).toBe(true);
        });
      });
    });

    describe("Cross-store consistency", () => {
      it("maintains referential consistency across stores", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");
        const pickedUpStore = module.getStore<LazySetStore>("pickedUpBy");

        const player = 7000;
        const item = 7001;

        // Player has item in inventory
        const inv = createInventory(3);
        inv.slots[0] = { type: "entity", definition: item } as any;
        inventoryStore.set(player, inv);

        // Item is discovered and picked up by player
        discoveredStore.get(item).add(player);
        pickedUpStore.get(item).add(player);

        // Serialize
        const playerInvData = inventoryStore.serialize(player);
        const itemDiscoveredData = discoveredStore.serialize(item);
        const itemPickedUpData = pickedUpStore.serialize(item);

        // Create new context and reload
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const inventoryStore2 = module2.getStore<InventoryStore>("inventory");
        const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");
        const pickedUpStore2 = module2.getStore<LazySetStore>("pickedUpBy");

        inventoryStore2.deserialize(player, playerInvData!);
        discoveredStore2.deserialize(item, itemDiscoveredData!);
        pickedUpStore2.deserialize(item, itemPickedUpData!);

        // Verify cross-references
        const reloadedInv = inventoryStore2.get(player)!;
        expect(reloadedInv.slots[0]).toEqual({ type: "entity", definition: item });
        expect(discoveredStore2.get(item).has(player)).toBe(true);
        expect(pickedUpStore2.get(item).has(player)).toBe(true);
      });

      it("handles circular references in set stores", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

        const entity1 = 8000;
        const entity2 = 8001;
        const entity3 = 8002;

        // Create circular reference pattern
        discoveredStore.get(entity1).add(entity2);
        discoveredStore.get(entity2).add(entity3);
        discoveredStore.get(entity3).add(entity1);

        // Serialize all
        const serialized1 = discoveredStore.serialize(entity1)!;
        const serialized2 = discoveredStore.serialize(entity2)!;
        const serialized3 = discoveredStore.serialize(entity3)!;

        // Create new context and reload
        const ctx2 = createECS();
        const module2 = getModule<EntityStoreModule>(ctx2, "entityStore")!;
        const discoveredStore2 = module2.getStore<LazySetStore>("discoveredBy");

        discoveredStore2.deserialize(entity1, serialized1);
        discoveredStore2.deserialize(entity2, serialized2);
        discoveredStore2.deserialize(entity3, serialized3);

        // Verify circular references are preserved
        expect(discoveredStore2.get(entity1).has(entity2)).toBe(true);
        expect(discoveredStore2.get(entity2).has(entity3)).toBe(true);
        expect(discoveredStore2.get(entity3).has(entity1)).toBe(true);
      });
    });

    describe("Error handling and edge cases", () => {
      it("handles serialization of entity with all empty stores", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

        const eid = 9000;

        // Get lazy set but don't add anything
        discoveredStore.get(eid); // Creates empty set

        // Serialize - inventory should be undefined, discovered should be empty array
        const invSerialized = inventoryStore.serialize(eid);
        const discoveredSerialized = discoveredStore.serialize(eid);

        expect(invSerialized).toBeUndefined();
        expect(discoveredSerialized).toEqual([]);
      });

      it("deserializes inventory with malformed item data gracefully", () => {
        const inventoryStore = new InventoryStore();
        const eid = 9001;

        // Deserialize with various malformed data
        inventoryStore.deserialize(eid, {
          size: 5,
          selectedItemIndex: 0,
          items: [
            "valid_item", // Valid string
            { type: "Material", name: "Iron" }, // Valid material (has type, no Body/Info)
            { Body: {}, Info: {} }, // Valid entity-like object (has Body/Info)
            { random: "data" }, // Invalid but should be treated as entity (no type field)
            null, // Null
          ],
        });

        const inv = inventoryStore.get(eid)!;
        expect(inv.size).toBe(5);
        expect(inv.slots[0]).toEqual({ type: "entity", definition: "valid_item" });
        // Item with type field but no Body/Info is treated as material
        expect(inv.slots[1]?.type).toBe("material");
        expect((inv.slots[1] as any)?.definition).toEqual({ type: "Material", name: "Iron" });
        expect((inv.slots[1] as any)?.amount).toBe(1);
        expect(inv.slots[2]).toEqual({ type: "entity", definition: { Body: {}, Info: {} } });
        expect(inv.slots[3]).toEqual({ type: "entity", definition: { random: "data" } });
        expect(inv.slots[4]).toBeNull();
      });

      it("handles deserialization with mismatched size", () => {
        const inventoryStore = new InventoryStore();
        const eid = 9002;

        // Deserialize with size 2 but 4 items
        inventoryStore.deserialize(eid, {
          size: 2,
          selectedItemIndex: 0,
          items: ["item1", "item2", "item3", "item4"],
        });

        const inv = inventoryStore.get(eid)!;
        expect(inv.size).toBe(2);
        expect(inv.slots[0]).toEqual({ type: "entity", definition: "item1" });
        expect(inv.slots[1]).toEqual({ type: "entity", definition: "item2" });
        expect(inv.slots[2]).toBeUndefined(); // Beyond size
      });

      it("handles very large sets in SetStore", () => {
        const setStore = new SetStore();
        const eid = 9003;

        // Create large set
        const largeSet = new Set<number>();
        for (let i = 0; i < 10000; i++) {
          largeSet.add(i);
        }
        setStore.set(eid, largeSet);

        // Serialize
        const serialized = setStore.serialize(eid)!;
        expect(serialized.length).toBe(10000);

        // Deserialize
        const setStore2 = new SetStore();
        setStore2.deserialize(eid, serialized);

        const reloadedSet = setStore2.get(eid)!;
        expect(reloadedSet.size).toBe(10000);
        expect(reloadedSet.has(0)).toBe(true);
        expect(reloadedSet.has(9999)).toBe(true);
        expect(reloadedSet.has(5000)).toBe(true);
      });

      it("handles duplicate values in set deserialization", () => {
        const setStore = new SetStore();
        const eid = 9004;

        // Deserialize with duplicates
        setStore.deserialize(eid, [1, 2, 2, 3, 3, 3, 4]);

        const set = setStore.get(eid)!;
        expect(set.size).toBe(4); // Duplicates removed
        expect(set.has(1)).toBe(true);
        expect(set.has(2)).toBe(true);
        expect(set.has(3)).toBe(true);
        expect(set.has(4)).toBe(true);
      });
    });

    describe("Performance and stress testing", () => {
      it("efficiently serializes entities with mixed empty and full stores", () => {
        const module = getModule<EntityStoreModule>(ctx, "entityStore")!;
        const inventoryStore = module.getStore<InventoryStore>("inventory");
        const discoveredStore = module.getStore<LazySetStore>("discoveredBy");

        // Create 50 entities, some with data, some empty
        const entities = [];
        for (let i = 0; i < 50; i++) {
          const eid = 10000 + i;
          entities.push(eid);

          if (i % 3 === 0) {
            // Has inventory
            const inv = createInventory(2);
            inv.slots[0] = { type: "entity", definition: `item_${i}` } as any;
            inventoryStore.set(eid, inv);
          } else if (i % 3 === 1) {
            // Has discovered set
            discoveredStore.get(eid).add(i);
          }
          // else: no data
        }

        // Serialize only non-empty stores
        const serializedData: Record<number, any> = {};
        entities.forEach(eid => {
          const invData = inventoryStore.serialize(eid);
          const discoveredData = discoveredStore.serialize(eid);
          
          // Only include if there's meaningful data (not just empty arrays)
          const hasInv = invData !== undefined;
          const hasDiscovered = discoveredData !== undefined && discoveredData.length > 0;
          
          if (hasInv || hasDiscovered) {
            serializedData[eid] = {};
            if (hasInv) serializedData[eid].inventory = invData;
            if (hasDiscovered) serializedData[eid].discoveredBy = discoveredData;
          }
        });

        // Should have data for 34/50 entities (17 with inventory + 17 with discovered sets)
        expect(Object.keys(serializedData).length).toBe(34);
      });

      it("handles deeply nested inventory item definitions", () => {
        const inventoryStore = new InventoryStore();
        const eid = 11000;

        // Create deeply nested structure for testing serialization depth
        interface NestedLevel {
          level: number;
          next?: NestedLevel;
        }
        
        const deepObject: NestedLevel = { level: 0 };
        let current = deepObject;
        for (let i = 1; i < 10; i++) {
          current.next = { level: i };
          current = current.next;
        }

        const inv = createInventory(1);
        inv.slots[0] = { type: "entity", definition: deepObject };
        inventoryStore.set(eid, inv);

        // Serialize and deserialize
        const serialized = inventoryStore.serialize(eid)!;
        
        const inventoryStore2 = new InventoryStore();
        inventoryStore2.deserialize(eid, serialized);

        const reloadedInv = inventoryStore2.get(eid)!;
        const reloadedDef = reloadedInv.slots[0]?.definition as NestedLevel;
        
        // Verify deep structure is preserved
        expect(reloadedDef.level).toBe(0);
        expect(reloadedDef.next.level).toBe(1);
        expect(reloadedDef.next.next.level).toBe(2);
      });
    });
  });
});
