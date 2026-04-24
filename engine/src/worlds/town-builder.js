export default {
  setupScene(api) {
    const { initialize, registerArchetype, spawn } = api;

    initialize({
      title: 'Town Builder',
      description:
        'Lay out plazas, timber cabins, markets, walls, fountains, and lamps across a finished valley foundation. Interact with any placed build to delete it and iterate quickly.',
      tags: ['builder', 'demo', 'spawning', 'production-ready', 'delete', 'town'],
      brandColors: ['#f0a868', '#2a4b7c', '#1b263b'],
      dimensions: [
        {
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: true,
          sky: {
            color: '#b8d8ff',
            sun: { color: '#ffe3a3', intensity: 1.05, timeOfDay: 1430 },
            clouds: { color: '#ffffff', coverage: 0.3 },
            stars: { intensity: 0.08 },
          },
        },
      ],
    });

    registerArchetype('builder_foundation', {
      Info: { name: 'Valley Base' },
      Transform: { y: -1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 180, lengthY: 1, lengthZ: 180, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#d7d3c8', roughness: 0.95 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 70, lengthY: 0.4, lengthZ: 70, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#c9b38a', roughness: 0.7 } },
              localPosition: [0, 0.5, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 180, lengthY: 0.1, lengthZ: 32, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#92b7d9', roughness: 0.3 } },
              localPosition: [0, 0.9, -74],
            },
            {
              geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.4, lengthZ: 180, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#b8b4a6', roughness: 0.85 } },
              localPosition: [-55, 0.6, 0],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('builder_cabin', {
      Info: { name: 'Timber Cabin', description: 'Compact starter home with a stone base and chimney. Interact to remove.' },
      Transform: { y: 0.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 5.5, lengthY: 0.5, lengthZ: 4.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#8a7b63', roughness: 0.95 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 5, lengthY: 3.2, lengthZ: 4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#c48a53', roughness: 0.65 } },
              localPosition: [0, 0.5, 0],
            },
            {
              geometry: { type: 'cone', params: { radius: 3.3, height: 2.8, radialSegments: 4, heightSegments: 1 } },
              material: { type: 'solid', params: { color: '#6c4328', roughness: 0.55 } },
              localPosition: [0, 3.7, 0],
              localRotation: [0, Math.PI / 4, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 1.6, lengthZ: 0.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#545b64' } },
              localPosition: [2.2, 0.5, -1.2],
            },
            {
              geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 2.1, lengthZ: 0.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#2f251d' } },
              localPosition: [0, 0.5, 2.1],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_hall', {
      Info: { name: 'Guild Hall', description: 'Two-story communal structure with broad rooflines. Interact to remove.' },
      Transform: { y: 1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.6, lengthZ: 10, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#a38b6f', roughness: 0.9 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 7.4, lengthY: 4.2, lengthZ: 9.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#c4a484', roughness: 0.6 } },
              localPosition: [0, 0.6, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 7.4, lengthY: 2.2, lengthZ: 9.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#d8c9a5', roughness: 0.5 } },
              localPosition: [0, 3.4, 0],
            },
            {
              geometry: { type: 'cone', params: { radius: 7.6, height: 3.4, radialSegments: 4, heightSegments: 1 } },
              material: { type: 'solid', params: { color: '#4f3626', roughness: 0.5 } },
              localPosition: [0, 5.6, 0],
              localRotation: [0, Math.PI / 4, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 3.2, lengthZ: 0.3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#2d1f1a' } },
              localPosition: [0, 0.6, 5],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_watchtower', {
      Info: { name: 'Watch Tower', description: 'Tall lookout point for skyline silhouettes. Interact to remove.' },
      Transform: { y: 1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 3.2, lengthY: 10, lengthZ: 3.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#6d7b8c', roughness: 0.38 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 4.6, lengthY: 0.6, lengthZ: 4.6 } },
              material: { type: 'solid', params: { color: '#364152', roughness: 0.3 } },
              localPosition: [0, 10.6, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 3, lengthY: 2, lengthZ: 3 } },
              material: { type: 'solid', params: { color: '#c6ccd8', roughness: 0.45 } },
              localPosition: [0, 11.6, 0],
            },
            {
              geometry: { type: 'cylinder', params: { radius: 1.4, height: 2, radialSegments: 6, heightSegments: 1 } },
              material: { type: 'solid', params: { color: '#2d3748', roughness: 0.25 } },
              localPosition: [0, 13.6, 0],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_tree', {
      Info: { name: 'Valley Tree', description: 'Interact to remove.' },
      Transform: { y: 2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.6, height: 4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7a5a3c' } } },
            { geometry: { type: 'sphere', params: { radius: 2.4 } }, material: { type: 'solid', params: { color: '#3b6e46' } }, localPosition: [0, 4, 0] },
            { geometry: { type: 'sphere', params: { radius: 2 } }, material: { type: 'solid', params: { color: '#2f5c3a' } }, localPosition: [1.5, 5, 0.5] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_plaza_marker', {
      Info: { name: 'Plaza Marker', description: 'Flat paver for plazas. Interact to remove.' },
      Transform: { y: 0.1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.2, lengthZ: 2.4 } }, material: { type: 'solid', params: { color: '#e3dccf', roughness: 0.6 } } },
            { geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.05, lengthZ: 0.5 } }, material: { type: 'solid', params: { color: '#c0b59c', roughness: 0.3 } }, localPosition: [0, 0.15, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_road', {
      Info: { name: 'Stone Road', description: 'Wide stone lane for gridded towns. Interact to remove.' },
      Transform: { y: 0.12 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.2, lengthZ: 4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#b6b2a6', roughness: 0.65 } } },
            { geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.04, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#8f8b7f', roughness: 0.4 } }, localPosition: [0, 0.2, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_wall', {
      Info: { name: 'Stone Wall', description: 'Low defensive wall with capstone. Interact to remove.' },
      Transform: { y: 0.6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 8, lengthY: 1.2, lengthZ: 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#8b8f99', roughness: 0.6 } } },
            { geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.25, lengthZ: 0.9 } }, material: { type: 'solid', params: { color: '#cdd2d9', roughness: 0.35 } }, localPosition: [0, 1.2, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_gate', {
      Info: { name: 'Town Gate', description: 'Arched gate for entries. Interact to remove.' },
      Transform: { y: 0.8 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 6, lengthY: 0.8, lengthZ: 1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#9aa0aa', roughness: 0.55 } } },
            { geometry: { type: 'box', params: { lengthX: 6, lengthY: 2.6, lengthZ: 0.6, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#80858f', roughness: 0.5 } }, localPosition: [0, 0.8, 0] },
            { geometry: { type: 'box', params: { lengthX: 6, lengthY: 0.6, lengthZ: 1.2 } }, material: { type: 'solid', params: { color: '#cdd2d9', roughness: 0.35 } }, localPosition: [0, 3.4, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_market', {
      Info: { name: 'Market Stall', description: 'Colorful vendor stall. Interact to remove.' },
      Transform: { y: 0.8 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 4, lengthY: 0.4, lengthZ: 2.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#8a5c32', roughness: 0.7 } } },
            { geometry: { type: 'box', params: { lengthX: 3.8, lengthY: 1.6, lengthZ: 2.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#c77c4f', roughness: 0.5 } }, localPosition: [0, 0.4, 0] },
            { geometry: { type: 'box', params: { lengthX: 4.2, lengthY: 0.3, lengthZ: 2.5 } }, material: { type: 'solid', params: { color: '#e9c172', roughness: 0.35 } }, localPosition: [0, 2, 0] },
            { geometry: { type: 'box', params: { lengthX: 4.2, lengthY: 0.2, lengthZ: 0.3 } }, material: { type: 'solid', params: { color: '#f25d50' } }, localPosition: [0, 2.2, 1.1] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_fountain', {
      Info: { name: 'Stone Fountain', description: 'Centerpiece with basin. Interact to remove.' },
      Transform: { y: 0.2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 2.4, height: 0.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#c9d4e0', roughness: 0.35 } } },
            { geometry: { type: 'cylinder', params: { radius: 1.6, height: 0.3, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#9fb0c1', roughness: 0.3 } }, localPosition: [0, 0.5, 0] },
            { geometry: { type: 'cylinder', params: { radius: 0.6, height: 1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7a8ba0', roughness: 0.3 } }, localPosition: [0, 0.8, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_lamp', {
      Info: { name: 'Bronze Lamp', description: 'Path lamp with warm glow. Interact to remove.' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.2, height: 2.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3a3128', roughness: 0.6 } } },
            { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.8, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#ffdc8a', emissive: 0.9 } }, localPosition: [0, 2.4, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    registerArchetype('builder_garden', {
      Info: { name: 'Planter Bench', description: 'Planter box with seating. Interact to remove.' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 4, lengthY: 0.6, lengthZ: 2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6f4c2d', roughness: 0.65 } } },
            { geometry: { type: 'box', params: { lengthX: 3.6, lengthY: 0.4, lengthZ: 1.6 } }, material: { type: 'solid', params: { color: '#4d3221', roughness: 0.7 } }, localPosition: [0, 0.6, 0] },
            { geometry: { type: 'sphere', params: { radius: 0.6 } }, material: { type: 'solid', params: { color: '#3f7b45' } }, localPosition: [-1, 0.9, 0] },
            { geometry: { type: 'sphere', params: { radius: 0.6 } }, material: { type: 'solid', params: { color: '#438a52' } }, localPosition: [1, 0.9, 0.2] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'kill', params: {}, target: 'self' }] }],
    });

    const toolBody = (color) => ({
      type: 'composite',
      params: {
        parts: [
          { geometry: { type: 'box', params: { lengthX: 0.22, lengthY: 0.22, lengthZ: 0.9 } }, material: { type: 'solid', params: { color } } },
          { geometry: { type: 'box', params: { lengthX: 0.14, lengthY: 0.14, lengthZ: 0.44 } }, material: { type: 'solid', params: { color: '#cfd2d8' } }, localPosition: [0, 0, 0.64] },
        ],
      },
    });

    const toolMotion = { type: 'dynamicRigidBody', params: { mass: 1 } };

    registerArchetype('builder_tool_road', {
      Info: { name: 'Tool: Road', description: 'Primary: place stone road tiles.' },
      Transform: { y: 1 },
      Body: toolBody('#374151'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.2, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_road' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: road tile.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_lamp', {
      Info: { name: 'Tool: Lamp', description: 'Primary: place bronze lamps.' },
      Transform: { y: 1 },
      Body: toolBody('#8b5a2b'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.25, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_lamp' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: lamp post.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_cabin', {
      Info: { name: 'Tool: Cabin', description: 'Primary: place timber cabin.' },
      Transform: { y: 1 },
      Body: toolBody('#8a7b63'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.35, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_cabin' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: cabin.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_plaza', {
      Info: { name: 'Tool: Plaza', description: 'Primary: place plaza pavers.' },
      Transform: { y: 1 },
      Body: toolBody('#c0b59c'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.25, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_plaza_marker' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: plaza paver.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_hall', {
      Info: { name: 'Tool: Hall', description: 'Primary: place guild halls.' },
      Transform: { y: 1 },
      Body: toolBody('#a38b6f'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.6, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_hall' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: hall.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_tower', {
      Info: { name: 'Tool: Tower', description: 'Primary: place watch towers.' },
      Transform: { y: 1 },
      Body: toolBody('#6d7b8c'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.6, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_watchtower' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: tower.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_market', {
      Info: { name: 'Tool: Market', description: 'Primary: place market stalls.' },
      Transform: { y: 1 },
      Body: toolBody('#c77c4f'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.45, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_market' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: market stall.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_fountain', {
      Info: { name: 'Tool: Fountain', description: 'Primary: place fountains.' },
      Transform: { y: 1 },
      Body: toolBody('#7a8ba0'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.45, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_fountain' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: fountain.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_wall', {
      Info: { name: 'Tool: Wall', description: 'Primary: place walls.' },
      Transform: { y: 1 },
      Body: toolBody('#8b8f99'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.35, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_wall' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: wall.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_gate', {
      Info: { name: 'Tool: Gate', description: 'Primary: place town gates.' },
      Transform: { y: 1 },
      Body: toolBody('#9aa0aa'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.45, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_gate' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: gate.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_garden', {
      Info: { name: 'Tool: Garden', description: 'Primary: place planter benches.' },
      Transform: { y: 1 },
      Body: toolBody('#6f4c2d'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.3, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_garden' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: garden bench.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_tool_tree', {
      Info: { name: 'Tool: Tree', description: 'Primary: place valley trees.' },
      Transform: { y: 1 },
      Body: toolBody('#2f5c3a'),
      MotionSource: toolMotion,
            Rules: [{ trigger: { type: 'primaryAction', params: { range: 45 } }, cooldown: 0.3, actions: [{ type: 'spawnAtHit', params: { entity: 'builder_tree' }, target: 'self', range: 45 }] }, { trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
          { type: 'popup', params: { text: 'Primary: tree.' }, target: 'user' },
        ] }],
    });

    registerArchetype('builder_sign', {
      Info: { name: 'Builder Notes' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 2, lengthY: 1.2, lengthZ: 0.1 } },
              material: { type: 'solid', params: { color: '#ede9e0' } },
              localPosition: [0, 1.3, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 2.6, lengthZ: 0.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#8b5e3c' } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'popup',
            params: {
              text:
                'Pick up a tool to place that exact build: road, lamp, cabin, plaza, hall, tower, market, fountain, wall, gate, garden, tree. Interact placed builds to delete. Use the waterline and stripe as guides.',
            },
            target: 'other',
          },
        ] }],
    });

    spawn('builder_foundation');
    spawn('builder_sign', { Transform: { x: -10, y: 0, z: -8 } });

    const treePositions = [
      [-30, 0, -40],
      [-40, 0, -50],
      [32, 0, -42],
      [46, 0, 38],
      [-50, 0, 30],
    ];

    for (const [x, y, z] of treePositions) {
      spawn('builder_tree', { Transform: { x, y, z } });
    }

    spawn('builder_cabin', { Transform: { x: 8, y: 0, z: 8 } });
    spawn('builder_hall', { Transform: { x: -16, y: 0, z: 14 } });
    spawn('builder_watchtower', { Transform: { x: 20, y: 0, z: -14 } });
    spawn('builder_road', { Transform: { x: 0, y: 0, z: 0 } });
    spawn('builder_road', { Transform: { x: 8, y: 0, z: 0 } });
    spawn('builder_wall', { Transform: { x: -12, y: 0, z: -6 } });
    spawn('builder_gate', { Transform: { x: -12, y: 0, z: -2 } });
    spawn('builder_market', { Transform: { x: 6, y: 0, z: -10 } });
    spawn('builder_fountain', { Transform: { x: 0, y: 0, z: -12 } });
    spawn('builder_lamp', { Transform: { x: 4, y: 0, z: -2 } });
    spawn('builder_garden', { Transform: { x: -6, y: 0, z: -4 } });

    const toolRow = [
      'builder_tool_road',
      'builder_tool_lamp',
      'builder_tool_cabin',
      'builder_tool_plaza',
      'builder_tool_hall',
      'builder_tool_tower',
      'builder_tool_market',
      'builder_tool_fountain',
      'builder_tool_wall',
      'builder_tool_gate',
      'builder_tool_garden',
      'builder_tool_tree',
    ];

    toolRow.forEach((tool, index) => {
      spawn(tool, { Transform: { x: -6 + index * 1.2, y: 1.2, z: -6 } });
    });

    spawn('player', { Transform: { x: 0, y: 2, z: 10 } });
  },
};
