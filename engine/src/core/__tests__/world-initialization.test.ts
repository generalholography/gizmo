import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, hasComponent } from 'bitecs';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { initialize, createWorldDefinition } from '../initializeWorld';
import { serializeWorld } from '../serializeWorld';
import { WorldDefinition } from '../worldSchema';
import { ReactiveMap } from '../../utils/reactiveTypes';
import { WorldMetadata } from '../schema';
import { Achievement } from '../achievements';
import { conditionModule } from '../../modules/condition';
import { entityStoreModule, UnlockedAchievementsStore, MetricsStore } from '../../modules/entityStore';
import { spawn } from '../spawn';
import { despawn } from '../despawn';
import { bodyModule } from '../../modules/body';
import { fieldModule } from '../../modules/field';
import { materialModule } from '../../modules/material';
import { meshModule } from '../../modules/mesh';
import { groupOperationModule } from '../../modules/groupOperation';
import { getDimensionTerrainEntityIds } from '../dimensionTerrain';
import { colliderModule } from '../../modules/collider';
import { constraintsModule } from '../../modules/spawner/constraints';
import { placementModule } from '../../modules/spawner/placement';
import { selectionModule } from '../../modules/spawner/selection';
import { spawnerModule, SpawnerModule } from '../../modules/spawner';
import { upsertRuntimeModuleInstance } from '../runtimeModuleTypes';
import { Body, SpawnerOwned, StableID, Transform } from '../components';

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
  
  // Mock motionSource module
  class MockMotionSourceModule extends Module<any, any> {
    private mockRegistry: Record<number, any> = {};
    private mockDefinitions: Record<number, any> = {};
    
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
      this.mockRegistry[id] = { bodyType: "static" };
      this.mockDefinitions[id] = def;
      return id;
    }
    
    get(id: number): any {
      return this.mockRegistry[id] || { bodyType: "static" };
    }
    
    getDefinition(id: number): any {
      return this.mockDefinitions[id];
    }
  }
  world.modules.set('motionSource', new MockMotionSourceModule(world));
  world.modules.set('field', fieldModule(world));
  world.modules.set('material', materialModule(world));
  world.modules.set('mesh', meshModule(world));
  world.modules.set('groupOperation', groupOperationModule(world));
  world.modules.set('collider', colliderModule(world));
  world.modules.set('body', bodyModule(world));
  world.modules.set('placement', placementModule(world));
  world.modules.set('selection', selectionModule(world));
  world.modules.set('constraints', constraintsModule(world));
  world.modules.set('spawner', spawnerModule(world));
  
  // Add condition module for achievements/rules/triggers
  world.modules.set('condition', conditionModule(world));
  
  // Add entity store module
  world.modules.set('entityStore', entityStoreModule(world));
  
  // Initialize required resources
  world.resources.set('nextStableId', { resource: 1 });
  world.resources.set('metadata', { 
    resource: {
      title: 'Default World',
      description: 'Default description',
      tags: [],
      brandColors: ['#87ceeb', '#fffacd'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: 0x87CEEB },
        chunks: []
      }]
    } as WorldMetadata
  });
  world.resources.set('achievements', { resource: new ReactiveMap<Achievement>() });
  world.resources.set('timeOfDay', { resource: 1200 });
  
  return world;
}

