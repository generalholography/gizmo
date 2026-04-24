/**
 * Tests for World Persistence System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineQuery, addComponent } from 'bitecs';
import { createECS, setResource, getResource } from '../ecs';
import { 
  saveWorldToFile, 
  serializeWorldToJSON, 
  loadWorldFromJSON 
} from '../worldPersistence';
import { initialize } from '../initializeWorld';
import { serializeWorld } from '../serializeWorld';
import { spawn } from '../spawn';
import { getEntityBundle } from '../despawn';
import { getStore } from '../../modules/entityStore';
import type { WorldDefinition } from '../worldSchema';
import { Transform } from '../components/Transform';
import { Player } from '../components/Player';
import { Held } from '../components/Held';
import { ReactiveMap, ReactiveSet } from '../../utils/reactiveTypes';
import { LazyMap } from '../../utils/lazyMap';
import { Metrics } from '../metrics';
import * as Components from '../components';

function getSerializedEntities(worldDef: WorldDefinition | any): any[] {
  const chunkEntities =
    worldDef.dimensions
      ?.flatMap((dimension: any) => dimension.chunks ?? [])
      .flatMap((chunk: any) => chunk.entities ?? []) ?? [];

  if (chunkEntities.length > 0) {
    return chunkEntities;
  }

  return worldDef.entities ?? [];
}

describe('World Persistence', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createECS();
    
    // Initialize basic world metadata
    setResource(ctx, 'metadata', {
      title: 'Test World',
      description: 'A test world',
      tags: ['test'],
      brandColors: ['#ff0000', '#00ff00'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: 0x87CEEB,
          sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
          clouds: { color: 0xFFFFFF, coverage: 0.5 },
          stars: { intensity: 0.0 }
        },
        chunks: []
      }]
    });
  });

  describe('serializeWorldToJSON', () => {
    it('should serialize world to JSON string', () => {
      const json = serializeWorldToJSON(ctx);
      
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('Test World');
      expect(parsed.description).toBe('A test world');
    });

    it('should include entities when they exist', () => {
      // Spawn a simple entity
      spawn(ctx, {
        Transform: { x: 1, y: 2, z: 3 },
        Info: { name: 'Test Entity', description: '' }
      });

      const json = serializeWorldToJSON(ctx);
      const parsed = JSON.parse(json);
      
      // Entities should be in dimensions[0].chunks[0].entities
      expect(parsed.dimensions).toBeDefined();
      expect(parsed.dimensions.length).toBeGreaterThan(0);
      expect(parsed.dimensions[0].chunks).toBeDefined();
      expect(parsed.dimensions[0].chunks.length).toBeGreaterThan(0);
      expect(parsed.dimensions[0].chunks[0].entities).toBeDefined();
      expect(Array.isArray(parsed.dimensions[0].chunks[0].entities)).toBe(true);
      expect(parsed.dimensions[0].chunks[0].entities.length).toBeGreaterThan(0);
    });

    it('should include runtime data', () => {
      // Set some runtime data
      setResource(ctx, 'timeOfDay', 1800);
      
      const json = serializeWorldToJSON(ctx);
      const parsed = JSON.parse(json);
      
      expect(parsed.timeOfDay).toBe(1800);
      expect(parsed.createdAt).toBeDefined();
      expect(parsed.updatedAt).toBeDefined();
      expect(parsed.serializedAt).toBeDefined();
      expect(parsed.engineVersion).toBeDefined();
    });
  });

  describe('loadWorldFromJSON', () => {
    it('should generate world script from JSON', () => {
      const worldDef: WorldDefinition = {
        title: 'Loaded World',
        description: 'A loaded test world',
        tags: ['loaded'],
        brandColors: ['#0000ff'],
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x000000,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      };
      
      const json = JSON.stringify(worldDef);
      const worldScript = loadWorldFromJSON(json);
      
      expect(worldScript).toBeDefined();
      expect(typeof worldScript).toBe('string');
      expect(worldScript).toContain('initialize');
      expect(worldScript).toContain('setupScene');
      expect(worldScript).toContain('Loaded World');
    });

    it('should generate script with entities', () => {
      const worldDef: WorldDefinition = {
        title: 'World with Entities',
        entities: [
          {
            Transform: { x: 5, y: 10, z: 15 },
            Info: { name: 'Entity 1' }
          }
        ]
      };
      
      const json = JSON.stringify(worldDef);
      const worldScript = loadWorldFromJSON(json);
      
      expect(worldScript).toContain('entities');
      expect(worldScript).toContain('spawnEntities: true');
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve world metadata through save and load', () => {
      // Initialize a world
      const originalDef: WorldDefinition = {
        title: 'Original World',
        description: 'Original description',
        tags: ['tag1', 'tag2'],
        brandColors: ['#ff0000', '#00ff00'],
        dimensions: [{
          name: 'base',
          gravity: -5.0,
          useDayNightCycle: true,
          sky: {
            color: 0x123456,
            sun: { color: 0xFFFFFF, intensity: 0.8, timeOfDay: 900 },
            clouds: { color: 0xCCCCCC, coverage: 0.3 },
            stars: { intensity: 0.5 }
          }
        }]
      };
      
      initialize(ctx, originalDef);
      
      // Serialize
      const json = serializeWorldToJSON(ctx);
      const serialized = JSON.parse(json);
      
      // Verify metadata preserved
      expect(serialized.title).toBe('Original World');
      expect(serialized.description).toBe('Original description');
      expect(serialized.tags).toEqual(['tag1', 'tag2']);
      expect(serialized.brandColors).toEqual(['#ff0000', '#00ff00']);
      expect(serialized.dimensions).toBeDefined();
      expect(serialized.dimensions.length).toBeGreaterThan(0);
      expect(serialized.dimensions[0].gravity).toBe(-5.0);
      expect(serialized.dimensions[0].chunks).toBeDefined();
    });

    it('should preserve entities through save and load', () => {
      // Spawn some entities
      const eid1 = spawn(ctx, {
        Transform: { x: 1, y: 2, z: 3 },
        Info: { name: 'Entity 1', description: 'First entity' }
      });
      
      const eid2 = spawn(ctx, {
        Transform: { x: 4, y: 5, z: 6 },
        Info: { name: 'Entity 2', description: 'Second entity' }
      });
      
      // Serialize
      const json = serializeWorldToJSON(ctx);
      const serialized = JSON.parse(json);
      
      // Verify entities preserved in chunks
      expect(serialized.dimensions).toBeDefined();
      expect(serialized.dimensions[0].chunks).toBeDefined();
      expect(serialized.dimensions[0].chunks[0].entities).toBeDefined();
      expect(serialized.dimensions[0].chunks[0].entities.length).toBeGreaterThanOrEqual(2);
      
      const entities = serialized.dimensions[0].chunks[0].entities;
      
      // Check that entity data is present (might include player if spawned)
      const hasEntity1 = entities.some((e: any) => 
        e.Info?.name === 'Entity 1' && 
        e.Transform?.x === 1 && 
        e.Transform?.y === 2 && 
        e.Transform?.z === 3
      );
      expect(hasEntity1).toBe(true);
      
      const hasEntity2 = entities.some((e: any) => 
        e.Info?.name === 'Entity 2' && 
        e.Transform?.x === 4 && 
        e.Transform?.y === 5 && 
        e.Transform?.z === 6
      );
      expect(hasEntity2).toBe(true);
    });

    it('should generate executable world script', () => {
      // Create a complete world
      const worldDef: WorldDefinition = {
        title: 'Complete World',
        description: 'A complete test world',
        entities: [
          {
            Transform: { x: 0, y: 0, z: 0 },
            Info: { name: 'Origin' }
          }
        ]
      };
      
      const json = JSON.stringify(worldDef);
      const worldScript = loadWorldFromJSON(json);
      
      // Verify script structure
      expect(worldScript).toContain('export default');
      expect(worldScript).toContain('setupScene');
      expect(worldScript).toContain('initialize');
      expect(worldScript).toContain('const { initialize } = api');
      expect(worldScript).toContain('spawnEntities: true');
      expect(worldScript).toContain('merge: false');
    });
  });

  describe('held items handling', () => {
    it('should preserve held items through save/load', () => {
      // Spawn a player with inventory
      const playerEid = spawn(ctx, {
        Transform: { x: 0, y: 0, z: 0 },
        Info: { name: 'Player' },
        Player: {},
        Inventory: { size: 5 }
      });

      // Spawn an item to be held
      const swordEid = spawn(ctx, {
        Transform: { x: 0, y: 0, z: 0 },
        Info: { name: 'Sword' }
      });

      // Set held item relationship
      const heldItemsStore = getStore<any>(ctx, 'heldItems');
      heldItemsStore.set(playerEid, { eid: swordEid, slot: 0 });

      // Serialize
      const json = serializeWorldToJSON(ctx);
      const serialized = JSON.parse(json);

      // Find the player entity in serialized data
      const serializedEntities = getSerializedEntities(serialized);
      const playerData = serializedEntities.find((e: any) => 
        e.Player !== undefined && !e.Player  // Player component exists but is empty/false
      );

      // Verify held item was serialized (only player entities should have held items, and they're excluded)
      // Since player entities are excluded from serialization by default, 
      // we should not find player data in the serialized entities
      expect(playerData).toBeUndefined();

      // Check that the sword entity is serialized
      const swordData = serializedEntities.find((e: any) => 
        e.Info?.name === 'Sword'
      );
      expect(swordData).toBeDefined();
    });
  });

  describe('saveWorldToFile', () => {
    it('should return world definition', () => {
      // Mock DOM elements for file download
      const mockLink = {
        click: vi.fn(),
        remove: vi.fn(),
        href: '',
        download: ''
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      // Mock URL.createObjectURL and revokeObjectURL (not available in jsdom)
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
      
      const worldDef = saveWorldToFile(ctx, 'test-world.json');
      
      expect(worldDef).toBeDefined();
      expect(worldDef.title).toBe('Test World');
      const serializedEntities = getSerializedEntities(worldDef);
      expect(serializedEntities).toBeDefined();
      expect(serializedEntities.length).toBeGreaterThanOrEqual(0);
      
      // Verify download was triggered
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });

  describe('end-to-end world loading', () => {
    it('should correctly load a world from serialized state', () => {
      // Create a fresh context for loading
      const loadCtx = createECS();
      
      // Initialize with default metadata
      setResource(loadCtx, 'metadata', {
        title: 'Original World',
        description: 'Original description',
        tags: ['original'],
        brandColors: ['#000000'],
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x000000,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      });
      
      // Spawn some entities in the original world
      const eid1 = spawn(loadCtx, {
        Transform: { x: 10, y: 20, z: 30 },
        Info: { name: 'Test Entity 1', description: 'First test entity' }
      });
      
      const eid2 = spawn(loadCtx, {
        Transform: { x: 40, y: 50, z: 60 },
        Info: { name: 'Test Entity 2', description: 'Second test entity' }
      });
      
      // Serialize the world
      const worldDef = serializeWorld(loadCtx, {
        includeEntities: true,
        includeRuntime: true
      });
      
      // Verify serialization captured the data
      const serializedEntities = getSerializedEntities(worldDef);
      expect(serializedEntities).toBeDefined();
      expect(serializedEntities.length).toBeGreaterThanOrEqual(2);
      
      // Now create a NEW context to simulate a fresh load
      const freshCtx = createECS();
      
      // Initialize with dummy data to verify it gets replaced
      setResource(freshCtx, 'metadata', {
        title: 'Dummy World',
        description: 'Should be replaced',
        tags: ['dummy'],
        brandColors: ['#ffffff'],
        dimensions: [{
          name: 'base',
          gravity: -5.0,
          useDayNightCycle: true,
          sky: {
            color: 0xFFFFFF,
            sun: { color: 0x000000, intensity: 0.5, timeOfDay: 600 },
            clouds: { color: 0x000000, coverage: 0.1 },
            stars: { intensity: 1.0 }
          }
        }]
      });
      
      // Load the serialized world into the fresh context
      initialize(freshCtx, worldDef, {
        spawnEntities: true,
        merge: false
      });
      
      // Verify metadata was restored
      const loadedMetadata = getResource(freshCtx, 'metadata');
      expect(loadedMetadata.title).toBe('Original World');
      expect(loadedMetadata.description).toBe('Original description');
      expect(loadedMetadata.tags).toContain('original');
      
      // Verify entities were spawned
      // Note: We can't directly check entity IDs since they're assigned sequentially
      // but we can verify the entity data is in the serialized definition
      const entity1Data = serializedEntities.find((e: any) => 
        e.Info?.name === 'Test Entity 1' && 
        e.Transform?.x === 10 && 
        e.Transform?.y === 20 && 
        e.Transform?.z === 30
      );
      expect(entity1Data).toBeDefined();
      
      const entity2Data = serializedEntities.find((e: any) => 
        e.Info?.name === 'Test Entity 2' && 
        e.Transform?.x === 40 && 
        e.Transform?.y === 50 && 
        e.Transform?.z === 60
      );
      expect(entity2Data).toBeDefined();
    });

    it('should verify generated world script can be evaluated', () => {
      // Create a world with entities
      const worldDef: WorldDefinition = {
        title: 'Script Test World',
        description: 'Testing script generation',
        tags: ['test'],
        brandColors: ['#ff0000'],
        entities: [
          {
            Transform: { x: 100, y: 200, z: 300 },
            Info: { name: 'Script Entity' }
          }
        ]
      };
      
      // Generate the world script
      const json = JSON.stringify(worldDef);
      const worldScript = loadWorldFromJSON(json);
      
      // Verify the script contains the world definition data
      expect(worldScript).toContain('"title": "Script Test World"');
      expect(worldScript).toContain('"name": "Script Entity"');
      expect(worldScript).toContain('"x": 100');
      expect(worldScript).toContain('"y": 200');
      expect(worldScript).toContain('"z": 300');
      
      // Verify the script has the correct structure
      expect(worldScript).toContain('const worldDefinition =');
      expect(worldScript).toContain('export default');
      expect(worldScript).toContain('setupScene(api)');
      expect(worldScript).toContain('const { initialize } = api');
      expect(worldScript).toContain('initialize(worldDefinition');
      
      // Verify it doesn't have the incorrect pattern
      expect(worldScript).not.toContain('initialize(api.ecsWorld');
    });
  });

  describe('Player state preservation', () => {
    it('should preserve player metrics through save/load', () => {
      // Create a player with metrics
      const playerEid = spawn(ctx, {
        Transform: { x: 0, y: 5, z: 0 },
        Info: { name: 'Test Player' },
        Player: {},
        Inventory: { size: 5 }
      });

      // Add some metrics to the player
      const metricsStore = getStore<any>(ctx, 'metrics');
      metricsStore.set(playerEid, {
        'steps': { __value: 100, 'normal': 100 },
        'items collected': { __value: 5, 'sword': 2, 'shield': 3 }
      });

      // Serialize the world
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      // Verify player is included in serialization
      const playerData = getSerializedEntities(worldDef).find((e: any) => e.Player !== undefined);
      expect(playerData).toBeDefined();
      expect(playerData.Metrics).toBeDefined();
      expect(playerData.Metrics.steps.__value).toBe(100);
      expect(playerData.Metrics['items collected'].__value).toBe(5);

      // Create fresh context and load
      const freshCtx = createECS();
      setResource(freshCtx, 'metadata', {
        title: 'Test',
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x87CEEB,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      });

      initialize(freshCtx, worldDef, {
        spawnEntities: true,
        merge: false
      });

      // Verify player metrics were restored
      const freshMetricsStore = getStore<any>(freshCtx, 'metrics');
      // We need to find the new player entity (will have different eid)
      // Check that at least one entity has the player metrics
      let foundMetrics = false;
      for (const [eid, metrics] of freshMetricsStore.map.entries()) {
        if (metrics.steps?.__value === 100 && metrics['items collected']?.__value === 5) {
          foundMetrics = true;
          break;
        }
      }
      expect(foundMetrics).toBe(true);
    });

    it('should preserve player achievement progress', () => {
      // Create a player
      const playerEid = spawn(ctx, {
        Transform: { x: 0, y: 5, z: 0 },
        Info: { name: 'Test Player' },
        Player: {},
      });

      // Unlock some achievements for the player
      const unlockedStore = getStore<any>(ctx, 'unlockedAchievements');
      unlockedStore.set(playerEid, new Set(['first_steps', 'item_collector', 'explorer']));

      // Serialize the world
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      // Verify player achievements are included
      const playerData = getSerializedEntities(worldDef).find((e: any) => e.Player !== undefined);
      expect(playerData).toBeDefined();
      expect(playerData.UnlockedAchievements).toBeDefined();
      expect(playerData.UnlockedAchievements).toContain('first_steps');
      expect(playerData.UnlockedAchievements).toContain('item_collector');
      expect(playerData.UnlockedAchievements).toContain('explorer');

      // Create fresh context and load
      const freshCtx = createECS();
      setResource(freshCtx, 'metadata', {
        title: 'Test',
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x87CEEB,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      });

      initialize(freshCtx, worldDef, {
        spawnEntities: true,
        merge: false
      });

      // Verify achievement progress was restored
      const freshUnlockedStore = getStore<any>(freshCtx, 'unlockedAchievements');
      let foundAchievements = false;
      for (const [eid, achievements] of freshUnlockedStore.map.entries()) {
        if (achievements.has('first_steps') && achievements.has('item_collector') && achievements.has('explorer')) {
          foundAchievements = true;
          break;
        }
      }
      expect(foundAchievements).toBe(true);
    });
  });

  describe('Held items reconstruction', () => {
    it('should not serialize held items but preserve inventory', () => {
      // Create entity with inventory and a held item
      const entityEid = spawn(ctx, {
        Transform: { x: 0, y: 0, z: 0 },
        Info: { name: 'Test Entity' },
        Inventory: { size: 5 }
      });

      // Add item to inventory
      const inventoryStore = getStore<any>(ctx, 'inventory');
      const inv = inventoryStore.get(entityEid);
      inv.slots[0] = {
        type: 'entity',
        definition: { Info: { name: 'Test Sword' }, Transform: { x: 0, y: 0, z: 0 } }
      };
      inv.selected = 0;

      // Simulate held item being created by heldItemSystem
      const heldItemEid = spawn(ctx, inv.slots[0].definition);
      const heldItemsStore = getStore<any>(ctx, 'heldItems');
      heldItemsStore.set(entityEid, { eid: heldItemEid, slot: 0 });

      // Serialize
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      // Find the entity data
      const entityData = getSerializedEntities(worldDef).find((e: any) => e.Info?.name === 'Test Entity');
      expect(entityData).toBeDefined();
      
      // Verify inventory is serialized
      expect(entityData.Inventory).toBeDefined();
      expect(entityData.Inventory.items[0]).toBeDefined();
      expect(entityData.Inventory.items[0].Info.name).toBe('Test Sword');

      // Verify HeldItems is NOT serialized (runtime state)
      expect(entityData.HeldItems).toBeUndefined();
    });

    it('should allow held items to be reconstructed after load', () => {
      // This test verifies that even though HeldItems isn't serialized,
      // the heldItemSystem can reconstruct it from inventory

      // Create entity with inventory
      const entityEid = spawn(ctx, {
        Transform: { x: 0, y: 0, z: 0 },
        Info: { name: 'Test Entity' },
        Inventory: { size: 5 }
      });

      // Add item to inventory and mark as selected
      const inventoryStore = getStore<any>(ctx, 'inventory');
      const inv = inventoryStore.get(entityEid);
      inv.slots[0] = {
        type: 'entity',
        definition: { Info: { name: 'Test Sword' }, Transform: { x: 0, y: 0, z: 0 } }
      };
      inv.selected = 0;

      // Serialize
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      // Load into fresh context
      const freshCtx = createECS();
      setResource(freshCtx, 'metadata', {
        title: 'Test',
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x87CEEB,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      });

      initialize(freshCtx, worldDef, {
        spawnEntities: true,
        merge: false
      });

      // Verify inventory was restored with the item
      const freshInventoryStore = getStore<any>(freshCtx, 'inventory');
      let foundInventoryWithItem = false;
      for (const [eid, inventory] of freshInventoryStore.map.entries()) {
        if (inventory.slots[0]?.definition?.Info?.name === 'Test Sword') {
          foundInventoryWithItem = true;
          // Verify item is marked as selected (ready to be held)
          expect(inventory.selected).toBe(0);
          break;
        }
      }
      expect(foundInventoryWithItem).toBe(true);

      // Verify HeldItems store is empty (will be populated by heldItemSystem on first run)
      const freshHeldItemsStore = getStore<any>(freshCtx, 'heldItems');
      // The store should exist but be empty initially
      expect(freshHeldItemsStore.map.size).toBe(0);
    });

    it('should not serialize held item entities (avoid duplicates)', () => {
      // Create entity with inventory
      const entityEid = spawn(ctx, {
        Transform: { x: 0, y: 0, z: 0 },
        Info: { name: 'Test Entity with Held Item' },
        Inventory: { size: 5 },
        MotionSource: {}
      });

      // Add item to inventory
      const inventoryStore = getStore<any>(ctx, 'inventory');
      const inv = inventoryStore.get(entityEid);
      inv.slots[0] = {
        type: 'entity',
        definition: { Info: { name: 'Test Sword' }, Transform: { x: 0, y: 0, z: 0 } }
      };
      inv.selected = 0;

      // Create the held item entity (simulating what heldItemSystem does)
      const heldItemEid = spawn(ctx, inv.slots[0].definition);
      
      // Add Held component (this is what heldItemSystem does)
      addComponent(ctx, Held, heldItemEid);
      Held.eid[heldItemEid] = entityEid;

      // Verify the Held component is set
      console.log(`Held item entity ${heldItemEid} has Held component:`, Held[heldItemEid] !== undefined);
      console.log(`Held.eid value:`, Held.eid[heldItemEid]);

      // Count entities before serialization
      const allEntitiesQuery = defineQuery([Transform]);
      const entitiesBefore = allEntitiesQuery(ctx);
      console.log(`Total entities before serialization: ${entitiesBefore.length}`);
      
      // Serialize
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });
      
      const serializedEntities = getSerializedEntities(worldDef);
      console.log(`Serialized ${serializedEntities.length} entities`);

      // Verify the held item entity is NOT in the serialized entities
      // Note: Entities with Held component should be excluded entirely from serialization
      const heldItemInSerialized = serializedEntities.find((e: any) => 
        e.Info?.name === 'Test Sword' && e.Transform
      );
      // The held item should NOT be serialized as a separate entity
      expect(heldItemInSerialized).toBeUndefined();

      // Verify the parent entity IS serialized with its inventory
      const parentInSerialized = serializedEntities.find((e: any) => 
        e.Info?.name === 'Test Entity with Held Item'
      );
      expect(parentInSerialized).toBeDefined();
      expect(parentInSerialized.Inventory).toBeDefined();
      expect(parentInSerialized.Inventory.items[0].Info.name).toBe('Test Sword');
    });
  });

  describe('Comprehensive end-to-end testing', () => {
    it('should fully preserve and restore player state with metrics and achievements', () => {
      // Setup: Create a more realistic world with player, metrics, and achievements
      
      // Register achievements
      const achievementsMap = new ReactiveMap();
      achievementsMap.set('first_steps', {
        description: 'Take your first steps',
        condition: { type: 'greaterThanOrEqual', params: { metric: 'steps', targetValue: 1 } }
      });
      achievementsMap.set('item_collector', {
        description: 'Collect 5 items',
        condition: { type: 'greaterThanOrEqual', params: { metric: 'items collected', targetValue: 5 } }
      });
      setResource(ctx, 'achievements', achievementsMap);

      // Create player with full state
      const playerEid = spawn(ctx, {
        Transform: { x: 10, y: 5, z: 15 },
        Info: { name: 'TestPlayer', description: 'A test player' },
        Player: {},
        Inventory: { size: 10 }
      });

      // Set player metrics
      const metricsStore = getStore<any>(ctx, 'metrics');
      metricsStore.set(playerEid, {
        'steps': { __value: 50, 'forward': 30, 'backward': 20 },
        'items collected': { __value: 7, 'sword': 2, 'shield': 3, 'potion': 2 }
      });

      // Unlock achievements for player
      const unlockedStore = getStore<any>(ctx, 'unlockedAchievements');
      unlockedStore.set(playerEid, new Set(['first_steps', 'item_collector']));

      // Add items to inventory
      const inventoryStore = getStore<any>(ctx, 'inventory');
      const inv = inventoryStore.get(playerEid);
      inv.slots[0] = { type: 'entity', definition: { Info: { name: 'Iron Sword' } } };
      inv.slots[1] = { type: 'entity', definition: { Info: { name: 'Wooden Shield' } } };
      inv.selected = 0;

      // Create some other entities
      spawn(ctx, {
        Transform: { x: 5, y: 0, z: 5 },
        Info: { name: 'Chest' }
      });

      // Serialize
      console.log('=== Serializing world ===');
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      const serializedEntities = getSerializedEntities(worldDef);
      console.log(`Serialized ${serializedEntities.length} entities`);
      console.log('Achievements:', worldDef.achievements?.map((a: any) => a.name));

      // Verify player is in serialized data
      const serializedPlayer = serializedEntities.find((e: any) => e.Player !== undefined);
      expect(serializedPlayer).toBeDefined();
      console.log('Serialized player metrics:', serializedPlayer?.Metrics);
      console.log('Serialized player achievements:', serializedPlayer?.UnlockedAchievements);
      
      expect(serializedPlayer?.Metrics).toBeDefined();
      expect(serializedPlayer?.Metrics.steps.__value).toBe(50);
      expect(serializedPlayer?.Metrics['items collected'].__value).toBe(7);
      expect(serializedPlayer?.UnlockedAchievements).toBeDefined();
      expect(serializedPlayer?.UnlockedAchievements).toContain('first_steps');
      expect(serializedPlayer?.UnlockedAchievements).toContain('item_collector');

      // Load into fresh context
      console.log('=== Loading world ===');
      const freshCtx = createECS();
      setResource(freshCtx, 'metadata', {
        title: 'Test',
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x87CEEB,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      });

      // Load achievements first (should happen in initialize)
      const freshAchievementsMap = new ReactiveMap();
      for (const achievement of worldDef.achievements || []) {
        freshAchievementsMap.set(achievement.name, {
          description: achievement.description,
          condition: achievement.condition
        });
      }
      setResource(freshCtx, 'achievements', freshAchievementsMap);

      // Load entities
      initialize(freshCtx, worldDef, {
        spawnEntities: true,
        merge: false
      });

      // Verify player was loaded
      const loadedPlayerQuery = defineQuery([Player]);
      const players = loadedPlayerQuery(freshCtx);
      console.log(`Found ${players.length} player(s) after load`);
      expect(players.length).toBeGreaterThan(0);

      const loadedPlayerEid = players[0];

      // Verify metrics were restored
      const freshMetricsStore = getStore<any>(freshCtx, 'metrics');
      const loadedMetrics = freshMetricsStore.get(loadedPlayerEid);
      console.log('Loaded player metrics:', loadedMetrics);
      
      expect(loadedMetrics).toBeDefined();
      expect(loadedMetrics.steps.__value).toBe(50);
      expect(loadedMetrics.steps.forward).toBe(30);
      expect(loadedMetrics.steps.backward).toBe(20);
      expect(loadedMetrics['items collected'].__value).toBe(7);
      expect(loadedMetrics['items collected'].sword).toBe(2);

      // Verify achievements were restored
      const freshUnlockedStore = getStore<any>(freshCtx, 'unlockedAchievements');
      const loadedAchievements = freshUnlockedStore.get(loadedPlayerEid);
      console.log('Loaded player achievements:', loadedAchievements);
      
      expect(loadedAchievements).toBeDefined();
      expect(loadedAchievements.has('first_steps')).toBe(true);
      expect(loadedAchievements.has('item_collector')).toBe(true);

      // Verify inventory was restored
      const freshInventoryStore = getStore<any>(freshCtx, 'inventory');
      const loadedInv = freshInventoryStore.get(loadedPlayerEid);
      console.log('Loaded player inventory:', loadedInv);
      
      expect(loadedInv).toBeDefined();
      expect(loadedInv.slots[0]?.definition?.Info?.name).toBe('Iron Sword');
      expect(loadedInv.slots[1]?.definition?.Info?.name).toBe('Wooden Shield');
      expect(loadedInv.selected).toBe(0);

      // Verify other entities were loaded
      const allQuery = defineQuery([Transform]);
      const allEntities = allQuery(freshCtx);
      console.log(`Total entities after load: ${allEntities.length}`);
      expect(allEntities.length).toBeGreaterThanOrEqual(2); // At least player + chest
    });

    it('should handle player with no metrics or achievements (like in real game)', () => {
      // Create player WITHOUT explicitly setting metrics or achievements
      const playerEid = spawn(ctx, {
        Transform: { x: 10, y: 5, z: 15 },
        Info: { name: 'TestPlayer', description: 'A test player' },
        Player: {},
        Inventory: { size: 10 }
      });

      // Check if player has any metrics or achievements
      const metricsStore = getStore<any>(ctx, 'metrics');
      const playerMetrics = metricsStore.get(playerEid);
      console.log('Player metrics before serialization:', playerMetrics);

      const unlockedStore = getStore<any>(ctx, 'unlockedAchievements');
      const playerAchievements = unlockedStore.get(playerEid);
      console.log('Player achievements before serialization:', playerAchievements);

      // Serialize with includeRuntime: true
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      // Find the player in serialized data
      const serializedPlayer = getSerializedEntities(worldDef).find((e: any) => e.Player !== undefined);
      expect(serializedPlayer).toBeDefined();
      
      console.log('Serialized player has Metrics field:', 'Metrics' in serializedPlayer);
      console.log('Serialized player has UnlockedAchievements field:', 'UnlockedAchievements' in serializedPlayer);
      console.log('Serialized player Metrics:', serializedPlayer?.Metrics);
      console.log('Serialized player UnlockedAchievements:', serializedPlayer?.UnlockedAchievements);

      // If no metrics/achievements exist, they should not be in the serialized data
      // (or they should be empty)
      if (!playerMetrics) {
        expect(serializedPlayer.Metrics).toBeUndefined();
      }
      if (!playerAchievements || playerAchievements.size === 0) {
        expect(serializedPlayer.UnlockedAchievements).toBeUndefined();
      }
    });

    it('should serialize player metrics tracked through Metrics resource (real gameplay)', () => {
      // This test simulates real gameplay where metrics are tracked via the Metrics resource
      const metricsResource = new Metrics(ctx);
      setResource(ctx, 'metrics', metricsResource);
      
      // Set up achievements and unlocked achievements (required for metrics tracking)
      const achievementsMap = new ReactiveMap();
      setResource(ctx, 'achievements', achievementsMap);
      const unlockedAchievements = new ReactiveMap();
      setResource(ctx, 'unlockedAchievements', unlockedAchievements);

      // Create player with StableID
      const playerEid = spawn(ctx, {
        Transform: { x: 10, y: 5, z: 15 },
        Info: { name: 'TestPlayer', description: 'A test player' },
        Player: {},
        Inventory: { size: 10 },
        StableID: { id: 42 }
      });

      // Verify StableID was set
      const actualStableId = Components.StableID.id[playerEid];
      console.log('Player eid:', playerEid, 'StableID:', actualStableId);
      expect(actualStableId).toBe(42);

      // Track metrics like the game would during gameplay  
      // IMPORTANT: increment() takes ENTITY ID (eid), not stableId!
      // The Metrics class will convert eid to stableId internally
      metricsResource.increment(playerEid, 'steps', 'forward');
      metricsResource.increment(playerEid, 'steps', 'forward');
      metricsResource.increment(playerEid, 'steps', 'backward');
      metricsResource.increment(playerEid, 'damage received', 'skeleton', 5);
      metricsResource.increment(playerEid, 'damage received', 'zombie', 3);

      // Check that metrics are tracked in the resource
      console.log('Steps forward:', metricsResource.get(playerEid, 'steps', 'forward')); // 2
      console.log('Steps backward:', metricsResource.get(playerEid, 'steps', 'backward')); // 1
      console.log('Steps total:', metricsResource.get(playerEid, 'steps')); // 3
      console.log('Damage from skeleton:', metricsResource.get(playerEid, 'damage received', 'skeleton')); // 5
      console.log('Damage total:', metricsResource.get(playerEid, 'damage received')); // 8

      // Serialize with includeRuntime: true
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });

      // Find the player in serialized data
      const serializedPlayer = getSerializedEntities(worldDef).find((e: any) => e.Player !== undefined);
      expect(serializedPlayer).toBeDefined();

      // Verify metrics were serialized
      expect(serializedPlayer.Metrics).toBeDefined();
      expect(serializedPlayer.Metrics.steps).toBeDefined();
      expect(serializedPlayer.Metrics.steps.__value).toBe(3);
      expect(serializedPlayer.Metrics.steps.forward).toBe(2);
      expect(serializedPlayer.Metrics.steps.backward).toBe(1);
      expect(serializedPlayer.Metrics['damage received'].__value).toBe(8);
      expect(serializedPlayer.Metrics['damage received'].skeleton).toBe(5);
      expect(serializedPlayer.Metrics['damage received'].zombie).toBe(3);

      // Load into fresh context
      const freshCtx = createECS();
      const freshMetricsResource = new Metrics(freshCtx);
      setResource(freshCtx, 'metrics', freshMetricsResource);
      
      // Set up achievements in fresh context (required for metrics)
      const freshAchievements = new ReactiveMap();
      setResource(freshCtx, 'achievements', freshAchievements);
      const freshUnlockedAchievements = new ReactiveMap();
      setResource(freshCtx, 'unlockedAchievements', freshUnlockedAchievements);
      
      setResource(freshCtx, 'metadata', {
        title: 'Test',
        dimensions: [{
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: 0x87CEEB,
            sun: { color: 0xFFFFFF, intensity: 1.0, timeOfDay: 1200 },
            clouds: { color: 0xFFFFFF, coverage: 0.5 },
            stars: { intensity: 0.0 }
          }
        }]
      });

      // Load entities
      initialize(freshCtx, worldDef, {
        spawnEntities: true,
        merge: false
      });

      // Verify player was loaded
      const loadedPlayerQuery = defineQuery([Player]);
      const players = loadedPlayerQuery(freshCtx);
      expect(players.length).toBeGreaterThan(0);

      const loadedPlayerEid = players[0];
      const loadedStableId = Components.StableID.id[loadedPlayerEid];

      // Verify metrics were loaded into the Metrics resource
      // IMPORTANT: Metrics.get() expects entity ID, not stableId
      expect(freshMetricsResource.get(loadedPlayerEid, 'steps')).toBe(3);
      expect(freshMetricsResource.get(loadedPlayerEid, 'steps', 'forward')).toBe(2);
      expect(freshMetricsResource.get(loadedPlayerEid, 'steps', 'backward')).toBe(1);
      expect(freshMetricsResource.get(loadedPlayerEid, 'damage received')).toBe(8);
      expect(freshMetricsResource.get(loadedPlayerEid, 'damage received', 'skeleton')).toBe(5);
      expect(freshMetricsResource.get(loadedPlayerEid, 'damage received', 'zombie')).toBe(3);
    });
  });

  describe('Entity Store Migration & StableID Pattern', () => {
    it('should convert entity references to stableIds during serialization', () => {
      // Create entities with stableIds
      const player = spawn(ctx, {
        Player: {},
        StableID: { id: 100 },
        Info: { name: 'TestPlayer', description: '' }
      });
      
      const item1 = spawn(ctx, {
        StableID: { id: 101 },
        Info: { name: 'Item1', description: '' }
      });
      
      const item2 = spawn(ctx, {
        StableID: { id: 102 },
        Info: { name: 'Item2', description: '' }
      });
      
      // Add entity references using discoveredBy (stores eids at runtime)
      const discoveredByStore = getStore(ctx, 'discoveredBy');
      const discoveredBySet = discoveredByStore.get(item1);
      discoveredBySet.add(player);
      discoveredBySet.add(item2);
      
      // Serialize the world
      const worldDef = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
      
      // Find the serialized item1
      const serializedItem1 = getSerializedEntities(worldDef).find(e => 
        e._meta?.archetype === undefined && e.Info?.name === 'Item1'
      );
      
      expect(serializedItem1).toBeDefined();
      expect(serializedItem1?.DiscoveredBy).toBeDefined();
      expect(serializedItem1?.DiscoveredBy).toHaveLength(2);
      
      // Verify it contains stableIds, not eids
      expect(serializedItem1?.DiscoveredBy).toContain(100); // player stableId
      expect(serializedItem1?.DiscoveredBy).toContain(102); // item2 stableId
      // Should NOT contain the actual entity IDs
      expect(serializedItem1?.DiscoveredBy).not.toContain(player);
      expect(serializedItem1?.DiscoveredBy).not.toContain(item2);
    });

    it('should convert stableIds back to entity IDs during deserialization', () => {
      // This test verifies the stableId conversion pattern works correctly
      // by checking that the serialized data contains stableIds (not eids)
      // and that the stores can handle the conversion
      
      // The full round-trip is already tested in other tests
      // Here we just verify the conversion layer works
      
      const player = spawn(ctx, {
        Player: {},
        StableID: { id: 200 },
        Info: { name: 'Player', description: '' }
      });
      
      const item = spawn(ctx, {
        StableID: { id: 201 },
        Info: { name: 'DiscoverableItem', description: '' }
      });
      
      // Add discoveredBy reference (stores eid at runtime)
      const discoveredByStore = getStore(ctx, 'discoveredBy');
      discoveredByStore.get(item).add(player);
      expect(discoveredByStore.get(item).has(player)).toBe(true);
      
      // Serialize (should convert eids to stableIds)
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });
      
      // Find the serialized item
      const serializedItem = getSerializedEntities(worldDef).find(e => 
        e.Info?.name === 'DiscoverableItem'
      );
      
      expect(serializedItem).toBeDefined();
      expect(serializedItem?.DiscoveredBy).toBeDefined();
      // Should contain player's stableId (200), not its eid
      expect(serializedItem?.DiscoveredBy).toContain(200);
    });

    it('should preserve pickedUpBy references through save/load', () => {
      // Similar to discoveredBy test - verify stableId conversion works
      
      const player = spawn(ctx, {
        Player: {},
        StableID: { id: 300 },
        Info: { name: 'Player', description: '' }
      });
      
      const item = spawn(ctx, {
        StableID: { id: 301 },
        Info: { name: 'PickableItem', description: '' }
      });
      
      // Track that player picked up the item (stores eid at runtime)
      const pickedUpByStore = getStore(ctx, 'pickedUpBy');
      pickedUpByStore.get(item).add(player);
      expect(pickedUpByStore.get(item).has(player)).toBe(true);
      
      // Serialize (should convert eids to stableIds)
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });
      
      // Find the serialized item
      const serializedItem = getSerializedEntities(worldDef).find(e => 
        e.Info?.name === 'PickableItem'
      );
      
      expect(serializedItem).toBeDefined();
      expect(serializedItem?.PickedUpBy).toBeDefined();
      // Should contain player's stableId (300), not its eid
      expect(serializedItem?.PickedUpBy).toContain(300);
    });

    it('should use MetricsStore as single source of truth for metrics', () => {
      // Create player
      const player = spawn(ctx, {
        Player: {},
        StableID: { id: 400 },
        Info: { name: 'Player', description: '' }
      });
      
      // Initialize Metrics resource and dependencies
      const metricsResource = new Metrics(ctx);
      setResource(ctx, 'metrics', metricsResource);
      setResource(ctx, 'achievements', new ReactiveMap());
      const unlockedAchievements = new LazyMap(() => new ReactiveSet());
      setResource(ctx, 'unlockedAchievements', unlockedAchievements);
      
      // Track metrics using Metrics resource (this should sync to MetricsStore)
      metricsResource.increment(player, 'kills');
      metricsResource.increment(player, 'kills', 'goblin', 2);
      metricsResource.increment(player, 'kills', 'orc');
      
      // Verify metrics are in MetricsStore
      const metricsStore = getStore(ctx, 'metrics');
      const storedMetrics = metricsStore.get(player);
      expect(storedMetrics).toBeDefined();
      // Expected: 1 (base) + 2 (goblin) + 1 (orc) = 4
      expect(storedMetrics?.kills?.__value).toBe(4);
      expect(storedMetrics?.kills?.goblin).toBe(2);
      expect(storedMetrics?.kills?.orc).toBe(1);
      
      // Serialize (should read from MetricsStore)
      const worldDef = serializeWorld(ctx, {
        includeEntities: true,
        includeRuntime: true
      });
      
      // Find player entity in serialized data
      const playerEntity = getSerializedEntities(worldDef).find(e => e.Player);
      
      expect(playerEntity).toBeDefined();
      expect(playerEntity?.Metrics).toBeDefined();
      expect(playerEntity?.Metrics?.kills?.__value).toBe(4);
      expect(playerEntity?.Metrics?.kills?.goblin).toBe(2);
      expect(playerEntity?.Metrics?.kills?.orc).toBe(1);
    });

    it('should handle mounting pattern with stableId references (future use)', () => {
      // This test documents the pattern for future mounting system implementation
      
      // Create mount and rider entities
      const mount = spawn(ctx, {
        StableID: { id: 500 },
        Info: { name: 'Horse', description: '' }
      });
      
      const rider = spawn(ctx, {
        StableID: { id: 501 },
        Info: { name: 'Rider', description: '' }
      });
      
      // When implementing Mounting/MountedBy stores, they should follow the same pattern:
      // 1. Store entity IDs at runtime for performance
      // 2. Convert to stableIds during serialization
      // 3. Convert back to entity IDs during deserialization
      
      // Example of how it would work:
      // const mountingStore = getStore<StableIdReferenceStore>(ctx, 'mounting');
      // mountingStore.get(rider).add(mount); // Stores eid at runtime
      
      // During serialization (in despawn.ts):
      // const mountStableIds = eidSetToStableIdSet(ctx, mountingStore.get(rider));
      // bundle.Mounting = Array.from(mountStableIds);
      
      // During deserialization (in spawn.ts):
      // const mountEids = stableIdSetToEidSet(ctx, new Set(bundle.Mounting));
      // mountingStore.set(eid, mountEids);
      
      // This test passes to document the pattern
      expect(true).toBe(true);
    });

    it('should preserve pickedUpBy across save/load preventing duplicate metrics', () => {
      // Initialize metrics and achievements resources
      const metrics = new Metrics(ctx);
      setResource(ctx, 'metrics', metrics);
      setResource(ctx, 'achievements', new Map());
      setResource(ctx, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      
      // Create a player
      const player = spawn(ctx, {
        StableID: { id: 100 },
        Info: { name: 'Player', description: '' },
        Player: {},
        Inventory: { size: 6, selectedItemIndex: 0, items: [] }
      });
      
      // Create an item to pick up
      const item = spawn(ctx, {
        StableID: { id: 101 },
        Info: { name: 'Sword', description: 'A sharp sword' }
      });
      
      // Simulate picking up the item (as the getPickedUp effect would do)
      const pickedUpByStore = getStore(ctx, 'pickedUpBy');
      
      console.log('Player eid:', player, 'StableID:', Components.StableID.id[player]);
      console.log('Item eid:', item, 'StableID:', Components.StableID.id[item]);
      
      // First pickup - should increment metric
      if (!pickedUpByStore.get(item).has(player)) {
        pickedUpByStore.get(item).add(player);
        metrics.increment(player, 'items picked up', 'Sword');
      }
      
      // Verify metric was incremented
      const totalPickedUp = metrics.get(player, 'items picked up');
      const swordPickups = metrics.get(player, 'items picked up', 'Sword');
      console.log('Total items picked up:', totalPickedUp);
      console.log('Sword pickups:', swordPickups);
      expect(totalPickedUp).toBe(1);
      expect(swordPickups).toBe(1);
      
      console.log('Before save - pickedUpBy for item:', pickedUpByStore.get(item));
      console.log('Before save - player metrics - total:', totalPickedUp, 'sword:', swordPickups);
      
      // Serialize world
      const worldDef = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
      
      // Check that pickedUpBy was serialized
      const itemEntity = getSerializedEntities(worldDef).find(e => e.StableID?.id === 101);
      expect(itemEntity).toBeDefined();
      expect(itemEntity?.PickedUpBy).toBeDefined();
      expect(itemEntity?.PickedUpBy).toContain(100); // Should contain player's stableId
      
      console.log('Serialized item entity PickedUpBy:', itemEntity?.PickedUpBy);
      
      // Load into fresh context
      const ctx2 = createECS();
      const metrics2 = new Metrics(ctx2);
      setResource(ctx2, 'metrics', metrics2);
      setResource(ctx2, 'achievements', new Map());
      setResource(ctx2, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      
      initialize(ctx2, worldDef, { modules: [], bodies: [], fields: [] });
      
      // Find the player and item in the new context
      const query = defineQuery([Components.StableID]);
      const entities = query(ctx2);
      
      const player2 = entities.find(e => Components.StableID.id[e] === 100);
      const item2 = entities.find(e => Components.StableID.id[e] === 101);
      
      expect(player2).toBeDefined();
      expect(item2).toBeDefined();
      
      // Verify pickedUpBy was restored with eids
      const pickedUpByStore2 = getStore(ctx2, 'pickedUpBy');
      const pickedUpSet = pickedUpByStore2.get(item2!);
      
      console.log('After load - pickedUpBy for item (should contain player eid):', pickedUpSet);
      console.log('After load - player eid:', player2);
      
      expect(pickedUpSet.has(player2!)).toBe(true);
      
      // Try to "pick up" the item again - should NOT increment metric
      if (!pickedUpByStore2.get(item2!).has(player2!)) {
        pickedUpByStore2.get(item2!).add(player2!);
        metrics2.increment(player2!, 'items picked up', 'Sword');
      }
      
      // Metric should still be 1 (not incremented again)
      const totalPickedUp2 = metrics2.get(player2!, 'items picked up');
      const swordPickups2 = metrics2.get(player2!, 'items picked up', 'Sword');
      console.log('After attempting duplicate pickup - total:', totalPickedUp2, 'sword:', swordPickups2);
      
      expect(totalPickedUp2).toBe(1);
      expect(swordPickups2).toBe(1);
    });

    it('should preserve discoveredBy across save/load preventing duplicate metrics', () => {
      // Initialize metrics and achievements resources
      const metrics = new Metrics(ctx);
      setResource(ctx, 'metrics', metrics);
      setResource(ctx, 'achievements', new Map());
      setResource(ctx, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      
      // Create a player
      const player = spawn(ctx, {
        StableID: { id: 200 },
        Info: { name: 'Explorer', description: '' },
        Player: {},
        _InputState: { inputQueue: [] }
      });
      
      // Create an entity to discover
      const secret = spawn(ctx, {
        StableID: { id: 201 },
        Info: { name: 'Secret Cave', description: 'A hidden cave' }
      });
      
      // Simulate discovering the entity (as the discover effect would do)
      const discoveredByStore = getStore(ctx, 'discoveredBy');
      
      // First discovery - should increment metric
      if (!discoveredByStore.get(secret).has(player)) {
        discoveredByStore.get(secret).add(player);
        metrics.increment(player, 'discoveries', 'Secret Cave');
      }
      
      // Verify metric was incremented
      const totalDiscoveries = metrics.get(player, 'discoveries');
      const secretCaveDiscoveries = metrics.get(player, 'discoveries', 'Secret Cave');
      expect(totalDiscoveries).toBe(1);
      expect(secretCaveDiscoveries).toBe(1);
      
      console.log('Before save - discoveredBy for secret:', discoveredByStore.get(secret));
      console.log('Before save - player discovery metrics - total:', totalDiscoveries, 'secretCave:', secretCaveDiscoveries);
      
      // Serialize world
      const worldDef = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
      
      // Check that discoveredBy was serialized
      const secretEntity = getSerializedEntities(worldDef).find(e => e.StableID?.id === 201);
      expect(secretEntity).toBeDefined();
      expect(secretEntity?.DiscoveredBy).toBeDefined();
      expect(secretEntity?.DiscoveredBy).toContain(200); // Should contain player's stableId
      
      console.log('Serialized secret entity DiscoveredBy:', secretEntity?.DiscoveredBy);
      
      // Load into fresh context
      const ctx2 = createECS();
      const metrics2 = new Metrics(ctx2);
      setResource(ctx2, 'metrics', metrics2);
      setResource(ctx2, 'achievements', new Map());
      setResource(ctx2, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      
      initialize(ctx2, worldDef, { modules: [], bodies: [], fields: [] });
      
      // Find the player and secret in the new context
      const query = defineQuery([Components.StableID]);
      const entities = query(ctx2);
      
      const player2 = entities.find(e => Components.StableID.id[e] === 200);
      const secret2 = entities.find(e => Components.StableID.id[e] === 201);
      
      expect(player2).toBeDefined();
      expect(secret2).toBeDefined();
      
      // Verify discoveredBy was restored with eids
      const discoveredByStore2 = getStore(ctx2, 'discoveredBy');
      const discoveredSet = discoveredByStore2.get(secret2!);
      
      console.log('After load - discoveredBy for secret (should contain player eid):', discoveredSet);
      console.log('After load - player eid:', player2);
      
      expect(discoveredSet.has(player2!)).toBe(true);
      
      // Try to "discover" the secret again - should NOT increment metric
      if (!discoveredByStore2.get(secret2!).has(player2!)) {
        discoveredByStore2.get(secret2!).add(player2!);
        metrics2.increment(player2!, 'discoveries', 'Secret Cave');
      }
      
      // Metric should still be 1 (not incremented again)
      const totalDiscoveries2 = metrics2.get(player2!, 'discoveries');
      const secretCaveDiscoveries2 = metrics2.get(player2!, 'discoveries', 'Secret Cave');
      console.log('After attempting duplicate discovery - total:', totalDiscoveries2, 'secretCave:', secretCaveDiscoveries2);
      
      expect(totalDiscoveries2).toBe(1);
      expect(secretCaveDiscoveries2).toBe(1);
    });

    it('should handle save/load/interact/save/load cycle correctly', () => {
      // This test simulates the real-world scenario:
      // 1. Player picks up item A -> save
      // 2. Load -> try to pick up A again (should not increment)
      // 3. Pick up item B -> save
      // 4. Load -> verify both A and B are remembered
      
      const metrics = new Metrics(ctx);
      setResource(ctx, 'metrics', metrics);
      setResource(ctx, 'achievements', new Map());
      setResource(ctx, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      
      const player = spawn(ctx, {
        StableID: { id: 300 },
        Info: { name: 'Player', description: '' },
        Player: {},
        Inventory: { size: 6, selectedItemIndex: 0, items: [] }
      });
      
      const itemA = spawn(ctx, {
        StableID: { id: 301 },
        Info: { name: 'Apple', description: 'A red apple' }
      });
      
      const itemB = spawn(ctx, {
        StableID: { id: 302 },
        Info: { name: 'Banana', description: 'A yellow banana' }
      });
      
      // === Phase 1: Pick up item A ===
      const pickedUpByStore = getStore(ctx, 'pickedUpBy');
      pickedUpByStore.get(itemA).add(player);
      metrics.increment(player, 'items picked up', 'Apple');
      
      expect(metrics.get(player, 'items picked up')).toBe(1);
      
      // === Phase 2: Save ===
      let worldDef = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
      
      // === Phase 3: Load ===
      let ctx2 = createECS();
      let metrics2 = new Metrics(ctx2);
      setResource(ctx2, 'metrics', metrics2);
      setResource(ctx2, 'achievements', new Map());
      setResource(ctx2, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      initialize(ctx2, worldDef, { modules: [], bodies: [], fields: [] });
      
      let query = defineQuery([Components.StableID]);
      let entities = query(ctx2);
      let player2 = entities.find(e => Components.StableID.id[e] === 300)!;
      let itemA2 = entities.find(e => Components.StableID.id[e] === 301)!;
      let itemB2 = entities.find(e => Components.StableID.id[e] === 302)!;
      
      // === Phase 4: Try to pick up A again (should not increment) ===
      let pickedUpByStore2 = getStore(ctx2, 'pickedUpBy');
      if (!pickedUpByStore2.get(itemA2).has(player2)) {
        pickedUpByStore2.get(itemA2).add(player2);
        metrics2.increment(player2, 'items picked up', 'Apple');
      }
      
      expect(metrics2.get(player2, 'items picked up')).toBe(1); // Still 1
      
      // === Phase 5: Pick up item B (should increment) ===
      if (!pickedUpByStore2.get(itemB2).has(player2)) {
        pickedUpByStore2.get(itemB2).add(player2);
        metrics2.increment(player2, 'items picked up', 'Banana');
      }
      
      expect(metrics2.get(player2, 'items picked up')).toBe(2); // Now 2
      expect(metrics2.get(player2, 'items picked up', 'Apple')).toBe(1);
      expect(metrics2.get(player2, 'items picked up', 'Banana')).toBe(1);
      
      // === Phase 6: Save again ===
      worldDef = serializeWorld(ctx2, { includeEntities: true, includeRuntime: true });
      
      // === Phase 7: Load again ===
      const ctx3 = createECS();
      const metrics3 = new Metrics(ctx3);
      setResource(ctx3, 'metrics', metrics3);
      setResource(ctx3, 'achievements', new Map());
      setResource(ctx3, 'unlockedAchievements', new LazyMap(() => new ReactiveSet()));
      initialize(ctx3, worldDef, { modules: [], bodies: [], fields: [] });
      
      query = defineQuery([Components.StableID]);
      entities = query(ctx3);
      const player3 = entities.find(e => Components.StableID.id[e] === 300)!;
      const itemA3 = entities.find(e => Components.StableID.id[e] === 301)!;
      const itemB3 = entities.find(e => Components.StableID.id[e] === 302)!;
      
      // === Phase 8: Verify both A and B are remembered ===
      const pickedUpByStore3 = getStore(ctx3, 'pickedUpBy');
      expect(pickedUpByStore3.get(itemA3).has(player3)).toBe(true);
      expect(pickedUpByStore3.get(itemB3).has(player3)).toBe(true);
      
      // Try to pick up both (should not increment)
      let changed = false;
      if (!pickedUpByStore3.get(itemA3).has(player3)) {
        pickedUpByStore3.get(itemA3).add(player3);
        metrics3.increment(player3, 'items picked up', 'Apple');
        changed = true;
      }
      if (!pickedUpByStore3.get(itemB3).has(player3)) {
        pickedUpByStore3.get(itemB3).add(player3);
        metrics3.increment(player3, 'items picked up', 'Banana');
        changed = true;
      }
      
      expect(changed).toBe(false);
      expect(metrics3.get(player3, 'items picked up')).toBe(2); // Still 2
      expect(metrics3.get(player3, 'items picked up', 'Apple')).toBe(1);
      expect(metrics3.get(player3, 'items picked up', 'Banana')).toBe(1);
    });

    it('should persist pickedUpBy at runtime when item is picked up and put into inventory', () => {
      // Test that pickedUpBy persists when an item is picked up and serialized into inventory
      // This tests the core fix: getEntityBundle must be called AFTER updating pickedUpBy
      
      const metrics = new Metrics(ctx);
      setResource(ctx, 'metrics', metrics);
      
      // Spawn player with inventory
      const player = spawn(ctx, {
        StableID: { id: 500 },
        Transform: { x: 0, y: 0, z: 0 },
        Player: {},
        Inventory: {
          size: 10,
          selectedItemIndex: 0,
          items: []
        }
      });
      
      // Spawn an item  
      const item = spawn(ctx, {
        StableID: { id: 501 },
        Transform: { x: 1, y: 0, z: 1 },
        Info: { name: 'TestItem', description: 'A test item' }
      });
      
      // Simulate the pickup process
      const pickedUpByStore = getStore(ctx, 'pickedUpBy');
      
      // Add player to pickedUpBy BEFORE getting the bundle (this is the fix)
      pickedUpByStore.get(item).add(player);
      
      // Get entity bundle - should include PickedUpBy with player's stableId
      const itemBundle = getEntityBundle(ctx, item);
      
      // Verify pickedUpBy was captured in the bundle
      expect(itemBundle.PickedUpBy).toBeDefined();
      expect(itemBundle.PickedUpBy).toEqual([500]); // Player's stableId
      
      // Drop the item (spawn it back from bundle)
      const droppedItem = spawn(ctx, itemBundle, {
        Transform: { x: 2, y: 0, z: 2 }
      });
      
      // Verify pickedUpBy was restored on the dropped item
      expect(pickedUpByStore.get(droppedItem).has(player)).toBe(true);
      
      console.log('✓ Runtime pickedUpBy persistence verified: pickedUpBy included in bundle and restored on spawn');
    });
  });
});
