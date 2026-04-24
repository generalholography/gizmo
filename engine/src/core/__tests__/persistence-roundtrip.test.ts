/**
 * Persistence Round-Trip Tests
 * 
 * These tests validate the complete save/load pipeline without touching cloud storage.
 * They ensure that WorldDefinition → Upload Transform → Load Transform → WorldDefinition
 * preserves all data correctly.
 * 
 * This is a critical test suite that must pass to ensure data integrity through
 * the persistence pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { spawn } from '../spawn';
import { serializeWorld } from '../serializeWorld';
import { registerArchetype } from '../../modules/archetype';
import type { WorldDefinition } from '../worldSchema';
import * as Components from '../components';

function createTestContext(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    three: {} as any,
    rapier: {} as any,
    input: {} as any,
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    time: new Timer()
  });
  
  // Add required modules
  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));
  
  // Mock body module
  class MockBodyModule extends Module<any, any> {
    private mockRegistry: Record<number, any> = {};
    private mockDefinitions: Record<number, any> = {};
    private runtimeDefs: any[] = [];
    
    constructor(ctx: any) {
      super(ctx, {});
    }
    
    resolve(def: any): number {
      const str = JSON.stringify(def);
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      const id = hash >>> 0;
      this.mockRegistry[id] = { parts: [{ type: 'box', size: [1, 1, 1] }] };
      this.mockDefinitions[id] = def;
      this.runtimeDefs.push({ name: `body_${id}`, definition: def });
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id] || { parts: [] };
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }

    serializeDefinition(id: number, options: { useDelta?: boolean } = {}): any {
      return this.mockDefinitions[id];
    }
    
    getRuntimeDefinitions(): any[] {
      return this.runtimeDefs;
    }
  }
  world.modules.set('body', new MockBodyModule(world));
  
  // Mock motionSource module
  class MockMotionSourceModule extends Module<any, any> {
    private mockRegistry: Record<number, any> = {};
    private mockDefinitions: Record<number, any> = {};
    private runtimeDefs: any[] = [];
    
    constructor(ctx: any) {
      super(ctx, {});
    }
    
    resolve(def: any): number {
      const str = JSON.stringify(def);
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      const id = hash >>> 0;
      this.mockRegistry[id] = def;
      this.mockDefinitions[id] = def;
      this.runtimeDefs.push({ name: `motionSource_${id}`, definition: def });
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id];
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }

    serializeDefinition(id: number, options: { useDelta?: boolean } = {}): any {
      return this.mockDefinitions[id];
    }
    
    getRuntimeDefinitions(): any[] {
      return this.runtimeDefs;
    }
  }
  world.modules.set('motionSource', new MockMotionSourceModule(world));
  
  // Mock entityStore module
  class MockInventoryStore extends Map {
    serialize(eid: number) {
      return this.get(eid);
    }
  }
  
  class MockEntityStoreModule extends Module<any, any> {
    private stores: Map<string, any> = new Map();
    
    constructor(ctx: any) {
      super(ctx, {});
      // Pre-create inventory store
      this.stores.set('inventory', new MockInventoryStore());
    }
    
    getStore<T>(name: string): T {
      if (!this.stores.has(name)) {
        this.stores.set(name, new Map());
      }
      return this.stores.get(name) as T;
    }
  }
  world.modules.set('entityStore', new MockEntityStoreModule(world));
  
  // Initialize required resources
  world.resources.set('nextStableId', { resource: 1 });
  
  return world;
}

/**
 * Simulates the upload transformation applied in Cloud Function
 * Extracts entities and returns WorldDefinition without entities
 */
