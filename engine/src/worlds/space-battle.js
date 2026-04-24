export default {
setupScene(api) {
const { spawn, initialize, getModule } = api;

const archetypes = getModule("archetype");
const fields = getModule ? getModule("field") : null; // unused but kept for completeness

// ─────────────────────────────────────────────────────────────────────────────
// World initialization – deep space battlefield
// ─────────────────────────────────────────────────────────────────────────────
initialize({
  title: "Void Spearhead",
  description:
    "Two fleets clash in the dark between drifting asteroids. Pilot your starfighter and break the enemy spearhead.",
  tags: ["space", "battle", "fleet", "dogfight"],
  brandColors: ["#050816", "#ff5b33"],
  dimensions: [
    {
      name: "deep_space",
      gravity: 0.0,
      useDayNightCycle: false,
      sky: {
        color: "#02030a",
        sun: {
          color: "#ffffff",
          intensity: 0.7,
          timeOfDay: 1200,
        },
        clouds: {
          color: "#000000",
          coverage: 0.0,
        },
        stars: {
          intensity: 1.0,
        },
      },
    },
  ],
  achievements: [
    {
      name: "First Blood",
      description: "Destroy an enemy fighter.",
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'entities killed',
          subtype: 'Enemy Fighter',
          targetValue: 1
        }
      }
    },
    {
      name: "Squadron Wipe",
      description: "Destroy 10 enemy fighters.",
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'entities killed',
          subtype: 'Enemy Fighter',
          targetValue: 10
        }
      }
    },
    {
      name: "Capital Collapse",
      description: "Destroy the enemy capital ship.",
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'entities killed',
          subtype: 'Imperial Dreadnought',
          targetValue: 1
        }
      }
    },
    {
      name: "Screen the Corvette",
      description: "Destroy 3 enemies while the corvette survives.",
      condition: {
        type: 'sum',
        params: {
          metrics: [
            { metric: 'entities killed', subtype: 'Enemy Fighter' },
            { metric: 'entities killed', subtype: 'Imperial Dreadnought' }
          ],
          targetValue: 3
        }
      }
    },
    {
      name: "Rock Hound",
      description: "Discover 5 asteroids in the field.",
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'discoveries',
          subtype: 'Asteroid',
          targetValue: 5
        }
      }
    }
  ]
});

// ─────────────────────────────────────────────────────────────────────────────
// Factions
// ─────────────────────────────────────────────────────────────────────────────
const PLAYER_FACTION = "player_faction"; // matches engine's player faction
const ENEMY_FACTION = "enemy_faction";

// ─────────────────────────────────────────────────────────────────────────────
// Projectile archetypes
// ─────────────────────────────────────────────────────────────────────────────

// Fast blue blaster bolt (player + friendlies)
archetypes.register("bolt_blue", {
  type: "bundle",
  params: {
    Info: { name: "Blue Blaster Bolt" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "cylinder",
              params: { radius: 0.1, height: 1.4 },
            },
            material: {
              type: "solid",
              params: {
                color: "#6fd0ff",
                metalness: 0.1,
                roughness: 0.2,
                opacity: 0.9,
              },
            },
            localRotation: [Math.PI / 2, 0, 0],
            ignoreCollisions: true,
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 0.05, gravityScale: 0 },
    },
    Faction: { id: PLAYER_FACTION },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.75 } }, cooldown: 0.02, actions: [
        {
          type: "damage",
          target: "other",
          range: 0.75,
          params: { amount: 6, knockback: 2 },
        },
        {
          type: "kill",
          target: "self",
          range: 0.75,
          params: {},
        },
      ] }],
  },
});

// Fast green bolt (enemy fighters)
archetypes.register("bolt_green", {
  type: "bundle",
  params: {
    Info: { name: "Green Blaster Bolt" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "cylinder",
              params: { radius: 0.09, height: 1.2 },
            },
            material: {
              type: "solid",
              params: {
                color: "#66ff66",
                metalness: 0.1,
                roughness: 0.25,
                opacity: 0.9,
              },
            },
            localRotation: [Math.PI / 2, 0, 0],
            ignoreCollisions: true,
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 0.04, gravityScale: 0 },
    },
    Faction: { id: ENEMY_FACTION },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.7 } }, cooldown: 0.02, actions: [
        {
          type: "damage",
          target: "other",
          range: 0.7,
          params: { amount: 4, knockback: 1.5 },
        },
        {
          type: "kill",
          target: "self",
          range: 0.7,
          params: {},
        },
      ] }],
  },
});

