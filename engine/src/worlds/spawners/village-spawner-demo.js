/**
 * Village World - Demonstrating Conditional Selection and Custom Constraints
 * 
 * Showcases Phase 4 features:
 * - spawnerDefaults for automatic heightField application
 * - 2D path points (y-coordinate auto-sampled)
 * - heightOffset for z-fighting prevention
 * - excludeSpawner constraint
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // Register terrain height field - creates hills and valleys
    fields.register('terrain', {
      type: 'simplex',
      params: {
        seed: 7777,
        frequency: 0.04,
        amplitude: 12,
        octaves: 3
      }
    });

    // Register moisture field for vegetation
    fields.register('moisture', {
      type: 'simplex',
      params: {
        seed: 8888,
        frequency: 0.08,
        amplitude: 1.0,
        octaves: 2
      }
    });

    // Register archetypes
    archetypes.register('cottage', {
      type: 'bundle',
      params: {
        Info: { name: 'Cottage' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 4, lengthY: 3, lengthZ: 5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#F5DEB3' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 4.5, lengthY: 0.5, lengthZ: 5.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B4513' } },
                localPosition: [0, 3, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('well', {
      type: 'bundle',
      params: {
        Info: { name: 'Well' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 1, height: 0.8, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#696969' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.8, height: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#1E90FF' } },
                localPosition: [0, 0.1, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('streetlamp', {
      type: 'bundle',
      params: {
        Info: { name: 'Street Lamp' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.1, height: 3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#2F4F4F' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.25 } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 3.2, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('flower_red', {
      type: 'bundle',
      params: {
        Info: { name: 'Red Flower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.1 } },
                material: { type: 'solid', params: { color: '#DC143C' } },
                localPosition: [0, 0.25, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('flower_yellow', {
      type: 'bundle',
      params: {
        Info: { name: 'Yellow Flower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.1 } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 0.25, 0]
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
              geometry: { type: 'sphere', params: { radius: 0.5 } },
              material: { type: 'solid', params: { color: '#228B22' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('cobblestone', {
      type: 'bundle',
      params: {
        Info: { name: 'Cobblestone' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.3, height: 0.05, pivot: 'center' } },
              material: { type: 'solid', params: { color: '#696969' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Define the main road path using 2D points (Phase 4 feature)
    // y will be auto-sampled from the heightField
    const mainRoad = [
      { x: -70, z: 0 },
      { x: -30, z: 0 },
      { x: 0, z: 0 },
      { x: 30, z: 0 },
      { x: 70, z: 0 }
    ];

    // Terrain size matching the displaced plane geometry
    const terrainSize = 200;

    initialize({
      title: 'Village World - Spawner Demo (Phase 4)',
      description: 'Demonstrates dimension terrain settings, spawnerDefaults, 2D paths, excludeSpawner constraint',
      tags: ['demo', 'spawners', 'village', 'phase4'],
      brandColors: ['#F5DEB3', '#228B22'],
      
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87CEEB',
          sun: {
            color: '#FFF8DC',
            intensity: 0.9,
            timeOfDay: 1100
          }
        },
        // Phase 4+: Dimension-level terrain settings
        // This ensures spawned entities match the displaced plane terrain geometry
        terrain: {
          heightField: 'terrain',
          size: terrainSize,  // Must match the displacedPlane lengthX/lengthZ
          heightOffset: 0.05, // Prevent z-fighting
        }
      }],

      // spawnerDefaults is now optional - dimension terrain takes precedence
      // Keeping for demonstration of both approaches
      spawnerDefaults: {
        transform: {
          ry: { min: 0, max: Math.PI * 2 }, // Default random rotation
        }
      },

      spawners: [
        // ----- Path Spawner: Main Road Cobblestones -----
        // Uses 2D points - y auto-sampled from terrain
        {
          name: 'main_road',
          type: 'composite',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: mainRoad,
                  closed: false,
                },
              },
              spacing: 1
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'cobblestone' }
          },
          transform: {
            ry: { min: 0, max: Math.PI * 2 }
          }
          // heightField inherited from spawnerDefaults
        },

        // ----- Path Spawner: Street Lamps Along Road -----
        {
          type: 'composite',
          name: 'street_lamps',
          placement: {
            type: 'polyline',
            params: {
              path: {
                type: 'polyline',
                params: {
                  points: mainRoad,
                  closed: false,
                },
              },
              spacing: 15,
              offset: 4,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'streetlamp' }
          }
          // heightField inherited from spawnerDefaults
        },

        // ----- Points Spawner: Village Center -----
        {
          name: 'village_center',
          type: 'composite',
          placement: {
            type: 'points',
            params: {
              positions: [
                { x: 0, y: 0, z: 0 }
              ]
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'well' }
          }
          // heightField inherited from spawnerDefaults
        },

        // ----- Scatter: Cottages Near Road -----
        // Phase 4: Uses excludeSpawner to avoid village center
        {
          name: 'cottages',
          type: 'composite',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-60, 60], z: [-40, 40] },
              count: 15,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'cottage' }
          },
          constraints: [
            // Keep near road but not on it
            { type: 'pathDistance', path: { type: 'polyline', params: { points: mainRoad.map(p => ({ ...p, y: 0 })), closed: false } }, min: 8, max: 25 },
            // Keep away from well (Phase 4: excludeSpawner constraint)
            { type: 'excludeSpawner', spawner: 'village_center', radius: 8 }
          ],
          transform: {
            ry: { min: 0, max: Math.PI * 2 }
          }
          // heightField inherited from spawnerDefaults
        },

        // ----- Conditional Scatter: Flowers Based on Moisture -----
        // Phase 4: Uses excludeSpawner to avoid cottages
        {
          name: 'wildflowers',
          type: 'composite',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-80, 80], z: [-50, 50] },
              count: 200
            }
          },
          selection: {
            type: 'conditional',
            params: {
              conditions: [
                {
                  condition: {
                    type: 'compare',
                    params: {
                      operator: 'gte',
                      left: {
                        type: 'query',
                        params: {
                          query: 'fieldSample',
                          params: { field: 'moisture', normalize01: true }
                        }
                      },
                      right: { type: 'literal', params: { value: 0.6 } }
                    }
                  },
                  entity: 'flower_yellow'
                },
                {
                  condition: {
                    type: 'compare',
                    params: {
                      operator: 'lte',
                      left: {
                        type: 'query',
                        params: {
                          query: 'fieldSample',
                          params: { field: 'moisture', normalize01: true }
                        }
                      },
                      right: { type: 'literal', params: { value: 0.4 } }
                    }
                  },
                  entity: 'flower_red'
                },
                { condition: { type: 'always', params: {} }, entity: 'bush', fallback: 'bush' }
              ]
            }
          },
          constraints: [
            // Keep away from road
            { type: 'pathDistance', path: { type: 'polyline', params: { points: mainRoad.map(p => ({ ...p, y: 0 })), closed: false } }, min: 5 },
            // Keep away from cottages (Phase 4 feature)
            { type: 'excludeSpawner', spawner: 'cottages', radius: 5 }
          ],
          transform: {
            scale: { min: 0.6, max: 1.2 }
          }
          // heightField inherited from spawnerDefaults
        },

        // ----- Scatter: Bushes Along Road Edges -----
        {
          name: 'roadside_bushes',
          type: 'composite',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-70, 70], z: [-10, 10] },
              count: 50,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'bush' }
          },
          constraints: [
            { type: 'pathDistance', path: { type: 'polyline', params: { points: mainRoad.map(p => ({ ...p, y: 0 })), closed: false } }, min: 3, max: 6 }
          ],
          transform: {
            scale: { min: 0.5, max: 1.0 }
          }
          // heightField inherited from dimension terrain settings
        }
      ].map(({ type, ...params }) => ({ type, params }))
    });

    // Spawn terrain using displaced plane that matches the dimension terrain settings
    spawn({
      Info: { name: 'Ground' },
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
                field: 'terrain'  // Same field as dimension terrain settings
              }
            },
            material: {
              type: 'solid',
              params: { color: '#7CFC00', roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Spawn player
    spawn('player', {
      Transform: { x: -50, y: 15, z: 0 },
      Health: { value: 100 }
    });
  }
};