describe('World Initialization', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('initializes world with basic metadata', () => {
    const definition: WorldDefinition = {
      title: 'Test World',
      description: 'A test world',
      tags: ['test', 'demo'],
      brandColors: ['#ff0000', '#00ff00']
    };

    initialize(ctx, definition);

    const metadata = (ctx.resources.get('metadata')!.resource as any) as WorldMetadata;
    expect(metadata.title).toBe('Test World');
    expect(metadata.description).toBe('A test world');
    expect(metadata.tags).toContain('test');
    expect(metadata.brandColors).toContain('#ff0000');
  });

  it('spawns dimension terrain from dimension metadata', () => {
    const definition: WorldDefinition = {
      title: 'Terrain World',
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#87ceeb' },
        terrain: {
          heightField: { type: 'simplex', params: { seed: 7, amplitude: 4, frequency: 0.7, octaves: 2 } },
          size: 80,
          resolution: 16,
          heightOffset: 0.25,
        },
        chunks: [],
      }],
    };

    initialize(ctx, definition);

    const terrainEntities = getDimensionTerrainEntityIds(ctx);
    expect(terrainEntities).toHaveLength(1);

    const metadata = ctx.resources.get('metadata')?.resource as WorldMetadata;
    expect(metadata.dimensions[0].terrain?.heightField).toBe('base.terrainHeight');
  });

  it('assigns generated terrain stable IDs after declared entity stable IDs', () => {
    initialize(ctx, {
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#87ceeb' },
        terrain: {
          heightField: 'terrainHeight',
          size: 60,
          resolution: 16,
        },
        chunks: [{
          chunkId: 'main',
          bounds: null,
          entities: [{
            StableID: { id: 41 },
            Info: { name: 'Declared Entity' },
            Transform: {},
          }],
          entityCount: 1,
          version: 1,
          updatedAt: 0,
        }],
      }],
      modules: {
        field: [{
          name: 'terrainHeight',
          definition: { type: 'simplex', params: { seed: 1, amplitude: 3 } },
        }],
      },
    });

    const [terrainEid] = getDimensionTerrainEntityIds(ctx);
    expect(StableID.id[terrainEid]).toBe(42);
  });

  it('serializes dimension terrain as metadata instead of a generated entity', () => {
    initialize(ctx, {
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#87ceeb' },
        terrain: {
          heightField: 'terrainHeight',
          size: 60,
          resolution: 16,
        },
        chunks: [],
      }],
      modules: {
        field: [{
          name: 'terrainHeight',
          definition: { type: 'simplex', params: { seed: 1, amplitude: 3 } },
        }],
      },
    });

    const serialized = serializeWorld(ctx, { includeEntities: true, includeRuntime: false });
    expect(serialized.dimensions?.[0]?.terrain?.heightField).toBe('terrainHeight');
    expect(getSerializedEntities(serialized)).toHaveLength(0);
  });

  it('rebuilds dimension terrain geometry when a referenced height field changes', () => {
    initialize(ctx, {
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#87ceeb' },
        terrain: {
          heightField: 'terrainHeight',
          size: 80,
          resolution: 16,
        },
        chunks: [],
      }],
      modules: {
        field: [{
          name: 'terrainHeight',
          definition: { type: 'simplex', params: { seed: 9, frequency: 0.8, amplitude: 1, octaves: 2 } },
        }],
      },
    });

    const bodyMod = ctx.modules.get('body') as any;
    const [initialTerrainEid] = getDimensionTerrainEntityIds(ctx);
    const initialBodyId = Body.bodyId[initialTerrainEid];
    const initialBounds = bodyMod.get(initialBodyId).localBounds;
    const initialHeight = initialBounds.max.y - initialBounds.min.y;

    upsertRuntimeModuleInstance(ctx, 'field', 'terrainHeight', {
      type: 'simplex',
      params: { seed: 9, frequency: 0.8, amplitude: 8, octaves: 2 },
    });

    const [updatedTerrainEid] = getDimensionTerrainEntityIds(ctx);
    const updatedBodyId = Body.bodyId[updatedTerrainEid];
    const updatedBounds = bodyMod.get(updatedBodyId).localBounds;
    const updatedHeight = updatedBounds.max.y - updatedBounds.min.y;

    expect(updatedTerrainEid).not.toBe(initialTerrainEid);
    expect(updatedBodyId).not.toBe(initialBodyId);
    expect(updatedHeight).toBeGreaterThan(initialHeight * 3);
  });

  it('regenerates terrain-based spawner outputs when a referenced height field changes', () => {
    initialize(ctx, {
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#87ceeb' },
        terrain: {
          heightField: 'terrainHeight',
          size: 80,
          resolution: 16,
        },
        chunks: [],
      }],
      modules: {
        field: [{
          name: 'terrainHeight',
          definition: { type: 'simplex', params: { seed: 4, frequency: 1, amplitude: 1 } },
        }],
      },
      spawners: [{
        type: 'composite',
        params: {
          name: 'terrain-markers',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [-12, 12], z: [-12, 12] },
              spacing: 12,
            },
          },
          selection: {
            type: 'single',
            params: {
              entity: {
                Info: { name: 'Terrain Marker' },
                Transform: {},
                Body: {
                  type: 'composite',
                  params: {
                    parts: [{
                      geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                      material: { type: 'solid', params: { color: '#ff0000' } },
                    }],
                  },
                },
              },
            },
          },
          heightField: 'terrainHeight',
          terrainSize: 80,
        },
      }],
    });

    const spawner = ctx.modules.get('spawner') as SpawnerModule;
    const initialResult = spawner.getResult('terrain-markers')!;
    const initialEntityIds = [...initialResult.entityIds];
    const initialYs = initialEntityIds.map((eid) => Transform.y[eid]);

    upsertRuntimeModuleInstance(ctx, 'field', 'terrainHeight', {
      type: 'simplex',
      params: { seed: 4, frequency: 1, amplitude: 8 },
    });

    const updatedResult = spawner.getResult('terrain-markers')!;
    const updatedEntityIds = [...updatedResult.entityIds];
    const updatedYs = updatedEntityIds.map((eid) => Transform.y[eid]);

    expect(updatedEntityIds).toHaveLength(initialEntityIds.length);
    expect(updatedEntityIds).not.toEqual(initialEntityIds);
    for (const eid of updatedEntityIds) {
      expect(hasComponent(ctx, SpawnerOwned, eid)).toBe(true);
    }
    expect(Math.max(...updatedYs.map((y, index) => Math.abs(y - initialYs[index])))).toBeGreaterThan(0.5);
  });

  it('serializes spawner-owned outputs as generated and recreates them on load', () => {
    const definition: WorldDefinition = {
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#87ceeb' },
        terrain: {
          heightField: 'terrainHeight',
          size: 80,
          resolution: 16,
        },
        chunks: [],
      }],
      modules: {
        field: [{
          name: 'terrainHeight',
          definition: { type: 'simplex', params: { seed: 4, frequency: 1, amplitude: 1 } },
        }],
        spawner: [{
          name: 'terrain-markers',
          definition: {
            type: 'composite',
            params: {
              name: 'terrain-markers',
              placement: {
                type: 'grid',
                params: { bounds: { x: [-12, 12], z: [-12, 12] }, spacing: 12 },
              },
              selection: {
                type: 'single',
                params: { entity: { Info: { name: 'Terrain Marker' }, Transform: {} } },
              },
              heightField: 'terrainHeight',
              terrainSize: 80,
            },
          },
        }],
      },
    };

    initialize(ctx, definition);
    const spawner = ctx.modules.get('spawner') as SpawnerModule;
    const initialResult = spawner.getResult('terrain-markers')!;
    expect(initialResult.entityIds.length).toBeGreaterThan(0);
    expect(hasComponent(ctx, SpawnerOwned, initialResult.entityIds[0])).toBe(true);

    const serialized = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
    expect(getSerializedEntities(serialized)).toHaveLength(0);
    expect((serialized.modules?.spawner?.[0] as any).isExecuted).toBeUndefined();

    const reloaded = createTestContext();
    initialize(reloaded, serialized);
    const reloadedSpawner = reloaded.modules.get('spawner') as SpawnerModule;
    const reloadedResult = reloadedSpawner.getResult('terrain-markers')!;
    expect(reloadedResult.entityIds).toHaveLength(initialResult.entityIds.length);
    expect(hasComponent(reloaded, SpawnerOwned, reloadedResult.entityIds[0])).toBe(true);
  });

  it('upserts spawner definitions by replacing previous owned outputs', () => {
    initialize(ctx, {
      modules: {
        spawner: [{
          name: 'markers',
          definition: {
            type: 'composite',
            params: {
              name: 'markers',
              placement: {
                type: 'grid',
                params: { bounds: { x: [-12, 12], z: [-12, 12] }, spacing: 12 },
              },
              selection: {
                type: 'single',
                params: { entity: { Info: { name: 'Marker' }, Transform: {} } },
              },
            },
          },
        }],
      },
    });

    const spawner = ctx.modules.get('spawner') as SpawnerModule;
    const initialIds = [...spawner.getResult('markers')!.entityIds];

    upsertRuntimeModuleInstance(ctx, 'spawner', 'markers', {
      type: 'composite',
      params: {
        name: 'markers',
        placement: {
          type: 'grid',
          params: { bounds: { x: [-12, 12], z: [-12, 12] }, spacing: 24 },
        },
        selection: {
          type: 'single',
          params: { entity: { Info: { name: 'Marker' }, Transform: {} } },
        },
      },
    });

    const updatedIds = [...spawner.getResult('markers')!.entityIds];
    expect(updatedIds.length).toBeLessThan(initialIds.length);
    expect(updatedIds.every((eid) => hasComponent(ctx, SpawnerOwned, eid))).toBe(true);
    expect(initialIds.some((eid) => hasComponent(ctx, Transform, eid))).toBe(false);
  });

  it('initializes world with dimensions', () => {
    const definition: WorldDefinition = {
      title: 'Dimension Test',
      dimensions: [{
        name: 'custom',
        gravity: -20,
        useDayNightCycle: true,
        sky: {
          color: '#ff0000',
          sun: {
            color: '#ffff00',
            intensity: 2.0,
            timeOfDay: 1800
          }
        }
      }]
    };

    initialize(ctx, definition);

    const metadata = ctx.resources.get('metadata')!.resource as WorldMetadata;
    expect(metadata.dimensions).toHaveLength(1);
    expect(metadata.dimensions[0].name).toBe('custom');
    expect(metadata.dimensions[0].gravity).toBe(-20);
    expect(metadata.dimensions[0].useDayNightCycle).toBe(true);
  });

  it('initializes world with achievements (array format)', () => {
    const definition: WorldDefinition = {
      achievements: [
        {
          name: 'First Achievement',
          description: 'Complete first task',
          condition: {
            type: 'greaterThanOrEqual',
            params: { metric: 'tasks', targetValue: 1 }
          }
        },
        {
          name: 'Second Achievement',
          description: 'Complete ten tasks',
          condition: {
            type: 'greaterThanOrEqual',
            params: { metric: 'tasks', targetValue: 10 }
          }
        }
      ]
    };

    initialize(ctx, definition);

    const achievements = ctx.resources.get('achievements')!.resource as ReactiveMap<Achievement>;
    expect(achievements.size).toBe(2);
    expect(achievements.has('First Achievement')).toBe(true);
    expect(achievements.get('First Achievement')?.description).toBe('Complete first task');
  });

  it('initializes world with runtime timeOfDay', () => {
    const definition: WorldDefinition = {
      title: 'Time Test',
      timeOfDay: 1800
    };

    initialize(ctx, definition);

    const timeOfDay = ctx.resources.get('timeOfDay')!.resource;
    expect(timeOfDay).toBe(1800);
  });

  it('merges metadata when merge option is true', () => {
    const definition: WorldDefinition = {
      title: 'Updated World',
      tags: ['new-tag']
    };

    initialize(ctx, definition, { merge: true });

    const metadata = ctx.resources.get('metadata')!.resource as WorldMetadata;
    expect(metadata.title).toBe('Updated World');
    expect(metadata.description).toBe('Default description');
  });

  it('replaces metadata when merge option is false', () => {
    const definition: WorldDefinition = {
      title: 'New World'
    };

    initialize(ctx, definition, { merge: false });

    const metadata = ctx.resources.get('metadata')!.resource as WorldMetadata;
    expect(metadata.title).toBe('New World');
    expect(metadata.description).toBe('');
  });

  it('uses createWorldDefinition helper for defaults', () => {
    const definition = createWorldDefinition({
      title: 'My World'
    });

    expect(definition.title).toBe('My World');
    expect(definition.description).toBe('');
    expect(definition.achievements).toBeDefined();
    expect(definition.dimensions).toBeDefined();
    expect(definition.dimensions?.[0]?.chunks?.[0]?.entities).toBeDefined();
  });
});