// Heavy red turbolaser bolt (capital ship & cruisers)
archetypes.register("bolt_red_heavy", {
  type: "bundle",
  params: {
    Info: { name: "Heavy Turbolaser Bolt" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "cylinder",
              params: { radius: 0.18, height: 2.8 },
            },
            material: {
              type: "solid",
              params: {
                color: "#ff5533",
                metalness: 0.3,
                roughness: 0.3,
                opacity: 0.95,
              },
            },
            localRotation: [Math.PI / 2, 0, 0],
            ignoreCollisions: true,
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 0.1, gravityScale: 0 },
    },
    Faction: { id: ENEMY_FACTION },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 1.2 } }, cooldown: 0.02, actions: [
        {
          type: "damage",
          target: "other",
          range: 1.2,
          params: { amount: 15, knockback: 6 },
        },
        {
          type: "kill",
          target: "self",
          range: 1.2,
          params: {},
        },
      ] }],
  },
});

// Player rockets (secondary)
archetypes.register("player_rocket", {
  type: "bundle",
  params: {
    Info: { name: "Player Rocket" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "cylinder",
              params: { radius: 0.15, height: 1.2 },
            },
            material: {
              type: "solid",
              params: {
                color: "#bbbbbb",
                roughness: 0.5,
                metalness: 0.4,
              },
            },
            localRotation: [Math.PI / 2, 0, 0],
          },
          {
            geometry: {
              type: "cone",
              params: { radius: 0.15, height: 0.5 },
            },
            material: {
              type: "solid",
              params: {
                color: "#ffae42",
                metalness: 0.2,
              },
            },
            localPosition: [0, 0.6, 0],
            localRotation: [Math.PI / 2, 0, 0],
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 0.2, gravityScale: 0 },
    },
    Faction: { id: PLAYER_FACTION },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.6 } }, cooldown: 0.03, actions: [
        {
          type: "damage",
          target: "other",
          range: 2.5,
          params: { amount: 35, knockback: 10 },
        },
        {
          type: "kill",
          target: "self",
          range: 2.6,
          params: {},
        },
      ] }],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Turret archetypes (for static capital & cruisers)
// ─────────────────────────────────────────────────────────────────────────────

// Friendly point-defense turret (blue bolts)
archetypes.register("friendly_turret", {
  type: "bundle",
  params: {
    Info: { name: "Point-Defense Turret" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            tag: "base",
            geometry: {
              type: "cylinder",
              params: { radius: 1.0, height: 0.8 },
            },
            material: {
              type: "solid",
              params: {
                color: "#3d4350",
                metalness: 0.5,
                roughness: 0.4,
              },
            },
            localRotation: [0, 0, 0],
            children: [
              {
                tag: "barrel",
                geometry: {
                  type: "box",
                  params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 3.0 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#aab6d8",
                    metalness: 0.7,
                    roughness: 0.3,
                  },
                },
                localPosition: [0, 0.6, -1.2],
              },
            ],
          },
        ],
      },
    },
    MotionSource: {
      type: "static",
      params: {},
    },
    Faction: { id: PLAYER_FACTION },
    Health: { value: 80 },
    AI: { isAggressive: true, awarenessRange: 550 },
        Rules: [{ trigger: { type: 'primaryAction' }, cooldown: 0.9, actions: [
        {
          type: "spawnEntityFrom",
          target: "self",
          params: { entity: "bolt_blue", velocity: 200 },
        },
      ] }],
  },
});

