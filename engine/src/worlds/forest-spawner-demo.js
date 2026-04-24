/**
 * Forest World - Demonstrating Cluster and Poisson Spawners
 * 
 * Showcases:
 * - Cluster spawner for mushroom patches and rock formations
 * - Poisson disk distribution for natural tree placement
 * - Path spawner for trail markers
 * - Multiple constraint types
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // Register terrain height field
    fields.register('terrain', {
      type: 'simplex',
      params: {
        seed: 42,
        frequency: 0.05,
        amplitude: 15,
        octaves: 4
      }
    });

    // Register forest density field
    fields.register('forest_density', {
      type: 'simplex',
      params: {
        seed: 123,
        frequency: 0.1,
        amplitude: 1.0,
        octaves: 2
      }
    });

    // Register archetypes
    archetypes.register('pine_tree', {
      type: 'bundle',
      params: {
        Info: { name: 'Pine Tree' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.25, height: 5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#5D4E37' } }
              },
              {
                geometry: { type: 'cone', params: { radius: 1.5, height: 4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#2D5A27' } },
                localPosition: [0, 5, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('oak_tree', {
      type: 'bundle',
      params: {
        Info: { name: 'Oak Tree' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.4, height: 3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6B4423' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 2.5 } },
                material: { type: 'solid', params: { color: '#4A7C31' } },
                localPosition: [0, 5, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('mushroom', {
      type: 'bundle',
      params: {
        Info: { name: 'Mushroom' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#F5F5DC' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.15 } },
                material: { type: 'solid', params: { color: '#DC143C' } },
                localPosition: [0, 0.35, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('rock', {
      type: 'bundle',
      params: {
        Info: { name: 'Rock' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'icosahedron', params: { radius: 0.6 } },
              material: { type: 'solid', params: { color: '#6B6B6B', roughness: 0.9 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('trail_marker', {
      type: 'bundle',
      params: {
        Info: { name: 'Trail Marker' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.15, height: 1, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#FFD700' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    initialize({
      title: 'Forest World - Spawner Demo',
      description: 'Demonstrates cluster spawners, Poisson distribution, and path spawners',
      tags: ['demo', 'spawners', 'forest', 'cluster', 'poisson'],
      brandColors: ['#2D5A27', '#4A7C31'],
      
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87CEEB',
          sun: {
            color: '#FFEEDD',
            intensity: 0.8,
            timeOfDay: 1000
          }
        }
      }],

      spawners: [
        // ----- Poisson Distribution Trees -----
        // Natural-looking tree distribution with guaranteed minimum spacing
        {
          name: 'forest_trees',
          type: 'composite',
          placement: {
            type: 'poisson',
            params: {
              bounds: { x: [-80, 80], z: [-80, 80] },
              minDistance: 5
            }
          },
          selection: {
            type: 'weighted',
            params: {
              options: [
                { entity: 'pine_tree', weight: 0.6 },
                { entity: 'oak_tree', weight: 0.4 }
              ]
            }
          },
          constraints: [
            // Keep away from center clearing
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 15 }
          ],
          heightField: 'terrain',
          transform: {
            ry: { min: 0, max: Math.PI * 2 },
            scale: { min: 0.7, max: 1.3 }
          }
        },

        // ----- Cluster Spawner: Mushroom Patches -----
        // Groups of mushrooms in shaded areas
        {
          name: 'mushroom_patches',
          type: 'composite',
          placement: {
            type: 'cluster',
            params: {
              bounds: { x: [-70, 70], z: [-70, 70] },
              clusterCount: 12,
              perCluster: { min: 5, max: 12 },
              clusterRadius: 3,
              clusterSeparation: 15,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'mushroom' }
          },
          constraints: [
            { type: 'noise', field: 'forest_density', min: 0.4 }
          ],
          heightField: 'terrain',
          transform: {
            ry: { min: 0, max: Math.PI * 2 },
            scale: { min: 0.6, max: 1.2 }
          }
        },

        // ----- Cluster Spawner: Rock Formations -----
        {
          name: 'rock_formations',
          type: 'composite',
          placement: {
            type: 'cluster',
            params: {
              bounds: { x: [-60, 60], z: [-60, 60] },
              clusterCount: 8,
              perCluster: { min: 3, max: 6 },
              clusterRadius: 4,
              clusterSeparation: 20,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'rock' }
          },
          heightField: 'terrain',
          transform: {
            rx: { min: -0.3, max: 0.3 },
            rz: { min: -0.3, max: 0.3 },
            scale: { min: 0.5, max: 2 }
          }
        },

        // ----- Path Spawner: Hiking Trail -----
        // Trail markers along a winding path
        {
          name: 'hiking_trail',
          type: 'composite',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: [
                    { x: -60, y: 0, z: 0 },
                    { x: -40, y: 0, z: 20 },
                    { x: -10, y: 0, z: 15 },
                    { x: 10, y: 0, z: -10 },
                    { x: 40, y: 0, z: -20 },
                    { x: 60, y: 0, z: 0 }
                  ],
                  closed: false,
                },
              },
              spacing: 8,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'trail_marker' }
          },
          heightField: 'terrain',
        },

        // ----- Spiral Path: Fairy Ring -----
        {
          name: 'fairy_ring',
          type: 'composite',
          placement: {
            type: 'spiral',
            params: {
              center: { x: 0, y: 0, z: 0 },
              startRadius: 5,
              endRadius: 12,
              turns: 1.5,
              count: 20
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'mushroom' }
          },
          heightField: 'terrain',
          transform: {
            scale: { min: 1.5, max: 2.0 }
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
              params: { color: '#3D6B30', roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Spawn player
    spawn('player', {
      Transform: { x: 0, y: 5, z: -30 },
      Health: { value: 100 }
    });
  }
};