function simulateUploadTransform(worldDef: WorldDefinition): {
  worldDefWithoutEntities: WorldDefinition;
  entities: any[];
} {
  // Extract all entities from dimensions/chunks and dedupe with legacy top-level entities.
  const deduped = new Set<string>();
  const entities: any[] = [];
  const addEntity = (entity: any) => {
    const key = JSON.stringify(entity);
    if (deduped.has(key)) return;
    deduped.add(key);
    entities.push(entity);
  };

  if (worldDef.dimensions) {
    for (const dim of worldDef.dimensions) {
      if (dim.chunks) {
        for (const chunk of dim.chunks) {
          if (chunk.entities) {
            for (const entity of chunk.entities) addEntity(entity);
          }
        }
      }
    }
  }
  
  // Also check legacy top-level entities
  if (Array.isArray((worldDef as any).entities)) {
    for (const entity of (worldDef as any).entities) addEntity(entity);
  }
  
  // Create WorldDefinition without entities (what gets saved to world.json)
  const worldDefWithoutEntities = {
    ...worldDef,
    dimensions: worldDef.dimensions?.map(dim => ({
      ...dim,
      chunks: [] // Remove entity data, keep all other dimension properties
    }))
  };
  
  // Remove legacy entities field if present
  delete (worldDefWithoutEntities as any).entities;
  
  return { worldDefWithoutEntities, entities };
}

/**
 * Simulates the load transformation applied on client
 * Merges chunk entities back into WorldDefinition
 */
function simulateLoadTransform(worldDef: WorldDefinition, entities: any[]): WorldDefinition {
  const loaded = {
    ...worldDef,
    dimensions: worldDef.dimensions?.map((dim, i) => ({
      ...dim,
      chunks: i === 0 ? [{
        chunkId: '0_0_0',
        bounds: null,
        entities,
        entityCount: entities.length,
        version: 1,
        updatedAt: Date.now()
      }] : []
    }))
  };
  
  return loaded;
}

