/**
 * Wave Spawner Demo - Demonstrating Phase 5 Wave-Based Spawning
 * 
 * Showcases:
 * - Wave spawner with multiple waves
 * - Wave-specific entity overrides
 * - Wave-specific positions
 * - spawnerDefaults for terrain projection
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // Register terrain height field
    fields.register('arena_terrain', {
      type: 'simplex',
      params: {
        seed: 4321,
        frequency: 0.02,
        amplitude: 3,
        octaves: 2
      }
    });

    // Register archetypes for enemies of different tiers
    archetypes.register('enemy_scout', {
      type: 'bundle',
      params: {
        Info: { name: 'Scout' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'sphere', params: { radius: 0.5 } },
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
              geometry: { type: 'box', params: { lengthX: 0.8, lengthY: 1.5, lengthZ: 0.8, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#FF6347' } }  // Tomato red
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('enemy_tank', {
      type: 'bundle',
      params: {
        Info: { name: 'Tank' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1.5, lengthY: 1, lengthZ: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B0000' } }  // Dark red
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 1.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#696969' } },
                localPosition: [0, 1, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('enemy_boss', {
      type: 'bundle',
      params: {
        Info: { name: 'Boss' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 3, lengthY: 3, lengthZ: 3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4B0082' } }  // Indigo
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

    archetypes.register('spawn_portal', {
      type: 'bundle',
      params: {
        Info: { name: 'Spawn Portal' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'torus', params: { radius: 2, tube: 0.3 } },
              material: { type: 'solid', params: { color: '#9400D3' } }  // Purple
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('barrier', {
      type: 'bundle',
      params: {
        Info: { name: 'Barrier' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 2, lengthY: 1.5, lengthZ: 0.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#A0522D' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Define spawn portal positions
    const portalPositions = [
      { x: -30, z: -30 },
      { x: 30, z: -30 },
      { x: -30, z: 30 },
      { x: 30, z: 30 },
    ];

    // Arena size
    const arenaSize = 100;

    initialize({
      title: 'Wave Spawner Demo (Phase 5)',
      description: 'Demonstrates wave-based enemy spawning with timed waves via update()',
      tags: ['demo', 'spawners', 'waves', 'phase5', 'combat'],
      brandColors: ['#FF6347', '#4B0082'],
      
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#191970',  // Midnight blue
          sun: {
            color: '#FF4500',
            intensity: 0.5,
            timeOfDay: 1800
          }
        },
        // Phase 4+: Dimension-level terrain settings
        terrain: {
          heightField: 'arena_terrain',
          size: arenaSize,
          heightOffset: 0.1,
        }
      }],

      // spawnerDefaults now optional - dimension terrain takes precedence
      spawnerDefaults: {
        transform: {
          ry: { min: 0, max: Math.PI * 2 }, // Default random rotation
        }
      },

      spawners: [
        // ----- Static: Spawn Portals -----
        {
          type: 'composite',
          name: 'spawn_portals',
          placement: {
            type: 'points',
            params: { positions: portalPositions.map(p => ({ ...p, y: 0 })) }
          },
          selection: {
            type: 'single',
            params: { entity: 'spawn_portal' }
          },
          transform: {
            rx: Math.PI / 2  // Lay flat
          }
        },

        // ----- Static: Arena Barriers -----
        {
          type: 'composite',
          name: 'barriers',
          placement: {
            type: 'circle',
            params: {
              center: { x: 0, y: 0, z: 0 },
              count: 8,
              radius: 15,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'barrier' }
          },
          transform: {
            ry: { min: 0, max: Math.PI * 2 }
          }
        },

        // ----- Wave Spawner: Enemy Waves -----
        // Wave timing is controlled by the delay property:
        // - delay: 0 waves spawn immediately on initialization
        // - delay: N waves spawn N seconds after the previous wave (via update())
        // 
        // In game loop: spawnerModule.update(deltaTimeInSeconds)
        // Or manually: spawnerModule.triggerNextWave('enemy_waves')
        // 
        // Entity specification can be:
        // - string: 'enemy_soldier'
        // - string[]: ['enemy_a', 'enemy_b'] (cycles)
        // - WeightedEntity[]: [{ entity: 'a', weight: 0.7 }, { entity: 'b', weight: 0.3 }]
        {
          type: 'composite',
          name: 'enemy_waves',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-35, 35], z: [-35, 35] },
              count: 1,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'enemy_soldier' }
          },
          schedule: {
            entity: 'enemy_soldier',
            bounds: { x: [-35, 35], z: [-35, 35] },
            waves: [
              {
                delay: 0,
                count: 8,
                entity: 'enemy_scout',
                positions: [
                  { x: -32, y: 0, z: -30 },
                  { x: -28, y: 0, z: -30 },
                  { x: 32, y: 0, z: -30 },
                  { x: 28, y: 0, z: -30 },
                  { x: -32, y: 0, z: 30 },
                  { x: -28, y: 0, z: 30 },
                  { x: 32, y: 0, z: 30 },
                  { x: 28, y: 0, z: 30 },
                ]
              },
              { delay: 30, count: 12 },
              {
                delay: 60,
                count: 6,
                entity: [
                  { entity: 'enemy_soldier', weight: 0.7 },
                  { entity: 'enemy_tank', weight: 0.3 },
                ],
              },
              { delay: 90, count: 4, entity: 'enemy_tank' },
              {
                delay: 120,
                count: 1,
                entity: 'enemy_boss',
                positions: [
                  { x: 0, y: 0, z: -35 }
                ]
              }
            ]
          },
          constraints: [
            // Keep enemies away from center (player spawn area)
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 10 }
          ]
        },

        // ----- Reinforcement Wave (separate spawner) -----
        {
          type: 'composite',
          name: 'reinforcements',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-40, 40], z: [-40, 40] },
              count: 1,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'enemy_scout' }
          },
          schedule: {
            entity: 'enemy_scout',
            bounds: { x: [-40, 40], z: [-40, 40] },
            waves: [
              {
                delay: 45,
                count: 4,
                bounds: { x: [-40, -30], z: [-40, -30] }
              },
              {
                delay: 75,
                count: 4,
                bounds: { x: [30, 40], z: [30, 40] }
              }
            ]
          },
          constraints: [
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 20 }
          ]
        }
      ].map(({ type, ...params }) => ({ type, params }))
    });

    // Spawn arena floor
    spawn({
      Info: { name: 'Arena Floor' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'cylinder',
              params: { radius: 50, height: 1, pivot: 'top' }
            },
            material: {
              type: 'solid',
              params: { color: '#2F4F4F', roughness: 0.9 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Spawn player at center
    spawn('player', {
      Transform: { x: 0, y: 2, z: 0 },
      Health: { value: 100 }
    });
  }
};