// Enemy heavy turret (red turbolasers + green PD)
archetypes.register("enemy_heavy_turret", {
  type: "bundle",
  params: {
    Info: { name: "Dreadnought Turret" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            tag: "turret_base",
            geometry: {
              type: "cylinder",
              params: { radius: 1.8, height: 1.2 },
            },
            material: {
              type: "solid",
              params: {
                color: "#404148",
                metalness: 0.6,
                roughness: 0.4,
              },
            },
            localRotation: [0, 0, 0],
            children: [
              {
                tag: "turret_head",
                geometry: {
                  type: "box",
                  params: { lengthX: 2.6, lengthY: 1.4, lengthZ: 3.2 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#565862",
                    metalness: 0.7,
                    roughness: 0.35,
                  },
                },
                localPosition: [0, 1.0, -0.4],
                children: [
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 4.0 },
                    },
                    material: {
                      type: "solid",
                      params: {
                        color: "#727684",
                        metalness: 0.8,
                      },
                    },
                    localPosition: [0.8, 0.2, -2.4],
                  },
                  {
                    geometry: {
                      type: "box",
                      params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 4.0 },
                    },
                    material: {
                      type: "solid",
                      params: {
                        color: "#727684",
                        metalness: 0.8,
                      },
                    },
                    localPosition: [-0.8, 0.2, -2.4],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    MotionSource: {
      type: "static",
      params: {},
    },
    Faction: { id: ENEMY_FACTION },
    Health: { value: 140 },
    AI: { isAggressive: true, awarenessRange: 700 },
        Rules: [{ trigger: { type: 'primaryAction' }, cooldown: 1.5, actions: [
        {
          type: "spawnEntityFrom",
          target: "self",
          params: { entity: "bolt_red_heavy", velocity: 230 },
        },
      ] }, { trigger: { type: 'secondaryAction' }, cooldown: 0.8, actions: [
        {
          type: "spawnEntityFrom",
          target: "self",
          params: { entity: "bolt_green", velocity: 190 },
        },
      ] }],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Asteroid archetypes
// ─────────────────────────────────────────────────────────────────────────────
archetypes.register("asteroid_small", {
  type: "bundle",
  params: {
    Info: { name: "Asteroid" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "icosahedron",
              params: { radius: 1.2 },
            },
            material: {
              type: "solid",
              params: {
                color: "#7b6f66",
                roughness: 1.0,
              },
            },
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 20, gravityScale: 0 },
    },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 3.5 } }, cooldown: 1.5, actions: [
        {
          type: "discover",
          target: "self",
          range: 3.5,
          params: {},
        },
      ] }],
  },
});

archetypes.register("asteroid_medium", {
  type: "bundle",
  params: {
    Info: { name: "Asteroid" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "icosahedron",
              params: { radius: 3.5 },
            },
            material: {
              type: "solid",
              params: {
                color: "#6b6056",
                roughness: 1.0,
              },
            },
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 80, gravityScale: 0 },
    },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 5 } }, cooldown: 1.5, actions: [
        {
          type: "discover",
          target: "self",
          range: 5,
          params: {},
        },
      ] }],
  },
});

archetypes.register("asteroid_large", {
  type: "bundle",
  params: {
    Info: { name: "Asteroid" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            geometry: {
              type: "icosahedron",
              params: { radius: 7 },
            },
            material: {
              type: "solid",
              params: {
                color: "#5c544e",
                roughness: 1.0,
              },
            },
          },
        ],
      },
    },
    MotionSource: {
      type: "dynamicRigidBody",
      params: { mass: 200, gravityScale: 0 },
    },
        Rules: [{ trigger: { type: 'entityInRange', params: { range: 7 } }, cooldown: 1.5, actions: [
        {
          type: "discover",
          target: "self",
          range: 7,
          params: {},
        },
      ] }],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Ship archetypes
// ─────────────────────────────────────────────────────────────────────────────

