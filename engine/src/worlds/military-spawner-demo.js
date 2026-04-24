/**
 * Military Base World - Demonstrating Formation and Grid Spawners
 * 
 * Showcases:
 * - Formation spawner (line, circle, wedge, grid formations)
 * - Grid spawner with constraints
 * - Exclusion zones
 * - Sequential entity selection
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const archetypes = getModule('archetype');

    // Register archetypes
    archetypes.register('soldier', {
      type: 'bundle',
      params: {
        Info: { name: 'Soldier' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'capsule', params: { radius: 0.3, height: 1.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4B5320' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.2 } },
                material: { type: 'solid', params: { color: '#F4C2C2' } },
                localPosition: [0, 1.6, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('tank', {
      type: 'bundle',
      params: {
        Info: { name: 'Tank' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 0.8, lengthZ: 3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4B5320' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.8, height: 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#3D4420' } },
                localPosition: [0, 0.8, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('barracks', {
      type: 'bundle',
      params: {
        Info: { name: 'Barracks' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 8, lengthY: 3, lengthZ: 4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#8B7355' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('watchtower', {
      type: 'bundle',
      params: {
        Info: { name: 'Watchtower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 8, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6B4423' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2, lengthZ: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B7355' } },
                localPosition: [0, 8, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('sandbag', {
      type: 'bundle',
      params: {
        Info: { name: 'Sandbag' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 0.8, lengthY: 0.3, lengthZ: 0.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#C2B280' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('fence_post', {
      type: 'bundle',
      params: {
        Info: { name: 'Fence Post' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.1, height: 2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#808080' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    initialize({
      title: 'Military Base - Formation Spawner Demo',
      description: 'Demonstrates formation spawners, grid placement, and exclusion zones',
      tags: ['demo', 'spawners', 'military', 'formation', 'grid'],
      brandColors: ['#4B5320', '#8B7355'],
      
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#B0C4DE',
          sun: {
            color: '#FFEEDD',
            intensity: 0.9,
            timeOfDay: 1400
          }
        }
      }],

      spawners: [
        // ----- Formation: Parade Ground Line -----
        {
          name: 'parade_line',
          type: 'composite',
          placement: {
            type: 'line',
            params: {
              start: { x: 0, y: 0, z: 21 },
              end: { x: 0, y: 0, z: 39 },
              count: 10,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'soldier' }
          }
        },

        // ----- Formation: Tank Column (Wedge) -----
        {
          name: 'tank_column',
          type: 'composite',
          placement: {
            type: 'points',
            params: {
              positions: [
                { x: -40, y: 0, z: -20 },
                { x: -42.1213, y: 0, z: -26.3639 },
                { x: -46.3639, y: 0, z: -22.1213 },
                { x: -44.2426, y: 0, z: -32.7279 },
                { x: -52.7279, y: 0, z: -24.2426 },
              ]
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'tank' }
          }
        },

        // ----- Formation: Perimeter Guards (Circle) -----
        {
          name: 'perimeter_guards',
          type: 'composite',
          placement: {
            type: 'circle',
            params: {
              center: { x: 0, y: 0, z: 0 },
              radius: 45,
              count: 16,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'soldier' }
          }
        },

        // ----- Formation: Training Grid -----
        {
          name: 'training_squad',
          type: 'composite',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [25.5, 34.5], z: [-34.5, -25.5] },
              spacing: 3,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'soldier' }
          }
        },

        // ----- Grid Spawner: Fence Perimeter -----
        {
          name: 'perimeter_fence',
          type: 'composite',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: [
                    { x: -50, y: 0, z: -50 },
                    { x: 50, y: 0, z: -50 },
                    { x: 50, y: 0, z: 50 },
                    { x: -50, y: 0, z: 50 }
                  ],
                  closed: true,
                },
              },
              spacing: 3,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'fence_post' }
          }
        },

        // ----- Grid: Sandbag Bunkers -----
        {
          name: 'sandbag_defenses',
          type: 'composite',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [-10, 10], z: [35, 40] },
              spacing: 1,
              jitter: 0.2,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'sandbag' }
          },
          transform: {
            ry: { min: -0.2, max: 0.2 }
          }
        },

        // ----- Points: Watchtowers at Corners -----
        {
          name: 'corner_towers',
          type: 'composite',
          placement: {
            type: 'points',
            params: {
              positions: [
                { x: -48, y: 0, z: -48 },
                { x: 48, y: 0, z: -48 },
                { x: 48, y: 0, z: 48 },
                { x: -48, y: 0, z: 48 }
              ]
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'watchtower' }
          }
        },

        // ----- Grid: Barracks Row -----
        {
          name: 'barracks_row',
          type: 'composite',
          placement: {
            type: 'grid',
            params: {
              bounds: { x: [15, 45], z: [0, 20] },
              spacing: { x: 15, z: 20 },
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'barracks' }
          },
          constraints: [
            // Avoid the center parade area
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 20 }
          ]
        },

        // ----- Custom: Defensive Line -----
        {
          name: 'defensive_line',
          type: 'composite',
          placement: {
            type: 'line',
            params: {
              start: { x: -30, y: 0, z: -40 },
              end: { x: 30, y: 0, z: -40 },
              count: 12
            }
          },
          selection: {
            type: 'sequence',
            params: {
              entities: ['soldier', 'sandbag', 'sandbag', 'soldier'],
              loop: true
            }
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
              params: { lengthX: 120, lengthY: 0.5, lengthZ: 120, pivot: 'center' }
            },
            material: {
              type: 'solid',
              params: { color: '#8B7355', roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Spawn player
    spawn('player', {
      Transform: { x: 0, y: 2, z: -60 },
      Health: { value: 100 }
    });
  }
};
