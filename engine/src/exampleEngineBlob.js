export default {
  setupScene(api) {
    const { spawn, addCollisionEvent, getResource, getModule, setResource } = api;
    const archetypes = getModule('archetype');
    setResource('metadata', {
      title: 'Example World',
      description: 'Demonstrates built-in engine features including skybox and lighting.',
      tags: ['demo', 'lighting', 'tutorial'],
      brandColors: ['#ace4fb', '#ffeedd'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        sky: {
          color: '#ace4fb', // sky blue
          sun: {
            color: '#FFEEDD', // golden sun
            intensity: 1.0,
            timeOfDay: 1400 // 2:00 PM
          },
          clouds: {
            color: '#FFFFFF',
            coverage: 1.0
          },
          stars: {
            intensity: 0.0
          }
        }
      }]
    });

    const achievements = getResource('achievements');
    const fields = getModule('field');
    const metrics = getResource('metrics');
    const conditionLibrary = getModule('condition');

    if (conditionLibrary && !conditionLibrary.definitionsByName.discoveries_coin_at_least) {
      conditionLibrary.register('discoveries_coin_at_least', {
        type: 'compare',
        params: {
          operator: 'gte',
          left: {
            type: 'metric',
            params: { metric: 'discoveries', subtype: 'Coin' }
          },
          right: {
            type: 'parameter',
            params: { name: 'targetValue', defaultValue: 1 }
          }
        }
      });
    }

    achievements.set("Arm yourself", {
      description: "Pick up a gun.",
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: {
            type: 'metric',
            params: { metric: 'items picked up', subtype: 'Gun' }
          },
          right: {
            type: 'literal',
            params: { value: 1 }
          }
        }
      }
    });
    achievements.set("Dead again", {
      description: "Kill 5 skeletons.",
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: {
            type: 'metric',
            params: { metric: 'entities killed', subtype: 'Skeleton' }
          },
          right: {
            type: 'literal',
            params: { value: 5 }
          }
        }
      }
    });
    achievements.set("Get rich!", {
      description: "Pick up three coins.",
      condition: {
        type: 'reference',
        params: {
          name: 'discoveries_coin_at_least',
          args: {
            targetValue: { type: 'literal', params: { value: 3 } }
          }
        }
      }
    });
    achievements.set("Find the monolith", {
      description: "Investigate the mysterious monolith.",
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: {
            type: 'metric',
            params: { metric: 'discoveries', subtype: 'Black Monolith' }
          },
          right: {
            type: 'literal',
            params: { value: 1 }
          }
        }
      }
    });
    achievements.set("Into the void", {
      description: "Fall into the infinite void",
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: {
            type: 'metric',
            params: { metric: 'discoveries', subtype: 'Void' }
          },
          right: {
            type: 'literal',
            params: { value: 1 }
          }
        }
      }
    });

    // Add an achievement dynamically
    setTimeout(() => {
      achievements.set("Explore for 2 minutes", {
        description: "You explored the world for 2 minutes.",
        condition: {
          type: 'always',
          params: {}
        }
      });
    }, 120000);

    const terrainHeight = fields.register(
      "terrainHeight",
      { type: "simplex", params: { seed: 0, frequency: 0.5, amplitude: 10, octaves: 4 } }
    )

    // spawn built-in player with an inventory
    spawn("player");

    // simple terrain setup
    spawn({
      Transform: {},
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: {
                type: "displacedPlane",
                params: {
                  lengthX: 100,
                  lengthZ: 100,
                  field: "terrainHeight", // reference the field registered above by its string name
                },
              },
              material: {
                type: "solid",
                params: { color: "#22883a" },
              },
            },
          ],
        },
      },
      MotionSource: {
        type: "static",
        params: {}
      },
    });

    // randomly scatter some trees on the terrain above the water line
    const terrainSize = 100;
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize); // sample the height from the resolved field 
      if (h > 1) {
        spawn("tree", { Transform: { x, y: h, z } });
      }
    }

    // spawn a simple house with walls and a pyramid roof
    {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const base = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize);
      const y = base + 1; // center body so bottom rests on terrain
      spawn({
        Transform: { x, y, z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "box", params: { lengthX: 8, lengthY: 4, lengthZ: 0.5, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#884400" } },
                localPosition: [0, 0, -3.75],
              },
              {
                geometry: { type: "box", params: { lengthX: 3, lengthY: 4, lengthZ: 0.5, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#884400" } },
                localPosition: [-2.5, 0, 3.75],
              },
              {
                geometry: { type: "box", params: { lengthX: 3, lengthY: 4, lengthZ: 0.5, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#884400" } },
                localPosition: [2.5, 0, 3.75],
              },
              {
                geometry: { type: "box", params: { lengthX: 0.5, lengthY: 4, lengthZ: 8, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#884400" } },
                localPosition: [-3.75, 0, 0],
              },
              {
                geometry: { type: "box", params: { lengthX: 0.5, lengthY: 4, lengthZ: 8, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#884400" } },
                localPosition: [3.75, 0, 0],
              },
              {
                geometry: { type: "pyramid", params: { width: 8.5, height: 4.5, depth: 8.5, pivot: "bottom" } },
                material: { type: "marble", params: { color: "#ddaaaa", grainColor: "#aa7777", grainSize: 0.6 } },
                localPosition: [0, 4, 0],
              },
              // Add a point light in the center of the house for ambient lighting
              {
                light: {
                  type: "point",
                  params: {
                    intensity: 2,
                    range: 10,
                    color: "#ffdd88"
                  }
                },
                localPosition: [0, 2, 0],
                tag: "centerLight"
              },
              // Add a spot light above pointing down at the entrance
              {
                light: {
                  type: "spot",
                  params: {
                    intensity: 3,
                    range: 8,
                    beamAngle: Math.PI / 4, // 45-degree beam angle
                    color: "#ffffff",
                    direction: [0, -1, 0.5]
                  }
                },
                localPosition: [0, 3.5, -2],
                tag: "entranceSpotlight"
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
        // Note: For sensor detection, we may need a separate collision entity or use a different approach
        Rules: [{
          trigger: { type: "collisionEnter" },
          actions: [
            {
              type: "discover",
              params: {},
              target: "other"
            }
          ]
        }]
      });
    }

    // place gold coins at random locations just above the terrain
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 1;
      spawn({
        Info: { name: "Coin", description: "A golden coin" },
        Transform: { x: x, y: h, z: z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "coin",
                geometry: { type: "cylinder", params: { radius: 0.3, height: 0.2 } },
                material: { type: "solid", params: { color: "#ffff00" } },
                localRotation: [Math.PI / 2, 0, 0], // rotate to stand upright
                children: [{
                  tag: "bevel",
                  geometry: { type: "hollowCylinder", params: { radius: 0.35, height: 0.3 } },
                  material: { type: "solid", params: { color: "#ffff00" } },
                }]
              },
            ],
          },
        },
        Animation: {
          clips: [
            {
              name: "default",
              duration: 2.0,
              tracks: [
                {
                  targetTag: "coin",
                  keyframes: [
                    { time: 0.0, position: [0, 0, 0], rotation: [0, 0, 0] },
                    { time: 1.0, position: [0, 0.2, 0], rotation: [0, 0, Math.PI] },
                    { time: 2.0, position: [0, 0, 0], rotation: [0, 0, 2 * Math.PI] },
                  ]
                },
              ]
            }
          ]
        },
        MotionSource: {
          type: "static",
          params: {},
        },
        Rules: [{
          trigger: { type: "entityInRange", params: { range: 1 } },
          actions: [
            {
              type: "discover",
              range: 1,
              params: {},
              target: "self"
            },
            {
              type: "heal",
              params: { amount: 1 }, // Heal entities by 1 health point when collided with, mario-style
              target: "other"
            },
            {
              type: "kill", // remove the coin after being picked up
              target: "self",
            }
          ]
        }]
      });
    }

    // occasionally place a black monolith to discover
    if (Math.random() < 0.5) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 1;
      spawn({
        Info: { name: "Black Monolith", description: "An ominous artifact." },
        Transform: { x, y: h, z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "box", params: { lengthX: 1, lengthY: 3, lengthZ: 0.2 } },
                material: { type: "solid", params: { color: "#000000" } },
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
        Rules: [{
          trigger: { type: "interact" },
          actions: [
            {
              type: "discover",
              params: {},
              target: "self"
            }
          ]
        }]
      });
    }

    // Some example items with interesting effects
    spawn("gun", { Transform: { x: 0, y: 10, z: 0 } });
    spawn({
      Info: {
        name: "Wand of Fireball"
      },
      Transform: { x: 0, y: 10, z: 2 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "cylinder", params: { radius: 0.1, height: 1 } },
              material: { type: "solid", params: { color: "#582389" } },
            },
            {
              geometry: { type: "sphere", params: { radius: 0.2 } },
              material: { type: "solid", params: { color: "#FFD700" } },
              localPosition: [0, 0.5, 0],
            }
          ],
        },
      },
      MotionSource: {
        type: "dynamicRigidBody",
        params: {
          mass: 0.5,
        },
      },
      Rules: [
        {
          trigger: { type: "interact" },
          actions: [
            {
              type: "getPickedUp",
              params: {},
              target: "self"
            }
          ]
        },
        {
          trigger: { type: "primaryAction" },
          cooldown: 0.75,
          actions: [
          {
            type: "spawnEntityFrom",
            target: "self",
            params: {
              entity: {
                Info: { name: "Fireball" },
                Body: {
                  type: "composite",
                  params: {
                    parts: [
                      {
                        geometry: { type: "sphere", params: { radius: 0.25 } },
                        material: { type: "liquid", params: { color: "#ff4500", opacity: 0.6 } },
                        ignoreCollisions: true
                      }
                    ],
                  },
                },
                MotionSource: {
                  type: "dynamicRigidBody",
                  params: {
                    mass: 0.1,
                    gravityScale: 0
                  },
                },
                Rules: [{
                  trigger: { type: "entityInRange", params: { range: 0.25 } },
                  actions: [
                    {
                      type: "damage",
                      target: "other",
                      range: 0.25,
                      params: { amount: 5 },
                    },
                    {
                      type: "kill",
                      target: "self"
                    }
                  ]
                }]
              },
              velocity: 20
            },
          }
        ]
        }]
    })

    // Add a sign with text popup interaction
    spawn({
      Info: { name: "Welcome Sign" },
      Transform: { x: 2, y: 0.5, z: -3 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "box", params: { lengthX: 0.2, lengthY: 2, lengthZ: 0.2, pivot: "bottom" } },
              material: { type: "solid", params: { color: "#8B4513" } }, // Brown post
              localPosition: [0, 0, 0],
            },
            {
              geometry: { type: "box", params: { lengthX: 2, lengthY: 1, lengthZ: 0.1 } },
              material: { type: "solid", params: { color: "#D2B48C" } }, // Tan sign board
              localPosition: [0, 1.5, 0],
            }
          ],
        },
      },
      MotionSource: {
        type: "static",
        params: {}
      },
      Rules: [{
        trigger: { type: "interact" },
        actions: [
          {
            type: "popup",
            params: { text: "Welcome to the Example World!\n\nThis is a demonstration of the text modal system. You can interact with objects like this sign to display helpful information.\n\nPress OK or ESC to close this message." },
            target: "other"
          }
        ]
      }]
    });

    spawn({
      Info: { name: "Extruded poly test" },
      Body: {
      type: "composite",
      params: {
        parts: [
        {
          geometry: {
          type: "extrudedPolygon",
          params: {
            // 5-point star (outer radius ~2, inner radius ~0.8), centered at origin
            points: [
            { x: 0.000,  z: -2.000 },
            { x: 0.470,  z: -0.647 },
            { x: 1.902,  z: -0.618 },
            { x: 0.761,  z: 0.247 },
            { x: 1.176,  z: 1.618 },
            { x: 0.000,  z: 0.800 },
            { x: -1.176, z: 1.618 },
            { x: -0.761, z: 0.247 },
            { x: -1.902, z: -0.618 },
            { x: -0.470, z: -0.647 }
            ],
            height: 2,
            pivot: "bottom"
          }
          },
          material: { type: "solid", params: { color: "#00ff00" } },
        }
        ],
      },
      },
      Transform: { x: 5, y: 1, z: -5 }
    })

    spawn({
      Info: { name: "Sword" },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              tag: "root",
              children: [
                {
                  geometry: { type: "box", params: { lengthX: 0.1, lengthY: 0.85, lengthZ: 0.25, pivot: "bottom" } },
                  material: { type: "solid", params: { color: "#aaaaaa", metalness: 0.5, roughness: 0.1 } },
                },
                {
                  geometry: { type: "pyramid", params: { width: 0.1, height: 0.25, depth: 0.25, pivot: "bottom" } },
                  material: { type: "solid", params: { color: "#aaaaaa", metalness: 0.5, roughness: 0.1 } },
                  localPosition: [0, 0.85, 0],
                },
                {
                  geometry: { type: "box", params: { lengthX: 0.2, lengthY: 0.1, lengthZ: 0.4 } },
                  material: { type: "solid", params: { color: "#552200" } },
                },
                {
                  geometry: { type: "capsule", params: { radius: 0.07, height: 0.4, pivot: "top" } },
                  material: { type: "solid", params: { color: "#552200" } },
                },
              ]
            }
          ],
        }
      },
      MotionSource: {
        type: "dynamicRigidBody",
        params: {
          mass: 1,
        },
      },
      Animation: {
        clips: [
          {
            name: "use",
            duration: 0.3,
            tracks: [
              {
                targetTag: "root",
                keyframes: [
                  { time: 0, rotation: [0, 0, 0] },
                  { time: 0.15, rotation: [-Math.PI / 2, 0, 0] }, // Swing down 90 degrees
                  { time: 0.3, rotation: [0, 0, 0] } // Return to original position
                ]
              }
            ]
          }
        ]
      },
      Rules: [
        {
          trigger: { type: "interact" },
          actions: [
            {
              type: "getPickedUp",
              params: {},
              target: "self"
            }
          ]
        },
        {
          trigger: { type: "primaryAction" },
          cooldown: 0.5,
          actions: [
          {
            type: "damage",
            target: "other",
            params: { amount: 7, knockback: 3 },  // high damage with strong knockback
            range: 4.5 // melee range
          }
        ]
      }
    ]
    });

    // Create a loot crate entity with inventory and health to validate inventory dropping
    // We will overload the "skeleton" archetype and reference this 
    // friendly version from the "Scroll of the Dead" item below
    archetypes.register("friendly_skeleton", "skeleton", {
      params: {
        Faction: { id: "player_faction" } // makes the skeleton friendly to the player
      }
    });

    spawn("ufo", { Transform: { x: 0, y: 10, z: -5 } });
    {
      const x = 5;
      const z = 5;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 0.75; // Adjusted height for crate
      spawn({
        Info: { name: "Loot Crate", description: "A wooden crate filled with treasures" },
        Transform: { x, y: h, z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                // Main crate body - wooden box appearance
                geometry: { type: "box", params: { lengthX: 1.5, lengthY: 1.5, lengthZ: 1.5 } },
                material: {
                  type: "wood", params: {
                    color: "#8B4513",
                    grainColor: "#654321",
                    grainSize: 0.3,
                    grainDirection: { x: 1, y: 0, z: 0 }
                  }
                },
              },
              {
                // Wood planks effect (horizontal)
                geometry: { type: "box", params: { lengthX: 1.6, lengthY: 0.1, lengthZ: 1.6 } },
                material: { type: "solid", params: { color: "#654321" } }, // Darker wood
                localPosition: [0, 0.3, 0],
              },
              {
                geometry: { type: "box", params: { lengthX: 1.6, lengthY: 0.1, lengthZ: 1.6 } },
                material: { type: "solid", params: { color: "#654321" } },
                localPosition: [0, -0.3, 0],
              },
              {
                // Metal bands (vertical)
                geometry: { type: "box", params: { lengthX: 0.1, lengthY: 1.7, lengthZ: 1.6 } },
                material: { type: "solid", params: { color: "#444444" } }, // Dark metal
                localPosition: [0.4, 0, 0],
              },
              {
                geometry: { type: "box", params: { lengthX: 0.1, lengthY: 1.7, lengthZ: 1.6 } },
                material: { type: "solid", params: { color: "#444444" } },
                localPosition: [-0.4, 0, 0],
              },
              {
                // Lock/clasp on front
                geometry: { type: "box", params: { lengthX: 0.3, lengthY: 0.2, lengthZ: 0.1 } },
                material: { type: "solid", params: { color: "#FFD700" } }, // Gold lock
                localPosition: [0, 0, 0.8],
              },
            ],
          },
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: {
            mass: 2, // Heavier crate
          },
        },
        Health: { value: 8, maxValue: 8 },
        Inventory: {
          size: 3,
          items: [
            {
              Info: { name: "Ruby Gem", description: "A precious red gem" },
              Body: {
                type: "composite",
                params: {
                  parts: [
                    {
                      geometry: { type: "icosahedron", params: { radius: 0.3 } },
                      material: { type: "solid", params: { color: "#DC143C" } }, // Crimson red
                    },
                  ],
                },
              },
              MotionSource: {
                type: "dynamicRigidBody",
                params: { mass: 0.2 },
              },
              Rules: [{
                trigger: { type: "interact" },
                actions: [
                  {
                    type: "getPickedUp",
                    params: {},
                    target: "self"
                  }
                ]
              }]
            },
            {
              Info: { name: "Scroll of the Dead", description: "A mysterious scroll that can summon undead allies." },
              Body: {
                type: "composite",
                params: {
                  parts: [
                    {
                      geometry: { type: "cylinder", params: { radius: 0.1, height: 0.8 } },
                      material: { type: "solid", params: { color: "#F5E6D3" } }, // Parchment color
                    },
                  ],
                },
              },
              MotionSource: {
                type: "dynamicRigidBody",
                params: { mass: 0.1 },
              },
              Rules: [
                {
                  trigger: { type: "interact" },
                  actions: [
                    {
                      type: "getPickedUp",
                      params: {},
                      target: "self"
                    }
                  ]
                },
                {
                  trigger: { type: "primaryAction" },
                  actions: [
                  {
                    type: "spawnEntityFrom",
                    target: "user",
                    params: {
                      entity: "friendly_skeleton"
                    }
                  },
                  {
                    type: "spawnEntityFrom",
                    target: "user",
                    params: {
                      entity: "friendly_skeleton"
                    }
                  },
                  {
                    type: "kill",
                    target: "self"
                  }
                ]
              }
            ]
            },
            {
              Info: {
                name: "Vampire Spell Tome",
                description: "A dark tome that drains life from enemies to heal the wielder"
              },
              Body: {
                type: "composite",
                params: {
                  parts: [
                    {
                      geometry: { type: "box", params: { lengthX: 0.3, lengthY: 0.4, lengthZ: 0.05 } },
                      material: { type: "solid", params: { color: "#4a0e0e" } },
                    }
                  ]
                }
              },
              MotionSource: {
                type: "dynamicRigidBody",
                params: {
                  mass: 0.5,
                }
              },
              Rules: [
                {
                  trigger: { type: "interact" },
                  actions: [
                    {
                      type: "getPickedUp",
                      target: "self"
                    }
                  ]
                },
                {
                  trigger: { type: "primaryAction" },
                  actions: [
                  {
                    type: "damage",
                    params: { amount: 10 },
                    target: "other",
                    range: 10,
                    onSuccess: [
                      {
                        type: "heal",
                        params: { amount: 10 }, // Negative damage = healing
                        target: "user"
                      },
                      {
                        type: "kill",
                        target: "self"
                      }
                    ]
                  }
                ],
              }
            ]
            }
          ],
          selectedItemIndex: -1 // No item held since this is a container
        },
        Faction: {
          id: "neutral_faction"
        },
        Rules: [{
          trigger: { type: "interact" },
          actions: [
            {
              type: "getPickedUp",  // not necessary, but allows picking up and moving the crate
              params: {},
              target: "self"
            }
          ]
        }],
      });
    }

    // Spawn 5 random hostile skeletons around the terrain
    {
      const terrainSize = 100; // matches earlier usage
      for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 2; // offset to stand above ground

        spawn("skeleton", { Transform: { x, y: h, z } })
      }
    }

    // An environmental hazard that damages all entities when nearby
    spawn({
      Info: { name: "Poison Cloud" },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "sphere", params: { radius: 10 } },
              material: { type: "liquid", params: { color: "#00ff00", opacity: 0.5 } },
              ignoreCollisions: true, // Ignore collisions so we can pass through it
            }
          ]
        }
      },
      Transform: { z: -20 },
      MotionSource: {
        type: "static",
        params: {}
      },
      Rules: [{
        trigger: { type: "entityInRange", params: { range: 10 } },
        cooldown: 1,
        actions: [
          {
            type: "damage",
            params: { amount: 1 },
            target: "other",
            range: 10
          }
        ]
      }]
    })

    //#region noprompt
    // ===== SMOKE TESTING GALLERY =====
    // Gallery of entities to test all Body component types and primitive shapes

    // Position offset for the gallery (far from main gameplay area)
    const galleryX = -50;
    const galleryZ = 50;
    const gallerySpacing = 8;

    // 1. Showcase all primitive shapes for composite body type
    const primitiveShapes = [
      { type: "cylinder", params: { radius: 1, height: 3 }, name: "Cylinder" },
      { type: "hollowCylinder", params: { outerRadius: 1.5, innerRadius: 0.8, height: 2 }, name: "Hollow Cylinder" },
      { type: "cone", params: { radius: 1.2, height: 2.5 }, name: "Cone" },
      { type: "hemisphere", params: { radius: 3 }, name: "Hemisphere" },
      { type: "icosahedron", params: { radius: 1.1 }, name: "Icosahedron" },
      { type: "capsule", params: { radius: 0.8, height: 2.2 }, name: "Capsule" },
      { type: "pyramid", params: { width: 2, height: 2.5, depth: 2 }, name: "Pyramid" },
      { type: "torus", params: { majorRadius: 1.2, minorRadius: 0.4 }, name: "Torus" },
      { type: "torus", params: { majorRadius: 5.2, minorRadius: 1.4 }, name: "BigTorus" },
    ];

    primitiveShapes.forEach((shape, index) => {
      const x = galleryX + (index * gallerySpacing);
      const z = galleryZ;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 2;

      spawn({
        Info: { name: `${shape.name} Test`, description: `Testing ${shape.type} primitive shape` },
        Transform: { x, y: h, z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: shape.type, params: shape.params },
                material: { type: "solid", params: { color: `hsl(${index * 60}, 70%, 50%)` } },
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    });

    // 2. Complex composite with nested children showing localPosition, localRotation, localScale
    {
      const x = galleryX;
      const z = galleryZ + gallerySpacing;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 3;

      spawn({
        Info: { name: "Nested Composite Test", description: "Complex nested structure with local transforms" },
        Transform: { x, y: h, z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                // Main body
                geometry: { type: "box", params: { lengthX: 2, lengthY: 1, lengthZ: 2 } },
                material: { type: "solid", params: { color: "#4444ff" } },
                children: [
                  {
                    // Top tower
                    geometry: { type: "cylinder", params: { radius: 0.4, height: 2 } },
                    material: { type: "solid", params: { color: "#ff4444" } },
                    localPosition: [0, 1.5, 0],
                    children: [
                      {
                        // Tower cap
                        geometry: { type: "cone", params: { radius: 0.6, height: 1 } },
                        material: { type: "solid", params: { color: "#44ff44" } },
                        localPosition: [0, 1.5, 0],
                      },
                      {
                        // Side ornament with rotation
                        geometry: { type: "icosahedron", params: { radius: 0.3 } },
                        material: { type: "solid", params: { color: "#ffff44" } },
                        localPosition: [0.8, 0.5, 0],
                        localRotation: [0, 0, Math.PI / 4],
                        localScale: [1.2, 0.8, 1.2],
                      }
                    ]
                  },
                  {
                    // Side arm
                    geometry: { type: "box", params: { lengthX: 0.3, lengthY: 0.3, lengthZ: 1.5 } },
                    material: { type: "solid", params: { color: "#ff44ff" } },
                    localPosition: [1.2, 0, 0],
                    localRotation: [0, Math.PI / 6, 0],
                    children: [
                      {
                        // Arm end sphere
                        geometry: { type: "sphere", params: { radius: 0.25 } },
                        material: { type: "solid", params: { color: "#44ffff" } },
                        localPosition: [0, 0, 1],
                        localScale: [1.5, 1.5, 1.5],
                      }
                    ]
                  }
                ],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    // 3. Composite with transform-level rotation and scale affecting children
    {
      const x = galleryX + gallerySpacing;
      const z = galleryZ + gallerySpacing;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 3;

      spawn({
        Info: { name: "Transform Scale/Rotation Test", description: "Testing transform-level rotation and scale" },
        Transform: {
          x, y: h, z,
          ry: Math.PI / 4,  // 45-degree rotation around Y axis
          sx: 1.5, sy: 0.8, sz: 1.2  // Non-uniform scaling
        },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                // Central body
                geometry: { type: "box", params: { lengthX: 1, lengthY: 2, lengthZ: 1 } },
                material: { type: "solid", params: { color: "#8844ff" } },
                children: [
                  {
                    // Top piece
                    geometry: { type: "pyramid", params: { width: 1.2, height: 1, depth: 1.2 } },
                    material: { type: "solid", params: { color: "#ff8844" } },
                    localPosition: [0, 1.5, 0],
                  },
                  {
                    // Side decorations
                    geometry: { type: "cylinder", params: { radius: 0.2, height: 1.5 } },
                    material: { type: "solid", params: { color: "#44ff88" } },
                    localPosition: [0.8, 0, 0],
                  },
                  {
                    geometry: { type: "cylinder", params: { radius: 0.2, height: 1.5 } },
                    material: { type: "solid", params: { color: "#44ff88" } },
                    localPosition: [-0.8, 0, 0],
                  },
                  {
                    geometry: { type: "cylinder", params: { radius: 0.2, height: 1.5 } },
                    material: { type: "solid", params: { color: "#44ff88" } },
                    localPosition: [0, 0, 0.8],
                  },
                  {
                    geometry: { type: "cylinder", params: { radius: 0.2, height: 1.5 } },
                    material: { type: "solid", params: { color: "#44ff88" } },
                    localPosition: [0, 0, -0.8],
                  }
                ],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    // 4. Showcase unimplemented body types (they will show warnings but won't crash)
    {
      const x = galleryX + (2 * gallerySpacing);
      const z = galleryZ + gallerySpacing;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 2;

      spawn({
        Info: { name: "Humanoid Test (Stub)", description: "Testing humanoid body type (not implemented)" },
        Transform: { x, y: h, z },
        Body: {
          type: "humanoid",
          params: {
            height: 2,
            headMaterial: { type: "solid", params: { color: "#ffccaa" } },
            bodyMaterial: { type: "solid", params: { color: "#4444ff" } },
          }
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    {
      const x = galleryX + (3 * gallerySpacing);
      const z = galleryZ + gallerySpacing;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 2;

      spawn({
        Info: { name: "GLTF Test (Stub)", description: "Testing GLTF body type (not implemented)" },
        Transform: { x, y: h, z },
        Body: {
          type: "gltf",
          params: {
            file: "dummy.gltf",
            material: { type: "solid", params: { color: "#ffffff" } },
          }
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    // 5. Additional composite showcasing material types and advanced features
    {
      const x = galleryX + (4 * gallerySpacing);
      const z = galleryZ + gallerySpacing;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 2;

      spawn({
        Info: { name: "Material Showcase", description: "Different material types on composite" },
        Transform: { x, y: h, z },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "box", params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: "solid", params: { color: "#ff0000", metalness: 0.8, roughness: 0.2 } },
                localPosition: [0, 0, 0],
              },
              {
                geometry: { type: "sphere", params: { radius: 0.6 } },
                material: { type: "wireframe", params: { color: "#00ff00" } },
                localPosition: [2, 0, 0],
              },
              {
                geometry: { type: "cylinder", params: { radius: 0.5, height: 1 } },
                material: { type: "solid", params: { color: "#0000ff", opacity: 0.7 } },
                localPosition: [-2, 0, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    // 6. hasInterior Showcase - Testing the new interior hollowing feature
    {
      const x = 0
      const z = 0
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 8; // Higher up since building is much larger

      spawn({
        Info: { name: "hasInterior Building", description: "Large building with interior space showcasing boolean addition" },
        Transform: { x, y: h - 7, z },
        Body: {
          type: "composite",
          params: {
            hasInterior: true,
            parts: [
              {
                // Main building structure - much larger to showcase player height of 2 units
                geometry: { type: "box", params: { lengthX: 20, lengthY: 15, lengthZ: 20, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#8B4513" } }, // Brown color for building
                localPosition: [0, 0, 0],
              },
              {
                geometry: { type: "cylinder", params: { radius: 4, height: 12, pivot: "bottom" } },
                material: { type: "solid", params: { color: "#d5f7f8", opacity: 0.5 } }, // Darker brown
                localRotation: [0, 0, -Math.PI / 2],
                localPosition: [10, 4, 0],
                children: [
                  {
                    geometry: { type: "box", params: { lengthX: 15, lengthY: 15, lengthZ: 15, pivot: "bottom" } },
                    material: { type: "solid", params: { color: "#8B4513" } }, // Brown color for building
                    localPosition: [0, 12, 0]
                  }
                ]
              },
              {
                // Second tower to better showcase boolean union
                geometry: { type: "cylinder", params: { radius: 3, height: 10 } },
                material: { type: "solid", params: { color: "#654321" } }, // Even darker brown
                localPosition: [-10, 9, 8],
              },
              {
                // Large entrance structure
                geometry: { type: "box", params: { lengthX: 6, lengthY: 8, lengthZ: 4 } },
                material: { type: "solid", params: { color: "#654321" } }, // Darker entrance
                localPosition: [0, 4, -12],
              },
              {
                // Side wing to showcase complex boolean addition
                geometry: { type: "box", params: { lengthX: 8, lengthY: 6, lengthZ: 12 } },
                material: { type: "solid", params: { color: "#8B4513" } },
                localPosition: [-18, 3, -6],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });

      // Add inside door entity with teleport to outside
      spawn({
        Info: { name: "Inside Door", description: "Teleports you outside the building" },
        Transform: { x: x + 2, y: h + 1, z: z + 2 }, // Inside the building
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "box", params: { lengthX: 2, lengthY: 4, lengthZ: 0.3 } },
                material: { type: "solid", params: { color: "#8B4513" } }, // Brown door
              },
              {
                // Door handle
                geometry: { type: "sphere", params: { radius: 0.2 } },
                material: { type: "solid", params: { color: "#FFD700" } }, // Gold handle
                localPosition: [0.7, 0, 0.2],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
        Rules: [{
          trigger: { type: "interact" },
          actions: [
            {
              type: "teleport",
              params: {
                position: {
                  x: x + 25, // Outside the building
                  y: h + 1,
                  z: z + 25
                }
              },
              target: "other",
              range: 3
            }
          ]
        }]
      });

      // Add outside door entity with teleport to inside
      spawn({
        Info: { name: "Outside Door", description: "Teleports you inside the building" },
        Transform: { x: x + 25, y: h + 1, z: z + 25 }, // Outside the building
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "box", params: { lengthX: 2, lengthY: 4, lengthZ: 0.3 } },
                material: { type: "solid", params: { color: "#654321" } }, // Darker brown door
              },
              {
                // Door handle
                geometry: { type: "sphere", params: { radius: 0.2 } },
                material: { type: "solid", params: { color: "#C0C0C0" } }, // Silver handle
                localPosition: [0.7, 0, 0.2],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
        Rules: [{
          trigger: { type: "interact" },
          actions: [
            {
              type: "teleport",
              params: {
                position: {
                  x: x + 2, // Inside the building
                  y: h + 1,
                  z: z + 2
                }
              },
              target: "other",
              range: 3
            }
          ]
        }]
      });
    }

    // Regular composite for comparison
    {
      const x = galleryX + (6 * gallerySpacing);
      const z = galleryZ + gallerySpacing;
      const h = terrainHeight.sample3D(x / terrainSize, 0, z / terrainSize) + 2;

      spawn({
        Info: { name: "Regular Building", description: "Same structure without hasInterior for comparison" },
        Transform: { x, y: h, z },
        Body: {
          type: "composite",
          params: {
            hasInterior: false,
            parts: [
              {
                // Main building structure
                geometry: { type: "box", params: { lengthX: 4, lengthY: 3, lengthZ: 4 } },
                material: { type: "solid", params: { color: "#8B4513" } }, // Brown color for building
                localPosition: [0, 1.5, 0],
              },
              {
                // Tower addition
                geometry: { type: "cylinder", params: { radius: 1, height: 2 } },
                material: { type: "solid", params: { color: "#A0522D" } }, // Darker brown
                localPosition: [3, 2.5, 0],
              },
              {
                // Small entrance structure
                geometry: { type: "box", params: { lengthX: 1.5, lengthY: 1, lengthZ: 1 } },
                material: { type: "solid", params: { color: "#654321" } }, // Darker entrance
                localPosition: [0, 0.5, -2.5],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    // Create an animated entity to showcase the animation component
    spawn({
      Info: { name: "Animated Box", description: "Demonstrates animation component" },
      Transform: { x: 5, y: 2, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              // This part will be animated
              geometry: { type: "box", params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
              material: { type: "solid", params: { color: "#ff0000" } },
              tag: "b1",
              children: [
                {
                  geometry: { type: "box", params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                  material: { type: "solid", params: { color: "#00ff00" } },
                  localPosition: [0, 0.75, 0], // Offset to create a stacked effect
                  localScale: [0.5, 0.5, 0.5], // Scale down the child box
                  tag: "b2", // Tag for animation targeting
                },
              ]
            }
          ],
        },
      },
      Animation: {
        clips: [
          {
            name: "default",
            duration: 2.0,
            tracks: [
              {
                targetTag: "b1",
                keyframes: [
                  { time: 0.0, position: [0, 0, 0], rotation: [0, 0, 0] },
                  { time: 1.0, position: [0, 2, 0], rotation: [Math.PI, 0, 0] },
                  { time: 2.0, position: [0, 0, 0], rotation: [2 * Math.PI, 0, 0] },
                ]
              },
              {
                targetTag: "b2",
                keyframes: [
                  { time: 0.0, position: [0, 0, 0], },
                  { time: 1.0, position: [0, 1, 0], },
                  { time: 2.0, position: [0, 0, 0], },
                ]
              },
            ]
          }
        ]
      },
      MotionSource: {
        type: "static",
        params: {}
      },
      Rules: [{
        trigger: { type: "interact" },
        actions: [{
          type: "getPickedUp",
          params: {},
          target: "self"
        }]
      }]
    });

    // Material Showcase - Demonstrate marble and wood materials
    const showcaseX = -15;
    const showcaseZ = 0;
    const showcaseY = terrainHeight.sample3D(showcaseX / terrainSize, 0, showcaseZ / terrainSize) + 2;

    // Marble pedestal
    spawn({
      Info: { name: "Marble Pedestal", description: "White marble with gray veining" },
      Transform: { x: showcaseX, y: showcaseY, z: showcaseZ - 5 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "cylinder", params: { radius: 1.5, height: 3, pivot: "bottom" } },
              material: { type: "marble", params: { color: "#ffffff", grainColor: "#888888", grainSize: 0.5 } },
            },
          ],
        },
      },
      MotionSource: {
        type: "static",
        params: {}
      },
    });

    // Marble sphere
    spawn({
      Info: { name: "Marble Sphere", description: "Decorative marble orb" },
      Transform: { x: showcaseX, y: showcaseY + 4, z: showcaseZ - 5 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "sphere", params: { radius: 0.8 } },
              material: { type: "marble", params: { color: "#ffffee", grainColor: "#ccaa88", grainSize: 1 } },
            },
          ],
        },
      },
      MotionSource: {
        type: "static",
        params: {}
      },
    });

    // Wooden table
    spawn({
      Info: { name: "Wooden Table", description: "Handcrafted oak table" },
      Transform: { x: showcaseX, y: showcaseY, z: showcaseZ + 5 },
      Body: {
        type: "composite",
        params: {
          parts: [
            // Table top
            {
              geometry: { type: "box", params: { lengthX: 3, lengthY: 0.3, lengthZ: 2, pivot: "bottom" } },
              material: {
                type: "wood", params: {
                  color: "#CD853F",
                  grainColor: "#8B4513",
                  grainSize: 0.24,
                  grainDirection: { x: 1, y: 0, z: 0 } // Grain runs along X axis
                }
              },
              localPosition: [0, 2, 0],
            },
            // Legs
            {
              geometry: { type: "cylinder", params: { radius: 0.1, height: 2, pivot: "bottom" } },
              material: {
                type: "wood", params: {
                  color: "#8B4513",
                  grainColor: "#654321",
                  grainSize: 0.3,
                  grainDirection: { x: 0, y: 1, z: 0 } // Grain runs along Y axis (leg direction)
                }
              },
              localPosition: [1.2, 0, 0.8],
            },
            {
              geometry: { type: "cylinder", params: { radius: 0.1, height: 2, pivot: "bottom" } },
              material: {
                type: "wood", params: {
                  color: "#8B4513",
                  grainColor: "#654321",
                  grainSize: 0.3,
                  grainDirection: { x: 0, y: 1, z: 0 }
                }
              },
              localPosition: [-1.2, 0, 0.8],
            },
            {
              geometry: { type: "cylinder", params: { radius: 0.1, height: 2, pivot: "bottom" } },
              material: {
                type: "wood", params: {
                  color: "#8B4513",
                  grainColor: "#654321",
                  grainSize: 0.3,
                  grainDirection: { x: 0, y: 1, z: 0 }
                }
              },
              localPosition: [1.2, 0, -0.8],
            },
            {
              geometry: { type: "cylinder", params: { radius: 0.1, height: 2, pivot: "bottom" } },
              material: {
                type: "wood", params: {
                  color: "#8B4513",
                  grainColor: "#654321",
                  grainSize: 0.3,
                  grainDirection: { x: 0, y: 1, z: 0 }
                }
              },
              localPosition: [-1.2, 0, -0.8],
            },
          ],
        },
      },
      MotionSource: {
        type: "static",
        params: {}
      },
    });

    // Wood barrel
    spawn({
      Info: { name: "Wooden Barrel", description: "Storage barrel with vertical grain" },
      Transform: { x: showcaseX - 4, y: showcaseY, z: showcaseZ + 5 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: { type: "cylinder", params: { radius: 0.6, height: 1.2, pivot: "bottom" } },
              material: {
                type: "wood", params: {
                  color: "#A0522D",
                  grainColor: "#654321",
                  grainSize: 0.5,
                  grainDirection: { x: 0, y: 1, z: 0 } // Vertical grain
                }
              },
            },
          ],
        },
      },
      MotionSource: {
        type: "static",
        params: {}
      },
    });

    // Marble columns
    for (let i = 0; i < 3; i++) {
      const colX = showcaseX + i * 3 - 3;
      const colZ = showcaseZ - 10;
      const colY = terrainHeight.sample3D(colX / terrainSize, 0, colZ / terrainSize) + 2.5;

      spawn({
        Info: { name: "Marble Column", description: "Classical architecture" },
        Transform: { x: colX, y: colY, z: colZ },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "cylinder", params: { radius: 0.5, height: 5, pivot: "bottom" } },
                material: {
                  type: "marble", params: {
                    color: i === 0 ? "#ffffff" : i === 1 ? "#ffeeee" : "#eeffee",
                    grainColor: i === 0 ? "#cccccc" : i === 1 ? "#ccaaaa" : "#aaccaa",
                    grainSize: 2
                  }
                },
              },
              {
                geometry: { type: "cylinder", params: { radius: 0.7, height: 0.3, pivot: "bottom" } },
                material: {
                  type: "marble", params: {
                    color: i === 0 ? "#ffffff" : i === 1 ? "#ffeeee" : "#eeffee",
                    grainColor: i === 0 ? "#cccccc" : i === 1 ? "#ccaaaa" : "#aaccaa",
                    grainSize: 2
                  }
                },
                localPosition: [0, 5, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "static",
          params: {}
        },
      });
    }

    // #endregion
  }
};