// Enemy fighter – small, agile
archetypes.register("enemy_fighter", {
  type: "bundle",
  params: {
    Info: { name: "Enemy Fighter" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            tag: "hull",
            geometry: {
              type: "box",
              params: { lengthX: 2, lengthY: 0.6, lengthZ: 4, pivot: "center" },
            },
            material: {
              type: "solid",
              params: {
                color: "#2a2a30",
                metalness: 0.5,
                roughness: 0.4,
              },
            },
            children: [
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 4, lengthY: 0.2, lengthZ: 1.5 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#33333b",
                  },
                },
                localPosition: [0, -0.2, 0.3],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.5, lengthY: 0.7, lengthZ: 1.4 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#555560",
                  },
                },
                localPosition: [0, 0.35, -0.5],
              },
              {
                // engine glow
                geometry: {
                  type: "cylinder",
                  params: { radius: 0.4, height: 0.5 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#55aaff",
                    depthTint: "#88ddff",
                    opacity: 0.8,
                  },
                },
                localPosition: [0, 0, 2.1],
                localRotation: [Math.PI / 2, 0, 0],
              },
            ],
          },
        ],
      },
    },
    MotionSource: {
      type: "characterController",
      params: { speed: 35, jumpHeight: 0, canFly: true },
    },
    Health: { value: 20 },
    Faction: { id: ENEMY_FACTION },
    AI: { isAggressive: true, awarenessRange: 450 },
        Rules: [{ trigger: { type: 'primaryAction' }, cooldown: 0.6, actions: [
        {
          type: "spawnEntityFrom",
          target: "self",
          params: {
            entity: "bolt_green",
            velocity: 140,
          },
        },
      ] }],
  },
});

// Friendly corvette – medium utilitarian
archetypes.register("friendly_corvette", {
  type: "bundle",
  params: {
    Info: { name: "Allied Corvette" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            tag: "spine",
            geometry: {
              type: "box",
              params: { lengthX: 5, lengthY: 3, lengthZ: 30, pivot: "center" },
            },
            material: {
              type: "solid",
              params: {
                color: "#555862",
                metalness: 0.4,
                roughness: 0.5,
              },
            },
            children: [
              // side nacelles
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 3, lengthY: 2, lengthZ: 14 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#40444e",
                  },
                },
                localPosition: [4, -0.3, 2],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 3, lengthY: 2, lengthZ: 14 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#40444e",
                  },
                },
                localPosition: [-4, -0.3, 2],
              },
              // nose sensor dish and guns
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.2, height: 0.5 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#888c98",
                    metalness: 0.6,
                  },
                },
                localPosition: [0, 1.5, -13],
                localRotation: [Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1.5, lengthY: 0.8, lengthZ: 2 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#99a4b8",
                  },
                },
                localPosition: [0, 1.3, -10.5],
              },
              // aft dual engines
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.2, height: 2.5 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#66ccff",
                    depthTint: "#aaddff",
                    opacity: 0.9,
                  },
                },
                localPosition: [1.8, 0, 16],
                localRotation: [Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.2, height: 2.5 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#66ccff",
                    depthTint: "#aaddff",
                    opacity: 0.9,
                  },
                },
                localPosition: [-1.8, 0, 16],
                localRotation: [Math.PI / 2, 0, 0],
              },
              // subtle blue running lights
              {
                geometry: {
                  type: "sphere",
                  params: { radius: 0.4 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#5fd4ff",
                    opacity: 0.9,
                  },
                },
                localPosition: [2.4, 1, -6],
              },
              {
                geometry: {
                  type: "sphere",
                  params: { radius: 0.4 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#5fd4ff",
                    opacity: 0.9,
                  },
                },
                localPosition: [-2.4, 1, -6],
              },
            ],
          },
        ],
      },
    },
    MotionSource: {
      type: "characterController",
      params: { speed: 8, jumpHeight: 0, canFly: true },
    },
    Health: { value: 200 },
    Faction: { id: PLAYER_FACTION },
    AI: { isAggressive: true, awarenessRange: 500 },
    Inventory: { size: 1, items: [], selectedItemIndex: -1 },
        Rules: [{ trigger: { type: 'primaryAction' }, cooldown: 1.2, actions: [
        {
          type: "spawnEntityFrom",
          target: "self",
          params: { entity: "bolt_blue", velocity: 160 },
        },
        {
          type: "spawnEntityFrom",
          target: "self",
          params: { entity: "bolt_blue", velocity: 160 },
        },
      ] }],
  },
});

