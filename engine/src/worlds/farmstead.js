export default {
  setupScene(api) {
    const { initialize, registerArchetype, spawn } = api;

    initialize({
      title: 'Farmstead Growth Demo',
      description: 'A fully built farm with irrigated rows, orchards, greenhouse beds, livestock yard, and multi-stage crops you can plant, water, and harvest for bundles.',
      tags: ['farming', 'timers', 'effects', 'production-ready', 'progression', 'economy'],
      brandColors: ['#4d7a3a', '#f0c36d', '#5d3b26'],
      dimensions: [
        {
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: true,
          sky: {
            color: '#a9dfff',
            sun: { color: '#ffe7c2', intensity: 1, timeOfDay: 930 },
            clouds: { color: '#f6fbff', coverage: 0.35 },
            stars: { intensity: 0.08 },
          },
        },
      ],
    });

    registerArchetype('farmstead_ground', {
      Info: { name: 'Homestead Plot' },
      Transform: { y: -1.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 140, lengthY: 1, lengthZ: 140, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#c7b299' } } },
            { geometry: { type: 'box', params: { lengthX: 96, lengthY: 0.6, lengthZ: 60, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6a8a4b', roughness: 0.9 } }, localPosition: [0, 0.9, 0] },
            { geometry: { type: 'box', params: { lengthX: 50, lengthY: 0.4, lengthZ: 80, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7b654a', roughness: 0.7 } }, localPosition: [0, 0.7, -4] },
            { geometry: { type: 'box', params: { lengthX: 96, lengthY: 0.25, lengthZ: 8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#bba37a', roughness: 0.45 } }, localPosition: [0, 0.95, 36] },
            { geometry: { type: 'box', params: { lengthX: 8, lengthY: 0.35, lengthZ: 96, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#bba37a', roughness: 0.45 } }, localPosition: [36, 0.95, 0] },
            { geometry: { type: 'box', params: { lengthX: 140, lengthY: 0.15, lengthZ: 10, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7da0c3', roughness: 0.25 } }, localPosition: [0, 1, -60] },
            { geometry: { type: 'box', params: { lengthX: 36, lengthY: 0.2, lengthZ: 12, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#a6b8c7', roughness: 0.2 } }, localPosition: [-24, 1, 26] },
            { geometry: { type: 'box', params: { lengthX: 36, lengthY: 0.2, lengthZ: 12, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#9fb0c1', roughness: 0.2 } }, localPosition: [24, 1, 26] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_fence', {
      Info: { name: 'Fence Rail' },
      Transform: { y: 0.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 6, lengthY: 0.2, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#6b4a2b', roughness: 0.7 } } },
            { geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 1.2, lengthZ: 0.3 } }, material: { type: 'solid', params: { color: '#5a3c1f', roughness: 0.8 } }, localPosition: [-2.8, -0.5, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 1.2, lengthZ: 0.3 } }, material: { type: 'solid', params: { color: '#5a3c1f', roughness: 0.8 } }, localPosition: [2.8, -0.5, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_lantern', {
      Info: { name: 'Path Lantern' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.2, height: 2.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3b3b3b', roughness: 0.6 } } },
            { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#ffd27f', emissive: 0.9 } }, localPosition: [0, 2, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_well', {
      Info: { name: 'Water Well', description: 'Draw water to hurry irrigation.' },
      Transform: { y: 0.4 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 1.2, height: 1.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#8aa2b8', roughness: 0.35 } } },
            { geometry: { type: 'cylinder', params: { radius: 1.25, height: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#415a6b', roughness: 0.5 } }, localPosition: [0, 1.2, 0] },
            { geometry: { type: 'box', params: { lengthX: 2.6, lengthY: 0.3, lengthZ: 0.3 } }, material: { type: 'solid', params: { color: '#61422c', roughness: 0.5 } }, localPosition: [0, 2, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 2, lengthZ: 0.25 } }, material: { type: 'solid', params: { color: '#6f5238', roughness: 0.5 } }, localPosition: [-1.2, 0.9, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 2, lengthZ: 0.25 } }, material: { type: 'solid', params: { color: '#6f5238', roughness: 0.5 } }, localPosition: [1.2, 0.9, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, cooldown: 3, actions: [
          {
            type: 'popup',
            params: { text: 'You pull up fresh water. Irrigated plots grow faster; splash nearby crops to roleplay watering.' },
            target: 'other',
          },
          { type: 'spawnEntityFrom', params: { entity: 'farm_water_bucket' }, target: 'self' },
        ] }],
    });

    registerArchetype('farm_water_bucket', {
      Info: { name: 'Water Bucket', description: 'Pickup to simulate watering.' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.3, height: 0.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b8ba4' } } },
            { geometry: { type: 'torus', params: { majorRadius: 0.35, minorRadius: 0.05 } }, material: { type: 'solid', params: { color: '#3f566b' } }, localPosition: [0, 0.5, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.4 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('farm_compost', {
      Info: { name: 'Compost Bin', description: 'Fertilize your crops.' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2, lengthY: 1, lengthZ: 2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4b3321', roughness: 0.8 } } },
            { geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.3, lengthZ: 1.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2e241c', roughness: 0.6 } }, localPosition: [0, 1, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, cooldown: 3, actions: [
          {
            type: 'popup',
            params: { text: 'You scoop rich compost. Drop it near seedlings to roleplay boosted yields.' },
            target: 'other',
          },
          { type: 'spawnEntityFrom', params: { entity: 'farm_fertilizer' }, target: 'self' },
        ] }],
    });

    registerArchetype('farm_fertilizer', {
      Info: { name: 'Fertilizer Scoop' },
      Transform: { y: 0.25 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.2, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#c3a15b' } } },
            { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.1, lengthZ: 0.4 } }, material: { type: 'solid', params: { color: '#9a7a3c' } }, localPosition: [0, 0.2, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.25 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('farm_sign', {
      Info: { name: 'Farm Instructions' },
      Transform: { y: 0.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.8, lengthZ: 0.1 } }, material: { type: 'solid', params: { color: '#3e2723' } } },
            { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.6, lengthZ: 0.08 } }, material: { type: 'solid', params: { color: '#f7f0e8' } }, localPosition: [0, 0.02, 0.05] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'popup',
            params: {
              text: 'Welcome! Start with the tan soil plots for grains. Then try irrigated corn rows, herb beds, greenhouse veggies, orchard saplings, vineyard trellises, and the pumpkin patch. Use the well for water, compost for fertilizer, and sell bundles at the market cart.',
            },
            target: 'other',
          },
        ] }],
    });

    registerArchetype('farm_market', {
      Info: { name: 'Farm Market Cart' },
      Transform: { y: 0.6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 4, lengthY: 0.4, lengthZ: 2 } }, material: { type: 'solid', params: { color: '#91552b', roughness: 0.65 } } },
            { geometry: { type: 'box', params: { lengthX: 3.8, lengthY: 1.1, lengthZ: 1.8 } }, material: { type: 'solid', params: { color: '#c57f3b', roughness: 0.6 } }, localPosition: [0, 0.6, 0] },
            { geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.6, radialSegments: 12 } }, material: { type: 'solid', params: { color: '#2d1f1a', roughness: 0.7 } }, localPosition: [-1.4, -0.1, 1.1], localRotation: [Math.PI / 2, 0, 0] },
            { geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.6, radialSegments: 12 } }, material: { type: 'solid', params: { color: '#2d1f1a', roughness: 0.7 } }, localPosition: [-1.4, -0.1, -1.1], localRotation: [Math.PI / 2, 0, 0] },
            { geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.6, radialSegments: 12 } }, material: { type: 'solid', params: { color: '#2d1f1a', roughness: 0.7 } }, localPosition: [1.4, -0.1, 1.1], localRotation: [Math.PI / 2, 0, 0] },
            { geometry: { type: 'cylinder', params: { radius: 0.6, height: 0.6, radialSegments: 12 } }, material: { type: 'solid', params: { color: '#2d1f1a', roughness: 0.7 } }, localPosition: [1.4, -0.1, -1.1], localRotation: [Math.PI / 2, 0, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'popup',
            params: { text: 'Deliver harvest bundles here to “sell” them. Imagine this earns coins to expand your farm.' },
            target: 'other',
          },
        ] }],
    });

    registerArchetype('farm_greenhouse', {
      Info: { name: 'Glass Greenhouse' },
      Transform: { y: 0.6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 12, lengthY: 0.6, lengthZ: 8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7b5a35', roughness: 0.75 } } },
            { geometry: { type: 'box', params: { lengthX: 11, lengthY: 4.5, lengthZ: 7, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#c9e6ff', roughness: 0.15, metalness: 0.05 } }, localPosition: [0, 0.6, 0] },
            { geometry: { type: 'box', params: { lengthX: 12, lengthY: 1.2, lengthZ: 8 } }, material: { type: 'solid', params: { color: '#b7d7f2', roughness: 0.2 } }, localPosition: [0, 5, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_windmill', {
      Info: { name: 'Windmill' },
      Transform: { y: 1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 1.3, height: 8, radialSegments: 8, heightSegments: 1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d8c8b0', roughness: 0.55 } } },
            { geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 6, lengthZ: 0.3, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5f5144' } }, localPosition: [0, 4, 1.6] },
            { geometry: { type: 'box', params: { lengthX: 5, lengthY: 0.4, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#f7eedc' } }, localPosition: [0, 9, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.4, lengthZ: 5 } }, material: { type: 'solid', params: { color: '#f7eedc' } }, localPosition: [0, 9, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_barn', {
      Info: { name: 'Barn' },
      Transform: { y: 1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 10, lengthY: 1, lengthZ: 12, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#8b5a2b', roughness: 0.85 } } },
            { geometry: { type: 'box', params: { lengthX: 9, lengthY: 4, lengthZ: 11, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#b5651d', roughness: 0.6 } }, localPosition: [0, 1, 0] },
            { geometry: { type: 'cone', params: { radius: 9.2, height: 3, radialSegments: 4, heightSegments: 1 } }, material: { type: 'solid', params: { color: '#5c2c0c', roughness: 0.45 } }, localPosition: [0, 5, 0], localRotation: [0, Math.PI / 4, 0] },
            { geometry: { type: 'box', params: { lengthX: 3, lengthY: 3.5, lengthZ: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2d1f1a' } }, localPosition: [0, 1, 6] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_silo', {
      Info: { name: 'Grain Silo' },
      Transform: { y: 0.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 2, height: 7, radialSegments: 12, heightSegments: 1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#c0c6cf', roughness: 0.3 } } },
            { geometry: { type: 'cone', params: { radius: 2.1, height: 1.8, radialSegments: 12, heightSegments: 1 } }, material: { type: 'solid', params: { color: '#6f7b8a', roughness: 0.35 } }, localPosition: [0, 7, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    registerArchetype('farm_plot', {
      Info: { name: 'Soil Plot', description: 'Interact to plant a grain seedling.' },
      Transform: { y: 0.05 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2, lengthY: 0.1, lengthZ: 2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5b3a29', roughness: 0.8 } } },
            { geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.05, lengthZ: 0.4 } }, material: { type: 'solid', params: { color: '#6c4635', roughness: 0.4 } }, localPosition: [0, 0.1, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, cooldown: 0, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_wheat_seed' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('farm_irrigated_plot', {
      Info: { name: 'Irrigated Plot', description: 'Corn thrives when planted here.' },
      Transform: { y: 0.08 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.1, lengthZ: 2.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3e2a1d', roughness: 0.85 } } },
            { geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.05, lengthZ: 0.3 } }, material: { type: 'solid', params: { color: '#4e3a2d', roughness: 0.65 } }, localPosition: [0, 0.1, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_corn_seed' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('farm_greenhouse_bed', {
      Info: { name: 'Greenhouse Bed', description: 'Moist raised soil for tomatoes.' },
      Transform: { y: 0.15 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.25, lengthZ: 1.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5c3d2b', roughness: 0.85 } } },
            { geometry: { type: 'box', params: { lengthX: 2.1, lengthY: 0.05, lengthZ: 1 } }, material: { type: 'solid', params: { color: '#6c4a36', roughness: 0.6 } }, localPosition: [0, 0.25, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_tomato_seedling' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('farm_herb_bed', {
      Info: { name: 'Herb Bed', description: 'Plant aromatics for profit.' },
      Transform: { y: 0.12 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 0.22, lengthZ: 1.6, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4b2f22', roughness: 0.85 } } },
            { geometry: { type: 'box', params: { lengthX: 1.4, lengthY: 0.05, lengthZ: 1.4 } }, material: { type: 'solid', params: { color: '#5a3c2b', roughness: 0.6 } }, localPosition: [0, 0.22, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_lavender_seedling' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('farm_orchard_plot', {
      Info: { name: 'Orchard Plot', description: 'Space for apple saplings.' },
      Transform: { y: 0.1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 1, height: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5d3c28', roughness: 0.8 } } },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_apple_sapling' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('farm_vine_row', {
      Info: { name: 'Vine Row', description: 'Train grapes along trellis.' },
      Transform: { y: 0.12 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 3.5, lengthY: 0.15, lengthZ: 1.1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4a3423', roughness: 0.85 } } },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 1.4, lengthZ: 1 } }, material: { type: 'solid', params: { color: '#604630', roughness: 0.7 } }, localPosition: [-1.6, 0.8, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 1.4, lengthZ: 1 } }, material: { type: 'solid', params: { color: '#604630', roughness: 0.7 } }, localPosition: [1.6, 0.8, 0] },
            { geometry: { type: 'box', params: { lengthX: 3.5, lengthY: 0.15, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#715239', roughness: 0.6 } }, localPosition: [0, 1.4, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_grape_root' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('farm_pumpkin_patch', {
      Info: { name: 'Pumpkin Patch', description: 'Plant giants for autumn.' },
      Transform: { y: 0.1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 2.6, lengthY: 0.1, lengthZ: 2.6, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#553626', roughness: 0.85 } } },
            { geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.05, lengthZ: 0.4 } }, material: { type: 'solid', params: { color: '#6b4833', roughness: 0.6 } }, localPosition: [0, 0.1, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_pumpkin_seed' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_wheat_seed', {
      Info: { name: 'Wheat Seedling', description: 'Germinates into lush grain.' },
      Transform: { y: 0.25 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.18, height: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b4c35' } } },
            { geometry: { type: 'box', params: { lengthX: 0.22, lengthY: 0.32, lengthZ: 0.22, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4caf50' } }, localPosition: [0, 0.25, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 4 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_wheat_sprout' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_wheat_sprout', {
      Info: { name: 'Wheat Sprout', description: 'Leafing and rooting.' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5b402d' } } },
            { geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.5, lengthZ: 0.3, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6fbf73' } }, localPosition: [0, 0.35, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 5 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_wheat_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_wheat_ready', {
      Info: { name: 'Golden Wheat', description: 'Ready to harvest into bundles.' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.24, height: 0.45, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b4c35' } } },
            { geometry: { type: 'sphere', params: { radius: 0.42 } }, material: { type: 'solid', params: { color: '#ffd782' } }, localPosition: [0, 0.52, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.18, lengthY: 0.5, lengthZ: 0.18, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#90c483' } }, localPosition: [0.15, 0.38, -0.1] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_plot' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_wheat_bundle' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_wheat_bundle', {
      Info: { name: 'Wheat Bundle', description: 'Collect to sell.' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.35, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#e0c38c' } } },
            { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#c99a42' } }, localPosition: [0, 0.35, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.2 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('crop_corn_seed', {
      Info: { name: 'Corn Seed', description: 'Planted into wet soil.' },
      Transform: { y: 0.25 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.18, height: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5c3c2a' } } },
            { geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 0.32, lengthZ: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7cc27a' } }, localPosition: [0, 0.25, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 5 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_corn_stalk' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_corn_stalk', {
      Info: { name: 'Corn Stalk', description: 'Growing leaves and tassels.' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.55, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6a4a32' } } },
            { geometry: { type: 'box', params: { lengthX: 0.35, lengthY: 0.65, lengthZ: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5fa85c' } }, localPosition: [0, 0.55, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 6 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_corn_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_corn_ready', {
      Info: { name: 'Sweet Corn', description: 'Tall stalks with ears ready.' },
      Transform: { y: 0.45 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.25, height: 0.65, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6d4c33' } } },
            { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.85, lengthZ: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6ebf62' } }, localPosition: [0, 0.65, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.4, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#f5d96b' } }, localPosition: [0.2, 0.5, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.35, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#f5d96b' } }, localPosition: [-0.2, 0.55, -0.1] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_irrigated_plot' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_corn_crate' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_corn_crate', {
      Info: { name: 'Corn Crate', description: 'Stack for market sale.' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 0.7, lengthY: 0.35, lengthZ: 0.7 } }, material: { type: 'solid', params: { color: '#d8a25f' } } },
            { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.3, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#f2d36b' } }, localPosition: [0, 0.2, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.35 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('crop_tomato_seedling', {
      Info: { name: 'Tomato Seedling' },
      Transform: { y: 0.2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.16, height: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#72523a' } } },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.3, lengthZ: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#50a14f' } }, localPosition: [0, 0.2, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 4 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_tomato_vine' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_tomato_vine', {
      Info: { name: 'Tomato Vine' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6a4b35' } } },
            { geometry: { type: 'box', params: { lengthX: 0.35, lengthY: 0.55, lengthZ: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#64b76a' } }, localPosition: [0, 0.35, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 5 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_tomato_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_tomato_ready', {
      Info: { name: 'Tomato Cluster', description: 'Bright fruit ready to pick.' },
      Transform: { y: 0.4 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6c4c34' } } },
            { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#d43c2f' } }, localPosition: [0.18, 0.45, 0.05] },
            { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#d43c2f' } }, localPosition: [-0.15, 0.48, -0.08] },
            { geometry: { type: 'sphere', params: { radius: 0.18 } }, material: { type: 'solid', params: { color: '#d43c2f' } }, localPosition: [0, 0.52, 0.12] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_greenhouse_bed' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_tomato_crate' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_tomato_crate', {
      Info: { name: 'Tomato Crate' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 0.7, lengthY: 0.3, lengthZ: 0.7 } }, material: { type: 'solid', params: { color: '#b86b3c' } } },
            { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.28, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#d43c2f' } }, localPosition: [0, 0.25, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.32 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('crop_lavender_seedling', {
      Info: { name: 'Lavender Seedling' },
      Transform: { y: 0.2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.16, height: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4d3426' } } },
            { geometry: { type: 'box', params: { lengthX: 0.18, lengthY: 0.25, lengthZ: 0.18, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6ea96f' } }, localPosition: [0, 0.2, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 4 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_lavender_bush' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_lavender_bush', {
      Info: { name: 'Lavender Bush' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.32, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5b4031' } } },
            { geometry: { type: 'sphere', params: { radius: 0.32 } }, material: { type: 'solid', params: { color: '#7f5fa2' } }, localPosition: [0, 0.35, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 5 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_lavender_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_lavender_ready', {
      Info: { name: 'Blooming Lavender', description: 'Clip bundles for perfume-grade herbs.' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5b4031' } } },
            { geometry: { type: 'sphere', params: { radius: 0.34 } }, material: { type: 'solid', params: { color: '#9b7ccf' } }, localPosition: [0, 0.38, 0] },
            { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#b89ae6' } }, localPosition: [0.25, 0.35, -0.1] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_herb_bed' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_lavender_bundle' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_lavender_bundle', {
      Info: { name: 'Lavender Bundle' },
      Transform: { y: 0.25 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.25, lengthZ: 0.5 } }, material: { type: 'solid', params: { color: '#cbb0f5' } } },
            { geometry: { type: 'sphere', params: { radius: 0.16 } }, material: { type: 'solid', params: { color: '#a379d8' } }, localPosition: [0, 0.24, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.22 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('crop_grape_root', {
      Info: { name: 'Grape Root' },
      Transform: { y: 0.22 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.18, height: 0.22, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#654731' } } },
            { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.28, lengthZ: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5ea35f' } }, localPosition: [0, 0.22, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 5 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_grape_vine' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_grape_vine', {
      Info: { name: 'Grape Vine' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6d4f36' } } },
            { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.55, lengthZ: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6fbf73' } }, localPosition: [0, 0.35, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 6 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_grape_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_grape_ready', {
      Info: { name: 'Grape Cluster', description: 'Heavy purple clusters ready for pressing.' },
      Transform: { y: 0.4 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.42, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6d4f36' } } },
            { geometry: { type: 'sphere', params: { radius: 0.24 } }, material: { type: 'solid', params: { color: '#6a3c7a' } }, localPosition: [0.16, 0.5, 0] },
            { geometry: { type: 'sphere', params: { radius: 0.24 } }, material: { type: 'solid', params: { color: '#6a3c7a' } }, localPosition: [-0.16, 0.48, -0.08] },
            { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#7c4b8f' } }, localPosition: [0, 0.54, 0.12] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_vine_row' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_grape_crate' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_grape_crate', {
      Info: { name: 'Grape Crate' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 0.75, lengthY: 0.3, lengthZ: 0.75 } }, material: { type: 'solid', params: { color: '#a36853' } } },
            { geometry: { type: 'box', params: { lengthX: 0.65, lengthY: 0.28, lengthZ: 0.65 } }, material: { type: 'solid', params: { color: '#6a3c7a' } }, localPosition: [0, 0.22, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.32 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('crop_apple_sapling', {
      Info: { name: 'Apple Sapling' },
      Transform: { y: 0.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.35, height: 0.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6f4a2d' } } },
            { geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.6, lengthZ: 0.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#67b36a' } }, localPosition: [0, 0.5, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 6 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_apple_young' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_apple_young', {
      Info: { name: 'Young Apple Tree' },
      Transform: { y: 0.7 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.4, height: 0.7, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6f4a2d' } } },
            { geometry: { type: 'sphere', params: { radius: 0.8 } }, material: { type: 'solid', params: { color: '#5e914f' } }, localPosition: [0, 0.9, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 7 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_apple_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_apple_ready', {
      Info: { name: 'Apple Tree', description: 'Boughs heavy with fruit.' },
      Transform: { y: 0.9 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.45, height: 0.9, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6f4a2d' } } },
            { geometry: { type: 'sphere', params: { radius: 1 } }, material: { type: 'solid', params: { color: '#6fae5d' } }, localPosition: [0, 1.1, 0] },
            { geometry: { type: 'sphere', params: { radius: 0.25 } }, material: { type: 'solid', params: { color: '#e04330' } }, localPosition: [0.6, 1.2, 0.2] },
            { geometry: { type: 'sphere', params: { radius: 0.25 } }, material: { type: 'solid', params: { color: '#e04330' } }, localPosition: [-0.6, 1.15, -0.25] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_orchard_plot' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_apple_basket' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_apple_basket', {
      Info: { name: 'Apple Basket' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.5, height: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#b0723c' } } },
            { geometry: { type: 'sphere', params: { radius: 0.3 } }, material: { type: 'solid', params: { color: '#e04330' } }, localPosition: [0, 0.4, 0] },
            { geometry: { type: 'torus', params: { majorRadius: 0.55, minorRadius: 0.05 } }, material: { type: 'solid', params: { color: '#7d4b29' } }, localPosition: [0, 0.38, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.4 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    registerArchetype('crop_pumpkin_seed', {
      Info: { name: 'Pumpkin Seedling' },
      Transform: { y: 0.22 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.2, height: 0.22, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#654c36' } } },
            { geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 0.3, lengthZ: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6caf73' } }, localPosition: [0, 0.22, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 5 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_pumpkin_vine' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_pumpkin_vine', {
      Info: { name: 'Pumpkin Vine' },
      Transform: { y: 0.3 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.32, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6c4f38' } } },
            { geometry: { type: 'box', params: { lengthX: 0.35, lengthY: 0.4, lengthZ: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#74c170' } }, localPosition: [0, 0.32, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'time', params: { delay: 6 } }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'crop_pumpkin_ready' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('crop_pumpkin_ready', {
      Info: { name: 'Giant Pumpkin', description: 'Harvestable autumn gourd.' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'sphere', params: { radius: 0.6 } }, material: { type: 'solid', params: { color: '#e58b2a' } } },
            { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4f7a36' } }, localPosition: [0, 0.6, 0] },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'spawnEntityFrom', params: { entity: 'farm_pumpkin_patch' }, target: 'self' },
          { type: 'spawnEntityFrom', params: { entity: 'produce_pumpkin' }, target: 'self' },
          { type: 'kill', target: 'self' },
        ] }],
    });

    registerArchetype('produce_pumpkin', {
      Info: { name: 'Harvested Pumpkin' },
      Transform: { y: 0.35 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'sphere', params: { radius: 0.55 } }, material: { type: 'solid', params: { color: '#e58b2a' } } },
            { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4f7a36' } }, localPosition: [0, 0.55, 0] },
          ],
        },
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.45 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          { type: 'getPickedUp', params: {}, target: 'self' },
        ] }],
    });

    // Scene assembly
    spawn('farmstead_ground');

    spawn('farm_barn', { Transform: { x: -26, y: 0, z: 18 } });
    spawn('farm_silo', { Transform: { x: -38, y: 0, z: 6 } });
    spawn('farm_windmill', { Transform: { x: 30, y: 0, z: -22 } });
    spawn('farm_greenhouse', { Transform: { x: 22, y: 0, z: 24 } });
    spawn('farm_market', { Transform: { x: -4, y: 0.6, z: 28 } });
    spawn('farm_well', { Transform: { x: 8, y: 0, z: 20 } });
    spawn('farm_compost', { Transform: { x: -12, y: 0, z: 20 } });
    spawn('farm_sign', { Transform: { x: 0, y: 0.5, z: 14 } });

    const fenceSegments = [
      [-40, 0, -32], [-28, 0, -32], [-16, 0, -32], [-4, 0, -32], [8, 0, -32], [20, 0, -32], [32, 0, -32],
      [-40, 0, 32], [-28, 0, 32], [-16, 0, 32], [-4, 0, 32], [8, 0, 32], [20, 0, 32], [32, 0, 32],
      [-40, 0, -32], [-40, 0, -18], [-40, 0, -4], [-40, 0, 10], [-40, 0, 24],
      [40, 0, -32], [40, 0, -18], [40, 0, -4], [40, 0, 10], [40, 0, 24],
    ];
    for (const [x, y, z] of fenceSegments) {
      spawn('farm_fence', { Transform: { x, y, z } });
    }

    const lanternPositions = [
      [0, 0, 10], [0, 0, 18], [-12, 0, 10], [12, 0, 10], [20, 0, 20], [-20, 0, 20],
    ];
    for (const [x, y, z] of lanternPositions) {
      spawn('farm_lantern', { Transform: { x, y, z } });
    }

    const wheatPlots = [
      [-12, 0, -8], [-8, 0, -8], [-4, 0, -8], [0, 0, -8], [4, 0, -8], [8, 0, -8], [12, 0, -8],
      [-12, 0, -4], [-8, 0, -4], [-4, 0, -4], [0, 0, -4], [4, 0, -4], [8, 0, -4], [12, 0, -4],
      [-12, 0, 0], [-8, 0, 0], [-4, 0, 0], [0, 0, 0], [4, 0, 0], [8, 0, 0], [12, 0, 0],
    ];
    for (const [x, y, z] of wheatPlots) {
      spawn('farm_plot', { Transform: { x, y, z } });
    }

    const cornPlots = [
      [-18, 0, -12], [-14, 0, -12], [-10, 0, -12], [-6, 0, -12],
      [-18, 0, -15], [-14, 0, -15], [-10, 0, -15], [-6, 0, -15],
    ];
    for (const [x, y, z] of cornPlots) {
      spawn('farm_irrigated_plot', { Transform: { x, y, z } });
    }

    const greenhouseBeds = [
      [18, 0, 22], [20.5, 0, 22], [23, 0, 22],
      [18, 0, 25], [20.5, 0, 25], [23, 0, 25],
    ];
    for (const [x, y, z] of greenhouseBeds) {
      spawn('farm_greenhouse_bed', { Transform: { x, y, z } });
    }

    const herbBeds = [
      [10, 0, 22], [12, 0, 22], [14, 0, 22], [16, 0, 22],
    ];
    for (const [x, y, z] of herbBeds) {
      spawn('farm_herb_bed', { Transform: { x, y, z } });
    }

    const orchardSpots = [
      [-26, 0, 6], [-30, 0, 10], [-22, 0, 10], [-26, 0, 14], [-30, 0, 14], [-22, 0, 14],
    ];
    for (const [x, y, z] of orchardSpots) {
      spawn('farm_orchard_plot', { Transform: { x, y, z } });
    }

    const vineRows = [
      [18, 0, -10], [22, 0, -10], [26, 0, -10],
      [18, 0, -6], [22, 0, -6], [26, 0, -6],
    ];
    for (const [x, y, z] of vineRows) {
      spawn('farm_vine_row', { Transform: { x, y, z } });
    }

    spawn('farm_pumpkin_patch', { Transform: { x: -6, y: 0, z: 8 } });
    spawn('farm_pumpkin_patch', { Transform: { x: -2, y: 0, z: 8 } });

    // Starter crops to showcase progression
    spawn('crop_wheat_ready', { Transform: { x: 0, y: 0, z: -2 } });
    spawn('crop_corn_ready', { Transform: { x: -14, y: 0, z: -18 } });
    spawn('crop_tomato_ready', { Transform: { x: 18, y: 0, z: 24 } });
    spawn('crop_lavender_ready', { Transform: { x: 12, y: 0, z: 20 } });
    spawn('crop_grape_ready', { Transform: { x: 18, y: 0, z: -6 } });
    spawn('crop_apple_ready', { Transform: { x: -32, y: 0, z: 12 } });
    spawn('crop_pumpkin_ready', { Transform: { x: -4, y: 0, z: 8 } });

    spawn('player', { Transform: { x: 0, y: 2, z: 18 } });
  },
};