describe('Entity-Level Metrics and Achievements Serialization', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('serializes and restores metrics per entity', () => {
    const entityStoreModule = ctx.modules.get('entityStore') as any;
    const metricsStore = entityStoreModule.getStore('metrics') as MetricsStore;

    const eid = spawn(ctx, {
      Info: { name: 'Test Entity' }
    });

    metricsStore.set(eid, {
      'score': { __value: 100 },
      'kills': { __value: 5, 'Zombie': 3, 'Skeleton': 2 }
    });

    const bundle = despawn(ctx, eid);

    expect(bundle.Metrics).toBeDefined();
    expect(bundle.Metrics.score.__value).toBe(100);
    expect(bundle.Metrics.kills.__value).toBe(5);
    expect(bundle.Metrics.kills.Zombie).toBe(3);

    const newEid = spawn(ctx, bundle);

    const restoredMetrics = metricsStore.get(newEid);
    expect(restoredMetrics).toBeDefined();
    expect(restoredMetrics!['score'].__value).toBe(100);
    expect(restoredMetrics!['kills'].__value).toBe(5);
    expect(restoredMetrics!['kills']['Zombie']).toBe(3);
  });

  it('serializes and restores unlocked achievements per entity', () => {
    const entityStoreModule = ctx.modules.get('entityStore') as any;
    const achievementsStore = entityStoreModule.getStore('unlockedAchievements') as UnlockedAchievementsStore;

    const eid = spawn(ctx, {
      Info: { name: 'Test Player' }
    });

    achievementsStore.get(eid).add('First Kill');
    achievementsStore.get(eid).add('Ten Kills');
    achievementsStore.get(eid).add('Hundred Kills');

    const bundle = despawn(ctx, eid);

    expect(bundle.UnlockedAchievements).toBeDefined();
    expect(Array.isArray(bundle.UnlockedAchievements)).toBe(true);
    expect(bundle.UnlockedAchievements).toContain('First Kill');
    expect(bundle.UnlockedAchievements).toContain('Ten Kills');
    expect(bundle.UnlockedAchievements).toContain('Hundred Kills');

    const newEid = spawn(ctx, bundle);

    const restoredAchievements = achievementsStore.get(newEid);
    expect(restoredAchievements).toBeDefined();
    expect(restoredAchievements.has('First Kill')).toBe(true);
    expect(restoredAchievements.has('Ten Kills')).toBe(true);
    expect(restoredAchievements.has('Hundred Kills')).toBe(true);
  });

  it('handles empty metrics gracefully', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Test Entity' }
    });

    const bundle = despawn(ctx, eid);

    expect(bundle.Metrics).toBeUndefined();
  });

  it('handles empty achievements gracefully', () => {
    const eid = spawn(ctx, {
      Info: { name: 'Test Entity' }
    });

    const bundle = despawn(ctx, eid);

    expect(bundle.UnlockedAchievements).toBeUndefined();
  });
});

