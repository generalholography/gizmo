/**
 * Procedural Forest - Production-Ready Spawner Showcase
 *
 * A rich procedural forest demonstrating advanced spawner capabilities
 * for natural environment generation:
 *
 * Spawner Types Demonstrated:
 * - Cluster spawners: Mushroom patches, rock formations, flower meadows
 * - Custom spawners with Poisson distribution: Natural tree placement
 * - Path spawners: Hiking trails with markers
 * - Scatter spawners: Ambient vegetation and wildlife
 * - Formation spawners: Standing stone circles
 *
 * Advanced Features Demonstrated:
 * - Conditional entity selection based on noise/altitude
 * - Multiple noise fields for biome blending
 * - Cluster separation and grouping
 * - Poisson disk sampling for natural spacing
 * - Weighted entity selection
 * - Height field projection
 * - Transform variations (scale, rotation)
 */

export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // ========================================================================
    // TERRAIN AND FIELDS - Multiple noise layers for biome variation
    // ========================================================================

    const terrainSize = 300;

    // Primary terrain height
    fields.register('terrain_height', {
      type: 'composite',
      params: {
        blend: 'add',
        fields: [
          {
            type: 'simplex',
            params: { seed: 42, frequency: 0.03, amplitude: 20, octaves: 4 }
          },
          {
            type: 'simplex',
            params: { seed: 43, frequency: 0.08, amplitude: 8, octaves: 2 }
          }
        ]
      }
    });

    // Forest density - controls tree distribution
    fields.register('forest_density', {
      type: 'simplex',
      params: {
        seed: 123,
        frequency: 0.05,
        amplitude: 1.0,
        octaves: 3
      }
    });

    // Moisture field - affects vegetation type
    fields.register('moisture', {
      type: 'simplex',
      params: {
        seed: 456,
        frequency: 0.04,
        amplitude: 1.0,
        octaves: 2
      }
    });

    // Rocky areas
    fields.register('rock_density', {
      type: 'simplex',
      params: {
        seed: 789,
        frequency: 0.06,
        amplitude: 1.0,
        octaves: 2
      }
    });

    // ========================================================================
    // ARCHETYPES - TREES
    // ========================================================================

    archetypes.register('pine_tree', {
      type: 'bundle',
      params: {
        Info: { name: 'Pine Tree' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Trunk
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 8, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#5D4E37' } }
              },
              // Lower foliage
              {
                geometry: { type: 'cone', params: { radius: 2.5, height: 4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#2D5A27' } },
                localPosition: [0, 4, 0]
              },
              // Middle foliage
              {
                geometry: { type: 'cone', params: { radius: 2, height: 3.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#357A38' } },
                localPosition: [0, 6.5, 0]
              },
              // Top foliage
              {
                geometry: { type: 'cone', params: { radius: 1.5, height: 3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#3D8B40' } },
                localPosition: [0, 9, 0]
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
              // Trunk
              {
                geometry: { type: 'cylinder', params: { radius: 0.5, height: 4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6B4423' } }
              },
              // Main canopy
              {
                geometry: { type: 'sphere', params: { radius: 3.5 } },
                material: { type: 'solid', params: { color: '#4A7C31' } },
                localPosition: [0, 6, 0]
              },
              // Secondary canopy
              {
                geometry: { type: 'sphere', params: { radius: 2.5 } },
                material: { type: 'solid', params: { color: '#5A8C41' } },
                localPosition: [1.5, 5, 1]
              },
              {
                geometry: { type: 'sphere', params: { radius: 2 } },
                material: { type: 'solid', params: { color: '#5A8C41' } },
                localPosition: [-1.5, 5.5, -0.5]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('birch_tree', {
      type: 'bundle',
      params: {
        Info: { name: 'Birch Tree' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // White trunk
              {
                geometry: { type: 'cylinder', params: { radius: 0.25, height: 7, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#F5F5DC' } }
              },
              // Foliage clusters
              {
                geometry: { type: 'sphere', params: { radius: 2 } },
                material: { type: 'solid', params: { color: '#90EE90' } },
                localPosition: [0, 7, 0]
              },
              {
                geometry: { type: 'sphere', params: { radius: 1.5 } },
                material: { type: 'solid', params: { color: '#98FB98' } },
                localPosition: [1, 6, 0.5]
              },
              {
                geometry: { type: 'sphere', params: { radius: 1.5 } },
                material: { type: 'solid', params: { color: '#98FB98' } },
                localPosition: [-0.8, 6.5, -0.5]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('dead_tree', {
      type: 'bundle',
      params: {
        Info: { name: 'Dead Tree' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Main trunk
              {
                geometry: { type: 'cylinder', params: { radius: 0.4, height: 5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4A4A4A' } }
              },
              // Broken branches
              {
                geometry: { type: 'cylinder', params: { radius: 0.15, height: 2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#3A3A3A' } },
                localPosition: [0.3, 3, 0],
                localRotation: [0.5, 0, 0.3]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.12, height: 1.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#3A3A3A' } },
                localPosition: [-0.2, 4, 0],
                localRotation: [-0.3, 0, -0.5]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ========================================================================
    // ARCHETYPES - VEGETATION
    // ========================================================================

    archetypes.register('red_mushroom', {
      type: 'bundle',
      params: {
        Info: { name: 'Red Mushroom' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#F5F5DC' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.2 } },
                material: { type: 'solid', params: { color: '#DC143C' } },
                localPosition: [0, 0.35, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('brown_mushroom', {
      type: 'bundle',
      params: {
        Info: { name: 'Brown Mushroom' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.06, height: 0.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#F5F5DC' } }
              },
              {
                geometry: { type: 'cone', params: { radius: 0.18, height: 0.15, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B4513' } },
                localPosition: [0, 0.22, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('fern', {
      type: 'bundle',
      params: {
        Info: { name: 'Fern' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cone', params: { radius: 0.5, height: 0.8, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'cone', params: { radius: 0.4, height: 0.6, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#2E8B2E' } },
                localPosition: [0.15, 0.1, 0.1],
                localRotation: [0.2, 0.3, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('wildflower_yellow', {
      type: 'bundle',
      params: {
        Info: { name: 'Yellow Wildflower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.1 } },
                material: { type: 'solid', params: { color: '#FFD700' } },
                localPosition: [0, 0.45, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('wildflower_purple', {
      type: 'bundle',
      params: {
        Info: { name: 'Purple Wildflower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.35, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.08 } },
                material: { type: 'solid', params: { color: '#9370DB' } },
                localPosition: [0, 0.4, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('wildflower_white', {
      type: 'bundle',
      params: {
        Info: { name: 'White Wildflower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#228B22' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.12 } },
                material: { type: 'solid', params: { color: '#FFFAFA' } },
                localPosition: [0, 0.35, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ========================================================================
    // ARCHETYPES - ROCKS AND LANDMARKS
    // ========================================================================

    archetypes.register('boulder', {
      type: 'bundle',
      params: {
        Info: { name: 'Boulder' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'icosahedron', params: { radius: 1.2 } },
              material: { type: 'solid', params: { color: '#696969', roughness: 0.9 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('small_rock', {
      type: 'bundle',
      params: {
        Info: { name: 'Rock' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'icosahedron', params: { radius: 0.5 } },
              material: { type: 'solid', params: { color: '#808080', roughness: 0.95 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('standing_stone', {
      type: 'bundle',
      params: {
        Info: { name: 'Standing Stone' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: 1, lengthY: 4, lengthZ: 0.6, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#505050', roughness: 0.8 } }
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

    archetypes.register('fallen_log', {
      type: 'bundle',
      params: {
        Info: { name: 'Fallen Log' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.4, height: 4, pivot: 'center' } },
              material: { type: 'solid', params: { color: '#5D4E37' } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // ========================================================================
    // ARCHETYPES - WILDLIFE
    // ========================================================================

    archetypes.register('deer', {
      type: 'bundle',
      params: {
        Info: { name: 'Deer' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Body
              {
                geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.8, lengthZ: 1.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#D2691E' } }
              },
              // Head
              {
                geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.4, lengthZ: 0.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#D2691E' } },
                localPosition: [0, 0.6, 0.8]
              },
              // Antlers
              {
                geometry: { type: 'cylinder', params: { radius: 0.05, height: 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B4513' } },
                localPosition: [0.1, 1, 1],
                localRotation: [-0.3, 0, 0.3]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.05, height: 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8B4513' } },
                localPosition: [-0.1, 1, 1],
                localRotation: [-0.3, 0, -0.3]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 4 } },
        AI: { isAggressive: false, awarenessRange: 30 }
      }
    });

    archetypes.register('rabbit', {
      type: 'bundle',
      params: {
        Info: { name: 'Rabbit' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 0.2 } },
                material: { type: 'solid', params: { color: '#D2B48C' } },
                localPosition: [0, 0.2, 0]
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.12 } },
                material: { type: 'solid', params: { color: '#D2B48C' } },
                localPosition: [0, 0.35, 0.15]
              },
              // Ears
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#DEB887' } },
                localPosition: [0.05, 0.45, 0.15]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#DEB887' } },
                localPosition: [-0.05, 0.45, 0.15]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 6 } },
        AI: { isAggressive: false, awarenessRange: 15 }
      }
    });

    // ========================================================================
    // PATH DEFINITIONS
    // ========================================================================

    // Main hiking trail through the forest
    const hikingTrail = [
      { x: -120, z: -100 },
      { x: -80, z: -60 },
      { x: -40, z: -40 },
      { x: 0, z: -20 },
      { x: 30, z: 10 },
      { x: 20, z: 50 },
      { x: -20, z: 80 },
      { x: -60, z: 100 },
      { x: -100, z: 90 }
    ];

    // Secondary nature trail
    const natureTrail = [
      { x: 50, z: -80 },
      { x: 80, z: -40 },
      { x: 100, z: 0 },
      { x: 90, z: 40 },
      { x: 60, z: 70 }
    ];

    // ========================================================================
    // INITIALIZE WITH SPAWNERS
    // ========================================================================

    initialize({
      title: 'Enchanted Forest',
      description: 'Explore a procedurally generated forest with diverse biomes, wildlife, and mysterious stone circles. Follow the trails to discover hidden clearings and scenic viewpoints.',
      tags: ['exploration', 'nature', 'procedural', 'forest'],
      brandColors: ['#2D5A27', '#4A7C31'],

      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: true,
        sky: {
          color: '#87CEEB',
          sun: {
            color: '#FFEEDD',
            intensity: 0.8,
            timeOfDay: 1000
          },
          clouds: {
            color: '#FFFFFF',
            coverage: 0.4
          },
          stars: {
            intensity: 0.1
          }
        },
        terrain: {
          heightField: 'terrain_height',
          size: terrainSize,
          heightOffset: 0.2
        }
      }],

      achievements: [
        {
          name: 'Forest Explorer',
          description: 'Walk 200 meters through the forest.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'distance moved',
              targetValue: 200
            }
          }
        },
        {
          name: 'Stone Circle Discoverer',
          description: 'Find the ancient stone circle.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Stone Circle Center',
              targetValue: 1
            }
          }
        },
        {
          name: 'Wildlife Watcher',
          description: 'Spot 3 deer in the forest.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Deer',
              targetValue: 3
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
        // TREES - Poisson Distribution for Natural Spacing
        // ================================================================

        // Main forest trees using Poisson disk sampling
        {
          name: 'forest_trees',
          type: 'composite',
          placement: {
            type: 'poisson',
            params: {
              bounds: { x: [-130, 130], z: [-130, 130] },
              minDistance: 6
            }
          },
          selection: {
            type: 'conditional',
            params: {
              conditions: [
                // High moisture areas get birch trees
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
                      right: { type: 'literal', params: { value: 0.5 } }
                    }
                  },
                  entity: 'birch_tree'
                },
                // Dense forest areas get pine trees
                {
                  condition: {
                    type: 'compare',
                    params: {
                      operator: 'gte',
                      left: {
                        type: 'query',
                        params: {
                          query: 'fieldSample',
                          params: { field: 'forest_density', normalize01: true }
                        }
                      },
                      right: { type: 'literal', params: { value: 0.4 } }
                    }
                  },
                  entity: 'pine_tree'
                },
                // Low density areas might get dead trees
                {
                  condition: {
                    type: 'compare',
                    params: {
                      operator: 'lte',
                      left: {
                        type: 'query',
                        params: {
                          query: 'fieldSample',
                          params: { field: 'forest_density', normalize01: true }
                        }
                      },
                      right: { type: 'literal', params: { value: -0.3 } }
                    }
                  },
                  entity: 'dead_tree'
                }
              ]
            }
          },
          constraints: [
            // Keep trees away from center clearing
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 25 },
            // Keep away from trails
            { type: 'pathDistance', path: { type: 'polyline', params: { points: hikingTrail.map(p => ({ ...p, y: 0 })), closed: false } }, min: 4 },
            { type: 'pathDistance', path: { type: 'polyline', params: { points: natureTrail.map(p => ({ ...p, y: 0 })), closed: false } }, min: 4 }
          ],
          transform: {
            ry: { min: 0, max: Math.PI * 2 },
            scale: { min: 0.7, max: 1.4 }
          }
        },

        // Oak trees in scattered locations
        {
          type: 'composite',
          name: 'oak_grove',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-120, 120], z: [-120, 120] },
              count: 40,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'oak_tree' }
          },
          spawnChance: 0.6,
          constraints: [
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 30 },
            { type: 'excludeSpawner', spawner: 'forest_trees', radius: 8 },
            { type: 'noise', field: 'moisture', min: 0.3 }
          ],
          transform: {
            scale: { min: 0.8, max: 1.3 },
            ry: { min: 0, max: Math.PI * 2 }
          }
        },

        // ================================================================
        // MUSHROOM PATCHES - Cluster Spawners
        // ================================================================

        // Red mushroom clusters in shady areas
        {
          type: 'composite',
          name: 'red_mushroom_patches',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 15,
              perCluster: { min: 8, max: 20 },
              clusterRadius: 3,
              bounds: { x: [-110, 110], z: [-110, 110] },
              clusterSeparation: 20,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'red_mushroom' }
          },
          constraints: [
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 15 },
            { type: 'noise', field: 'forest_density', min: 0.3 }
          ],
          transform: {
            ry: { min: 0, max: Math.PI * 2 },
            scale: { min: 0.6, max: 1.4 }
          }
        },

        // Brown mushroom clusters
        {
          type: 'composite',
          name: 'brown_mushroom_patches',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 12,
              perCluster: { min: 5, max: 15 },
              clusterRadius: 2.5,
              bounds: { x: [-100, 100], z: [-100, 100] },
              clusterSeparation: 25,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'brown_mushroom' }
          },
          constraints: [
            { type: 'noise', field: 'moisture', min: 0.2 }
          ],
          transform: {
            scale: { min: 0.5, max: 1.2 }
          }
        },

        // ================================================================
        // ROCK FORMATIONS - Cluster Spawners
        // ================================================================

        // Boulder clusters
        {
          type: 'composite',
          name: 'boulder_formations',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 8,
              perCluster: { min: 3, max: 7 },
              clusterRadius: 6,
              bounds: { x: [-120, 120], z: [-120, 120] },
              clusterSeparation: 30,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'boulder' }
          },
          constraints: [
            { type: 'noise', field: 'rock_density', min: 0.4 }
          ],
          transform: {
            rx: { min: -0.2, max: 0.2 },
            rz: { min: -0.2, max: 0.2 },
            scale: { min: 0.5, max: 1.5 }
          }
        },

        // Small rocks scattered
        {
          type: 'composite',
          name: 'scattered_rocks',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-125, 125], z: [-125, 125] },
              count: 150,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'small_rock' }
          },
          spawnChance: 0.5,
          constraints: [
            { type: 'noise', field: 'rock_density', min: 0.2 }
          ],
          transform: {
            scale: { min: 0.3, max: 1.0 },
            rx: { min: -0.4, max: 0.4 },
            rz: { min: -0.4, max: 0.4 }
          }
        },

        // ================================================================
        // FLOWER MEADOWS - Cluster and Scatter
        // ================================================================

        // Yellow wildflower meadows (in sunny clearings)
        {
          type: 'composite',
          name: 'yellow_flower_meadows',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 10,
              perCluster: { min: 20, max: 50 },
              clusterRadius: 8,
              bounds: { x: [-80, 80], z: [-80, 80] },
              clusterSeparation: 25,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'wildflower_yellow' }
          },
          constraints: [
            { type: 'excludeSpawner', spawner: 'forest_trees', radius: 5 },
            { type: 'noise', field: 'forest_density', min: -0.2 }
          ],
          transform: {
            scale: { min: 0.6, max: 1.2 }
          }
        },

        // Purple wildflowers near moisture
        {
          type: 'composite',
          name: 'purple_flowers',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-100, 100], z: [-100, 100] },
              count: 200,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'wildflower_purple' }
          },
          spawnChance: 0.6,
          constraints: [
            { type: 'noise', field: 'moisture', min: 0.4 }
          ],
          transform: {
            scale: { min: 0.7, max: 1.1 }
          }
        },

        // White flowers scattered
        {
          type: 'composite',
          name: 'white_flowers',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-90, 90], z: [-90, 90] },
              count: 150,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'wildflower_white' }
          },
          spawnChance: 0.5,
          constraints: [
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, max: 70 }
          ],
          transform: {
            scale: { min: 0.6, max: 1.0 }
          }
        },

        // ================================================================
        // FERNS - Dense understory vegetation
        // ================================================================

        {
          type: 'composite',
          name: 'forest_ferns',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-120, 120], z: [-120, 120] },
              count: 300,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'fern' }
          },
          spawnChance: 0.7,
          constraints: [
            { type: 'pathDistance', path: { type: 'polyline', params: { points: hikingTrail.map(p => ({ ...p, y: 0 })), closed: false } }, min: 2 },
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 20 },
            { type: 'noise', field: 'moisture', min: 0.2 }
          ],
          transform: {
            scale: { min: 0.5, max: 1.3 },
            ry: { min: 0, max: Math.PI * 2 }
          }
        },

        // ================================================================
        // FALLEN LOGS - Scattered
        // ================================================================

        {
          type: 'composite',
          name: 'fallen_logs',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-110, 110], z: [-110, 110] },
              count: 25,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'fallen_log' }
          },
          spawnChance: 0.8,
          constraints: [
            { type: 'pathDistance', path: { type: 'polyline', params: { points: hikingTrail.map(p => ({ ...p, y: 0 })), closed: false } }, min: 5 },
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 30 }
          ],
          transform: {
            rx: Math.PI / 2, // Lay flat
            ry: { min: 0, max: Math.PI * 2 },
            scale: { min: 0.7, max: 1.5 }
          }
        },

        // ================================================================
        // TRAIL MARKERS - Path Spawners
        // ================================================================

        // Main hiking trail markers
        {
          type: 'composite',
          name: 'hiking_trail_markers',
          placement: {
            type: 'polyline',
            params: {
              path: {
                points: hikingTrail.map(p => ({ ...p, y: 0 })),
                closed: false,
              },
              spacing: 15,
              alignToPath: true,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'trail_marker' }
          }
        },

        // Nature trail markers
        {
          type: 'composite',
          name: 'nature_trail_markers',
          placement: {
            type: 'polyline',
            params: {
              path: {
                points: natureTrail.map(p => ({ ...p, y: 0 })),
                closed: false,
              },
              spacing: 12,
              alignToPath: true,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'trail_marker' }
          }
        },

        // ================================================================
        // STANDING STONE CIRCLE - Formation Spawner
        // ================================================================

        {
          type: 'composite',
          name: 'stone_circle',
          placement: {
            type: 'circle',
            params: {
              center: { x: 0, y: 0, z: 0 },
              count: 12,
              radius: 15,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'standing_stone' }
          },
          transform: {
            ry: 0, // Face outward from center
            scale: { min: 0.9, max: 1.2 }
          }
        },

        // ================================================================
        // WILDLIFE - Scatter Spawners
        // ================================================================

        // Deer in small groups
        {
          type: 'composite',
          name: 'deer_herds',
          placement: {
            type: 'cluster',
            params: {
              clusterCount: 4,
              perCluster: { min: 2, max: 4 },
              clusterRadius: 10,
              bounds: { x: [-100, 100], z: [-100, 100] },
              clusterSeparation: 50,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'deer' }
          },
          constraints: [
            { type: 'distance', from: { x: 0, y: 0, z: 0 }, min: 40 }
          ]
        },

        // Rabbits scattered
        {
          type: 'composite',
          name: 'rabbits',
          placement: {
            type: 'random',
            params: {
              bounds: { x: [-80, 80], z: [-80, 80] },
              count: 15,
            }
          },
          selection: {
            type: 'single',
            params: { entity: 'rabbit' }
          },
          spawnChance: 0.8,
          constraints: [
            { type: 'excludeSpawner', spawner: 'deer_herds', radius: 20 }
          ]
        }
      ].map(({ type, ...params }) => ({ type, params }))
    });

    // ========================================================================
    // STATIC SPAWNS
    // ========================================================================

    // Forest floor
    spawn({
      Info: { name: 'Forest Floor' },
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
              params: { color: '#3D6B30', roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Stone circle center marker (for discovery)
    spawn({
      Info: { name: 'Stone Circle Center' },
      Transform: { x: 0, y: 0.1, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'cylinder', params: { radius: 3, height: 0.1, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#505050' } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'entityInRange' }, cooldown: 5, actions: [
          { type: 'discover', params: {}, target: 'self' }
        ] }]
    });

    // Player spawn at trail start
    spawn('player', {
      Transform: { x: -110, y: 25, z: -95 },
      Health: { value: 100 }
    });
  }
};