// Friendly support cruiser – medium-large gunship/light carrier (STATIC + turrets)
archetypes.register("friendly_cruiser", {
  type: "bundle",
  params: {
    Info: { name: "Support Cruiser" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            tag: "hull",
            geometry: {
              type: "box",
              params: { lengthX: 8, lengthY: 4, lengthZ: 50, pivot: "center" },
            },
            material: {
              type: "solid",
              params: {
                color: "#494b55",
                metalness: 0.5,
                roughness: 0.45,
              },
            },
            children: [
              // tapered bow
              {
                geometry: {
                  type: "pyramid",
                  params: {
                    width: 8,
                    height: 4,
                    depth: 10,
                    pivot: "bottom",
                  },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#5a5e6a",
                  },
                },
                localPosition: [0, 2, -30],
                localRotation: [Math.PI, 0, 0],
              },
              // midsection hangar pods
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 4, lengthY: 3, lengthZ: 10 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#3c404a",
                  },
                },
                localPosition: [5.5, -0.5, -5],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 4, lengthY: 3, lengthZ: 10 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#3c404a",
                  },
                },
                localPosition: [-5.5, -0.5, -5],
              },
              // aft engine cluster
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.5, height: 3 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#66d2ff",
                    depthTint: "#99e6ff",
                    opacity: 0.9,
                  },
                },
                localPosition: [0, 0.5, 27],
                localRotation: [Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.1, height: 2.4 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#66d2ff",
                    depthTint: "#99e6ff",
                    opacity: 0.9,
                  },
                },
                localPosition: [3, 0.2, 24],
                localRotation: [Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 1.1, height: 2.4 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#66d2ff",
                    depthTint: "#99e6ff",
                    opacity: 0.9,
                  },
                },
                localPosition: [-3, 0.2, 24],
                localRotation: [Math.PI / 2, 0, 0],
              },
            ],
          },
        ],
      },
    },
    // STATIC: cruiser itself does not move
    MotionSource: {
      type: "static",
      params: {},
    },
    Health: { value: 260 },
    Faction: { id: PLAYER_FACTION },
    AI: { isAggressive: true, awarenessRange: 550 },
    // Hull no longer fires directly; actual firepower comes from attached turrets
  },
});

// Enemy capital ship – dagger-shaped dreadnought (STATIC + turrets)
archetypes.register("enemy_capital_ship", {
  type: "bundle",
  params: {
    Info: { name: "Imperial Dreadnought" },
    Body: {
      type: "composite",
      params: {
        parts: [
          {
            tag: "dagger",
            geometry: {
              type: "pyramid",
              params: {
                width: 80,
                height: 12,
                depth: 260,
                pivot: "bottom",
              },
            },
            material: {
              type: "solid",
              params: {
                color: "#3a3c42",
                metalness: 0.6,
                roughness: 0.5,
              },
            },
            localPosition: [0, 0, 0],
            children: [
              // upper hull plate
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 70, lengthY: 6, lengthZ: 140 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#44464f",
                    metalness: 0.6,
                  },
                },
                localPosition: [0, 9, -30],
              },
              // superstructure spine
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 30, lengthY: 14, lengthZ: 80 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#50525d",
                    metalness: 0.7,
                  },
                },
                localPosition: [0, 17, -10],
              },
              // sensor towers
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 4, height: 18 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#585b66",
                  },
                },
                localPosition: [10, 26, -18],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 4, height: 18 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#585b66",
                  },
                },
                localPosition: [-10, 26, -18],
              },
              // hangar bay (ventral)
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 40, lengthY: 8, lengthZ: 36 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#222428",
                  },
                },
                localPosition: [0, -10, -20],
              },
              // aft engine array
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 8, height: 18 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#5fd4ff",
                    depthTint: "#aaf0ff",
                    opacity: 0.95,
                  },
                },
                localPosition: [0, 4, 118],
                localRotation: [Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 6, height: 14 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#5fd4ff",
                    depthTint: "#aaf0ff",
                    opacity: 0.95,
                  },
                },
                localPosition: [18, 2, 110],
                localRotation: [Math.PI / 2, 0, 0],
              },
              {
                geometry: {
                  type: "cylinder",
                  params: { radius: 6, height: 14 },
                },
                material: {
                  type: "liquid",
                  params: {
                    baseColor: "#5fd4ff",
                    depthTint: "#aaf0ff",
                    opacity: 0.95,
                  },
                },
                localPosition: [-18, 2, 110],
                localRotation: [Math.PI / 2, 0, 0],
              },
              // red/orange running lights along edges
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 1, lengthZ: 12 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#ff6633",
                    opacity: 0.9,
                  },
                },
                localPosition: [38, 4, -40],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 1, lengthZ: 12 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#ff6633",
                    opacity: 0.9,
                  },
                },
                localPosition: [-38, 4, -40],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 1, lengthZ: 12 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#ff5b2a",
                    opacity: 0.9,
                  },
                },
                localPosition: [34, 4, 0],
              },
              {
                geometry: {
                  type: "box",
                  params: { lengthX: 1, lengthY: 1, lengthZ: 12 },
                },
                material: {
                  type: "solid",
                  params: {
                    color: "#ff5b2a",
                    opacity: 0.9,
                  },
                },
                localPosition: [-34, 4, 0],
              },
            ],
          },
        ],
      },
    },
    // STATIC: dreadnought itself does not move
    MotionSource: {
      type: "static",
      params: {},
    },
    Health: { value: 1500 },
    Faction: { id: ENEMY_FACTION },
    AI: { isAggressive: true, awarenessRange: 700 },
    // Hull no longer fires directly; heavy turrets mounted on deck handle all weapons
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Layout & positions
// ─────────────────────────────────────────────────────────────────────────────

