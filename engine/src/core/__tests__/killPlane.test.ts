import { describe, it, expect } from 'vitest';
import { createWorld, addComponent, hasComponent, addEntity } from 'bitecs';
import { ECSContext } from '../ecs';
import { Transform } from '../components/Transform';
import { Health } from '../components/Health';
import { killPlaneSystem, KILL_PLANE_Y } from '../systems/killPlane';
import { Faction } from '../components/Faction';
import { Info } from '../components/Info';

function makeCtx(): ECSContext {
  const world = createWorld();
  const mockCtx = world as ECSContext;
  
  // Mock required resources
  mockCtx.resources = new Map();
  mockCtx.modules = new Map();
  mockCtx.time = { getElapsed: () => 0 } as any;
  
  // Set up mock resources that might be accessed by the systems
  mockCtx.resources.set('heldItems', { resource: new Map(), dispose: undefined });
  mockCtx.resources.set('crowdAgents', { resource: new Map(), dispose: undefined });
  mockCtx.resources.set('aiMemory', { resource: new Map(), dispose: undefined });
  mockCtx.resources.set('renderObjects', { resource: new Map(), dispose: undefined });
  mockCtx.resources.set('metrics', { 
    resource: { 
      increment: () => {},
      get: () => 0,
      set: () => {}
    }, 
    dispose: undefined 
  });
  
  return mockCtx;
}

describe('kill plane system', () => {
  it('should remove entities below kill plane threshold without health', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    
    // Add transform component with position below kill plane
    addComponent(ctx, Transform, eid);
    Transform.x[eid] = 0;
    Transform.y[eid] = KILL_PLANE_Y - 10; // Below threshold
    Transform.z[eid] = 0;
    
    // Verify entity exists before kill plane system runs
    expect(hasComponent(ctx, Transform, eid)).toBe(true);
    
    // Run kill plane system
    killPlaneSystem(ctx);
    
    // Entity should be removed (despawned)
    expect(hasComponent(ctx, Transform, eid)).toBe(false);
  });
  
  it('should damage entities below kill plane threshold with health', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    
    // Add required components
    addComponent(ctx, Transform, eid);
    addComponent(ctx, Health, eid);
    addComponent(ctx, Faction, eid);
    addComponent(ctx, Info, eid);
    
    // Set position below kill plane
    Transform.x[eid] = 0;
    Transform.y[eid] = KILL_PLANE_Y - 10; // Below threshold
    Transform.z[eid] = 0;
    
    // Set health values
    Health.value[eid] = 10;
    Health.maxValue[eid] = 10;
    
    // Verify entity exists with health before kill plane system runs
    expect(hasComponent(ctx, Transform, eid)).toBe(true);
    expect(hasComponent(ctx, Health, eid)).toBe(true);
    expect(Health.value[eid]).toBe(10);
    
    // Run kill plane system
    killPlaneSystem(ctx);
    
    // Entity should be killed (removed via doDamage)
    expect(hasComponent(ctx, Health, eid)).toBe(false);
  });
  
  it('should not affect entities above kill plane threshold', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    
    // Add transform component with position above kill plane
    addComponent(ctx, Transform, eid);
    addComponent(ctx, Health, eid);
    
    Transform.x[eid] = 0;
    Transform.y[eid] = KILL_PLANE_Y + 10; // Above threshold
    Transform.z[eid] = 0;
    
    Health.value[eid] = 10;
    Health.maxValue[eid] = 10;
    
    // Verify entity exists before kill plane system runs
    expect(hasComponent(ctx, Transform, eid)).toBe(true);
    expect(hasComponent(ctx, Health, eid)).toBe(true);
    expect(Health.value[eid]).toBe(10);
    
    // Run kill plane system
    killPlaneSystem(ctx);
    
    // Entity should remain unchanged
    expect(hasComponent(ctx, Transform, eid)).toBe(true);
    expect(hasComponent(ctx, Health, eid)).toBe(true);
    expect(Health.value[eid]).toBe(10);
  });
  
  it('should handle entities exactly at kill plane threshold', () => {
    const ctx = makeCtx();
    const eid = addEntity(ctx);
    
    // Add transform component with position exactly at kill plane
    addComponent(ctx, Transform, eid);
    Transform.x[eid] = 0;
    Transform.y[eid] = KILL_PLANE_Y; // Exactly at threshold
    Transform.z[eid] = 0;
    
    // Verify entity exists before kill plane system runs
    expect(hasComponent(ctx, Transform, eid)).toBe(true);
    
    // Run kill plane system
    killPlaneSystem(ctx);
    
    // Entity should remain (only entities BELOW threshold are removed)
    expect(hasComponent(ctx, Transform, eid)).toBe(true);
  });
  
  it('should export the correct kill plane constant', () => {
    expect(KILL_PLANE_Y).toBe(-500);
  });
  
  it('should handle multiple entities at once', () => {
    const ctx = makeCtx();
    
    // Create multiple entities - some with health, some without
    const healthyEntity = addEntity(ctx);
    const healthlessEntity1 = addEntity(ctx);
    const healthlessEntity2 = addEntity(ctx);
    const safeEntity = addEntity(ctx);
    
    // Add components to healthy entity
    addComponent(ctx, Transform, healthyEntity);
    addComponent(ctx, Health, healthyEntity);
    addComponent(ctx, Faction, healthyEntity);
    addComponent(ctx, Info, healthyEntity);
    
    Transform.y[healthyEntity] = KILL_PLANE_Y - 10; // Below threshold
    Health.value[healthyEntity] = 10;
    Health.maxValue[healthyEntity] = 10;
    
    // Add components to healthless entities
    addComponent(ctx, Transform, healthlessEntity1);
    addComponent(ctx, Transform, healthlessEntity2);
    Transform.y[healthlessEntity1] = KILL_PLANE_Y - 5; // Below threshold
    Transform.y[healthlessEntity2] = KILL_PLANE_Y - 20; // Below threshold
    
    // Add components to safe entity
    addComponent(ctx, Transform, safeEntity);
    Transform.y[safeEntity] = KILL_PLANE_Y + 10; // Above threshold (safe)
    
    // Verify all entities exist before kill plane system runs
    expect(hasComponent(ctx, Transform, healthyEntity)).toBe(true);
    expect(hasComponent(ctx, Transform, healthlessEntity1)).toBe(true);
    expect(hasComponent(ctx, Transform, healthlessEntity2)).toBe(true);
    expect(hasComponent(ctx, Transform, safeEntity)).toBe(true);
    
    // Run kill plane system
    killPlaneSystem(ctx);
    
    // Check results
    expect(hasComponent(ctx, Health, healthyEntity)).toBe(false); // Killed via damage
    expect(hasComponent(ctx, Transform, healthlessEntity1)).toBe(false); // Despawned
    expect(hasComponent(ctx, Transform, healthlessEntity2)).toBe(false); // Despawned
    expect(hasComponent(ctx, Transform, safeEntity)).toBe(true); // Safe
  });
});