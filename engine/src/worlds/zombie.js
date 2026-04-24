export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const rand = (min, max) => min + Math.random() * (max - min);
    const randInt = (min, max) => Math.floor(rand(min, max + 1));
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    initialize({
      title: 'Ashen Oaks Safe Zone',
      description: 'A suburban sprawl frozen mid-evacuation. Boarded homes, barricaded streets, and roaming infected define survival.',
      tags: ['horror', 'zombies', 'survival'],
      brandColors: ['#4a4f5a', '#f2d6a2'],
      dimensions: [
        {
          name: 'AshenOaks',
          gravity: -9.81,
          useDayNightCycle: true,
          sky: {
            color: '#4a4f5a',
            sun: {
              color: '#f2d6a2',
              intensity: 0.7,
              timeOfDay: 1730
            },
            clouds: {
              color: '#c9c1b9',
              coverage: 0.65
            },
            stars: {
              intensity: 0.2
            }
          },
          particleSystems: [
            {
              name: 'Ash Drift',
              position: [0, 14, 0],
              emitter: {
                rate: 120,
                maxParticles: 1400,
                lifetime: 6,
                speed: { min: 0.4, max: 1.0 },
                spread: 0.6,
                size: 0.12,
                opacity: 0.5,
                gravity: 0.15,
                color: '#b7aca3',
                direction: [0.3, -0.8, 0.2],
                shape: { type: 'box', size: [180, 3, 180] },
                localSpace: false
              }
            }
          ]
        }
      ],
      achievements: [
        {
          name: 'First Responder',
          description: 'Use a Med Kit to patch up.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items used',
              subtype: 'Med Kit',
              targetValue: 1
            }
          }
        },
        {
          name: 'Street Sweeper',
          description: 'Eliminate 5 infected in the streets.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'entities killed',
              subtype: 'Infected',
              targetValue: 5
            }
          }
        },
        {
          name: 'House Clearing',
          description: 'Clear 3 suburban interiors.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Cleared Home Marker',
              targetValue: 3
            }
          }
        },
        {
          name: 'Scavenger',
          description: 'Collect 8 pieces of loot.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              targetValue: 8
            }
          }
        }
      ]
    });

    const archetypes = getModule('archetype');

    // Loot and equipment archetypes
    archetypes.register('pistol_weapon', {
      type: 'bundle',
      params: {
        Info: {
          name: 'Pistol'
        },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.12, lengthZ: 0.6 } },
                material: { type: 'solid', params: { color: '#2b2b2b' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.18, lengthY: 0.08, lengthZ: 0.25 } },
                material: { type: 'solid', params: { color: '#555555' } },
                localPosition: [0, 0.1, -0.1]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 1.1 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.38, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: { entity: 'pistol_bullet', velocity: 46 }
            }
          ] }]
      }
    });

    archetypes.register('bow_weapon', {
      type: 'bundle',
      params: {
        Info: { name: 'Bow' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.05, height: 1.2 } },
                material: { type: 'solid', params: { color: '#4d3012' } }
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.9 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.85, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: { entity: 'survivor_arrow', velocity: 32 }
            }
          ] }]
      }
    });

    archetypes.register('flamethrower_weapon', {
      type: 'bundle',
      params: {
        Info: { name: 'Flamethrower' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.12, height: 0.9 } },
                material: { type: 'solid', params: { color: '#6f6c65' } },
                localRotation: [Math.PI / 2, 0, 0]
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.2, lengthZ: 0.2 } },
                material: { type: 'solid', params: { color: '#2e2a25' } },
                localPosition: [-0.45, 0, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 5 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction', params: { range: 5.5 } }, cooldown: 0.18, actions: [
            { type: 'damage', params: { amount: 4, knockback: 1.5 }, target: 'other', range: 5.5 },
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'flame_spray_fx', velocity: 8 } }
          ] }]
      }
    });

    archetypes.register('assault_rifle_weapon', {
      type: 'bundle',
      params: {
        Info: { name: 'Assault Rifle' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 0.15, lengthZ: 0.9 } },
                material: { type: 'solid', params: { color: '#1e1f21' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.12, lengthZ: 0.4 } },
                material: { type: 'solid', params: { color: '#414245' } },
                localPosition: [0.1, 0.12, -0.1]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 3.1 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.12, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'rifle_bullet', velocity: 68 } }
          ] }]
      }
    });

    archetypes.register('sniper_rifle_weapon', {
      type: 'bundle',
      params: {
        Info: { name: 'Sniper Rifle' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.05, height: 1.5 } },
                material: { type: 'solid', params: { color: '#161514' } },
                localRotation: [Math.PI / 2, 0, 0]
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 0.15, lengthZ: 0.5 } },
                material: { type: 'solid', params: { color: '#202020' } },
                localPosition: [-0.4, -0.05, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 4.2 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 1.0, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'sniper_round', velocity: 95 } }
          ] }]
      }
    });

    const registerHealingItem = (id, { name, heal, rarity }) => {
      archetypes.register(id, {
        type: 'bundle',
        params: {
          Info: { name },
          Body: {
            type: 'composite',
            params: {
              parts: rarity
            }
          },
          MotionSource: {
            type: 'dynamicRigidBody',
            params: { mass: 0.4 }
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              { type: 'getPickedUp', params: {}, target: 'self' }
            ] }, { trigger: { type: 'primaryAction' }, actions: [
              { type: 'heal', params: { amount: heal }, target: 'user' },
              { type: 'kill', params: {}, target: 'self' }
            ] }]
        }
      });
    };

    registerHealingItem('med_kit', {
      name: 'Med Kit',
      heal: 60,
      rarity: [
        {
          geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.2, lengthZ: 0.35 } },
          material: { type: 'solid', params: { color: '#d32f2f' } }
        },
        {
          geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.1, lengthZ: 0.45 } },
          material: { type: 'solid', params: { color: '#fafafa' } },
          localPosition: [0, 0.18, 0]
        },
        {
          geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 0.1, lengthZ: 0.5 } },
          material: { type: 'solid', params: { color: '#fafafa' } },
          localPosition: [0, 0.18, 0]
        }
      ]
    });

    registerHealingItem('bandages', {
      name: 'Bandages',
      heal: 20,
      rarity: [
        {
          geometry: { type: 'cylinder', params: { radius: 0.18, height: 0.4 } },
          material: { type: 'solid', params: { color: '#eaeaea' } },
          localRotation: [Math.PI / 2, 0, 0]
        },
        {
          geometry: { type: 'box', params: { lengthX: 0.1, lengthY: 0.1, lengthZ: 0.4 } },
          material: { type: 'solid', params: { color: '#b71c1c' } }
        }
      ]
    });

    registerHealingItem('apple', {
      name: 'Apple',
      heal: 10,
      rarity: [
        {
          geometry: { type: 'sphere', params: { radius: 0.18 } },
          material: { type: 'solid', params: { color: '#c62828' } }
        },
        {
          geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.12, pivot: 'bottom' } },
          material: { type: 'solid', params: { color: '#6d4c41' } },
          localPosition: [0, 0.18, 0]
        }
      ]
    });

    registerHealingItem('energy_bar', {
      name: 'Energy Bar',
      heal: 14,
      rarity: [
        {
          geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.1, lengthZ: 0.15 } },
          material: { type: 'solid', params: { color: '#a85f2f' } }
        },
        {
          geometry: { type: 'box', params: { lengthX: 0.42, lengthY: 0.06, lengthZ: 0.17 } },
          material: { type: 'solid', params: { color: '#ffd54f' } },
          localPosition: [0, 0.08, 0]
        }
      ]
    });

    archetypes.register('grenade', {
      type: 'bundle',
      params: {
        Info: { name: 'Grenade' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 0.16 } },
                material: { type: 'solid', params: { color: '#616161' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.08, lengthY: 0.04, lengthZ: 0.08 } },
                material: { type: 'solid', params: { color: '#424242' } },
                localPosition: [0, 0.18, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.7 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 1.2, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: { entity: 'grenade_projectile', velocity: 20 }
            }
          ] }]
      }
    });

    archetypes.register('proximity_mine', {
      type: 'bundle',
      params: {
        Info: { name: 'Proximity Mine' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.25, height: 0.1 } },
                material: { type: 'solid', params: { color: '#2f2f2f' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.08, lengthZ: 0.3 } },
                material: { type: 'solid', params: { color: '#4f772d' } },
                localPosition: [0, 0.08, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 1.2 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 1.5, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: { entity: 'mine_deployable', velocity: 2 }
            }
          ] }]
      }
    });

    const registerThrown = (id, name, color, damage = 8, velocity = 16) => {
      archetypes.register(id, {
        type: 'bundle',
        params: {
          Info: { name },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.1, lengthZ: 0.2 } },
                  material: { type: 'solid', params: { color } }
                }
              ]
            }
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.9 }
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'getPickedUp', params: {}, target: 'self' }
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 0.6, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: { entity: id + '_projectile', velocity }
            }
          ] }]
      });

      archetypes.register(id + '_projectile', {
        type: 'bundle',
        params: {
          Info: { name: name + ' Projectile' },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.1, lengthZ: 0.2 } },
                  material: { type: 'solid', params: { color } }
                }
              ]
            }
          },
          MotionSource: {
            type: 'dynamicRigidBody',
            params: { mass: 0.5 }
          },
                    Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
              { type: 'damage', params: { amount: damage, knockback: 2.5 }, target: 'other' },
              { type: 'kill', params: {}, target: 'self' }
            ] }]
        }
      });
    };

    registerThrown('brick', 'Brick', '#8d6e63', 10, 18);
    registerThrown('bottle', 'Glass Bottle', '#9ec5c9', 6, 20);

    archetypes.register('pistol_bullet', {
      type: 'bundle',
      params: {
        Info: { name: 'Bullet' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.24 } },
                material: { type: 'solid', params: { color: '#d7c27a' } },
                localRotation: [Math.PI / 2, 0, 0],
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.04, gravityScale: 0 }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.22 } }, actions: [
            { type: 'damage', params: { amount: 15 }, target: 'other', range: 0.22 },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    archetypes.register('survivor_arrow', {
      type: 'bundle',
      params: {
        Info: { name: 'Arrow' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.035, height: 0.9 } },
                material: { type: 'solid', params: { color: '#b0a084' } },
                localRotation: [Math.PI / 2, 0, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.05 }
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
            { type: 'damage', params: { amount: 18, knockback: 3 }, target: 'other' },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    archetypes.register('flame_spray_fx', {
      type: 'bundle',
      params: {
        Info: { name: 'Flame Burst' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 0.5 } },
                material: { type: 'liquid', params: { baseColor: '#ff6f00', opacity: 0.4, waveAmp: 0.4, waveFreq: 5 } }
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.02, gravityScale: 0 }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 2 } }, cooldown: 0.05, actions: [
            { type: 'damage', params: { amount: 2 }, target: 'other', range: 2 },
            { type: 'kill', params: {}, target: 'self', range: 2 }
          ] }]
      }
    });

    archetypes.register('rifle_bullet', {
      type: 'bundle',
      params: {
        Info: { name: 'Rifle Bullet' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.035, height: 0.3 } },
                material: { type: 'solid', params: { color: '#c8c8c8' } },
                localRotation: [Math.PI / 2, 0, 0],
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.05, gravityScale: 0 }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.22 } }, actions: [
            { type: 'damage', params: { amount: 20 }, target: 'other', range: 0.22 },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    archetypes.register('sniper_round', {
      type: 'bundle',
      params: {
        Info: { name: 'Sniper Round' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.04, height: 0.4 } },
                material: { type: 'solid', params: { color: '#ffe082' } },
                localRotation: [Math.PI / 2, 0, 0],
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.06, gravityScale: 0 }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.22 } }, actions: [
            { type: 'damage', params: { amount: 50, knockback: 6 }, target: 'other', range: 0.22 },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    archetypes.register('grenade_projectile', {
      type: 'bundle',
      params: {
        Info: { name: 'Thrown Grenade' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 0.16 } },
                material: { type: 'solid', params: { color: '#757575' } }
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.8, gravityScale: 1 }
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
            { type: 'spawnEntity', params: { entity: 'grenade_explosion' }, target: 'self' },
            { type: 'kill', params: {}, target: 'self' }
          ] }]
      }
    });

    archetypes.register('grenade_explosion', {
      type: 'bundle',
      params: {
        Info: { name: 'Explosion' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 0.2 } },
                material: { type: 'liquid', params: { baseColor: '#ff9800', opacity: 0.6, waveAmp: 0.8, waveFreq: 9 } },
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.01, gravityScale: 0 }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 4 } }, cooldown: 0.02, actions: [
            { type: 'damage', params: { amount: 40, knockback: 8 }, target: 'other', range: 4 },
            { type: 'kill', params: {}, target: 'self', range: 4 }
          ] }]
      }
    });

    archetypes.register('mine_deployable', {
      type: 'bundle',
      params: {
        Info: { name: 'Armed Mine' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.25, height: 0.12 } },
                material: { type: 'solid', params: { color: '#212121' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.05, lengthY: 0.2, lengthZ: 0.05 } },
                material: { type: 'solid', params: { color: '#f44336' } },
                localPosition: [0, 0.16, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: 'static',
          params: {}
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.5 } }, cooldown: 0.2, actions: [
            { type: 'spawnEntity', params: { entity: 'grenade_explosion' }, target: 'self', range: 2.5 },
            { type: 'kill', params: {}, target: 'self', range: 2.5 }
          ] }]
      }
    });

    archetypes.register('toxic_cloud', {
      type: 'bundle',
      params: {
        Info: { name: 'Toxic Cloud' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 1.8 } },
                material: { type: 'liquid', params: { baseColor: '#7cb342', opacity: 0.45, waveAmp: 0.5, waveFreq: 2.5 } },
                ignoreCollisions: true
              }
            ]
          }
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: { mass: 0.01, gravityScale: 0 }
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 1.8 } }, cooldown: 0.3, actions: [
            { type: 'damage', params: { amount: 6 }, target: 'other', range: 1.8 },
            { type: 'kill', params: {}, target: 'self', range: 1.8 }
          ] }]
      }
    });

    archetypes.register('infected_shambler', {
      type: 'bundle',
      params: {
        Info: { name: 'Infected' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'torso',
                geometry: { type: 'box', params: { lengthX: 0.7, lengthY: 1.3, lengthZ: 0.5 } },
                material: { type: 'solid', params: { color: '#4e5d45' } },
                children: [
                  {
                    geometry: { type: 'sphere', params: { radius: 0.28, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#8c9a84' } },
                    localPosition: [0, 0.65, 0]
                  },
                  {
                    geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 0.9, lengthZ: 0.15, pivot: 'top' } },
                    material: { type: 'solid', params: { color: '#4e5d45' } },
                    localPosition: [0.32, 0.65, 0]
                  },
                  {
                    geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 0.9, lengthZ: 0.15, pivot: 'top' } },
                    material: { type: 'solid', params: { color: '#4e5d45' } },
                    localPosition: [-0.32, 0.65, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: { speed: 3.2, jumpHeight: 2.5, canFly: false }
        },
        Health: { value: 35 },
        AI: { isAggressive: true, awarenessRange: 22 },
        Faction: { id: 'infected' },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.9, actions: [
            { type: 'damage', params: { amount: 9 }, target: 'other' }
          ] }]
      }
    });

    archetypes.register('infected_runner', {
      type: 'bundle',
      params: {
        Info: { name: 'Runner' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'torso',
                geometry: { type: 'box', params: { lengthX: 0.55, lengthY: 1.15, lengthZ: 0.45 } },
                material: { type: 'solid', params: { color: '#556b2f' } },
                children: [
                  {
                    geometry: { type: 'sphere', params: { radius: 0.24, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#99a86e' } },
                    localPosition: [0, 0.55, 0]
                  },
                  {
                    geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.8, lengthZ: 0.12, pivot: 'top' } },
                    material: { type: 'solid', params: { color: '#556b2f' } },
                    localPosition: [0.26, 0.55, 0]
                  },
                  {
                    geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.8, lengthZ: 0.12, pivot: 'top' } },
                    material: { type: 'solid', params: { color: '#556b2f' } },
                    localPosition: [-0.26, 0.55, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: { speed: 6.2, jumpHeight: 3.5, canFly: false }
        },
        Health: { value: 25 },
        AI: { isAggressive: true, awarenessRange: 28 },
        Faction: { id: 'infected' },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.6, actions: [
            { type: 'damage', params: { amount: 7, knockback: 3 }, target: 'other' }
          ] }]
      }
    });

    archetypes.register('infected_bloater', {
      type: 'bundle',
      params: {
        Info: { name: 'Bloater' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'torso',
                geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.6, lengthZ: 0.9 } },
                material: { type: 'solid', params: { color: '#5c6f39' } },
                children: [
                  {
                    geometry: { type: 'sphere', params: { radius: 0.35, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#9bad76' } },
                    localPosition: [0, 0.8, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: {
          type: 'characterController',
          params: { speed: 2.3, jumpHeight: 2, canFly: false }
        },
        Health: { value: 80 },
        AI: { isAggressive: true, awarenessRange: 24 },
        Faction: { id: 'infected' },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 1.2, actions: [
            { type: 'damage', params: { amount: 18, knockback: 5 }, target: 'other' },
            { type: 'spawnEntity', params: { entity: 'toxic_cloud' }, target: 'self' }
          ] }]
      }
    });

    // Register a flat terrain field (zero amplitude) for displacedPlane ground
    const fields = getModule('field');
    fields.register('flat_zero', {
      type: 'simplex',
      params: {
        amplitude: 0,
        frequency: 1,
        octaves: 1,
        seed: 0
      }
    });

    archetypes.register('destroyed_car', {
      type: 'bundle',
      params: {
        Info: { name: 'Destroyed Car' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.8, lengthZ: 4.4 } },
                material: { type: 'solid', params: { color: '#343434', roughness: 1 } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.6, lengthZ: 1.4 } },
                material: { type: 'solid', params: { color: '#1f1f1f' } },
                localPosition: [0, 0.7, -1.2]
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.4, lengthZ: 0.4 } },
                material: { type: 'solid', params: { color: '#616161' } },
                localPosition: [1.0, -0.3, 2]
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.4, lengthZ: 0.4 } },
                material: { type: 'solid', params: { color: '#616161' } },
                localPosition: [-1.0, -0.3, 2]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('makeshift_blockade', {
      type: 'bundle',
      params: {
        Info: { name: 'Makeshift Blockade' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 5, lengthY: 1.2, lengthZ: 0.6 } },
                material: { type: 'solid', params: { color: '#6d4c41' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 5.4, lengthY: 0.3, lengthZ: 0.8 } },
                material: { type: 'solid', params: { color: '#8d6e63' } },
                localPosition: [0, 0.9, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    const terrainSize = 220;

    // Base terrain
    spawn({
      Info: { name: 'Suburban Ground' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'displacedPlane', params: { lengthX: terrainSize, lengthZ: terrainSize, field: 'flat_zero' } },
              material: { type: 'solid', params: { color: '#4f6346', roughness: 1 } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    const paveRoad = (x, z, lengthX, lengthZ, rotation = 0, color = '#1f1f1f') => {
      spawn({
        Transform: { x, y: 0.02, z, ry: rotation },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX, lengthY: 0.2, lengthZ } },
                material: { type: 'solid', params: { color, roughness: 0.9 } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    };

    const addSidewalk = (x, z, lengthX, lengthZ, rotation = 0) => {
      spawn({
        Transform: { x, y: 0.05, z, ry: rotation },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX, lengthY: 0.1, lengthZ } },
                material: { type: 'solid', params: { color: '#b0a99f', roughness: 0.8 } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    };

    const blockSpacing = 70;
    const roadWidth = 16;
    const sidewalkWidth = 6;
    const safehousePosition = { x: 0, y: 0.6, z: -blockSpacing * 1.2 };

    for (let i = -1; i <= 1; i++) {
      paveRoad(0, i * blockSpacing, terrainSize, roadWidth);
      addSidewalk(0, i * blockSpacing - roadWidth / 2 - sidewalkWidth / 2, terrainSize, sidewalkWidth);
      addSidewalk(0, i * blockSpacing + roadWidth / 2 + sidewalkWidth / 2, terrainSize, sidewalkWidth);
    }

    for (let i = -1; i <= 1; i++) {
      paveRoad(i * blockSpacing, 0, roadWidth, terrainSize);
      addSidewalk(i * blockSpacing - roadWidth / 2 - sidewalkWidth / 2, 0, sidewalkWidth, terrainSize);
      addSidewalk(i * blockSpacing + roadWidth / 2 + sidewalkWidth / 2, 0, sidewalkWidth, terrainSize);
    }

    // Props
    for (let i = 0; i < 8; i++) {
      const sx = rand(-terrainSize / 2 + 20, terrainSize / 2 - 20);
      const sz = rand(-terrainSize / 2 + 20, terrainSize / 2 - 20);
      spawn('destroyed_car', { Transform: { x: sx, y: 0.2, z: sz, ry: rand(0, Math.PI * 2) } });
    }

    for (let i = 0; i < 6; i++) {
      const sx = rand(-terrainSize / 2 + 20, terrainSize / 2 - 20);
      const sz = rand(-terrainSize / 2 + 20, terrainSize / 2 - 20);
      spawn('makeshift_blockade', { Transform: { x: sx, y: 0.1, z: sz, ry: rand(0, Math.PI * 2) } });
    }

    const furnitureCatalog = [
      { name: 'Couch', w: 3.2, h: 1.1, d: 1.2, color: '#5d5b58' },
      { name: 'Armchair', w: 1.4, h: 1, d: 1.2, color: '#6f665f' },
      { name: 'Dining Table', w: 2.8, h: 0.9, d: 1.4, color: '#7d5a3a' },
      { name: 'Coffee Table', w: 1.6, h: 0.6, d: 0.9, color: '#4f3c2e' },
      { name: 'Bed', w: 3, h: 1, d: 2.2, color: '#9e9e9e' },
      { name: 'Nightstand', w: 0.9, h: 0.8, d: 0.9, color: '#7f6a54' },
      { name: 'Wardrobe', w: 2.2, h: 2.4, d: 1.0, color: '#5d4c42' },
      { name: 'Kitchen Island', w: 2.4, h: 1, d: 1.2, color: '#9c8f7f' },
      { name: 'Fridge', w: 1.0, h: 2.2, d: 1.0, color: '#d7d7d7' },
      { name: 'Bathtub', w: 1.9, h: 0.8, d: 0.8, color: '#cfd8dc' }
    ];

    const spawnFurniture = (room, localBaseY, toWorld, interiorBaseY) => {
      const furnitureCount = randInt(2, 4);
      for (let i = 0; i < furnitureCount; i++) {
        const piece = choice(furnitureCatalog);
        const localX = room.x + rand(-room.w / 2 + 0.5, room.w / 2 - 0.5);
        const localZ = room.z + rand(-room.d / 2 + 0.5, room.d / 2 - 0.5);
        const { x, z } = toWorld(localX, localZ);
        const baseY = interiorBaseY + localBaseY;
        spawn({
          Info: { name: piece.name },
          Transform: { x, y: baseY, z, ry: rand(0, Math.PI * 2) },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: {
                    type: 'box',
                    params: {
                      lengthX: piece.w,
                      lengthY: piece.h,
                      lengthZ: piece.d,
                      pivot: 'bottom'
                    }
                  },
                  material: { type: 'solid', params: { color: piece.color } }
                }
              ]
            }
          },
          MotionSource: { type: 'static', params: {} }
        });
      }
    };

    const spawnLoot = (room, localBaseY, toWorld, interiorBaseY) => {
      const lootChoices = [
        'bandages',
        'med_kit',
        'apple',
        'energy_bar',
        'grenade',
        'proximity_mine',
        'brick',
        'bottle',
        'bow_weapon',
        'flamethrower_weapon',
        'assault_rifle_weapon',
        'sniper_rifle_weapon'
      ];
      const dropCount = randInt(1, 2);
      for (let i = 0; i < dropCount; i++) {
        const item = choice(lootChoices);
        const localX = room.x + rand(-room.w / 2 + 0.5, room.w / 2 - 0.5);
        const localZ = room.z + rand(-room.d / 2 + 0.5, room.d / 2 - 0.5);
        const { x, z } = toWorld(localX, localZ);
        spawn(item, { Transform: { x, y: interiorBaseY + localBaseY + 0.35, z } });
      }
    };

    const buildHouse = (worldX, worldZ, rotation = 0) => {
      const width = rand(16, 22);
      const depth = rand(16, 24);
      const floors = 2;
      const wallHeight = 3.3;
      const totalHeight = wallHeight * floors;
      const baseY = 0.4;
      const interiorBaseY = baseY - 0.2;
      const wallThickness = 0.4;
      const doorWidth = 2.6;

      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const toWorld = (lx, lz) => ({
        x: worldX + lx * cosR - lz * sinR,
        z: worldZ + lx * sinR + lz * cosR
      });

      const houseParts = [];
      houseParts.push({
        geometry: { type: 'box', params: { lengthX: width, lengthY: 0.4, lengthZ: depth, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: '#3b3a36' } },
        localPosition: [0, -0.4, 0]
      });

      const exteriorColor = choice(['#5e5d57', '#4d4a45', '#656056', '#585450']);
      const roofColor = choice(['#2c2b29', '#3c3a38', '#4a4037']);

      const frontZ = depth / 2;
      const backZ = -depth / 2;
      const leftX = -width / 2;
      const rightX = width / 2;

      const frontSegment = Math.max(0.8, (width - doorWidth) / 2);
      houseParts.push({
        geometry: { type: 'box', params: { lengthX: frontSegment, lengthY: totalHeight, lengthZ: wallThickness, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: exteriorColor } },
        localPosition: [-doorWidth / 2 - frontSegment / 2, 0, frontZ]
      });
      houseParts.push({
        geometry: { type: 'box', params: { lengthX: frontSegment, lengthY: totalHeight, lengthZ: wallThickness, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: exteriorColor } },
        localPosition: [doorWidth / 2 + frontSegment / 2, 0, frontZ]
      });
      houseParts.push({
        geometry: { type: 'box', params: { lengthX: doorWidth + 0.6, lengthY: 0.6, lengthZ: wallThickness, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: exteriorColor } },
        localPosition: [0, totalHeight - 0.6, frontZ]
      });

      houseParts.push({
        geometry: { type: 'box', params: { lengthX: width, lengthY: totalHeight, lengthZ: wallThickness, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: exteriorColor } },
        localPosition: [0, 0, backZ]
      });
      houseParts.push({
        geometry: { type: 'box', params: { lengthX: wallThickness, lengthY: totalHeight, lengthZ: depth, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: exteriorColor } },
        localPosition: [leftX, 0, 0]
      });
      houseParts.push({
        geometry: { type: 'box', params: { lengthX: wallThickness, lengthY: totalHeight, lengthZ: depth, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: exteriorColor } },
        localPosition: [rightX, 0, 0]
      });

      houseParts.push({
        geometry: { type: 'box', params: { lengthX: width + 0.8, lengthY: 0.5, lengthZ: depth + 0.8, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: roofColor } },
        localPosition: [0, totalHeight, 0]
      });

      houseParts.push({
        geometry: { type: 'box', params: { lengthX: 4.5, lengthY: 0.2, lengthZ: 2.6, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: '#2f2f2f' } },
        localPosition: [0, -0.4, frontZ + 1.5]
      });

      let garage = null;
      if (Math.random() < 0.5) {
        const garageWidth = width * rand(0.4, 0.48);
        const garageDepth = depth * rand(0.55, 0.7);
        const garageHeight = wallHeight * 1.1;
        const offsetX = rightX + garageWidth / 2 + 4;
        const offsetZ = frontZ - garageDepth / 2;
        garage = { width: garageWidth, depth: garageDepth, height: garageHeight, offsetX, offsetZ };
        houseParts.push({
          geometry: { type: 'box', params: { lengthX: garageWidth, lengthY: garageHeight, lengthZ: garageDepth, pivot: 'bottom' } },
          material: { type: 'solid', params: { color: exteriorColor } },
          localPosition: [offsetX, 0, offsetZ]
        });
        houseParts.push({
          geometry: { type: 'box', params: { lengthX: garageWidth + 0.5, lengthY: 0.4, lengthZ: garageDepth + 0.5, pivot: 'bottom' } },
          material: { type: 'solid', params: { color: roofColor } },
          localPosition: [offsetX, garageHeight, offsetZ]
        });
      }

      spawn({
        Info: { name: 'Abandoned Home' },
        Transform: { x: worldX, y: baseY, z: worldZ, ry: rotation },
        Body: { type: 'composite', params: { hasInterior: true, parts: houseParts } },
        MotionSource: { type: 'static', params: {} }
      });

      const makeFloorLayout = (floorNum) => {
        const frontDepth = depth * rand(0.32, 0.45);
        const backDepth = depth - frontDepth;
        const kitchenWidth = width * rand(0.35, 0.45);
        const bedroomWidth = width - kitchenWidth;
        const bathroomDepth = backDepth * rand(0.3, 0.4);
        const hallwayDepth = backDepth - bathroomDepth;

        const rooms = [];
        rooms.push({
          name: floorNum === 0 ? 'Living Room' : 'Landing',
          x: 0,
          z: depth / 2 - frontDepth / 2,
          w: Math.max(5, width - 1),
          d: Math.max(4, frontDepth - 1)
        });

        rooms.push({
          name: floorNum === 0 ? 'Kitchen' : 'Bedroom',
          x: -width / 2 + kitchenWidth / 2,
          z: -depth / 2 + hallwayDepth + bathroomDepth / 2,
          w: Math.max(3.5, kitchenWidth - 1.2),
          d: Math.max(3, bathroomDepth - 0.8)
        });

        rooms.push({
          name: floorNum === 0 ? 'Dining Room' : 'Guest Bedroom',
          x: width / 2 - bedroomWidth / 2,
          z: -depth / 2 + hallwayDepth + bathroomDepth / 2,
          w: Math.max(3.5, bedroomWidth - 1.2),
          d: Math.max(3, bathroomDepth - 0.8)
        });

        const bathDepthSize = Math.max(2.8, bathroomDepth - 0.6);
        rooms.push({
          name: 'Bathroom',
          x: 0,
          z: -depth / 2 + bathDepthSize / 2,
          w: width - 2,
          d: bathDepthSize
        });

        if (hallwayDepth > 3) {
          rooms.push({
            name: floorNum === 0 ? 'Hallway' : 'Study',
            x: 0,
            z: -depth / 2 + bathroomDepth + hallwayDepth / 2,
            w: width - 2,
            d: hallwayDepth - 0.6
          });
        }

        return rooms;
      };

      const floorsLayouts = [makeFloorLayout(0), makeFloorLayout(1)];
      const floorParts = [];
      const interiorWallParts = [];
      const interiorRooms = [];

      floorsLayouts.forEach((rooms, floorIdx) => {
        const levelY = floorIdx * (wallHeight + 0.2);
        floorParts.push({
          geometry: { type: 'box', params: { lengthX: width, lengthY: 0.2, lengthZ: depth, pivot: 'bottom' } },
          material: { type: 'solid', params: { color: '#3f3d3a' } },
          localPosition: [0, levelY - 0.2, 0]
        });

        const interiorWallColor = '#58534a';
        const partitionThickness = 0.25;
        const doorGap = 2.2;
        const interiorMargin = 0.8;
        const doorwayBuffer = 0.3;

        const pushWallSegments = (orientation, position) => {
          if (orientation === 'horizontal') {
            const z = position;
            const leftStart = -width / 2 + interiorMargin;
            const leftEnd = -doorGap / 2 - doorwayBuffer;
            const rightStart = doorGap / 2 + doorwayBuffer;
            const rightEnd = width / 2 - interiorMargin;

            const leftLength = leftEnd - leftStart;
            if (leftLength > 0.5) {
              interiorWallParts.push({
                geometry: { type: 'box', params: { lengthX: leftLength, lengthY: wallHeight, lengthZ: partitionThickness, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: interiorWallColor } },
                localPosition: [(leftStart + leftEnd) / 2, levelY, z]
              });
            }

            const rightLength = rightEnd - rightStart;
            if (rightLength > 0.5) {
              interiorWallParts.push({
                geometry: { type: 'box', params: { lengthX: rightLength, lengthY: wallHeight, lengthZ: partitionThickness, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: interiorWallColor } },
                localPosition: [(rightStart + rightEnd) / 2, levelY, z]
              });
            }
          } else {
            const x = position;
            const backStart = -depth / 2 + interiorMargin;
            const backEnd = -doorGap / 2 - doorwayBuffer;
            const frontStart = doorGap / 2 + doorwayBuffer;
            const frontEnd = depth / 2 - interiorMargin;

            const backLength = backEnd - backStart;
            if (backLength > 0.5) {
              interiorWallParts.push({
                geometry: { type: 'box', params: { lengthX: partitionThickness, lengthY: wallHeight, lengthZ: backLength, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: interiorWallColor } },
                localPosition: [x, levelY, (backStart + backEnd) / 2]
              });
            }

            const frontLength = frontEnd - frontStart;
            if (frontLength > 0.5) {
              interiorWallParts.push({
                geometry: { type: 'box', params: { lengthX: partitionThickness, lengthY: wallHeight, lengthZ: frontLength, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: interiorWallColor } },
                localPosition: [x, levelY, (frontStart + frontEnd) / 2]
              });
            }
          }
        };

        const uniqueX = new Set();
        const uniqueZ = new Set();
        rooms.forEach((room) => {
          uniqueX.add(room.x - room.w / 2);
          uniqueX.add(room.x + room.w / 2);
          uniqueZ.add(room.z - room.d / 2);
          uniqueZ.add(room.z + room.d / 2);
        });

        const sortedX = [...uniqueX].filter((v) => Math.abs(v) < width / 2 - interiorMargin).sort((a, b) => a - b);
        const sortedZ = [...uniqueZ].filter((v) => Math.abs(v) < depth / 2 - interiorMargin).sort((a, b) => a - b);

        sortedZ.forEach((cut) => pushWallSegments('horizontal', cut));
        sortedX.forEach((cut) => pushWallSegments('vertical', cut));

        rooms.forEach((room) => {
          interiorRooms.push({ room, floorIdx });
          spawnFurniture(room, levelY, toWorld, interiorBaseY);
          if (Math.random() < 0.6) {
            spawnLoot(room, levelY, toWorld, interiorBaseY);
          }
        });
      });

      if (floors > 1) {
        const stairX = -width / 2 + 3;
        const stairZ = depth / 2 - 5;
        const steps = 7;
        for (let i = 0; i < steps; i++) {
          interiorWallParts.push({
            geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.25, lengthZ: 0.8, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#4a4239' } },
            localPosition: [stairX, 0.3 + i * 0.25, stairZ - i * 0.75]
          });
        }
      }

      if (garage) {
        floorParts.push({
          geometry: { type: 'box', params: { lengthX: garage.width - 1, lengthY: 0.2, lengthZ: garage.depth - 1, pivot: 'bottom' } },
          material: { type: 'solid', params: { color: '#3f3d3a' } },
          localPosition: [garage.offsetX, -0.2, garage.offsetZ]
        });

        const dividerLength = garage.depth - 1.4;
        if (dividerLength > 1) {
          interiorWallParts.push({
            geometry: { type: 'box', params: { lengthX: wallThickness, lengthY: wallHeight, lengthZ: dividerLength / 2, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#58534a' } },
            localPosition: [rightX + 2, 0, garage.offsetZ + dividerLength / 4 + 0.5]
          });
          interiorWallParts.push({
            geometry: { type: 'box', params: { lengthX: wallThickness, lengthY: wallHeight, lengthZ: dividerLength / 2, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#58534a' } },
            localPosition: [rightX + 2, 0, garage.offsetZ - dividerLength / 4 - 0.5]
          });
        }
      }

      if (floorParts.length) {
        spawn({
          Info: { name: 'Home Floors' },
          Transform: { x: worldX, y: interiorBaseY, z: worldZ, ry: rotation },
          Body: { type: 'composite', params: { parts: floorParts } },
          MotionSource: { type: 'static', params: {} }
        });
      }

      if (interiorWallParts.length) {
        spawn({
          Info: { name: 'Home Interior Walls' },
          Transform: { x: worldX, y: interiorBaseY, z: worldZ, ry: rotation },
          Body: { type: 'composite', params: { parts: interiorWallParts } },
          MotionSource: { type: 'static', params: {} }
        });
      }

      const entryWorld2D = toWorld(0, frontZ + 2);
      const entryWorld = { x: entryWorld2D.x, y: baseY + 0.1, z: entryWorld2D.z };
      const interiorEntry2D = toWorld(0, frontZ - 2);
      const interiorEntry = { x: interiorEntry2D.x, y: interiorBaseY + 0.6, z: interiorEntry2D.z };

      spawn({
        Info: { name: 'Front Door' },
        Transform: { x: entryWorld.x, y: entryWorld.y, z: entryWorld.z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2.8, lengthZ: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#4a3324' } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'teleport', params: { position: interiorEntry }, target: 'other' }
          ] }]
      });

      spawn({
        Info: { name: 'Exit Door' },
        Transform: { x: interiorEntry.x, y: interiorEntry.y, z: interiorEntry.z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2.8, lengthZ: 0.3, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#3b2a1d' } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'teleport', params: { position: { x: entryWorld.x, y: entryWorld.y + 0.6, z: entryWorld.z - 2 } }, target: 'other' }
          ] }]
      });

      if (garage) {
        const garageDoorOutside = toWorld(garage.offsetX, garage.offsetZ + garage.depth / 2 + 1.5);
        const garageDoorWorld = { x: garageDoorOutside.x, y: baseY + 0.1, z: garageDoorOutside.z };
        const garageInterior2D = toWorld(garage.offsetX, garage.offsetZ + garage.depth / 2 - 2);
        const garageInterior = { x: garageInterior2D.x, y: interiorBaseY + 0.4, z: garageInterior2D.z };

        spawn({
          Info: { name: 'Garage Door' },
          Transform: garageDoorWorld,
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: { type: 'box', params: { lengthX: 3, lengthY: 2.5, lengthZ: 0.3, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#444' } }
                }
              ]
            }
          },
          MotionSource: { type: 'static', params: {} },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              { type: 'teleport', params: { position: garageInterior }, target: 'other' }
            ] }]
        });

        spawn({
          Info: { name: 'Garage Exit' },
          Transform: garageInterior,
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: { type: 'box', params: { lengthX: 2.6, lengthY: 2.5, lengthZ: 0.3, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#3a3a3a' } }
                }
              ]
            }
          },
          MotionSource: { type: 'static', params: {} },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              { type: 'teleport', params: { position: { x: garageDoorWorld.x, y: garageDoorWorld.y + 0.6, z: garageDoorWorld.z - 2 } }, target: 'other' }
            ] }]
        });
      }

      const preferredRooms = interiorRooms.filter(({ room }) => room.w > 2 && room.d > 2 && room.name !== 'Landing' && room.name !== 'Hallway');
      const infectedPool = preferredRooms.length > 0 ? preferredRooms : interiorRooms;
      const infectedCount = Math.min(infectedPool.length, randInt(1, 2));
      const infectedTypes = ['infected_shambler', 'infected_runner', 'infected_bloater'];
      for (let i = 0; i < infectedCount; i++) {
        const choiceRoom = infectedPool[Math.floor(Math.random() * infectedPool.length)];
        const { room, floorIdx } = choiceRoom;
        const rangeX = Math.max(1, room.w / 2 - 0.8);
        const rangeZ = Math.max(1, room.d / 2 - 0.8);
        const localX = room.x + rand(-rangeX, rangeX);
        const localZ = room.z + rand(-rangeZ, rangeZ);
        const worldPos = toWorld(localX, localZ);
        const y = interiorBaseY + floorIdx * (wallHeight + 0.2) + 0.6;
        spawn(choice(infectedTypes), { Transform: { x: worldPos.x, y, z: worldPos.z } });
      }

      const markerWorld = toWorld(0, 0);
      spawn({
        Info: { name: 'Cleared Home Marker' },
        Transform: { x: markerWorld.x, y: interiorBaseY + 0.5, z: markerWorld.z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.5, height: 0.3 } },
                material: { type: 'solid', params: { color: '#ffc107' } },
                localPosition: [0, 0.15, 0]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.5 } }, cooldown: 2, actions: [
            { type: 'discover', params: {}, target: 'other', range: 2.5 }
          ] }]
      });
    };

    const plotOffsets = [-1, 1];
    const lotInsetX = roadWidth / 2 + sidewalkWidth + 12;
    const lotInsetZ = roadWidth / 2 + sidewalkWidth + 12;
    const blockLotOffsets = [
      { x: -lotInsetX, z: -lotInsetZ },
      { x: lotInsetX, z: -lotInsetZ },
      { x: -lotInsetX, z: lotInsetZ },
      { x: lotInsetX, z: lotInsetZ }
    ];
    const rotationOptions = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const reservedAreas = [
      { x: safehousePosition.x, z: safehousePosition.z, radius: 28 }
    ];

    plotOffsets.forEach((px) => {
      plotOffsets.forEach((pz) => {
        if (px === 0 && pz === 0) return;
        const blockCenterX = px * blockSpacing;
        const blockCenterZ = pz * blockSpacing;

        const lotOrder = [...blockLotOffsets];
        for (let i = lotOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lotOrder[i], lotOrder[j]] = [lotOrder[j], lotOrder[i]];
        }

        const lotCount = randInt(1, Math.min(2, lotOrder.length));
        for (let i = 0; i < lotCount; i++) {
          const offset = lotOrder[i];
          const worldX = blockCenterX + offset.x;
          const worldZ = blockCenterZ + offset.z;
          const intersectsReserved = reservedAreas.some((area) => {
            const dx = worldX - area.x;
            const dz = worldZ - area.z;
            return dx * dx + dz * dz < area.radius * area.radius;
          });
          if (intersectsReserved) continue;
          buildHouse(worldX, worldZ, choice(rotationOptions));
        }
      });
    });

    // Global roaming infected
    for (let i = 0; i < 8; i++) {
      const sx = rand(-terrainSize / 2 + 10, terrainSize / 2 - 10);
      const sz = rand(-terrainSize / 2 + 10, terrainSize / 2 - 10);
      const enemy =
        Math.random() < 0.12
          ? 'infected_bloater'
          : Math.random() < 0.45
            ? 'infected_runner'
            : 'infected_shambler';
      spawn(enemy, { Transform: { x: sx, y: 0.6, z: sz } });
    }

    const { x: safehouseX, y: safehouseY, z: safehouseZ } = safehousePosition;

    spawn({
      Info: { name: 'Safe House' },
      Transform: { x: safehouseX, y: safehouseY, z: safehouseZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 18, lengthY: 0.5, lengthZ: 18, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#3d3c38' } },
              localPosition: [0, -0.5, 0]
            },
            {
              geometry: { type: 'box', params: { lengthX: 18, lengthY: 4, lengthZ: 0.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#52504b' } },
              localPosition: [0, 0, 9]
            },
            {
              geometry: { type: 'box', params: { lengthX: 18, lengthY: 4, lengthZ: 0.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#52504b' } },
              localPosition: [0, 0, -9]
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 4, lengthZ: 18, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#52504b' } },
              localPosition: [9, 0, 0]
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 4, lengthZ: 18, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#52504b' } },
              localPosition: [-9, 0, 0]
            },
            {
              geometry: { type: 'box', params: { lengthX: 18.5, lengthY: 0.5, lengthZ: 18.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#2a2a29' } },
              localPosition: [0, 4, 0]
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    spawn({
      Info: { name: 'Safehouse Signal Flare' },
      Transform: { x: safehouseX, y: safehouseY + 4.6, z: safehouseZ },
      ParticleEmitter: {
        rate: 30,
        maxParticles: 240,
        lifetime: 2.6,
        speed: { min: 0.3, max: 0.9 },
        spread: 0.5,
        size: 0.16,
        opacity: 0.9,
        gravity: -0.15,
        color: '#ff7755',
        direction: [0, 1, 0],
        shape: { type: 'point' },
        localSpace: false
      },
      MotionSource: { type: 'static', params: {} }
    });

    const safehouseInteriorDoor = { x: safehouseX, y: safehouseY + 0.02, z: safehouseZ + 7.6 };
    const safehouseExteriorDoor = { x: safehouseX, y: safehouseY + 0.02, z: safehouseZ + 12 };

    spawn({
      Info: { name: 'Safehouse Door' },
      Transform: safehouseInteriorDoor,
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 2.8, lengthZ: 0.3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#4a433a' } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'teleport',
            params: { position: { ...safehouseExteriorDoor, y: safehouseExteriorDoor.y + 0.4 } },
            target: 'other'
          }
        ] }]
    });

    spawn({
      Info: { name: 'Safehouse Entrance' },
      Transform: safehouseExteriorDoor,
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 2.8, lengthZ: 0.3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#4a433a' } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'teleport',
            params: { position: { ...safehouseInteriorDoor, y: safehouseInteriorDoor.y + 0.4 } },
            target: 'other'
          }
        ] }]
    });

    spawn('pistol_weapon', { Transform: { x: safehouseX - 3, y: safehouseY + 0.8, z: safehouseZ - 2 } });
    spawn('bandages', { Transform: { x: safehouseX + 2, y: safehouseY + 0.8, z: safehouseZ + 3 } });
    spawn('med_kit', { Transform: { x: safehouseX - 1, y: safehouseY + 0.8, z: safehouseZ + 2 } });
    spawn('energy_bar', { Transform: { x: safehouseX + 1.5, y: safehouseY + 0.8, z: safehouseZ - 1.5 } });
    spawn('grenade', { Transform: { x: safehouseX + 3, y: safehouseY + 0.8, z: safehouseZ + 1 } });

    spawn('player', {
      Transform: { x: safehouseX, y: safehouseY + 0.8, z: safehouseZ },
      Inventory: {
        size: 8,
        items: ['pistol_weapon', 'bandages', 'energy_bar'],
        selectedItemIndex: 0
      }
    });
  }
};
