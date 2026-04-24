export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    // Resources and modules
    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // World initialization - Mars environment
    initialize({
      title: 'Mars Colony - Red Planet Expedition',
      description: 'Explore the red planet with its habitats, alien caves, and hostile environment. Manage resources and survive on Mars.',
      tags: ['sci-fi', 'mars', 'survival'],
      brandColors: ['#d2691e', '#ffa500'],
      dimensions: [{
        name: 'Mars',
        gravity: -3.71, // Mars gravity is about 38% of Earth's
        useDayNightCycle: false,
        sky: {
          color: '#d2691e', // Orange Mars sky
          sun: {
            color: '#FFA500',
            intensity: 0.7,
            timeOfDay: 1200 // Noon on Mars
          },
          clouds: {
            color: '#cd853f',
            coverage: 0.0 // No clouds on Mars
          },
          stars: {
            intensity: 0.0
          }
        },
        particleSystems: [{
          name: 'Red Dust Drift',
          position: [0, 12, 0],
          emitter: {
            rate: 140,
            maxParticles: 1600,
            lifetime: 5,
            speed: { min: 0.6, max: 1.4 },
            spread: 0.5,
            size: 0.12,
            opacity: 0.5,
            gravity: 0.05,
            color: '#c46a3a',
            direction: [0.4, -0.4, 0.2],
            shape: { type: 'box', size: [220, 4, 220] },
            localSpace: false
          }
        }]
      }],
      achievements: [
        {
          name: 'Mars Explorer',
          description: 'Discover the Mars Base.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Mars Base',
              targetValue: 1
            }
          }
        },
        {
          name: 'Cave Explorer',
          description: 'Discover the alien cave system.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Alien Cave',
              targetValue: 1
            }
          }
        },
        {
          name: 'Alien Hunter',
          description: 'Defeat the alien and collect plasmoid.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Plasmoid',
              targetValue: 1
            }
          }
        },
        {
          name: 'Resource Gatherer',
          description: 'Collect 5 ore or ice items.',
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'items picked up', subtype: 'Ore' },
                { metric: 'items picked up', subtype: 'Ice' }
              ],
              targetValue: 5
            }
          }
        },
        {
          name: 'Rover Mechanic',
          description: 'Fix a broken rover.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'entities killed',
              subtype: 'Broken Rover',
              targetValue: 1
            }
          }
        }
      ]
    });

    // Mars terrain generation
    const seed = Math.floor(Math.random() * 100000) | 0;
    const terrainSize = 500; // Very large as requested

    // Create rocky, uneven Mars terrain
    const marsHeight = fields.register('mars_height', {
      type: 'composite',
      params: {
        blend: 'add',
        fields: [
          {
            type: 'simplex',
            params: { seed, frequency: 0.4, amplitude: 15, octaves: 4 }
          },
          {
            type: 'simplex',
            params: { seed: seed + 47, frequency: 0.08, amplitude: 8, octaves: 3 }
          },
          {
            type: 'simplex',
            params: { seed: seed + 123, frequency: 0.15, amplitude: 4, octaves: 2 }
          }
        ]
      }
    });

    // Rocky distribution for scattered rocks
    const rockMask = fields.register('mars_rocks', {
      type: 'simplex',
      params: { seed: seed + 200, frequency: 0.35, amplitude: 1.0, octaves: 3 }
    });

    // Ore distribution
    const oreMask = fields.register('mars_ore', {
      type: 'simplex',
      params: { seed: seed + 300, frequency: 0.25, amplitude: 1.0, octaves: 2 }
    });

    // Mars terrain - rocky orange surface
    spawn({
      Info: { name: 'Mars Surface' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'displacedPlane',
              params: { lengthX: terrainSize, lengthZ: terrainSize, field: 'mars_height' }
            },
            material: { type: 'solid', params: { color: '#cd853f', roughness: 1.0 } } // Rocky orange
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Rock archetype for scattered rocks
    archetypes.register('marsRock', {
      params: {
        Info: { name: 'Mars Rock' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'icosahedron', params: { radius: 0.6 + Math.random() * 0.8 } },
                material: { type: 'solid', params: { color: '#a0522d', roughness: 1.0 } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Ore cluster archetype
    archetypes.register('oreCluster', {
      params: {
        Info: { name: 'Ore Cluster' },
        Health: { value: 25 }, // High HP as requested
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'icosahedron', params: { radius: 1.2 } },
                material: { type: 'solid', params: { color: '#8b4513', roughness: 0.8 } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.3 } },
                material: { type: 'solid', params: { color: '#ff6347' } },
                localPosition: [0.5, 0.5, 0]
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.2 } },
                material: { type: 'solid', params: { color: '#ff6347' } },
                localPosition: [-0.4, 0.3, 0.3]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        // Note: OnDeath component not yet supported, ore drops will be handled differently
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 1.0, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'oreItem' } },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    // Ice cluster archetype
    archetypes.register('iceCluster', {
      params: {
        Info: { name: 'Ice Cluster' },
        Health: { value: 20 }, // High HP as requested
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'icosahedron', params: { radius: 1.0 } },
                material: { type: 'solid', params: { color: '#b0e0e6', roughness: 0.2, opacity: 0.8 } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.4 } },
                material: { type: 'solid', params: { color: '#87ceeb', opacity: 0.7 } },
                localPosition: [0.3, 0.4, 0.2]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        // Note: OnDeath component not yet supported, ice drops will be handled differently
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 1.0, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'iceItem' } },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    // Ore item (pickup)
    const oreItem = {
      Info: { name: 'Ore' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'icosahedron', params: { radius: 0.15 } },
              material: { type: 'solid', params: { color: '#ff6347' } }
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.3 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
    };
    archetypes.register('oreItem', { params: oreItem });

    // Ice item (pickup)
    const iceItem = {
      Info: { name: 'Ice' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'icosahedron', params: { radius: 0.12 } },
              material: { type: 'solid', params: { color: '#87ceeb', opacity: 0.8 } }
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.2 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
    };
    archetypes.register('iceItem', { params: iceItem });

    // Habitat base locations (in the middle of the world)
    const habitatCenterX = 0;
    const habitatCenterZ = 0;
    const habitatBaseY = marsHeight.sample3D(habitatCenterX / terrainSize, 0, habitatCenterZ / terrainSize);

    // Base module coordinates (for placing items later)
    const greenhouseX = habitatCenterX - 25;
    const greenhouseZ = habitatCenterZ;
    const greenhouseY = habitatBaseY + 3;
    const labX = habitatCenterX + 5;
    const labZ = habitatCenterZ;
    const labY = habitatBaseY + 3;
    const storageX = habitatCenterX + 5;
    const storageZ = habitatCenterZ + 30;
    const storageY = habitatBaseY + 3;

    // Single Mars Base entity with connected tubes and interiors
    spawn({
      Info: { name: 'Mars Base' },
      Transform: { x: labX, y: labY, z: labZ }, // use lab as the base origin
      Body: {
        type: 'composite',
        params: {
          hasInterior: true,
          parts: [
            // Hub (lab) dome at origin
            {
              geometry: { type: 'cylinder', params: { radius: 11, height: 4, pivot: "bottom" } },
              material: { type: 'solid', params: { color: '#e6e6e6', roughness: 0.9 } }
            },
            {
              geometry: { type: 'hemisphere', params: { radius: 10, pivot: "bottom" } },
              material: { type: 'solid', params: { color: '#ADD8E6', opacity: 0.6, roughness: 0.1 } },
              localPosition: [0, 3, 0]
            },
            // Greenhouse dome to the west
            {
              geometry: { type: 'cylinder', params: { radius: 11, height: 4, pivot: "bottom" } },
              material: { type: 'solid', params: { color: '#e6e6e6', roughness: 0.9 } },
              localPosition: [-30, 0, 0]
            },
            {
              geometry: { type: 'hemisphere', params: { radius: 10, pivot: "bottom" } },
              material: { type: 'solid', params: { color: '#ADD8E6', opacity: 0.6, roughness: 0.1 } },
              localPosition: [-30, 3, 0]
            },
            // Storage dome to the south
            {
              geometry: { type: 'cylinder', params: { radius: 11, height: 4, pivot: "bottom" } },
              material: { type: 'solid', params: { color: '#e6e6e6', roughness: 0.9 } },
              localPosition: [0, 0, 30]
            },
            {
              geometry: { type: 'hemisphere', params: { radius: 10, pivot: "bottom" } },
              material: { type: 'solid', params: { color: '#ADD8E6', opacity: 0.6, roughness: 0.1 } },
              localPosition: [0, 3, 30]
            },
            // Tube: Hub <-> Greenhouse (X axis)
            {
              geometry: { type: 'cylinder', params: { radius: 2, height: 19 } },
              material: { type: 'solid', params: { color: '#C0FFC0', opacity: 0.5, roughness: 0.2 } },
              localPosition: [-16, 2, 0],
              localRotation: [0, 0, Math.PI / 2]
            },
            // Tube: Hub <-> Storage (Z axis)
            {
              geometry: { type: 'cylinder', params: { radius: 2, height: 19 } },
              material: { type: 'solid', params: { color: '#FFF0C5', opacity: 0.5, roughness: 0.2 } },
              localPosition: [0, 2, 16.5],
              localRotation: [Math.PI / 2, 0, 0]
            },
            // Tube to airlock (north from hub)
            {
              geometry: { type: 'cylinder', params: { radius: 2, height: 11 } },
              material: { type: 'solid', params: { color: '#CCCCCC', opacity: 0.5, roughness: 0.2 } },
              localPosition: [0, 2, -12.5],
              localRotation: [Math.PI / 2, 0, 0]
            },
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
    });

    // Airlock doors for habitat entry/exit
    // Door archetype for airlocks
    archetypes.register('airlockDoor', {
      type: 'bundle',
      params: {
        Info: { name: 'Airlock Door' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 1.5, height: 0.3 } },
                material: { type: 'solid', params: { color: '#C0C0C0' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 2, lengthZ: 0.2 } },
                material: { type: 'solid', params: { color: '#FF0000' } },
                localPosition: [1, 1, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Single airlock pair at the end of the north tube
    spawn('airlockDoor', {
      // interior side (inside the tube near hub)
      Transform: { x: labX, y: labY + 2, z: labZ - 17.9, rx: Math.PI / 2 },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'teleport',
          params: { position: { x: labX, y: labY, z: labZ - 19 } },
          target: 'other'
        }] }]
    });
    spawn('airlockDoor', {
      // exterior side (just outside the tube end)
      Transform: { x: labX, y: labY + 2, z: labZ - 18.1, rx: Math.PI / 2 },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'teleport',
          params: { position: { x: labX, y: labY, z: labZ - 17 } },
          target: 'other'
        }] }]
    });

    spawn({
      Info: { name: 'Airlock Vent' },
      Transform: { x: labX, y: labY + 2.6, z: labZ - 19.4 },
      ParticleEmitter: {
        rate: 18,
        maxParticles: 160,
        lifetime: 3,
        speed: { min: 0.2, max: 0.6 },
        spread: 0.5,
        size: 0.14,
        opacity: 0.65,
        gravity: -0.05,
        color: '#b6d6ff',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 0.6 },
        localSpace: false
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Items for each habitat
    // Potato plant (heals 2 HP) - for greenhouse
    const potatoPlant = {
      Info: { name: 'Potato' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'sphere', params: { radius: 0.15 } },
              material: { type: 'solid', params: { color: '#DEB887' } }
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.2 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction' }, actions: [
          { type: 'heal', params: { amount: 2 }, target: 'user' },
          { type: 'kill', params: {}, target: 'self' }
        ] }]
    };
    archetypes.register('potatoPlant', { params: potatoPlant });

    // Medkit (heals when used) - for lab
    const medkit = {
      Info: { name: 'Medkit' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.1, lengthZ: 0.2 } },
              material: { type: 'solid', params: { color: '#FF0000' } }
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 0.02, lengthZ: 0.03 } },
              material: { type: 'solid', params: { color: '#FFFFFF' } },
              localPosition: [0, 0.06, 0]
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.03, lengthY: 0.02, lengthZ: 0.15 } },
              material: { type: 'solid', params: { color: '#FFFFFF' } },
              localPosition: [0, 0.06, 0]
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.3 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction' }, actions: [
          { type: 'heal', params: { amount: 10 }, target: 'user' },
          { type: 'kill', params: {}, target: 'self' }
        ] }]
    };
    archetypes.register('medkit', { params: medkit });

    // EVA suit (heals 1 HP with 1 second cooldown) - for lab
    const evaSuit = {
      Info: { name: 'EVA Suit' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 0.8, lengthY: 1.2, lengthZ: 0.3 } },
              material: { type: 'solid', params: { color: '#FFFFFF' } }
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.25 } },
              material: { type: 'solid', params: { color: '#000080', opacity: 0.7 } },
              localPosition: [0, 0.7, 0]
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 2.0 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction' }, cooldown: 1.0, actions: [
          { type: 'heal', params: { amount: 1 }, target: 'user' }
        ] }]
    };
    archetypes.register('evaSuit', { params: evaSuit });

    // Circuit board - for lab
    const circuitBoard = {
      Info: { name: 'Circuit Board' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.02, lengthZ: 0.15 } },
              material: { type: 'solid', params: { color: '#228B22' } }
            },
            {
              geometry: { type: 'cylinder', params: { radius: 0.01, height: 0.03 } },
              material: { type: 'solid', params: { color: '#FFD700' } },
              localPosition: [0.05, 0.015, 0.03]
            },
            {
              geometry: { type: 'cylinder', params: { radius: 0.01, height: 0.03 } },
              material: { type: 'solid', params: { color: '#FFD700' } },
              localPosition: [-0.05, 0.015, -0.03]
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.1 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
    };
    archetypes.register('circuitBoard', { params: circuitBoard });

    // Laser drill (1 damage, small cooldown) - for storage
    const laserDrill = {
      Info: { name: 'Laser Drill' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.2, lengthZ: 0.6 } },
              material: { type: 'solid', params: { color: '#696969' } }
            },
            {
              geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.4 } },
              material: { type: 'solid', params: { color: '#C0C0C0' } },
              localPosition: [0, 0, -0.5],
              localRotation: [Math.PI / 2, 0, 0]
            },
            {
              geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.1 } },
              material: { type: 'solid', params: { color: '#FF0000' } },
              localPosition: [0, 0, -0.7],
              localRotation: [Math.PI / 2, 0, 0]
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 1.5 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction', params: { range: 2 } }, cooldown: 0.05, actions: [
          { type: 'damage', params: { amount: 1 }, target: 'other', range: 2.0 }
        ] }]
    };
    archetypes.register('laserDrill', { params: laserDrill });

    // Rover archetypes
    // Broken rover
    archetypes.register('brokenRover', {
      type: 'bundle',
      params: {
        Info: { name: 'Broken Rover' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 0.8, lengthZ: 3 } },
                material: { type: 'solid', params: { color: '#8B0000' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [-1.2, 0, -1.2],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [1.2, 0, -1.2],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [-1.2, 0, 1.2],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [1.2, 0, 1.2],
                localRotation: [0, 0, Math.PI / 2]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'workingRover' } },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    // Working rover (rideable via characterController)
    archetypes.register('workingRover', {
      type: 'bundle',
      params: {
        Info: { name: 'Rover' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 0.8, lengthZ: 3 } },
                material: { type: 'solid', params: { color: '#FFD700' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [-1.2, 0, -1.2],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [1.2, 0, -1.2],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [-1.2, 0, 1.2],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.3 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [1.2, 0, 1.2],
                localRotation: [0, 0, Math.PI / 2]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 12, jumpHeight: 0, canFly: false } }
        // Note: Controller component for rideable functionality not yet supported
      }
    });

    // Spawn items in habitats
    // Greenhouse items
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetZ = (Math.random() - 0.5) * 10;
      spawn('potatoPlant', {
        Transform: {
          x: greenhouseX + offsetX,
          y: greenhouseY + 1,
          z: greenhouseZ + offsetZ
        }
      });
    }

    // Lab items
    spawn('medkit', { Transform: { x: labX + 3, y: labY + 1, z: labZ + 2 } });
    spawn('evaSuit', { Transform: { x: labX - 4, y: labY + 1, z: labZ - 3 } });
    spawn('circuitBoard', { Transform: { x: labX + 2, y: labY + 1, z: labZ - 4 } });

    // Storage items
    spawn('laserDrill', { Transform: { x: storageX + 2, y: storageY + 1, z: storageZ + 3 } });

    // Solar panels array near habitats
    for (let i = 0; i < 8; i++) {
      const panelX = habitatCenterX + 40 + (i % 4) * 6;
      const panelZ = habitatCenterZ + 20 + Math.floor(i / 4) * 4;
      const panelY = marsHeight.sample3D(panelX / terrainSize, 0, panelZ / terrainSize);

      spawn({
        Info: { name: 'Solar Panel' },
        Transform: { x: panelX, y: panelY + 2, z: panelZ },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 4, lengthY: 0.1, lengthZ: 2 } },
                material: { type: 'solid', params: { color: '#191970' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.1, height: 3 } },
                material: { type: 'solid', params: { color: '#C0C0C0' } },
                localPosition: [0, -1.6, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Spawn broken and working rovers
    spawn('brokenRover', {
      Transform: {
        x: habitatCenterX + 20,
        y: habitatBaseY + 1,
        z: habitatCenterZ + 15
      }
    });

    spawn('workingRover', {
      Transform: {
        x: habitatCenterX - 30,
        y: habitatBaseY + 1,
        z: habitatCenterZ - 20
      }
    });

    // Scatter Mars rocks across the terrain
    for (let i = 0; i < 800; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.9;
      const z = (Math.random() - 0.5) * terrainSize * 0.9;
      const rockValue = rockMask.sample3D(x / terrainSize, 0, z / terrainSize);
      if (rockValue > 0.2) {
        const h = marsHeight.sample3D(x / terrainSize, 0, z / terrainSize);
        const scale = 0.5 + Math.random() * 1.0;
        spawn('marsRock', { Transform: { x, y: h + 0.5, z, sx: scale, sy: scale, sz: scale } });
      }
    }

    // Scatter ore clusters
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.8;
      const z = (Math.random() - 0.5) * terrainSize * 0.8;
      const oreValue = oreMask.sample3D(x / terrainSize, 0, z / terrainSize);
      if (oreValue > 0.4) {
        const h = marsHeight.sample3D(x / terrainSize, 0, z / terrainSize);
        spawn('oreCluster', { Transform: { x, y: h + 1, z } });
      }
    }

    // Scatter ice clusters (less common)
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.8;
      const z = (Math.random() - 0.5) * terrainSize * 0.8;
      const oreValue = oreMask.sample3D(x / terrainSize, 0, z / terrainSize);
      if (oreValue < -0.3) { // Different condition for ice
        const h = marsHeight.sample3D(x / terrainSize, 0, z / terrainSize);
        spawn('iceCluster', { Transform: { x, y: h + 1, z } });
      }
    }

    // Astronaut NPCs
    archetypes.register('astronaut', {
      type: 'bundle',
      params: {
        Info: { name: 'Astronaut' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 1.4, lengthZ: 0.4 } },
                material: { type: 'solid', params: { color: '#FFFFFF' } }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.3 } },
                material: { type: 'solid', params: { color: '#FFE4B5', opacity: 0.8 } },
                localPosition: [0, 0.85, 0]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.15, height: 0.8 } },
                material: { type: 'solid', params: { color: '#FFFFFF' } },
                localPosition: [0.4, 0, 0]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.15, height: 0.8 } },
                material: { type: 'solid', params: { color: '#FFFFFF' } },
                localPosition: [-0.4, 0, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 2, jumpHeight: 2, canFly: false } },
        Health: { value: 20 },
        Faction: { id: 'player_faction' },
        AI: { isAggressive: false, awarenessRange: 10 }
      }
    });

    // Little rover NPCs for player team
    archetypes.register('littleRover', {
      type: 'bundle',
      params: {
        Info: { name: 'Little Rover' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 0.8, lengthY: 0.4, lengthZ: 1.2 } },
                material: { type: 'solid', params: { color: '#4169E1' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.15 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [-0.5, 0, -0.5],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.15 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [0.5, 0, -0.5],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.15 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [-0.5, 0, 0.5],
                localRotation: [0, 0, Math.PI / 2]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.15 } },
                material: { type: 'solid', params: { color: '#2F4F4F' } },
                localPosition: [0.5, 0, 0.5],
                localRotation: [0, 0, Math.PI / 2]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 3, jumpHeight: 1, canFly: false } },
        Health: { value: 15 },
        Faction: { id: 'player_faction' },
        AI: { isAggressive: false, awarenessRange: 15 }
      }
    });

    // Alien boss
    archetypes.register('alien', {
      type: 'bundle',
      params: {
        Info: { name: 'Alien' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 1.5 } },
                material: { type: 'solid', params: { color: '#800080' } }
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 2 } },
                material: { type: 'solid', params: { color: '#9932CC' } },
                localPosition: [-1.2, 0.5, 0]
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 2 } },
                material: { type: 'solid', params: { color: '#9932CC' } },
                localPosition: [1.2, 0.5, 0]
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.4 } },
                material: { type: 'solid', params: { color: '#FF0000' } },
                localPosition: [0, 1.2, 0.8]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 6, jumpHeight: 3, canFly: false } },
        Health: { value: 50 },
        Faction: { id: 'alien_faction' },
        AI: { isAggressive: true, awarenessRange: 20 },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 1.0, actions: [{ type: 'damage', params: { amount: 8 }, target: 'other' }] }]
        // Note: OnDeath replaced with collision-based drop for now
      }
    });

    // Plasmoid item (alien drop)
    const plasmoidItem = {
      Info: { name: 'Plasmoid' },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'sphere', params: { radius: 0.2 } },
              material: { type: 'liquid', params: { baseColor: '#9932CC', opacity: 0.8, waveAmp: 0.1, waveFreq: 2 } }
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.1 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
    };
    archetypes.register('plasmoidItem', { params: plasmoidItem });

    // Spawn astronauts in habitats
    spawn('astronaut', { Transform: { x: greenhouseX + 2, y: greenhouseY + 1, z: greenhouseZ - 2 } });
    spawn('astronaut', { Transform: { x: labX - 3, y: labY + 1, z: labZ + 3 } });
    spawn('astronaut', { Transform: { x: storageX - 2, y: storageY + 1, z: storageZ + 1 } });

    // Spawn little rovers near base
    for (let i = 0; i < 3; i++) {
      const roverX = habitatCenterX + (Math.random() - 0.5) * 60;
      const roverZ = habitatCenterZ + (Math.random() - 0.5) * 60;
      const roverY = marsHeight.sample3D(roverX / terrainSize, 0, roverZ / terrainSize);
      spawn('littleRover', { Transform: { x: roverX, y: roverY + 1, z: roverZ } });
    }

    // Cave entrance - far from base
    const caveEntranceX = habitatCenterX + 180;
    const caveEntranceZ = habitatCenterZ + 120;
    const caveEntranceY = marsHeight.sample3D(caveEntranceX / terrainSize, 0, caveEntranceZ / terrainSize);

    // Create hill for cave entrance
    spawn({
      Info: { name: 'Mars Hill' },
      Transform: { x: caveEntranceX, y: caveEntranceY + 8, z: caveEntranceZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'hemisphere', params: { radius: 15 } },
              material: { type: 'solid', params: { color: '#a0522d', roughness: 1.0 } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Cave entrance portal
    spawn({
      Info: { name: 'Cave Entrance' },
      Transform: { x: caveEntranceX, y: caveEntranceY + 4, z: caveEntranceZ + 10 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 3, height: 6 } },
              material: { type: 'solid', params: { color: '#2F4F4F' } },
              localRotation: [Math.PI / 2, 0, 0]
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'teleport',
          params: { position: { x: caveEntranceX, y: caveEntranceY - 20, z: caveEntranceZ } },
          target: 'other'
        }] }]
    });

    // Underground cave system
    const caveY = caveEntranceY - 20;

    // Main cave chamber
    spawn({
      Info: { name: 'Alien Cave' },
      Transform: { x: caveEntranceX, y: caveY, z: caveEntranceZ },
      Body: {
        type: 'composite',
        params: {
          hasInterior: true,
          parts: [
            // Main chamber
            {
              geometry: { type: 'capsule', params: { radius: 12, height: 8 } },
              material: { type: 'solid', params: { color: '#696969', roughness: 1.0 } }
            },
            // Connecting tunnel to second chamber
            {
              geometry: { type: 'capsule', params: { radius: 4, height: 20 } },
              material: { type: 'solid', params: { color: '#696969', roughness: 1.0 } },
              localPosition: [25, 0, 0],
              localRotation: [0, 0, Math.PI / 2]
            },
            // Second chamber
            {
              geometry: { type: 'hemisphere', params: { radius: 10 } },
              material: { type: 'solid', params: { color: '#696969', roughness: 1.0 } },
              localPosition: [45, 0, 0]
            },
            // Boss chamber tunnel
            {
              geometry: { type: 'capsule', params: { radius: 4, height: 15 } },
              material: { type: 'solid', params: { color: '#696969', roughness: 1.0 } },
              localPosition: [45, 0, 15],
              localRotation: [Math.PI / 2, 0, 0]
            },
            // Boss chamber
            {
              geometry: { type: 'hemisphere', params: { radius: 15 } },
              material: { type: 'solid', params: { color: '#696969', roughness: 1.0 } },
              localPosition: [45, 0, 30]
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
    });

    // Spawn ore in cave
    for (let i = 0; i < 8; i++) {
      const oreX = caveEntranceX + (Math.random() - 0.5) * 80;
      const oreZ = caveEntranceZ + (Math.random() - 0.5) * 50;
      spawn('oreCluster', { Transform: { x: oreX, y: caveY + 1, z: oreZ } });
    }

    // Spawn alien boss at end of cave
    spawn('alien', { Transform: { x: caveEntranceX + 45, y: caveY + 1, z: caveEntranceZ + 30 } });

    // Spawn plasmoid near alien (since OnDeath not supported yet)
    spawn('plasmoidItem', { Transform: { x: caveEntranceX + 47, y: caveY + 1, z: caveEntranceZ + 32 } });

    // Cave exit back to surface
    spawn({
      Info: { name: 'Cave Exit' },
      Transform: { x: caveEntranceX - 5, y: caveY + 1, z: caveEntranceZ - 5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 2, height: 0.5 } },
              material: { type: 'solid', params: { color: '#FFD700' } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{
          type: 'teleport',
          params: { position: { x: caveEntranceX + 5, y: caveEntranceY + 2, z: caveEntranceZ + 15 } },
          target: 'other'
        }] }]
    });

    // Player spawn location
    const playerX = 0;
    const playerZ = 0;
    const playerY = marsHeight.sample3D(playerX / terrainSize, 0, playerZ / terrainSize) + 2;
    spawn('player', { Transform: { x: playerX, y: playerY, z: playerZ } });
  }
};
