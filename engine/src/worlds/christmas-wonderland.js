export default {
  setupScene(api) {
    const { initialize, spawn, getModule } = api;
    const archetypes = getModule('archetype');

    const worldDefinition = {
      title: 'Christmas Wonderland',
      description: 'A cinematic holiday village with snowfall, glowing markets, hot cocoa, and interactive festivities for a cozy winter night.',
      tags: ['holiday', 'winter', 'marketing', 'particles'],
      brandColors: ['#0b1d3a', '#e34b4b', '#f7d774'],
      dimensions: [
        {
          name: 'north_pole',
          gravity: -9.81,
          useDayNightCycle: true,
          sky: {
            color: '#0b1d3a',
            sun: {
              color: '#ffd27d',
              intensity: 0.6,
              timeOfDay: 2000,
            },
            clouds: {
              color: '#e6f3ff',
              coverage: 0.25,
            },
            stars: {
              intensity: 0.9,
            },
          },
          particleSystems: [
            {
              name: 'Snowfall',
              position: [0, 18, 0],
              emitter: {
                rate: 160,
                maxParticles: 1800,
                lifetime: 7,
                speed: { min: 0.5, max: 1.2 },
                spread: 0.35,
                size: 0.16,
                opacity: 0.9,
                gravity: 0.15,
                color: '#ffffff',
                direction: [0, -1, 0],
                shape: { type: 'box', size: [70, 2, 70] },
                localSpace: false,
              },
            },
            {
              name: 'Aurora Glow',
              position: [0, 22, -10],
              emitter: {
                rate: 40,
                maxParticles: 400,
                lifetime: 8,
                speed: { min: 0.05, max: 0.2 },
                spread: 0.4,
                size: 0.25,
                opacity: 0.4,
                gravity: 0,
                color: '#7ef7d1',
                direction: [1, 0, 0],
                shape: { type: 'box', size: [50, 4, 8] },
                localSpace: false,
              },
            },
          ],
        },
      ],
    };

    initialize(worldDefinition);

    archetypes.register('present_drop', {
      type: 'bundle',
      params: {
        Info: { name: 'Falling Present' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 0.6, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#e34b4b', roughness: 0.6 } },
                children: [
                  {
                    geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.1, lengthZ: 0.1, pivot: 'center' } },
                    material: { type: 'solid', params: { color: '#f7d774', roughness: 0.4 } },
                    localPosition: [0, 0.25, 0],
                  },
                  {
                    geometry: { type: 'box', params: { lengthX: 0.1, lengthY: 0.6, lengthZ: 0.6, pivot: 'center' } },
                    material: { type: 'solid', params: { color: '#f7d774', roughness: 0.4 } },
                    localPosition: [0, 0, 0],
                  },
                ],
              },
            ],
          },
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.4 } },
                Rules: [{ trigger: { type: 'time', params: { delay: 10, repeat: false } }, actions: [{ type: 'kill', target: 'self', params: {} }] }],
      },
    });

    archetypes.register('sleigh', {
      type: 'bundle',
      params: {
        Info: { name: 'Santa Sleigh' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'sleigh',
                geometry: { type: 'box', params: { lengthX: 3.6, lengthY: 0.9, lengthZ: 1.6, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#c93b3b', roughness: 0.6 } },
                children: [
                  {
                    geometry: { type: 'box', params: { lengthX: 3.8, lengthY: 0.3, lengthZ: 0.3, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#f7d774', roughness: 0.4 } },
                    localPosition: [0, 0.1, -0.95],
                  },
                  {
                    geometry: { type: 'box', params: { lengthX: 3.8, lengthY: 0.3, lengthZ: 0.3, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#f7d774', roughness: 0.4 } },
                    localPosition: [0, 0.1, 0.95],
                  },
                  {
                    tag: 'reindeer_front_left',
                    geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.7, lengthZ: 0.6, pivot: 'center' } },
                    material: { type: 'solid', params: { color: '#8b5a2b', roughness: 0.8 } },
                    localPosition: [3.8, 0.6, -0.6],
                    children: [
                      {
                        geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 0.6, pivot: 'center' } },
                        material: { type: 'solid', params: { color: '#a16836', roughness: 0.7 } },
                        localPosition: [1.1, 0.2, 0],
                      },
                      {
                        geometry: { type: 'cylinder', params: { radius: 0.05, height: 0.6, pivot: 'bottom' } },
                        material: { type: 'solid', params: { color: '#f7d774', roughness: 0.6 } },
                        localPosition: [1.25, 0.45, 0.2],
                      },
                      {
                        geometry: { type: 'cylinder', params: { radius: 0.05, height: 0.6, pivot: 'bottom' } },
                        material: { type: 'solid', params: { color: '#f7d774', roughness: 0.6 } },
                        localPosition: [1.25, 0.45, -0.2],
                      },
                    ],
                  },
                  {
                    tag: 'reindeer_front_right',
                    geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.7, lengthZ: 0.6, pivot: 'center' } },
                    material: { type: 'solid', params: { color: '#8b5a2b', roughness: 0.8 } },
                    localPosition: [3.8, 0.6, 0.6],
                  },
                  {
                    tag: 'reindeer_back_left',
                    geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.7, lengthZ: 0.6, pivot: 'center' } },
                    material: { type: 'solid', params: { color: '#8b5a2b', roughness: 0.8 } },
                    localPosition: [5.8, 0.8, -0.3],
                  },
                  {
                    tag: 'reindeer_back_right',
                    geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.7, lengthZ: 0.6, pivot: 'center' } },
                    material: { type: 'solid', params: { color: '#8b5a2b', roughness: 0.8 } },
                    localPosition: [5.8, 0.8, 0.3],
                  },
                ],
              },
            ],
          },
        },
        Animation: {
          clips: [
            {
              name: 'default',
              duration: 2,
              tracks: [
                {
                  targetTag: 'sleigh',
                  keyframes: [
                    { time: 0, position: [0, 0, 0] },
                    { time: 1, position: [0, 0.1, 0] },
                    { time: 2, position: [0, 0, 0] },
                  ],
                },
                {
                  targetTag: 'reindeer_front_left',
                  keyframes: [
                    { time: 0, position: [0, 0, 0] },
                    { time: 0.6, position: [0, 0.08, 0] },
                    { time: 1.2, position: [0, 0, 0] },
                  ],
                },
                {
                  targetTag: 'reindeer_front_right',
                  keyframes: [
                    { time: 0, position: [0, 0, 0] },
                    { time: 0.6, position: [0, 0.08, 0] },
                    { time: 1.2, position: [0, 0, 0] },
                  ],
                },
                {
                  targetTag: 'reindeer_back_left',
                  keyframes: [
                    { time: 0, position: [0, 0, 0] },
                    { time: 0.6, position: [0, 0.06, 0] },
                    { time: 1.2, position: [0, 0, 0] },
                  ],
                },
                {
                  targetTag: 'reindeer_back_right',
                  keyframes: [
                    { time: 0, position: [0, 0, 0] },
                    { time: 0.6, position: [0, 0.06, 0] },
                    { time: 1.2, position: [0, 0, 0] },
                  ],
                },
              ],
            },
          ],
        },
        ParticleEmitter: {
          rate: 26,
          maxParticles: 240,
          lifetime: 2.4,
          speed: { min: 0.3, max: 0.8 },
          spread: 0.6,
          size: 0.14,
          opacity: 0.8,
          gravity: 0.2,
          color: '#ffe7a6',
          direction: [0, -0.2, -1],
          shape: { type: 'box', size: [1.2, 0.6, 0.6] },
          localSpace: true,
        },
        MotionSource: { type: 'characterController', params: { speed: 8, jumpHeight: 2, canFly: true } },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            {
              type: 'mount',
              target: 'self',
              params: { offset: [0, 1.2, -1.2] },
            },
          ] }, { trigger: { type: 'time', params: { delay: 4, repeat: true } }, actions: [
            {
              type: 'spawnEntityFrom',
              target: 'self',
              params: { entity: 'present_drop', velocity: 0 },
            },
            {
              type: 'emitParticles',
              target: 'self',
              params: {
                duration: 1.4,
                emitter: {
                  burst: 70,
                  maxParticles: 140,
                  lifetime: 1.6,
                  speed: { min: 0.6, max: 2.0 },
                  spread: 1.2,
                  size: 0.16,
                  opacity: 0.9,
                  gravity: 0.9,
                  color: '#c4f1ff',
                  direction: [0, -1, 0],
                  shape: { type: 'sphere', radius: 0.5 },
                  localSpace: false,
                },
              },
            },
          ] }],
      },
    });

    spawn({
      Info: { name: 'Snowfield' },
      Transform: { y: -1 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 80, lengthY: 2, lengthZ: 80, pivot: 'center' },
              },
              material: {
                type: 'solid',
                params: { color: '#f5f9ff', roughness: 1.0 },
              },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Market Plaza' },
      Transform: { x: 0, y: -0.9, z: -6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 26, lengthY: 0.4, lengthZ: 18, pivot: 'center' } },
              material: { type: 'solid', params: { color: '#e9eef6', roughness: 0.9 } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Grand Tree' },
      Transform: { x: 0, y: -0.4, z: -6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 1.1, height: 4.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#5b3a1f', roughness: 0.9 } },
              children: [
                {
                  geometry: { type: 'cone', params: { radius: 4.5, height: 7, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#1c5a36', roughness: 0.7 } },
                  localPosition: [0, 3, 0],
                },
              ],
            },
          ],
        },
      },
      ParticleEmitter: {
        rate: 36,
        maxParticles: 260,
        lifetime: 2.8,
        speed: { min: 0.2, max: 0.5 },
        spread: 1.1,
        size: 0.14,
        opacity: 1.0,
        gravity: 0,
        color: '#ffd7a0',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 4.2 },
        localSpace: true,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Caroler Circle' },
      Transform: { x: -4, y: -0.9, z: -10 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 3.2, height: 0.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#d8dde6', roughness: 0.8 } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Ice Rink' },
      Transform: { x: 10, y: -0.8, z: -10 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 6, height: 0.3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#cde9ff', roughness: 0.2, metalness: 0.2 } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Hot Cocoa Stand' },
      Transform: { x: -6, y: 0, z: -2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 4.2, lengthY: 2.4, lengthZ: 2.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#7f3f2a', roughness: 0.8 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 4.6, lengthY: 0.3, lengthZ: 2.6, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#d9b56b', roughness: 0.6 } },
              localPosition: [0, 2.4, 0],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Toy Stall' },
      Transform: { x: 6, y: 0, z: -2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 4, lengthY: 2.2, lengthZ: 2.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#2f6b9a', roughness: 0.7 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 4.4, lengthY: 0.3, lengthZ: 2.6, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#f7d774', roughness: 0.5 } },
              localPosition: [0, 2.2, 0],
            },
          ],
        },
      },
      ParticleEmitter: {
        rate: 10,
        maxParticles: 80,
        lifetime: 2,
        speed: { min: 0.1, max: 0.3 },
        spread: 0.8,
        size: 0.12,
        opacity: 0.8,
        gravity: 0,
        color: '#ff9be8',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 0.8 },
        localSpace: true,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Bakery Stall' },
      Transform: { x: 0, y: 0, z: -12 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 5, lengthY: 2.4, lengthZ: 2.6, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#9c4f3a', roughness: 0.7 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 5.4, lengthY: 0.3, lengthZ: 3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#f7d774', roughness: 0.6 } },
              localPosition: [0, 2.4, 0],
            },
          ],
        },
      },
      ParticleEmitter: {
        rate: 12,
        maxParticles: 90,
        lifetime: 2.6,
        speed: { min: 0.1, max: 0.3 },
        spread: 0.6,
        size: 0.16,
        opacity: 0.6,
        gravity: -0.03,
        color: '#f2d1a5',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 0.6 },
        localSpace: false,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Cocoa Steam' },
      Transform: { x: -6, y: 2.2, z: -2 },
      ParticleEmitter: {
        rate: 16,
        maxParticles: 120,
        lifetime: 3.2,
        speed: { min: 0.1, max: 0.3 },
        spread: 0.5,
        size: 0.18,
        opacity: 0.45,
        gravity: -0.05,
        color: '#f2e4d6',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 0.5 },
        localSpace: false,
      },
      MotionSource: { type: 'static', params: {} },
    });

    const spawnStreet = (name, x, z, lengthX, lengthZ) => {
      spawn({
        Info: { name },
        Transform: { x, y: -0.95, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX, lengthY: 0.2, lengthZ, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#2c2f36', roughness: 0.8 } },
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });
    };

    const spawnStreetLamp = (x, z) => {
      spawn({
        Info: { name: 'Snowy Street Lamp' },
        Transform: { x, y: 0, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.15, height: 3.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#3d3d3d', roughness: 0.7 } },
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.4, pivot: 'center' } },
                material: { type: 'solid', params: { color: '#f7d774', roughness: 0.3, metalness: 0.2 } },
                localPosition: [0, 3.2, 0],
              },
            ],
          },
        },
        ParticleEmitter: {
          rate: 14,
          maxParticles: 120,
          lifetime: 2.2,
          speed: { min: 0.1, max: 0.3 },
          spread: 0.6,
          size: 0.1,
          opacity: 0.7,
          gravity: 0,
          color: '#ffdba0',
          direction: [0, 1, 0],
          shape: { type: 'sphere', radius: 0.8 },
          localSpace: true,
        },
        MotionSource: { type: 'static', params: {} },
      });
    };

    const spawnHouse = ({ x, z, width, depth, wallColor, trimColor, roofColor, wreathColor }) => {
      const roofHeight = 2.6;
      spawn({
        Info: { name: 'Festive House' },
        Transform: { x, y: 0, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: width, lengthY: 3.2, lengthZ: depth, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: wallColor, roughness: 0.8 } },
              },
              {
                geometry: { type: 'box', params: { lengthX: width + 0.4, lengthY: roofHeight, lengthZ: depth + 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: roofColor, roughness: 0.7 } },
                localPosition: [0, 3.2, 0],
              },
            {
              geometry: { type: 'box', params: { lengthX: width * 0.4, lengthY: 1.6, lengthZ: 0.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: trimColor, roughness: 0.4 } },
              localPosition: [0, 0.2, depth / 2 + 0.1],
            },
            {
              geometry: { type: 'torus', params: { majorRadius: 0.6, minorRadius: 0.1, pivot: 'center' } },
              material: { type: 'solid', params: { color: wreathColor, roughness: 0.5 } },
              localPosition: [0, 1.4, depth / 2 + 0.22],
              localRotation: [Math.PI / 2, 0, 0],
            },
            ],
          },
        },
        ParticleEmitter: {
          rate: 20,
          maxParticles: 160,
          lifetime: 2.4,
          speed: { min: 0.1, max: 0.4 },
          spread: 1.1,
          size: 0.1,
          opacity: 0.8,
          gravity: 0,
          color: '#ffd7a0',
          direction: [0, 1, 0],
          shape: { type: 'box', size: [width + 0.6, 0.6, depth + 0.6] },
          localSpace: true,
        },
        MotionSource: { type: 'static', params: {} },
      });

      spawn({
        Info: { name: 'Front Yard Snowman' },
        Transform: { x: x - width * 0.35, y: 0, z: z + depth * 0.85 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'sphere', params: { radius: 0.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#ffffff' } } },
              { geometry: { type: 'sphere', params: { radius: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#fefefe' } }, localPosition: [0, 0.5, 0] },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });
    };

    spawnStreet('Main Street', 0, 8, 70, 6);
    spawnStreet('Maple Lane', -18, 18, 8, 40);
    spawnStreet('Sugarplum Avenue', 18, 18, 8, 40);

    const housePalette = [
      { wallColor: '#8fa9c6', trimColor: '#f7d774', roofColor: '#5a2e2e', wreathColor: '#2e7d32' },
      { wallColor: '#d9b08c', trimColor: '#fef6e4', roofColor: '#7a3b2e', wreathColor: '#2f8f4e' },
      { wallColor: '#b8c4a5', trimColor: '#ffffff', roofColor: '#4b4f65', wreathColor: '#2e7d32' },
      { wallColor: '#cfa3a3', trimColor: '#f7d774', roofColor: '#3b2a2a', wreathColor: '#2e7d32' },
      { wallColor: '#9bb3c9', trimColor: '#e34b4b', roofColor: '#5c3c2e', wreathColor: '#2f8f4e' },
    ];

    const houseRow = [
      { x: -24, z: 14, width: 6, depth: 7, palette: housePalette[0] },
      { x: -12, z: 14, width: 5.5, depth: 6.5, palette: housePalette[1] },
      { x: 0, z: 14, width: 6.5, depth: 7.5, palette: housePalette[2] },
      { x: 12, z: 14, width: 5.5, depth: 6.5, palette: housePalette[3] },
      { x: 24, z: 14, width: 6, depth: 7, palette: housePalette[4] },
    ];

    const backRow = [
      { x: -22, z: 26, width: 6.2, depth: 7.2, palette: housePalette[2] },
      { x: -8, z: 26, width: 5.8, depth: 6.8, palette: housePalette[0] },
      { x: 8, z: 26, width: 6, depth: 7, palette: housePalette[3] },
      { x: 22, z: 26, width: 6.4, depth: 7.4, palette: housePalette[1] },
    ];

    [...houseRow, ...backRow].forEach(({ x, z, width, depth, palette }) => {
      spawnHouse({ x, z, width, depth, ...palette });
      spawnStreetLamp(x - width * 0.9, z + depth * 0.9);
    });

    spawn({
      Info: { name: 'Holiday Cabin' },
      Transform: { x: -12, y: 0, z: -8 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 6, lengthY: 4, lengthZ: 6, pivot: 'bottom' },
              },
              material: {
                type: 'solid',
                params: { color: '#8b5a2b', roughness: 0.9 },
              },
              children: [
                {
                  geometry: {
                    type: 'pyramid',
                    params: { width: 7, height: 3, depth: 7, pivot: 'bottom' },
                  },
                  material: {
                    type: 'solid',
                    params: { color: '#6b2b2b', roughness: 0.8 },
                  },
                  localPosition: [0, 4, 0],
                },
              ],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Cabin Chimney' },
      Transform: { x: -10, y: 4.8, z: -6 },
      ParticleEmitter: {
        rate: 20,
        maxParticles: 220,
        lifetime: 3.5,
        speed: { min: 0.3, max: 0.8 },
        spread: 0.4,
        size: 0.25,
        opacity: 0.6,
        gravity: -0.1,
        color: '#cfcfcf',
        direction: [0, 1, 0],
        shape: { type: 'box', size: [0.6, 0.2, 0.6] },
        localSpace: false,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Evergreen Tree' },
      Transform: { x: 8, y: 0, z: -4 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'cylinder',
                params: { radius: 0.6, height: 3, pivot: 'bottom' },
              },
              material: {
                type: 'solid',
                params: { color: '#6b3f1d', roughness: 0.9 },
              },
              children: [
                {
                  geometry: {
                    type: 'cone',
                    params: { radius: 3, height: 6, pivot: 'bottom' },
                  },
                  material: {
                    type: 'solid',
                    params: { color: '#1f6b3b', roughness: 0.7 },
                  },
                  localPosition: [0, 2.5, 0],
                },
              ],
            },
          ],
        },
      },
      ParticleEmitter: {
        rate: 12,
        maxParticles: 180,
        lifetime: 2.5,
        speed: { min: 0.1, max: 0.4 },
        spread: 1.1,
        size: 0.12,
        opacity: 1.0,
        gravity: 0,
        color: '#ffd700',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 2.8 },
        localSpace: true,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Festival Light Arch' },
      Transform: { x: 0, y: 0, z: 2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'torus', params: { majorRadius: 3.8, minorRadius: 0.2, pivot: 'center' } },
              material: { type: 'solid', params: { color: '#f7d774', roughness: 0.3, metalness: 0.5 } },
              localRotation: [Math.PI / 2, 0, 0],
            },
          ],
        },
      },
      ParticleEmitter: {
        rate: 24,
        maxParticles: 180,
        lifetime: 2.6,
        speed: { min: 0.2, max: 0.5 },
        spread: 0.9,
        size: 0.12,
        opacity: 0.8,
        gravity: 0,
        color: '#ffe7a6',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 3.6 },
        localSpace: true,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Sleigh Launch Platform' },
      Transform: { x: 12, y: 0, z: 8 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 6, lengthY: 0.6, lengthZ: 8, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#3c4a5e', roughness: 0.9 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 2, lengthY: 0.4, lengthZ: 4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#6b7a90', roughness: 0.8 } },
              localPosition: [-2, 0.6, -2],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn('sleigh', {
      Transform: { x: 14, y: 3.2, z: 6 },
    });


    spawn({
      Info: { name: 'Gift Pile' },
      Transform: { x: 2, y: 0, z: 6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 1.4, lengthY: 1, lengthZ: 1.4, pivot: 'bottom' },
              },
              material: {
                type: 'solid',
                params: { color: '#e34b4b', roughness: 0.6 },
              },
              children: [
                {
                  geometry: {
                    type: 'box',
                    params: { lengthX: 1.4, lengthY: 0.2, lengthZ: 0.2, pivot: 'center' },
                  },
                  material: {
                    type: 'solid',
                    params: { color: '#f7d774', roughness: 0.5 },
                  },
                  localPosition: [0, 0.6, 0],
                },
                {
                  geometry: {
                    type: 'box',
                    params: { lengthX: 0.2, lengthY: 1, lengthZ: 1.4, pivot: 'center' },
                  },
                  material: {
                    type: 'solid',
                    params: { color: '#f7d774', roughness: 0.5 },
                  },
                  localPosition: [0, 0.6, 0],
                },
              ],
            },
          ],
        },
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'emitParticles',
            target: 'self',
            params: {
              duration: 2,
              emitter: {
                burst: 120,
                maxParticles: 200,
                lifetime: 2.2,
                speed: { min: 1.2, max: 3.2 },
                spread: 1.4,
                size: 0.2,
                opacity: 0.95,
                gravity: 1.2,
                color: '#ff66b2',
                direction: [0, 1, 0],
                shape: { type: 'sphere', radius: 0.4 },
                localSpace: false,
              },
            },
          },
          {
            type: 'popup',
            target: 'other',
            params: { text: 'Happy Holidays! The gifts explode into confetti.' },
          },
        ] }],
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Town Bell' },
      Transform: { x: -14, y: 0, z: 4 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 1.1, height: 3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#8b5a2b', roughness: 0.9 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.9, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#f7d774', roughness: 0.4 } },
              localPosition: [0, 3.1, 0],
            },
          ],
        },
      },
            Rules: [{ trigger: { type: 'interact' }, actions: [
          {
            type: 'emitParticles',
            target: 'self',
            params: {
              duration: 1.8,
              emitter: {
                burst: 90,
                maxParticles: 140,
                lifetime: 1.8,
                speed: { min: 0.6, max: 2.2 },
                spread: 1.2,
                size: 0.18,
                opacity: 0.9,
                gravity: 0.8,
                color: '#ffe7a6',
                direction: [0, 1, 0],
                shape: { type: 'sphere', radius: 0.5 },
                localSpace: false,
              },
            },
          },
          {
            type: 'popup',
            target: 'other',
            params: { text: 'The town bell rings out with a burst of sparkle!' },
          },
        ] }],
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Snowman' },
      Transform: { x: -4, y: 0, z: 4 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'sphere',
                params: { radius: 1.4, pivot: 'bottom' },
              },
              material: {
                type: 'solid',
                params: { color: '#ffffff', roughness: 0.9 },
              },
              children: [
                {
                  geometry: {
                    type: 'sphere',
                    params: { radius: 1.0, pivot: 'bottom' },
                  },
                  material: {
                    type: 'solid',
                    params: { color: '#fefefe', roughness: 0.9 },
                  },
                  localPosition: [0, 1.3, 0],
                },
                {
                  geometry: {
                    type: 'sphere',
                    params: { radius: 0.6, pivot: 'bottom' },
                  },
                  material: {
                    type: 'solid',
                    params: { color: '#fefefe', roughness: 0.9 },
                  },
                  localPosition: [0, 2.5, 0],
                },
              ],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });
  },
};