const shipPositions = [];

const recordShipPos = (x, y, z) => {
  shipPositions.push({ x, y, z });
};

// Friendly corvette at center of friendly arc
const corvettePos = { x: 0, y: 0, z: 80 };
recordShipPos(corvettePos.x, corvettePos.y, corvettePos.z);

// Friendly cruisers in a defensive arc around the corvette
const cruiserRadius = 70;
const cruiserAngles = [-0.6, 0, 0.6]; // radians offset in XZ plane
const cruiserPositions = cruiserAngles.map((angle) => {
  const x = corvettePos.x + Math.sin(angle) * cruiserRadius;
  const z = corvettePos.z + Math.cos(angle) * cruiserRadius;
  const y = 10 * Math.sin(angle * 0.8); // slight vertical staggering
  recordShipPos(x, y, z);
  return { x, y, z, angle };
});

// Player starfighter slightly ahead of friendly formation, facing towards enemy (-Z)
const playerPos = { x: 0, y: 0, z: 40 };
recordShipPos(playerPos.x, playerPos.y, playerPos.z);

// Enemy capital ship far forward, tip of spearhead
const capitalPos = { x: 0, y: 0, z: -220 };
recordShipPos(capitalPos.x, capitalPos.y, capitalPos.z);

// Enemy fighter squadrons in wedge formation behind and around capital
const fighterSquadrons = [];
const squadCount = 4;
const squadSizeBase = 5;
const wedgeSpread = 60;
const wedgeDepth = 80;
for (let i = 0; i < squadCount; i++) {
  const t = i / (squadCount - 1 || 1) - 0.5;
  const offsetX = t * wedgeSpread;
  const offsetZ = capitalPos.z + (i + 1) * 0.25 * wedgeDepth;
  const offsetY = (i - 1.5) * 6;
  const center = { x: offsetX, y: offsetY, z: offsetZ };
  fighterSquadrons.push(center);
  recordShipPos(center.x, center.y, center.z);
}

// ─────────────────────────────────────────────────────────────────────────────
// Invisible collision plane for pathfinding & AI stability
// ─────────────────────────────────────────────────────────────────────────────
spawn({
  Info: { name: "Space Navigation Plane" },
  Transform: { x: 0, y: -40, z: 0 },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: {
            type: "box",
            params: {
              lengthX: 200,
              lengthY: 5,
              lengthZ: 200,
              pivot: "center",
            },
          },
          material: {
            type: "solid",
            params: {
              color: "#c3c7d6",
              metalness: 0.6,
              roughness: 0.4,
              opacity: 0.0001,
            },
          }, // invisible but collidable
        },
      ],
    },
  },
  MotionSource: { type: "static", params: {} },
});

// ─────────────────────────────────────────────────────────────────────────────
// Spawn fleets
// ─────────────────────────────────────────────────────────────────────────────

// Enemy capital ship (static hull)
spawn("enemy_capital_ship", {
  Transform: {
    x: capitalPos.x,
    y: capitalPos.y,
    z: capitalPos.z,
    // Face roughly toward friendly fleet (+Z)
    ry: Math.PI,
  },
});

