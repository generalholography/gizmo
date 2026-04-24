import { describe, it, expect } from 'vitest';
import { createWorld, hasComponent } from 'bitecs';
import { spawn } from '../spawn';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { Player } from '../components/Player';
import { AI } from '../components/AI';
import { Faction } from '../components/Faction';
import { decode } from '../../utils/strings';

function ctxWithModules(): ECSContext {
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
  world.modules.set('archetype', new Module(world, { bundle: (p: any) => p }));
  
  // Add motionSource module mock
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
  
  // Add body module mock
  world.modules.set('body', new MockMotionSourceModule(world));
  
  return world;
}

describe('duplicate player prevention', () => {
  it('should allow spawning first player normally', () => {
    const ctx = ctxWithModules();
    
    // Spawn first player
    const playerId = spawn(ctx, { Player: {} });
    
    // Verify player component was added
    expect(hasComponent(ctx, Player, playerId)).toBe(true);
    expect(hasComponent(ctx, AI, playerId)).toBe(false);
  });

  it('should prevent duplicate player creation and create AI instead', () => {
    const ctx = ctxWithModules();
    
    // Spawn first player with a faction
    const firstPlayerId = spawn(ctx, { 
      Player: {},
      Faction: { id: "player_faction" }
    });
    
    // Verify first player was created correctly
    expect(hasComponent(ctx, Player, firstPlayerId)).toBe(true);
    expect(hasComponent(ctx, AI, firstPlayerId)).toBe(false);
    expect(hasComponent(ctx, Faction, firstPlayerId)).toBe(true);
    expect(decode(Faction.id[firstPlayerId])).toBe("player_faction");
    
    // Try to spawn second player
    const secondEntityId = spawn(ctx, { Player: {} });
    
    // Verify second entity was NOT given Player component
    expect(hasComponent(ctx, Player, secondEntityId)).toBe(false);
    // Verify it was given AI component instead
    expect(hasComponent(ctx, AI, secondEntityId)).toBe(true);
    // Verify AI is aggressive
    expect(AI.isAggressive[secondEntityId]).toBe(1);
    // Verify it has the same faction as the existing player
    expect(hasComponent(ctx, Faction, secondEntityId)).toBe(true);
    expect(decode(Faction.id[secondEntityId])).toBe("player_faction");
  });

  it('should handle case where existing player has no faction component', () => {
    const ctx = ctxWithModules();
    
    // Spawn first player without faction
    const firstPlayerId = spawn(ctx, { Player: {} });
    
    // Try to spawn second player
    const secondEntityId = spawn(ctx, { Player: {} });
    
    // Verify second entity was NOT given Player component
    expect(hasComponent(ctx, Player, secondEntityId)).toBe(false);
    // Verify it was given AI component instead
    expect(hasComponent(ctx, AI, secondEntityId)).toBe(true);
    // Verify it has default player faction
    expect(hasComponent(ctx, Faction, secondEntityId)).toBe(true);
    expect(decode(Faction.id[secondEntityId])).toBe("player_faction");
  });

  it('should allow normal spawning of entities without Player component', () => {
    const ctx = ctxWithModules();
    
    // Spawn AI entity (no Player component)
    const aiEntityId = spawn(ctx, { AI: { isAggressive: false, awarenessRange: 32 } });
    
    // Verify AI component was added normally
    expect(hasComponent(ctx, AI, aiEntityId)).toBe(true);
    expect(hasComponent(ctx, Player, aiEntityId)).toBe(false);
  });
});