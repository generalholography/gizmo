export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    // Initialize world declaratively
    initialize({
      title: 'Procedural City',
      description: 'A 500x500 procedural city with districts, interiors, vehicles, and a pizza delivery quest.',
      tags: ['urban', 'quest', 'open world'],
      brandColors: ['#87b5ff', '#ff9e53'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87B5FF',
          sun: {
            color: '#FFEEDD',
            intensity: 1.1,
            timeOfDay: 1530
          },
          clouds: {
            color: '#FFFFFF',
            coverage: 0.25
          },
          stars: {
            intensity: 0.0
          }
        },
        particleSystems: [{
          name: 'City Steam',
          position: [0, 10, 0],
          emitter: {
            rate: 80,
            maxParticles: 720,
            lifetime: 4,
            speed: { min: 0.1, max: 0.3 },
            spread: 0.4,
            size: 0.18,
            opacity: 0.35,
            gravity: -0.05,
            color: '#e8eef5',
            direction: [0, 1, 0],
            shape: { type: 'point' },
            localSpace: false
          }
        }]
      }],
      achievements: [
        {
          name: 'Slice to meet you',
          description: 'Pick up a pizza box from the pizza shop.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Pizza Box',
              targetValue: 1
            }
          }
        },
        {
          name: 'Ding dong',
          description: 'Ring the delivery bell at the target apartment.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Delivery Bell',
              targetValue: 1
            }
          }
        },
        {
          name: 'Sunday Driver',
          description: 'Get in a car.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Car',
              targetValue: 1
            }
          }
        },
        {
          name: 'Air certified',
          description: 'Board the helicopter on the tallest skyscraper.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Helicopter',
              targetValue: 1
            }
          }
        },
        {
          name: 'Urban Explorer',
          description: 'Visit 10 buildings across the city.',
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'discoveries', subtype: 'Skyscraper' },
                { metric: 'discoveries', subtype: 'Apartment' },
                { metric: 'discoveries', subtype: 'Shop' },
                { metric: 'discoveries', subtype: 'Parking Lot' },
                { metric: 'discoveries', subtype: 'Park' }
              ],
              targetValue: 10
            }
          }
        },
        {
          name: 'Meet the Neighbors',
          description: 'Interact with 3 citizens.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Citizen',
              targetValue: 3
            }
          }
        }
      ]
    });

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // Noise fields for district blending and height variation
    const districtField = fields.register('districtField', {
      type: 'simplex',
      params: { seed: 42, frequency: 0.8, amplitude: 1, octaves: 4 }
    });
    const heightField = fields.register('heightField', {
      type: 'simplex',
      params: { seed: 1337, frequency: 0.02, amplitude: 1, octaves: 3 }
    });
    const parkField = fields.register('parkField', {
      type: 'simplex',
      params: { seed: 7, frequency: 0.1, amplitude: 1, octaves: 2 }
    });

    // Archetypes
    archetypes.register('door', {
      type: 'bundle',
      params: {
        Info: { name: 'Door' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 1, lengthY: 2.2, lengthZ: 0.15, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7a4a2a' } } },
              { geometry: { type: 'sphere', params: { radius: 0.12 } }, material: { type: 'solid', params: { color: '#dcb253' } }, localPosition: [0.4, 1.0, 0.15] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('streetlamp', {
      type: 'bundle',
      params: {
        Info: { name: 'Streetlamp' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.1, height: 4.5, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#333333' } } },
              { geometry: { type: 'hemisphere', params: { radius: 0.35, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#ffd76a', opacity: 0.95 } }, localPosition: [0, 4.6, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('car', {
      type: 'bundle',
      params: {
        Info: { name: 'Car', description: 'A compact sedan. Press E to drive.' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { tag: 'chassis', geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.6, lengthZ: 3.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3465a4' } } },
              { geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 0.6, lengthZ: 2.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#88aadd', opacity: 0.9 } }, localPosition: [0, 0.6, -0.2] },
              { geometry: { type: 'torus', params: { majorRadius: 0.45, minorRadius: 0.15 } }, material: { type: 'solid', params: { color: '#111111' } }, localPosition: [0.9, 0, 1.2], localRotation: [0, 0, Math.PI / 2] },
              { geometry: { type: 'torus', params: { majorRadius: 0.45, minorRadius: 0.15 } }, material: { type: 'solid', params: { color: '#111111' } }, localPosition: [-0.9, 0, 1.2], localRotation: [0, 0, Math.PI / 2] },
              { geometry: { type: 'torus', params: { majorRadius: 0.45, minorRadius: 0.15 } }, material: { type: 'solid', params: { color: '#111111' } }, localPosition: [0.9, 0, -1.2], localRotation: [0, 0, Math.PI / 2] },
              { geometry: { type: 'torus', params: { majorRadius: 0.45, minorRadius: 0.15 } }, material: { type: 'solid', params: { color: '#111111' } }, localPosition: [-0.9, 0, -1.2], localRotation: [0, 0, Math.PI / 2] }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 10, jumpHeight: 0, canFly: false } },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'discover', params: {}, target: 'self' },
            { type: 'mount', params: { offset: [0, 0.9, 0] }, target: 'self' }
          ] }]
      }
    });

    archetypes.register('helicopter', {
      type: 'bundle',
      params: {
        Info: { name: 'Helicopter', description: 'A light helicopter. Press E to pilot.' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { tag: 'body', geometry: { type: 'cylinder', params: { radius: 0.8, height: 3.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#c33' } }, localRotation: [Math.PI / 2, 0, 0] },
              { tag: 'rotorA', geometry: { type: 'box', params: { lengthX: 0.1, lengthY: 0.1, lengthZ: 6.0, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#222' } }, localPosition: [0, 1.2, 0] },
              { tag: 'rotorB', geometry: { type: 'box', params: { lengthX: 6.0, lengthY: 0.1, lengthZ: 0.1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#222' } }, localPosition: [0, 1.2, 0] },
              { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.15, lengthZ: 0.15 } }, material: { type: 'solid', params: { color: '#333' } }, localPosition: [0, -0.5, 0.9] }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 14, jumpHeight: 0, canFly: true } },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'discover', params: {}, target: 'self' },
            { type: 'mount', params: { offset: [0, 0.6, 0] }, target: 'self' }
          ] }]
      }
    });

    // Furniture
    archetypes.register('chair', {
      type: 'bundle',
      params: {
        Info: { name: 'Chair' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.1, lengthZ: 0.6 } }, material: { type: 'solid', params: { color: '#886644' } }, localPosition: [0, 0.45, 0] },
              { geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.7, lengthZ: 0.1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#886644' } }, localPosition: [0, 0.45, -0.25] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('table', {
      type: 'bundle',
      params: {
        Info: { name: 'Table' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 0.1, lengthZ: 0.9 } }, material: { type: 'solid', params: { color: '#915a2a' } }, localPosition: [0, 0.8, 0] },
              { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5a3b1f' } }, localPosition: [0.7, 0, 0.35] },
              { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5a3b1f' } }, localPosition: [-0.7, 0, 0.35] },
              { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5a3b1f' } }, localPosition: [0.7, 0, -0.35] },
              { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5a3b1f' } }, localPosition: [-0.7, 0, -0.35] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('sofa', {
      type: 'bundle',
      params: {
        Info: { name: 'Sofa' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.5, lengthZ: 0.9 } }, material: { type: 'solid', params: { color: '#4e6b6b' } }, localPosition: [0, 0.25, 0] },
              { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.7, lengthZ: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5b7878' } }, localPosition: [0, 0.5, -0.35] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('bed', {
      type: 'bundle',
      params: {
        Info: { name: 'Bed' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 2.0, lengthY: 0.4, lengthZ: 1.2 } }, material: { type: 'solid', params: { color: '#b79c77' } }, localPosition: [0, 0.2, 0] },
              { geometry: { type: 'box', params: { lengthX: 2.0, lengthY: 0.6, lengthZ: 0.2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#eee' } }, localPosition: [0, 0.4, -0.5] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('shelf', {
      type: 'bundle',
      params: {
        Info: { name: 'Shelf' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.6, lengthZ: 0.3, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#8d6e63' } } }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    archetypes.register('bench', {
      type: 'bundle',
      params: {
        Info: { name: 'Bench' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.1, lengthZ: 0.5 } }, material: { type: 'solid', params: { color: '#6b4f2a' } }, localPosition: [0, 0.5, 0] },
              { geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.6, lengthZ: 0.1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b4f2a' } }, localPosition: [0, 0.5, -0.25] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      }
    });

    // Citizens (friendly NPCs)
    archetypes.register('citizen', {
      type: 'bundle',
      params: {
        Info: { name: 'Citizen' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              tag: 'spine',
              geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.3 } },
              material: { type: 'solid', params: { color: '#d2c1a9' } },
              localPosition: [0, 0, 0],
              children: [
                { tag: 'head', geometry: { type: 'sphere', params: { radius: 0.25, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#e9d7c3' } }, localPosition: [0, 0.6, 0] },
                { tag: 'arm_r', geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 0.8, lengthZ: 0.15, pivot: 'top' } }, material: { type: 'solid', params: { color: '#b59b80' } }, localPosition: [0.45, 0.6, 0] },
                { tag: 'arm_l', geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 0.8, lengthZ: 0.15, pivot: 'top' } }, material: { type: 'solid', params: { color: '#b59b80' } }, localPosition: [-0.45, 0.6, 0] },
                { tag: 'leg_r', geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 1.0, lengthZ: 0.15, pivot: 'top' } }, material: { type: 'solid', params: { color: '#6e6e6e' } }, localPosition: [0.2, -0.6, 0] },
                { tag: 'leg_l', geometry: { type: 'box', params: { lengthX: 0.15, lengthY: 1.0, lengthZ: 0.15, pivot: 'top' } }, material: { type: 'solid', params: { color: '#6e6e6e' } }, localPosition: [-0.2, -0.6, 0] }
              ]
            }]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 2.5, jumpHeight: 2, canFly: false } },
        AI: { isAggressive: false, awarenessRange: 0 },
        Faction: { id: 'player_faction' },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
      }
    });

    // Quest items
    archetypes.register('pizza_box', {
      type: 'bundle',
      params: {
        Info: { name: 'Pizza Box', description: 'A hot pizza ready for delivery.' },
        Body: {
          type: 'composite',
          params: { parts: [{ geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.12, lengthZ: 0.5 } }, material: { type: 'solid', params: { color: '#ffefbf' } } }] }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.4 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
      }
    });

    archetypes.register('delivery_bell', {
      type: 'bundle',
      params: {
        Info: { name: 'Delivery Bell', description: 'Press E to ring the bell and complete delivery.' },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'sphere', params: { radius: 0.25 } }, material: { type: 'solid', params: { color: '#ffd700' } } }] } },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
      }
    });

    // Spawn the Player
    spawn('player', { Transform: { x: 0, y: 2, z: 0 } });

    // Base ground (very slight displacement)
    const groundField = fields.register('groundField', {
      type: 'simplex',
      params: { seed: 99, frequency: 0.002, amplitude: 0.2, octaves: 2 }
    });
    spawn({
      Info: { name: 'City Ground' },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'displacedPlane', params: { lengthX: 500, lengthZ: 500, field: 'groundField' } },
            material: { type: 'solid', params: { color: '#9db0b3', roughness: 1.0 } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // City grid config
    const citySize = 500;
    const half = citySize / 2;
    const block = 60;              // distance between road center lines
    const roadWidth = 10;
    const sidewalk = 3;
    const lotInner = block - roadWidth - 2 * sidewalk;
    const lotFootprintX = Math.max(10, lotInner * 0.85);
    const lotFootprintZ = Math.max(10, lotInner * 0.85);

    // Compute grid lines
    const xs = [];
    for (let x = -half + block / 2; x <= half - block / 2 + 0.01; x += block) xs.push(Math.round(x));
    const zs = [];
    for (let z = -half + block / 2; z <= half - block / 2 + 0.01; z += block) zs.push(Math.round(z));

    // Roads: vertical and horizontal strips
    for (let gx = -half; gx <= half; gx += block) {
      // vertical road
      spawn({
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: roadWidth, lengthY: 0.05, lengthZ: citySize + roadWidth, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3d3d3d' } } },
              // sidewalks
              { geometry: { type: 'box', params: { lengthX: sidewalk, lengthY: 0.06, lengthZ: citySize + roadWidth, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d1d1d1' } }, localPosition: [roadWidth / 2 + sidewalk / 2, 0, 0] },
              { geometry: { type: 'box', params: { lengthX: sidewalk, lengthY: 0.06, lengthZ: citySize + roadWidth, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d1d1d1' } }, localPosition: [-roadWidth / 2 - sidewalk / 2, 0, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Transform: { x: gx, y: 0, z: 0 }
      });
      // streetlamps along the sidewalks (every 50 units)
      for (let z = -half + 25; z <= half - 25; z += 50) {
        spawn('streetlamp', { Transform: { x: gx + roadWidth / 2 + sidewalk - 0.5, y: 0, z } });
        spawn('streetlamp', { Transform: { x: gx - roadWidth / 2 - sidewalk + 0.5, y: 0, z } });
      }
    }
    for (let gz = -half; gz <= half; gz += block) {
      // horizontal road
      spawn({
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: citySize + roadWidth, lengthY: 0.05, lengthZ: roadWidth, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#3d3d3d' } } },
              // sidewalks
              { geometry: { type: 'box', params: { lengthX: citySize + roadWidth, lengthY: 0.06, lengthZ: sidewalk, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d1d1d1' } }, localPosition: [0, 0, roadWidth / 2 + sidewalk / 2] },
              { geometry: { type: 'box', params: { lengthX: citySize + roadWidth, lengthY: 0.06, lengthZ: sidewalk, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d1d1d1' } }, localPosition: [0, 0, -roadWidth / 2 - sidewalk / 2] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Transform: { x: 0, y: 0, z: gz }
      });
      // streetlamps along these sidewalks too
      for (let x = -half + 25; x <= half - 25; x += 50) {
        spawn('streetlamp', { Transform: { x, y: 0, z: gz + roadWidth / 2 + sidewalk - 0.5 } });
        spawn('streetlamp', { Transform: { x, y: 0, z: gz - roadWidth / 2 - sidewalk + 0.5 } });
      }
    }

    // Helpers to spawn doors and interiors
    function spawnBuildingDoorPair(typeName, cx, cz, footprintX, footprintZ, groundY) {
      // pick the building side closest to the nearest road and face the door toward it
      const nearestX = Math.round(cx / block) * block;
      const nearestZ = Math.round(cz / block) * block;
      const dx = Math.abs(cx - nearestX);
      const dz = Math.abs(cz - nearestZ);

      let outside = { x: cx, z: cz - footprintZ / 2 - 0.1 };
      let inside = { x: cx, z: cz - footprintZ / 2 + 2.0 };
      let ryOutside = 0;

      if (dx < dz) {
        // east / west side
        const sign = nearestX >= cx ? 1 : -1; // towards the nearest road
        outside = { x: cx + sign * (footprintX / 2 + 0.1), z: cz };
        inside = { x: cx + sign * (footprintX / 2 - 2.0), z: cz };
        ryOutside = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        // north / south side
        const sign = nearestZ >= cz ? 1 : -1;
        outside = { x: cx, z: cz + sign * (footprintZ / 2 + 0.1) };
        inside = { x: cx, z: cz + sign * (footprintZ / 2 - 2.0) };
        ryOutside = sign > 0 ? 0 : Math.PI;
      }

      // outward normal for exit teleport offset
      const nx = outside.x - cx;
      const nz = outside.z - cz;
      const nlen = Math.hypot(nx, nz) || 1;
      const ox = (nx / nlen) * 1.0;
      const oz = (nz / nlen) * 1.0;

      // outside door
      spawn('door', {
        Info: { name: typeName + ' Entrance' },
        Transform: { x: outside.x, y: groundY + 1.1, z: outside.z, ry: ryOutside },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'discover', params: {}, target: 'self' },
            { type: 'teleport', params: { position: { x: inside.x, y: groundY + 1, z: inside.z } }, target: 'other' }
          ] }]
      });
      // inside door
      spawn('door', {
        Info: { name: typeName + ' Exit' },
        Transform: { x: inside.x, y: groundY + 1.1, z: inside.z, ry: ryOutside + Math.PI },
                Rules: [{ trigger: { type: 'interact' }, actions: [
            { type: 'teleport', params: { position: { x: outside.x + ox, y: groundY + 1, z: outside.z + oz } }, target: 'other' }
          ] }]
      });
    }

    function furnishInterior(typeName, cx, cz, width, depth, groundY, isPizzaShop = false) {
      const count = 4 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const fx = cx + (Math.random() - 0.5) * (width - 2);
        const fz = cz + (Math.random() - 0.5) * (depth - 2);
        const pick = Math.random();
        if (typeName === 'Apartment') {
          if (pick < 0.25) spawn('bed', { Transform: { x: fx, y: groundY, z: fz } });
          else if (pick < 0.55) spawn('sofa', { Transform: { x: fx, y: groundY, z: fz } });
          else if (pick < 0.8) spawn('table', { Transform: { x: fx, y: groundY, z: fz } });
          else spawn('chair', { Transform: { x: fx, y: groundY, z: fz } });
        } else if (typeName === 'Skyscraper') {
          if (pick < 0.5) spawn('table', { Transform: { x: fx, y: groundY, z: fz } });
          else spawn('chair', { Transform: { x: fx, y: groundY, z: fz } });
          if (Math.random() < 0.2) spawn('shelf', { Transform: { x: fx, y: groundY, z: fz + 0.8 } });
        } else if (typeName === 'Shop' || isPizzaShop) {
          if (pick < 0.5) spawn('table', { Transform: { x: fx, y: groundY, z: fz } });
          else if (pick < 0.8) spawn('shelf', { Transform: { x: fx, y: groundY, z: fz } });
          else spawn('chair', { Transform: { x: fx, y: groundY, z: fz } });
        } else {
          // generic
          spawn('chair', { Transform: { x: fx, y: groundY, z: fz } });
        }
      }
      if (isPizzaShop) {
        // place some pizza boxes on tables
        for (let i = 0; i < 4; i++) {
          const fx = cx + (Math.random() - 0.5) * (width - 3);
          const fz = cz + (Math.random() - 0.5) * (depth - 3);
          spawn('pizza_box', { Transform: { x: fx, y: groundY + 0.9, z: fz } });
        }
      }
    }

    // Variables for special content
    let tallestSkyscraper = { height: 0, cx: 0, cz: 0 };
    let deliveryBellPlaced = false;
    let pizzaShopPlaced = false;

    // Color palettes per building type for variety
    const palettes = {
      Skyscraper: ['#bfc9d6', '#a8b1ba', '#8da5b8', '#9db0b3', '#d0d7de', '#94a3b8'],
      Apartment: ['#d8b9a8', '#cfa18d', '#e0c4a8', '#e9d7c3', '#c6a992', '#deb9a3'],
      Shop: ['#e3d097', '#f5e4b8', '#e6c36a', '#d8a657', '#c9b458'],
      'Pizza Shop': ['#ff5959', '#ff6b6b', '#e24d4d', '#ff7f7f']
    };

    // Lots: choose type via noise and populate
    for (let i = 0; i < xs.length; i++) {
      for (let j = 0; j < zs.length; j++) {
        const cx = xs[i];
        const cz = zs[j];

        const nx = (cx + half) / citySize;
        const nz = (cz + half) / citySize;

        const d = (districtField.sample3D(nx, 0, nz) + 1) * 0.5; // 0..1
        // removed park field use for lot selection
        const h01 = (heightField.sample3D(nx * 2, 0, nz * 2) + 1) * 0.5;

        // New lot selection:
        // - Skyscraper determined by district noise (unchanged)
        // - Otherwise small random chance for Parking Lot or Park
        // - Otherwise Apartment/Shop by district noise
        const isSkyscraper = d > 0.68;
        let lotType;
        if (isSkyscraper) {
          lotType = 'Skyscraper';
        } else {
          const r = Math.random();
          if (r < 0.04) lotType = 'Parking Lot';        // ~4% chance
          else if (r < 0.10) lotType = 'Park';          // ~6% chance
          else if (d > 0.4) lotType = 'Apartment';
          else lotType = 'Shop';
        }

        // Reserve a central shop as Pizza Shop if not placed yet
        const distFromCenter = Math.hypot(cx, cz);
        if (!pizzaShopPlaced && lotType === 'Shop' && distFromCenter < 200) {
          lotType = 'Pizza Shop';
          pizzaShopPlaced = true;
        }

        const groundY = 0;

        if (lotType === 'Park') {
          // Green patch with benches and trees
          spawn({
            Info: { name: 'Park' },
            Body: {
              type: 'composite',
              params: {
                parts: [{
                  geometry: { type: 'box', params: { lengthX: lotFootprintX, lengthY: 0.05, lengthZ: lotFootprintZ, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#5cae57' } }
                }]
              }
            },
            MotionSource: { type: 'static', params: {} },
            Transform: { x: cx, y: groundY, z: cz }
          });
          // benches and trees
          for (let k = 0; k < 3 + Math.floor(Math.random() * 4); k++) {
            const px = cx + (Math.random() - 0.5) * (lotFootprintX - 4);
            const pz = cz + (Math.random() - 0.5) * (lotFootprintZ - 4);
            spawn('bench', { Transform: { x: px, y: groundY, z: pz } });
          }
          for (let k = 0; k < 4 + Math.floor(Math.random() * 6); k++) {
            const tx = cx + (Math.random() - 0.5) * (lotFootprintX - 6);
            const tz = cz + (Math.random() - 0.5) * (lotFootprintZ - 6);
            spawn('tree', { Transform: { x: tx, y: groundY + 0.05, z: tz } });
          }
          // door pair to "enter" the park for discovery (for consistency)
          spawnBuildingDoorPair('Park', cx, cz, lotFootprintX, lotFootprintZ, groundY);
        } else if (lotType === 'Parking Lot') {
          // Asphalt pad
          spawn({
            Info: { name: 'Parking Lot' },
            Body: {
              type: 'composite',
              params: {
                parts: [{
                  geometry: { type: 'box', params: { lengthX: lotFootprintX, lengthY: 0.05, lengthZ: lotFootprintZ, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#2c2c2c' } }
                }]
              }
            },
            MotionSource: { type: 'static', params: {} },
            Transform: { x: cx, y: groundY, z: cz }
          });

          // Neat rows of parked cars along Z, two lanes facing opposite directions
          const border = 3;
          const spots = Math.max(2, Math.floor((lotFootprintZ - border * 2) / 6.5));
          const zStart = cz - lotFootprintZ / 2 + border;
          const laneXLeft = cx - lotFootprintX / 4;
          const laneXRight = cx + lotFootprintX / 4;

          // Choose orientation to face the nearest road along Z
          const nearestZ = Math.round(cz / block) * block;
          const signZ = nearestZ >= cz ? 1 : -1;
          const ryFacing = signZ > 0 ? Math.PI : 0;

          for (let s = 0; s < spots; s++) {
            const pz = zStart + s * 6.5;
            if (Math.random() < 0.85) {
              spawn('car', { Transform: { x: laneXLeft, y: groundY + 0.05, z: pz, ry: ryFacing } });
            }
            if (Math.random() < 0.85) {
              // opposite facing
              spawn('car', { Transform: { x: laneXRight, y: groundY + 0.05, z: pz + 2.0, ry: ryFacing + Math.PI } });
            }
          }

          // Door for discovery consistency
          spawnBuildingDoorPair('Parking Lot', cx, cz, lotFootprintX, lotFootprintZ, groundY);
        } else {
          // Common building body with more varied height and color
          let height = 8;
          let color = '#c9c9c9';
          const infoName = lotType;

          if (lotType === 'Skyscraper') {
            // broader range + small jitter
            height = 35 + Math.floor(h01 * 65) + Math.floor(Math.random() * 6);
            const palette = palettes.Skyscraper;
            color = palette[Math.floor(h01 * palette.length) % palette.length];
          } else if (lotType === 'Apartment') {
            height = 9 + Math.floor(h01 * 16) + Math.floor(Math.random() * 4);
            const palette = palettes.Apartment;
            color = palette[Math.floor((1 - h01) * palette.length) % palette.length];
          } else if (lotType === 'Shop' || lotType === 'Pizza Shop') {
            height = 5 + Math.floor(h01 * 6) + (Math.random() < 0.3 ? 1 : 0);
            const palette = palettes[lotType] || palettes.Shop;
            color = palette[Math.floor(Math.random() * palette.length)];
          }

          spawn({
            Info: { name: infoName },
            Body: {
              type: 'composite',
              params: {
                hasInterior: true,
                parts: [
                  { geometry: { type: 'box', params: { lengthX: lotFootprintX, lengthY: height, lengthZ: lotFootprintZ, pivot: 'bottom' } }, material: { type: 'solid', params: { color } } }
                ]
              }
            },
            MotionSource: { type: 'static', params: {} },
            Transform: { x: cx, y: groundY, z: cz }
          });

          // Door pair (side-aware placement)
          spawnBuildingDoorPair(infoName, cx, cz, lotFootprintX, lotFootprintZ, groundY);

          // Elevator to rooftop for skyscrapers (teleports to roof)
          if (lotType === 'Skyscraper') {
            spawn('door', {
              Info: { name: 'Elevator' },
              Transform: { x: cx + lotFootprintX * 0.3, y: groundY + 1.1, z: cz - lotFootprintZ / 2 + 2.2 },
                            Rules: [{ trigger: { type: 'interact' }, actions: [
                  { type: 'teleport', params: { position: { x: cx, y: groundY + height + 1, z: cz } }, target: 'other' }
                ] }]
            });
            // track tallest
            if (height > tallestSkyscraper.height) {
              tallestSkyscraper = { height, cx, cz };
            }
          }

          // Furnish interior
          furnishInterior(infoName, cx, cz, lotFootprintX, lotFootprintZ, groundY, lotType === 'Pizza Shop');

          if (lotType === 'Pizza Shop') {
            spawn({
              Info: { name: 'Pizza Shop Aroma Vent' },
              Transform: { x: cx, y: groundY + 2.2, z: cz + lotFootprintZ / 2 + 0.6 },
              ParticleEmitter: {
                rate: 18,
                maxParticles: 160,
                lifetime: 3,
                speed: { min: 0.08, max: 0.25 },
                spread: 0.4,
                size: 0.14,
                opacity: 0.55,
                gravity: -0.03,
                color: '#ffd2a1',
                direction: [0, 1, 0],
                shape: { type: 'point' },
                localSpace: false
              },
              MotionSource: { type: 'static', params: {} }
            });
          }

          // Place pizza quest bell in the first apartment found
          if (!deliveryBellPlaced && lotType === 'Apartment') {
            deliveryBellPlaced = true;
            spawn('delivery_bell', { Transform: { x: cx, y: groundY + 1.1, z: cz - lotFootprintZ / 2 + 1.5 } });
            // A friendly citizen waiting by the bell
            spawn('citizen', { Transform: { x: cx + 1.5, y: groundY + 1.0, z: cz - lotFootprintZ / 2 + 1.5 } });
          }

          // Citizens around shops and sidewalks
          if (lotType === 'Shop' || lotType === 'Pizza Shop') {
            for (let c = 0; c < 2; c++) {
              const px = cx + (Math.random() - 0.5) * (lotFootprintX - 4);
              const pz = cz - lotFootprintZ / 2 - 2 - Math.random() * 2;
              spawn('citizen', { Transform: { x: px, y: groundY + 1, z: pz } });
            }
          }
        }
      }
    }

    // Ensure Pizza Shop exists (fallback near center if noise never chose it)
    if (!pizzaShopPlaced) {
      const cx = xs[Math.floor(xs.length / 2)];
      const cz = zs[Math.floor(zs.length / 2)];
      pizzaShopPlaced = true;
      const height = 7;
      spawn({
        Info: { name: 'Pizza Shop' },
        Body: {
          type: 'composite',
          params: {
            hasInterior: true,
            parts: [
              { geometry: { type: 'box', params: { lengthX: lotFootprintX, lengthY: height, lengthZ: lotFootprintZ, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#ff5959' } } },
              { geometry: { type: 'box', params: { lengthX: 3.5, lengthY: 1.0, lengthZ: 0.2 } }, material: { type: 'solid', params: { color: '#ffffff' } }, localPosition: [0, height - 0.5, lotFootprintZ / 2 + 0.1] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Transform: { x: cx, y: 0, z: cz }
      });
      spawn({
        Info: { name: 'Pizza Shop Aroma Vent' },
        Transform: { x: cx, y: 2.2, z: cz + lotFootprintZ / 2 + 0.6 },
        ParticleEmitter: {
          rate: 18,
          maxParticles: 160,
          lifetime: 3,
          speed: { min: 0.08, max: 0.25 },
          spread: 0.4,
          size: 0.14,
          opacity: 0.55,
          gravity: -0.03,
          color: '#ffd2a1',
          direction: [0, 1, 0],
          shape: { type: 'point' },
          localSpace: false
        },
        MotionSource: { type: 'static', params: {} }
      });
      spawnBuildingDoorPair('Pizza Shop', cx, cz, lotFootprintX, lotFootprintZ, 0);
      furnishInterior('Pizza Shop', cx, cz, lotFootprintX, lotFootprintZ, 0, true);
      // Some citizens inside
      spawn('citizen', { Transform: { x: cx - 2, y: 1.0, z: cz } });
      spawn('citizen', { Transform: { x: cx + 2, y: 1.0, z: cz } });
    }

    // Helicopter on tallest skyscraper (with helipad) or fallback helipad
    if (tallestSkyscraper.height > 0) {
      // helipad
      spawn({
        Info: { name: 'Helipad' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 3.5, height: 0.15, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#ffd76a' } } }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Transform: { x: tallestSkyscraper.cx, y: tallestSkyscraper.height + 0.95, z: tallestSkyscraper.cz }
      });
      spawn('helicopter', {
        Transform: { x: tallestSkyscraper.cx, y: tallestSkyscraper.height + 2.0, z: tallestSkyscraper.cz }
      });
    } else {
      // Fallback: ground helipad near origin to guarantee a helicopter
      const hx = 12, hz = 12;
      spawn({
        Info: { name: 'Helipad' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 3.5, height: 0.1, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#ffd76a' } } }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Transform: { x: hx, y: 0.05, z: hz }
      });
      spawn('helicopter', { Transform: { x: hx, y: 1.6, z: hz } });
    }

    // Sprinkle more citizens along main avenue near zero lines
    for (let t = -half + 30; t < half - 30; t += 60) {
      if (Math.random() < 0.7) spawn('citizen', { Transform: { x: 0 + roadWidth / 2 + sidewalk - 0.8, y: 1.0, z: t } });
      if (Math.random() < 0.7) spawn('citizen', { Transform: { x: 0 - roadWidth / 2 - sidewalk + 0.8, y: 1.0, z: t + 15 } });
      if (Math.random() < 0.6) spawn('citizen', { Transform: { x: t, y: 1.0, z: 0 + roadWidth / 2 + sidewalk - 0.8 } });
      if (Math.random() < 0.6) spawn('citizen', { Transform: { x: t + 15, y: 1.0, z: 0 - roadWidth / 2 - sidewalk + 0.8 } });
    }
  }
};