// Enemy capital ship turrets mounted on the hull
const capitalTurretOffsets = [
  { x: 30, y: 20, z: -60 },
  { x: -30, y: 20, z: -60 },
  { x: 24, y: 22, z: 0 },
  { x: -24, y: 22, z: 0 },
  { x: 18, y: 18, z: 60 },
  { x: -18, y: 18, z: 60 },
];
capitalTurretOffsets.forEach((o) => {
  spawn("enemy_heavy_turret", {
    Transform: {
      x: capitalPos.x + o.x,
      y: capitalPos.y + o.y,
      z: capitalPos.z + o.z,
      ry: Math.PI, // barrels facing toward friendly fleet
    },
  });
});

// Enemy fighter squadrons – 4–6 fighters each
fighterSquadrons.forEach((center, squadIdx) => {
  const fightersInSquad = squadSizeBase + (squadIdx % 2);
  for (let i = 0; i < fightersInSquad; i++) {
    const spreadRadius = 10;
    const angle = (i / fightersInSquad) * Math.PI * 2;
    const x = center.x + Math.cos(angle) * spreadRadius * 0.6;
    const y = center.y + (Math.random() - 0.5) * 6;
    const z = center.z + Math.sin(angle) * spreadRadius;
    spawn("enemy_fighter", {
      Transform: {
        x,
        y,
        z,
        ry: Math.PI, // face toward +Z (towards friendlies)
      },
    });
  }
});

// Friendly corvette (mobile escort)
spawn("friendly_corvette", {
  Transform: { x: corvettePos.x, y: corvettePos.y, z: corvettePos.z },
});

// Friendly support cruisers in formation (STATIC hulls + firing turrets)
const cruiserTurretOffsets = [
  { x: 0, y: 4, z: -14 }, // bow turret
  { x: 3.5, y: 4, z: -4 }, // starboard mid
  { x: -3.5, y: 4, z: -4 }, // port mid
];

