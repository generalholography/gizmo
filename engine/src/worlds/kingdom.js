export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule("field");
    const archetypes = getModule("archetype");

    // ---------- WORLD INITIALIZATION ----------
    initialize({
      title: "Elderglen Realms",
      description:
        "A RuneScape-inspired fantasy RPG sandbox: rolling grasslands, villages, a royal keep with interior, mines, monster camps, and a multi-floor dungeon.",
      tags: ["medieval", "fantasy", "sandbox", "rpg"],
      brandColors: ["#7fc36b", "#3aa7e1", "#f0c25b"],
      dimensions: [
        {
          name: "Elderglen",
          gravity: -9.81,
          useDayNightCycle: true,
          sky: {
            color: "#9ed0ff",
            sun: {
              color: "#FFEEDD",
              intensity: 1.0,
              timeOfDay: 1030,
            },
            clouds: {
              color: "#ffffff",
              coverage: 0.35,
            },
            stars: {
              intensity: 0.15,
            },
          },
        },
      ],
      achievements: [
        {
          name: "First Arms",
          description: "Pick up your first item.",
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              targetValue: 1
            }
          }
        },
        {
          name: "To the Keep!",
          description: "Discover the Royal Keep gate.",
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Royal Keep Gate',
              targetValue: 1
            }
          }
        },
        {
          name: "Village Wanderer",
          description: "Discover a village square.",
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Village Square',
              targetValue: 1
            }
          }
        },
        {
          name: "Prospector",
          description: "Discover three ore veins.",
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Ore Vein',
              targetValue: 3
            }
          }
        },
        {
          name: "Dungeon Initiate",
          description: "Discover Dungeon Floor 1.",
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
          name: "Abyssal Explorer",
          description: "Discover Dungeon Floor 3.",
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
          name: "Monster Hunter",
          description: "Defeat 15 monsters in Elderglen.",
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'entities killed', subtype: 'Goblin' },
                { metric: 'entities killed', subtype: 'Bandit' },
                { metric: 'entities killed', subtype: 'Ogre' },
                { metric: 'entities killed', subtype: 'Dungeon Overlord' }
              ],
              targetValue: 15
            }
          }
        }
      ]
    });

    // ---------- HELPERS ----------
    const rand = (min, max) => min + Math.random() * (max - min);
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    // ---------- TERRAIN & FIELDS ----------
    const seed = Math.floor(Math.random() * 1000000) | 0;
    const terrainSize = 520;
    const seaLevel = -0.8;

    const heightField = fields.register("elder_height", {
      type: "composite",
      params: {
        blend: "add",
        fields: [
          {
            type: "simplex",
            params: { seed, frequency: 0.05, amplitude: 8, octaves: 4 },
          }, // soft hills
          {
            type: "simplex",
            params: {
              seed: seed + 23,
              frequency: 0.14,
              amplitude: 3,
              octaves: 3,
            },
          }, // detail undulation
          {
            type: "simplex",
            params: {
              seed: seed + 99,
              frequency: 0.04,
              amplitude: -4.2,
              octaves: 2,
            },
          }, // river valleys
        ],
      },
    });

    const forestMask = fields.register("elder_forest", {
      type: "simplex",
      params: { seed: seed + 77, frequency: 0.28, amplitude: 1.0, octaves: 3 },
    });
    const densityMask = fields.register("elder_density", {
      type: "simplex",
      params: { seed: seed + 141, frequency: 0.18, amplitude: 1.0, octaves: 3 },
    });
    const villageMask = fields.register("elder_village", {
      type: "simplex",
      params: { seed: seed + 311, frequency: 0.08, amplitude: 1.0, octaves: 2 },
    });

    const sampleH = (x, z) =>
      heightField.sample3D(x / terrainSize, 0, z / terrainSize);
    const sampleSlope = (x, z) => {
      const eps = Math.max(1.5, terrainSize * 0.004);
      const h = sampleH(x, z);
      const hx = sampleH(x + eps, z);
      const hz = sampleH(x, z + eps);
      const dx = (hx - h) / eps;
      const dz = (hz - h) / eps;
      return clamp(Math.hypot(dx, dz) * 4, 0, 1);
    };

    // Terrain ground
    spawn({
      Info: { name: "Elderglen Grasslands" },
      Transform: {},
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: {
                type: "displacedPlane",
                params: {
                  lengthX: terrainSize,
                  lengthZ: terrainSize,
                  field: "elder_height",
                },
              },
              material: {
                type: "solid",
                params: { color: "#69b15a", roughness: 1.0 },
              },
            },
          ],
        },
      },
      MotionSource: { type: "static", params: {} },
    });

    // Global water plane
    spawn({
      Info: { name: "Waters of Elderglen" },
      Transform: { x: 0, y: seaLevel, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: {
                type: "box",
                params: {
                  lengthX: terrainSize * 3,
                  lengthY: 0.6,
                  lengthZ: terrainSize * 3,
                  pivot: "center",
                },
              },
              material: {
                type: "liquid",
                params: {
                  baseColor: "#3aa7e1",
                  depthTint: "#176d9c",
                  depthScale: 12,
                  opacity: 0.92,
                  waveFreq: 0.2,
                  waveAmp: 0.06,
                  waveSpeed: 0.22,
                },
              },
              ignoreCollisions: true,
            },
          ],
        },
      },
      MotionSource: { type: "static", params: {} },
    });

    // ---------- NATURE ARCHETYPES ----------
    archetypes.register("oak", {
      type: "bundle",
      params: {
        Info: { name: "Oak" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.28, height: 3.2, pivot: "bottom" },
                },
                material: {
                  type: "wood",
                  params: {
                    color: "#6b4a2c",
                    grainColor: "#5a3e24",
                    grainSize: 0.4,
                    seed: seed + 12,
                  },
                },
              },
              {
                geometry: { type: "sphere", params: { radius: 1.2 } },
                material: { type: "solid", params: { color: "#3f8b39" } },
                localPosition: [0.2, 2.8, 0],
              },
              {
                geometry: { type: "sphere", params: { radius: 0.9 } },
                material: { type: "solid", params: { color: "#459b42" } },
                localPosition: [-0.9, 2.5, 0.2],
              },
              {
                geometry: { type: "sphere", params: { radius: 0.8 } },
                material: { type: "solid", params: { color: "#3a7f35" } },
                localPosition: [0.7, 2.2, -0.7],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    archetypes.register("pine", {
      type: "bundle",
      params: {
        Info: { name: "Pine" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.2, height: 3.2, pivot: "bottom" },
                },
                material: {
                  type: "wood",
                  params: {
                    color: "#6a4a2f",
                    grainColor: "#57402a",
                    grainSize: 0.5,
                    seed: seed + 13,
                  },
                },
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 1.0, height: 1.0, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#2d6b3e" } },
                localPosition: [0, 1.6, 0],
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 0.75, height: 0.8, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#2a5e39" } },
                localPosition: [0, 2.2, 0],
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 0.5, height: 0.6, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#245033" } },
                localPosition: [0, 2.7, 0],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    archetypes.register("cypress", {
      type: "bundle",
      params: {
        Info: { name: "Cypress" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.16, height: 2.8, pivot: "bottom" },
                },
                material: {
                  type: "wood",
                  params: {
                    color: "#6a4a30",
                    grainSize: 0.6,
                    seed: seed + 14,
                  },
                },
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 0.6, height: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#2b6a3e" } },
                localPosition: [0, 1.0, 0],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    // ---------- BUILDINGS & STRUCTURES ----------
    archetypes.register("cottage", {
      type: "bundle",
      params: {
        Info: { name: "Cottage" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: {
                    lengthX: 4.2,
                    lengthY: 2.2,
                    lengthZ: 3.6,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: { color: "#cdb68a", roughness: 0.9 },
                },
              },
              {
                geometry: {
                  type: "pyramid",
                  params: {
                    width: 4.6,
                    height: 1.8,
                    depth: 4.0,
                    pivot: "bottom",
                  },
                },
                material: { type: "solid", params: { color: "#8a4e2d" } },
                localPosition: [0, 2.2, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.2, height: 1.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#6e5240" } },
                localPosition: [-1.6, 2.5, -0.8],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    archetypes.register("windmill", {
      type: "bundle",
      params: {
        Info: { name: "Windmill" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.2, height: 7.0, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#dad6cf" } },
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 1.4, height: 1.4 },
                },
                material: { type: "solid", params: { color: "#8a4e2d" } },
                localPosition: [0, 3.5, 0],
              },
              {
                tag: "sails",
                geometry: { type: "none" },
                localPosition: [0, 3.6, 1.0],
                children: [
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 0.3, lengthY: 2.6, lengthZ: 0.1 },
                    },
                    material: { type: "solid", params: { color: "#f0c25b" } },
                    localPosition: [0, 1.5, 0],
                  },
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 0.3, lengthY: 2.6, lengthZ: 0.1 },
                    },
                    material: { type: "solid", params: { color: "#f0c25b" } },
                    localPosition: [0, -1.5, 0],
                  },
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 2.6, lengthY: 0.3, lengthZ: 0.1 },
                    },
                    material: { type: "solid", params: { color: "#f0c25b" } },
                    localPosition: [1.5, 0, 0],
                  },
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 2.6, lengthY: 0.3, lengthZ: 0.1 },
                    },
                    material: { type: "solid", params: { color: "#f0c25b" } },
                    localPosition: [-1.5, 0, 0],
                  },
                ],
              },
            ],
          },
        },
        Animation: {
          clips: [
            {
              name: "default",
              duration: 6.0,
              tracks: [
                {
                  targetTag: "sails",
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 3.0, rotation: [0, 0, Math.PI] },
                    { time: 6.0, rotation: [0, 0, 2 * Math.PI] },
                  ],
                },
              ],
            },
          ],
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    archetypes.register("stoneWall", {
      type: "bundle",
      params: {
        Info: { name: "Stone Wall" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: {
                    lengthX: 4.0,
                    lengthY: 1.8,
                    lengthZ: 0.6,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: { color: "#a7a7a7", roughness: 0.95 },
                },
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    archetypes.register("village_square", {
      type: "bundle",
      params: {
        Info: { name: "Village Square" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 3.6, height: 0.3 },
                },
                material: {
                  type: "solid",
                  params: { color: "#bfa77a" },
                },
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "discover", params: {}, target: "self" }] }],
      },
    });

    archetypes.register("training_dummy", {
      type: "bundle",
      params: {
        Info: { name: "Training Dummy" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.16, height: 1.6, pivot: "bottom" },
                },
                material: {
                  type: "wood",
                  params: {
                    color: "#8b6a3e",
                    grainColor: "#6b5232",
                    grainSize: 0.8,
                    seed,
                  },
                },
              },
              {
                geometry: { type: "sphere", params: { radius: 0.25 } },
                material: { type: "solid", params: { color: "#cfa76a" } },
                localPosition: [0, 0.95, 0],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.8, lengthY: 0.18, lengthZ: 0.18 },
                },
                material: { type: "solid", params: { color: "#b58a52" } },
                localPosition: [0, 0.8, 0],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "discover", params: {}, target: "self" }] }],
      },
    });

    // ---------- ITEMS & PROJECTILES ----------
    const makePickup = (name, parts, mass = 0.4) => ({
      Info: { name },
      Body: { type: "composite", params: { parts } },
      MotionSource: { type: "dynamicRigidBody", params: { mass } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }],
    });

    archetypes.register("sword", {
      type: "bundle",
      params: {
        Info: { name: "Sword" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "root",
                geometry: {
                  type: "box",
                  params: {
                    lengthX: 0.12,
                    lengthY: 0.9,
                    lengthZ: 0.22,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: { color: "#cfd2d3", metalness: 0.6, roughness: 0.2 },
                },
                children: [
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 0.28, lengthY: 0.08, lengthZ: 0.28 },
                    },
                    material: { type: "solid", params: { color: "#444444" } },
                    localPosition: [0, 0.05, 0],
                  },
                  {
                    geometry: {
                      type: "capsule",
                      params: { radius: 0.07, height: 0.36, pivot: "top" },
                    },
                    material: { type: "solid", params: { color: "#7b4d24" } },
                  },
                ],
              },
            ],
          },
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 1 } },
        Rules: [
          { trigger: { type: "interact" }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] },
          {
            trigger: { type: "primaryAction", params: { range: 3.2 } },
            cooldown: 0.5,
            actions: [
              {
                type: "damage",
                params: { amount: 7, knockback: 2.5 },
                target: "other",
                range: 3.2,
              },
            ],
          },
        ],
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
                    { time: 0.15, rotation: [-Math.PI / 2, 0, 0] },
                    { time: 0.3, rotation: [0, 0, 0] },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    archetypes.register("arrow", {
      type: "bundle",
      params: {
        Info: { name: "Arrow" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.03, height: 0.8 },
                },
                material: { type: "solid", params: { color: "#aaaaaa" } },
                localRotation: [-Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 0.06, height: 0.16 },
                },
                material: { type: "solid", params: { color: "#555555" } },
                localPosition: [0, 0.4, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: { mass: 0.1, gravityScale: 1 },
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
            { type: "damage", params: { amount: 5 }, target: "other" },
            { type: "kill", params: {}, target: "self" },
          ] }],
      },
    });

    archetypes.register("bow_item", {
      type: "bundle",
      params: {
        Info: { name: "Bow" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.05, height: 1.1 },
                },
                material: { type: "solid", params: { color: "#5a3c17" } },
              },
            ],
          },
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 0.8 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }, { trigger: { type: 'primaryAction' }, cooldown: 0.9, actions: [
            {
              type: "spawnEntityFrom",
              target: "self",
              params: { entity: "arrow", velocity: 27 },
            },
          ] }],
      },
    });

    archetypes.register("spark", {
      type: "bundle",
      params: {
        Info: { name: "Spark" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "sphere", params: { radius: 0.2 } },
                material: { type: "solid", params: { color: "#ffd23f" } },
                ignoreCollisions: true,
              },
            ],
          },
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: { mass: 0.1, gravityScale: 0 },
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.5 } }, cooldown: 0.05, actions: [
            {
              type: "damage",
              params: { amount: 8 },
              target: "other",
              range: 0.5,
            },
            { type: "kill", params: {}, target: "self", range: 0.5 },
          ] }],
      },
    });

    archetypes.register("wand_sparks", {
      type: "bundle",
      params: {
        Info: { name: "Wand of Sparks" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.08, height: 0.9 },
                },
                material: { type: "solid", params: { color: "#4a2f6e" } },
              },
              {
                geometry: { type: "sphere", params: { radius: 0.09 } },
                material: { type: "solid", params: { color: "#ffd23f" } },
                localPosition: [0, 0.45, 0],
              },
            ],
          },
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 0.6 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }, { trigger: { type: 'primaryAction' }, cooldown: 0.75, actions: [
            {
              type: "spawnEntityFrom",
              target: "self",
              params: { entity: "spark", velocity: 18 },
            },
          ] }],
      },
    });

    // Dungeon-style items reused
    archetypes.register("short_sword", {
      type: "bundle",
      params: {
        Info: { name: "Short Sword" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "root",
                geometry: {
                  type: "box",
                  params: {
                    lengthX: 0.12,
                    lengthY: 0.8,
                    lengthZ: 0.18,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#cfd2d3",
                    metalness: 0.6,
                    roughness: 0.25,
                  },
                },
                children: [
                  {
                    geometry: {
                      type: "box",
                      params: {
                        lengthX: 0.25,
                        lengthY: 0.1,
                        lengthZ: 0.25,
                      },
                    },
                    material: {
                      type: "solid",
                      params: { color: "#444444" },
                    },
                    localPosition: [0, 0.05, 0],
                  },
                  {
                    geometry: {
                      type: "capsule",
                      params: { radius: 0.06, height: 0.35, pivot: "top" },
                    },
                    material: {
                      type: "solid",
                      params: { color: "#7a4a1a" },
                    },
                    localPosition: [0, 0, 0],
                  },
                ],
              },
            ],
          },
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 1 } },
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
                    { time: 0.15, rotation: [-Math.PI / 2, 0, 0] },
                    { time: 0.3, rotation: [0, 0, 0] },
                  ],
                },
              ],
            },
          ],
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }, { trigger: { type: 'primaryAction', params: { range: 3.3 } }, cooldown: 0.5, actions: [
            {
              type: "damage",
              params: { amount: 7, knockback: 2.5 },
              target: "other",
              range: 3.3,
            },
          ] }],
      },
    });

    archetypes.register("health_potion", {
      type: "bundle",
      params: {
        Info: { name: "Health Potion" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "sphere", params: { radius: 0.18 } },
                material: {
                  type: "solid",
                  params: { color: "#b6f6e8", opacity: 0.25 },
                },
              },
              {
                geometry: { type: "sphere", params: { radius: 0.14 } },
                material: {
                  type: "solid",
                  params: { color: "#d11f1f", opacity: 1 },
                },
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.1, height: 0.1, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#b6f6e8", opacity: 0.25 },
                },
                localPosition: [0, 0.15, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.08, height: 0.12, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#d3b350" },
                },
                localPosition: [0, 0.16, 0],
              },
            ],
          },
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 0.2 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }, { trigger: { type: 'primaryAction' }, actions: [
            // Use negative damage on self as a heal hack
            { type: "damage", params: { amount: -12 }, target: "user" },
            { type: "kill", params: {}, target: "self" },
          ] }],
      },
    });

    archetypes.register("arrow_projectile", {
      type: "bundle",
      params: {
        Info: { name: "Arrow" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.03, height: 0.8 },
                },
                material: { type: "solid", params: { color: "#aaaaaa" } },
                localRotation: [-Math.PI / 2, 0, 0],
                children: [
                  {
                    geometry: {
                      type: "cone",
                      params: { radius: 0.07, height: 0.2 },
                    },
                    material: { type: "solid", params: { color: "#555555" } },
                    localPosition: [0, 0.4, 0],
                  },
                ],
              },
            ],
          },
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: { mass: 0.1, gravityScale: 1 },
        },
                Rules: [{ trigger: { type: 'collisionEnter' }, actions: [
            { type: "damage", params: { amount: 6 }, target: "other" },
            { type: "kill", params: {}, target: "self" },
          ] }],
      },
    });

    archetypes.register("fireball_projectile", {
      type: "bundle",
      params: {
        Info: { name: "Fireball" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "sphere", params: { radius: 0.22 } },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#ff4500",
                    opacity: 0.7,
                    waveAmp: 0.25,
                    waveFreq: 3,
                  },
                },
                ignoreCollisions: true,
              },
            ],
          },
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: { mass: 0.1, gravityScale: 0 },
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.6 } }, cooldown: 0.05, actions: [
            {
              type: "damage",
              params: { amount: 9 },
              target: "other",
              range: 0.6,
            },
            { type: "kill", params: {}, target: "self", range: 0.6 },
          ] }],
      },
    });

    archetypes.register("wand_embers", {
      type: "bundle",
      params: {
        Info: { name: "Wand of Embers" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.08, height: 0.9 },
                },
                material: { type: "solid", params: { color: "#3b246a" } },
              },
              {
                geometry: { type: "sphere", params: { radius: 0.08 } },
                material: { type: "solid", params: { color: "#ff6a00" } },
                localPosition: [0, 0.45, 0],
              },
            ],
          },
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 0.6 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }, { trigger: { type: 'primaryAction' }, cooldown: 0.75, actions: [
            {
              type: "spawnEntityFrom",
              target: "self",
              params: { entity: "fireball_projectile", velocity: 18 },
            },
          ] }],
      },
    });

    archetypes.register("shadow_bolt_projectile", {
      type: "bundle",
      params: {
        Info: { name: "Shadow Bolt" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "sphere", params: { radius: 0.3 } },
                material: {
                  type: "solid",
                  params: { color: "#222222", roughness: 0.9 },
                },
              },
            ],
          },
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: { mass: 0.2, gravityScale: 0 },
        },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.8 } }, cooldown: 0.03, actions: [
            {
              type: "damage",
              params: { amount: 8, knockback: 4 },
              target: "other",
              range: 0.8,
            },
            { type: "kill", params: {}, target: "self", range: 0.8 },
          ] }],
      },
    });

    archetypes.register("crystal_of_mana", {
      type: "bundle",
      params: {
        Info: { name: "Crystal of Mana" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "root",
                geometry: {
                  type: "pyramid",
                  params: {
                    width: 0.25,
                    height: 0.3,
                    depth: 0.25,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#4faaff",
                    opacity: 0.85,
                    roughness: 0,
                  },
                },
              },
              {
                geometry: {
                  type: "pyramid",
                  params: {
                    width: 0.25,
                    height: 0.3,
                    depth: 0.25,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#4faaff",
                    opacity: 0.85,
                    roughness: 0,
                  },
                },
                localRotation: [Math.PI, 0, 0],
              },
            ],
          },
        },
        Animation: {
          clips: [
            {
              name: "default",
              duration: 4.0,
              tracks: [
                {
                  targetTag: "root",
                  keyframes: [
                    { time: 0.0, rotation: [0, 0, 0] },
                    { time: 2.0, rotation: [0, Math.PI, 0] },
                    { time: 4.0, rotation: [0, 2 * Math.PI, 0] },
                  ],
                },
              ],
            },
          ],
        },
        MotionSource: { type: "dynamicRigidBody", params: { mass: 0.2 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "getPickedUp", params: {}, target: "self" }] }],
      },
    });

    // ---------- ORE & MINE ----------
    archetypes.register("ore_copper", {
      type: "bundle",
      params: makePickup("Copper Ore", [
        {
          geometry: { type: "icosahedron", params: { radius: 0.3 } },
          material: { type: "solid", params: { color: "#b87333" } },
        },
      ]),
    });

    archetypes.register("ore_iron", {
      type: "bundle",
      params: makePickup("Iron Ore", [
        {
          geometry: { type: "icosahedron", params: { radius: 0.32 } },
          material: { type: "solid", params: { color: "#7a7a7a" } },
        },
      ]),
    });

    archetypes.register("rune_shard", {
      type: "bundle",
      params: makePickup(
        "Rune Shard",
        [
          {
            geometry: {
              type: "pyramid",
              params: {
                width: 0.26,
                height: 0.32,
                depth: 0.26,
                pivot: "bottom",
              },
            },
            material: {
              type: "solid",
              params: { color: "#5bc0ff", opacity: 0.8, roughness: 0.1 },
            },
          },
          {
            geometry: {
              type: "pyramid",
              params: {
                width: 0.26,
                height: 0.32,
                depth: 0.26,
                pivot: "bottom",
              },
            },
            material: {
              type: "solid",
              params: { color: "#5bc0ff", opacity: 0.8, roughness: 0.1 },
            },
            localRotation: [Math.PI, 0, 0],
          },
        ],
        0.25
      ),
    });

    archetypes.register("ore_vein", {
      type: "bundle",
      params: {
        Info: { name: "Ore Vein" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "icosahedron", params: { radius: 0.7 } },
                material: { type: "solid", params: { color: "#6a5b4b" } },
              },
              {
                geometry: { type: "icosahedron", params: { radius: 0.45 } },
                material: { type: "solid", params: { color: "#b87333" } },
                localPosition: [0.3, 0.1, -0.1],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: "discover", params: {}, target: "self" },
            {
              type: "spawnEntityFrom",
              target: "self",
              params: {
                entity: Math.random() < 0.5 ? "ore_copper" : "ore_iron",
              },
            },
            {
              type: "spawnEntityFrom",
              target: "self",
              params: {
                entity: Math.random() < 0.3 ? "rune_shard" : "ore_copper",
              },
            },
            { type: "kill", params: {}, target: "self" },
          ] }],
      },
    });

    archetypes.register("mine_entrance", {
      type: "bundle",
      params: {
        Info: { name: "Mine Entrance" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: {
                    lengthX: 6,
                    lengthY: 3.5,
                    lengthZ: 0.6,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: { color: "#6d6d6d" },
                },
              },
              {
                geometry: {
                  type: "box",
                  params: {
                    lengthX: 4,
                    lengthY: 3.0,
                    lengthZ: 0.4,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: { color: "#8b6a3e" },
                },
                localPosition: [0, 0.25, 0.3],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: "discover", params: {}, target: "self" }] }],
      },
    });

    // ---------- ENEMIES ----------
    archetypes.register("goblin_enemy", {
      type: "bundle",
      params: {
        Info: { name: "Goblin" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.7, lengthY: 1.2, lengthZ: 0.5 },
                },
                material: { type: "solid", params: { color: "#3a8f3a" } },
              },
              {
                geometry: {
                  type: "sphere",
                  params: { radius: 0.25, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#57b357" } },
                localPosition: [0, 0.6, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "characterController",
          params: { speed: 4.5, jumpHeight: 4, canFly: false },
        },
        Health: { value: 16 },
        AI: { isAggressive: true, awarenessRange: 26 },
        Faction: { id: "enemy_faction" },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.7, actions: [{ type: "damage", params: { amount: 3 }, target: "other" }] }],
      },
    });

    archetypes.register("bandit_enemy", {
      type: "bundle",
      params: {
        Info: { name: "Bandit" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.7, lengthY: 1.3, lengthZ: 0.5 },
                },
                material: { type: "solid", params: { color: "#8a5d3b" } },
              },
              {
                geometry: {
                  type: "sphere",
                  params: { radius: 0.26, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#d6c6a7" },
                },
                localPosition: [0, 0.65, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "characterController",
          params: { speed: 4.2, jumpHeight: 3.5, canFly: false },
        },
        Health: { value: 18 },
        Inventory: {
          size: 1,
          items: ["bow_item"],
          selectedItemIndex: 0,
        },
        AI: { isAggressive: true, awarenessRange: 32 },
        Faction: { id: "enemy_faction" },
      },
    });

    archetypes.register("ogre_enemy", {
      type: "bundle",
      params: {
        Info: { name: "Ogre" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.2, lengthY: 2.0, lengthZ: 0.9 },
                },
                material: { type: "solid", params: { color: "#6a8750" } },
              },
              {
                geometry: {
                  type: "sphere",
                  params: { radius: 0.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#88aa6f" } },
                localPosition: [0, 1.0, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "characterController",
          params: { speed: 3.6, jumpHeight: 3.0, canFly: false },
        },
        Health: { value: 40 },
        AI: { isAggressive: true, awarenessRange: 28 },
        Faction: { id: "enemy_faction" },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.8, actions: [
            {
              type: "damage",
              params: { amount: 8, knockback: 6 },
              target: "other",
            },
          ] }],
      },
    });

    // Dungeon enemies (goblin/archer/overlord) + chest from sample
    archetypes.register("goblin", {
      type: "bundle",
      params: {
        Info: { name: "Goblin" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "spine",
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 0.8, lengthZ: 0.4 },
                },
                material: { type: "solid", params: { color: "#4a8f2a" } },
                children: [
                  {
                    tag: "head",
                    geometry: {
                      type: "sphere",
                      params: { radius: 0.3, pivot: "bottom" },
                    },
                    material: { type: "solid", params: { color: "#65b341" } },
                    localPosition: [0, 0.4, 0],
                  },
                  {
                    tag: "arm_r",
                    geometry: {
                      type: "box",
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.6,
                        lengthZ: 0.12,
                        pivot: "top",
                      },
                    },
                    material: { type: "solid", params: { color: "#4a8f2a" } },
                    localPosition: [0.28, 0.4, 0],
                  },
                  {
                    tag: "arm_l",
                    geometry: {
                      type: "box",
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.6,
                        lengthZ: 0.12,
                        pivot: "top",
                      },
                    },
                    material: { type: "solid", params: { color: "#4a8f2a" } },
                    localPosition: [-0.28, 0.4, 0],
                  },
                  {
                    tag: "leg_r",
                    geometry: {
                      type: "box",
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.7,
                        lengthZ: 0.12,
                        pivot: "top",
                      },
                    },
                    material: { type: "solid", params: { color: "#4a8f2a" } },
                    localPosition: [0.2, -0.45, 0],
                  },
                  {
                    tag: "leg_l",
                    geometry: {
                      type: "box",
                      params: {
                        lengthX: 0.12,
                        lengthY: 0.7,
                        lengthZ: 0.12,
                        pivot: "top",
                      },
                    },
                    material: { type: "solid", params: { color: "#4a8f2a" } },
                    localPosition: [-0.2, -0.45, 0],
                  },
                ],
              },
            ],
          },
        },
        MotionSource: {
          type: "characterController",
          params: { speed: 4.5, jumpHeight: 4, canFly: false },
        },
        Health: { value: 14 },
        AI: { isAggressive: true, awarenessRange: 26 },
        Faction: { id: "enemy_faction" },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.7, actions: [{ type: "damage", params: { amount: 3 }, target: "other" }] }],
      },
    });

    archetypes.register("archer", {
      type: "bundle",
      params: {
        Info: { name: "Archer" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "spine",
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 1.1, lengthZ: 0.4 },
                },
                material: { type: "solid", params: { color: "#aaaa44" } },
                children: [
                  {
                    tag: "head",
                    geometry: {
                      type: "sphere",
                      params: { radius: 0.25, pivot: "bottom" },
                    },
                    material: {
                      type: "solid",
                      params: { color: "#d6d6a3" },
                    },
                    localPosition: [0, 0.55, 0],
                  },
                  {
                    tag: "arm_l",
                    geometry: {
                      type: "box",
                      params: {
                        lengthX: 0.15,
                        lengthY: 0.8,
                        lengthZ: 0.15,
                        pivot: "top",
                      },
                    },
                    material: {
                      type: "solid",
                      params: { color: "#d6d6a3" },
                    },
                    localPosition: [-0.28, 0.55, 0],
                    children: [
                      {
                        tag: "heldItemAnchor",
                        geometry: { type: "none" },
                        localPosition: [0, -0.8, 0],
                        localRotation: [Math.PI / 2, 0, 0],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        Inventory: {
          size: 1,
          items: ["bow_item"],
          selectedItemIndex: 0,
        },
        MotionSource: {
          type: "characterController",
          params: { speed: 2, jumpHeight: 3.5, canFly: false },
        },
        Health: { value: 12 },
        AI: { isAggressive: true, awarenessRange: 32 },
        Faction: { id: "enemy_faction" },
      },
    });

    archetypes.register("treasure_chest", {
      type: "bundle",
      params: {
        Info: { name: "Treasure Chest", description: "Contains random loot." },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.2, lengthY: 0.8, lengthZ: 0.8 },
                },
                material: {
                  type: "solid",
                  params: { color: "#6f4d2d" },
                },
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.25, lengthY: 0.1, lengthZ: 0.85 },
                },
                material: {
                  type: "solid",
                  params: { color: "#3a2a18" },
                },
                localPosition: [0, 0.25, 0],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [] }],
      },
    });

    archetypes.register("dungeon_overlord", {
      type: "bundle",
      params: {
        Info: { name: "Dungeon Overlord" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                tag: "core",
                geometry: {
                  type: "box",
                  params: { lengthX: 1.6, lengthY: 2.8, lengthZ: 1.2 },
                },
                material: {
                  type: "solid",
                  params: { color: "#333333", metalness: 0.2, roughness: 0.8 },
                },
              },
              {
                tag: "head",
                geometry: {
                  type: "sphere",
                  params: { radius: 0.6, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#550000" } },
                localPosition: [0, 1.4, 0],
              },
            ],
          },
        },
        MotionSource: {
          type: "characterController",
          params: { speed: 4.5, jumpHeight: 4.5, canFly: false },
        },
        Health: { value: 350 },
        Inventory: {
          size: 1,
          items: ["crystal_of_mana"],
          selectedItemIndex: -1,
        },
        AI: { isAggressive: true, awarenessRange: 40 },
        Faction: { id: "enemy_faction" },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.6, actions: [
            {
              type: "damage",
              params: { amount: 10, knockback: 6 },
              target: "other",
            },
          ] }, { trigger: { type: 'primaryAction' }, cooldown: 1.5, actions: [
            {
              type: "spawnEntityFrom",
              target: "self",
              params: { entity: "shadow_bolt_projectile", velocity: 18 },
            },
          ] }],
      },
    });

    // ---------- DOOR ARCHETYPE FOR DUNGEON ----------
    archetypes.register("simple_door", {
      type: "bundle",
      params: {
        Info: { name: "Door" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 2.4, lengthZ: 0.25 },
                },
                material: {
                  type: "solid",
                  params: { color: "#8B4513" },
                },
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    archetypes.register("dungeon_entrance", {
      type: "bundle",
      params: {
        Info: { name: "Dungeon Entrance" },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 4, lengthY: 2.5, lengthZ: 0.5 },
                },
                material: {
                  type: "solid",
                  params: { color: "#696969" },
                },
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.5, lengthY: 3, lengthZ: 2 },
                },
                material: {
                  type: "solid",
                  params: { color: "#808080" },
                },
                localPosition: [1.75, 0.25, 0.75],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.5, lengthY: 3, lengthZ: 2 },
                },
                material: {
                  type: "solid",
                  params: { color: "#808080" },
                },
                localPosition: [-1.75, 0.25, 0.75],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    // ---------- ROYAL KEEP WITH INTERIOR ----------
    archetypes.register("castle_keep", {
      type: "bundle",
      params: {
        Info: { name: "Royal Keep" },
        Body: {
          type: "composite",
          params: {
            hasInterior: true,
            parts: [
              {
                // main keep volume
                geometry: {
                  type: "box",
                  params: { lengthX: 26, lengthY: 12, lengthZ: 26 },
                },
                material: {
                  type: "solid",
                  params: { color: "#c7c7c7", roughness: 0.9 },
                },
              },
              {
                // raised battlement band around roofline
                geometry: {
                  type: "box",
                  params: { lengthX: 26, lengthY: 1.2, lengthZ: 26, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#bfbfbf", roughness: 0.9 } },
                localPosition: [0, 6.2, 0],
              },
              {
                // crenellations along X+
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [12.6, 7.2, -10],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [12.6, 7.2, -4],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [12.6, 7.2, 2],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [12.6, 7.2, 8],
              },
              {
                // crenellations along X-
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-12.6, 7.2, -10],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-12.6, 7.2, -4],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-12.6, 7.2, 2],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 1.2, lengthZ: 1.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-12.6, 7.2, 8],
              },
              {
                // crenellations along Z+
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-8, 7.2, 12.6],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-2, 7.2, 12.6],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [4, 7.2, 12.6],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [10, 7.2, 12.6],
              },
              {
                // crenellations along Z-
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-8, 7.2, -12.6],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [-2, 7.2, -12.6],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [4, 7.2, -12.6],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.4, lengthY: 1.2, lengthZ: 2.2, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b3b3b3", roughness: 0.9 } },
                localPosition: [10, 7.2, -12.6],
              },
              {
                // corner towers
                geometry: {
                  type: "cylinder",
                  params: { radius: 2.4, height: 18, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#b7b7b7", roughness: 0.95 },
                },
                localPosition: [11.5, -6, 11.5],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 2.4, height: 18, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#b7b7b7", roughness: 0.95 },
                },
                localPosition: [-11.5, -6, 11.5],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 2.4, height: 18, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#b7b7b7", roughness: 0.95 },
                },
                localPosition: [11.5, -6, -11.5],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 2.4, height: 18, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#b7b7b7", roughness: 0.95 },
                },
                localPosition: [-11.5, -6, -11.5],
              },
              {
                // tower caps / roofs
                geometry: {
                  type: "cone",
                  params: { radius: 2.5, height: 2.6, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#8f8f8f", roughness: 0.8 } },
                localPosition: [11.5, 12, 11.5],
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 2.5, height: 2.6, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#8f8f8f", roughness: 0.8 } },
                localPosition: [-11.5, 12, 11.5],
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 2.5, height: 2.6, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#8f8f8f", roughness: 0.8 } },
                localPosition: [11.5, 12, -11.5],
              },
              {
                geometry: {
                  type: "cone",
                  params: { radius: 2.5, height: 2.6, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#8f8f8f", roughness: 0.8 } },
                localPosition: [-11.5, 12, -11.5],
              },
              {
                // gatehouse front
                geometry: {
                  type: "box",
                  params: { lengthX: 8, lengthY: 6, lengthZ: 3 },
                },
                material: { type: "solid", params: { color: "#bdbdbd" } },
                  localPosition: [0, -5, -14.5],
              },
              {
                // gate arch
                geometry: {
                  type: "cylinder",
                  params: { radius: 2.6, height: 1.8, arc: Math.PI, axis: "x" },
                },
                material: { type: "solid", params: { color: "#a9a9a9", roughness: 0.85 } },
                  localPosition: [0, -2.2, -14.5],
                  localRotation: [0, Math.PI/2, Math.PI / 2],
              },
              {
                // portcullis hint
                geometry: {
                  type: "box",
                  params: { lengthX: 3.2, lengthY: 3.4, lengthZ: 0.3, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#6a6a6a", roughness: 0.6 } },
                  localPosition: [0, -5, -15.2],
              },
              {
                // side buttresses
                geometry: {
                  type: "box",
                  params: { lengthX: 1.6, lengthY: 6, lengthZ: 3, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b0b0b0", roughness: 0.9 } },
                  localPosition: [14, -6, -7],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.6, lengthY: 6, lengthZ: 3, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b0b0b0", roughness: 0.9 } },
                  localPosition: [-14, -6, -7],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.6, lengthY: 6, lengthZ: 3, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b0b0b0", roughness: 0.9 } },
                  localPosition: [14, -6, 7],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.6, lengthY: 6, lengthZ: 3, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b0b0b0", roughness: 0.9 } },
                  localPosition: [-14, -6, 7],
              },
              {
                // vertical windows
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 2.6, lengthZ: 0.4, pivot: "center" },
                },
                material: { type: "solid", params: { color: "#6e7a8a", roughness: 0.25 } },
                localPosition: [0, 2, -13.4],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 2.6, lengthZ: 0.4, pivot: "center" },
                },
                material: { type: "solid", params: { color: "#6e7a8a", roughness: 0.25 } },
                localPosition: [6, 3, 13.4],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 2.6, lengthZ: 0.4, pivot: "center" },
                },
                material: { type: "solid", params: { color: "#6e7a8a", roughness: 0.25 } },
                localPosition: [-6, 4, 13.4],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 2.6, lengthZ: 0.4, pivot: "center" },
                },
                material: { type: "solid", params: { color: "#6e7a8a", roughness: 0.25 } },
                localPosition: [13.4, 3, 0],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 2.6, lengthZ: 0.4, pivot: "center" },
                },
                material: { type: "solid", params: { color: "#6e7a8a", roughness: 0.25 } },
                localPosition: [-13.4, 2, 0],
              },
              {
                // balcony above gate
                geometry: {
                  type: "box",
                  params: { lengthX: 8, lengthY: 0.6, lengthZ: 2.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#c2c2c2", roughness: 0.8 } },
                localPosition: [0, 3.6, -15],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 2.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b5b5b5", roughness: 0.9 } },
                localPosition: [3.6, 4.2, -15],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 2.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b5b5b5", roughness: 0.9 } },
                localPosition: [1.2, 4.2, -15],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 2.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b5b5b5", roughness: 0.9 } },
                localPosition: [-1.2, 4.2, -15],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 2.4, pivot: "bottom" },
                },
                material: { type: "solid", params: { color: "#b5b5b5", roughness: 0.9 } },
                localPosition: [-3.6, 4.2, -15],
              },
              {
                // banners to add color
                geometry: {
                  type: "box",
                  params: { lengthX: 1.2, lengthY: 5.6, lengthZ: 0.15, pivot: "top" },
                },
                material: { type: "solid", params: { color: "#1d4f8a", roughness: 0.35 } },
                localPosition: [9, 9.8, -12],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.2, lengthY: 5.6, lengthZ: 0.15, pivot: "top" },
                },
                material: { type: "solid", params: { color: "#8a1d38", roughness: 0.35 } },
                localPosition: [-9, 9.8, -12],
              }
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      },
    });

    // ---------- FOREST SCATTER ----------
    const keepExclusionR = 38; // prevent trees inside/near keep footprint
    for (let i = 0; i < 1600; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.95;
      const z = (Math.random() - 0.5) * terrainSize * 0.95;
      if (Math.hypot(x, z) < keepExclusionR) continue;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const y = sampleH(x, z);
      const slope = sampleSlope(x, z);
      if (y <= seaLevel + 0.1 || slope > 0.95) continue;
      const f = forestMask.sample3D(nx, 0, nz);
      const d = densityMask.sample3D(nx, 0, nz);
      if (Math.random() < 0.52 + 0.28 * f + 0.2 * d) {
        const t = Math.random();
        const type = t < 0.5 ? "oak" : t < 0.8 ? "pine" : "cypress";
        const s = 0.8 + Math.random() * 0.7;
        spawn(type, {
          Transform: {
            x,
            y,
            z,
            sx: s,
            sy: s,
            sz: s,
            ry: Math.random() * Math.PI * 2,
          },
        });
      }
    }

    // ---------- KEEP & CENTRAL AREA ----------
    const keepX = 0;
    const keepZ = 0;
    const keepY = sampleH(keepX, keepZ);
    spawn("castle_keep", { Transform: { x: keepX, y: keepY + 6, z: keepZ } });

    // Gate entity (discovery + teleport into interior hall)
    const keepGateWorld = {
      x: keepX,
      y: keepY,
      z: keepZ - 16.5,
    };
    const keepInteriorEntry = {
      x: keepX,
      y: keepY ,
      z: keepZ - 16,
    };

    spawn({
      Info: { name: "Royal Keep Gate" },
      Transform: {
        x: keepGateWorld.x,
        y: keepGateWorld.y,
        z: keepGateWorld.z,
      },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: {
                type: "box",
                params: {
                  lengthX: 4,
                  lengthY: 3.6,
                  lengthZ: 0.6,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: { color: "#9f9f9f" },
              },
            },
          ],
        },
      },
      MotionSource: { type: "static", params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: "discover", params: {}, target: "self" },
          {
            type: "teleport",
            params: { position: keepInteriorEntry },
            target: "other",
          },
        ] }],
    });

    // Simple interior furniture as separate entity (benefits from hasInterior)
    spawn({
      Info: { name: "Keep Hall Furniture" },
      Transform: {
        x: keepX,
        y: keepY,
        z: keepZ,
      },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              // central runner to guide players deeper into the keep
              geometry: {
                type: "box",
                params: {
                  lengthX: 3.2,
                  lengthY: 0.12,
                  lengthZ: 18,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: { color: "#a63a3a", roughness: 0.6 },
              },
              localPosition: [0, 0.08, -1],
            },
            {
              // banquet table left
              geometry: {
                type: "box",
                params: {
                  lengthX: 8,
                  lengthY: 0.5,
                  lengthZ: 2.4,
                  pivot: "bottom",
                },
              },
              material: {
                type: "wood",
                params: {
                  color: "#7a4a2a",
                  grainColor: "#56361f",
                  grainSize: 0.32,
                  grainDirection: { x: 1, y: 0, z: 0 },
                },
              },
              localPosition: [-6.5, 0.4, 1],
            },
            {
              // banquet table right
              geometry: {
                type: "box",
                params: {
                  lengthX: 8,
                  lengthY: 0.5,
                  lengthZ: 2.4,
                  pivot: "bottom",
                },
              },
              material: {
                type: "wood",
                params: {
                  color: "#7a4a2a",
                  grainColor: "#56361f",
                  grainSize: 0.32,
                  grainDirection: { x: 1, y: 0, z: 0 },
                },
              },
              localPosition: [6.5, 0.4, 1],
            },
            {
              // benches flanking left table
              geometry: {
                type: "box",
                params: { lengthX: 8, lengthY: 0.35, lengthZ: 0.7, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#6b3d1f", grainSize: 0.25 } },
              localPosition: [-6.5, 0.35, -0.6],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 8, lengthY: 0.35, lengthZ: 0.7, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#6b3d1f", grainSize: 0.25 } },
              localPosition: [-6.5, 0.35, 2.6],
            },
            {
              // benches flanking right table
              geometry: {
                type: "box",
                params: { lengthX: 8, lengthY: 0.35, lengthZ: 0.7, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#6b3d1f", grainSize: 0.25 } },
              localPosition: [6.5, 0.35, -0.6],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 8, lengthY: 0.35, lengthZ: 0.7, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#6b3d1f", grainSize: 0.25 } },
              localPosition: [6.5, 0.35, 2.6],
            },
            {
              // throne dais platform
              geometry: {
                type: "box",
                params: {
                  lengthX: 4.8,
                  lengthY: 0.6,
                  lengthZ: 3.4,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: { color: "#c9c2b3", roughness: 0.35 },
              },
              localPosition: [0, 0.3, 9.5],
            },
            {
              // throne seat
              geometry: {
                type: "box",
                params: { lengthX: 1.6, lengthY: 1.2, lengthZ: 1.6, pivot: "bottom" },
              },
              material: {
                type: "wood",
                params: {
                  color: "#8b5a2b",
                  grainColor: "#5c3b1b",
                  grainSize: 0.28,
                  grainDirection: { x: 0, y: 1, z: 0 },
                },
              },
              localPosition: [0, 0.9, 9.5],
            },
            {
              // throne backrest
              geometry: {
                type: "box",
                params: { lengthX: 1.6, lengthY: 2.4, lengthZ: 0.5, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#d7b35d", roughness: 0.45 } },
              localPosition: [0, 1.5, 10.4],
            },
            {
              // banners behind throne
              geometry: {
                type: "box",
                params: { lengthX: 0.5, lengthY: 4, lengthZ: 0.1, pivot: "top" },
              },
              material: { type: "solid", params: { color: "#1d4f8a", roughness: 0.3 } },
              localPosition: [-2.6, 5, 11.6],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 0.5, lengthY: 4, lengthZ: 0.1, pivot: "top" },
              },
              material: { type: "solid", params: { color: "#8a1d38", roughness: 0.3 } },
              localPosition: [2.6, 5, 11.6],
            },
            {
              // wall sconces near entrance
              geometry: {
                type: "cylinder",
                params: { radius: 0.25, height: 1, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#9c9c9c" } },
              localPosition: [-5, 1.6, -8.5],
            },
            {
              geometry: {
                type: "sphere",
                params: { radius: 0.35 },
              },
              material: {
                type: "solid",
                params: { color: "#f6c55b", roughness: 0.25 },
              },
              localPosition: [-5, 2.8, -8.5],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.25, height: 1, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#9c9c9c" } },
              localPosition: [5, 1.6, -8.5],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.35 } },
              material: {
                type: "solid",
                params: { color: "#f6c55b", roughness: 0.25 },
              },
              localPosition: [5, 2.8, -8.5],
            },
            {
              // bookshelves to make the hall feel lived-in
              geometry: {
                type: "box",
                params: { lengthX: 1.4, lengthY: 3.2, lengthZ: 0.6, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#7c5533", grainSize: 0.35 } },
              localPosition: [-9.5, 0.6, 7],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 1.4, lengthY: 3.2, lengthZ: 0.6, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#7c5533", grainSize: 0.35 } },
              localPosition: [9.5, 0.6, 7],
            },
            {
              // side carpet runners to frame the hall
              geometry: {
                type: "box",
                params: { lengthX: 2, lengthY: 0.08, lengthZ: 18, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#6b2a2a", roughness: 0.55 } },
              localPosition: [-11, 0.06, -1],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 2, lengthY: 0.08, lengthZ: 18, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#6b2a2a", roughness: 0.55 } },
              localPosition: [11, 0.06, -1],
            },
            {
              // stone columns to imply vaulted ceiling
              geometry: {
                type: "cylinder",
                params: { radius: 0.65, height: 9.5, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c1c1c1", roughness: 0.7 } },
              localPosition: [-8.5, 0, -8],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.65, height: 9.5, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c1c1c1", roughness: 0.7 } },
              localPosition: [8.5, 0, -8],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.65, height: 9.5, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c1c1c1", roughness: 0.7 } },
              localPosition: [-8.5, 0, 7],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.65, height: 9.5, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c1c1c1", roughness: 0.7 } },
              localPosition: [8.5, 0, 7],
            },
            {
              // chandeliers to add warm light cues
              geometry: {
                type: "cylinder",
                params: { radius: 2, height: 0.3, pivot: "center" },
              },
              material: { type: "solid", params: { color: "#b59a6a", roughness: 0.45 } },
              localPosition: [0, 8.2, -4],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.4 } },
              material: { type: "solid", params: { color: "#f8d57a", roughness: 0.25 } },
              localPosition: [0, 8.2, -4],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 2, height: 0.3, pivot: "center" },
              },
              material: { type: "solid", params: { color: "#b59a6a", roughness: 0.45 } },
              localPosition: [0, 8.2, 6],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.4 } },
              material: { type: "solid", params: { color: "#f8d57a", roughness: 0.25 } },
              localPosition: [0, 8.2, 6],
            },
            {
              // food on tables (platters and loaves)
              geometry: { type: "sphere", params: { radius: 0.45 } },
              material: { type: "solid", params: { color: "#d3b167", roughness: 0.35 } },
              localPosition: [-6.5, 0.95, 1.3],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.35 } },
              material: { type: "solid", params: { color: "#c58a3a", roughness: 0.3 } },
              localPosition: [-6.5, 0.85, 0.3],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.45 } },
              material: { type: "solid", params: { color: "#d3b167", roughness: 0.35 } },
              localPosition: [6.5, 0.95, 1.3],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.35 } },
              material: { type: "solid", params: { color: "#c58a3a", roughness: 0.3 } },
              localPosition: [6.5, 0.85, 0.3],
            },
            {
              // drink jugs
              geometry: {
                type: "cylinder",
                params: { radius: 0.28, height: 0.8, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#b26d3a", roughness: 0.35 } },
              localPosition: [-5.4, 0.75, 1.6],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.28, height: 0.8, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#b26d3a", roughness: 0.35 } },
              localPosition: [5.4, 0.75, 1.6],
            },
            {
              // weapon racks near entry
              geometry: {
                type: "box",
                params: { lengthX: 2.4, lengthY: 1.4, lengthZ: 0.3, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#7a4a2a", grainSize: 0.25 } },
              localPosition: [-7.5, 0.5, -10.2],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 2.4, lengthY: 1.4, lengthZ: 0.3, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#7a4a2a", grainSize: 0.25 } },
              localPosition: [7.5, 0.5, -10.2],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.15, height: 1.2, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c7c7c7" } },
              localPosition: [-7.5, 1.2, -10.2],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.15, height: 1.2, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c7c7c7" } },
              localPosition: [7.5, 1.2, -10.2],
            },
            {
              // storage crates and barrels tucked in corners
              geometry: {
                type: "box",
                params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#6c4a2a", grainSize: 0.22 } },
              localPosition: [-11.5, 0.1, -12],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.6, height: 1.1, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#5f4122", grainSize: 0.24 } },
              localPosition: [-10.5, 0.1, -12.6],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#6c4a2a", grainSize: 0.22 } },
              localPosition: [11.5, 0.1, -12],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.6, height: 1.1, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#5f4122", grainSize: 0.24 } },
              localPosition: [10.5, 0.1, -12.6],
            },
            {
              // side tables with scrolls
              geometry: {
                type: "box",
                params: { lengthX: 1.8, lengthY: 0.5, lengthZ: 0.9, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#7a4a2a", grainSize: 0.25 } },
              localPosition: [-11.5, 0.5, 4.5],
            },
            {
              geometry: { type: "cylinder", params: { radius: 0.18, height: 0.6, pivot: "bottom" } },
              material: { type: "solid", params: { color: "#d0c7a1", roughness: 0.35 } },
              localPosition: [-11.3, 1.0, 4.6],
            },
            {
              geometry: { type: "cylinder", params: { radius: 0.18, height: 0.6, pivot: "bottom" } },
              material: { type: "solid", params: { color: "#d0c7a1", roughness: 0.35 } },
              localPosition: [11.3, 1.0, 4.6],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 1.8, lengthY: 0.5, lengthZ: 0.9, pivot: "bottom" },
              },
              material: { type: "wood", params: { color: "#7a4a2a", grainSize: 0.25 } },
              localPosition: [11.5, 0.5, 4.5],
            },
            {
              // braziers flanking throne
              geometry: { type: "cylinder", params: { radius: 0.5, height: 0.8, pivot: "bottom" } },
              material: { type: "solid", params: { color: "#4b3b2c", roughness: 0.65 } },
              localPosition: [-2.4, 0.8, 8],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.5 } },
              material: { type: "solid", params: { color: "#f7b347", roughness: 0.2 } },
              localPosition: [-2.4, 1.4, 8],
            },
            {
              geometry: { type: "cylinder", params: { radius: 0.5, height: 0.8, pivot: "bottom" } },
              material: { type: "solid", params: { color: "#4b3b2c", roughness: 0.65 } },
              localPosition: [2.4, 0.8, 8],
            },
            {
              geometry: { type: "sphere", params: { radius: 0.5 } },
              material: { type: "solid", params: { color: "#f7b347", roughness: 0.2 } },
              localPosition: [2.4, 1.4, 8],
            },
            {
              // stair hint blocks leading up behind throne (suggest upper levels)
              geometry: {
                type: "box",
                params: { lengthX: 2, lengthY: 1, lengthZ: 1.4, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#c7c7c7", roughness: 0.8 } },
              localPosition: [0, 0.6, 12],
            },
            {
              geometry: {
                type: "box",
                params: { lengthX: 1.8, lengthY: 1, lengthZ: 1.2, pivot: "bottom" },
              },
              material: { type: "solid", params: { color: "#bfbfbf", roughness: 0.8 } },
              localPosition: [0, 1.6, 13],
            }
          ],
        },
      },
      MotionSource: { type: "static", params: {} },
    });

    // Interior exit door
    spawn({
      Info: { name: "Keep Interior Door" },
      Transform: {
        x: keepInteriorEntry.x,
        y: keepInteriorEntry.y,
        z: keepInteriorEntry.z,
      },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: {
                type: "box",
                params: {
                  lengthX: 2,
                  lengthY: 3,
                  lengthZ: 0.4,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: { color: "#7b5a3a" },
              },
            },
          ],
        },
      },
      MotionSource: { type: "static", params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: "teleport",
            params: { position: keepGateWorld },
            target: "other",
          },
        ] }],
    });

    // Approach walls to focus player camera towards keep
    for (let i = -2; i <= 2; i++) {
      const wx = keepX + i * 4;
      const wz = keepZ - 22;
      const wy = sampleH(wx, wz);
      spawn("stoneWall", {
        Transform: { x: wx, y: wy, z: wz, ry: 0 },
      });
    }

    // ---------- VILLAGES ----------
    const villages = [];
    const ringR = [120, 180, 240];
    for (let v = 0; v < 3; v++) {
      const a = Math.random() * Math.PI * 2;
      const r = ringR[v];
      const vx = keepX + Math.cos(a) * r;
      const vz = keepZ + Math.sin(a) * r * 0.85;
      const vy = sampleH(vx, vz);
      villages.push({ x: vx, y: vy, z: vz });
    }

    villages.forEach(({ x, y, z }, idx) => {
      spawn("village_square", {
        Transform: { x, y: y + 0.15, z },
      });

      const cottageCount = 6 + Math.floor(Math.random() * 5);
      const radius = 10 + Math.random() * 4;
      for (let i = 0; i < cottageCount; i++) {
        const a = (i / cottageCount) * Math.PI * 2 + Math.random() * 0.2;
        const cx = x + Math.cos(a) * radius;
        const cz = z + Math.sin(a) * radius;
        const cy = sampleH(cx, cz);
        spawn("cottage", {
          Transform: {
            x: cx,
            y: cy,
            z: cz,
            ry: Math.atan2(cz - z, cx - x) + Math.PI,
          },
        });
      }

      // Windmill nearby
      const wx = x + 16 + Math.random() * 10;
      const wz = z + 12 + Math.random() * 10;
      const wy = sampleH(wx, wz);
      spawn("windmill", { Transform: { x: wx, y: wy, z: wz } });

      // Paddock wall ring
      for (let w = 0; w < 6; w++) {
        const wa = (w / 6) * Math.PI * 2;
        const sx = x + Math.cos(wa) * 18;
        const sz = z + Math.sin(wa) * 18;
        const sy = sampleH(sx, sz);
        spawn("stoneWall", {
          Transform: { x: sx, y: sy, z: sz, ry: wa + Math.PI / 2 },
        });
      }

      // Training grounds and starter items at first village
      if (idx === 0) {
        const tgx = x + 8;
        const tgz = z - 10;
        const tgy = sampleH(tgx, tgz);
        for (let r = 0; r < 4; r++) {
          spawn("training_dummy", {
            Transform: {
              x: tgx + (r - 1.5) * 2.4,
              y: tgy,
              z: tgz + (r % 2) * 2.2,
            },
          });
        }
        spawn("sword", {
          Transform: { x: tgx + 0.5, y: tgy + 0.9, z: tgz - 1.5 },
        });
        spawn("bow_item", {
          Transform: { x: tgx - 0.5, y: tgy + 0.9, z: tgz - 1.5 },
        });
        spawn("wand_sparks", {
          Transform: { x: tgx, y: tgy + 0.9, z: tgz - 2.2 },
        });
      }
    });

    // ---------- MINE ----------
    {
      const scanR = terrainSize * 0.38;
      let placedMine = false;
      for (let i = 0; i < 120 && !placedMine; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = rand(scanR * 0.4, scanR);
        const mx = Math.cos(a) * r;
        const mz = Math.sin(a) * r * 0.9;
        const my = sampleH(mx, mz);
        if (my > seaLevel + 3.5 && sampleSlope(mx, mz) < 0.6) {
          spawn("mine_entrance", {
            Transform: {
              x: mx,
              y: my + 0.1,
              z: mz,
              ry: Math.atan2(mz - keepZ, mx - keepX) + Math.PI,
            },
          });
          // ore cluster
          for (let j = 0; j < 8; j++) {
            const vx = mx + (Math.random() - 0.5) * 12;
            const vz = mz + (Math.random() - 0.5) * 12;
            const vy = sampleH(vx, vz);
            if (vy > seaLevel + 0.4) {
              spawn("ore_vein", {
                Transform: { x: vx, y: vy + 0.05, z: vz },
              });
            }
          }
          placedMine = true;
        }
      }
    }

    // ---------- MONSTER CAMPS ----------
    const spawnMobCamp = (label, type, cx, cz, count) => {
      const cy = sampleH(cx, cz);
      // campfire
      spawn({
        Info: { name: `${label} Campfire` },
        Transform: { x: cx, y: cy + 0.05, z: cz },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.5, height: 0.2 },
                },
                material: {
                  type: "solid",
                  params: { color: "#6e6152" },
                },
              },
              {
                geometry: { type: "sphere", params: { radius: 0.4 } },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#ff7b2f",
                    opacity: 0.7,
                    waveAmp: 0.4,
                    waveFreq: 5,
                  },
                },
                localPosition: [0, 0.3, 0],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
      });
      for (let i = 0; i < count; i++) {
        const rx = cx + (Math.random() - 0.5) * 10;
        const rz = cz + (Math.random() - 0.5) * 10;
        const ry = sampleH(rx, rz);
        spawn(type, { Transform: { x: rx, y: ry + 1.2, z: rz } });
      }
    };

    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = rand(terrainSize * 0.22, terrainSize * 0.42);
      const zx = Math.cos(a) * r;
      const zz = Math.sin(a) * r * 0.9;
      const h = sampleH(zx, zz);
      if (h > seaLevel + 0.3) {
        const typeName =
          i === 2
            ? "ogre_enemy"
            : Math.random() < 0.5
            ? "goblin_enemy"
            : "bandit_enemy";
        const label =
          typeName === "ogre_enemy"
            ? "Ogre"
            : typeName === "goblin_enemy"
            ? "Goblin"
            : "Bandit";
        const count =
          typeName === "ogre_enemy" ? 3 : 6 + Math.floor(Math.random() * 4);
        spawnMobCamp(label, typeName, zx, zz, count);
      }
    }

    // ---------- DUNGEON FLOORS ----------
    const floors = [
      {
        idx: 1,
        size: 44,
        height: 6.0,
        y: -26,
        cx: 0,
        cz: -60,
        color: "#4e4e56",
      },
      {
        idx: 2,
        size: 48,
        height: 6.5,
        y: -52,
        cx: 28,
        cz: -122,
        color: "#4a4a52",
      },
      {
        idx: 3,
        size: 54,
        height: 7.0,
        y: -78,
        cx: -22,
        cz: -184,
        color: "#45454d",
      },
    ];

    const entryPoints = floors.map((f) => ({
      x: f.cx,
      y: f.y + 1.25,
      z: f.cz + (f.size / 2 - 3),
    }));

    const spawnDungeonFloor = (floor) => {
      const shellParts = [
        {
          geometry: {
            type: "box",
            params: {
              lengthX: floor.size,
              lengthY: floor.height,
              lengthZ: floor.size,
              pivot: "bottom",
            },
          },
          material: {
            type: "solid",
            params: { color: floor.color, roughness: 1.0 },
          },
        },
      ];

      const detailParts = [];
      const cell = 7;
      for (
        let x = -Math.floor((floor.size - 6) / (2 * cell));
        x <= Math.floor((floor.size - 6) / (2 * cell));
        x++
      ) {
        for (
          let z = -Math.floor((floor.size - 6) / (2 * cell));
          z <= Math.floor((floor.size - 6) / (2 * cell));
          z++
        ) {
          if (Math.random() < 0.35 && !(Math.abs(x) < 1 && Math.abs(z) < 1)) {
            detailParts.push({
              geometry: {
                type: "cylinder",
                params: {
                  radius: 0.6,
                  height: floor.height - 0.2,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: { color: "#3c3c42" },
              },
              localPosition: [x * cell, 0, z * cell],
            });
          }
          if (Math.random() < 0.2) {
            detailParts.push({
              geometry: {
                type: "box",
                params: { lengthX: 2.5, lengthY: 0.25, lengthZ: 2.5 },
              },
              material: {
                type: "solid",
                params: { color: "#3f3f3f" },
              },
              localPosition: [
                x * cell + rand(-1, 1),
                0.05,
                z * cell + rand(-1, 1),
              ],
            });
          }
        }
      }

      spawn({
        Info: { name: `Dungeon Floor ${floor.idx}` },
        Transform: { x: floor.cx, y: floor.y, z: floor.cz },
        Body: {
          type: "composite",
          params: {
            hasInterior: true,
            parts: shellParts,
          },
        },
        MotionSource: { type: "static", params: {} },
      });

      if (detailParts.length > 0) {
        spawn({
          Info: { name: `Dungeon Floor ${floor.idx} Details` },
          Transform: { x: floor.cx, y: floor.y, z: floor.cz },
          Body: {
            type: "composite",
            params: { parts: detailParts },
          },
          MotionSource: { type: "static", params: {} },
        });
      }

      // marker for discovery achievements
      spawn({
        Info: { name: `Dungeon Floor ${floor.idx} Marker` },
        Transform: {
          x: entryPoints[floor.idx - 1].x + 2,
          y: entryPoints[floor.idx - 1].y,
          z: entryPoints[floor.idx - 1].z - 2,
        },
      });

      // enemies
      const enemyCount = 6 + floor.idx * 3;
      for (let i = 0; i < enemyCount; i++) {
        const ex = floor.cx + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const ez = floor.cz + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const ey = floor.y + 1;
        const type = Math.random() < 0.75 ? "goblin" : "archer";
        spawn(type, { Transform: { x: ex, y: ey, z: ez } });
      }

      if (floor.idx === 3) {
        spawn("dungeon_overlord", {
          Transform: { x: floor.cx, y: floor.y + 1, z: floor.cz },
        });
      }

      // chests
      const lootPool = [
        "short_sword",
        "bow_item",
        "wand_embers",
        "health_potion",
        "health_potion",
      ];
      const chestCount = 3 + floor.idx;
      for (let i = 0; i < chestCount; i++) {
        const cx = floor.cx + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const cz = floor.cz + rand(-(floor.size / 2 - 3), floor.size / 2 - 3);
        const cy = floor.y + 0.5;
        const count = 1 + Math.floor(Math.random() * 3);
        const localPool = lootPool.slice();
        const effects = [];
        for (let j = 0; j < count && localPool.length > 0; j++) {
          const pick = localPool.splice(
            Math.floor(Math.random() * localPool.length),
            1
          )[0];
          effects.push({
            type: "spawnEntityFrom",
            target: "self",
            params: { entity: pick },
          });
        }
        effects.push({ type: "discover", params: {}, target: "self" });
        effects.push({ type: "kill", params: {}, target: "self" });
        spawn("treasure_chest", {
          Transform: { x: cx, y: cy, z: cz },
                    Rules: [{ trigger: { type: 'interact' }, actions: effects }],
        });
      }
    };

    floors.forEach(spawnDungeonFloor);

    const getWallDoorPlacement = (f, preferredWall) => {
      const half = f.size / 2;
      const doorThickness = 0.25;
      const doorHalf = doorThickness / 2;
      const eps = 0.01;
      const margin = 3;
      const walls = ["north", "south", "east", "west"];
      const wall = preferredWall || choice(walls);
      let x = f.cx;
      let z = f.cz;
      let ry = 0;
      switch (wall) {
        case "north":
          z = f.cz + (half - doorHalf - eps);
          x = f.cx + rand(-(half - margin), half - margin);
          ry = Math.PI;
          break;
        case "south":
          z = f.cz - (half - doorHalf - eps);
          x = f.cx + rand(-(half - margin), half - margin);
          ry = 0;
          break;
        case "east":
          x = f.cx + (half - doorHalf - eps);
          z = f.cz + rand(-(half - margin), half - margin);
          ry = -Math.PI / 2;
          break;
        case "west":
          x = f.cx - (half - doorHalf - eps);
          z = f.cz + rand(-(half - margin), half - margin);
          ry = Math.PI / 2;
          break;
      }
      return { x, y: f.y + 1.25, z, ry };
    };

    floors.forEach((f, i) => {
      if (i < floors.length - 1) {
        const t = getWallDoorPlacement(f);
        spawn("simple_door", {
          Transform: t,
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: "teleport",
                params: { position: entryPoints[i + 1] },
                target: "other",
              },
            ] }],
        });
      }
      if (i > 0) {
        const half = f.size / 2;
        const doorHalf = 0.25 / 2;
        const eps = 0.01;
        spawn("simple_door", {
          Transform: {
            x: f.cx,
            y: f.y + 1.25,
            z: f.cz + (half - doorHalf - eps),
            ry: Math.PI,
          },
                    Rules: [{ trigger: { type: 'interact' }, actions: [
              {
                type: "teleport",
                params: { position: entryPoints[i - 1] },
                target: "other",
              },
            ] }],
        });
      }
    });

    // ---------- DUNGEON ENTRANCE ON OVERWORLD ----------
    const overworldEntranceX = keepX + 24;
    const overworldEntranceZ = keepZ - 32;
    const overworldEntranceY = sampleH(overworldEntranceX, overworldEntranceZ);

    spawn("dungeon_entrance", {
      Transform: {
        x: overworldEntranceX,
        y: overworldEntranceY + 0.01,
        z: overworldEntranceZ,
        ry: 0,
      },
    });

    spawn("simple_door", {
      Transform: {
        x: overworldEntranceX,
        y: overworldEntranceY + 1.2,
        z: overworldEntranceZ + 0.75,
        ry: 0,
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: "teleport",
            params: { position: entryPoints[0] },
            target: "other",
          },
        ] }],
    });

    // Exit door from first floor to overworld near entrance
    {
      const f0 = floors[0];
      const half0 = f0.size / 2;
      const doorHalf0 = 0.25 / 2;
      const eps0 = 0.01;
      spawn("simple_door", {
        Transform: {
          x: f0.cx,
          y: f0.y + 1.25,
          z: f0.cz + (half0 - doorHalf0 - eps0),
          ry: Math.PI,
        },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: "teleport",
              params: {
                position: {
                  x: overworldEntranceX,
                  y: overworldEntranceY + 1.2,
                  z: overworldEntranceZ + 2.5,
                },
              },
              target: "other",
            },
          ] }],
      });
    }

    // Some dungeon prep loot at entrance
    spawn("short_sword", {
      Transform: {
        x: overworldEntranceX + 2,
        y: overworldEntranceY + 1.2,
        z: overworldEntranceZ + 2,
      },
    });
    spawn("health_potion", {
      Transform: {
        x: overworldEntranceX - 2,
        y: overworldEntranceY + 1.2,
        z: overworldEntranceZ + 2,
      },
    });

    // ---------- PLAYER SPAWN & WELCOME SIGN ----------
    {
      const px = keepGateWorld.x;
      const pz = keepGateWorld.z - 4;
      const py = sampleH(px, pz) + 1.2;
      spawn("player", {
        Transform: { x: px, y: py, z: pz, ry: 0 },
        Inventory: { size: 6, items: [], selectedItemIndex: 0 },
      });

      // spawn a built-in dragon pet for the player
      spawn("dragon", {
        Transform: { x: px + 2, y: py, z: pz + 2 },
        // Make the dragon mountable on interact (player sits on the back)
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: "mount", params: { offset: [0, 1.2, 0] }, target: "self" },
          ] }],
      });

      spawn({
        Info: { name: "Welcome to Elderglen" },
        Transform: {
          x: px - 3,
          y: sampleH(px - 3, pz) + 0.1,
          z: pz - 2,
        },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.12, height: 1.8, pivot: "bottom" },
                },
                material: {
                  type: "solid",
                  params: { color: "#8b5a2b" },
                },
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 2.2, lengthY: 0.8, lengthZ: 0.1 },
                },
                material: {
                  type: "solid",
                  params: { color: "#f3e4b6" },
                },
                localPosition: [0, 1.2, 0.08],
              },
            ],
          },
        },
        MotionSource: { type: "static", params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: "popup",
              params: {
                text: "Welcome to the Elderglen Realms!\n\nExplore villages, train at the dummies, mine ore in the hills, and brave the depths of the dungeon beneath the land.\n\nPick up gear with E, and interact with doors and signs to travel.",
              },
              target: "other",
            },
          ] }],
      });
    }
  },
};
