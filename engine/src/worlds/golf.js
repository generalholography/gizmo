export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    const fields = getModule('field');
    const archetypes = getModule('archetype');

    initialize({
      title: 'Links of the Luminous Vale',
      description: 'Rolling fescue fairways wind between misty evergreens and glassy ponds. Try every club in the pro shop and sink the championship course.',
      tags: ['sports', 'golf', 'multiplayer'],
      brandColors: ['#87c0ff', '#43c86c'],
      dimensions: [
        {
          name: 'LinksVale',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#87c0ff',
            sun: {
              color: '#fff8dc',
              intensity: 1.1,
              timeOfDay: 1100,
            },
            clouds: {
              color: '#f5f8fb',
              coverage: 0.35,
            },
            stars: {
              intensity: 0.0,
            },
          },
          particleSystems: [
            {
              name: 'Fairway Mist',
              position: [0, 7, 0],
              emitter: {
                rate: 70,
                maxParticles: 650,
                lifetime: 5,
                speed: { min: 0.05, max: 0.2 },
                spread: 0.5,
                size: 0.16,
                opacity: 0.3,
                gravity: 0,
                color: '#eaf4ff',
                direction: [0.05, 0.2, 0],
                shape: { type: 'point' },
                localSpace: false,
              },
            },
          ],
        },
      ],
      achievements: [
        {
          name: 'Clubhouse Collector',
          description: 'Pick up four different clubs from the pro shop.',
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'items picked up', subtype: 'Championship Driver' },
                { metric: 'items picked up', subtype: 'Fairway Wood' },
                { metric: 'items picked up', subtype: '4 Iron' },
                { metric: 'items picked up', subtype: 'Lob Wedge' },
                { metric: 'items picked up', subtype: 'Blade Putter' }
              ],
              targetValue: 4
            }
          }
        }
      ]
    });

    const seed = (Math.random() * 100000) | 0;
    const terrainSize = 520;

    const coastalShelf = { type: 'simplex', params: { seed: seed + 3, frequency: 0.04, amplitude: 8, octaves: 3 } };
    const rollingUndulation = { type: 'simplex', params: { seed: seed + 11, frequency: 0.12, amplitude: 4.5, octaves: 4 } };
    const ridgeNoise = { type: 'simplex', params: { seed: seed + 29, frequency: 0.6, amplitude: 2.2, octaves: 3 } };
    const duneMask = { type: 'simplex', params: { seed: seed + 41, frequency: 0.18, amplitude: 3.3, octaves: 2 } };

    const heightField = fields.register('golf_height', {
      type: 'composite',
      params: {
        blend: 'add',
        fields: [
          coastalShelf,
          rollingUndulation,
          {
            type: 'composite',
            params: {
              blend: 'multiply',
              fields: [ridgeNoise, { type: 'simplex', params: { seed: seed + 53, frequency: 0.22, amplitude: 1.7, octaves: 2 } }],
            },
          },
          {
            type: 'composite',
            params: {
              blend: 'add',
              fields: [
                duneMask,
                { type: 'simplex', params: { seed: seed + 67, frequency: 0.02, amplitude: 12, octaves: 2 } },
              ],
            },
          },
        ],
      },
    });

    const treeDensityField = fields.register('golf_tree_density', {
      type: 'simplex',
      params: { seed: seed + 101, frequency: 0.28, amplitude: 1.0, octaves: 4 },
    });
    const groveBiasField = fields.register('golf_grove_bias', {
      type: 'simplex',
      params: { seed: seed + 149, frequency: 0.08, amplitude: 1.0, octaves: 3 },
    });
    const hazardMaskField = fields.register('golf_hazard_mask', {
      type: 'simplex',
      params: { seed: seed + 181, frequency: 0.33, amplitude: 1.0, octaves: 2 },
    });

    const sampleHeight = (x, z) => heightField.sample3D(x / terrainSize, 0, z / terrainSize);

    spawn({
      Info: { name: 'Links Terrain' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'displacedPlane', params: { lengthX: terrainSize, lengthZ: terrainSize, field: 'golf_height' } },
              material: { type: 'solid', params: { color: '#507b3d', roughness: 0.9 } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    const waterLevel = -3.5;
    spawn({
      Info: { name: 'Irrigation Reservoir' },
      Transform: { y: waterLevel },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'plane', params: { width: terrainSize * 1.2, height: terrainSize * 1.2 } },
              material: { type: 'liquid', params: { color: '#2f6db1', opacity: 0.8 } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    archetypes.register('golf_ball_projectile', {
      type: 'bundle',
      params: {
        Info: { name: 'Golf Ball' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'sphere', params: { radius: 0.22 } },
                material: { type: 'solid', params: { color: '#f8f8f2', roughness: 0.4 } },
              },
            ],
          },
        },
        MotionSource: {
          type: 'dynamicRigidBody',
          params: {
            mass: 0.045,
            restitution: 0.68,
            linearDamping: 0.12,
            angularDamping: 0.08,
          },
        },
        Faction: { id: 'player_faction' },
        Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.15, actions: [
          {
            type: 'damage',
            target: 'other',
            params: { amount: 1, knockback: 0 },
            onSuccess: [{ type: 'kill', target: 'self', params: {} }],
          },
        ] }],
      },
    });

    const clubProfiles = [
      { id: 'golf_driver', name: 'Championship Driver', color: '#3f3f3f', shaft: '#d0d3d9', velocity: 62, cooldown: 1.2, description: 'Launches tee shots with maximum carry.' },
      { id: 'golf_fairway_wood', name: 'Fairway Wood', color: '#444c5c', shaft: '#c5cad0', velocity: 48, cooldown: 1.0, description: 'Reliable distance from the short grass.' },
      { id: 'golf_long_iron', name: '4 Iron', color: '#4a4a52', shaft: '#d5d9df', velocity: 38, cooldown: 0.9, description: 'Mid trajectory shots for long approaches.' },
      { id: 'golf_wedge', name: 'Lob Wedge', color: '#626a3c', shaft: '#d8d6c2', velocity: 24, cooldown: 0.7, description: 'Soft landing shots over bunkers.' },
      { id: 'golf_putter', name: 'Blade Putter', color: '#333333', shaft: '#e2e3e5', velocity: 12, cooldown: 0.55, description: 'Rolls it true on smooth greens.' },
    ];

    const clubClips = [
      {
        name: 'use',
        duration: 0.42,
        tracks: [
          {
            targetTag: 'root',
            keyframes: [
              { time: 0, rotation: [0, 0, 0] },
              { time: 0.2, rotation: [-Math.PI / 1.6, 0, 0.3] },
              { time: 0.42, rotation: [0, 0, 0] },
            ],
          },
        ],
      },
    ];

    clubProfiles.forEach((profile, idx) => {
      archetypes.register(profile.id, {
        type: 'bundle',
        params: {
          Info: { name: profile.name, description: profile.description },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  tag: 'root',
                  children: [
                    {
                      geometry: { type: 'cylinder', params: { radius: 0.05, height: 0.95, pivot: 'top' } },
                      material: { type: 'solid', params: { color: profile.shaft, metalness: 0.2, roughness: 0.4 } },
                    },
                    {
                      geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.35, lengthZ: 0.32 } },
                      material: { type: 'solid', params: { color: profile.color, metalness: 0.45, roughness: 0.3 } },
                      localPosition: [0, -0.95, 0.12],
                      localRotation: [0.4, 0, 0],
                    },
                    {
                      geometry: { type: 'cylinder', params: { radius: 0.06, height: 0.25, pivot: 'bottom' } },
                      material: { type: 'solid', params: { color: '#2d2d2d', roughness: 0.7 } },
                      localPosition: [0, 0.05, 0],
            { metric: 'items picked up', subtype: 'Championship Driver' },
            { metric: 'items picked up', subtype: 'Fairway Wood' },
            { metric: 'items picked up', subtype: '4 Iron' },
            { metric: 'items picked up', subtype: 'Lob Wedge' },
            { metric: 'items picked up', subtype: 'Blade Putter' }
          ],
          targetValue: 4
        }
      }
    });
    achievements.set('Tournament Ready', {
      description: 'Finish at least five holes to qualify for the clubhouse tournament board.',
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'discoveries',
          subtype: 'Golf Hole',
          targetValue: 5
        }
      }
    });

    const holes = [];
    for (let i = 0; i < holeCount; i++) {
      const angle = (i / holeCount) * Math.PI * 2 * 0.82 + Math.sin((seed + i) * 0.17) * 0.18;
      const startRadius = terrainSize * 0.18 + (i % 3) * 12 + Math.sin(i * 1.3) * 9;
      const length = 70 + (i % 4) * 18 + Math.sin(i * 0.6) * 12;
      const teeX = Math.cos(angle) * startRadius;
      const teeZ = Math.sin(angle) * startRadius;
      const dogleg = angle + (i % 2 === 0 ? 0.32 : -0.28) * 0.4;
      const greenX = teeX + Math.cos(angle) * (length * 0.65) + Math.cos(dogleg) * (length * 0.35);
      const greenZ = teeZ + Math.sin(angle) * (length * 0.65) + Math.sin(dogleg) * (length * 0.35);
      const width = 14 + (i % 3) * 3;
      holes.push({ index: i, teeX, teeZ, greenX, greenZ, width, angle });
    }

    const distanceToSegment = (px, pz, ax, az, bx, bz) => {
      const dx = bx - ax;
      const dz = bz - az;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) return Math.hypot(px - ax, pz - az);
      let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = ax + t * dx;
      const projZ = az + t * dz;
      return Math.hypot(px - projX, pz - projZ);
    };

    holes.forEach((hole) => {
      const { index, teeX, teeZ, greenX, greenZ, width, angle } = hole;
      const teeH = sampleHeight(teeX, teeZ);
      const greenH = sampleHeight(greenX, greenZ);
      const midX = (teeX + greenX) / 2;
      const midZ = (teeZ + greenZ) / 2;
      const midH = sampleHeight(midX, midZ);
      const dx = greenX - teeX;
      const dz = greenZ - teeZ;
  const distance = Math.hypot(dx, dz);
  const fairwayWidth = width;
  // Headings: X-forward aligns local X with shot; Z-forward aligns local Z with shot
  const headingX = Math.atan2(dz, dx);
  const headingZ = Math.atan2(dx, dz);

      spawn({
        Info: { name: `Hole ${index + 1} Tee Box` },
  Transform: { x: teeX, y: teeH + 0.12, z: teeZ, ry: headingZ },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 9, lengthY: 0.4, lengthZ: 7 } },
                material: { type: 'solid', params: { color: '#4f8f4b', roughness: 0.6 } },
              },
              {
                geometry: { type: 'box', params: { lengthX: 2.6, lengthY: 0.6, lengthZ: 0.6 } },
                material: { type: 'solid', params: { color: '#c96e3d' } },
                localPosition: [3.2, 0.1, 0],
              },
              {
                geometry: { type: 'box', params: { lengthX: 2.6, lengthY: 0.6, lengthZ: 0.6 } },
                material: { type: 'solid', params: { color: '#3d7ac9' } },
                localPosition: [-3.2, 0.1, 0],
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });

      spawn({
        Info: { name: `Hole ${index + 1} Fairway` },
  Transform: { x: midX, y: midH + 0.05, z: midZ, ry: headingZ - Math.PI / 2 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: distance + 24, lengthY: 0.3, lengthZ: fairwayWidth + 12 } },
                material: { type: 'solid', params: { color: '#3d9c4d', roughness: 0.45 } },
              },
              {
                geometry: { type: 'box', params: { lengthX: distance + 18, lengthY: 0.28, lengthZ: fairwayWidth + 4 } },
                material: { type: 'solid', params: { color: '#46b85b', roughness: 0.3 } },
                localPosition: [0, 0.06, 0],
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });

      spawn({
        Info: { name: `Hole ${index + 1} Green` },
        Transform: { x: greenX, y: greenH + 0.08, z: greenZ },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 10 + (index % 3) * 1.8, height: 0.4, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#6fce6f', roughness: 0.2 } },
              },
              {
                geometry: { type: 'cylinder', params: { radius: 7 + (index % 2) * 1.2, height: 0.35, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#86df84', roughness: 0.15 } },
                localPosition: [0, 0.05, 0],
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });

      const flagColor = index % 3 === 0 ? '#ffcc33' : index % 3 === 1 ? '#ff5a5a' : '#4cc9f0';
      spawn({
        Info: { name: holeNames[index] },
        Transform: { x: greenX, y: greenH, z: greenZ },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.32, height: 0.32, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#1f1f1f', roughness: 0.6 } },
              },
              {
                geometry: { type: 'cylinder', params: { radius: 0.05, height: 3.6, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: '#ffffff', roughness: 0.1 } },
                localPosition: [0, 0.32, 0],
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.05, lengthY: 1.4, lengthZ: 0.9 } },
                material: { type: 'solid', params: { color: flagColor, roughness: 0.4 } },
                localPosition: [0.45, 2.35, 0],
                localRotation: [0, 0, Math.PI / 2],
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
        Health: { value: 1 },
      });

      const bunkerCount = 2 + (index % 2);
      for (let b = 0; b < bunkerCount; b++) {
  const offsetAngle = headingX + (b === 0 ? 0.6 : -0.45) + index * 0.07;
        const offsetDist = distance * (0.55 + b * 0.18);
        const bx = teeX + Math.cos(offsetAngle) * offsetDist;
        const bz = teeZ + Math.sin(offsetAngle) * offsetDist;
        const bh = sampleHeight(bx, bz);
        spawn({
          Info: { name: `Hole ${index + 1} Bunker ${b + 1}` },
          Transform: { x: bx, y: bh + 0.02, z: bz },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: { type: 'cylinder', params: { radius: 5 + Math.random() * 2.2, height: 0.3, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#d8caa3', roughness: 0.8 } },
                },
              ],
            },
          },
          MotionSource: { type: 'static', params: {} },
        });
      }

      const pondOffset = hazardMaskField.sample3D(greenX / terrainSize, 0, greenZ / terrainSize);
      if (pondOffset > 0.55) {
        const hx = greenX + Math.cos(angle + 1.6) * (12 + pondOffset * 6);
        const hz = greenZ + Math.sin(angle + 1.6) * (12 + pondOffset * 6);
        const hh = sampleHeight(hx, hz) - 0.4;
        spawn({
          Info: { name: `Hole ${index + 1} Hazard` },
          Transform: { x: hx, y: hh, z: hz },
          Body: {
            type: 'composite',
            params: {
              parts: [
                {
                  geometry: { type: 'cylinder', params: { radius: 9 + pondOffset * 4, height: 0.35, pivot: 'bottom' } },
                  material: { type: 'liquid', params: { color: '#3a82c1', opacity: 0.85 } },
                },
              ],
            },
          },
          MotionSource: { type: 'static', params: {} },
        });
      }
    });

    const clubhouseX = -terrainSize * 0.12;
    const clubhouseZ = terrainSize * 0.08;
    const clubhouseY = sampleHeight(clubhouseX, clubhouseZ) + 0.05;

    spawn({
      Info: { name: 'Clubhouse' },
      Transform: { x: clubhouseX, y: clubhouseY, z: clubhouseZ },
      Body: {
        type: 'composite',
        params: {
          hasInterior: true,
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 28, lengthY: 1.2, lengthZ: 34 } },
              material: { type: 'solid', params: { color: '#c2b59b', roughness: 0.8 } },
              localPosition: [0, -0.2, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 26, lengthY: 6, lengthZ: 32 } },
              material: { type: 'solid', params: { color: '#ede7dc', roughness: 0.5 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 26, lengthY: 0.6, lengthZ: 32 } },
              material: { type: 'solid', params: { color: '#4f4f4f', roughness: 0.3, metalness: 0.1 } },
              localPosition: [0, 3.3, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 10, lengthY: 4.4, lengthZ: 1 } },
              material: { type: 'solid', params: { color: '#c4d4eb', roughness: 0.2 } },
              localPosition: [0, 0.4, 16],
            },
            {
              geometry: { type: 'box', params: { lengthX: 4, lengthY: 4, lengthZ: 0.8 } },
              material: { type: 'solid', params: { color: '#d4aa7d', roughness: 0.4 } },
              localPosition: [-8, 0.4, 16],
            },
            {
              geometry: { type: 'box', params: { lengthX: 4, lengthY: 4, lengthZ: 0.8 } },
              material: { type: 'solid', params: { color: '#d4aa7d', roughness: 0.4 } },
              localPosition: [8, 0.4, 16],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Clubhouse Fountain Mist' },
      Transform: { x: clubhouseX + 10, y: clubhouseY + 0.4, z: clubhouseZ + 8 },
      ParticleEmitter: {
        rate: 22,
        maxParticles: 180,
        lifetime: 2.4,
        speed: { min: 0.2, max: 0.5 },
        spread: 0.6,
        size: 0.12,
        opacity: 0.6,
        gravity: 0.4,
        color: '#bfe3ff',
        direction: [0, 1, 0],
        shape: { type: 'sphere', radius: 0.6 },
        localSpace: false,
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Clubhouse Interior' },
      Transform: { x: clubhouseX, y: clubhouseY + 0.1, z: clubhouseZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 24, lengthY: 0.4, lengthZ: 30 } },
              material: { type: 'solid', params: { color: '#f5f0e6', roughness: 0.6 } },
              localPosition: [0, 0.2, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 4.5, lengthZ: 30 } },
              material: { type: 'solid', params: { color: '#b8865b', roughness: 0.6 } },
              localPosition: [-12, 2.1, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 4.5, lengthZ: 30 } },
              material: { type: 'solid', params: { color: '#b8865b', roughness: 0.6 } },
              localPosition: [12, 2.1, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 24, lengthY: 4.5, lengthZ: 0.6 } },
              material: { type: 'solid', params: { color: '#b8865b', roughness: 0.6 } },
              localPosition: [0, 2.1, -15],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    // Doors for entering and exiting the clubhouse
    // Outside door (front of clubhouse) -> teleport inside near the lobby
    spawn({
      Info: { name: 'Clubhouse Door (Outside)' },
      Transform: { x: clubhouseX, y: clubhouseY + 1.2, z: clubhouseZ + 17.8 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 2, lengthY: 4, lengthZ: 0.3 } },
              material: { type: 'solid', params: { color: '#654321' } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.15 } },
              material: { type: 'solid', params: { color: '#C0C0C0' } },
              localPosition: [0.7, 0, 0.2],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'interact' }, actions: [
        {
          type: 'teleport',
          target: 'other',
          range: 3,
          params: {
            position: { x: clubhouseX, y: clubhouseY + 1.1, z: clubhouseZ + 14 },
          },
        },
      ] }],
    });

    // Inside door (just inside the entrance) -> teleport back outside
    spawn({
      Info: { name: 'Clubhouse Door (Inside)' },
      Transform: { x: clubhouseX, y: clubhouseY + 1.2, z: clubhouseZ + 13.2, ry: Math.PI },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 2, lengthY: 4, lengthZ: 0.3 } },
              material: { type: 'solid', params: { color: '#8B4513' } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.15 } },
              material: { type: 'solid', params: { color: '#FFD700' } },
              localPosition: [-0.7, 0, 0.2],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'interact' }, actions: [
        {
          type: 'teleport',
          target: 'other',
          range: 3,
          params: {
            position: { x: clubhouseX, y: clubhouseY + 1.1, z: clubhouseZ + 20 },
          },
        },
      ] }],
    });

    spawn({
      Info: { name: 'Pro Shop Counter' },
      Transform: { x: clubhouseX - 6, y: clubhouseY + 0.5, z: clubhouseZ - 6 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 10, lengthY: 1.8, lengthZ: 2.2 } },
              material: { type: 'solid', params: { color: '#835d3f', roughness: 0.6 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 10, lengthY: 0.2, lengthZ: 2.2 } },
              material: { type: 'solid', params: { color: '#e5d4b7', roughness: 0.3 } },
              localPosition: [0, 1.0, 0],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Tournament Board' },
      Transform: { x: clubhouseX + 8, y: clubhouseY + 2.4, z: clubhouseZ - 12, ry: Math.PI },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 4.2, lengthZ: 6 } },
              material: { type: 'solid', params: { color: '#284b63', roughness: 0.3 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 3.6, lengthZ: 5.4 } },
              material: { type: 'solid', params: { color: '#f1f3f5', roughness: 0.1 } },
              localPosition: [0.25, 0, 0],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'interact' }, actions: [
        {
          type: 'popup',
          target: 'other',
          params: {
            text: 'Club Championship Standings\n\nComplete more holes to see your name climb the board. Five finishes earns tournament entry!'
          },
        },
      ] }],
    });

    const proShopClubs = [
      { id: 'golf_driver', offset: [-4.5, 0.9, -5.2], ry: Math.PI / 6 },
      { id: 'golf_fairway_wood', offset: [-2.0, 0.9, -5.4], ry: Math.PI / 9 },
      { id: 'golf_long_iron', offset: [0.5, 0.9, -5.5], ry: 0 },
      { id: 'golf_wedge', offset: [3.0, 0.9, -5.3], ry: -Math.PI / 8 },
      { id: 'golf_putter', offset: [5.2, 0.9, -5.1], ry: -Math.PI / 5 },
    ];
    proShopClubs.forEach(({ id, offset, ry }) => {
      spawn(id, { Transform: { x: clubhouseX + offset[0], y: clubhouseY + offset[1], z: clubhouseZ + offset[2], ry } });
    });

    spawn({
      Info: { name: 'Ball Bucket' },
      Transform: { x: clubhouseX - 5.5, y: clubhouseY + 0.3, z: clubhouseZ - 3.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 0.9, height: 1.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#2d5063', roughness: 0.3 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.18 } },
              material: { type: 'solid', params: { color: '#f8f8f2', roughness: 0.3 } },
              localPosition: [0.2, 0.9, 0],
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.18 } },
              material: { type: 'solid', params: { color: '#f8f8f2', roughness: 0.3 } },
              localPosition: [-0.3, 0.8, 0.2],
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.18 } },
              material: { type: 'solid', params: { color: '#f8f8f2', roughness: 0.3 } },
              localPosition: [0.1, 0.7, -0.3],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Fitting Room Bench' },
      Transform: { x: clubhouseX + 4.5, y: clubhouseY + 0.3, z: clubhouseZ + 4.2, ry: Math.PI / 2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 6.2, lengthY: 0.6, lengthZ: 1.2 } },
              material: { type: 'solid', params: { color: '#99694f', roughness: 0.6 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 6.2, lengthY: 0.2, lengthZ: 1.2 } },
              material: { type: 'solid', params: { color: '#f7ede2', roughness: 0.2 } },
              localPosition: [0, 0.35, 0],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    const practiceGreenX = clubhouseX + 34;
    const practiceGreenZ = clubhouseZ + 26;
    const practiceGreenY = sampleHeight(practiceGreenX, practiceGreenZ);
    spawn({
      Info: { name: 'Practice Green' },
      Transform: { x: practiceGreenX, y: practiceGreenY + 0.05, z: practiceGreenZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 14, height: 0.35, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#79cf73', roughness: 0.22 } },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Practice Pin' },
      Transform: { x: practiceGreenX + 3, y: practiceGreenY, z: practiceGreenZ - 2 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'cylinder', params: { radius: 0.28, height: 0.3, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#202020', roughness: 0.6 } },
            },
            {
              geometry: { type: 'cylinder', params: { radius: 0.04, height: 3.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#ffffff', roughness: 0.1 } },
              localPosition: [0, 0.3, 0],
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.04, lengthY: 1.1, lengthZ: 0.7 } },
              material: { type: 'solid', params: { color: '#ff9f1c', roughness: 0.3 } },
              localPosition: [0.32, 2.0, 0],
              localRotation: [0, 0, Math.PI / 2],
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
      Health: { value: 1 },
    });

    const treeVariants = [
      {
        name: 'Evergreen',
        trunkColor: '#6d4c41',
        foliage: ['#264d33', '#2a6040', '#2d6b48'],
        height: 8.5,
        radius: 2.2,
      },
      {
        name: 'Birch',
        trunkColor: '#d8d9d3',
        foliage: ['#6ea256', '#7ab15e', '#88bf6b'],
        height: 6.8,
        radius: 2.0,
      },
    ];

    const treeData = [];
    for (let i = 0; i < 1600; i++) {
      const x = (Math.random() - 0.5) * terrainSize * 0.95;
      const z = (Math.random() - 0.5) * terrainSize * 0.95;
      const nx = x / terrainSize;
      const nz = z / terrainSize;
      const h = sampleHeight(x, z);
      if (h <= waterLevel + 0.4) continue;
      const density = treeDensityField.sample3D(nx, 0, nz);
      const grove = groveBiasField.sample3D(nx, 0, nz);
      const hazard = hazardMaskField.sample3D(nx, 0, nz);

      const minFairwayDist = holes.reduce((min, hole) => {
        const d = distanceToSegment(x, z, hole.teeX, hole.teeZ, hole.greenX, hole.greenZ) - hole.width * 0.55;
        return Math.min(min, d);
      }, Infinity);

      if (minFairwayDist < 4.5) continue;
      const spawnChance = 0.45 + 0.3 * density + 0.1 * grove - Math.max(0, hazard) * 0.15;
      if (Math.random() > spawnChance) continue;

      treeData.push({ x, z, h, density, grove });
    }

    treeData.forEach(({ x, z, h, density, grove }) => {
      const variantIndex = density > 0.4 ? 0 : grove > 0 ? 1 : Math.random() < 0.6 ? 0 : 1;
      const variant = treeVariants[variantIndex];
      const scale = 0.7 + Math.random() * 0.6;
      spawn({
        Info: { name: `${variant.name} Tree` },
        Transform: { x, y: h, z, sx: scale, sy: scale, sz: scale, ry: Math.random() * Math.PI * 2 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.25, height: variant.height, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: variant.trunkColor, roughness: 0.7 } },
              },
              {
                geometry: { type: 'cone', params: { radius: variant.radius * 0.8, height: variant.height * 0.5, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: variant.foliage[0], roughness: 0.35 } },
                localPosition: [0, variant.height * 0.45, 0],
              },
              {
                geometry: { type: 'cone', params: { radius: variant.radius * 0.65, height: variant.height * 0.45, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: variant.foliage[1], roughness: 0.3 } },
                localPosition: [0, variant.height * 0.7, 0],
              },
              {
                geometry: { type: 'cone', params: { radius: variant.radius * 0.45, height: variant.height * 0.35, pivot: 'bottom' } },
                material: { type: 'solid', params: { color: variant.foliage[2], roughness: 0.28 } },
                localPosition: [0, variant.height * 0.9, 0],
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });
    });

    holes.forEach((hole) => {
      const { teeX, teeZ, greenX, greenZ, width } = hole;
      const dx = greenX - teeX;
      const dz = greenZ - teeZ;
      const steps = 18;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = teeX + dx * t + Math.sin(t * Math.PI * 2) * width * 0.2;
        const pz = teeZ + dz * t + Math.cos(t * Math.PI * 2) * width * 0.2;
        const py = sampleHeight(px, pz);
        if (i % 3 === 0) {
          spawn({
            Info: { name: 'Fairway Marker' },
            Transform: { x: px, y: py + 0.2, z: pz },
            Body: {
              type: 'composite',
              params: {
                parts: [
                  {
                    geometry: { type: 'cylinder', params: { radius: 0.25, height: 1.2, pivot: 'bottom' } },
                    material: { type: 'solid', params: { color: '#e63946', roughness: 0.4 } },
                  },
                ],
              },
            },
            MotionSource: { type: 'static', params: {} },
          });
        }
      }
    });

    // Spawn Player
    spawn('player', { Transform: { x: 0, y: sampleHeight(0, 0) + 2, z: 0 }, Health: { value: 50 } });
  },
};