cruiserPositions.forEach((pos) => {
  const facingAngle = Math.atan2(pos.x - corvettePos.x, pos.z - corvettePos.z);
  // Static cruiser hull
  spawn("friendly_cruiser", {
    Transform: {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      ry: facingAngle,
    },
  });

  // Turrets mounted "on deck" of the cruiser
  const sinA = Math.sin(facingAngle);
  const cosA = Math.cos(facingAngle);
  cruiserTurretOffsets.forEach((o) => {
    const rx = o.x * cosA + o.z * sinA;
    const rz = -o.x * sinA + o.z * cosA;
    spawn("friendly_turret", {
      Transform: {
        x: pos.x + rx,
        y: pos.y + o.y,
        z: pos.z + rz,
        ry: facingAngle, // barrels generally aligned with cruiser heading
      },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Player starfighter (single player entity)
// ─────────────────────────────────────────────────────────────────────────────
spawn("player", {
  Transform: {
    x: playerPos.x,
    y: playerPos.y,
    z: playerPos.z,
    ry: 0, // facing -Z by default
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          tag: "hull",
          geometry: {
            type: "box",
            params: {
              lengthX: 2.6,
              lengthY: 1.0,
              lengthZ: 5.0,
              pivot: "center",
            },
          },
          material: {
            type: "solid",
            params: {
              color: "#c3c7d6",
              metalness: 0.6,
              roughness: 0.4,
            },
          },
          children: [
            // nose
            {
              geometry: {
                type: "pyramid",
                params: {
                  width: 1.4,
                  height: 1.6,
                  depth: 3,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: {
                  color: "#d5d8e6",
                  metalness: 0.8,
                  roughness: 0.3,
                },
              },
              localPosition: [0, 0.5, -2.5],
              localRotation: [Math.PI, 0, 0],
            },
            // cockpit canopy
            {
              geometry: {
                type: "hemisphere",
                params: {
                  radius: 0.9,
                  pivot: "bottom",
                },
              },
              material: {
                type: "solid",
                params: {
                  color: "#4a86b8",
                  opacity: 0.8,
                },
              },
              localPosition: [0, 0.9, -0.7],
            },
            // wings
            {
              geometry: {
                type: "box",
                params: { lengthX: 4.2, lengthY: 0.15, lengthZ: 1.6 },
              },
              material: {
                type: "solid",
                params: {
                  color: "#b2b6c4",
                },
              },
              localPosition: [0, -0.3, 0.5],
            },
            // engine pods
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.55, height: 1.4 },
              },
              material: {
                type: "solid",
                params: {
                  color: "#70747e",
                },
              },
              localPosition: [0.9, -0.2, 2.0],
              localRotation: [Math.PI / 2, 0, 0],
            },
            {
              geometry: {
                type: "cylinder",
                params: { radius: 0.55, height: 1.4 },
              },
              material: {
                type: "solid",
                params: {
                  color: "#70747e",
                },
              },
              localPosition: [-0.9, -0.2, 2.0],
              localRotation: [Math.PI / 2, 0, 0],
            },
            // engine glow
            {
              geometry: {
                type: "sphere",
                params: { radius: 0.55 },
              },
              material: {
                type: "liquid",
                params: {
                  baseColor: "#5fd4ff",
                  depthTint: "#aaf0ff",
                  opacity: 0.95,
                },
              },
              localPosition: [0.9, -0.2, 2.8],
            },
            {
              geometry: {
                type: "sphere",
                params: { radius: 0.55 },
              },
              material: {
                type: "liquid",
                params: {
                  baseColor: "#5fd4ff",
                  depthTint: "#aaf0ff",
                  opacity: 0.95,
                },
              },
              localPosition: [-0.9, -0.2, 2.8],
            },
            // spawn anchor at nose for weapons
            {
              tag: "spawnAnchor",
              geometry: { type: "none" },
              localPosition: [0, 0, -3.0],
            },
          ],
        },
      ],
    },
  },
  MotionSource: {
    type: "characterController",
    params: {
      speed: 45,
      jumpHeight: 0,
      canFly: true,
    },
  },
  Faction: { id: PLAYER_FACTION },
  Inventory: {
    size: 2,
    items: [],
    selectedItemIndex: -1,
  },
    Rules: [{ trigger: { type: 'primaryAction' }, cooldown: 0.18, actions: [
      {
        type: "spawnEntityFrom",
        target: "self",
        params: {
          entity: "bolt_blue",
          velocity: 220,
        },
      },
    ] }, { trigger: { type: 'secondaryAction' }, cooldown: 3.0, actions: [
      {
        type: "spawnEntityFrom",
        target: "self",
        params: { entity: "player_rocket", velocity: 160 },
      },
      {
        type: "spawnEntityFrom",
        target: "self",
        params: { entity: "player_rocket", velocity: 160 },
      },
    ] }],
  Health: { value: 100, max: 100 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Asteroid field – procedurally scattered between fleets
// ─────────────────────────────────────────────────────────────────────────────
const isNearShip = (x, y, z, minDist) => {
  for (let i = 0; i < shipPositions.length; i++) {
    const s = shipPositions[i];
    const dx = x - s.x;
    const dy = y - s.y;
    const dz = z - s.z;
    if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
  }
  return false;
};

const asteroidCount = 120;
const midYRange = 70;
const midXRange = 180;
const minZ = capitalPos.z + 40; // slightly ahead of capital
const maxZ = corvettePos.z - 20; // slightly in front of friendlies

for (let i = 0; i < asteroidCount; i++) {
  const x = (Math.random() - 0.5) * 2 * midXRange;
  const y = (Math.random() - 0.5) * 2 * midYRange;
  const z = minZ + Math.random() * (maxZ - minZ);

  // avoid spawning too close to ships
  if (isNearShip(x, y, z, 30)) {
    continue;
  }

  const r = Math.random();
  let type = "asteroid_small";
  if (r > 0.7 && r <= 0.95) type = "asteroid_medium";
  else if (r > 0.95) type = "asteroid_large";

  const rotY = Math.random() * Math.PI * 2;
  const s = 0.7 + Math.random() * 1.4;

  spawn(type, {
    Transform: {
      x,
      y,
      z,
      ry: rotY,
      sx: s,
      sy: s,
      sz: s,
    },
  });
}
},
};