describe('Persistence Round-Trip - Core Pipeline', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('preserves complete world state through save/load cycle', () => {
    // Setup: Create world with metadata
    ctx.resources.set('metadata', {
      resource: {
        title: 'Test World',
        description: 'A world for testing persistence',
        tags: ['test', 'roundtrip'],
        brandColors: ['#FF0000', '#00FF00'],
        dimensions: [{
          name: 'testDim',
          gravity: -12.0,
          useDayNightCycle: true,
          sky: {
            color: '#123456',
            sun: {
              color: '#FFFFFF',
              intensity: 1.5,
              timeOfDay: 800
            }
          },
          chunks: []
        }]
      }
    });
    
    // Add some entities
    registerArchetype(ctx, 'testEntity', {
      Info: { name: 'Test Entity' },
      Health: { value: 50, maxValue: 100 }
    });
    
    const eid1 = spawn(ctx, 'testEntity');
    const eid2 = spawn(ctx, {
      Info: { name: 'Custom Entity' },
      Transform: { x: 10, y: 5, z: 3 }
    });
    
    // Step 1: Serialize world
    const original = serializeWorld(ctx, {
      includeEntities: true,
      includeRuntime: false, // Don't include runtime-only data to simplify test
    });
    
    expect(original.dimensions).toBeDefined();
    expect(original.dimensions!.length).toBeGreaterThan(0);
    expect(original.dimensions![0].chunks).toBeDefined();
    expect(original.dimensions![0].chunks!.length).toBeGreaterThan(0);
    const originalEntityCount = original.dimensions![0].chunks![0].entities.length;
    expect(originalEntityCount).toBe(2);
    
    // Step 2: Apply upload transformation
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    
    // Verify upload transform
    expect(worldDefWithoutEntities.dimensions).toBeDefined();
    expect(worldDefWithoutEntities.dimensions![0].chunks).toEqual([]);
    expect(entities.length).toBe(2);
    
    // Verify metadata preserved
    expect(worldDefWithoutEntities.title).toBe('Test World');
    expect(worldDefWithoutEntities.description).toBe('A world for testing persistence');
    expect(worldDefWithoutEntities.tags).toEqual(['test', 'roundtrip']);
    expect(worldDefWithoutEntities.brandColors).toEqual(['#FF0000', '#00FF00']);
    
    // Verify dimension data preserved
    expect(worldDefWithoutEntities.dimensions![0].name).toBe('testDim');
    expect(worldDefWithoutEntities.dimensions![0].gravity).toBe(-12.0);
    expect(worldDefWithoutEntities.dimensions![0].useDayNightCycle).toBe(true);
    expect(worldDefWithoutEntities.dimensions![0].sky).toBeDefined();
    expect(worldDefWithoutEntities.dimensions![0].sky!.color).toBe('#123456');
    
    // Step 3: Apply load transformation
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    // Verify complete round-trip
    expect(loaded.title).toBe(original.title);
    expect(loaded.description).toBe(original.description);
    expect(loaded.tags).toEqual(original.tags);
    expect(loaded.brandColors).toEqual(original.brandColors);
    
    // Verify dimensions match
    expect(loaded.dimensions).toBeDefined();
    expect(loaded.dimensions!.length).toBe(original.dimensions!.length);
    expect(loaded.dimensions![0].name).toBe(original.dimensions![0].name);
    expect(loaded.dimensions![0].gravity).toBe(original.dimensions![0].gravity);
    expect(loaded.dimensions![0].useDayNightCycle).toBe(original.dimensions![0].useDayNightCycle);
    
    // Verify sky properties
    expect(loaded.dimensions![0].sky).toBeDefined();
    expect(loaded.dimensions![0].sky!.color).toBe(original.dimensions![0].sky!.color);
    expect(loaded.dimensions![0].sky!.sun).toBeDefined();
    expect(loaded.dimensions![0].sky!.sun!.timeOfDay).toBe(original.dimensions![0].sky!.sun!.timeOfDay);
    
    // Verify entities restored
    expect(loaded.dimensions![0].chunks![0].entities.length).toBe(originalEntityCount);
  });

  it('handles worlds without entities', () => {
    ctx.resources.set('metadata', {
      resource: {
        title: 'Empty World',
        dimensions: [{
          name: 'empty',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: { color: '#87CEEB' },
          chunks: []
        }]
      }
    });
    
    const original = serializeWorld(ctx, {
      includeEntities: true,
      includeRuntime: false
    });
    
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    expect(loaded.title).toBe('Empty World');
    expect(loaded.dimensions![0].chunks![0].entities).toEqual([]);
    expect(loaded.dimensions![0].chunks![0].entityCount).toBe(0);
  });

  it('preserves module instances through round-trip', () => {
    // Spawn entity with body component (triggers body module registration)
    const eid = spawn(ctx, {
      Info: { name: 'Entity with Body' },
      Body: { type: 'composite', params: { parts: [{ type: 'box', size: [2, 2, 2] }] } }
    });
    
    const original = serializeWorld(ctx, {
      includeEntities: true,
      includeRuntime: false
    });
    
    // Verify modules are serialized
    expect(original.modules).toBeDefined();
    expect(original.modules!.body).toBeDefined();
    expect(original.modules!.body!.length).toBeGreaterThan(0);
    
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    
    // Modules should be preserved in world definition
    expect(worldDefWithoutEntities.modules).toBeDefined();
    expect(worldDefWithoutEntities.modules!.body).toBeDefined();
    expect(worldDefWithoutEntities.modules!.body!.length).toBe(original.modules!.body!.length);
    
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    // Verify modules fully preserved
    expect(loaded.modules).toBeDefined();
    expect(loaded.modules!.body).toBeDefined();
    expect(loaded.modules!.body!.length).toBe(original.modules!.body!.length);
  });

  it('maintains dimension properties accurately', () => {
    ctx.resources.set('metadata', {
      resource: {
        dimensions: [{
          name: 'custom',
          gravity: -15.5,
          useDayNightCycle: true,
          sky: {
            color: '#FF00FF',
            sun: {
              color: '#FFFF00',
              intensity: 2.0,
              timeOfDay: 1400
            },
            clouds: {
              color: '#FFFFFF',
              coverage: 0.8
            },
            stars: {
              intensity: 0.5
            }
          },
          chunks: []
        }]
      }
    });
    
    const original = serializeWorld(ctx, { includeEntities: false });
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    const origDim = original.dimensions![0];
    const loadedDim = loaded.dimensions![0];
    
    // Verify all dimension properties
    expect(loadedDim.name).toBe(origDim.name);
    expect(loadedDim.gravity).toBe(origDim.gravity);
    expect(loadedDim.useDayNightCycle).toBe(origDim.useDayNightCycle);
    
    // Verify sky properties
    expect(loadedDim.sky!.color).toBe(origDim.sky!.color);
    expect(loadedDim.sky!.sun!.color).toBe(origDim.sky!.sun!.color);
    expect(loadedDim.sky!.sun!.intensity).toBe(origDim.sky!.sun!.intensity);
    expect(loadedDim.sky!.sun!.timeOfDay).toBe(origDim.sky!.sun!.timeOfDay);
    expect(loadedDim.sky!.clouds!.color).toBe(origDim.sky!.clouds!.color);
    expect(loadedDim.sky!.clouds!.coverage).toBe(origDim.sky!.clouds!.coverage);
    expect(loadedDim.sky!.stars!.intensity).toBe(origDim.sky!.stars!.intensity);
  });

  it('handles multiple dimensions correctly', () => {
    ctx.resources.set('metadata', {
      resource: {
        dimensions: [
          {
            name: 'overworld',
            gravity: -9.81,
            useDayNightCycle: true,
            sky: { color: '#87CEEB' },
            chunks: []
          },
          {
            name: 'nether',
            gravity: -8.0,
            useDayNightCycle: false,
            sky: { color: '#330000' },
            chunks: []
          }
        ]
      }
    });
    
    const original = serializeWorld(ctx, { includeEntities: false });
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    expect(loaded.dimensions!.length).toBe(2);
    expect(loaded.dimensions![0].name).toBe('overworld');
    expect(loaded.dimensions![1].name).toBe('nether');
    expect(loaded.dimensions![0].gravity).toBe(-9.81);
    expect(loaded.dimensions![1].gravity).toBe(-8.0);
  });
});

