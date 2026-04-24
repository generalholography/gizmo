/**
 * Spawner Trigger Test World
 * 
 * Comprehensive demonstration of Phase 6.1 trigger integration with custom spawners.
 * 
 * Features demonstrated:
 * - Time-based triggers (spawn after delay)
 * - Interval triggers (spawn repeatedly)
 * - Event-based triggers (spawn on custom events)
 * - Condition-based triggers (spawn when metrics conditions are met)
 * - Multiple trigger permutations with different placement/selection strategies
 * - Visual indicators showing trigger zones and spawn locations
 * 
 * Test scenarios:
 * 1. Time-based: Resources spawn 5 seconds after world load
 * 2. Interval: Enemies spawn every 10 seconds
 * 3. Event-driven: Boss spawns when player enters arena
 * 4. Event-driven: Reinforcements spawn on boss low health
 * 5. Multiple events: Different spawners react to same event
 * 6. Complex composition: Triggers + weighted selection + constraints
 * 7. Condition-based: Rewards spawn when player collects 5 items (metrics-based)
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');
    const spawner = getModule('spawner');
    const trigger = getModule('trigger');

    // ===== WORLD INITIALIZATION =====
    initialize({
      title: "Spawner Trigger Test World",
      description: "Comprehensive test environment for Phase 6.1 trigger integration with custom spawners",
      tags: ["test", "spawner", "trigger", "phase6"],
      
      dimensions: [{
        name: "base",
        gravity: -20,
        useDayNightCycle: false,
        sky: {
          color: "#87CEEB",
          sun: {
            color: "#ffffff",
            intensity: 1.0,
            timeOfDay: 1200
          }
        },
        terrain: {
          size: 200
        }
      }]
    });

    // ===== REGISTER TERRAIN =====
    fields.register('test_terrain', {
      type: 'simplex',
      params: {
        seed: 1234,
        frequency: 0.02,
        amplitude: 2,
        octaves: 1
      }
    });

    // Set default terrain for all spawners
    spawner.setDefaults({
      heightField: 'test_terrain',
      heightOffset: 0.1
    });

    // ===== REGISTER ARCHETYPES =====
    
    // Resources (for time-based trigger test)
    archetypes.register('resource_crystal', {
      type: 'bundle',
      params: {
        Info: { name: 'Crystal Resource' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 1, lengthZ: 0.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#00CED1' } }  // Cyan
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('resource_ore', {
      type: 'bundle',
      params: {
        Info: { name: 'Ore Resource' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'sphere', params: { radius: 0.4 } },
              material: { type: 'solid', params: { color: '#FFD700' } }  // Gold
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Enemies (for interval trigger test)
    archetypes.register('enemy_scout', {
      type: 'bundle',
      params: {
        Info: { name: 'Scout' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'sphere', params: { radius: 0.4 } },
              material: { type: 'solid', params: { color: '#90EE90' } }  // Light green
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('enemy_soldier', {
      type: 'bundle',
      params: {
        Info: { name: 'Soldier' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.6, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#FF6347' } }  // Red
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Boss (for event trigger test)
    archetypes.register('boss', {
      type: 'bundle',
      params: {
        Info: { name: 'Boss' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2.5, lengthY: 3, lengthZ: 2.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B0000' } }  // Dark red
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.5 } },
                material: { type: 'solid', params: { color: '#FFD700' } },  // Gold crown
                localPosition: [0, 3.5, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Elite reinforcements
    archetypes.register('elite_guard', {
      type: 'bundle',
      params: {
        Info: { name: 'Elite Guard' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 0.8, lengthY: 1.8, lengthZ: 0.8, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#4B0082' } }  // Indigo
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Pickupable collectible used for condition-based trigger test
    archetypes.register('test_collectible', {
      type: 'bundle',
      params: {
        Info: { name: 'Test Collectible' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'sphere', params: { radius: 0.3 } },
              material: { type: 'solid', params: { color: '#FFD700' } }
            }]
          }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.1 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', target: 'self', params: {} }
          ] }]
      }
    });

    // Visual indicators
    archetypes.register('trigger_zone_marker', {
      type: 'bundle',
      params: {
        Info: { name: 'Trigger Zone' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.2, height: 5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#9400D3' } }  // Purple
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('spawn_indicator', {
      type: 'bundle',
      params: {
        Info: { name: 'Spawn Point' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'torus', params: { radius: 1, tube: 0.1 } },
              material: { type: 'solid', params: { color: '#00FF00' } }  // Green
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ===== SPAWN STATIC ENVIRONMENT =====
    
    // Ground plane
    spawn({
      Transform: { x: 0, y: 0, z: 0, scaleX: 100, scaleZ: 100 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: 200, lengthY: 0.5, lengthZ: 200 } },
            material: { type: 'solid', params: { color: '#8FBC8F' } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Test section markers with labels
    const testSections = [
      { name: 'Time-Based\nTrigger', pos: { x: -40, z: -40 }, color: '#FF6B6B' },
      { name: 'Interval\nTrigger', pos: { x: 40, z: -40 }, color: '#4ECDC4' },
      { name: 'Event-Based\nBoss Spawn', pos: { x: -40, z: 40 }, color: '#FFD93D' },
      { name: 'Event-Based\nReinforcements', pos: { x: 40, z: 40 }, color: '#95E1D3' },
      { name: 'Multiple Events\nSame Trigger', pos: { x: 0, z: 0 }, color: '#F38181' },
      { name: 'Condition\nTrigger', pos: { x: -60, z: 0 }, color: '#FF9FF3' }
    ];

    testSections.forEach(section => {
      // Section boundary marker
      spawn({
        Transform: { x: section.pos.x, y: 5, z: section.pos.z, scaleX: 20, scaleY: 10, scaleZ: 20 },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 20, lengthY: 0.1, lengthZ: 20 } },
              material: { type: 'solid', params: { color: section.color, opacity: 0.3 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    });

    // ===== TEST 1: TIME-BASED TRIGGER =====
    // Resources spawn 5 seconds after world loads
    
    // Visual indicators for spawn zones
    const resourceSpawnPoints = [
      { x: -45, z: -45 },
      { x: -40, z: -35 },
      { x: -35, z: -45 }
    ];
    
    resourceSpawnPoints.forEach(pos => {
      spawn('spawn_indicator', {
        Transform: { x: pos.x, y: 0.1, z: pos.z }
      });
    });

    spawner.register('delayed_resources', {
      type: 'composite',
      placement: {
        type: 'points',
        params: { positions: resourceSpawnPoints }
      },
      selection: {
        type: 'weighted',
        params: {
          options: [
            { entity: 'resource_crystal', weight: 0.6 },
            { entity: 'resource_ore', weight: 0.4 }
          ]
        }
      },
      trigger: {
        type: 'time',
        params: { delay: 5 }
      }
    });

    // ===== TEST 2: INTERVAL TRIGGER =====
    // Enemies spawn every 10 seconds
    
    const enemySpawnBounds = { x: [35, 45], z: [-45, -35] };
    
    // Boundary markers
    spawn('trigger_zone_marker', { Transform: { x: 35, y: 0, z: -45 } });
    spawn('trigger_zone_marker', { Transform: { x: 45, y: 0, z: -45 } });
    spawn('trigger_zone_marker', { Transform: { x: 35, y: 0, z: -35 } });
    spawn('trigger_zone_marker', { Transform: { x: 45, y: 0, z: -35 } });

    spawner.register('interval_enemies', {
      type: 'composite',
      placement: {
        type: 'random',
        params: {
          bounds: enemySpawnBounds,
          count: 3
        }
      },
      selection: {
        type: 'random',
        params: {
          entities: ['enemy_scout', 'enemy_soldier']
        }
      },
      trigger: {
        type: 'interval',
        params: {
          interval: 10,
          maxCount: 5  // Spawn 5 waves
        }
      }
    });

    // ===== TEST 3: EVENT-BASED TRIGGER - BOSS SPAWN =====
    // Boss spawns when player enters arena
    
    const bossSpawnPoint = { x: -40, z: 40 };
    
    spawn('spawn_indicator', {
      Transform: { x: bossSpawnPoint.x, y: 0.1, z: bossSpawnPoint.z, scaleX: 3, scaleZ: 3 }
    });

    // Trigger zone indicator
    spawn('trigger_zone_marker', { Transform: { x: -40, y: 0, z: 35 } });

    spawner.register('event_boss', {
      type: 'composite',
      placement: {
        type: 'points',
        params: { positions: [bossSpawnPoint] }
      },
      selection: {
        type: 'single',
        params: { entity: 'boss' }
      },
      trigger: {
        type: 'event',
        params: {
          event: 'player_enters_arena',
          once: true  // Only spawn once
        }
      }
    });

    // ===== TEST 4: EVENT-BASED TRIGGER - REINFORCEMENTS =====
    // Elite guards spawn when boss health is low
    
    const reinforcementBounds = { x: [35, 45], z: [35, 45] };
    
    spawner.register('event_reinforcements', {
      type: 'composite',
      placement: {
        type: 'circle',
        params: {
          center: { x: 40, y: 0, z: 40 },
          radius: 5,
          count: 4
        }
      },
      selection: {
        type: 'single',
        params: { entity: 'elite_guard' }
      },
      trigger: {
        type: 'event',
        params: {
          event: 'boss_low_health',
          once: true
        }
      }
    });

    // Circle indicator for reinforcement spawn
    spawn('spawn_indicator', {
      Transform: { x: 40, y: 0.1, z: 40, scaleX: 5, scaleZ: 5 }
    });

    // ===== TEST 5: MULTIPLE SPAWNERS, SAME EVENT =====
    // Both resources and enemies spawn on same event
    
    spawner.register('multi_event_resources', {
      type: 'composite',
      placement: {
        type: 'random',
        params: {
          bounds: { x: [-5, 5], z: [-5, 5] },
          count: 3
        }
      },
      selection: {
        type: 'single',
        params: { entity: 'resource_crystal' }
      },
      trigger: {
        type: 'event',
        params: { event: 'treasure_found' }
      }
    });

    spawner.register('multi_event_enemies', {
      type: 'composite',
      placement: {
        type: 'grid',
        params: {
          bounds: { x: [-5, 5], z: [-5, 5] },
          spacing: 2.5
        }
      },
      selection: {
        type: 'single',
        params: { entity: 'enemy_scout' }
      },
      trigger: {
        type: 'event',
        params: { event: 'treasure_found' }
      }
    });

    // ===== TEST 6: COMPLEX COMPOSITION =====
    // Interval trigger + weighted selection + altitude constraint
    
    spawner.register('complex_composition', {
      type: 'composite',
      placement: {
        type: 'poisson',
        params: {
          bounds: { x: [-20, 20], z: [-20, 20] },
          minDistance: 3
        }
      },
      selection: {
        type: 'weighted',
        params: {
          options: [
            { entity: 'enemy_scout', weight: 0.5 },
            { entity: 'enemy_soldier', weight: 0.3 },
            { entity: 'elite_guard', weight: 0.2 }
          ]
        }
      },
      constraints: [
        {
          type: 'altitude',
          params: { min: -1, max: 5 }  // Only spawn on relatively flat areas
        }
      ],
      trigger: {
        type: 'interval',
        params: {
          interval: 15,
          initialDelay: 10,
          maxCount: 3
        }
      }
    });

    // ===== TEST 7: PREDICATE-BASED TRIGGER =====
    // Rewards spawn when player picks up 5 collectibles
    // Uses built-in metrics incremented by getPickedUp effect
    
    // Spawn visual collectible items (markers)
    const collectiblePositions = [
      { x: -65, z: -5 }, { x: -65, z: 0 }, { x: -65, z: 5 },
      { x: -60, z: -5 }, { x: -60, z: 0 }, { x: -60, z: 5 },
      { x: -55, z: -5 }, { x: -55, z: 0 }, { x: -55, z: 5 }
    ];
    
    // Spawn 5 pickupable collectibles for the test
    collectiblePositions.slice(0, 5).forEach((pos) => {
      spawn('test_collectible', {
        Transform: { x: pos.x, y: 1, z: pos.z }
      });
    });
    
    // Visual indicator for reward spawn
    spawn('spawn_indicator', {
      Transform: { x: -60, y: 0.1, z: -10, scaleX: 3, scaleZ: 3 }
    });
    
    // Register spawner that executes when condition is met
    // The spawner module will automatically check the trigger and execute
    spawner.register('condition_reward_spawner', {
      type: 'composite',
      placement: {
        type: 'points',
        params: { positions: [{ x: -60, z: -10 }] }
      },
      selection: {
        type: 'single',
        params: { entity: 'resource_crystal' }
      },
      // Trigger the spawner when player picks up 5 collectibles
      trigger: {
        type: 'condition',
        params: {
          subject: 'Player',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Test Collectible',
              targetValue: 5
            }
          },
          checkInterval: 1.0,  // Check every second
          once: true  // Only spawn reward once
        }
      }
    });

    // ===== INFO SIGNS =====
    // Create info displays for each test section
    
    const infoSigns = [
      {
        pos: { x: -50, y: 2, z: -50 },
        text: 'TEST 1: Time Trigger\nResources spawn 5s after load\nCheck spawn points for appearance'
      },
      {
        pos: { x: 50, y: 2, z: -50 },
        text: 'TEST 2: Interval Trigger\nEnemies spawn every 10s\nMax 5 waves\nWatch the spawn zone'
      },
      {
        pos: { x: -50, y: 2, z: 50 },
        text: 'TEST 3: Event Trigger\nBoss spawns on event\nUse: trigger.emit("player_enters_arena")'
      },
      {
        pos: { x: 50, y: 2, z: 50 },
        text: 'TEST 4: Event Reinforcements\nGuards spawn on event\nUse: trigger.emit("boss_low_health")'
      },
      {
        pos: { x: 0, y: 2, z: -10 },
        text: 'TEST 5: Multi-Spawner Event\nBoth spawners react to same event\nUse: trigger.emit("treasure_found")'
      },
      {
        pos: { x: 0, y: 2, z: 10 },
        text: 'TEST 6: Complex Composition\nInterval + Weighted + Constraints\nPoisson disk placement'
      },
      {
        pos: { x: -70, y: 2, z: 0 },
        text: 'TEST 7: Condition Trigger\nPick up 5 collectibles to spawn reward\nUses built-in "items picked up" metric'
      }
    ];

    infoSigns.forEach(sign => {
      spawn({
        Transform: { x: sign.pos.x, y: sign.pos.y, z: sign.pos.z, scaleX: 5, scaleY: 3, scaleZ: 0.2 },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 5, lengthY: 3, lengthZ: 0.2 } },
              material: { type: 'solid', params: { color: '#333333' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {type: 'popup', target: 'other', params: { text: sign.text } }
          ] }]
      });
    });

    // ===== CONTROL PANEL =====
    // Central control tower for manual event triggering
    
    spawn({
      Transform: { x: 0, y: 10, z: 0, scaleX: 5, scaleY: 20, scaleZ: 5 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: 5, lengthY: 20, lengthZ: 5, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#2C3E50' } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Control panel top
    spawn({
      Transform: { x: 0, y: 20, z: 0, scaleX: 8, scaleY: 0.5, scaleZ: 8 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.5, lengthZ: 8 } },
            material: { type: 'solid', params: { color: '#E74C3C' } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // spawn player at control panel
    spawn('player',{
      Transform: { x: 0, y: 21, z: 0 },
    });

    // ===== INSTRUCTIONS =====
    console.log('='.repeat(60));
    console.log('SPAWNER TRIGGER TEST WORLD - LOADED');
    console.log('='.repeat(60));
    console.log('');
    console.log('AUTOMATIC TESTS:');
    console.log('  1. TIME TRIGGER: Resources will spawn at 5 seconds');
    console.log('  2. INTERVAL TRIGGER: Enemies spawn every 10 seconds (5 waves)');
    console.log('  6. COMPLEX: Multiple spawns at intervals with constraints');
    console.log('  7. PREDICATE TRIGGER: Reward spawns after picking up 5 collectibles');
    console.log('');
    console.log('MANUAL TESTS (use console):');
    console.log('  const trigger = getModule("trigger");');
    console.log('');
    console.log('  3. Boss Spawn:');
    console.log('     trigger.emit("player_enters_arena");');
    console.log('');
    console.log('  4. Reinforcements:');
    console.log('     trigger.emit("boss_low_health");');
    console.log('');
    console.log('  5. Multiple Spawners (same event):');
    console.log('     trigger.emit("treasure_found");');
    console.log('');
    console.log('  7. Condition Trigger:');
    console.log('     Pick up 5 "Test Collectible" items scattered in the area');
    console.log('');
    console.log('INSPECT SPAWNER STATE:');
    console.log('  const spawner = getModule("spawner");');
    console.log('  spawner.getResult("delayed_resources");');
    console.log('  spawner.getResult("interval_enemies");');
    console.log('  spawner.getResult("event_boss");');
    console.log('');
    console.log('INSPECT TRIGGER STATE:');
    console.log('  trigger.getState("delayed_resources_composite");');
    console.log('  trigger.getState("interval_enemies_composite");');
    console.log('  trigger.getState("condition_reward_spawner_composite");');
    console.log('  trigger.getTriggerNames();');
    console.log('='.repeat(60));
  }
};
