/**
 * Store + Rule Simulation Lab
 *
 * Goals:
 * - Exercise Stores as authoritative simulation state (health + additional stock instances).
 * - Exercise Rule triggers across engine and global event channels.
 * - Keep navigation simple: each lane demonstrates one concept end-to-end.
 */

function panel(color, size = { x: 2.8, y: 0.2, z: 2.8 }) {
  return {
    type: 'composite',
    params: {
      parts: [{
        geometry: { type: 'box', params: { lengthX: size.x, lengthY: size.y, lengthZ: size.z } },
        material: { type: 'solid', params: { color } },
      }],
    },
  };
}

function crate(color = '#8b5cf6', scale = 1) {
  return {
    type: 'composite',
    params: {
      parts: [{
        geometry: { type: 'box', params: { lengthX: scale, lengthY: scale, lengthZ: scale } },
        material: { type: 'solid', params: { color, roughness: 0.7 } },
      }],
    },
  };
}

function sensorOrb(color = '#f59e0b', radius = 0.9) {
  return {
    type: 'composite',
    params: {
      parts: [{
        geometry: { type: 'sphere', params: { radius } },
        material: { type: 'solid', params: { color, opacity: 0.25, transparent: true } },
        ignoreCollisions: true,
      }],
    },
  };
}

