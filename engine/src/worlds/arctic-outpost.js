export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    initialize({
      title: 'Arctic Sabotage',
      description:
        'Infiltrate an arctic communications outpost, steal research data, plant charges on the satellite dish, destroy relay transmitters, and race to the evac point.',
      tags: ['stealth', 'snow', 'infiltration'],
      brandColors: ['#7fb2d4', '#fef6d8'],
      dimensions: [
        {
          name: 'ArcticBase',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#7fb2d4',
            sun: {
              color: '#fef6d8',
              intensity: 0.75,
              timeOfDay: 1030
            },
            clouds: {
              color: '#f5f8ff',
              coverage: 0.45
            },
            stars: {
              intensity: 0.0
            }
          },
          particleSystems: [
            {
              name: 'Blowing Snow',
              position: [0, 18, 0],
              emitter: {
                rate: 180,
                maxParticles: 2000,
                lifetime: 6.5,
                speed: { min: 0.6, max: 1.4 },
                spread: 0.4,
                size: 0.14,
                opacity: 0.85,
                gravity: 0.2,
                color: '#ffffff',
                direction: [0.2, -1, 0.1],
                shape: { type: 'box', size: [280, 4, 280] },
                localSpace: false
              }
            }
          ]
        }
      ],
      achievements: [
        {
          name: 'Data Heist',
          description: 'Extract the research hard drive from the server farm.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Stolen Hard Drive',
              targetValue: 1
            }
          }
        },
        {
          name: 'Dish Saboteur',
          description: 'Plant charges on all satellite dish supports.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Dish Support Charge',
              targetValue: 3
            }
          }
        },
        {
          name: 'Signal Jammer',
          description: 'Disable the transmission array nodes.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Relay Transmitter',
              targetValue: 3
            }
          }
        },
        {
          name: 'Cold Extraction',
          description: 'Reach the evac zone on the far side of the outpost.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Evacuation Point',
              targetValue: 1
            }
          }
        }
      ]
    });

    const terrainSize = 420;
    const halfSize = terrainSize / 2;
    const heightField = fields.register('arcticHeight', {
      type: 'simplex',
      params: {
        seed: 221,
        frequency: 0.12,
        amplitude: 4.2,
        octaves: 4
      }
    });

    const sampleHeight = (x, z) =>
      heightField.sample3D(x / terrainSize, 0, z / terrainSize);

    spawn({
      Transform: {
        y: 0
      },
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
                  field: 'arcticHeight'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#dbe5ef',
                  roughness: 0.9
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

    spawn({
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: terrainSize,
                  lengthY: 0.4,
                  lengthZ: terrainSize,
                  pivot: 'bottom'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#b1c7d8',
                  opacity: 0.5
                }
              },
              localPosition: [0, -0.2, 0]
            }
          ]
        }
      },
      MotionSource: {
        type: 'static',
        params: {}
      }
    });

    archetypes.register('snowmobile', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Snowmobile',
          description: 'High-speed transport. Press E to ride.'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'chassis',
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.9,
                    lengthY: 0.4,
                    lengthZ: 2.4,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#22313f'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.8,
                    lengthY: 0.45,
                    lengthZ: 1.0,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#3f5c73',
                    opacity: 0.85
                  }
                },
                localPosition: [0, 0.4, -0.2]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.16,
                    lengthY: 0.16,
                    lengthZ: 2.2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#111111'
                  }
                },
                localPosition: [0.45, -0.1, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.16,
                    lengthY: 0.16,
                    lengthZ: 2.2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#111111'
                  }
                },
                localPosition: [-0.45, -0.1, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.1,
                    lengthY: 0.2,
                    lengthZ: 0.9
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#1b1f24'
                  }
                },
                localPosition: [0.65, 0.15, 0.65]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.1,
                    lengthY: 0.2,
                    lengthZ: 0.9
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#1b1f24'
                  }
                },
                localPosition: [-0.65, 0.15, 0.65]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 18,
            jumpHeight: 0.5,
            canFly: false
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'discover',
              params: {},
              target: 'self'
            },
            {
              type: 'mount',
              params: {
                offset: [0, 0.6, 0]
              },
              target: 'self'
            }
          ] }]
      }
    });

    const registerWeapon = (
      id,
      { name, color, projectile, velocity, coolDown, damage, bodyParts = [] }
    ) => {
      archetypes.register(id, {
        type: 'bundle',
        params: {
          Info: {
            name
          },
            Body: {
              type: 'composite',
              params: {
                parts: bodyParts.length
                  ? bodyParts
                  : [
                      {
                        geometry: {
                          type: 'box',
                          params: {
                            lengthX: 0.25,
                            lengthY: 0.12,
                            lengthZ: 0.8
                          }
                        },
                        material: {
                          type: 'solid',
                          params: {
                            color
                          }
                        }
                      },
                      {
                        geometry: {
                          type: 'box',
                          params: {
                            lengthX: 0.12,
                            lengthY: 0.12,
                            lengthZ: 0.28
                          }
                        },
                        material: {
                          type: 'solid',
                          params: {
                            color: '#1b1b1b'
                          }
                        },
                        localPosition: [0.08, 0.12, -0.08]
                      }
                    ]
              }
            },
          MotionSource: {
            type: 'dynamicRigidBody',
            params: {
              mass: 3
            }
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: 'getPickedUp',
                params: {},
                target: 'self'
              }
            ] }, { trigger: { type: 'primaryAction' }, cooldown: coolDown, actions: [
              {
                type: 'spawnEntityFrom',
                target: 'self',
                params: {
                  entity: projectile,
                  velocity
                }
              }
            ] }],
          Animation: {
            clips: [
              {
                name: 'use',
                duration: 0.4,
                tracks: [
                  {
                    targetTag: 'root',
                    keyframes: [
                      {
                        time: 0.0,
                        position: [0, 0, 0],
                        rotation: [0, 0, 0]
                      },
                      {
                        time: 0.05,
                        position: [0, 0, 0.3],
                        rotation: [Math.PI / 8, 0, 0]
                      },
                      {
                        time: 0.4,
                        position: [0, 0, 0],
                        rotation: [0, 0, 0]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      });

      archetypes.register(projectile, {
        type: 'bundle',
        params: {
          Info: {
            name: name + ' Projectile'
          },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: {
                    type: 'cylinder',
                    params: {
                      radius: 0.035,
                      height: 0.32
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#d7d2c5'
                    }
                  },
                  localRotation: [Math.PI / 2, 0, 0],
                  ignoreCollisions: true
                }
              ]
            }
          },
          MotionSource: {
            type: 'dynamicRigidBody',
            params: {
              mass: 0.05,
              gravityScale: 0
            }
          },
                    Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.22 } }, actions: [
              {
                type: 'damage',
                params: {
                  amount: damage
                },
                target: 'other',
                range: 0.22
              },
              {
                type: 'kill',
                params: {},
                target: 'self'
              }
            ] }]
        }
      });
    };

    registerWeapon('pistol', {
      name: 'Pistol',
      color: '#2a2d32',
      projectile: 'pistol_round',
      velocity: 46,
      coolDown: 0.4,
      damage: 3,
      bodyParts: [
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.12,
              lengthY: 0.10,
              lengthZ: 0.50
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#3a3d43'
            }
          },
            localPosition: [0, 0.07, -0.05]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.11,
              lengthY: 0.10,
              lengthZ: 0.35
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#23272b'
            }
          },
          localPosition: [0, 0.0, 0.05]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.1,
              lengthY: 0.25,
              lengthZ: 0.12
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#1f2a30'
            }
          },
          localPosition: [0, -0.05, 0.12],
          localRotation: [-0.35, 0, 0]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.12,
              lengthY: 0.06,
              lengthZ: 0.06
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#2a2d32'
            }
          },
          localPosition: [0, -0.02, 0.02]
        },
        {
          geometry: {
            type: 'cylinder',
            params: {
              radius: 0.04,
              height: 0.12
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#111315'
            }
          },
          localRotation: [Math.PI / 2, 0, 0],
          localPosition: [0, 0.06, -0.32]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.08,
              lengthY: 0.06,
              lengthZ: 0.14
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#0e0f10'
            }
          },
          localPosition: [0, -0.02, -0.22]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.02,
              lengthY: 0.02,
              lengthZ: 0.02
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#ff1744',
              emissive: '#ff1744',
              emissiveIntensity: 1.2
            }
          },
          localPosition: [0, -0.01, -0.29]
        }
      ]
    });

    registerWeapon('assault_rifle', {
      name: 'Assault Rifle',
      color: '#1d2126',
      projectile: 'rifle_round',
      velocity: 70,
      coolDown: 0.12,
      damage: 4,
      bodyParts: [
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.12,
              lengthY: 0.12,
              lengthZ: 0.36
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#2a2d32'
            }
          },
          localPosition: [0, 0.02, 0.0]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.12,
              lengthY: 0.10,
              lengthZ: 0.34
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#33383d'
            }
          },
          localPosition: [0, 0.02, -0.35]
        },
        {
          geometry: {
            type: 'cylinder',
            params: {
              radius: 0.03,
              height: 0.28
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#0f1214'
            }
          },
          localRotation: [Math.PI / 2, 0, 0],
          localPosition: [0, 0.04, -0.60]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.13,
              lengthY: 0.16,
              lengthZ: 0.3
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#23272b'
            }
          },
          localPosition: [0, -0.04, 0.3]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.08,
              lengthY: 0.16,
              lengthZ: 0.08
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#1b1f24'
            }
          },
          localPosition: [0, -0.05, 0.05],
          localRotation: [-0.04, 0, 0]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.08,
              lengthY: 0.18,
              lengthZ: 0.12
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#14181c'
            }
          },
          localPosition: [0.0, -0.09, -0.15],
          localRotation: [0.3, 0, 0]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.06,
              lengthY: 0.06,
              lengthZ: 0.16
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#1a1d21'
            }
          },
          localPosition: [0, 0.12, -0.10]
        }
      ]
    });

    registerWeapon('sniper_rifle', {
      name: 'Sniper Rifle',
      color: '#15191c',
      projectile: 'sniper_round',
      velocity: 98,
      coolDown: 1.1,
      damage: 11,
      bodyParts: [
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.12,
              lengthY: 0.14,
              lengthZ: 0.7
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#4b6e3b'
            }
          },
          localPosition: [0, 0.0, -0.3]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.12,
              lengthY: 0.2,
              lengthZ: 0.6
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#4b6e3b'
            }
          },
          localPosition: [0, -0.07, 0.3]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.10,
              lengthY: 0.16,
              lengthZ: 0.16
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#1b1f24'
            }
          },
          localPosition: [0, -0.08, -0.17],
          localRotation: [0, 0, 0.1]
        },
        {
          geometry: {
            type: 'cylinder',
            params: {
              radius: 0.03,
              height: 0.60
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#0f1214'
            }
          },
          localRotation: [Math.PI / 2, 0, 0],
          localPosition: [0, 0.04, -0.70]
        },
        {
          geometry: {
            type: 'cylinder',
            params: {
              radius: 0.05,
              height: 0.38
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#1b1b1b'
            }
          },
          localRotation: [Math.PI / 2, 0, 0],
          localPosition: [0, 0.12, -0.10]
        },
        {
          geometry: {
            type: 'cylinder',
            params: {
              radius: 0.065,
              height: 0.12
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#151515'
            }
          },
          localRotation: [Math.PI / 2, 0, 0],
          localPosition: [0, 0.12, -0.28]
        },
        {
          geometry: {
            type: 'cylinder',
            params: {
              radius: 0.055,
              height: 0.10
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#151515'
            }
          },
          localRotation: [Math.PI / 2, 0, 0],
          localPosition: [0, 0.12, 0.02]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.02,
              lengthY: 0.22,
              lengthZ: 0.02,
              pivot: 'top'
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#20272c'
            }
          },
          localPosition: [0.04, 0, -0.35],
          localRotation: [0.6, 0, 0]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.02,
              lengthY: 0.22,
              lengthZ: 0.02,
              pivot: 'top'
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#20272c'
            }
          },
          localPosition: [-0.04, 0, -0.35],
          localRotation: [0.6, 0, 0]
        },
        {
          geometry: {
            type: 'box',
            params: {
              lengthX: 0.06,
              lengthY: 0.05,
              lengthZ: 0.08
            }
          },
          material: {
            type: 'solid',
            params: {
              color: '#0d0f11'
            }
          },
          localPosition: [0, 0.04, -1.02]
        }
      ]
    });

    archetypes.register('grenade', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Grenade',
          description: 'Primary action: throw a grenade.'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.12
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#546e7a'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.06,
                    lengthY: 0.06,
                    lengthZ: 0.06
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#455a64'
                  }
                },
                localPosition: [0, 0.12, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.6,
            gravityScale: 1
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'getPickedUp',
              params: {},
              target: 'self'
            }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.6, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: {
                entity: 'grenade_projectile',
                velocity: 22
              }
            }
          ] }]
      }
    });

    archetypes.register('grenade_projectile', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Grenade Projectile'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.10
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#78909c'
                  }
                }
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.5,
            gravityScale: 1
          }
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: {
                entity: 'grenade_explosion'
              }
            },
            {
              type: 'kill',
              params: {},
              target: 'self'
            }
          ] }]
      }
    });

    archetypes.register('grenade_explosion', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Explosion'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 2.2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#ff6d00',
                    opacity: 0.55
                  }
                },
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.2 } }, cooldown: 0.1, actions: [
            {
              type: 'damage',
              params: {
                amount: 16,
                knockback: 12
              },
              target: 'other',
              range: 2.2
            },
            {
              type: 'kill',
              params: {},
              target: 'self'
            }
          ] }]
      }
    });

    archetypes.register('medkit', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Medkit',
          description: 'Use to fully heal.'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.35,
                    lengthY: 0.12,
                    lengthZ: 0.25
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#f5f5f5'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.18,
                    lengthY: 0.05,
                    lengthZ: 0.06
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#cfd8dc'
                  }
                },
                localPosition: [0, 0.09, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.06,
                    lengthY: 0.02,
                    lengthZ: 0.18
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#d32f2f'
                  }
                },
                localPosition: [0, 0.01, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.18,
                    lengthY: 0.02,
                    lengthZ: 0.06
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#d32f2f'
                  }
                },
                localPosition: [0, 0.01, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.8,
            gravityScale: 1
          }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'getPickedUp',
              params: {},
              target: 'self'
            }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.2, actions: [
            {
              type: 'heal',
              params: {
                amount: 9999
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

    archetypes.register('soldier_rifleman', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Outpost Rifleman'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.7,
                    lengthY: 1.6,
                    lengthZ: 0.5
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#414c55'
                  }
                },
                children: [
                  {
                    geometry: {
                      type: 'sphere',
                      params: {
                        radius: 0.28,
                        pivot: 'bottom'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#d3d3d3'
                      }
                    },
                    localPosition: [0, 0.8, 0]
                  },
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.16,
                        lengthY: 0.9,
                        lengthZ: 0.16,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#2c353c'
                      }
                    },
                    localPosition: [0.32, 0.75, 0],
                    children: [
                      {
                        tag: 'heldItemAnchor',
                        geometry: {
                          type: 'none'
                        },
                        localPosition: [0, -0.75, 0]
                      }
                    ]
                  },
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.16,
                        lengthY: 0.9,
                        lengthZ: 0.16,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#2c353c'
                      }
                    },
                    localPosition: [-0.32, 0.75, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 4.2,
            jumpHeight: 2.5,
            canFly: false
          }
        },
        Inventory: {
          size: 1,
          items: ['assault_rifle'],
          selectedItemIndex: 0
        },
        Health: {
          value: 12
        },
        AI: {
          isAggressive: true,
          awarenessRange: 45
        },
        Faction: {
          id: 'outpost_guard'
        }
      }
    });

    archetypes.register('soldier_pistol', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Outpost Sentry'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.65,
                    lengthY: 1.55,
                    lengthZ: 0.5
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#495864'
                  }
                },
                children: [
                  {
                    geometry: {
                      type: 'sphere',
                      params: {
                        radius: 0.26,
                        pivot: 'bottom'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#cdd2d6'
                      }
                    },
                    localPosition: [0, 0.78, 0]
                  },
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.15,
                        lengthY: 0.85,
                        lengthZ: 0.15,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#303941'
                      }
                    },
                    localPosition: [0.3, 0.72, 0],
                    children: [
                      {
                        tag: 'heldItemAnchor',
                        geometry: {
                          type: 'none'
                        },
                        localPosition: [0, -0.7, 0]
                      }
                    ]
                  },
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.15,
                        lengthY: 0.85,
                        lengthZ: 0.15,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#303941'
                      }
                    },
                    localPosition: [-0.3, 0.72, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 4.8,
            jumpHeight: 2.4,
            canFly: false
          }
        },
        Inventory: {
          size: 1,
          items: ['pistol'],
          selectedItemIndex: 0
        },
        Health: {
          value: 9
        },
        AI: {
          isAggressive: true,
          awarenessRange: 35
        },
        Faction: {
          id: 'outpost_guard'
        }
      }
    });

    archetypes.register('soldier_sniper', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Outpost Sharpshooter'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.7,
                    lengthY: 1.6,
                    lengthZ: 0.5
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#35404b'
                  }
                },
                children: [
                  {
                    geometry: {
                      type: 'sphere',
                      params: {
                        radius: 0.28,
                        pivot: 'bottom'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#c3c8ce'
                      }
                    },
                    localPosition: [0, 0.82, 0]
                  },
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.16,
                        lengthY: 0.9,
                        lengthZ: 0.16,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#252b31'
                      }
                    },
                    localPosition: [0.32, 0.78, 0],
                    children: [
                      {
                        tag: 'heldItemAnchor',
                        geometry: {
                          type: 'none'
                        },
                        localPosition: [0, -0.8, 0]
                      }
                    ]
                  },
                  {
                    geometry: {
                      type: 'box',
                      params: {
                        lengthX: 0.16,
                        lengthY: 0.9,
                        lengthZ: 0.16,
                        pivot: 'top'
                      }
                    },
                    material: {
                      type: 'solid',
                      params: {
                        color: '#252b31'
                      }
                    },
                    localPosition: [-0.32, 0.78, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: {
            speed: 3.6,
            jumpHeight: 2.2,
            canFly: false
          }
        },
        Inventory: {
          size: 1,
          items: ['sniper_rifle'],
          selectedItemIndex: 0
        },
        Health: {
          value: 11
        },
        AI: {
          isAggressive: true,
          awarenessRange: 70
        },
        Faction: {
          id: 'outpost_guard'
        }
      }
    });

    const campX = -halfSize + 60;
    const campZ = -halfSize + 80;
    const campY = sampleHeight(campX, campZ);

    spawn({
      Transform: {
        x: campX,
        y: campY + 0.4,
        z: campZ
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'cylinder',
                params: {
                  radius: 6,
                  height: 0.2
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#bfc7d0'
                }
              },
              localRotation: [0, 0, 0]
            }
          ]
        }
      },
      MotionSource: {
        type: 'static',
        params: {}
      }
    });

    spawn('snowmobile', {
      Transform: {
        x: campX + 4,
        y: campY + 0.6,
        z: campZ - 3
      }
    });

    const spawnSupplyCrate = (x, y, z) => {
      spawn({
        Info: {
          name: 'Supply Crate'
        },
        Transform: {
          x,
          y: y + 0.75,
          z
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1.4,
                    lengthY: 0.8,
                    lengthZ: 1.4
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#4d5c66'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1.45,
                    lengthY: 0.2,
                    lengthZ: 1.45
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#2c3338'
                  }
                },
                localPosition: [0, 0.5, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      });
    };

    spawnSupplyCrate(campX - 3, campY, campZ + 2);
    spawnSupplyCrate(campX + 2, campY, campZ + 4);

    {
      const buryDepth = 8;
      const bunkerX = campX + 10;
      const bunkerZ = campZ - 12;
      const bunkerBaseY = sampleHeight(bunkerX, bunkerZ) - buryDepth;

      const bunkerWidth = 16;
      const bunkerDepth = 12;
      const bunkerHeight = 6;

      spawn('player', {
        Transform: {
          x: bunkerX,
          y: bunkerBaseY,
          z: bunkerZ + bunkerDepth / 2 - 2
        },
        Inventory: {
          size: 3,  // give player reduced inventory so they need to choose their loadout carefully
          items: [],
          selectedItemIndex: 0
        }
      });

      spawn({
        Info: {
          name: 'Underground Bunker'
        },
        Transform: {
          x: bunkerX,
          y: bunkerBaseY + bunkerHeight / 2,
          z: bunkerZ
        },
        Body: {
          type: 'composite',
          params: {
            hasInterior: true,
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: bunkerWidth,
                    lengthY: bunkerHeight,
                    lengthZ: bunkerDepth
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#9da7af',
                    metalness: 0.1,
                    roughness: 0.7
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

      spawn({
        Transform: {
          x: bunkerX,
          y: bunkerBaseY + 0.15,
          z: bunkerZ
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: bunkerWidth,
                    lengthY: 0.3,
                    lengthZ: bunkerDepth
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#cfd8e1'
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

      const bunkerFloorTopY = bunkerBaseY + 0.3;

      const spawnShelf = (sx, sz) => {
        spawn({
          Info: {
            name: 'Shelf'
          },
          Transform: {
            x: sx,
            y: bunkerFloorTopY,
            z: sz
          },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.1,
                      lengthY: 1.6,
                      lengthZ: 0.5,
                      pivot: 'bottom'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#6b7b86'
                    }
                  },
                  localPosition: [-1.25, 0, 0]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.1,
                      lengthY: 1.6,
                      lengthZ: 0.5,
                      pivot: 'bottom'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#6b7b86'
                    }
                  },
                  localPosition: [1.25, 0, 0]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 2.7,
                      lengthY: 0.08,
                      lengthZ: 0.6,
                      pivot: 'bottom'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#a8b6c0'
                    }
                  },
                  localPosition: [0, 0.4, 0]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 2.7,
                      lengthY: 0.08,
                      lengthZ: 0.6,
                      pivot: 'bottom'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#a8b6c0'
                    }
                  },
                  localPosition: [0, 0.9, 0]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 2.7,
                      lengthY: 0.08,
                      lengthZ: 0.6,
                      pivot: 'bottom'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#a8b6c0'
                    }
                  },
                  localPosition: [0, 1.3, 0]
                }
              ]
            }
          },
          MotionSource: {
            type: 'static',
            params: {}
          }
        });
      };

      const shelfA = { x: bunkerX - 4, z: bunkerZ - 3 };
      const shelfB = { x: bunkerX - 4, z: bunkerZ + 3 };
      spawnShelf(shelfA.x, shelfA.z);
      spawnShelf(shelfB.x, shelfB.z);

      spawn('pistol', {
        Transform: {
          x: shelfA.x - 0.5,
          y: bunkerFloorTopY + 1.02,
          z: shelfA.z
        }
      });
      spawn('assault_rifle', {
        Transform: {
          x: shelfA.x + 0.5,
          y: bunkerFloorTopY + 1.02,
          z: shelfA.z
        }
      });

      spawn('sniper_rifle', {
        Transform: {
          x: shelfB.x,
          y: bunkerFloorTopY + 1.38,
          z: shelfB.z
        }
      });
      spawn('grenade', {
        Transform: {
          x: shelfB.x - 0.6,
          y: bunkerFloorTopY + 0.98,
          z: shelfB.z
        }
      });
      spawn('grenade', {
        Transform: {
          x: shelfB.x + 0.6,
          y: bunkerFloorTopY + 0.98,
          z: shelfB.z
        }
      });

      spawn('medkit', {
        Transform: {
          x: shelfB.x - 0.7,
          y: bunkerFloorTopY + 1.38,
          z: shelfB.z
        }
      });
      spawn('medkit', {
        Transform: {
          x: shelfB.x + 0.7,
          y: bunkerFloorTopY + 1.38,
          z: shelfB.z
        }
      });

      archetypes.register('walkie_talkie', {
        type: 'bundle',
        params: {
          Info: {
            name: 'Walkie Talkie',
            description: 'Primary: call in friendly gunship.'
          },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.16,
                      lengthY: 0.26,
                      lengthZ: 0.06
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#2e3b42'
                    }
                  }
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.14,
                      lengthY: 0.02,
                      lengthZ: 0.02
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#90a4ae'
                    }
                  },
                  localPosition: [0, 0.12, 0.02]
                },
                {
                  geometry: {
                    type: 'cylinder',
                    params: {
                      radius: 0.01,
                      height: 0.12
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#95a5a6'
                    }
                  },
                  localPosition: [0, 0.2, -0.02]
                }
              ]
            }
          },
          MotionSource: {
            type: 'dynamicRigidBody',
            params: {
              mass: 0.2,
              gravityScale: 1
            }
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: 'getPickedUp',
                params: {},
                target: 'self'
              }
            ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.2, actions: [
              {
                type: 'spawnEntityFrom',
                target: 'self',
                params: {
                  entity: 'attack_helicopter'
                }
              },
              {
                type: 'kill',
                params: {},
                target: 'self'
              }
            ] }]
        }
      });

      archetypes.register('minigun_round', {
        type: 'bundle',
        params: {
          Info: {
            name: 'Minigun Round'
          },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: {
                    type: 'cylinder',
                    params: {
                      radius: 0.2,
                      height: 0.24
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#000000'
                    }
                  },
                  ignoreCollisions: true,
                  localRotation: [Math.PI / 2, 0, 0]
                }
              ]
            }
          },
          MotionSource: {
            type: 'dynamicRigidBody',
            params: {
              mass: 0.03,
              gravityScale: 0
            }
          },
                    Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.5 } }, actions: [
              {
                type: 'damage',
                params: {
                  amount: 2,
                  knockback: 1
                },
                target: 'other',
                range: 0.5
              },
              {
                type: 'kill',
                params: {},
                target: 'self',
                range: 0.5
              }
            ] }]
        }
      });

      archetypes.register('attack_helicopter', {
        type: 'bundle',
        params: {
          Info: {
            name: 'Attack Helicopter',
            description: 'Friendly gunship. Press E to pilot.'
          },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 2.4,
                      lengthY: 0.6,
                      lengthZ: 6.0,
                      pivot: 'center'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#37474f',
                      metalness: 0.2,
                      roughness: 0.6
                    }
                  }
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 2.0,
                      lengthY: 0.5,
                      lengthZ: 1.6,
                      pivot: 'center'
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#90a4ae',
                      opacity: 0.7
                    }
                  },
                  localPosition: [0, 0.3, 1.4]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.6,
                      lengthY: 0.4,
                      lengthZ: 4.2
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#455a64'
                    }
                  },
                  localPosition: [0, 0.1, -4.0]
                },
                {
                  geometry: {
                    type: 'torus',
                    params: {
                      majorRadius: 2.6,
                      minorRadius: 0.05
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#cfd8dc'
                    }
                  },
                  ignoreCollisions: true,
                  localPosition: [0, 0.6, 0]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.8,
                      lengthY: 0.3,
                      lengthZ: 0.8
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#263238'
                    }
                  },
                  localPosition: [0, -0.1, 2.4],
                  children: [
                    {
                      tag: 'head',
                      geometry: {
                        type: 'none'
                      },
                      localPosition: [0, 0, 0.5]
                    }
                  ]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.2,
                      lengthY: 0.2,
                      lengthZ: 3.2
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#263238'
                    }
                  },
                  localPosition: [1.1, -0.35, 0.2]
                },
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: 0.2,
                      lengthY: 0.2,
                      lengthZ: 3.2
                    }
                  },
                  material: {
                    type: 'solid',
                    params: {
                      color: '#263238'
                    }
                  },
                  localPosition: [-1.1, -0.35, 0.2]
                }
              ]
            }
          },
          MotionSource: {
            type: 'characterController',
            params: {
              speed: 16,
              jumpHeight: 0,
              canFly: true
            }
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: 'mount',
                params: {
                  offset: [0, 0.8, 0]
                },
                target: 'self'
              }
            ] }, { trigger: { type: 'primaryAction' }, cooldown: 0, actions: [
              {
                type: 'spawnEntityFrom',
                target: 'self',
                params: {
                  entity: 'minigun_round',
                  velocity: 120
                }
              }
            ] }],
          Inventory: {
            size: 0,
            items: []
          },
          Health: {
            value: 36
          },
          AI: {
            isAggressive: true,
            awarenessRange: 200
          },
          Faction: {
            id: 'player_faction'
          }
        }
      });

      spawn('walkie_talkie', {
        Transform: {
          x: shelfA.x,
          y: bunkerFloorTopY + 1.02,
          z: shelfA.z
        }
      });

      spawn({
        Info: {
          name: 'Door to Begin Mission'
        },
        Transform: {
          x: bunkerX + bunkerWidth / 2,
          y: bunkerFloorTopY,
          z: bunkerZ,
          ry: Math.PI / 2
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 2,
                    lengthY: 2.8,
                    lengthZ: 0.3,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#4a5b6b'
                  }
                }
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'teleport',
              params: {
                position: {
                  x: campX,
                  y: campY + 0.6,
                  z: campZ + 1.5
                }
              },
              target: 'other'
            }
          ] }]
      });
    }

    const facilityX = 0;
    const facilityZ = 0;
    const facilityY = sampleHeight(facilityX, facilityZ);

    const facilityWidth = 46;
    const facilityDepth = 36;
    const facilityHeight = 12;

    spawn({
      Info: {
        name: 'Research Facility'
      },
      Transform: {
        x: facilityX,
        y: facilityY + facilityHeight / 2,
        z: facilityZ
      },
      Body: {
        type: 'composite',
        params: {
          hasInterior: true,
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: facilityWidth,
                  lengthY: facilityHeight,
                  lengthZ: facilityDepth
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#b7c1c9',
                  metalness: 0.2,
                  roughness: 0.6
                }
              }
            },
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: facilityWidth - 4,
                  lengthY: 0.6,
                  lengthZ: facilityDepth - 4,
                  pivot: 'bottom'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#e5edf2'
                }
              },
              localPosition: [0, facilityHeight / 2 - 0.6, 0]
            }
          ]
        }
      },
      MotionSource: {
        type: 'static',
        params: {}
      }
    });

    spawn({
      Transform: {
        x: facilityX,
        y: facilityY + 0.15,
        z: facilityZ
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: facilityWidth - 4,
                  lengthY: 0.3,
                  lengthZ: facilityDepth - 4
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#e2f0f9'
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

    const floorTopY = facilityY + 0.3;

    const interiorWall = (x, z, lengthX, lengthZ, rotation = 0) => {
      spawn({
        Transform: {
          x,
          y: floorTopY,
          z,
          ry: rotation
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX,
                    lengthY: 6,
                    lengthZ,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#cfd8e1'
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
    };

    interiorWall(facilityX - 10, facilityZ, 0.6, 18);
    interiorWall(facilityX + 12, facilityZ, 0.6, 18);
    interiorWall(facilityX, facilityZ - 6, 20, 0.6);
    interiorWall(facilityX, facilityZ + 8, 24, 0.6);

    {
      const interiorBaseY = facilityY + 0.15;
      const frontZ = facilityZ + facilityDepth / 2;
      const doorOutside = {
        x: facilityX,
        z: frontZ + 1.6
      };
      const doorOutsideY = sampleHeight(doorOutside.x, doorOutside.z) + 0.1;
      const doorInside = {
        x: facilityX,
        y: interiorBaseY + 0.6,
        z: frontZ - 4
      };

      spawn({
        Info: {
          name: 'Outpost Entrance'
        },
        Transform: {
          x: doorOutside.x,
          y: doorOutsideY,
          z: doorOutside.z
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 2,
                    lengthY: 2.8,
                    lengthZ: 0.3,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#4a5b6b'
                  }
                }
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'teleport',
              params: {
                position: doorInside
              },
              target: 'other'
            }
          ] }]
      });

      spawn({
        Info: {
          name: 'Outpost Exit'
        },
        Transform: {
          x: doorInside.x,
          y: doorInside.y,
          z: doorInside.z
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 2,
                    lengthY: 2.8,
                    lengthZ: 0.3,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#3b4956'
                  }
                }
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'teleport',
              params: {
                position: {
                  x: doorOutside.x,
                  y: doorOutsideY,
                  z: doorOutside.z + 1
                }
              },
              target: 'other'
            }
          ] }]
      });
    }

    {
      const vestibule = {
        width: 10,
        depth: 6
      };
      const frontZ = facilityZ + facilityDepth / 2;
      const zVestCenter = frontZ - (vestibule.depth / 2 + 1);

      interiorWall(
        facilityX - vestibule.width / 2,
        zVestCenter,
        0.6,
        vestibule.depth
      );
      interiorWall(
        facilityX + vestibule.width / 2,
        zVestCenter,
        0.6,
        vestibule.depth
      );

      const zBack = zVestCenter - vestibule.depth / 2;
      interiorWall(facilityX - 3.5, zBack, 3, 0.6);
      interiorWall(facilityX + 3.5, zBack, 3, 0.6);
    }

    spawn({
      Transform: {
        x: facilityX - 8,
        y: floorTopY,
        z: facilityZ + 2
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: 6,
                  lengthY: 1.6,
                  lengthZ: 0.6,
                  pivot: 'bottom'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#cfd8e1'
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

    spawn({
      Transform: {
        x: facilityX + 6,
        y: floorTopY,
        z: facilityZ + 0
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: 8,
                  lengthY: 1.6,
                  lengthZ: 0.6,
                  pivot: 'bottom'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#cfd8e1'
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

    spawn({
      Transform: {
        x: facilityX + 10,
        y: floorTopY,
        z: facilityZ - 6
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: 0.6,
                  lengthY: 1.6,
                  lengthZ: 5,
                  pivot: 'bottom'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#cfd8e1'
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

    const serverAreaWidth = 12;
    const serverAreaDepth = 8;
    const serverRoomX =
      facilityX + facilityWidth / 2 - (serverAreaWidth / 2 + 2);
    const serverRoomZ =
      facilityZ - facilityDepth / 2 + (serverAreaDepth / 2 + 2);

    interiorWall(
      serverRoomX,
      serverRoomZ - serverAreaDepth / 2,
      serverAreaWidth,
      0.6
    );
    interiorWall(
      serverRoomX,
      serverRoomZ + serverAreaDepth / 2,
      serverAreaWidth,
      0.6
    );
    interiorWall(
      serverRoomX - serverAreaWidth / 2,
      serverRoomZ,
      0.6,
      serverAreaDepth
    );
    interiorWall(
      serverRoomX + serverAreaWidth / 2,
      serverRoomZ,
      0.6,
      serverAreaDepth
    );

    const spawnServerRack = (x, z) => {
      spawn({
        Info: {
          name: 'Server Rack'
        },
        Transform: {
          x,
          y: facilityY + 3.5,
          z
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
                    lengthY: 3.2,
                    lengthZ: 0.8
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#1e2429'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 1.1,
                    lengthY: 3,
                    lengthZ: 0.2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#3a9ad9',
                    emissive: '#3a9ad9',
                    emissiveIntensity: 0.6
                  }
                },
                localPosition: [0, 0, 0.45]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      });
    };

    for (let i = 0; i < 3; i++) {
      spawnServerRack(serverRoomX - 3 + i * 3, serverRoomZ - 2);
      spawnServerRack(serverRoomX - 3 + i * 3, serverRoomZ + 2);
    }

    spawn({
      Info: {
        name: 'Stolen Hard Drive'
      },
      Transform: {
        x: serverRoomX,
        y: facilityY + 3,
        z: serverRoomZ
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: 0.4,
                  lengthY: 0.12,
                  lengthZ: 0.7
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#2f7ec1'
                }
              }
            },
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: 0.38,
                  lengthY: 0.1,
                  lengthZ: 0.68
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#12171c'
                }
              },
              localPosition: [0, 0.05, 0]
            }
          ]
        }
      },
      MotionSource: {
        type: 'dynamicRigidBody',
        params: {
          mass: 0.5
        }
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'getPickedUp',
            params: {},
            target: 'self'
          }
        ] }]
    });

    const dishBaseY = facilityY + facilityHeight + 1.2;

    spawn({
      Info: {
        name: 'Satellite Dish'
      },
      Transform: {
        x: facilityX,
        y: dishBaseY + 4,
        z: facilityZ - 2
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            // Large hemisphere dish mounted to the pole; rounded side touches the mount
            {
              geometry: {
                type: 'hemisphere',
                params: {
                  radius: 9,
                  pivot: 'top'
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#f4f7fa',
                  metalness: 0.35,
                  roughness: 0.2
                }
              },
              localPosition: [3, 2.2, -3],
              // Tilt forward slightly
              localRotation: [7 * Math.PI / 6, 0, -Math.PI/4]
            },
            // Support pole
            {
              geometry: {
                type: 'box',
                params: {
                  lengthX: 0.6,
                  lengthY: 6,
                  lengthZ: 0.6
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#c1cbd5'
                }
              },
              localPosition: [0, -3, 0]
            }
          ]
        }
      },
      MotionSource: {
        type: 'static',
        params: {}
      }
    });

  // (Removed previous off-center hemisphere dish spawn; integrated into the main Satellite Dish above)

    const chargePositions = [
      [facilityX + 6, facilityZ - 6],
      [facilityX - 6, facilityZ - 6],
      [facilityX, facilityZ + 6]
    ];

    chargePositions.forEach(([x, z]) => {
      spawn({
        Info: {
          name: 'Dish Support Charge'
        },
        Transform: {
          x,
          y: dishBaseY - 1.8,
          z
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.4,
                    lengthY: 0.2,
                    lengthZ: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#ff7043'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.12,
                    lengthY: 0.3,
                    lengthZ: 0.12
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#ffd54f'
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
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'discover',
              params: {},
              target: 'self'
            },
            {
              type: 'kill',
              params: {},
              target: 'self'
            }
          ] }]
      });
    });

    const transmitterOffsets = [
      [12, -18],
      [-14, -12],
      [0, 20]
    ];

    transmitterOffsets.forEach(([ox, oz]) => {
      const tx = facilityX + ox;
      const tz = facilityZ + oz;
      const ty = sampleHeight(tx, tz);
      spawn({
        Info: {
          name: 'Relay Transmitter'
        },
        Transform: {
          x: tx,
          y: ty + 2.6,
          z: tz
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
                    lengthY: 5,
                    lengthZ: 1.2
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#8897a3'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.4,
                    lengthY: 1.2,
                    lengthZ: 0.4
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#ffb74d',
                    emissive: '#ffb74d',
                    emissiveIntensity: 1.1
                  }
                },
                localPosition: [0, 2.6, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'discover',
              params: {},
              target: 'self'
            },
            {
              type: 'kill',
              params: {},
              target: 'self'
            }
          ] }]
      });
    });

    const sentries = [
      { x: facilityX + 16, z: facilityZ + 12 },
      { x: facilityX - 16, z: facilityZ + 12 },
      { x: facilityX + 14, z: facilityZ - 14 },
      { x: facilityX + 10, z: facilityZ + 6 },
      { x: facilityX - 12, z: facilityZ - 4 },
      { x: facilityX + 4, z: facilityZ - 10 },
      { x: facilityX - 8, z: facilityZ + 10 }
    ];

   

    sentries.forEach(({ x, z }) => {
      const sy = sampleHeight(x, z);
      spawn('soldier_pistol', {
        Transform: {
          x,
          y: sy + 1.6,
          z
        }
      });
    });

    const towerOffsets = [
      [facilityWidth / 2 + 3, facilityDepth / 2 + 3],
      [-facilityWidth / 2 - 3, facilityDepth / 2 + 3],
      [facilityWidth / 2 + 3, -facilityDepth / 2 - 3]
    ];

    towerOffsets.forEach(([ox, oz]) => {
      const x = facilityX + ox;
      const z = facilityZ + oz;
      const baseY = sampleHeight(x, z);

      spawn({
        Info: {
          name: 'Guard Tower'
        },
        Transform: {
          x,
          y: baseY + 6,
          z
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
                    lengthY: 0.4,
                    lengthZ: 4
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#9aa7b3'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 3,
                    lengthY: 2.2,
                    lengthZ: 3
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#c8d4dd',
                    opacity: 0.6
                  }
                },
                localPosition: [0, 1.3, 0]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.6,
                    lengthY: 12,
                    lengthZ: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#7f8c97'
                  }
                },
                localPosition: [1.6, -5.5, 1.6]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.6,
                    lengthY: 12,
                    lengthZ: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#7f8c97'
                  }
                },
                localPosition: [-1.6, -5.5, 1.6]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.6,
                    lengthY: 12,
                    lengthZ: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#7f8c97'
                  }
                },
                localPosition: [1.6, -5.5, -1.6]
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.6,
                    lengthY: 12,
                    lengthZ: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#7f8c97'
                  }
                },
                localPosition: [-1.6, -5.5, -1.6]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      });

      spawn('soldier_sniper', {
        Transform: {
          x,
          y: baseY + 11.4,
          z
        }
      });

      const guardPatrols = [
        {
          x: x + Math.random() * 10,
          z: z + Math.random() * 10
        },
        {
          x: x + Math.random() * 10,
          z: z + Math.random() * 10
        }
      ];

      guardPatrols.forEach(({ x, z }) => {
        const gy = sampleHeight(x, z);
        spawn('soldier_rifleman', {
          Transform: {
            x,
            y: gy + 1.6,
            z
          }
        });
      });
    });

    const evacX = halfSize - 50;
    const evacZ = halfSize - 60;
    const evacY = sampleHeight(evacX, evacZ);

    spawn({
      Info: {
        name: 'Evacuation Point'
      },
      Transform: {
        x: evacX,
        y: evacY + 0.2,
        z: evacZ
      },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'cylinder',
                params: {
                  radius: 5,
                  height: 0.4
                }
              },
              material: {
                type: 'solid',
                params: {
                  color: '#4caf50',
                  opacity: 0.7
                }
              },
              localRotation: [0, 0, 0]
            }
          ]
        }
      },
      MotionSource: {
        type: 'static',
        params: {}
      },
            Rules: [{ trigger: { type: 'entityInRange', params: { range: 4 } }, cooldown: 1.5, actions: [
          {
            type: 'discover',
            params: {},
            target: 'self',
            range: 4
          }
        ] }]
    });

    const campFires = [
      { x: campX - 2, z: campZ - 3 },
      { x: campX + 3, z: campZ + 5 }
    ];

    campFires.forEach(({ x, z }) => {
      spawn({
        Info: {
          name: 'Heater'
        },
        Transform: {
          x,
          y: campY + 0.8,
          z
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.5,
                    height: 0.6
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#a5513f'
                  }
                }
              },
              {
                geometry: {
                  type: 'sphere',
                  params: {
                    radius: 0.6
                  }
                },
                material: {
                  type: 'liquid',
                  params: {
                    baseColor: '#ffb347',
                    opacity: 0.7,
                    waveAmp: 0.5,
                    waveFreq: 6
                  }
                },
                localPosition: [0, 0.5, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      });
    });

    const perimeterLights = [];
    for (let i = -1; i <= 1; i++) {
      perimeterLights.push({
        x: facilityX + i * 18,
        z: facilityZ + facilityDepth / 2 + 6
      });
      perimeterLights.push({
        x: facilityX + i * 18,
        z: facilityZ - facilityDepth / 2 - 6
      });
    }
    [-1, 1].forEach((side) => {
      perimeterLights.push({
        x: facilityX + facilityWidth / 2 + 6,
        z: facilityZ + side * 12
      });
      perimeterLights.push({
        x: facilityX - facilityWidth / 2 - 6,
        z: facilityZ + side * 12
      });
    });

    perimeterLights.forEach(({ x, z }) => {
      const py = sampleHeight(x, z);
      spawn({
        Info: {
          name: 'Floodlight'
        },
        Transform: {
          x,
          y: py,
          z
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'cylinder',
                  params: {
                    radius: 0.25,
                    height: 6,
                    pivot: 'bottom'
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#49535b'
                  }
                }
              },
              {
                geometry: {
                  type: 'box',
                  params: {
                    lengthX: 0.7,
                    lengthY: 0.4,
                    lengthZ: 0.7
                  }
                },
                material: {
                  type: 'solid',
                  params: {
                    color: '#fff59d',
                    emissive: '#fff59d',
                    emissiveIntensity: 1.4
                  }
                },
                localPosition: [0, 6.2, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        }
      });
    });
  }
};
