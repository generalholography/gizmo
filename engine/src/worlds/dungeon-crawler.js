export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    initialize({
      title: 'Dungeon Crawler',
      description: 'A grassy overworld hides a three-floor dungeon filled with enemies, loot, and a final boss.',
      tags: ['fantasy', 'dungeon', 'combat'],
      brandColors: ['#87ceeb', '#4caf50'],
      dimensions: [
        {
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: true,
          sky: {
            color: '#87CEEB',
            sun: {
              color: '#FFEEDD',
              intensity: 1.0,
              timeOfDay: 1100
            },
            clouds: {
              color: '#FFFFFF',
              coverage: 0.35
            },
            stars: {
              intensity: 0.1
            }
          },
          particleSystems: [
            {
              name: 'Dungeon Motes',
              position: [0, 6, 0],
              emitter: {
                rate: 60,
                maxParticles: 600,
                lifetime: 4.5,
                speed: { min: 0.1, max: 0.35 },
                spread: 0.8,
                size: 0.08,
                opacity: 0.6,
                gravity: 0,
                color: '#9fd3ff',
                direction: [0, 1, 0],
                shape: { type: 'sphere', radius: 26 },
                localSpace: false
              }
            }
          ]
        }
      ],
      achievements: [
        {
          name: 'Arm Yourself',
          description: 'Pick up any item.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              targetValue: 1
            }
          }
        },
        {
          name: 'Treasure Hunter',
          description: 'Pick up 5 items.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              targetValue: 5
            }
          }
        },
        {
          name: 'Into the Depths',
          description: 'Discover Dungeon Floor 1.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Dungeon Floor 1 Marker',
              targetValue: 1
            }
          }
        },
        {
          name: 'Further Down',
          description: 'Discover Dungeon Floor 2.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Dungeon Floor 2 Marker',
              targetValue: 1
            }
          }
        },
        {
          name: 'Abyssal Explorer',
          description: 'Discover Dungeon Floor 3.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Dungeon Floor 3 Marker',
              targetValue: 1
            }
          }
        },
        {
          name: 'Pest Control',
          description: 'Defeat 10 dungeon enemies.',
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'entities killed', subtype: 'Goblin' },
                { metric: 'entities killed', subtype: 'Archer' }
              ],
              targetValue: 10
            }
          }
        },
        {
          name: 'Boss Slayer',
          description: 'Defeat the Dungeon Overlord.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'entities killed',
              subtype: 'Dungeon Overlord',
              targetValue: 1
            }
          }
        }
      ]
    });

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    const rand = (min, max) => min + Math.random() * (max - min);
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const terrainSize = 220;
    const worldSeed = Math.floor(Math.random() * 999999);
    const hField = fields.register('overworldHeight', {
      type: 'simplex',
      params: {
        seed: worldSeed,
        frequency: 0.045,
        amplitude: 7.5,
        octaves: 4
      }
    });

    spawn({
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'displacedPlane',
                params: {
                  lengthX: terrainSize,
                  lengthZ: terrainSize,
                  field: 'overworldHeight'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#2e8b57',
                  roughness: 1.0
                }
              }
            }
          ]
        }
      },
      MotionSource: {
        type: 'static',
        params: {}
      }
    });

    for (let i = 0; i < 65; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.9;
      const z = (Math.random() - 0.5) * terrainSize * 0.9;
      const y = hField.sample3D(x / terrainSize, 0, z / terrainSize);
      if (y > 1.5 && Math.random() > 0.15) {
        spawn('tree', {
          Transform: {
            x,
            y,
            z
          }
        });
      }
    }

    const playerX = 12;
    const playerZ = 16;
    const playerY = hField.sample3D(playerX / terrainSize, 0, playerZ / terrainSize) + 1.2;
    spawn('player', {
      Transform: {
        x: playerX,
        y: playerY,
        z: playerZ
      }
    });

    archetypes.register('door', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Door'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1,
                    lengthY: 2.4,
                    lengthZ: 0.25
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#8B4513'
                  }
                }
              },
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.14
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#FFD700'
                  }
                },
                localPosition: [0.38, 0, 0.2]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      }
    });

    archetypes.register('floor_marker', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Marker'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.35,
                    height: 0.25
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#444444'
                  }
                }
              },
              {
                geometry: {
                  type: 'pyramid',
                  params: {
                    width: 0.6,
                    height: 0.6,
                    depth: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#8888aa'
                  }
                },
                localPosition: [0, 0.25, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.5 } }, cooldown: 2, actions: [
            {
              type: 'discover',
              params: {},
              target: 'self',
              range: 2.5
            }
          ] }]
      }
    });

    archetypes.register('short_sword', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Short Sword'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'root',
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.12,
                    lengthY: 0.8,
                    lengthZ: 0.18,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#cfd2d3',
                    metalness: 0.6,
                    roughness: 0.25
                  }
                },
                children: [
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.25,
                        lengthY: 0.1,
                        lengthZ: 0.25
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#444444'
                      }
                    },
                    localPosition: [0, 0.05, 0]
                  },
                  {
                    geometry: {
                      type: 'capsule',
                      params: {
                        radius: 0.06,
                        height: 0.35,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#7a4a1a'
                      }
                    },
                    localPosition: [0, 0, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 1
          }
        },
        Animation: {
          clips: [
            {
              name: 'use',
              duration: 0.3,
              tracks: [
                {
                  targetTag: 'root',
                  keyframes: [
                    { time: 0, rotation: [0, 0, 0] },
                    { time: 0.15, rotation: [-Math.PI / 2, 0, 0] },
                    { time: 0.3, rotation: [0, 0, 0] }
                  ]
                }
              ]
            }
          ]
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'getPickedUp',
              params: {},
              target: 'self'
            }
          ] }, { trigger: { type: 'primaryAction', params: { range: 3.3 } }, cooldown: 0.5, actions: [
            {
              type: 'damage',
              params: {
                amount: 7,
                knockback: 2.5
              },
              target: 'other',
              range: 3.3
            }
          ] }]
      }
    });

    archetypes.register('bow', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Bow'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.05,
                    height: 1.1
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#5a3c17'
                  }
                }
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.8
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'getPickedUp',
              params: {},
              target: 'self'
            }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.9, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: {
                entity: 'arrow_projectile',
                velocity: 26
              }
            }
          ] }]
      }
    });

    archetypes.register('wand_embers', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Wand of Embers'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.08,
                    height: 0.9
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#3b246a'
                  }
                }
              },
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.08
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#ff6a00'
                  }
                },
                localPosition: [0, 0.45, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.6
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: 'getPickedUp',
                params: {},
                target: 'self'
              }
            ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.75, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: {
                entity: 'fireball_projectile',
                velocity: 18
              }
            }
          ] }]
      }
    });

    archetypes.register('health_potion', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Health Potion'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.18
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#b6f6e8',
                    opacity: 0.25
                  }
                }
              },
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.14
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#d11f1f',
                    opacity: 1
                  }
                }
              },
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.1,
                    height: 0.10,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#b6f6e8',
                    opacity: 0.25
                  }
                },
                localPosition: [0, 0.15, 0]
              },
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.08,
                    height: 0.12,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#d3b350'
                  }
                },
                localPosition: [0, 0.16, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.2
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'getPickedUp',
              params: {},
              target: 'self'
            }
          ] }, { trigger: { type: 'primaryAction' }, actions: [
            {
              type: 'heal',
              params: {
                amount: 12
              },
              target: 'user'
            },
            {
              type: 'kill',
              params: {},
              target: 'self'
            }
          ] }]
      }
    });

    archetypes.register('arrow_projectile', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Arrow'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.03,
                    height: 0.8
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#aaaaaa'
                  }
                },
                localRotation: [-Math.PI / 2, 0, 0],
                children: [
                  {
                    geometry: {
                      type: 'cone',
                      params: {
                        radius: 0.07,
                        height: 0.2
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#555555'
                      }
                    },
                    localPosition: [0, 0.4, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.1,
            gravityScale: 1
          }
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
            {
              type: 'damage',
              params: {
                amount: 6
              },
              target: 'other'
            },
            {
              type: 'kill',
              params: {},
              target: 'self'
            }
          ] }]
      }
    });

    archetypes.register('fireball_projectile', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Fireball'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.22
                  }
                },
                material: {
                  type: 'liquid',
                  params: {
                    baseColor: '#ff4500',
                    opacity: 0.7,
                    waveAmp: 0.25,
                    waveFreq: 3
                  }
                },
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.1,
            gravityScale: 0
          }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.6 } }, cooldown: 0.05, actions: [
            {
              type: 'damage',
              params: {
                amount: 9
              },
              target: 'other',
              range: 0.6
            },
            {
              type: 'kill',
              params: {},
              target: 'self',
              range: 0.6
            }
          ] }]
      }
    });

    archetypes.register('shadow_bolt_projectile', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Shadow Bolt'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.3
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#222222',
                    roughness: 0.9
                  }
                }
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.2,
            gravityScale: 0
          }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.8 } }, cooldown: 0.03, actions: [
            {
              type: 'damage',
              params: {
                amount: 8,
                knockback: 4
              },
              target: 'other',
              range: 0.8
            },
            {
              type: 'kill',
              params: {},
              target: 'self',
              range: 0.8
            }
          ] }]
      }
    });

    archetypes.register('crystal_of_mana', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Crystal of Mana'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'pyramid',
                  params: {
                    width: 0.25,
                    height: 0.3,
                    depth: 0.25,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#4faaff',
                    opacity: 0.85,
                    roughness: 0
                  }
                }
              },
              {
                geometry: {
                  type: 'pyramid',
                  params: {
                    width: 0.25,
                    height: 0.3,
                    depth: 0.25,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#4faaff',
                    opacity: 0.85,
                    roughness: 0
                  }
                },
                localRotation: [Math.PI, 0, 0]
              }
            ]
          }
        },
        Animation: {
          clips: [
            {
              name: 'default',
              duration: 4.0,
              tracks: [
                {
                  targetTag: 'root',
                  keyframes: [
                    {
                      time: 0.0,
                      rotation: [0, 0, 0]
                    },
                    {
                      time: 2.0,
                      rotation: [0, Math.PI, 0]
                    },
                    {
                      time: 4.0,
                      rotation: [0, 2 * Math.PI, 0]
                    }
                  ]
                }
              ]
            }
          ]
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.2
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'getPickedUp',
              params: {},
              target: 'self'
            }
          ] }]
      }
    });

    archetypes.register('goblin', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Goblin'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'spine',
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.6,
                    lengthY: 0.8,
                    lengthZ: 0.4
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#4a8f2a'
                  }
                },
                children: [
                  {
                    tag: 'head',
                    geometry: {
                      type: 'sphere',
                      params: {
                        radius: 0.3,
                        pivot: 'bottom'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#65b341'
                      }
                    },
                    localPosition: [0, 0.4, 0],
                    children: [
                      {
                        tag: 'ear_r',
                        geometry: {
                          type: 'pyramid',
                          params: {
                            width: 0.12,
                            height: 0.22,
                            depth: 0.1,
                            pivot: 'bottom'
                          }
                        },
                        material: { type: 'solid', params: { color: '#65b341' } },
                        localPosition: [0.25, 0.3, -0.05],
                        localRotation: [Math.PI / 8, 0, - Math.PI / 3]
                      },
                      {
                        tag: 'ear_l',
                        geometry: {
                          type: 'pyramid',
                          params: {
                            width: 0.12,
                            height: 0.22,
                            depth: 0.1,
                            pivot: 'bottom'
                          }
                        },
                        material: { type: 'solid', params: { color: '#65b341' } },
                        localPosition: [-0.25, 0.3, -0.05],
                        localRotation: [Math.PI / 8, 0, Math.PI / 3]
                      }
                    ]
                  },
                  {
                    tag: 'arm_r',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.6,
                        lengthZ: 0.12,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#4a8f2a'
                      }
                    },
                    localPosition: [0.28, 0.4, 0]
                  },
                  {
                    tag: 'arm_l',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.6,
                        lengthZ: 0.12,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#4a8f2a'
                      }
                    },
                    localPosition: [-0.28, 0.4, 0]
                  },
                  {
                    tag: 'leg_r',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.7,
                        lengthZ: 0.12,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#4a8f2a'
                      }
                    },
                    localPosition: [0.2, -0.45, 0],
                    children: [
                      {
                        tag: 'foot_r',
                        geometry: {
                          type: 'box',
                          params: {
                            lengthX: 0.2,
                            lengthY: 0.1,
                            lengthZ: 0.3
                          }
                        },
                        material: {
                          type: 'solid',
                          params: {
                            color: '#3a7f1a'
                          }
                        },
                        localPosition: [0, -0.75, -0.1]
                      }
                    ]
                  },
                  {
                    tag: 'leg_l',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.7,
                        lengthZ: 0.12,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#4a8f2a'
                      }
                    },
                    localPosition: [-0.2, -0.45, 0],
                    children: [
                      {
                        tag: 'foot_l',
                        geometry: {
                          type: 'box',
                          params: {
                            lengthX: 0.2,
                            lengthY: 0.1,
                            lengthZ: 0.3
                          }
                        },
                        material: {
                          type: 'solid',
                          params: {
                            color: '#3a7f1a'
                          }
                        },
                        localPosition: [0, -0.75, -0.1]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 4.5,
            jumpHeight: 4,
            canFly: false
          }
        },
        Health: {
          value: 14
        },
        AI: {
          isAggressive: true,
          awarenessRange: 26
        },
        Faction: {
          id: 'enemy_faction'
        },
        Animation: {
          clips: [
            {
              name: 'default',
              duration: 2.0,
              tracks: [
                {
                  targetTag: 'arm_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 1.0, rotation: [0, 0, -Math.PI / 16] },
                    { time: 2.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'arm_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 1.0, rotation: [0, 0, Math.PI / 16] },
                    { time: 2.0, rotation: [0, 0, 0] }
                  ]
                }
              ]
            },
            {
              name: 'move',
              duration: 1.0,
              tracks: [
                {
                  targetTag: 'arm_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'arm_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'leg_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'leg_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                }
              ]
            }
          ]
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.7, actions: [
            {
              type: 'damage',
              params: {
                amount: 3
              },
              target: 'other'
            }
          ] }]
      }
    });

    archetypes.register('archer', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Archer'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'spine',
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.6,
                    lengthY: 1.1,
                    lengthZ: 0.4
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#aaaa44'
                  }
                },
                children: [
                  {
                    tag: 'head',
                    geometry: {
                      type: 'sphere',
                      params: {
                        radius: 0.25,
                        pivot: 'bottom'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#d6d6a3'
                      }
                    },
                    localPosition: [0, 0.55, 0]
                  },
                  {
                    tag: 'arm_r',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.15,
                        lengthY: 0.8,
                        lengthZ: 0.15,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#d6d6a3'
                      }
                    },
                    localPosition: [0.28, 0.55, 0]
                  },
                  {
                    tag: 'arm_l',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.15,
                        lengthY: 0.8,
                        lengthZ: 0.15,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#d6d6a3'
                      }
                    },
                    localPosition: [-0.28, 0.55, 0],
                    children: [
                      {
                        tag: 'heldItemAnchor',
                        geometry: {
                          type: 'none'
                        },
                        localPosition: [0, -0.8, 0],
                        localRotation: [Math.PI / 2, 0, 0]
                      }
                    ]
                  },
                  {
                    tag: 'leg_r',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.15,
                        lengthY: 1.0,
                        lengthZ: 0.15,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#d6d6a3'
                      }
                    },
                    localPosition: [0.2, -0.6, 0],
                    children: [
                      {
                        tag: 'foot_r',
                        geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.1, lengthZ: 0.3 } },
                        material: { type: 'solid', params: { color: '#b5b57a' } },
                        localPosition: [0, -1.05, -0.1]
                      }
                    ]
                  },
                  {
                    tag: 'leg_l',
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.15,
                        lengthY: 1.0,
                        lengthZ: 0.15,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#d6d6a3'
                      }
                    },
                    localPosition: [-0.2, -0.6, 0],
                    children: [
                      {
                        tag: 'foot_l',
                        geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.1, lengthZ: 0.3 } },
                        material: { type: 'solid', params: { color: '#b5b57a' } },
                        localPosition: [0, -1.05, -0.1]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        },
        Inventory: {
          size: 1,
          items: ['bow'],
          selectedItemIndex: 0
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 2,
            jumpHeight: 3.5,
            canFly: false
          }
        },
        Health: {
          value: 12
        },
        AI: {
          isAggressive: true,
          awarenessRange: 32
        },
        Faction: {
          id: 'enemy_faction'
        },
        Animation: {
          clips: [
            {
              name: 'default',
              duration: 2.0,
              tracks: [
                {
                  targetTag: 'arm_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 1.0, rotation: [0, 0, -Math.PI / 16] },
                    { time: 2.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'arm_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 1.0, rotation: [0, 0, Math.PI / 16] },
                    { time: 2.0, rotation: [0, 0, 0] }
                  ]
                }
              ]
            },
            {
              name: 'move',
              duration: 1.0,
              tracks: [
                {
                  targetTag: 'arm_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'arm_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'leg_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'leg_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.25, rotation: [Math.PI / 4, 0, 0] },
                    { time: 0.5, rotation: [0, 0, 0] },
                    { time: 0.75, rotation: [-Math.PI / 4, 0, 0] },
                    { time: 1.0, rotation: [0, 0, 0] }
                  ]
                }
              ]
            }
          ]
        }
      }
    });

    archetypes.register('dungeon_overlord', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Dungeon Overlord'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'core',
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1.6,
                    lengthY: 2.8,
                    lengthZ: 1.2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#333333',
                    metalness: 0.2,
                    roughness: 0.8
                  }
                }
              },
              {
                tag: 'head',
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.6,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#550000'
                  }
                },
                localPosition: [0, 1.4, 0]
              },
              {
                tag: 'arm_r',
                geometry: { type: 'box', params: { lengthX: 0.35, lengthY: 1.6, lengthZ: 0.35, pivot: 'top' } },
                material: { type: 'solid', params: { color: '#444444' } },
                localPosition: [1.0, 1.2, 0]
              },
              {
                tag: 'arm_l',
                geometry: { type: 'box', params: { lengthX: 0.35, lengthY: 1.6, lengthZ: 0.35, pivot: 'top' } },
                material: { type: 'solid', params: { color: '#444444' } },
                localPosition: [-1.0, 1.2, 0]
              },
              {
                tag: 'leg_r',
                geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 2.0, lengthZ: 0.4, pivot: 'top' } },
                material: { type: 'solid', params: { color: '#2b2b2b' } },
                localPosition: [0.6, -0.2, 0]
              },
              {
                tag: 'leg_l',
                geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 2.0, lengthZ: 0.4, pivot: 'top' } },
                material: { type: 'solid', params: { color: '#2b2b2b' } },
                localPosition: [-0.6, -0.2, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 4.5,
            jumpHeight: 4.5,
            canFly: false
          }
        },
        Health: {
          value: 350
        },
        Inventory: {
          size: 1,
          items: ['crystal_of_mana'],
          selectedItemIndex: -1
        },
        AI: {
          isAggressive: true,
          awarenessRange: 40
        },
        Faction: {
          id: 'enemy_faction'
        },
        Animation: {
          clips: [
            {
              name: 'default',
              duration: 2.5,
              tracks: [
                {
                  targetTag: 'arm_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 1.25, rotation: [0, 0, -Math.PI / 20] },
                    { time: 2.5, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'arm_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 1.25, rotation: [0, 0, Math.PI / 20] },
                    { time: 2.5, rotation: [0, 0, 0] }
                  ]
                }
              ]
            },
            {
              name: 'move',
              duration: 1.2,
              tracks: [
                {
                  targetTag: 'arm_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.3, rotation: [Math.PI / 6, 0, 0] },
                    { time: 0.6, rotation: [0, 0, 0] },
                    { time: 0.9, rotation: [-Math.PI / 6, 0, 0] },
                    { time: 1.2, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'arm_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.3, rotation: [-Math.PI / 6, 0, 0] },
                    { time: 0.6, rotation: [0, 0, 0] },
                    { time: 0.9, rotation: [Math.PI / 6, 0, 0] },
                    { time: 1.2, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'leg_l',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.3, rotation: [-Math.PI / 8, 0, 0] },
                    { time: 0.6, rotation: [0, 0, 0] },
                    { time: 0.9, rotation: [Math.PI / 8, 0, 0] },
                    { time: 1.2, rotation: [0, 0, 0] }
                  ]
                },
                {
                  targetTag: 'leg_r',
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 0.3, rotation: [Math.PI / 8, 0, 0] },
                    { time: 0.6, rotation: [0, 0, 0] },
                    { time: 0.9, rotation: [-Math.PI / 8, 0, 0] },
                    { time: 1.2, rotation: [0, 0, 0] }
                  ]
                }
              ]
            }
          ]
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.6, actions: [
            {
              type: 'damage',
              params: {
                amount: 10,
                knockback: 6
              },
              target: 'other'
            }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 1.5, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: {
                entity: 'shadow_bolt_projectile',
                velocity: 18
              }
            }
          ] }]
      }
    });

    archetypes.register('treasure_chest', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Treasure Chest',
          description: 'Contains random loot.'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1.2,
                    lengthY: 0.8,
                    lengthZ: 0.8
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#6f4d2d'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1.25,
                    lengthY: 0.1,
                    lengthZ: 0.85
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#3a2a18'
                  }
                },
                localPosition: [0, 0.25, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.1,
                    lengthY: 0.9,
                    lengthZ: 0.85
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#332211'
                  }
                },
                localPosition: [0.45, 0, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.1,
                    lengthY: 0.9,
                    lengthZ: 0.85
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#332211'
                  }
                },
                localPosition: [-0.45, 0, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [] }]
      }
    });

    archetypes.register('dungeon_entrance', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Dungeon Entrance'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 4,
                    lengthY: 2.5,
                    lengthZ: 0.5
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#696969'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.5,
                    lengthY: 3,
                    lengthZ: 2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#808080'
                  }
                },
                localPosition: [1.75, 0.25, 0.75]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.5,
                    lengthY: 3,
                    lengthZ: 2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#808080'
                  }
                },
                localPosition: [-1.75, 0.25, 0.75]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 4,
                    lengthY: 0.5,
                    lengthZ: 2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#808080'
                  }
                },
                localPosition: [0, 2.0, 0.75]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      }
    });

    const floors = [
      {
        idx: 1,
        size: 44,
        height: 6.0,
        y: -26,
        cx: 0,
        cz: -60,
        color: '#4e4e56'
      },
      {
        idx: 2,
        size: 48,
        height: 6.5,
        y: -52,
        cx: 28,
        cz: -122,
        color: '#4a4a52'
      },
      {
        idx: 3,
        size: 54,
        height: 7.0,
        y: -78,
        cx: -22,
        cz: -184,
        color: '#45454d'
      }
    ];
    const entryPoints = floors.map(f => ({
      x: f.cx,
      y: f.y + 1.25,
      z: f.cz + (f.size / 2 - 3)
    }));

    function spawnDungeonFloor(floor) {
      const shellParts = [
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: floor.size,
              lengthY: floor.height,
              lengthZ: floor.size,
              pivot: 'bottom'
            }
          },
          material: {
            type: 'solid',
            params: {
              color: floor.color,
              roughness: 1.0
            }
          }
        }
      ];

      const detailParts = [];
      const cell = 7;
      for (let x = -Math.floor((floor.size - 6) / (2 * cell)); x <= Math.floor((floor.size - 6) / (2 * cell)); x++) {
        for (let z = -Math.floor((floor.size - 6) / (2 * cell)); z <= Math.floor((floor.size - 6) / (2 * cell)); z++) {
          if (Math.random() < 0.35 && !(Math.abs(x) < 1 && Math.abs(z) < 1)) {
            detailParts.push({
              geometry: {
                type: 'cylinder',
                params: {
                  radius: 0.6,
                  height: floor.height - 0.2,
                  pivot: 'bottom'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#3c3c42'
                }
              },
              localPosition: [x * cell, 0, z * cell]
            });
          }
          if (Math.random() < 0.2) {
            detailParts.push({
              geometry: {
                type: 'box',
                params: {
                  lengthX: 2.5,
                  lengthY: 0.25,
                  lengthZ: 2.5
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#3f3f3f'
                }
              },
              localPosition: [x * cell + rand(-1, 1), 0.05, z * cell + rand(-1, 1)]
            });
          }
        }
      }

      spawn({
        Info: {
          name: `Dungeon Floor ${floor.idx}`
        },
        Transform: {
          x: floor.cx,
          y: floor.y,
          z: floor.cz
        },
        Body: {
          type: 'composite',
          params: {
            hasInterior: true,
            parts: shellParts
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      });

      if (detailParts.length > 0) {
        spawn({
          Info: {
            name: `Dungeon Floor ${floor.idx} Details`
          },
          Transform: {
            x: floor.cx,
            y: floor.y,
            z: floor.cz
          },
            Body: {
              type: 'composite',
              params: {
                parts: detailParts
              }
            },
          MotionSource: {
            type: 'static',
            params: {}
          }
        });
      }

      spawn('floor_marker', {
        Info: {
          name: `Dungeon Floor ${floor.idx} Marker`
        },
        Transform: {
          x: entryPoints[floor.idx - 1].x + 2,
          y: entryPoints[floor.idx - 1].y,
          z: entryPoints[floor.idx - 1].z - 2
        }
      });

      const enemyCount = 6 + floor.idx * 3;
      for (let i = 0; i < enemyCount; i++) {
        const ex = floor.cx + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const ez = floor.cz + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const ey = floor.y + 1;
        const type = Math.random() < 0.75 ? 'goblin' : 'archer';
        spawn(type, {
          Transform: {
            x: ex,
            y: ey,
            z: ez
          }
        });
      }

      if (floor.idx === 3) {
        spawn('dungeon_overlord', {
          Transform: {
            x: floor.cx,
            y: floor.y + 1,
            z: floor.cz
          }
        });
      }

      const lootPool = ['short_sword', 'bow', 'wand_embers', 'health_potion', 'health_potion'];
      const chestCount = 3 + floor.idx;
      for (let i = 0; i < chestCount; i++) {
        const cx = floor.cx + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const cz = floor.cz + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const cy = floor.y + 0.5;
        const count = 1 + Math.floor(Math.random() * 3);
        const localPool = lootPool.slice();
        const effects = [];
        for (let j = 0; j < count && localPool.length > 0; j++) {
          const pick = localPool.splice(Math.floor(Math.random() * localPool.length), 1)[0];
          effects.push({
            type: 'spawnEntityFrom',
            target: 'self',
            params: {
              entity: pick
            }
          });
        }
        effects.push({
          type: 'discover',
          params: {},
          target: 'self'
        });
        effects.push({
          type: 'kill',
          params: {},
          target: 'self'
        });
        spawn('treasure_chest', {
          Transform: {
            x: cx,
            y: cy,
            z: cz
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: effects }]
        });
      }
    }

    floors.forEach(spawnDungeonFloor);

    // Helper to place a door along a random or specified wall, aligned and flush to that wall
    function getWallDoorPlacement(f, preferredWall) {
      const half = f.size / 2;
      const doorThickness = 0.25; // matches door geometry lengthZ
      const doorHalf = doorThickness / 2;
      const eps = 0.01; // tiny offset to avoid intersection
      const margin = 3;  // avoid extreme corners
      const walls = ['north', 'south', 'east', 'west'];
      const wall = preferredWall || choice(walls);
      let x = f.cx;
      let z = f.cz;
      let ry = 0;
      switch (wall) {
        case 'north': // +Z
          z = f.cz + (half - doorHalf - eps);
          x = f.cx + rand(-(half - margin), (half - margin));
          ry = Math.PI;
          break;
        case 'south': // -Z
          z = f.cz - (half - doorHalf - eps);
          x = f.cx + rand(-(half - margin), (half - margin));
          ry = 0;
          break;
        case 'east': // +X
          x = f.cx + (half - doorHalf - eps);
          z = f.cz + rand(-(half - margin), (half - margin));
          ry = -Math.PI / 2;
          break;
        case 'west': // -X
          x = f.cx - (half - doorHalf - eps);
          z = f.cz + rand(-(half - margin), (half - margin));
          ry = Math.PI / 2;
          break;
      }
      return { x, y: f.y + 1.25, z, ry };
    }

    floors.forEach((f, i) => {
      // Door to next floor: along a random wall, properly aligned
      if (i < floors.length - 1) {
        const t = getWallDoorPlacement(f);
        spawn('door', {
          Transform: t,
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: 'teleport',
                params: { position: entryPoints[i + 1] },
                target: 'other'
              }
            ] }]
        });
      }

      // Return door to previous floor: place on the north wall (where the entry point is)
      if (i > 0) {
        const half = f.size / 2;
        const doorHalf = 0.25 / 2;
        const eps = 0.01;
        spawn('door', {
          Transform: {
            x: f.cx, // centered on wall near the staircase/marker
            y: f.y + 1.25,
            z: f.cz + (half - doorHalf - eps),
            ry: Math.PI
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: 'teleport',
                params: { position: entryPoints[i - 1] },
                target: 'other'
              }
            ] }]
        });
      }
    });

    const entranceX = playerX + 5;
    const entranceZ = playerZ - 10;
    const entranceY = hField.sample3D(entranceX / terrainSize, 0, entranceZ / terrainSize);
    spawn('dungeon_entrance', {
      Transform: {
        x: entranceX,
        y: entranceY + 0.01,
        z: entranceZ,
        ry: 0
      }
    });

    spawn({
      Info: {
        name: 'Dungeon Entrance Aura'
      },
      Transform: {
        x: entranceX,
        y: entranceY + 0.4,
        z: entranceZ
      },
      ParticleEmitter: {
        rate: 40,
        maxParticles: 240,
        lifetime: 2.2,
        speed: { min: 0.2, max: 0.6 },
        spread: 0.9,
        size: 0.12,
        opacity: 0.8,
        gravity: -0.05,
        color: '#7b5cff',
        direction: [0, 1, 0],
        shape: { type: 'point' },
        localSpace: false
      },
      MotionSource: { type: 'static', params: {} }
    });

    spawn('door', {
      Transform: {
        x: entranceX,
        y: entranceY + 1.2,
        z: entranceZ + 0.75,
        ry: 0
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'teleport',
            params: {
              position: entryPoints[0]
            },
            target: 'other'
          }
        ] }]
    });

    // Place the exit door for Floor 1 along the north wall as well
    {
      const f0 = floors[0];
      const half0 = f0.size / 2;
      const doorHalf0 = 0.25 / 2;
      const eps0 = 0.01;
      spawn('door', {
        Transform: {
          x: f0.cx,
          y: f0.y + 1.25,
          z: f0.cz + (half0 - doorHalf0 - eps0),
          ry: Math.PI
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'teleport',
              params: {
                position: {
                  x: entranceX,
                  y: entranceY + 1.2,
                  z: entranceZ + 2.5
                }
              },
              target: 'other'
            }
          ] }]
      });
    }

    spawn('short_sword', {
      Transform: {
        x: entranceX + 2,
        y: entranceY + 1.2,
        z: entranceZ + 2
      }
    });
    spawn('health_potion', {
      Transform: {
        x: entranceX - 2,
        y: entranceY + 1.2,
        z: entranceZ + 2
      }
    });
  }
};