export default {
  setupScene(api) {
    const { initialize, spawn, getModule, registerArchetype } = api;

    const stores = getModule('entityStore');
    if (stores) {
      if (!stores.hasStore('energy')) stores.registerStoreInstance('energy', 'stock');
      if (!stores.hasStore('shield')) stores.registerStoreInstance('shield', 'stock');
      if (!stores.hasStore('mana')) stores.registerStoreInstance('mana', 'stock');
    }

    initialize({
      title: 'Store + Rule Simulation Lab',
      description: 'Navigable validation world for store instances, triggers, and effect chaining under the new Stores/Rules model.',
      tags: ['demo', 'store', 'rule', 'simulation-lab'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#93c5fd' },
      }],
    });

    const conditionLibrary = getModule('condition');
    if (conditionLibrary && !conditionLibrary.definitionsByName?.metric_equals_template) {
      conditionLibrary.register('metric_equals_template', {
        type: 'compare',
        params: {
          operator: 'eq',
          left: {
            type: 'metric',
            params: { metric: '__never_set', subject: 999999 }
          },
          right: {
            type: 'parameter',
            params: { name: 'targetValue', defaultValue: 1 }
          }
        }
      });
    }


    registerArchetype('lab_player_modern', {
      Info: { name: 'Lab Player (Stores+Rules)', description: 'Player archetype variant using Stores for health+inventory and Rules for die handling.' },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'capsule', params: { radius: 0.5, height: 2, pivot: 'bottom' } },
            children: [{
              geometry: { type: 'none' },
              localPosition: [0, 1.82, 0],
              tag: 'head',
              children: [{
                geometry: { type: 'none' },
                localPosition: [0.25, -0.25, -0.75],
                tag: 'heldItemAnchor',
              }],
            }],
          }],
        },
      },
      Transform: { y: 2 },
      MotionSource: {
        type: 'characterController',
        params: { speed: 5, jumpHeight: 5, canFly: false },
      },
      Player: {},
      Faction: { id: 'player_faction' },
      Stores: [
        { store: 'health', value: { current: 20, max: 20, min: 0 } },
        { store: 'energy', value: { current: 10, max: 10, min: 0 } },
        { store: 'inventory', value: { size: 6, selectedItemIndex: 0, items: ['bow', 'healthPotion'] } },
      ],
      Rules: [{
        trigger: { type: 'primaryAction' },
        cooldown: 0.5,
        actions: [{ type: 'damage', params: { amount: 2 }, target: 'other' }],
      }, {
        trigger: { type: 'die' },
        actions: [{ type: 'popup', target: 'self', params: { text: 'Lab player died (Rule die trigger).' } }],
      }],
    });

    registerArchetype('lab_orb', {
      Info: { name: 'Lab Orb', description: 'Simple projectile spawned by rule/effect tests.' },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'sphere', params: { radius: 0.2 } },
            material: { type: 'solid', params: { color: '#f59e0b', emissive: '#78350f', emissiveIntensity: 0.15 } },
          }],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.25 } },
      Stores: [{ store: 'health', value: { current: 2, max: 2, min: 0 } }],
      Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.1, actions: [{ type: 'kill', target: 'self', params: {} }] }],
    });

    registerArchetype('lab_enemy_modern', {
      Info: { name: 'Lab Enemy (Stores+Rules)', description: 'Enemy archetype using Stores inventory/health and Rules combat trigger.' },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'capsule', params: { radius: 0.5, height: 2, pivot: 'bottom' } },
            children: [{
              geometry: { type: 'none' },
              localPosition: [0, 1.82, 0],
              tag: 'head',
              children: [{
                geometry: { type: 'none' },
                localPosition: [0.25, -0.25, -0.75],
                tag: 'heldItemAnchor',
              }],
            }],
          }],
        },
      },
      Transform: { y: 2 },
      MotionSource: {
        type: 'characterController',
        params: { speed: 4.5, jumpHeight: 4, canFly: false },
      },
      AI: { isAggressive: true, awarenessRange: 14 },
      Faction: { id: 'enemy_faction' },
      Stores: [
        { store: 'health', value: { current: 14, max: 14, min: 0 } },
        { store: 'inventory', value: { size: 3, selectedItemIndex: 0, items: ['bow'] } },
      ],
      Rules: [{
        trigger: { type: 'entityInRange', params: { range: 0.9 } },
        cooldown: 0.8,
        actions: [{ type: 'damage', target: 'other', params: { amount: 2, knockback: 0.6 } }],
      }],
    });

    // Ground + navigation deck
    spawn({
      Info: { name: 'Ground', description: 'Main floor for the simulation lab.' },
      Transform: { x: 0, y: -0.5, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: 42, lengthY: 1, lengthZ: 34 } },
            material: { type: 'solid', params: { color: '#7fb069' } },
          }],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    // Lane markers
    const laneZ = [-10, -4, 2, 8, 14];
    const laneColor = ['#334155', '#1e3a8a', '#7c2d12', '#14532d', '#3f3f46'];
    const laneName = ['Read Me / Baseline', 'Engine Triggers', 'Event + Time Triggers', 'Rules Compatibility', 'Combat Proving Grounds'];
    laneZ.forEach((z, i) => {
      spawn({
        Info: { name: `${laneName[i]} Lane`, description: 'Color-coded navigation strip for the lab.' },
        Transform: { x: 0, y: 0.02, z },
        Body: panel(laneColor[i], { x: 36, y: 0.04, z: 3.2 }),
        MotionSource: { type: 'static', params: {} },
      });
    });

    laneZ.forEach((z, i) => {
      const instructionsByLane = [
        `Lane 1 / Baseline Stores:
- Interact with Baseline Stocks Crate repeatedly.
- Interact with Inventory Giver then Inventory Remover.
- Interact with Stock Dial and Metrics Terminal.
- EXPECTED: crate loses health by 3 each interact, inventory add/remove is atomic, stock increments clamp, and metric writes occur on the caller.`,
        `Lane 2 / Engine Triggers:
- Touch Collision Hazard.
- Walk through Range Sensor sphere.
- Interact with Interact Healer.
- EXPECTED: collision and range apply damage; healer restores health to caller.`,
        `Lane 3 / Event + Time:
- Interact with Event Broadcaster.
- Watch Timed Self-Damage and Interval Beacon for ~6s.
- EXPECTED: listener reacts to global event, timer self-damages once then dies, interval fires 5 bursts then stops.`,
        `Lane 4 / Rules Compatibility:
- Interact with Rules-Only Interact.
- Interact with conditioned rule sign.
- EXPECTED: all trigger behavior runs through Rules without On* components.`,
        `Lane 5 / Combat Proving Grounds:
- Verify player starts with a held bow from Stores.inventory.
- Verify Lab Enemy starts with a held bow from Stores.inventory.
- Fight in this lane using primary action and close-range proximity.
- EXPECTED: both entities render held weapons; combat damage applies through Stores-backed health and rule-based triggers.`,
      ];

      spawn({
        Info: { name: `${laneName[i]} Sign`, description: 'Interact for lane-specific testing steps and expected outcomes.' },
        Transform: { x: -16, y: 1, z },
        Body: crate(laneColor[i], 0.9),
        MotionSource: { type: 'static', params: {} },
          Rules: [{
          trigger: { type: 'interact' },
          actions: [{ type: 'popup', target: 'other', params: { text: instructionsByLane[i] } }],
        }],
      });
    });

    spawn('lab_player_modern', {
      Transform: { x: -14, y: 2, z: -9 },
      Info: { name: 'Player', description: 'Stores+Rules player variant for simulation lab checks.' },
    });

    // Intro sign with popup on interact
    spawn({
      Info: { name: 'Lab Welcome Sign', description: 'Interact to view test instructions.' },
      Transform: { x: -16, y: 1, z: -10 },
      Body: crate('#0f172a', 1.1),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [{
          type: 'popup',
          target: 'other',
          params: {
            text: 'Store + Rule Simulation Lab:\n\nLane 1: stock + inventory + metric store effects\nLane 2: collision/interact/entityInRange/die\nLane 3: event + time/interval triggers\nLane 4: rules-only compatibility checks',
          },
        }],
      }],
    });

    // ===== Lane 1: Store baseline + effects =====
    spawn({
      Info: { name: 'Baseline Stocks Crate', description: 'Shows multiple stock instances on one entity.' },
      Transform: { x: -9, y: 1, z: -10 },
      Body: crate('#7c3aed', 1),
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 1 } },
      Stores: [
        { store: 'health', value: { current: 30, max: 30, min: 0 } },
        { store: 'energy', value: { current: 9, max: 12, min: 0 } },
        { store: 'shield', value: { current: 4, max: 8, min: 0 } },
        { store: 'mana', value: { current: 2, max: 10, min: 0 } },
      ],
      Rules: [
        {
          trigger: { type: 'interact' },
          actions: [
            { type: 'damage', target: 'self', params: { amount: 3, knockback: 0 } },
            { type: 'emitParticles', target: 'self', params: { emitter: { burst: 18, lifetime: 0.35, speed: 1.5, color: '#a78bfa', size: 0.11, spread: 0.9 } } },
            { type: 'emitEvent', target: 'self', params: { name: 'lab_stock_interact', payload: { other: 0 } } },
          ],
        },
        {
          trigger: { type: 'die' },
          actions: [
            { type: 'popup', target: 'other', params: { text: 'Baseline Stocks Crate died via Rule trigger: die.' } },
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'lab_orb', velocity: 2.5 } },
          ],
        },
      ],
    });

    spawn({
      Info: { name: 'Teleport Pad (Rule)', description: 'Interact to teleport yourself to the event lane.' },
      Transform: { x: -3.5, y: 0.35, z: -10 },
      Body: panel('#0ea5e9', { x: 2.4, y: 0.2, z: 2.4 }),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [{ type: 'teleport', target: 'other', params: { position: { x: 9, y: 1.5, z: 2 } } }],
      }],
    });

    spawn({
      Info: { name: 'Self-Damage Button', description: 'Interact to damage yourself and test healing behavior.' },
      Transform: { x: -0.8, y: 1, z: -10 },
      Body: crate('#991b1b', 0.85),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [{ type: 'damage', target: 'other', params: { amount: 5, knockback: 0.2 } }],
      }],
    });

    spawn({
      Info: { name: 'Inventory Giver', description: 'Adds two health potions to the caller inventory atomically.' },
      Transform: { x: 2.2, y: 1, z: -10 },
      Body: crate('#0369a1', 0.82),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [
          {
            type: 'addToInventory',
            target: 'other',
            params: { item: 'healthPotion', count: 2 },
            onFailure: [{ type: 'popup', target: 'other', params: { text: 'Inventory add failed: not enough free slots for both items.' } }],
          },
        ],
      }],
    });

    spawn({
      Info: { name: 'Inventory Remover', description: 'Removes two health potions from caller inventory by archetype (preferred) or name, or fails atomically.' },
      Transform: { x: 5.1, y: 1, z: -10 },
      Body: crate('#155e75', 0.82),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [
          {
            type: 'removeFromInventory',
            target: 'other',
            params: { archetype: 'healthPotion', count: 2 },
            onFailure: [{ type: 'popup', target: 'other', params: { text: 'Inventory remove failed: missing matching items.' } }],
          },
        ],
      }],
    });

    spawn({
      Info: { name: 'Stock Dial', description: 'Adjusts the caller health stock using incrementStock without triggering death flow.' },
      Transform: { x: 8, y: 1, z: -10 },
      Body: crate('#6d28d9', 0.82),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [
          { type: 'incrementStock', target: 'other', params: { stock: 'health', delta: -4 } },
          { type: 'incrementStock', target: 'other', params: { stock: 'energy', delta: 2 } },
        ],
      }],
    });

    spawn({
      Info: { name: 'Metrics Terminal', description: 'Writes metric values with subtype/subpath and increments them.' },
      Transform: { x: 10.8, y: 1, z: -10 },
      Body: crate('#047857', 0.82),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [
          { type: 'setMetric', target: 'other', params: { metric: 'lab score', value: 10, subpath: 'lane1' } },
          { type: 'incrementMetric', target: 'other', params: { metric: 'lab score', delta: 3, subtype: 'lane1' } },
        ],
      }],
    });

    // ===== Lane 2: Engine trigger permutations =====
    spawn({
      Info: { name: 'Collision Hazard', description: 'Colliding applies damage via Rule collisionEnter trigger.' },
      Transform: { x: -10, y: 1, z: -4 },
      Body: crate('#dc2626', 1.1),
      MotionSource: { type: 'static', params: {} },
      Stores: [{ store: 'health', value: { current: 999, max: 999, min: 0 } }],
      Rules: [{
        trigger: { type: 'collisionEnter' },
        cooldown: 0.2,
        actions: [{ type: 'damage', target: 'other', params: { amount: 6, knockback: 1.25 } }],
      }],
    });

    spawn({
      Info: { name: 'Range Sensor', description: 'Triggers while entities pass through sensor zone.' },
      Transform: { x: -5.5, y: 1, z: -4 },
      Body: sensorOrb('#f59e0b', 0.9),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'entityInRange', params: { range: 0.9 } },
        cooldown: 0.35,
        actions: [
          { type: 'emitParticles', target: 'self', params: { emitter: { burst: 12, lifetime: 0.25, speed: 0.5, color: '#f59e0b', spread: 0.35, size: 0.09 } } },
          { type: 'damage', target: 'other', params: { amount: 1, knockback: 0.25 } },
        ],
      }],
    });

    spawn({
      Info: { name: 'Interact Healer', description: 'Interacting heals the caller.' },
      Transform: { x: -1.5, y: 1, z: -4 },
      Body: crate('#16a34a', 1),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [{ type: 'heal', target: 'other', params: { amount: 8 } }],
      }],
    });

    // ===== Lane 3: event + time + interval =====
    spawn({
      Info: { name: 'Event Broadcaster', description: 'Interact emits global event for listeners.' },
      Transform: { x: 7, y: 1, z: 2 },
      Body: crate('#0284c7', 1),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [
          { type: 'emitEvent', target: 'self', params: { name: 'lab_global_ping', payload: { other: 0, source: 'broadcaster' } } },
          { type: 'popup', target: 'other', params: { text: 'Broadcasted: lab_global_ping' } },
        ],
      }],
    });

    spawn({
      Info: { name: 'Global Event Listener', description: 'Listens for lab_global_ping (Rule event trigger).' },
      Transform: { x: 11, y: 1, z: 2 },
      Body: crate('#1d4ed8', 0.95),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'event', params: { event: 'lab_global_ping' } },
        actions: [
          { type: 'emitParticles', target: 'self', params: { emitter: { burst: 20, lifetime: 0.6, speed: 1.6, color: '#60a5fa', spread: 1.1, size: 0.12 } } },
          { type: 'spawnEntityFrom', target: 'self', params: { entity: 'lab_orb', velocity: 3 } },
        ],
      }],
    });

    spawn({
      Info: { name: 'Timed Self-Damage', description: 'Rule time trigger: damages itself once after delay, then dies and emits event.' },
      Transform: { x: 15, y: 1, z: 2 },
      Body: crate('#be123c', 1),
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 1 } },
      Stores: [{ store: 'health', value: { current: 4, max: 4, min: 0 } }],
      Rules: [
        { trigger: { type: 'time', params: { delay: 2.2 } }, actions: [{ type: 'damage', target: 'self', params: { amount: 4, knockback: 0 } }] },
        { trigger: { type: 'die' }, actions: [{ type: 'emitEvent', target: 'self', params: { name: 'lab_timer_died' } }] },
      ],
    });

    spawn({
      Info: { name: 'Interval Beacon', description: 'Rule interval trigger emits particles repeatedly then stops.' },
      Transform: { x: 19, y: 1, z: 2 },
      Body: crate('#7c3aed', 0.9),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interval', params: { interval: 1.2, initialDelay: 0.5, maxCount: 5 } },
        actions: [{ type: 'emitParticles', target: 'self', params: { emitter: { burst: 10, lifetime: 0.2, speed: 0.5, color: '#c4b5fd', spread: 0.5, size: 0.08 } } }],
      }],
    });

    // ===== Lane 4: Rules-only compatibility checks =====
    spawn({
      Info: { name: 'Conditioned Rule (if/else action)', description: 'Evaluates condition inside action graph and executes else fallback.' },
      Transform: { x: 6, y: 1, z: 8 },
      Body: crate('#0f766e', 1),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: {
          type: 'if',
          params: {
            condition: {
              type: 'reference',
              params: {
                name: 'metric_equals_template',
                args: {
                  targetValue: { type: 'literal', params: { value: 1 } }
                }
              }
            },
            then: {
              type: 'popup',
              target: 'other',
              params: { text: 'Unexpected true branch.' },
            },
            else: {
              type: 'popup',
              target: 'other',
              params: { text: 'Condition failed as expected; else branch executed.' },
            },
          },
        },
      }],
    });

    // ===== Lane 5: Combat proving grounds =====
    spawn({
      Info: { name: 'Combat Ring', description: 'Test combat using Stores-only inventory and health-backed damage.' },
      Transform: { x: -2, y: 0.08, z: 14 },
      Body: panel('#18181b', { x: 14, y: 0.12, z: 5.4 }),
      MotionSource: { type: 'static', params: {} },
    });

    spawn('lab_enemy_modern', {
      Transform: { x: -2, y: 2, z: 14 },
      Info: { name: 'Lab Enemy', description: 'Stores+Rules enemy with held weapon from inventory store.' },
    });

    spawn({
      Info: { name: 'Combat Reset Teleport', description: 'Interact to return player to baseline lane for reset.' },
      Transform: { x: 6, y: 1, z: 14 },
      Body: crate('#334155', 0.9),
      MotionSource: { type: 'static', params: {} },
      Rules: [{
        trigger: { type: 'interact' },
        actions: [{ type: 'teleport', target: 'other', params: { position: { x: -14, y: 2, z: -9 } } }],
      }],
    });
  },
};
