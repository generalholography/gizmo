/**
 * Race Track - Production-Ready Spawner Showcase
 *
 * A complete racing experience demonstrating the full capabilities of
 * the spawner module for track-based gameplay:
 *
 * Spawner Types Demonstrated:
 * - Path spawners: Track boundaries, lane dividers, barrier walls
 * - Points spawners: Checkpoints, start/finish line, pit stops
 * - Formation spawners: Starting grid positions, grandstands
 * - Grid spawners: Spectator areas, parking lots
 * - Scatter spawners: Environmental decorations (trees, rocks)
 * - Cluster spawners: Tire barriers, hay bales
 *
 * Path Spawner Features:
 * - Closed loop tracks
 * - Spacing control for density
 * - Offset for parallel paths (track boundaries)
 * - alignToPath for directional elements
 *
 * Advanced Features Demonstrated:
 * - Complex constraint combinations
 * - Multiple overlapping paths
 * - Transform variations for visual interest
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // ========================================================================
    // TERRAIN AND FIELDS
    // ========================================================================

    const terrainSize = 400;

    // Slight terrain variation for visual interest
    fields.register('terrain_height', {
      type: 'simplex',
      params: {
        seed: 9999,
        frequency: 0.01,
        amplitude: 2,
        octaves: 2
      }
    });

    // Grass variation for decoration density
    fields.register('grass_density', {
      type: 'simplex',
      params: {
        seed: 1234,
        frequency: 0.05,
        amplitude: 1.0,
        octaves: 2
      }
    });

    // ========================================================================
    // ARCHETYPES - TRACK ELEMENTS
    // ========================================================================

    archetypes.register('track_barrier', {
      type: 'bundle',
      params: {
        Info: { name: 'Track Barrier' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 3, lengthY: 1.2, lengthZ: 0.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#FF0000' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('track_barrier_white', {
      type: 'bundle',
      params: {
        Info: { name: 'Track Barrier White' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 3, lengthY: 1.2, lengthZ: 0.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#FFFFFF' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('concrete_barrier', {
      type: 'bundle',
      params: {
        Info: { name: 'Concrete Barrier' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 4, lengthY: 1.5, lengthZ: 0.8, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#808080' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('tire_stack', {
      type: 'bundle',
      params: {
        Info: { name: 'Tire Stack' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'torus', params: { radius: 0.5, tube: 0.2 } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [0, 0.2, 0]
              },
              {
                geometry: { type: 'torus', params: { radius: 0.5, tube: 0.2 } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [0, 0.6, 0]
              },
              {
                geometry: { type: 'torus', params: { radius: 0.5, tube: 0.2 } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [0, 1.0, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('hay_bale', {
      type: 'bundle',
      params: {
        Info: { name: 'Hay Bale' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.6, height: 1.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#DAA520' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('cone', {
      type: 'bundle',
      params: {
        Info: { name: 'Traffic Cone' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cone', params: { radius: 0.2, height: 0.6, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FF6600' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.25, height: 0.05, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('lane_marker', {
      type: 'bundle',
      params: {
        Info: { name: 'Lane Marker' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.05, lengthZ: 2, pivot: 'center' } },
              material: { type: 'solid', params: { color: '#FFFFFF' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ========================================================================
    // ARCHETYPES - STRUCTURES
    // ========================================================================

    archetypes.register('checkpoint_gate', {
      type: 'bundle',
      params: {
        Info: { name: 'Checkpoint' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Left post
              {
                geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 6, lengthZ: 0.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [-8, 0, 0]
              },
              // Right post
              {
                geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 6, lengthZ: 0.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [8, 0, 0]
              },
              // Top banner
              {
                geometry: { type: 'box', params: { lengthX: 17, lengthY: 1, lengthZ: 0.3, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 6.5, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'entityInRange' }, cooldown: 2, actions: [
            { type: 'discover', params: {}, target: 'self' }
          ] }]
      }
    });

    archetypes.register('start_finish_line', {
      type: 'bundle',
      params: {
        Info: { name: 'Start/Finish Line' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Left tower
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 10, lengthZ: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [-12, 0, 0]
              },
              // Right tower
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 10, lengthZ: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [12, 0, 0]
              },
              // Gantry
              {
                geometry: { type: 'box', params: { lengthX: 26, lengthY: 2, lengthZ: 3, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#FFFFFF' } },
                localPosition: [0, 11, 0]
              },
              // Checkered pattern
              {
                geometry: { type: 'box', params: { lengthX: 24, lengthY: 1.5, lengthZ: 0.2, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [0, 10.5, 1.6]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('grandstand', {
      type: 'bundle',
      params: {
        Info: { name: 'Grandstand' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Base tier
              {
                geometry: { type: 'box', params: { lengthX: 20, lengthY: 2, lengthZ: 6, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4169E1' } }
              },
              // Middle tier
              {
                geometry: { type: 'box', params: { lengthX: 20, lengthY: 2, lengthZ: 5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4169E1' } },
                localPosition: [0, 2, 1]
              },
              // Top tier
              {
                geometry: { type: 'box', params: { lengthX: 20, lengthY: 2, lengthZ: 4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4169E1' } },
                localPosition: [0, 4, 2]
              },
              // Roof
              {
                geometry: { type: 'box', params: { lengthX: 22, lengthY: 0.3, lengthZ: 8, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#2F2F2F' } },
                localPosition: [0, 8, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('pit_garage', {
      type: 'bundle',
      params: {
        Info: { name: 'Pit Garage' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Main structure
              {
                geometry: { type: 'box', params: { lengthX: 10, lengthY: 4, lengthZ: 8, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#404040' } }
              },
              // Roof
              {
                geometry: { type: 'box', params: { lengthX: 12, lengthY: 0.3, lengthZ: 10, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#2F2F2F' } },
                localPosition: [0, 4, 0]
              },
              // Door
              {
                geometry: { type: 'box', params: { lengthX: 6, lengthY: 3.5, lengthZ: 0.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#696969' } },
                localPosition: [0, 0, 4]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('light_tower', {
      type: 'bundle',
      params: {
        Info: { name: 'Light Tower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Tower
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 20, lengthZ: 1, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#696969' } }
              },
              // Light bank
              {
                geometry: { type: 'box', params: { lengthX: 4, lengthY: 2, lengthZ: 1, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 20, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('flag_post', {
      type: 'bundle',
      params: {
        Info: { name: 'Flag Post' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.1, height: 5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#C0C0C0' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.1, lengthY: 1, lengthZ: 1.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 4.5, 0.75]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ========================================================================
    // ARCHETYPES - VEHICLES
    // ========================================================================

    archetypes.register('race_car', {
      type: 'bundle',
      params: {
        Info: { name: 'Race Car' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Body
              {
                geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.6, lengthZ: 4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FF0000' } }
              },
              // Cockpit
              {
                geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 0.5, lengthZ: 1.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [0, 0.6, -0.5]
              },
              // Front wing
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 0.1, lengthZ: 0.5, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#FF0000' } },
                localPosition: [0, 0.3, 2.2]
              },
              // Rear wing
              {
                geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.5, lengthZ: 0.2, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#FF0000' } },
                localPosition: [0, 1.2, -2]
              },
              // Wheels
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 0.3, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [1, 0.3, 1.3],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 0.3, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [-1, 0.3, 1.3],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.35, height: 0.35, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [1, 0.35, -1.3],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.35, height: 0.35, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#1C1C1C' } },
                localPosition: [-1, 0.35, -1.3],
                localRotation: [0, 0, Math.PI / 2]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 30 } }
      }
    });

    // ========================================================================
    // ARCHETYPES - DECORATIONS
    // ========================================================================

    archetypes.register('tree', {
      type: 'bundle',
      params: {
        Info: { name: 'Tree' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B4513' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 2 } },
                material: { type: 'solid', params: { color: '#228B22' } },
                localPosition: [0, 5, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('bush', {
      type: 'bundle',
      params: {
        Info: { name: 'Bush' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'sphere', params: { radius: 0.8 } },
              material: { type: 'solid', params: { color: '#228B22' } },
              localPosition: [0, 0.8, 0]
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('advertising_board', {
      type: 'bundle',
      params: {
        Info: { name: 'Advertising Board' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Posts
              {
                geometry: { type: 'cylinder', params: { radius: 0.1, height: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#696969' } },
                localPosition: [-2, 0, 0]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.1, height: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#696969' } },
                localPosition: [2, 0, 0]
              },
              // Board
              {
                geometry: { type: 'box', params: { lengthX: 5, lengthY: 1.5, lengthZ: 0.1, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4169E1' } },
                localPosition: [0, 2, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ========================================================================
    // TRACK DEFINITION - Closed Loop Circuit
    // ========================================================================

    // Main racing circuit - a closed loop
    const trackCenterline = [
      // Start/Finish straight
      { x: 0, z: -120 },
      { x: 0, z: -80 },
      // Turn 1 - hairpin
      { x: 30, z: -50 },
      { x: 60, z: -30 },
      { x: 80, z: 0 },
      // Back straight
      { x: 80, z: 40 },
      { x: 70, z: 80 },
      // Chicane
      { x: 40, z: 100 },
      { x: 10, z: 110 },
      { x: -30, z: 100 },
      // Turn 3
      { x: -60, z: 70 },
      { x: -80, z: 30 },
      // Turn 4 - sweeping
      { x: -90, z: -20 },
      { x: -70, z: -60 },
      { x: -40, z: -90 },
      // Return to start
      { x: 0, z: -120 }
    ];

    // Checkpoint positions along the track
    const checkpointPositions = [
      { x: 0, y: 0, z: -100 },    // After start
      { x: 70, y: 0, z: 0 },       // End of Turn 1
      { x: 75, y: 0, z: 60 },      // Mid back straight
      { x: 0, y: 0, z: 105 },      // Chicane exit
      { x: -75, y: 0, z: 0 }       // Turn 4 apex
    ];

    // Pit lane
    const pitLane = [
      { x: 15, z: -120 },
      { x: 20, z: -100 },
      { x: 25, z: -80 },
      { x: 25, z: -60 },
      { x: 20, z: -40 }
    ];

    // ========================================================================
    // INITIALIZE WITH SPAWNERS
    // ========================================================================

    initialize({
      title: 'Grand Prix Circuit',
      description: 'A professional racing circuit with multiple turns, a chicane, pit lane, and grandstands. Complete laps and hit all checkpoints to set the fastest time!',
      tags: ['racing', 'sports', 'track', 'circuit'],
      brandColors: ['#FF0000', '#1C1C1C'],

      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87CEEB',
          sun: {
            color: '#FFEEDD',
            intensity: 1.0,
            timeOfDay: 1400
          },
          clouds: {
            color: '#FFFFFF',
            coverage: 0.3
          }
        },
        terrain: {
          heightField: 'terrain_height',
          size: terrainSize,
          heightOffset: 0.05
        }
      }],

      achievements: [
        {
          name: 'First Lap',
          description: 'Complete one lap of the circuit.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Checkpoint',
              targetValue: 5
            }
          }
        },
        {
          name: 'Clean Racing',
          description: 'Complete a lap without hitting barriers.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'distance moved',
              targetValue: 1000
            }
          }
        }
      ],

      spawnerDefaults: {
        transform: {
          ry: { min: 0, max: Math.PI * 2 }
        }
      },

      spawners: [
        // ================================================================
        // TRACK BOUNDARIES - Path Spawners with Offset
        // ================================================================

        // Inner barrier (red/white alternating)
        {
          type: 'composite',
          name: 'inner_barrier',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: trackCenterline.map(p => ({ ...p, y: 0 })),
                  closed: true,
                },
              },
              spacing: 3.2,
              offset: -10,
              alignToPath: true,
            }
          },
          selection: {
            type: 'sequence',
            params: { entities: ['track_barrier', 'track_barrier_white'], loop: true }
          }
        },

        // Outer barrier (concrete)
        {
          type: 'composite',
          name: 'outer_barrier',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: trackCenterline.map(p => ({ ...p, y: 0 })),
                  closed: true,
                },
              },
              spacing: 4.2,
              offset: 10,
              alignToPath: true,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'concrete_barrier' }
          }
        },

        // Center lane markers
        {
          type: 'composite',
          name: 'lane_markers',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: trackCenterline.map(p => ({ ...p, y: 0 })),
                  closed: true,
                },
              },
              spacing: 8,
              alignToPath: true,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'lane_marker' }
          }
        },

        // ================================================================
        // CHECKPOINTS - Points Spawners
        // ================================================================

        {
          type: 'composite',
          name: 'checkpoints',
          placement: {
            type: 'points',
            params: { positions: checkpointPositions }
          },
          selection: {
            type: 'single',
            params: { entity: 'checkpoint_gate' }
          },
          transform: { ry: 0 }
        },

        // Start/Finish line
        {
          type: 'composite',
          name: 'start_finish',
          placement: {
            type: 'points',
            params: { positions: [{ x: 0, y: 0, z: -120 }] }
          },
          selection: {
            type: 'single',
            params: { entity: 'start_finish_line' }
          },
          transform: { ry: 0 }
        },

        // ================================================================
        // PIT LANE - Path Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'pit_cones',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: pitLane.map(p => ({ ...p, y: 0 })),
                  closed: false,
                },
              },
              spacing: 5,
              offset: -3,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'cone' }
          }
        },

        {
          type: 'composite',
          name: 'pit_cones_right',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: pitLane.map(p => ({ ...p, y: 0 })),
                  closed: false,
                },
              },
              spacing: 5,
              offset: 3,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'cone' }
          }
        },

        // ================================================================
        // PIT GARAGES - Formation Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'pit_garages',
          placement: {
            type: 'line',
            params: {
              start: { x: 10, y: 0, z: -80 },
              end: { x: 70, y: 0, z: -80 },
              count: 5,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'pit_garage' }
          }
        },

        // ================================================================
        // STARTING GRID - Formation Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'starting_grid',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [-4, 4], z: [-112, -88] },
              spacing: 8,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'race_car' }
          },
          transform: { ry: 0 }
        },

        // ================================================================
        // TIRE BARRIERS AT CORNERS - Cluster Spawners
        // ================================================================

        // Turn 1 apex tire barrier
        {
          type: 'composite',
          name: 'turn1_tires',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 3,
              perCluster: { min: 4, max: 8 },
              clusterRadius: 3,
              bounds: { x: [70, 90], z: [-10, 10] },
              clusterSeparation: 8,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'tire_stack' }
          }
        },

        // Chicane tire barriers
        {
          type: 'composite',
          name: 'chicane_tires',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 4,
              perCluster: { min: 3, max: 6 },
              clusterRadius: 2.5,
              bounds: { x: [-10, 30], z: [95, 115] },
              clusterSeparation: 10,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'tire_stack' }
          }
        },

        // Turn 4 tire barrier
        {
          type: 'composite',
          name: 'turn4_tires',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 2,
              perCluster: { min: 5, max: 10 },
              clusterRadius: 4,
              bounds: { x: [-95, -80], z: [-30, 10] },
              clusterSeparation: 15,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'tire_stack' }
          }
        },

        // Hay bales at run-off areas
        {
          type: 'composite',
          name: 'hay_barriers',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 6,
              perCluster: { min: 3, max: 6 },
              clusterRadius: 3,
              bounds: { x: [-100, 100], z: [-100, 120] },
              clusterSeparation: 40,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'hay_bale' }
          },
          constraints: [
            // Keep in run-off areas (outside track barriers)
            { type: 'pathDistance', path: { type: 'polyline', params: { points: trackCenterline.map(p => ({ ...p, y: 0 })), closed: true } }, min: 15 }
          ],
          transform: {
            rx: Math.PI / 2,
            ry: { min: 0, max: Math.PI * 2 }
          }
        },

        // ================================================================
        // GRANDSTANDS - Points Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'grandstands',
          placement: {
            type: 'points',
            params: {
              positions: [
                { x: -30, y: 0, z: -135 },
                { x: 30, y: 0, z: -135 },
                { x: 95, y: 0, z: 40 },
                { x: -50, y: 0, z: 115 }
              ]
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'grandstand' }
          },
          transform: {
            ry: Math.PI / 2
          }
        },

        // ================================================================
        // LIGHT TOWERS - Grid Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'light_towers',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [-110, 110], z: [-140, 130] },
              spacing: 50,
              jitter: 5,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'light_tower' }
          },
          spawnChance: 0.6,
          constraints: [
            // Keep outside track area
            { type: 'pathDistance', path: { type: 'polyline', params: { points: trackCenterline.map(p => ({ ...p, y: 0 })), closed: true } }, min: 20 }
          ]
        },

        // ================================================================
        // FLAG POSTS - Path Spawner along track
        // ================================================================

        {
          type: 'composite',
          name: 'flag_posts',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: trackCenterline.map(p => ({ ...p, y: 0 })),
                  closed: true,
                },
              },
              spacing: 40,
              offset: 15,
              alignToPath: false,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'flag_post' }
          }
        },

        // ================================================================
        // ADVERTISING BOARDS - Path Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'advertising_inner',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: trackCenterline.map(p => ({ ...p, y: 0 })),
                  closed: true,
                },
              },
              spacing: 25,
              offset: -14,
              alignToPath: true,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'advertising_board' }
          }
        },

        // ================================================================
        // ENVIRONMENTAL DECORATIONS - Scatter Spawners
        // ================================================================

        // Trees in infield and outfield
        {
          type: 'composite',
          name: 'trees',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-150, 150], z: [-150, 150] },
              count: 100,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'tree' }
          },
          spawnChance: 0.7,
          constraints: [
            // Keep well outside track
            { type: 'pathDistance', path: { type: 'polyline', params: { points: trackCenterline.map(p => ({ ...p, y: 0 })), closed: true } }, min: 25 },
            { type: 'noise', field: 'grass_density', min: 0.3 }
          ],
          transform: {
            scale: { min: 0.8, max: 1.4 },
            ry: { min: 0, max: Math.PI * 2 }
          }
        },

        // Bushes around track perimeter
        {
          type: 'composite',
          name: 'bushes',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-140, 140], z: [-140, 140] },
              count: 150,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'bush' }
          },
          spawnChance: 0.6,
          constraints: [
            { type: 'pathDistance', path: { type: 'polyline', params: { points: trackCenterline.map(p => ({ ...p, y: 0 })), closed: true } }, min: 18 },
            { type: 'excludeSpawner', spawner: 'trees', radius: 3 }
          ],
          transform: {
            scale: { min: 0.5, max: 1.2 }
          }
        }
      ].map(({ type, ...params }) => ({ type, params }))
    });

    // ========================================================================
    // STATIC SPAWNS
    // ========================================================================

    // Track surface
    spawn({
      Info: { name: 'Track Surface' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'displacedPlane',
              params: {
                lengthX: terrainSize,
                lengthZ: terrainSize,
                field: 'terrain_height'
              }
            },
            material: {
              type: 'solid',
              params: { color: '#228B22', roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Asphalt track surface (simplified - would need proper track geometry)
    spawn({
      Info: { name: 'Main Straight Asphalt' },
      Transform: { x: 0, y: 0.05, z: -100 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: 20, lengthY: 0.1, lengthZ: 80, pivot: 'center' } },
            material: { type: 'solid', params: { color: '#2F2F2F', roughness: 0.9 } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Player starts on the grid
    spawn('player', {
      Transform: { x: -3, y: 2, z: -90 },
      Health: { value: 100 }
    });
  }
};