describe('World Serialization', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('serializes world metadata', () => {
    const definition: WorldDefinition = {
      title: 'Serialization Test',
      description: 'Testing serialization',
      tags: ['test']
    };

    initialize(ctx, definition);
    const serialized = serializeWorld(ctx);

    expect(serialized.title).toBe('Serialization Test');
    expect(serialized.description).toBe('Testing serialization');
    expect(serialized.tags).toContain('test');
  });

  it('serializes dimensions', () => {
    const definition: WorldDefinition = {
      title: 'Dimension Serialize',
      dimensions: [{
        name: 'test_dimension',
        gravity: -15,
        useDayNightCycle: true,
        sky: { color: '#0000ff' }
      }]
    };

    initialize(ctx, definition);
    const serialized = serializeWorld(ctx);

    expect(serialized.dimensions).toBeDefined();
    expect(serialized.dimensions![0].name).toBe('test_dimension');
    expect(serialized.dimensions![0].gravity).toBe(-15);
  });

  it('serializes achievements as array', () => {
    const definition: WorldDefinition = {
      achievements: [{
        name: 'Test Achievement',
        description: 'Test description',
        condition: {
          type: 'greaterThanOrEqual',
          params: { metric: 'score', targetValue: 100 }
        }
      }]
    };

    initialize(ctx, definition);
    const serialized = serializeWorld(ctx);

    expect(serialized.achievements).toBeDefined();
    expect(Array.isArray(serialized.achievements)).toBe(true);
    expect(serialized.achievements!.length).toBe(1);
    expect(serialized.achievements![0].name).toBe('Test Achievement');
    expect(serialized.achievements![0].description).toBe('Test description');
  });

  it('serializes runtime values without entityStores', () => {
    ctx.resources.set('timeOfDay', { resource: 1830 });

    const serialized = serializeWorld(ctx, { includeRuntime: true });

    expect(serialized.timeOfDay).toBe(1830);
    expect(serialized.serializedAt).toBeDefined();
    expect(serialized.engineVersion).toBeDefined();
  });

  it('excludes runtime values when option is false', () => {
    const serialized = serializeWorld(ctx, { includeRuntime: false });
    expect(serialized.timeOfDay).toBeUndefined();
    expect(serialized.serializedAt).toBeUndefined();
  });

  it('full round-trip with entities containing metrics and achievements', () => {
    const entityStoreModule = ctx.modules.get('entityStore') as any;
    const metricsStore = entityStoreModule.getStore('metrics') as MetricsStore;
    const achievementsStore = entityStoreModule.getStore('unlockedAchievements') as UnlockedAchievementsStore;

    const definition: WorldDefinition = {
      title: 'Round Trip Test',
      achievements: [{
        name: 'Achievement 1',
        description: 'First achievement',
        condition: { type: 'greaterThanOrEqual', params: { metric: 'score', targetValue: 10 } }
      }],
      timeOfDay: 1500
    };

    initialize(ctx, definition);

    const eid = spawn(ctx, {
      Info: { name: 'Test Player' }
    });

    metricsStore.set(eid, { 'score': { __value: 25 } });
    achievementsStore.get(eid).add('Achievement 1');

    const serialized = serializeWorld(ctx, { includeRuntime: true, includeEntities: true });

    expect(serialized.title).toBe('Round Trip Test');
    expect(serialized.timeOfDay).toBe(1500);
    const serializedEntities = getSerializedEntities(serialized);
    expect(serializedEntities).toBeDefined();
    expect(serializedEntities.length).toBeGreaterThan(0);
    
    const entityBundle = serializedEntities.find(e => e.Info?.name === 'Test Player');
    expect(entityBundle).toBeDefined();
    expect(entityBundle!.Metrics).toBeDefined();
    expect(entityBundle!.Metrics.score.__value).toBe(25);
    expect(entityBundle!.UnlockedAchievements).toBeDefined();
    expect(entityBundle!.UnlockedAchievements).toContain('Achievement 1');

    const newCtx = createTestContext();
    initialize(newCtx, serialized);

    const newMetadata = newCtx.resources.get('metadata')!.resource as WorldMetadata;
    expect(newMetadata.title).toBe('Round Trip Test');

    const newTimeOfDay = newCtx.resources.get('timeOfDay')!.resource;
    expect(newTimeOfDay).toBe(1500);

    const newEntityStoreModule = newCtx.modules.get('entityStore') as any;
    const newMetricsStore = newEntityStoreModule.getStore('metrics') as MetricsStore;
    const newAchievementsStore = newEntityStoreModule.getStore('unlockedAchievements') as UnlockedAchievementsStore;

    // The restored entity should have the same stable ID as the original
    // Find all entities with metrics
    let foundMetrics = false;
    let foundAchievements = false;
    
    for (const [restoredEid, metrics] of (newMetricsStore as any).map.entries()) {
      if (metrics && metrics['score']?.__value === 25) {
        foundMetrics = true;
        expect(metrics['score'].__value).toBe(25);
        
        // Check achievements for same entity
        const achievements = newAchievementsStore.get(restoredEid);
        if (achievements.has('Achievement 1')) {
          foundAchievements = true;
        }
        break;
      }
    }
    
    expect(foundMetrics).toBe(true);
    expect(foundAchievements).toBe(true);
  });
});