describe('Persistence Round-Trip - Data Integrity', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('preserves timestamps and version info', () => {
    const now = Date.now();
    const createdTime = now - 10000;
    
    ctx.resources.set('metadata', {
      resource: {
        dimensions: [{
          name: 'test',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: { color: '#87CEEB' },
          chunks: []
        }]
      }
    });
    
    const original = serializeWorld(ctx, { includeRuntime: true });
    
    // Manually set timestamps to test preservation
    original.createdAt = createdTime;
    original.engineVersion = '0.3.0';
    
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    expect(loaded.createdAt).toBe(createdTime);
    expect(loaded.engineVersion).toBe('0.3.0');
    expect(loaded.updatedAt).toBeDefined();
  });

  it('preserves activeDimension setting', () => {
    ctx.resources.set('metadata', {
      resource: {
        dimensions: [
          { name: 'dim1', gravity: -9.81, useDayNightCycle: false, sky: { color: '#87CEEB' }, chunks: [] },
          { name: 'dim2', gravity: -9.81, useDayNightCycle: false, sky: { color: '#87CEEB' }, chunks: [] }
        ]
      }
    });
    
    const original = serializeWorld(ctx, { includeRuntime: true });
    
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    expect(loaded.activeDimension).toBe(original.activeDimension);
  });

  it('handles empty modules object correctly', () => {
    const original = serializeWorld(ctx, { includeEntities: false });
    
    // serializeWorld may omit modules if empty
    const { worldDefWithoutEntities, entities } = simulateUploadTransform(original);
    const loaded = simulateLoadTransform(worldDefWithoutEntities, entities);
    
    // Should handle gracefully whether modules is {} or undefined
    if (original.modules) {
      expect(loaded.modules).toBeDefined();
    }
  });
});
