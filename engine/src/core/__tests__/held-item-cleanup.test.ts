import { describe, it, expect } from 'vitest';
import { spawn } from '../spawn';
import { despawn } from '../despawn';
import { createWorld } from 'bitecs';
import { Module } from '../../modules/Module';
import type { ECSContext } from '../ecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';
import { getStore, Store } from '../../modules/entityStore';

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
  world.resources.set('nextStableId', { resource: 1 });
  return world;
}

describe('held item cleanup on despawn', () => {
  it('cleans up held items when entity is despawned', () => {
    const ctx = ctxWithModules();

    // Create an entity that will hold items
    const holderEid = spawn(ctx, {
      Inventory: {
        size: 1,
        items: [
          {
            Info: { name: "Held Item", description: "An item that will be held" },
            Body: {
              type: "composite", 
              params: {
                parts: [
                  {
                    geometry: { type: "box", params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                    material: { type: "solid", params: { color: "#ff0000" } }
                  }
                ]
              }
            }
          }
        ],
        selectedItemIndex: 0
      }
    });

    // Create a held item manually (simulating what heldItemSystem would do)
    const heldItemEid = spawn(ctx, {
      Info: { name: "Spawned Held Item", description: "A held item entity" },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "sphere", params: { radius: 0.5 } },
              material: { type: "solid", params: { color: "#00ff00" } }
            }
          ]
        }
      }
    });

    // Manually set up the held item relationship
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(holderEid, { eid: heldItemEid, slot: 0 });

    // Verify the held item relationship exists
    expect(heldItems.has(holderEid)).toBe(true);
    expect(heldItems.get(holderEid)?.eid).toBe(heldItemEid);

    // Despawn the holder entity
    const bundle = despawn(ctx, holderEid);

    // Verify the held item relationship was cleaned up
    expect(heldItems.has(holderEid)).toBe(false);
    
    // Note: In a real scenario, the held item entity would also be despawned,
    // but for this test we're focusing on the cleanup of the relationship map
  });

  it('cleans up references when a held entity is despawned', () => {
    const ctx = ctxWithModules();

    // Create holder and held entities
    const holderEid = spawn(ctx, { Inventory: { size: 1 } });
    const heldItemEid = spawn(ctx, {
      Info: { name: "Will be held then despawned", description: "Test entity" }
    });

    // Set up the held item relationship
    const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
    heldItems.set(holderEid, { eid: heldItemEid, slot: 0 });

    // Verify the relationship exists
    expect(heldItems.has(holderEid)).toBe(true);
    expect(heldItems.get(holderEid)?.eid).toBe(heldItemEid);

    // Despawn the held item (not the holder)
    despawn(ctx, heldItemEid);

    // Verify the relationship was cleaned up (holder should no longer reference the despawned entity)
    expect(heldItems.has(holderEid)).toBe(false);
  });
});