describe('Module Serialization', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('serializes runtime-registered archetype instances', () => {
    const archetypeModule = ctx.modules.get('archetype') as any;
    
    // Register a runtime archetype (not built-in)
    archetypeModule.register('customCube', {
      type: 'bundle',
      params: {
        Info: { name: 'Custom Cube' },
        Transform: { y: 2 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2, lengthZ: 2 } },
                material: { type: 'solid', params: { color: '#ff0000' } }
              }
            ]
          }
        }
      }
    });
    
    const serialized = serializeWorld(ctx, { includeRuntime: true });
    
    expect(serialized.modules).toBeDefined();
    expect(serialized.modules!['archetype']).toBeDefined();
    expect(serialized.modules!['archetype'].length).toBe(1);
    expect(serialized.modules!['archetype'][0].name).toBe('customCube');
    expect(serialized.modules!['archetype'][0].definition.type).toBe('bundle');
    expect(serialized.modules!['archetype'][0].definition.params.Info.name).toBe('Custom Cube');
  });

  it('excludes built-in archetype instances from serialization', () => {
    const archetypeModule = ctx.modules.get('archetype') as any;
    
    // Register a built-in archetype
    archetypeModule.addDefinition('builtInCube', {
      type: 'bundle',
      params: { Info: { name: 'Built-in Cube' } }
    }, true);
    
    // Register a runtime archetype
    archetypeModule.register('runtimeCube', {
      type: 'bundle',
      params: { Info: { name: 'Runtime Cube' } }
    });
    
    const serialized = serializeWorld(ctx, { includeRuntime: true });
    
    expect(serialized.modules).toBeDefined();
    expect(serialized.modules!['archetype']).toBeDefined();
    expect(serialized.modules!['archetype'].length).toBe(1);
    expect(serialized.modules!['archetype'][0].name).toBe('runtimeCube');
  });

  it('serializes multiple runtime module instances across different module types', () => {
    const archetypeModule = ctx.modules.get('archetype') as any;
    const conditionModule = ctx.modules.get('condition') as any;
    
    // Register runtime archetypes
    archetypeModule.register('customEntity1', {
      type: 'bundle',
      params: { Info: { name: 'Entity 1' } }
    });
    
    archetypeModule.register('customEntity2', {
      type: 'bundle',
      params: { Info: { name: 'Entity 2' } }
    });
    
    // Register runtime conditions
    conditionModule.register('customCondition', {
      type: 'greaterThanOrEqual',
      params: { metric: 'customMetric', targetValue: 50 }
    });
    
    const serialized = serializeWorld(ctx, { includeRuntime: true });
    
    expect(serialized.modules).toBeDefined();
    expect(serialized.modules!['archetype']).toBeDefined();
    expect(serialized.modules!['archetype'].length).toBe(2);
    expect(serialized.modules!['condition']).toBeDefined();
    expect(serialized.modules!['condition'].length).toBe(1);
    expect(serialized.modules!['condition'][0].name).toBe('customCondition');
  });

  it('does not include modules field when no runtime instances are registered', () => {
    const serialized = serializeWorld(ctx, { includeRuntime: true });
    
    expect(serialized.modules).toBeUndefined();
  });

  it('restores runtime-registered module instances on initialization', () => {
    const definition: WorldDefinition = {
      title: 'Module Restore Test',
      modules: {
        archetype: [
          {
            name: 'restoredEntity',
            definition: {
              type: 'bundle',
              params: {
                Info: { name: 'Restored Entity' },
                Transform: { x: 10, y: 5, z: 3 }
              }
            }
          }
        ],
        condition: [
          {
            name: 'restoredCondition',
            definition: {
              type: 'greaterThanOrEqual',
              params: { metric: 'score', targetValue: 100 }
            }
          }
        ]
      }
    };
    
    initialize(ctx, definition);
    
    const archetypeModule = ctx.modules.get('archetype') as any;
    const conditionModule = ctx.modules.get('condition') as any;
    
    expect(archetypeModule.definitionsByName['restoredEntity']).toBeDefined();
    expect(archetypeModule.definitionsByName['restoredEntity'].params.Info.name).toBe('Restored Entity');
    expect(archetypeModule.definitionsByName['restoredEntity'].params.Transform.x).toBe(10);
    
    expect(conditionModule.definitionsByName['restoredCondition']).toBeDefined();
    expect(conditionModule.definitionsByName['restoredCondition'].type).toBe('compare');
    expect(conditionModule.definitionsByName['restoredCondition'].params.left.params.metric).toBe('score');
  });

  it('performs full round-trip serialization and restoration of module instances', () => {
    const archetypeModule = ctx.modules.get('archetype') as any;
    
    // Register multiple runtime instances
    archetypeModule.register('roundTripEntity1', {
      type: 'bundle',
      params: {
        Info: { name: 'Round Trip 1' },
        Transform: { y: 10 }
      }
    });
    
    archetypeModule.register('roundTripEntity2', {
      type: 'bundle',
      params: {
        Info: { name: 'Round Trip 2' },
        Transform: { y: 20 }
      }
    });
    
    // Serialize
    const serialized = serializeWorld(ctx, { includeRuntime: true });
    
    // Create new context and restore
    const newCtx = createTestContext();
    initialize(newCtx, serialized);
    
    const newArchetypeModule = newCtx.modules.get('archetype') as any;
    
    expect(newArchetypeModule.definitionsByName['roundTripEntity1']).toBeDefined();
    expect(newArchetypeModule.definitionsByName['roundTripEntity1'].params.Info.name).toBe('Round Trip 1');
    expect(newArchetypeModule.definitionsByName['roundTripEntity1'].params.Transform.y).toBe(10);
    
    expect(newArchetypeModule.definitionsByName['roundTripEntity2']).toBeDefined();
    expect(newArchetypeModule.definitionsByName['roundTripEntity2'].params.Info.name).toBe('Round Trip 2');
    expect(newArchetypeModule.definitionsByName['roundTripEntity2'].params.Transform.y).toBe(20);
  });

  it('handles missing module gracefully during restoration', () => {
    const definition: WorldDefinition = {
      title: 'Missing Module Test',
      modules: {
        nonExistentModule: [
          {
            name: 'someInstance',
            definition: { type: 'someType', params: {} }
          }
        ],
        archetype: [
          {
            name: 'validEntity',
            definition: {
              type: 'bundle',
              params: { Info: { name: 'Valid Entity' } }
            }
          }
        ]
      }
    };
    
    // Should not throw, just log warning
    initialize(ctx, definition);
    
    const archetypeModule = ctx.modules.get('archetype') as any;
    expect(archetypeModule.definitionsByName['validEntity']).toBeDefined();
  });

  it('preserves module instances through full world serialization including metadata and achievements', () => {
    // Register some runtime module instances
    const archetypeModule = ctx.modules.get('archetype') as any;
    archetypeModule.register('customEnemy', {
      type: 'bundle',
      params: {
        Info: { name: 'Custom Enemy' },
        Transform: { y: 5 },
        Health: { value: 50 }
      }
    });
    
    archetypeModule.register('customWeapon', {
      type: 'bundle',
      params: {
        Info: { name: 'Custom Weapon' },
        OnInteract: {
          effects: [{ type: 'getPickedUp', params: {}, target: 'self' }]
        }
      }
    });
    
    // Set up a full world definition
    const definition: WorldDefinition = {
      title: 'Complex World',
      description: 'A world with everything',
      tags: ['complex', 'test'],
      brandColors: ['#ff0000', '#00ff00'],
      dimensions: [{
        name: 'testDim',
        gravity: -10,
        useDayNightCycle: true,
        sky: { color: '#123456' }
      }],
      achievements: [{
        name: 'Test Achievement',
        description: 'Test desc',
        condition: { type: 'greaterThanOrEqual', params: { metric: 'test', targetValue: 1 } }
      }],
      timeOfDay: 1500
    };
    
    initialize(ctx, definition);
    
    // Serialize
    const serialized = serializeWorld(ctx, { includeRuntime: true });
    
    // Verify everything is in the serialization
    expect(serialized.title).toBe('Complex World');
    expect(serialized.achievements).toBeDefined();
    expect(serialized.achievements!.length).toBe(1);
    expect(serialized.modules).toBeDefined();
    expect(serialized.modules!['archetype']).toBeDefined();
    expect(serialized.modules!['archetype'].length).toBe(2);
    expect(serialized.timeOfDay).toBe(1500);
    
    // Restore to new context
    const newCtx = createTestContext();
    initialize(newCtx, serialized);
    
    // Verify metadata
    const metadata = newCtx.resources.get('metadata')!.resource as WorldMetadata;
    expect(metadata.title).toBe('Complex World');
    expect(metadata.dimensions[0].name).toBe('testDim');
    
    // Verify achievements
    const achievements = newCtx.resources.get('achievements')!.resource as ReactiveMap<Achievement>;
    expect(achievements.has('Test Achievement')).toBe(true);
    
    // Verify module instances
    const newArchetypeModule = newCtx.modules.get('archetype') as any;
    expect(newArchetypeModule.definitionsByName['customEnemy']).toBeDefined();
    expect(newArchetypeModule.definitionsByName['customEnemy'].params.Health.value).toBe(50);
    expect(newArchetypeModule.definitionsByName['customWeapon']).toBeDefined();
    
    // Verify runtime values
    const timeOfDay = newCtx.resources.get('timeOfDay')!.resource;
    expect(timeOfDay).toBe(1500);
  });
});
