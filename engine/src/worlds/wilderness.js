export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    // Resources and modules
    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // Initialize world declaratively
    initialize({
      title: 'Pacific Northwest – Coast & Canopy',
      description: 'From misty coastline to old-growth ridges. Explore tide pools, creeks, and deep conifer forests.',
      tags: ['nature', 'exploration', 'relaxing'],
      brandColors: ['#7ea3c7', '#2f5d3a'],
      dimensions: [{
        name: 'PacificNorthwest',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#7ea3c7', // cool marine blue
          sun: {
            color: '#FFEEDD',
            intensity: 0.85,
            timeOfDay: 1000 // mid-morning haze
          },
          clouds: {
            color: '#f3f6f9',
            coverage: 0.6
          },
          stars: {
            intensity: 0.0
          }
        },
        particleSystems: [
          {
            name: 'Forest Mist',
            position: [0, 6, 0],
            emitter: {
              rate: 90,
              maxParticles: 700,
              lifetime: 6,
              speed: { min: 0.05, max: 0.18 },
              spread: 0.6,
              size: 0.18,
              opacity: 0.35,
              gravity: 0,
              color: '#dbe8f2',
              direction: [0.1, 0.2, 0],
              shape: { type: 'point' },
              localSpace: false
            }
          }
        ]
      }],
      achievements: [
        {
          name: 'Ridgeline Wanderer',
          description: 'Discover 5 trail markers among the cedars.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Trail Marker',
              targetValue: 5
            }
          }
        },
        {
          name: 'Coastline Explorer',
          description: 'Discover the lighthouse on the coast.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Lighthouse',
              targetValue: 1
            }
          }
        },
        {
          name: 'Forager',
          description: 'Pick up 3 wild mushrooms.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Mushroom',
              targetValue: 3
            }
          }
        },
        {
          name: 'Prepared for Rain',
          description: 'Pick up a rain poncho.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Rain Poncho',
              targetValue: 1
            }
          }
        },
        {
          name: 'Warm and Ready',
          description: 'Pick up a thermos.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Thermos',
              targetValue: 1
            }
          }
        },
        {
          name: 'Stocked Up',
          description: 'Pick up five items on your journey.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              targetValue: 5
            }
          }
        }
      ]
    });

    // Fields for terrain and scattering
    const seed = Math.floor(Math.random() * 100000) | 0;
    const terrainSize = 640;

    const continentalNoise = {
      type: 'simplex',
      params: { seed, frequency: 0.18, amplitude: 28, octaves: 4 }
    };
    const alpinePeaks = {
      type: 'simplex',
      params: { seed: seed + 11, frequency: 1, amplitude: 100, octaves: 4 }
    };
    const valleyErosion = {
      type: 'simplex',
      params: { seed: seed + 27, frequency: 2.5, amplitude: -25, octaves: 3 }
    };
    const shorelineShelf = {
      type: 'simplex',
      params: { seed: seed + 71, frequency: 0.22, amplitude: -9, octaves: 2 }
    };
    const ruggedMask = {
      type: 'simplex',
      params: { seed: seed + 199, frequency: 0.6, amplitude: 0.55, octaves: 2 }
    };

    // Blend continental plates with rugged peaks and carved valleys while retaining a coastal shelf.
    const heightField = fields.register('pnw_height', {
      type: 'composite',
      params: {
        blend: 'add',
        fields: [
          continentalNoise,
          {
            type: 'composite',
            params: {
              blend: 'multiply',
              fields: [alpinePeaks, ruggedMask]
            }
          },
          valleyErosion,
          {
            type: 'composite',
            params: {
              blend: 'max',
              fields: [
                shorelineShelf,
                {
                  type: 'simplex',
                  params: { seed: seed + 311, frequency: 0.08, amplitude: -6, octaves: 2 }
                }
              ]
            }
          }
        ]
      }
    });
    const treeMask = fields.register('pnw_treeMask', {
      type: 'simplex',
      params: { seed: seed + 17, frequency: 0.55, amplitude: 1.0, octaves: 3 }
    });
    const understoryMask = fields.register('pnw_understoryMask', {
      type: 'simplex',
      params: { seed: seed + 43, frequency: 1.2, amplitude: 1.0, octaves: 4 }
    });
    const moistureMask = fields.register('pnw_moisture', {
      type: 'simplex',
      params: { seed: seed + 99, frequency: 0.35, amplitude: 1.0, octaves: 4 }
    });

    // Additional masks for placement variety
    const densityMask = fields.register('pnw_density', {
      type: 'simplex',
      params: { seed: seed + 151, frequency: 0.18, amplitude: 1.0, octaves: 3 }
    });
    const biomeMask = fields.register('pnw_biome', {
      type: 'simplex',
      params: { seed: seed + 203, frequency: 0.09, amplitude: 1.0, octaves: 2 }
    });
    const rockinessMask = fields.register('pnw_rockiness', {
      type: 'simplex',
      params: { seed: seed + 257, frequency: 1.4, amplitude: 1.0, octaves: 3 }
    });

    // Helpers
    const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
    const smoothstep = (e0, e1, x) => {
      const t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    };
    const pickWeighted = (options) => {
      let total = 0;
      for (const o of options) total += o.w;
      let r = Math.random() * (total || 1);
      for (const o of options) {
        r -= o.w;
        if (r <= 0) return o.v;
      }
      return options.length ? options[options.length - 1].v : null;
    };
    const sampleSlope = (x, z) => {
      // approximate slope magnitude, normalized ~[0..1]
      const epsWorld = Math.max(2, terrainSize * 0.005); // ~3 units
      const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
      const hx = heightField.sample3D((x + epsWorld) / terrainSize, 0, z / terrainSize);
      const hz = heightField.sample3D(x / terrainSize, 0, (z + epsWorld) / terrainSize);
      const dx = (hx - h) / epsWorld;
      const dz = (hz - h) / epsWorld;
      return clamp(Math.hypot(dx, dz) * 4, 0, 1); // scale into 0..1 band
    };

    // Terrain
    spawn({
      Info: { name: 'Coast & Canopy' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: {
              type: 'displacedPlane',
              params: { lengthX: terrainSize, lengthZ: terrainSize, field: 'pnw_height' }
            },
            material: { type: 'solid', params: { color: '#2f4f3a', roughness: 1.0 } } // deep mossy ground
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Global sea level water plane (creates ocean/rivers/lakes wherever terrain is below)
    const seaLevel = -1.0;
    spawn({
      Info: { name: 'Sea Level' },
      Transform: { x: 0, y: seaLevel, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: terrainSize * 3.0, lengthY: 0.6, lengthZ: terrainSize * 3.0, pivot: 'center' } },
            material: { type: 'liquid', params: { baseColor: '#2b5d7f', depthTint: '#0b2f46', opacity: 0.9, waveFreq: 0.18, waveAmp: 0.05, waveSpeed: 0.22 } },
            ignoreCollisions: true
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Douglas-fir archetype
    archetypes.register('douglasFir', {
      params: {
        Info: { name: 'Douglas-fir' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'trunk',
                geometry: { type: 'cylinder', params: { radius: 0.3, height: 10.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6b4a2c', roughness: 1 } },
                children: [
                  {
                    geometry: { type: 'cone', params: { radius: 2.8, height: 3.0, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#1e4d32' } },
                    localPosition: [0, 6.0, 0]
                  },
                  {
                    geometry: { type: 'cone', params: { radius: 2.2, height: 2.6, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#225b39' } },
                    localPosition: [0, 8.4, 0]
                  },
                  {
                    geometry: { type: 'cone', params: { radius: 1.5, height: 2.2, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#1f5535' } },
                    localPosition: [0, 10.4, 0]
                  }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Western red cedar archetype
    archetypes.register('westernRedCedar', {
      params: {
        Info: { name: 'Western Red Cedar' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'trunk',
                geometry: { type: 'cylinder', params: { radius: 0.38, height: 9.0, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6a4a2c', roughness: 1 } },
                children: [
                  { geometry: { type: 'cone', params: { radius: 2.6, height: 2.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#1f4b30' } }, localPosition: [0, 5.0, 0] },
                  { geometry: { type: 'cone', params: { radius: 2.1, height: 2.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#1e4630' } }, localPosition: [0, 6.8, 0] },
                  { geometry: { type: 'cone', params: { radius: 1.6, height: 2.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#1b422c' } }, localPosition: [0, 8.2, 0] }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Sitka spruce archetype (coastal conifer)
    archetypes.register('sitkaSpruce', {
      params: {
        Info: { name: 'Sitka Spruce' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'trunk',
                geometry: { type: 'cylinder', params: { radius: 0.28, height: 11.0, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6a4a2f' } },
                children: [
                  { geometry: { type: 'cone', params: { radius: 2.6, height: 2.6, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2c6b56' } }, localPosition: [0, 6.8, 0] },
                  { geometry: { type: 'cone', params: { radius: 2.0, height: 2.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2a6150' } }, localPosition: [0, 9.0, 0] },
                  { geometry: { type: 'cone', params: { radius: 1.4, height: 2.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#275746' } }, localPosition: [0, 11.2, 0] }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Western hemlock archetype (slender conifer)
    archetypes.register('westernHemlock', {
      params: {
        Info: { name: 'Western Hemlock' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'trunk',
                geometry: { type: 'cylinder', params: { radius: 0.2, height: 9.2, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#694a30' } },
                children: [
                  { geometry: { type: 'cone', params: { radius: 1.6, height: 2.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2a5a3d' } }, localPosition: [0, 6.0, 0] },
                  { geometry: { type: 'cone', params: { radius: 1.2, height: 1.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#285438' } }, localPosition: [0, 7.8, 0] },
                  { geometry: { type: 'cone', params: { radius: 0.7, height: 1.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#254f34' } }, localPosition: [0, 9.2, 0] }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Shore pine archetype (windswept coastal conifer)
    archetypes.register('shorePine', {
      params: {
        Info: { name: 'Shore Pine' },
        Body: {
          type: 'composite', params: {
            parts: [
              {
                tag: 'trunk', geometry: { type: 'cylinder', params: { radius: 0.2, height: 7.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b4b31' } }, localRotation: [0, 0, 0.15], children: [
                  { geometry: { type: 'cone', params: { radius: 1.8, height: 2.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2b5a3d' } }, localPosition: [-0.3, 5.2, 0.1] },
                  { geometry: { type: 'cone', params: { radius: 1.3, height: 1.7, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2a5638' } }, localPosition: [0.2, 6.6, -0.2] },
                  { geometry: { type: 'cone', params: { radius: 0.9, height: 1.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#264d33' } }, localPosition: [0.1, 7.6, 0.1] }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Red alder archetype (deciduous near waterways)
    archetypes.register('redAlder', {
      params: {
        Info: { name: 'Red Alder' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.18, height: 5.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7a6e5e' } } },
              { geometry: { type: 'sphere', params: { radius: 1.7 } }, material: { type: 'solid', params: { color: '#4a7d4c' } }, localPosition: [0.2, 4.3, 0] },
              { geometry: { type: 'sphere', params: { radius: 1.3 } }, material: { type: 'solid', params: { color: '#3f6f44' } }, localPosition: [1.1, 3.6, -0.6] },
              { geometry: { type: 'sphere', params: { radius: 1.0 } }, material: { type: 'solid', params: { color: '#3a6a41' } }, localPosition: [-1.0, 3.4, 0.5] },
              { geometry: { type: 'sphere', params: { radius: 0.8 } }, material: { type: 'solid', params: { color: '#3d7347' } }, localPosition: [0.9, 3.0, 0.8] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Bigleaf maple archetype (broad deciduous canopy)
    archetypes.register('bigleafMaple', {
      params: {
        Info: { name: 'Bigleaf Maple' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.24, height: 6.6, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b5a3e' } } },
              { geometry: { type: 'sphere', params: { radius: 2.4 } }, material: { type: 'solid', params: { color: '#4a8f49' } }, localPosition: [0.2, 5.1, 0] },
              { geometry: { type: 'sphere', params: { radius: 2.0 } }, material: { type: 'solid', params: { color: '#428642' } }, localPosition: [-1.4, 4.3, 0.6] },
              { geometry: { type: 'sphere', params: { radius: 1.8 } }, material: { type: 'solid', params: { color: '#3b7a3b' } }, localPosition: [1.2, 4.0, -0.6] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Vine maple archetype (mid-story deciduous)
    archetypes.register('vineMaple', {
      params: {
        Info: { name: 'Vine Maple' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.12, height: 3.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#70593f' } } },
              { geometry: { type: 'sphere', params: { radius: 1.2 } }, material: { type: 'solid', params: { color: '#3c7a43' } }, localPosition: [0.3, 3.0, 0.2] },
              { geometry: { type: 'sphere', params: { radius: 1.0 } }, material: { type: 'solid', params: { color: '#2f6036' } }, localPosition: [-0.9, 2.6, -0.3] },
              { geometry: { type: 'sphere', params: { radius: 0.8 } }, material: { type: 'solid', params: { color: '#2b5532' } }, localPosition: [0.6, 2.5, -0.5] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Salal shrub archetype
    archetypes.register('salal', {
      params: {
        Info: { name: 'Salal' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'sphere', params: { radius: 0.28 } }, material: { type: 'solid', params: { color: '#2e5839' } } },
              { geometry: { type: 'sphere', params: { radius: 0.22 } }, material: { type: 'solid', params: { color: '#2a5235' } }, localPosition: [0.25, 0.05, 0] },
              { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#274c31' } }, localPosition: [-0.22, 0.03, 0.12] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Huckleberry shrub archetype
    archetypes.register('huckleberry', {
      params: {
        Info: { name: 'Huckleberry' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'sphere', params: { radius: 0.26 } }, material: { type: 'solid', params: { color: '#2b5537' } } },
              { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#244b30' } }, localPosition: [0.2, 0.03, -0.1] },
              { geometry: { type: 'sphere', params: { radius: 0.18 } }, material: { type: 'solid', params: { color: '#213f2a' } }, localPosition: [-0.18, 0.02, 0.14] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Fern archetype (understory)
    archetypes.register('fern', {
      params: {
        Info: { name: 'Fern' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cone', params: { radius: 0.22, height: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3b7a4a' } } },
              { geometry: { type: 'cone', params: { radius: 0.18, height: 0.32, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2f6b3f' } }, localPosition: [0.18, 0, 0] },
              { geometry: { type: 'cone', params: { radius: 0.16, height: 0.28, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2a5f38' } }, localPosition: [-0.16, 0, 0.08] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Trail marker archetype
    archetypes.register('trailMarker', {
      params: {
        Info: { name: 'Trail Marker', description: 'A wayfinding post along the trail.' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.12, height: 1.6, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#8b5a2b' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.2, lengthZ: 0.05 } },
                material: { type: 'solid', params: { color: '#f0f0a0' } },
                localPosition: [0, 1.0, 0.2]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'discover', params: {}, target: 'self' }
          ] }]
      }
    });

    // Vista plaque archetype
    archetypes.register('vistaPlaque', {
      params: {
        Info: { name: 'Vista Point', description: 'A scenic overlook worth noting in your log.' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 0.2, lengthZ: 1.0, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6b5b4a' } }
              },
              {
                geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 0.6, lengthZ: 0.1 } },
                material: { type: 'solid', params: { color: '#f7e8b6' } },
                localPosition: [0, 0.5, 0.55]
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'discover', params: {}, target: 'self' }
          ] }]
      }
    });

    // Rock and deadwood archetypes
    archetypes.register('rock', {
      params: {
        Info: { name: 'Rock' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'icosahedron', params: { radius: 0.8 } }, material: { type: 'solid', params: { color: '#7f7466' } } }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });
    archetypes.register('boulder', {
      params: {
        Info: { name: 'Boulder' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'icosahedron', params: { radius: 1.8 } }, material: { type: 'solid', params: { color: '#6e6558' } } }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });
    archetypes.register('fallenLog', {
      params: {
        Info: { name: 'Fallen Log' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.18, height: 4.0 } }, material: { type: 'solid', params: { color: '#7a5a39' } }, localRotation: [0, 0, Math.PI / 2] },
              { geometry: { type: 'sphere', params: { radius: 0.2 } }, material: { type: 'solid', params: { color: '#6b4b2d' } }, localPosition: [1.8, 0, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });
    archetypes.register('stump', {
      params: {
        Info: { name: 'Stump' },
        Body: {
          type: 'composite', params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.25, height: 0.6, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#705233' } } },
              { geometry: { type: 'cylinder', params: { radius: 0.26, height: 0.05 } }, material: { type: 'solid', params: { color: '#886742' } }, localPosition: [0, 0.55, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // (Removed tide pool archetype; global sea level covers coastal water)

    // Items
    const makePickup = (name, bodyDef, mass = 0.4) => ({
      Info: { name },
      Body: { type: 'composite', params: { parts: bodyDef } },
      MotionSource: { type: 'dynamicRigidBody', params: { mass } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
    });

    const FieldGuideItem = makePickup('Field Guide', [
      { geometry: { type: 'box', params: { lengthX: 0.18, lengthY: 0.03, lengthZ: 0.25 } }, material: { type: 'solid', params: { color: '#3c5a9a' } } },
      { geometry: { type: 'box', params: { lengthX: 0.17, lengthY: 0.031, lengthZ: 0.24 } }, material: { type: 'solid', params: { color: '#eae6da' } }, localPosition: [0, 0.015, 0] }
    ], 0.3);

    const CompassItem = makePickup('Compass', [
      { geometry: { type: 'cylinder', params: { radius: 0.09, height: 0.04 } }, material: { type: 'solid', params: { color: '#c0c0c0' } } },
      { geometry: { type: 'cylinder', params: { radius: 0.085, height: 0.02 } }, material: { type: 'solid', params: { color: '#1b1b1b' } }, localPosition: [0, 0.03, 0] }
    ], 0.2);

    const ThermosItem = makePickup('Thermos', [
      { geometry: { type: 'cylinder', params: { radius: 0.07, height: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#2f6f6f' } } },
      { geometry: { type: 'cylinder', params: { radius: 0.06, height: 0.08, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#e0e0e0' } }, localPosition: [0, 0.35, 0] }
    ], 0.45);

    const RainPonchoItem = makePickup('Rain Poncho', [
      { geometry: { type: 'cone', params: { radius: 0.22, height: 0.25 } }, material: { type: 'solid', params: { color: '#4a7c9c' } }, localRotation: [0, 0, 0] }
    ], 0.25);

    const MushroomItem = makePickup('Mushroom', [
      { geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.14, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#f5f1e6' } } },
      { geometry: { type: 'cone', params: { radius: 0.1, height: 0.06 } }, material: { type: 'solid', params: { color: '#d5a51a' } }, localPosition: [0, 0.14, 0] }
    ], 0.05);

    const FirstAidItem = makePickup('First Aid Kit', [
      { geometry: { type: 'box', params: { lengthX: 0.35, lengthY: 0.12, lengthZ: 0.25 } }, material: { type: 'solid', params: { color: '#c0392b' } } },
      { geometry: { type: 'box', params: { lengthX: 0.18, lengthY: 0.02, lengthZ: 0.04 } }, material: { type: 'solid', params: { color: '#ffffff' } }, localPosition: [0, 0.07, 0] },
      { geometry: { type: 'box', params: { lengthX: 0.04, lengthY: 0.02, lengthZ: 0.18 } }, material: { type: 'solid', params: { color: '#ffffff' } }, localPosition: [0, 0.07, 0] }
    ], 0.6);

    // The coastal lookout tower archetype with a full stair run
    const stairParts = [];
    const stepCount = 20;
    const stepRise = 0.4;
    const stepRun = 0.6;
    const stairTopZ = 4.4;
    const stairEntryZ = stairTopZ + stepRun * (stepCount - 1);
    for (let i = 0; i < stepCount; i++) {
      stairParts.push({
        geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.2, lengthZ: stepRun } },
        material: { type: 'solid', params: { color: '#5e4a2e' } },
        localPosition: [0, 0.2 + i * stepRise, stairEntryZ - i * stepRun]
      });
    }
    // simple handrail
    stairParts.push({
      geometry: { type: 'box', params: { lengthX: 0.1, lengthY: stepCount * stepRise + 1.0, lengthZ: 0.1 } },
      material: { type: 'solid', params: { color: '#4e3b21' } },
      localPosition: [-1.0, (stepCount * stepRise) * 0.5 + 0.4, (stairEntryZ + stairTopZ) * 0.5]
    });
    // landing to meet the deck edge and a support post at the base of the stairs
    stairParts.push({
      geometry: { type: 'box', params: { lengthX: 2.4, lengthY: 0.25, lengthZ: 1.8 } },
      material: { type: 'solid', params: { color: '#6b5435' } },
      localPosition: [0, 8.0, stairTopZ + 1.0]
    });
    stairParts.push({
      geometry: { type: 'cylinder', params: { radius: 0.18, height: 8.0, pivot: 'bottom' } },
      material: { type: 'solid', params: { color: '#64482a' } },
      localPosition: [0.9, 0, stairEntryZ - 1.5]
    });

    const deckHeight = 8.0;
    const deckSize = 9.0;
    const cabinSize = 5.6;
    const cabinHalf = cabinSize * 0.5;
    const cabinHeight = 2.6;
    const cabinBottom = deckHeight + 0.4;
    const cabinTop = cabinBottom + cabinHeight;
    const railingY = deckHeight + 0.8;
    const doorWidth = 1.6;
    const frontPanelWidth = (cabinSize - doorWidth) * 0.5;
    const doorSideOffset = doorWidth * 0.5 + frontPanelWidth * 0.5;
    const doorTopY = cabinBottom + cabinHeight - 0.2;
    const doorLintelThickness = 0.2;
    const doorFillerHeight = 0.35;
    const fillerThickness = 0.24;
    const fillerInset = 0.04;
    const fillerY = doorTopY + doorFillerHeight * 0.5 + 0.02;

    const makeWindowGlass = (params, localPosition, localRotation = [0, 0, 0]) => ({
      geometry: { type: 'box', params },
      material: { type: 'solid', params: { color: '#a8c8d6', opacity: 0.7 } },
      localPosition,
      localRotation
    });

    const cabinStructureParts = [
      // Floor inlay and roof
      { geometry: { type: 'box', params: { lengthX: cabinSize, lengthY: 0.12, lengthZ: cabinSize } }, material: { type: 'solid', params: { color: '#7a6649' } }, localPosition: [0, cabinBottom - 0.2, 0] },
      { geometry: { type: 'box', params: { lengthX: cabinSize + 0.4, lengthY: 0.2, lengthZ: cabinSize + 0.4 } }, material: { type: 'solid', params: { color: '#4f5c63' } }, localPosition: [0, cabinTop + 0.2, 0] }
    ];

    const cornerOffsets = [
      [-cabinHalf + 0.15, cabinHalf - 0.15],
      [cabinHalf - 0.15, cabinHalf - 0.15],
      [-cabinHalf + 0.15, -cabinHalf + 0.15],
      [cabinHalf - 0.15, -cabinHalf + 0.15]
    ];
    for (const [ox, oz] of cornerOffsets) {
      cabinStructureParts.push({
        geometry: { type: 'box', params: { lengthX: 0.25, lengthY: cabinHeight + 0.4, lengthZ: 0.25 } },
        material: { type: 'solid', params: { color: '#4d3c26' } },
        localPosition: [ox, cabinBottom + cabinHeight * 0.5, oz]
      });
    }

    // Front lower wall segments framing the doorway
    cabinStructureParts.push(
      { geometry: { type: 'box', params: { lengthX: frontPanelWidth, lengthY: 0.6, lengthZ: 0.22 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [-doorWidth * 0.5 - frontPanelWidth * 0.5, cabinBottom + 0.4, cabinHalf - 0.05] },
      { geometry: { type: 'box', params: { lengthX: frontPanelWidth, lengthY: 0.6, lengthZ: 0.22 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [doorWidth * 0.5 + frontPanelWidth * 0.5, cabinBottom + 0.4, cabinHalf - 0.05] },
      { geometry: { type: 'box', params: { lengthX: cabinSize, lengthY: 0.25, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [0, cabinBottom + cabinHeight - 0.35, cabinHalf - 0.05] },
      { geometry: { type: 'box', params: { lengthX: doorWidth, lengthY: doorLintelThickness, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [0, doorTopY - doorLintelThickness * 0.5, cabinHalf - 0.05] },
      { geometry: { type: 'box', params: { lengthX: cabinSize, lengthY: doorFillerHeight, lengthZ: fillerThickness } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [0, fillerY, cabinHalf - fillerInset] },
      { geometry: { type: 'box', params: { lengthX: 0.22, lengthY: cabinHeight - 0.2, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [-doorWidth * 0.5, cabinBottom + cabinHeight * 0.5, cabinHalf - 0.05] },
      { geometry: { type: 'box', params: { lengthX: 0.22, lengthY: cabinHeight - 0.2, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [doorWidth * 0.5, cabinBottom + cabinHeight * 0.5, cabinHalf - 0.05] }
    );

    // Lower panels for the other walls
    cabinStructureParts.push(
      { geometry: { type: 'box', params: { lengthX: cabinSize - 0.4, lengthY: 0.6, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [0, cabinBottom + 0.4, -cabinHalf + 0.05] },
      { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.6, lengthZ: cabinSize - 0.4 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [-cabinHalf + 0.05, cabinBottom + 0.4, 0] },
      { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.6, lengthZ: cabinSize - 0.4 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [cabinHalf - 0.05, cabinBottom + 0.4, 0] },
      { geometry: { type: 'box', params: { lengthX: cabinSize - 0.4, lengthY: 0.25, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [0, cabinBottom + cabinHeight - 0.35, -cabinHalf + 0.05] },
      { geometry: { type: 'box', params: { lengthX: cabinSize - 0.4, lengthY: doorFillerHeight, lengthZ: fillerThickness } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [0, fillerY, -cabinHalf + fillerInset] },
      { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.25, lengthZ: cabinSize - 0.4 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [-cabinHalf + 0.05, cabinBottom + cabinHeight - 0.35, 0] },
      { geometry: { type: 'box', params: { lengthX: fillerThickness, lengthY: doorFillerHeight, lengthZ: cabinSize - 0.4 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [-cabinHalf + fillerInset, fillerY, 0] },
      { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.25, lengthZ: cabinSize - 0.4 } }, material: { type: 'solid', params: { color: '#4d3c26' } }, localPosition: [cabinHalf - 0.05, cabinBottom + cabinHeight - 0.35, 0] },
      { geometry: { type: 'box', params: { lengthX: fillerThickness, lengthY: doorFillerHeight, lengthZ: cabinSize - 0.4 } }, material: { type: 'solid', params: { color: '#6a8598' } }, localPosition: [cabinHalf - fillerInset, fillerY, 0] }
    );

    // Window glass and mullions
    const frontWindowWidth = frontPanelWidth - 0.3;
    cabinStructureParts.push(
      makeWindowGlass({ lengthX: frontWindowWidth, lengthY: 1.6, lengthZ: 0.04 }, [-doorSideOffset, cabinBottom + 1.4, cabinHalf - 0.08]),
      makeWindowGlass({ lengthX: frontWindowWidth, lengthY: 1.6, lengthZ: 0.04 }, [doorSideOffset, cabinBottom + 1.4, cabinHalf - 0.08])
    );

    cabinStructureParts.push(
      makeWindowGlass({ lengthX: cabinSize - 0.6, lengthY: 1.6, lengthZ: 0.04 }, [0, cabinBottom + 1.4, -cabinHalf + 0.08]),
      makeWindowGlass({ lengthX: 0.04, lengthY: 1.6, lengthZ: cabinSize - 0.6 }, [-cabinHalf + 0.08, cabinBottom + 1.4, 0]),
      makeWindowGlass({ lengthX: 0.04, lengthY: 1.6, lengthZ: cabinSize - 0.6 }, [cabinHalf - 0.08, cabinBottom + 1.4, 0])
    );

    const windowMullions = [
      { localPosition: [0, cabinBottom + 1.4, -cabinHalf + 0.05], lengthX: 0.15 },
      { localPosition: [-cabinHalf + 0.05, cabinBottom + 1.4, 0], lengthX: 0.15, rotation: [0, Math.PI / 2, 0] },
      { localPosition: [cabinHalf - 0.05, cabinBottom + 1.4, 0], lengthX: 0.15, rotation: [0, Math.PI / 2, 0] }
    ];
    for (const mullion of windowMullions) {
      cabinStructureParts.push({
        geometry: { type: 'box', params: { lengthX: mullion.lengthX, lengthY: 1.6, lengthZ: 0.08 } },
        material: { type: 'solid', params: { color: '#4d3c26' } },
        localPosition: mullion.localPosition,
        localRotation: mullion.rotation || [0, 0, 0]
      });
    }

    const cabinInteriorParts = [
      // Map table in the center
      { geometry: { type: 'cylinder', params: { radius: 0.5, height: 0.9 } }, material: { type: 'solid', params: { color: '#615040' } }, localPosition: [0, cabinBottom + 0.45, 0] },
      { geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 0.1, lengthZ: 1.6 } }, material: { type: 'solid', params: { color: '#d8c79b' } }, localPosition: [0, cabinBottom + 0.95, 0] },
      // Workbench with equipment along the west wall
      { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.8, lengthZ: 2.6 } }, material: { type: 'solid', params: { color: '#4a3a2a' } }, localPosition: [-cabinHalf + 0.5, cabinBottom + 0.4, -0.4] },
      { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.2, lengthZ: 2.6 } }, material: { type: 'solid', params: { color: '#6f8c99' } }, localPosition: [-cabinHalf + 0.5, cabinBottom + 0.95, -0.4] },
      { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.4, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#d5542c' } }, localPosition: [-cabinHalf + 0.45, cabinBottom + 1.25, 0.4] },
      { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.25, lengthZ: 0.8 } }, material: { type: 'solid', params: { color: '#ffe0a6' } }, localPosition: [-cabinHalf + 0.45, cabinBottom + 1.2, -0.9] },
      // Storage shelves on the east wall
      { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 1.4, lengthZ: 2.2 } }, material: { type: 'solid', params: { color: '#5b4a32' } }, localPosition: [cabinHalf - 0.4, cabinBottom + 0.9, 0.5] },
      { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.25, lengthZ: 0.9 } }, material: { type: 'solid', params: { color: '#3c8c8f' } }, localPosition: [cabinHalf - 0.5, cabinBottom + 1.4, 0.0] },
      { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.25, lengthZ: 0.9 } }, material: { type: 'solid', params: { color: '#cb7f1f' } }, localPosition: [cabinHalf - 0.5, cabinBottom + 1.1, 0.8] },
      // Bunk and gear along the back wall
      { geometry: { type: 'box', params: { lengthX: 2.0, lengthY: 0.4, lengthZ: 0.8 } }, material: { type: 'solid', params: { color: '#8b3d33' } }, localPosition: [0.8, cabinBottom + 0.4, -cabinHalf + 0.6] },
      { geometry: { type: 'box', params: { lengthX: 2.0, lengthY: 0.15, lengthZ: 0.8 } }, material: { type: 'solid', params: { color: '#d7c3a0' } }, localPosition: [0.8, cabinBottom + 0.7, -cabinHalf + 0.6] },
      { geometry: { type: 'cylinder', params: { radius: 0.25, height: 0.45 } }, material: { type: 'solid', params: { color: '#2f2f2f' } }, localPosition: [-0.8, cabinBottom + 0.23, -cabinHalf + 0.5] },
      { geometry: { type: 'box', params: { lengthX: 0.8, lengthY: 0.5, lengthZ: 0.5 } }, material: { type: 'solid', params: { color: '#f5d15f' } }, localPosition: [-0.8, cabinBottom + 0.65, -cabinHalf + 0.45] },
      // Chairs near the table
      { geometry: { type: 'cylinder', params: { radius: 0.18, height: 0.45 } }, material: { type: 'solid', params: { color: '#5a3d24' } }, localPosition: [-0.9, cabinBottom + 0.23, 0.2] },
      { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.05, lengthZ: 0.4 } }, material: { type: 'solid', params: { color: '#c58c54' } }, localPosition: [-0.9, cabinBottom + 0.5, 0.2] },
      { geometry: { type: 'cylinder', params: { radius: 0.18, height: 0.45 } }, material: { type: 'solid', params: { color: '#5a3d24' } }, localPosition: [0.9, cabinBottom + 0.23, -0.3] },
      { geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.05, lengthZ: 0.4 } }, material: { type: 'solid', params: { color: '#c58c54' } }, localPosition: [0.9, cabinBottom + 0.5, -0.3] },
      // Entry mat
      // Entry mat removed
    ];

    const railingGapWidth = 2.4;
    const frontRailingSegmentLength = (deckSize - railingGapWidth) * 0.5;
    const frontRailingOffset = railingGapWidth * 0.5 + frontRailingSegmentLength * 0.5;

    archetypes.register('coastalLookoutTower', {
      params: {
        Info: { name: 'Coastal Lookout Tower', description: 'A ranger tower watching the foggy shore.' },
        MotionSource: { type: 'static', params: {} },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Four legs
              { geometry: { type: 'cylinder', params: { radius: 0.25, height: 8.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6e5234' } }, localPosition: [3, 0, 3] },
              { geometry: { type: 'cylinder', params: { radius: 0.25, height: 8.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6e5234' } }, localPosition: [-3, 0, 3] },
              { geometry: { type: 'cylinder', params: { radius: 0.25, height: 8.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6e5234' } }, localPosition: [3, 0, -3] },
              { geometry: { type: 'cylinder', params: { radius: 0.25, height: 8.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6e5234' } }, localPosition: [-3, 0, -3] },

              // Deck
              { geometry: { type: 'box', params: { lengthX: deckSize, lengthY: 0.3, lengthZ: deckSize } }, material: { type: 'solid', params: { color: '#7b6242' } }, localPosition: [0, deckHeight, 0] },

              // Railings
              { geometry: { type: 'box', params: { lengthX: deckSize, lengthY: 1.0, lengthZ: 0.15 } }, material: { type: 'solid', params: { color: '#5a4a2e' } }, localPosition: [0, railingY, -deckSize * 0.5 + 0.1] },
              { geometry: { type: 'box', params: { lengthX: frontRailingSegmentLength, lengthY: 1.0, lengthZ: 0.15 } }, material: { type: 'solid', params: { color: '#5a4a2e' } }, localPosition: [-frontRailingOffset, railingY, stairTopZ] },
              { geometry: { type: 'box', params: { lengthX: frontRailingSegmentLength, lengthY: 1.0, lengthZ: 0.15 } }, material: { type: 'solid', params: { color: '#5a4a2e' } }, localPosition: [frontRailingOffset, railingY, stairTopZ] },
              { geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 1.0, lengthZ: deckSize } }, material: { type: 'solid', params: { color: '#5a4a2e' } }, localPosition: [-deckSize * 0.5 + 0.1, railingY, 0] },
              { geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 1.0, lengthZ: deckSize } }, material: { type: 'solid', params: { color: '#5a4a2e' } }, localPosition: [deckSize * 0.5 - 0.1, railingY, 0] },

              // Cabin
              ...cabinStructureParts,
              ...cabinInteriorParts,

              // Stair run (to ground)
              ...stairParts
            ]
          }
        }
      }
    });

    // Compute a high point for tower placement by scanning the terrain
    let towerX = 0;
    let towerZ = 0;
    let towerBaseY = -Infinity;
    {
      const grid = 64; // sampling resolution across the map
      const margin = terrainSize * 0.05; // avoid extreme edges for stability
      for (let ix = 0; ix < grid; ix++) {
        for (let iz = 0; iz < grid; iz++) {
          const x = -terrainSize * 0.5 + margin + (ix / (grid - 1)) * (terrainSize - margin * 2);
          const z = -terrainSize * 0.5 + margin + (iz / (grid - 1)) * (terrainSize - margin * 2);
          const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
          if (h > towerBaseY) {
            towerBaseY = h;
            towerX = x;
            towerZ = z;
          }
        }
      }
    }

    // Spawn the tower
    spawn('coastalLookoutTower', { Transform: { x: towerX, y: towerBaseY, z: towerZ } });

    // Player starts at the tower cabin deck
    const playerStartY = towerBaseY + 9.2; // slightly above deck
    spawn('player', { Transform: { x: towerX, y: playerStartY, z: towerZ + 0.5 } });

    // Place starter items inside the tower
    spawn(FieldGuideItem, { Transform: { x: towerX + 0.6, y: towerBaseY + 9.3, z: towerZ + 0.6 } });
    spawn(CompassItem, { Transform: { x: towerX - 0.6, y: towerBaseY + 9.3, z: towerZ - 0.6 } });
    spawn(ThermosItem, { Transform: { x: towerX, y: towerBaseY + 9.35, z: towerZ - 0.1 } });
    spawn(RainPonchoItem, { Transform: { x: towerX + 0.2, y: towerBaseY + 9.3, z: towerZ - 0.4 } });

    // --- Trail system: helpers, generation, markers, and bridges ---
    const TRAIL_AVOID_RADIUS = 1.6; // tree clearance from trail centerlines
    const TRAIL_MARKER_INTERVAL = 28; // meters between markers
    const allTrailSegments = [];

    const distPointToSeg = (px, pz, ax, az, bx, bz) => {
      const vx = bx - ax, vz = bz - az;
      const wx = px - ax, wz = pz - az;
      const c1 = vx * wx + vz * wz;
      const c2 = vx * vx + vz * vz;
      const t = c2 > 0 ? Math.max(0, Math.min(1, c1 / c2)) : 0;
      const cx = ax + vx * t, cz = az + vz * t;
      return Math.hypot(px - cx, pz - cz);
    };
    const isNearTrail = (x, z, radius = TRAIL_AVOID_RADIUS) => {
      for (let i = 0; i < allTrailSegments.length; i++) {
        const s = allTrailSegments[i];
        if (distPointToSeg(x, z, s.ax, s.az, s.bx, s.bz) <= radius) return true;
      }
      return false;
    };
    // Build continuous bridge planks along the portions of a trail polyline that
    // traverse water. Sampling the entire polyline avoids gaps between segments
    // and keeps rotations aligned to the local tangent for smooth visuals.
    const spawnBridgePlanksForPolyline = (points) => {
      const sampleStep = 2.0;        // meters between polyline samples
      const deckLen = 3.2;           // length of a single deck plank
      const spacing = 2.8;           // < deckLen to ensure slight overlap
      const waterThreshold = seaLevel + 0.03;

      // Gather polyline samples with position, tangent angle, and height
      const samples = [];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const segLen = Math.hypot(dx, dz);
        const steps = Math.max(1, Math.ceil(segLen / sampleStep));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = a.x + dx * t;
          const z = a.z + dz * t;
          const y = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
          const angle = Math.atan2(dz, dx);
          samples.push({ x, z, y, angle });
        }
      }

      // Walk samples and build runs across water, then place overlapping planks
      let runStart = -1;
      const finalizeRun = (startIdx, endIdx) => {
        if (endIdx - startIdx < 2) return; // too short
        const pts = samples.slice(startIdx, endIdx + 1);
        const pStart = pts[0];
        const pEnd = pts[pts.length - 1];
        const vx = pEnd.x - pStart.x;
        const vz = pEnd.z - pStart.z;
        const total = Math.hypot(vx, vz);
        if (total < 1.0) return;
        const ux = vx / total;
        const uz = vz / total;
        const angle = Math.atan2(vz, vx);
        // Extend slightly beyond banks to tuck under land a bit
        for (let t = -0.6; t <= total + 0.6; t += spacing) {
          const x = pStart.x + ux * t;
          const z = pStart.z + uz * t;
          // Keep a consistent deck height slightly above water
          const y = seaLevel + 0.8;
          spawn({
            Info: { name: 'Footbridge' },
            Transform: { x, y, z, ry: angle + Math.PI / 2, rx: Math.PI },
            Body: {
              type: 'composite',
              params: {
                parts: [
                  // Deck
                  { geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 0.25, lengthZ: deckLen } }, material: { type: 'solid', params: { color: '#6b563e' } } },
                  // Posts
                  { geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.0, lengthZ: 0.15 } }, material: { type: 'solid', params: { color: '#4e3b21' } }, localPosition: [0, 0.6, -(deckLen * 0.5 - 0.6)] },
                  { geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.0, lengthZ: 0.15 } }, material: { type: 'solid', params: { color: '#4e3b21' } }, localPosition: [0, 0.6, (deckLen * 0.5 - 0.6)] }
                ]
              }
            },
            MotionSource: { type: 'static', params: {} }
          });
        }
      };

      for (let i = 0; i < samples.length; i++) {
        const wet = samples[i].y < waterThreshold;
        if (wet && runStart === -1) runStart = i;
        if (!wet && runStart !== -1) { finalizeRun(runStart, i - 1); runStart = -1; }
      }
      if (runStart !== -1) finalizeRun(runStart, samples.length - 1);
    };
    const addTrail = (points) => {
      // Clamp to bounds and create segments
      const clampXZ = (v) => Math.max(-terrainSize * 0.48, Math.min(terrainSize * 0.48, v));
      const pts = points.map(p => ({ x: clampXZ(p.x), z: clampXZ(p.z) }));
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        allTrailSegments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
      }
      // Build continuous bridges anywhere this trail crosses water
      spawnBridgePlanksForPolyline(pts);
      // Place markers at regular intervals along the polyline
      let acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const segLen = Math.hypot(b.x - a.x, b.z - a.z);
        let t = TRAIL_MARKER_INTERVAL - (acc % TRAIL_MARKER_INTERVAL);
        while (t < segLen) {
          const u = t / segLen;
          const x = a.x + (b.x - a.x) * u;
          const z = a.z + (b.z - a.z) * u;
          const y = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
          spawn('trailMarker', { Transform: { x, y, z } });
          t += TRAIL_MARKER_INTERVAL;
        }
        acc += segLen;
      }
    };
    // Generate multiple trails: main to coast, ridge loop, and valley traverse
    {
      // Main trail from tower to coast with gentle meander
      const pts = [];
      const len = 38;
      for (let t = 0; t < len; t++) {
        const theta = t * 0.26;
        const radius = 46 + t * 6.5;
        const biasWest = -t * 4.2;
        const x = towerX + biasWest + Math.cos(theta) * radius + Math.sin(theta * 0.6) * 6;
        const z = towerZ + Math.sin(theta) * (radius * 0.8) + Math.cos(theta * 0.55) * 5;
        pts.push({ x, z });
      }
      addTrail(pts);
    }
    {
      // Ridge loop encircling the central highlands
      const pts = [];
      const R = 120;
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const wobble = (Math.sin(i * 0.8) + Math.cos(i * 0.5)) * 4;
        const x = towerX + Math.cos(a) * (R + wobble);
        const z = towerZ + Math.sin(a) * (R * 0.75 + wobble * 0.6);
        pts.push({ x, z });
      }
      addTrail(pts);
    }
    {
      // Valley traverse north-south to exercise bridge placement
      const pts = [];
      const startZ = -terrainSize * 0.35;
      const endZ = terrainSize * 0.35;
      const steps = 40;
      const baseX = towerX - 110;
      for (let i = 0; i <= steps; i++) {
        const z = startZ + (endZ - startZ) * (i / steps);
        const x = baseX + Math.sin(z * 0.02) * 18 + Math.sin(i * 0.4) * 10;
        pts.push({ x, z });
      }
      addTrail(pts);
    }

    // Forest scatter with variety and altitude-driven composition
    for (let i = 0; i < 5200; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const dTower = Math.hypot(x - towerX, z - towerZ);
      if (dTower < 24 || h <= seaLevel || isNearTrail(x, z)) continue;

      const tMask = treeMask.sample3D(nx, 0, nz);
      const dMask = densityMask.sample3D(nx, 0, nz);
      const bMask = biomeMask.sample3D(nx, 0, nz);
      const moist = moistureMask.sample3D(nx, 0, nz);
      const slope = sampleSlope(x, z);

      // Spawn probability varies by noise masks; slightly higher base, gentler slope penalty
      const p = clamp(0.56 + 0.38 * tMask + 0.24 * dMask + 0.12 * bMask - 0.03 * slope, 0, 0.985);
      if (Math.random() > p) continue;

      // Smooth transition of conifer dominance with altitude
      const treeline = 18; // high ridges
      const coniferBias = smoothstep(seaLevel + 0.6, treeline, h); // 0 low -> 1 high
      const decidBias = 1 - coniferBias;

      // Species selection
      let type = null;
      const coastBias = smoothstep(-terrainSize * 0.45, -terrainSize * 0.05, x); // closer to west edge -> lower value
      if (Math.random() < coniferBias) {
        // conifers
        const mPos = Math.max(0, moist);
        type = pickWeighted([
          { v: 'douglasFir', w: 0.34 + 0.06 * dMask },                     // upland/generalist
          { v: 'westernRedCedar', w: 0.22 + 0.35 * mPos },                  // moist low draws
          { v: 'westernHemlock', w: 0.18 + 0.20 * bMask },                  // mixed/shaded
          { v: 'sitkaSpruce', w: 0.14 + (1 - coastBias) * 0.6 + 0.08 * mPos }, // strong coastal
          { v: 'shorePine', w: 0.08 + (1 - coastBias) * 0.5 }               // dunes/headlands
        ]);
      } else {
        // deciduous more common at lower elevations, esp. moist bands
        const lowBand = h > seaLevel + 0.2 && h < seaLevel + 3.2;
        const mPos = Math.max(0, moist);
        type = pickWeighted([
          { v: 'redAlder', w: (lowBand || mPos > 0.2) ? 0.6 : 0.25 },       // riparian
          { v: 'bigleafMaple', w: 0.4 * decidBias + 0.1 * dMask },          // open lowlands
          { v: 'vineMaple', w: 0.3 + 0.15 * bMask }                         // understory
        ]);
      }

      if (type) {
        const s = 0.85 + Math.random() * 1.1;
        spawn(type, { Transform: { x, y: h, z, sx: s, sy: s, sz: s, ry: Math.random() * Math.PI * 2 } });
      }
    }

    // Conifer cluster passes near coast and ridgelines
    for (let c = 0; c < 20; c++) {
      const cx = -terrainSize * 0.3 + (Math.random() - 0.5) * terrainSize * 0.4;
      const cz = (Math.random() - 0.5) * terrainSize * 0.8;
      const baseH = heightField.sample3D(cx / terrainSize, 0, cz / terrainSize);
      for (let j = 0; j < 52; j++) {
        const rx = (Math.random() - 0.5) * 20;
        const rz = (Math.random() - 0.5) * 20;
        const x = cx + rx;
        const z = cz + rz;
        const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
        const sl = sampleSlope(x, z);
        if (Math.abs(h - baseH) < 3 && sl < 1.0 && h > seaLevel && !isNearTrail(x, z)) {
          const type = Math.random() < 0.5 ? 'sitkaSpruce' : (Math.random() < 0.6 ? 'douglasFir' : 'shorePine');
          const s = 0.95 + Math.random() * 1.05;
          spawn(type, { Transform: { x, y: h, z, sx: s, sy: s, sz: s } });
        }
      }
    }

    // Deciduous clusters in low moist bands
    for (let c = 0; c < 14; c++) {
      const cx = (Math.random() - 0.5) * terrainSize * 0.8;
      const cz = (Math.random() - 0.5) * terrainSize * 0.8;
      const baseH = heightField.sample3D(cx / terrainSize, 0, cz / terrainSize);
      if (baseH < seaLevel + 0.2 || baseH > seaLevel + 3.5) continue;
      for (let j = 0; j < 40; j++) {
        const x = cx + (Math.random() - 0.5) * 16;
        const z = cz + (Math.random() - 0.5) * 16;
        const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
        const sl = sampleSlope(x, z);
        if (Math.abs(h - baseH) < 1.2 && sl < 1.0 && h > seaLevel && !isNearTrail(x, z)) {
          const type = Math.random() < 0.6 ? 'redAlder' : (Math.random() < 0.5 ? 'bigleafMaple' : 'vineMaple');
          const s = 0.9 + Math.random() * 0.95;
          spawn(type, { Transform: { x, y: h, z, sx: s, sy: s, sz: s } });
        }
      }
    }

    // Understory ferns near forested patches (increased density)
    for (let i = 0; i < 2400; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const m = understoryMask.sample3D(nx, 0, nz);
      const slope = sampleSlope(x, z);
      if (m > 0.25 && slope < 0.98 && h > seaLevel - 5) {
        const s = 0.8 + Math.random() * 0.6;
        spawn('fern', { Transform: { x, y: h + 0.02, z, sx: s, sy: s, sz: s } });
      }
    }

    // Salal shrubs in drier understory pockets
    for (let i = 0; i < 1700; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const moist = moistureMask.sample3D(nx, 0, nz);
      const dTower = Math.hypot(x - towerX, z - towerZ);
      const slope = sampleSlope(x, z);
      if (moist < 0.1 && dTower > 18 && h > seaLevel - 4 && slope < 0.98) {
        const s = 0.9 + Math.random() * 0.8;
        spawn('salal', { Transform: { x, y: h + 0.01, z, sx: s, sy: s, sz: s } });
      }
    }

    // Huckleberry shrubs in moist/partial shade areas
    for (let i = 0; i < 1500; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const moist = moistureMask.sample3D(nx, 0, nz);
      const dTower = Math.hypot(x - towerX, z - towerZ);
      const slope = sampleSlope(x, z);
      if (moist > -0.15 && dTower > 18 && h > seaLevel - 4 && slope < 0.98) {
        const s = 0.85 + Math.random() * 0.7;
        spawn('huckleberry', { Transform: { x, y: h + 0.01, z, sx: s, sy: s, sz: s } });
      }
    }

    // Shrub cluster patches to create variety
    for (let c = 0; c < 28; c++) {
      const cx = (Math.random() - 0.5) * terrainSize * 0.9;
      const cz = (Math.random() - 0.5) * terrainSize * 0.9;
      const nx = cx / terrainSize;
      const nz = cz / terrainSize;
      const baseH = heightField.sample3D(nx, 0, nz);
      const u = understoryMask.sample3D(nx, 0, nz);
      const d = densityMask.sample3D(nx, 0, nz);
      if (u > 0.25 && d < 0) {
        const count = 26 + Math.floor(Math.random() * 22);
        for (let j = 0; j < count; j++) {
          const rx = (Math.random() - 0.5) * 8;
          const rz = (Math.random() - 0.5) * 8;
          const x = cx + rx;
          const z = cz + rz;
          const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
          if (Math.abs(h - baseH) < 1.2) {
            const s = 0.85 + Math.random() * 0.9;
            const shrub = Math.random() < 0.55 ? 'salal' : 'huckleberry';
            spawn(shrub, { Transform: { x, y: h + 0.01, z, sx: s, sy: s, sz: s } });
          }
        }
      }
    }

    // Gap-fill shrubs for low canopy areas
    for (let i = 0; i < 1800; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const slope = sampleSlope(x, z);
      if (slope > 0.995 || h < seaLevel - 4) continue;
      const tMask = treeMask.sample3D(nx, 0, nz);
      const dMask = densityMask.sample3D(nx, 0, nz);
      const bMask = biomeMask.sample3D(nx, 0, nz);
      const moist = moistureMask.sample3D(nx, 0, nz);
      const canopyLike = clamp(0.46 + 0.34 * tMask + 0.22 * dMask + 0.06 * bMask - 0.02 * slope, 0, 1);
      if (canopyLike < 0.55 && Math.random() < (0.65 - 0.6 * canopyLike) * (0.55 + 0.45 * Math.max(0, moist))) {
        const s = 0.8 + Math.random() * 0.85;
        const shrub = pickWeighted([
          { v: 'salal', w: 0.46 + 0.22 * Math.max(0, moist) },
          { v: 'huckleberry', w: 0.40 + 0.20 * bMask },
          { v: 'fern', w: 0.38 + 0.26 * Math.max(0, moist) }
        ]);
        spawn(shrub, { Transform: { x, y: h + 0.01, z, sx: s, sy: s, sz: s } });
      }
    }

    // Rock scatter across slopes and ridges
    for (let i = 0; i < 280; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const slope = sampleSlope(x, z);
      const rocky = rockinessMask.sample3D(nx, 0, nz);
      if (h > seaLevel - 2 && rocky > 0 && slope > 0.12) {
        const s = 0.6 + Math.random() * 0.8;
        spawn('rock', { Transform: { x, y: h + 0.02, z, sx: s, sy: s, sz: s } });
      }
    }
    for (let i = 0; i < 84; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const slope = sampleSlope(x, z);
      const rocky = rockinessMask.sample3D(nx, 0, nz);
      if (h > seaLevel + 1 && rocky > 0.1 && slope > 0.18) {
        const s = 0.8 + Math.random() * 1.2;
        spawn('boulder', { Transform: { x, y: h + 0.04, z, sx: s, sy: s, sz: s } });
      }
    }

    // Fallen logs and stumps in dense forest, on gentler slopes
    for (let i = 0; i < 170; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.95;
      const z = (Math.random() - 0.5) * terrainSize * 0.95;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = heightField.sample3D(nx, 0, nz);
      const slope = sampleSlope(x, z);
      const t = treeMask.sample3D(nx, 0, nz) + densityMask.sample3D(nx, 0, nz) * 0.5;
      if (h > seaLevel && slope < 0.95 && t > 0.3 && Math.hypot(x - towerX, z - towerZ) > 20) {
        const ry = Math.random() * Math.PI * 2;
        const s = 0.9 + Math.random() * 0.6;
        spawn('fallenLog', { Transform: { x, y: h + 0.05, z, ry, sx: s, sy: s, sz: s } });
        if (Math.random() < 0.35) {
          const dx = Math.cos(ry + Math.PI / 2) * (0.6 + Math.random() * 1.2);
          const dz = Math.sin(ry + Math.PI / 2) * (0.6 + Math.random() * 1.2);
          const sh = heightField.sample3D((x + dx) / terrainSize, 0, (z + dz) / terrainSize);
          spawn('stump', { Transform: { x: x + dx, y: sh, z: z + dz, ry: Math.random() * Math.PI * 2 } });
        }
      }
    }

    // Place scenic vista plaques on high ridges
    const vistasToPlace = 4;
    let placed = 0;
    let attempts = 0;
    while (placed < vistasToPlace && attempts < 60) {
      attempts++;
      const x = (Math.random() - 0.5) * terrainSize * 0.9;
      const z = (Math.random() - 0.5) * terrainSize * 0.9;
      const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
      // favor higher elevations away from tower
      const dTower = Math.hypot(x - towerX, z - towerZ);
      if (h > 12 && dTower > 50) {
        spawn('vistaPlaque', { Transform: { x, y: h, z } });
        // perch a rock next to it
        spawn({
          Body: {
            type: 'composite',
            params: {
              parts: [{ geometry: { type: 'icosahedron', params: { radius: 1.2 } }, material: { type: 'solid', params: { color: '#8f7a62' } } }]
            }
          },
          MotionSource: { type: 'static', params: {} },
          Transform: { x: x + (Math.random() - 0.5) * 2, y: h + 0.4, z: z + (Math.random() - 0.5) * 2 }
        });
        placed++;
      }
    }

    // (Removed explicit creek geometry; global sea level forms rivers in low channels)

    // Lighthouse on a rocky outcrop near the coast
    const lightX = -terrainSize * 0.32;
    const lightZ = terrainSize * 0.18;
    const lightY = heightField.sample3D(lightX / terrainSize, 0, lightZ / terrainSize) + 0.1;
    spawn({ Body: { type: 'composite', params: { parts: [{ geometry: { type: 'icosahedron', params: { radius: 6.5 } }, material: { type: 'solid', params: { color: '#6f675d' } } }] } }, MotionSource: { type: 'static', params: {} }, Transform: { x: lightX, y: lightY - 3.0, z: lightZ } });
    spawn({
      Info: { name: 'Lighthouse', description: 'Guiding light above the surf.' },
      Transform: { x: lightX, y: lightY + 4.2, z: lightZ },
      Body: {
        type: 'composite', params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 1.6, height: 9.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#e7ecef' } } },
            { geometry: { type: 'box', params: { lengthX: 3.6, lengthY: 0.3, lengthZ: 3.6 } }, material: { type: 'solid', params: { color: '#c3d0d7' } }, localPosition: [0, 9.0, 0] },
            { geometry: { type: 'cylinder', params: { radius: 1.2, height: 1.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d9e2e7' } }, localPosition: [0, 9.0, 0] },
            { geometry: { type: 'cone', params: { radius: 1.3, height: 0.9 } }, material: { type: 'solid', params: { color: '#8aa1ad' } }, localPosition: [0, 10.2, 0] }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
    });

    // Driftwood along the shore (approximate; near western edge above sea level)
    for (let i = 0; i < 4; i++) {
      const tx = -terrainSize * (0.42 + Math.random() * 0.06);
      const tz = (Math.random() - 0.5) * terrainSize * 0.5;
      const th = heightField.sample3D(tx / terrainSize, 0, tz / terrainSize) + 0.05;
      if (th > seaLevel - 0.2 && th < seaLevel + 0.5) {
        spawn({ Body: { type: 'composite', params: { parts: [{ geometry: { type: 'cylinder', params: { radius: 0.12, height: 2.6 } }, material: { type: 'solid', params: { color: '#8b6b43' } }, localRotation: [0, 0, Math.PI / 2] }] } }, MotionSource: { type: 'static', params: {} }, Transform: { x: tx + 1 + Math.random() * 3, y: th + 0.02, z: tz + (Math.random() - 0.5) * 3 } });
      }
    }

    // Mushroom patches in the forest
    for (let k = 0; k < 12; k++) {
      const centerX = (Math.random() - 0.5) * terrainSize * 0.8;
      const centerZ = (Math.random() - 0.5) * terrainSize * 0.8;
      const h0 = heightField.sample3D(centerX / terrainSize, 0, centerZ / terrainSize);
      for (let j = 0; j < 6 + Math.floor(Math.random() * 6); j++) {
        const rx = (Math.random() - 0.5) * 2.2;
        const rz = (Math.random() - 0.5) * 2.2;
        const x = centerX + rx;
        const z = centerZ + rz;
        const h = heightField.sample3D(x / terrainSize, 0, z / terrainSize);
        if (Math.abs(h - h0) < 0.6) {
          spawn(MushroomItem, { Transform: { x, y: h + 0.02, z } });
        }
      }
    }
  }
};
