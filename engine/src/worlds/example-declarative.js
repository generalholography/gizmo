/**
 * Example World Using Declarative Initialization
 * 
 * This demonstrates the new world initialization system which provides
 * a declarative, serializable approach to world setup - analogous to
 * how entities are spawned declaratively.
 */

export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    // Define the world declaratively
    const worldDefinition = {
      // World title, description, and metadata (top-level fields)
      title: 'Declarative Example World',
      description: 'A demonstration of the new world initialization system',
      tags: ['example', 'tutorial', 'declarative'],
      brandColors: ['#4a90e2', '#7ed321'],
      
      // Dimensions (top-level field, no longer nested in metadata)
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87CEEB',
          sun: {
            color: '#FFEEDD',
            intensity: 1.0,
            timeOfDay: 1000
          },
          clouds: {
            color: '#FFFFFF',
            coverage: 0.4
          },
          stars: {
            intensity: 0.0
          }
        }
      }],

      // Achievement definitions (array format with name field)
      achievements: [
        {
          name: 'First Steps',
          description: 'Move for the first time',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'distance moved',
              targetValue: 1
            }
          }
        },
        {
          name: 'Explorer',
          description: 'Discover 3 landmarks',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Landmark',
              targetValue: 3
            }
          }
        },
        {
          name: 'Collector',
          description: 'Pick up 5 items',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              targetValue: 5
            }
          }
        }
      ]

      // Note: entities can also be defined here, but for demonstration
      // we'll spawn them manually below to show the hybrid approach
    };

    // Initialize world with declarative definition
    initialize(worldDefinition);

    // Spawn entities (can be done declaratively or imperatively)
    // Terrain
    spawn({
      Info: { name: 'Ground' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'box',
              params: { lengthX: 100, lengthY: 1, lengthZ: 100, pivot: 'center' }
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

    // Landmark 1
    spawn({
      Info: {
        name: 'Ancient Obelisk',
        description: 'A mysterious stone monument'
      },
      Transform: { x: 10, y: 2, z: 10 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'box',
              params: { lengthX: 1, lengthY: 4, lengthZ: 1, pivot: 'bottom' }
            },
            material: {
              type: 'solid',
              params: { color: '#808080', roughness: 0.8 }
            }
          }]
        }
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'discover',
          target: 'self'
        }, {
          type: 'popup',
          target: 'other',
          params: { text: 'You discovered an ancient obelisk!' }
        }] }],
      MotionSource: { type: 'static', params: {} }
    });

    // Landmark 2
    spawn({
      Info: {
        name: 'Crystal Formation',
        description: 'Glowing blue crystals'
      },
      Transform: { x: -15, y: 1.5, z: 20 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'pyramid',
              params: { width: 2, height: 3, depth: 2, pivot: 'bottom' }
            },
            material: {
              type: 'solid',
              params: { color: '#4a90e2', roughness: 0.2, metalness: 0.8 }
            }
          }]
        }
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'discover',
          target: 'self'
        }, {
          type: 'popup',
          target: 'other',
          params: { text: 'Beautiful crystals shimmer in the light.' }
        }] }],
      MotionSource: { type: 'static', params: {} }
    });

    // Landmark 3
    spawn({
      Info: {
        name: 'Ancient Tree',
        description: 'A massive old tree'
      },
      Transform: { x: 0, y: 5, z: -25 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              tag: 'trunk',
              geometry: {
                type: 'cylinder',
                params: { radius: 1.5, height: 10, pivot: 'bottom' }
              },
              material: {
                type: 'solid',
                params: { color: '#8b4513', roughness: 1.0 }
              },
              children: [{
                geometry: {
                  type: 'sphere',
                  params: { radius: 5, pivot: 'center' }
                },
                material: {
                  type: 'solid',
                  params: { color: '#228b22' }
                },
                localPosition: [0, 12, 0]
              }]
            }
          ]
        }
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'discover',
          target: 'self'
        }, {
          type: 'popup',
          target: 'other',
          params: { text: 'This tree has stood here for centuries.' }
        }] }],
      MotionSource: { type: 'static', params: {} }
    });

    // Collectible items
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      spawn({
        Info: {
          name: `Gem ${i + 1}`,
          description: 'A sparkling gemstone'
        },
        Transform: { x, y: 0.5, z },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: {
                type: 'icosahedron',
                params: { radius: 0.5, pivot: 'center' }
              },
              material: {
                type: 'solid',
                params: {
                  color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][i],
                  metalness: 0.9,
                  roughness: 0.1
                }
              }
            }]
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [{
            type: 'getPickedUp',
            target: 'self'
          }] }],
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Demonstration: You can serialize the world at any time
    // Uncomment to see the serialized output in console
    /*
    setTimeout(() => {
      const serialized = serializeWorld(ecsWorld, { includeRuntime: true });
      console.log('Serialized world state:', JSON.stringify(serialized, null, 2));
    }, 5000);
    */
  }
};
