/**
 * Example World Using Declarative Spawners
 * 
 * This demonstrates the spawner module which enables fully declarative
 * procedural entity placement without custom JavaScript logic.
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // Register height field for terrain
    fields.register('terrain_height', {
      type: 'simplex',
      params: {
        seed: 12345,
        frequency: 0.08,
        amplitude: 8,
        octaves: 4
      }
    });

    // Register density field for vegetation
    fields.register('forest_density', {
      type: 'simplex',
      params: {
        seed: 54321,
        frequency: 0.15,
        amplitude: 1.0,
        octaves: 3
      }
    });

    // Register archetypes for spawnable entities
    archetypes.register('demo_tree', {
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
                localPosition: [0, 4, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('demo_rock', {
      type: 'bundle',
      params: {
        Info: { name: 'Rock' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'icosahedron', params: { radius: 0.8 } },
              material: { type: 'solid', params: { color: '#808080', roughness: 0.9 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('demo_flower', {
      type: 'bundle',
      params: {
        Info: { name: 'Flower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.05, height: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.15 } },
                material: { type: 'solid', params: { color: '#FF69B4' } },
                localPosition: [0, 0.35, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('demo_guard', {
      type: 'bundle',
      params: {
        Info: { name: 'Guard' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'capsule', params: { radius: 0.3, height: 1.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4169E1' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.25 } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 1.6, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('demo_pillar', {
      type: 'bundle',
      params: {
        Info: { name: 'Pillar' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.5, height: 5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#D3D3D3', roughness: 0.3 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('demo_torch', {
      type: 'bundle',
      params: {
        Info: { name: 'Torch' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.1, height: 1.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B4513' } }
              },
              {
                geometry: { type: 'cone', params: { radius: 0.2, height: 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#FF4500' } },
                localPosition: [0, 1.5, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Initialize world with spawners
    initialize({
      title: 'Spawner Demo World',
      description: 'Demonstrates declarative entity spawning with the spawner module',
      tags: ['demo', 'spawners', 'declarative'],
      brandColors: ['#87CEEB', '#228B22'],
      
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87CEEB',
          sun: {
            color: '#FFEEDD',
            intensity: 1.0,
            timeOfDay: 1100
          },
          clouds: {
            color: '#FFFFFF',
            coverage: 0.3
          },
          stars: {
            intensity: 0.0
          }
        }
      }],

      achievements: [
        {
          name: 'Explorer',
          description: 'Walk through the spawner demonstration world',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'distance moved',
              targetValue: 50
            }
          }
        }
      ],

      // ===== SPAWNER DEFINITIONS =====
      // These replace procedural JavaScript loops with declarative definitions

      spawners: [
        // ----- Scatter Spawner: Forest Trees -----
        // Demonstrates noise-masked scatter with weighted entity selection
        {
          name: 'forest_trees',
          type: 'composite',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-80, 80], z: [-80, 80] },
              count: 150,
            }
          },
          selection: {
            type: 'weighted',
            params: {
              options: [
                { entity: 'demo_tree', weight: 0.7 },
                { entity: 'demo_rock', weight: 0.3 }
              ]
            }
          },
          spawnChance: 0.8,
          constraints: [
            // Keep trees away from center plaza
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 20 },
            { type: 'noise', field: 'forest_density', min: 0.3 }
          ],
          transform: {
            ry: { min: 0, max: Math.PI * 2 },
            scale: { min: 0.8, max: 1.3 }
          }
        },

        // ----- Scatter Spawner: Flowers -----
        // Demonstrates simple scatter with single entity type
        {
          name: 'meadow_flowers',
          type: 'composite',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-40, 40], z: [-40, 40] },
              count: 200,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'demo_flower' }
          },
          spawnChance: 0.6,
          constraints: [
            // Keep flowers in center area (inverse of trees)
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, max: 35 },
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 5 }
          ],
          transform: {
            scale: { min: 0.5, max: 1.0 }
          }
        },

        // ----- Grid Spawner: Torch Circle -----
        // Demonstrates grid placement with jitter
        {
          name: 'plaza_torches',
          type: 'composite',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [-15, 15], z: [-15, 15] },
              spacing: 10,
              jitter: 1,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'demo_torch' }
          },
          spawnChance: 0.9,
          constraints: [
            // Only along the edges of the plaza
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 12 }
          ]
        },

        // ----- Formation Spawner: Guard Circle -----
        // Demonstrates circle formation
        {
          name: 'guard_circle',
          type: 'composite',
          placement: {
            type: 'circle',
            params: {
              center: { x: 0, y: 0, z: 0 },
              count: 8,
              radius: 8,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'demo_guard' }
          },
          facing: 0,
          transform: {
            ry: 0 // Face outward
          }
        },

        // ----- Formation Spawner: Pillar Line -----
        // Demonstrates line formation
        {
          name: 'pillar_entrance',
          type: 'composite',
          placement: {
            type: 'line',
            params: {
              start: { x: -10, y: 0, z: 25 },
              end: { x: 10, y: 0, z: 25 },
              count: 6,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'demo_pillar' }
          },
          facing: Math.PI / 2 // Line perpendicular to Z axis
        },

        // ----- Formation Spawner: Wedge Formation -----
        // Demonstrates wedge/V formation
        {
          name: 'patrol_wedge',
          type: 'composite',
          placement: {
            type: 'points',
            params: {
              positions: [
                { x: 40, y: 0, z: 40 },
                { x: 36.818, y: 0, z: 41.0607 },
                { x: 38.9393, y: 0, z: 43.182 },
                { x: 33.636, y: 0, z: 42.1213 },
                { x: 37.8787, y: 0, z: 46.364 },
              ]
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'demo_guard' }
          },
          facing: Math.PI * 0.75 // Face toward center
        },

        // ----- Points Spawner: Landmarks -----
        // Demonstrates spawning at specific positions with alternating entities
        {
          name: 'landmarks',
          type: 'composite',
          placement: {
            type: 'points',
            params: {
              positions: [
                { x: 50, y: 0, z: 0 },
                { x: -50, y: 0, z: 0 },
                { x: 0, y: 0, z: 50 },
                { x: 0, y: 0, z: -50 }
              ]
            }
          },
          selection: {
            type: 'sequence',
            params: {
              entities: ['demo_pillar', 'demo_torch'],
              loop: true
            }
          }
        },

        // ----- Custom Spawner: Complex Pattern -----
        // Demonstrates full composition control
        {
          name: 'ring_decorations',
          type: 'composite',
          placement: {
            type: 'circle',
            params: {
              center: { x: 0, y: 0, z: 0 },
              radius: 30,
              count: 16
            }
          },
          selection: {
            type: 'sequence',
            params: {
              entities: ['demo_pillar', 'demo_torch'],
              loop: true
            }
          },
          transform: {
            scale: 0.8
          }
        }
      ].map(({ type, ...params }) => ({ type, params }))
    });

    // Spawn terrain
    spawn({
      Info: { name: 'Ground' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'box',
              params: { lengthX: 200, lengthY: 1, lengthZ: 200, pivot: 'center' }
            },
            material: {
              type: 'solid',
              params: { color: '#4a7c2f', roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Spawn player
    spawn('player', {
      Transform: { x: 0, y: 2, z: -40 },
      Health: { value: 100 }
    });
  }
};
