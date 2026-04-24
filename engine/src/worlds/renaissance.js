export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    // Resources and modules
    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // World initialization
    initialize({
      title: 'Florentia: Rooftops of the Renaissance',
      description: 'Parkour across tiled roofs, scale iconic landmarks, and outwit guards in a living, breathing Renaissance Florence.',
      tags: ['assassin', 'parkour', 'renaissance', 'city', 'stealth'],
      brandColors: ['#d9a066', '#c1440e', '#4f2f1e', '#7aa2c8'],
      dimensions: [{
        name: 'Florence',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#87A7C6',
          sun: {
            color: '#FFE3B0',
            intensity: 1.05,
            timeOfDay: 1630 // late afternoon, long shadows for rooftops
          },
          clouds: {
            color: '#ffffff',
            coverage: 0.35
          },
          stars: {
            intensity: 0.0
          }
        }
      }],
      achievements: [
        {
          name: 'Rooftop Runner',
          description: 'Discover 5 rooftop viewpoints.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Viewpoint',
              targetValue: 5
            }
          }
        },
        {
          name: 'Master Climber',
          description: 'Synchronize at the Cathedral Dome.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Cathedral Dome',
              targetValue: 1
            }
          }
        },
        {
          name: 'Tower Watcher',
          description: 'Climb the Palazzo Vecchio Tower.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Palazzo Vecchio Tower',
              targetValue: 1
            }
          }
        },
        {
          name: 'Bridge Hopper',
          description: 'Cross the Ponte Vecchio.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Ponte Vecchio',
              targetValue: 1
            }
          }
        },
        {
          name: 'Purse Snatcher',
          description: 'Collect 5 Florins.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Florin',
              targetValue: 5
            }
          }
        },
        {
          name: 'Arm Yourself',
          description: 'Pick up a Crossbow.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Crossbow',
              targetValue: 1
            }
          }
        },
        {
          name: 'Vigilante',
          description: 'Eliminate 5 city guards.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'entities killed',
              subtype: 'City Guard',
              targetValue: 5
            }
          }
        }
      ]
    });

    // Helpers
    const rand = (a, b) => a + Math.random() * (b - a);
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);

    // Fields for subtle undulation and riverbanks
    const seed = Math.floor(Math.random() * 1e6) | 0;
    const citySize = 320;
    const half = citySize / 2;

    const groundHeightField = fields.register('florence_ground', {
      type: 'simplex',
      params: { seed, frequency: 0.03, amplitude: 0.6, octaves: 3 }
    });

    const sampleH = (x, z) => groundHeightField.sample3D(x / citySize, 0, z / citySize);

    // Base terrain (paved city ground)
    spawn({
      Info: { name: 'City Ground' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'displacedPlane', params: { lengthX: citySize, lengthZ: citySize, field: 'florence_ground' } },
            material: { type: 'solid', params: { color: '#b6a289', roughness: 1.0 } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Arno River running East-West through the city
    const riverZ = -6;
    const riverWidth = 22;
    spawn({
      Info: { name: 'Arno River' },
      Transform: { x: 0, y: -0.5, z: riverZ },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: citySize * 1.3, lengthY: 1.2, lengthZ: riverWidth, pivot: 'center' } },
            material: { type: 'liquid', params: { baseColor: '#5a8fa8', depthTint: '#1d3a46', depthScale: 1.5, opacity: 0.85, waveFreq: 0.12, waveAmp: 0.06, waveSpeed: 0.18 } },
            ignoreCollisions: true
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Archetypes: equipment, guards, utilities
    archetypes.register('bolt_projectile', {
      type: 'bundle',
      params: {
        Info: { name: 'Bolt' },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'cylinder', params: { radius: 0.03, height: 0.9 } },
              material: { type: 'solid', params: { color: '#444444' } },
              localRotation: [Math.PI / 2, 0, 0],
              ignoreCollisions: true
            }]
          }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.08, gravityScale: 0 } },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 0.36 } }, cooldown: 0.02, actions: [
            { type: 'damage', params: { amount: 7 }, target: 'other', range: 0.35 },
            { type: 'kill', params: {}, target: 'self', range: 0.36 }
          ] }]
      }
    });

    archetypes.register('crossbow', {
      type: 'bundle',
      params: {
        Info: { name: 'Crossbow' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.12, lengthZ: 0.75 } }, material: { type: 'wood', params: { color: '#6e4b31', grainColor: '#3a2415', grainSize: 0.6, seed: seed + 4 } } },
              { geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.05, lengthZ: 0.12 } }, material: { type: 'solid', params: { color: '#2a2a2a' } }, localPosition: [0, 0.05, -0.28] }
            ]
          }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 1.2 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction' }, cooldown: 0.8, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: 'bolt_projectile', velocity: 48 } }
          ] }]
      }
    });

    archetypes.register('hidden_blade', {
      type: 'bundle',
      params: {
        Info: { name: 'Hidden Blade' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 0.08, lengthY: 0.6, lengthZ: 0.12, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#cfd2d3', metalness: 0.6, roughness: 0.25 } } }
            ]
          }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.4 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction', params: { range: 2.2 } }, cooldown: 0.4, actions: [{ type: 'damage', params: { amount: 9, knockback: 2 }, target: 'other', range: 2.2 }] }]
      }
    });

    archetypes.register('smoke_bomb', {
      type: 'bundle',
      params: {
        Info: { name: 'Smoke Bomb' },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'sphere', params: { radius: 0.12 } }, material: { type: 'solid', params: { color: '#555555' } } }] } },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.2 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction' }, cooldown: 0.6, actions: [
            { type: 'spawnEntityFrom', target: 'self', params: { entity: {
              Info: { name: 'Smoke Cloud' },
              Body: { type: 'composite', params: { parts: [{ geometry: { type: 'sphere', params: { radius: 2.4 } }, material: { type: 'solid', params: { color: '#777777', opacity: 0.5 } }, ignoreCollisions: true }] } },
              MotionSource: { type: 'static', params: {} },
              Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.5 } }, cooldown: 0.2, actions: [
                { type: 'damage', params: { amount: 1 }, target: 'other', range: 2.4 },
                { type: 'kill', params: {}, target: 'self', range: 2.5 }
              ] }]
            } } }
          ] }]         ]
        }
      }
    });

    archetypes.register('florin_coin', {
      type: 'bundle',
      params: {
        Info: { name: 'Florin' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.22, height: 0.08 } }, material: { type: 'solid', params: { color: '#d0ad2f', metalness: 0.5, roughness: 0.2 } } }
            ]
          }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.05 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
      }
    });

    archetypes.register('city_guard', {
      type: 'bundle',
      params: {
        Info: { name: 'City Guard' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 0.7, lengthY: 1.7, lengthZ: 0.5 } }, material: { type: 'solid', params: { color: '#7b1b1b' } },
                children: [
                  { geometry: { type: 'sphere', params: { radius: 0.28, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d1b79e' } }, localPosition: [0, 0.85, 0] },
                  { geometry: { type: 'box', params: { lengthX: 0.16, lengthY: 0.9, lengthZ: 0.16, pivot: 'top' } }, material: { type: 'solid', params: { color: '#7b1b1b' } }, localPosition: [0.32, 0.7, 0],
                    children: [{ tag: 'heldItemAnchor', geometry: { type: 'none' }, localPosition: [0, -0.7, 0] }] },
                  { geometry: { type: 'box', params: { lengthX: 0.16, lengthY: 0.9, lengthZ: 0.16, pivot: 'top' } }, material: { type: 'solid', params: { color: '#7b1b1b' } }, localPosition: [-0.32, 0.7, 0] }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 4.2, jumpHeight: 3.5, canFly: false } },
        Inventory: { size: 1, items: ['crossbow'], selectedItemIndex: 0 },
        Health: { value: 16 },
        AI: { isAggressive: true, awarenessRange: 36 },
        Faction: { id: 'florentine_guards' },
                Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.8, actions: [{ type: 'damage', params: { amount: 2 }, target: 'other' }] }]
      }
    });

    // Viewpoint marker archetype
    archetypes.register('viewpoint_marker', {
      type: 'bundle',
      params: {
        Info: { name: 'Viewpoint' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.35, height: 0.3 } }, material: { type: 'solid', params: { color: '#9aa7b3' } } },
              { geometry: { type: 'pyramid', params: { width: 0.8, height: 0.7, depth: 0.8 } }, material: { type: 'solid', params: { color: '#e8d27c' } }, localPosition: [0, 0.3, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
      }
    });

    // Ponte Vecchio (bridge lined with shops)
  const ponteX = 0;
  const ponteZ = riverZ;
  const ponteLen = 48;
  const ponteWidth = 8.5;
    const ponteDeckY = sampleH(ponteX, ponteZ) + 0.2;
    // Deck
    spawn({
      Info: { name: 'Ponte Vecchio' },
      Transform: { x: ponteX, y: ponteDeckY, z: ponteZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            // Rotate bridge to run along Z (across the river)
            { geometry: { type: 'box', params: { lengthX: ponteWidth, lengthY: 1.6, lengthZ: ponteLen } }, material: { type: 'solid', params: { color: '#c7b08b' } } },
            // Guard rails on the ±X sides
            { geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 1.2, lengthZ: ponteLen } }, material: { type: 'solid', params: { color: '#8b6b48' } }, localPosition: [-(ponteWidth/2), 1.2, 0] },
            { geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 1.2, lengthZ: ponteLen } }, material: { type: 'solid', params: { color: '#8b6b48' } }, localPosition: [(ponteWidth/2), 1.2, 0] }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'discover', params: {}, target: 'self' }] }]
    });
    // Little shops along the sides
    for (let i = -Math.floor(ponteLen / 6); i <= Math.floor(ponteLen / 6); i++) {
      if (Math.abs(i) < 2) continue;
      const sz = i * 3; // distribute shops along Z (bridge length)
      const shopW = 2.2 + Math.random() * 0.8;
      const shopH = 2.2;
      const color = choice(['#b48e6a', '#c9ab87', '#a8794e', '#b68d63']);
      // West side shops (x = -3.2) and east side shops (x = +3.2),
      // sized to run along Z with shallow depth along X
      spawn({
  Transform: { x: ponteX - (ponteWidth/2 - 1.1), y: ponteDeckY + 1.8, z: ponteZ + sz },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: 2.0, lengthY: shopH, lengthZ: shopW } }, material: { type: 'solid', params: { color } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
      spawn({
  Transform: { x: ponteX + (ponteWidth/2 - 1.1), y: ponteDeckY + 1.8, z: ponteZ + sz },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: 2.0, lengthY: shopH, lengthZ: shopW } }, material: { type: 'solid', params: { color } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Cathedral (Duomo) with dome
    const duomoX = -40;
    const duomoZ = 48;
    const baseY = sampleH(duomoX, duomoZ);
    spawn({
      Info: { name: 'Cathedral Santa Maria del Fiore' },
      Transform: { x: duomoX, y: baseY + 10, z: duomoZ },
      Body: {
        type: 'composite',
        params: {
          hasInterior: true,
          parts: [
            { geometry: { type: 'box', params: { lengthX: 34, lengthY: 20, lengthZ: 50 } }, material: { type: 'solid', params: { color: '#d3c3aa' } } },
            { geometry: { type: 'cylinder', params: { radius: 12, height: 10, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d8cab3' } }, localPosition: [0, 10, 0] },
            { geometry: { type: 'hemisphere', params: { radius: 12 } }, material: { type: 'solid', params: { color: '#bf5f33' } }, localPosition: [0, 20, 0] },
            // Lantern on top
            { geometry: { type: 'cylinder', params: { radius: 2, height: 3, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#d8cab3' } }, localPosition: [0, 20 + 12, 0] },
            { geometry: { type: 'cone', params: { radius: 1.6, height: 2 } }, material: { type: 'solid', params: { color: '#bf5f33' } }, localPosition: [0, 20 + 12 + 3, 0] }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });
    // Duomo viewpoint marker
    spawn('viewpoint_marker', {
      Info: { name: 'Cathedral Dome' },
      Transform: { x: duomoX, y: baseY + 10 + 20 + 12 + 2.2, z: duomoZ }
    });

    // Campanile (bell tower) near Duomo
    const towerX = duomoX - 18;
    const towerZ = duomoZ - 10;
    const towerY = sampleH(towerX, towerZ);
    spawn({
      Info: { name: 'Giotto’s Campanile' },
      Transform: { x: towerX, y: towerY + 16, z: towerZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 8, lengthY: 32, lengthZ: 8 } }, material: { type: 'solid', params: { color: '#d8cab3' } } },
            { geometry: { type: 'pyramid', params: { width: 9, height: 4, depth: 9, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#bf5f33' } }, localPosition: [0, 16, 0] }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Palazzo Vecchio + tower
    const palX = 56;
    const palZ = -28;
    const palY = sampleH(palX, palZ);
    spawn({
      Info: { name: 'Palazzo Vecchio' },
      Transform: { x: palX, y: palY + 6, z: palZ },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'box', params: { lengthX: 26, lengthY: 12, lengthZ: 26 } }, material: { type: 'solid', params: { color: '#b49b78' } } },
            { geometry: { type: 'box', params: { lengthX: 6, lengthY: 36, lengthZ: 6 } }, material: { type: 'solid', params: { color: '#b49b78' } }, localPosition: [6, 12, -6] },
            { geometry: { type: 'pyramid', params: { width: 7, height: 4, depth: 7, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#8b6b48' } }, localPosition: [6, 12 + 18, -6] }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });
    spawn('viewpoint_marker', {
      Info: { name: 'Palazzo Vecchio Tower' },
      Transform: { x: palX + 6, y: palY + 12 + 18 + 3.2, z: palZ - 6 }
    });

    // City blocks: generate buildings with climbable connections
    const blocks = [];
    const roofs = []; // collect roof centers for connecting beams and for player start
    const gridStep = 24;
    const alley = 6;

    const keepOut = (x, z) => {
      const dDuomo = Math.hypot(x - duomoX, z - duomoZ);
      const dPal = Math.hypot(x - palX, z - palZ);
      const dPonte = Math.hypot(z - riverZ);
      // clear plazas near landmarks and around the north–south bridge across the river
      const nearBridge = (Math.abs(z - riverZ) < riverWidth * 0.7) && (Math.abs(x - ponteX) < ponteWidth * 0.8 + 3);
      return (dDuomo < 30) || (dPal < 24) || nearBridge;
    };

    // Procedure to spawn a single building with parapet and roof
    function spawnBuilding(x, z, w, d, floors) {
      const groundY = sampleH(x, z);
      const floorH = 3;
      const h = floors * floorH;
      const roofH = rand(1.0, 1.6);
      const bodyColor = choice(['#d8cab3', '#c7b08b', '#ccb89c', '#bfa88b', '#dacfb7']);
      const tileColor = choice(['#bf5f33', '#b24d2a', '#c2643a']);
      // Optional second inner volume that is taller and inside the same footprint
      const addSecondary = Math.random() < 0.4 && w >= 12 && d >= 10;
      const floors2 = addSecondary ? (floors + 1 + Math.floor(rand(0, 2))) : 0;
      const h2 = addSecondary ? floors2 * floorH : 0;
      const roofH2 = addSecondary ? rand(1.1, 1.9) : 0;
      const w2 = addSecondary ? clamp(rand(w * 0.45, w * 0.8), 5.5, w - 1.2) : 0;
      const d2 = addSecondary ? clamp(rand(d * 0.45, d * 0.8), 5.0, d - 1.2) : 0;
      const ox2 = addSecondary ? rand(-(w - w2) / 2 + 0.4, (w - w2) / 2 - 0.4) : 0;
      const oz2 = addSecondary ? rand(-(d - d2) / 2 + 0.4, (d - d2) / 2 - 0.4) : 0;
      const totalH = addSecondary ? Math.max(h, h2) : h;
      spawn({
        Transform: { x, y: groundY, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // walls
              { geometry: { type: 'box', params: { lengthX: w, lengthY: h, lengthZ: d, pivot: 'bottom' } }, material: { type: 'solid', params: { color: bodyColor } } },
              // parapet rim
              { geometry: { type: 'box', params: { lengthX: w, lengthY: 0.5, lengthZ: d } }, material: { type: 'solid', params: { color: '#8b6b48' } }, localPosition: [0, h - 0.1, 0] },
              // roof (hip roof via shallow pyramid)
              { geometry: { type: 'pyramid', params: { width: w + 0.8, height: roofH, depth: d + 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: tileColor, roughness: 0.8 } }, localPosition: [0, h + 0.1, 0] },
              // optional second, taller sub-building
              ...(addSecondary ? [
                { geometry: { type: 'box', params: { lengthX: w2, lengthY: h2, lengthZ: d2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: bodyColor } }, localPosition: [ox2, 0, oz2] },
                { geometry: { type: 'box', params: { lengthX: w2, lengthY: 0.5, lengthZ: d2 } }, material: { type: 'solid', params: { color: '#8b6b48' } }, localPosition: [ox2, h2 - 0.1, oz2] },
                { geometry: { type: 'pyramid', params: { width: w2 + 0.8, height: roofH2, depth: d2 + 0.8, pivot: 'bottom' } }, material: { type: 'solid', params: { color: tileColor, roughness: 0.8 } }, localPosition: [ox2, h2 + 0.1, oz2] }
              ] : [])
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });

      // Climb aids: window sills or protruding planks, plus occasional scaffolding
      // Helper to compute wall plane offsets for any rectangular volume
      const makeOffset = (sideName, width, depth, baseX = 0, baseZ = 0) => {
        switch (sideName) {
          case 'north': return { xOff: baseX + 0, zOff: baseZ + depth / 2 + 0.16, along: 'x', width };
          case 'south': return { xOff: baseX + 0, zOff: baseZ - (depth / 2 + 0.16), along: 'x', width };
          case 'east':  return { xOff: baseX + (width / 2 + 0.16), zOff: baseZ + 0, along: 'z', width: depth };
          case 'west':  return { xOff: baseX - (width / 2 + 0.16), zOff: baseZ + 0, along: 'z', width: depth };
        }
      };

      const addWallAdornments = (width, depth, baseX = 0, baseZ = 0, heightLimit = h) => {
        // Choose up to 2 sides
        const candidates = [];
        if (Math.random() < 0.75) candidates.push('north');
        if (Math.random() < 0.75) candidates.push('south');
        if (Math.random() < 0.35) candidates.push('east');
        if (Math.random() < 0.35) candidates.push('west');
        const picked = candidates.slice(0, 2);
        for (const sideName of picked) {
          const o = makeOffset(sideName, width, depth, baseX, baseZ);
          const parts = [];
          // choose mode: either sills OR beams
          const mode = Math.random() < 0.6 ? 'sills' : 'beams';
          const maxY = Math.min(heightLimit - 0.8, 7.5 + Math.random() * 2.0);
          if (mode === 'sills') {
            // Fewer rows, one sill per row
            for (let y = 1.3; y <= maxY; y += 2.2) {
              const t = rand(0.25, 0.75);
              if (o.along === 'x') {
                const px = -width / 2 + t * width;
                parts.push({ geometry: { type: 'box', params: { lengthX: 0.9, lengthY: 0.12, lengthZ: 0.26 } }, material: { type: 'solid', params: { color: '#bfa88b' } }, localPosition: [px, y, 0] });
              } else {
                const pz = -depth / 2 + t * depth;
                parts.push({ geometry: { type: 'box', params: { lengthX: 0.26, lengthY: 0.12, lengthZ: 0.9 } }, material: { type: 'solid', params: { color: '#bfa88b' } }, localPosition: [0, y, pz] });
              }
            }
          } else {
            // Sparse protruding planks (beams)
            for (let y = 1.6; y <= maxY; y += 2.4) {
              const t = rand(0.2, 0.8);
              if (o.along === 'x') {
                const px = -width / 2 + t * width;
                parts.push({ geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 0.16, lengthZ: 0.9 } }, material: { type: 'wood', params: { color: '#7a5a3a' } }, localPosition: [px, y, 0.55] });
              } else {
                const pz = -depth / 2 + t * depth;
                parts.push({ geometry: { type: 'box', params: { lengthX: 0.9, lengthY: 0.16, lengthZ: 0.5 } }, material: { type: 'wood', params: { color: '#7a5a3a' } }, localPosition: [0.55, y, pz] });
              }
            }
          }

          if (parts.length) {
            spawn({
              Transform: { x: x + o.xOff, y: groundY, z: z + o.zOff },
              Body: { type: 'composite', params: { parts } },
              MotionSource: { type: 'static', params: {} }
            });
          }
        }
      };

      // Apply adornments to base volume
      addWallAdornments(w, d, 0, 0, h);
      // And to the optional taller inner volume (aligned to its own wall planes)
      if (addSecondary) addWallAdornments(w2, d2, ox2, oz2, h2);

      // Scaffolding: a compact tower with 1-2 platforms
      if (Math.random() < 0.45) {
        const sideName = choice(['north', 'south', 'east', 'west']);
  const o = makeOffset(sideName, w, d, 0, 0);
        const height = clamp(totalH * rand(0.45, 0.8), 3.2, 8.5);
        const footprintX = o.along === 'x' ? 2.0 : 1.6;
        const footprintZ = o.along === 'x' ? 1.6 : 2.0;
        const px = x + (o.xOff === 0 ? rand(-w*0.25, w*0.25) : (o.xOff > 0 ? o.xOff + 0.8 : o.xOff - 0.8));
        const pz = z + (o.zOff === 0 ? rand(-d*0.25, d*0.25) : (o.zOff > 0 ? o.zOff + 0.8 : o.zOff - 0.8));
        const platY1 = groundY + Math.min(height * 0.55, totalH - 1.0);
        const platY2 = groundY + Math.min(height * 0.9, totalH - 0.6);
        const parts = [];
        // posts
        const post = (lx, lz) => ({ geometry: { type: 'box', params: { lengthX: 0.14, lengthY: height, lengthZ: 0.14, pivot: 'bottom' } }, material: { type: 'wood', params: { color: '#6e5234' } }, localPosition: [lx, 0, lz] });
        const hx = footprintX / 2, hz = footprintZ / 2;
        parts.push(post(-hx, -hz), post(hx, -hz), post(-hx, hz), post(hx, hz));
        // braces/platforms
        parts.push(
          { geometry: { type: 'box', params: { lengthX: footprintX, lengthY: 0.18, lengthZ: footprintZ } }, material: { type: 'wood', params: { color: '#7a5a3a' } }, localPosition: [0, platY1 - groundY, 0] }
        );
        if (Math.random() < 0.7) parts.push({ geometry: { type: 'box', params: { lengthX: footprintX, lengthY: 0.18, lengthZ: footprintZ } }, material: { type: 'wood', params: { color: '#7a5a3a' } }, localPosition: [0, platY2 - groundY, 0] });

        spawn({
          Transform: { x: px, y: groundY, z: pz },
          Body: { type: 'composite', params: { parts } },
          MotionSource: { type: 'static', params: {} }
        });
      }

      // Occasional balcony to ease jumps
      if (Math.random() < 0.4) {
        const bx = x + (Math.random() < 0.5 ? (w / 2 + 0.6) : (-w / 2 - 0.6));
        const bz = z + rand(-d * 0.3, d * 0.3);
        const by = groundY + rand(totalH * 0.35, totalH * 0.8);
        spawn({
          Transform: { x: bx, y: by, z: bz },
          Body: { type: 'composite', params: { parts: [
            { geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.2, lengthZ: 1.0 } }, material: { type: 'wood', params: { color: '#7a5a3a' } } },
            { geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 0.8, lengthZ: 0.1 } }, material: { type: 'wood', params: { color: '#6e5234' } }, localPosition: [0, 0.5, 0.5] }
          ] } },
          MotionSource: { type: 'static', params: {} }
        });
      }

  // Place occasional Florins atop roofs
  if (Math.random() < 0.18) spawn('florin_coin', { Transform: { x: x + rand(-w * 0.2, w * 0.2), y: groundY + h + roofH + 0.6, z: z + rand(-d * 0.2, d * 0.2) } });
  if (addSecondary && Math.random() < 0.18) spawn('florin_coin', { Transform: { x: x + ox2 + rand(-w2 * 0.2, w2 * 0.2), y: groundY + h2 + roofH2 + 0.6, z: z + oz2 + rand(-d2 * 0.2, d2 * 0.2) } });

  // Track roof(s) for future connections
  roofs.push({ x, z, y: groundY + h + roofH + 0.35, w, d, h: groundY + h });
  if (addSecondary) roofs.push({ x: x + ox2, z: z + oz2, y: groundY + h2 + roofH2 + 0.35, w: w2, d: d2, h: groundY + h2 });
    }

    // Generate grid of blocks, skipping clear zones and river
    for (let gx = -half + 20; gx <= half - 20; gx += gridStep) {
      for (let gz = -half + 20; gz <= half - 20; gz += gridStep) {
        if (keepOut(gx, gz)) continue;
        // occasional plaza
        if (Math.random() < 0.12) {
          // small plaza marker and market stalls
          const py = sampleH(gx, gz);
          spawn({
            Info: { name: 'Market Plaza' },
            Transform: { x: gx, y: py + 0.05, z: gz },
            Body: { type: 'composite', params: { parts: [
              { geometry: { type: 'cylinder', params: { radius: 6, height: 0.3 } }, material: { type: 'solid', params: { color: '#c6b39a' } } }
            ] } },
            MotionSource: { type: 'static', params: {} }
          });
          // stalls
          for (let i = 0; i < 4 + Math.floor(Math.random() * 3); i++) {
            const ox = rand(-4, 4), oz = rand(-4, 4);
            spawn({
              Transform: { x: gx + ox, y: py + 0.6, z: gz + oz },
              Body: { type: 'composite', params: { parts: [
                { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.6, lengthZ: 1.0 } }, material: { type: 'wood', params: { color: '#7a5a3a' } } },
                { geometry: { type: 'box', params: { lengthX: 2.2, lengthY: 0.1, lengthZ: 1.0 } }, material: { type: 'solid', params: { color: choice(['#c37f4f', '#b56e3f', '#9f5d2f']) } }, localPosition: [0, 0.6, 0] }
              ] } },
              MotionSource: { type: 'static', params: {} }
            });
            if (Math.random() < 0.5) spawn('florin_coin', { Transform: { x: gx + ox + rand(-0.6, 0.6), y: py + 0.8, z: gz + oz + rand(-0.6, 0.6) } });
          }
          continue;
        }

        const w = rand(12, 18);
        const d = rand(10, 16);
        const floors = Math.floor(rand(2, 5.5));
        spawnBuilding(gx + rand(-3, 3), gz + rand(-3, 3), w, d, floors);
      }
    }

    // Rooftop connections: beams and planks across alleys
    const maxBridgeSpan = alley + 8;
    for (let i = 0; i < roofs.length; i++) {
      const a = roofs[i];
      for (let j = i + 1; j < roofs.length; j++) {
        const b = roofs[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist < maxBridgeSpan && Math.abs(a.y - b.y) < 1.8 && Math.random() < 0.28) {
          const angle = Math.atan2(dz, dx);
          const midx = (a.x + b.x) / 2;
          const midz = (a.z + b.z) / 2;
          const midy = (a.y + b.y) / 2;
          spawn({
            Info: { name: 'Rooftop Beam' },
            Transform: { x: midx, y: midy, z: midz, ry: angle },
            Body: {
              type: 'composite',
              params: {
                parts: [
                  { geometry: { type: 'box', params: { lengthX: 1.0, lengthY: 0.2, lengthZ: dist + 0.8 } }, material: { type: 'wood', params: { color: '#6e5234' } } }
                ]
              }
            },
            MotionSource: { type: 'static', params: {} }
          });
          if (Math.random() < 0.2) {
            // a plank stack near one end for easier up-step
            spawn({
              Transform: { x: a.x + dx * 0.25, y: a.y - 0.2, z: a.z + dz * 0.25, ry: angle },
              Body: { type: 'composite', params: { parts: [
                { geometry: { type: 'box', params: { lengthX: 1.0, lengthY: 0.16, lengthZ: 1.2 } }, material: { type: 'wood', params: { color: '#7a5a3a' } } }
              ] } },
              MotionSource: { type: 'static', params: {} }
            });
          }
        }
      }
    }

    // Place a handful of explicit rooftop viewpoints to guide traversal
    for (let i = 0; i < 9; i++) {
      const r = roofs[Math.floor(Math.random() * roofs.length)];
      if (!r) break;
      spawn('viewpoint_marker', { Transform: { x: r.x + rand(-2, 2), y: r.y + 0.5, z: r.z + rand(-2, 2) } });
    }

    // Guards: street patrols and a few rooftop sentries
    const guardSpots = [
      { x: ponteX - 10, z: ponteZ + 10 },
      { x: ponteX + 12, z: ponteZ - 12 },
      { x: duomoX + 18, z: duomoZ - 12 },
      { x: palX - 10, z: palZ + 8 },
      { x: 22, z: 18 },
      { x: -12, z: -24 }
    ];
    guardSpots.forEach(({ x, z }) => {
      const y = sampleH(x, z) + 1.6;
      spawn('city_guard', { Transform: { x, y, z } });
    });
    // rooftop sentries
    for (let i = 0; i < 4; i++) {
      const r = roofs[Math.floor(Math.random() * roofs.length)];
      if (!r) continue;
      spawn('city_guard', { Transform: { x: r.x, y: r.y + 1.1, z: r.z } });
    }

    // Distribute gear caches on roofs
    for (let i = 0; i < 6; i++) {
      const r = roofs[Math.floor(Math.random() * roofs.length)];
      if (!r) continue;
      const kind = Math.random() < 0.6 ? 'crossbow' : (Math.random() < 0.5 ? 'smoke_bomb' : 'hidden_blade');
      spawn(kind, { Transform: { x: r.x + rand(-1.2, 1.2), y: r.y + 0.5, z: r.z + rand(-1.2, 1.2) } });
    }

    // A few signs that provide popups (tutorial hints)
    const hint = (x, z, text) => {
      const y = sampleH(x, z) + 0.01;
      spawn({
        Info: { name: 'Noticeboard' },
        Transform: { x, y: y + 0.6, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 1.2, lengthZ: 0.2, pivot: 'bottom' } }, material: { type: 'wood', params: { color: '#6e5234' } } },
              { geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 0.8, lengthZ: 0.06 } }, material: { type: 'solid', params: { color: '#f1e4c5' } }, localPosition: [0, 0.9, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'popup', params: { text }, target: 'other' }] }]
      });
    };
  hint(ponteX + 8, ponteZ + 10, 'Tip: Planks and beams connect rooftops.\nUse window sills, scaffolding, and wall planks to reach your first roof.');
    hint(duomoX - 8, duomoZ + 20, 'Tip: Interact with golden markers to “synchronize” a viewpoint.\nThey also count towards Rooftop Runner.');

    // Player start on a mid-rise roof with a nearby path to landmarks
    // choose roof closest to midpoint between Duomo and Ponte
    const targetX = (duomoX + ponteX) / 2;
    const targetZ = (duomoZ + ponteZ) / 2;
    let best = roofs[0];
    let bestD = Infinity;
    for (const r of roofs) {
      const d = Math.hypot(r.x - targetX, r.z - targetZ);
      if (d < bestD) { bestD = d; best = r; }
    }
    const playerStart = best || { x: 0, y: sampleH(0, 0) + 1.4, z: 0 };
    spawn('player', {
      Transform: { x: playerStart.x, y: playerStart.y + 1.2, z: playerStart.z },
      Inventory: { size: 4, items: ['hidden_blade', 'smoke_bomb'], selectedItemIndex: 0 }
    });

    // Extra discoveries for achievements
    // - Additional explicit discovery entity on the Ponte Vecchio deck
    spawn({
      Info: { name: 'Ponte Vecchio' },
      Transform: { x: ponteX, y: ponteDeckY + 1.2, z: ponteZ },
      Body: {
        type: 'composite',
        params: { parts: [{ geometry: { type: 'box', params: { lengthX: ponteWidth - 1, lengthY: 1.2, lengthZ: 2.0 } }, material: { type: 'solid', params: { color: '#d0c090', opacity: 0.001 } }, ignoreCollisions: true }] }
      },
      MotionSource: { type: 'static', params: {} },
            Rules: [{ trigger: { type: 'entityInRange', params: { range: 3.5 } }, cooldown: 1.5, actions: [{ type: 'discover', params: {}, target: 'self', range: 3.5 }] }]
    });

    // Scatter more Florins along routes and rooftops
    for (let i = 0; i < 18; i++) {
      const roof = roofs[Math.floor(Math.random() * roofs.length)];
      if (!roof) break;
      spawn('florin_coin', { Transform: { x: roof.x + rand(-2, 2), y: roof.y + 0.3, z: roof.z + rand(-2, 2) } });
    }
    for (let i = 0; i < 12; i++) {
      const x = rand(-half * 0.8, half * 0.8);
      const z = rand(-half * 0.8, half * 0.8);
      if (keepOut(x, z)) continue;
      const y = sampleH(x, z) + 0.6;
      spawn('florin_coin', { Transform: { x, y, z } });
    }

    // Ambient lights around landmark plazas (warm Renaissance lantern glow)
    const lanterns = [
      { x: duomoX + 10, z: duomoZ + 6, y: baseY + 1.6 },
      { x: palX - 10, z: palZ - 6, y: palY + 1.6 },
      { x: ponteX + 16, z: ponteZ + 5, y: ponteDeckY + 1.2 }
    ];
    for (const l of lanterns) {
      spawn({
        Transform: { x: l.x, y: l.y, z: l.z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'cylinder', params: { radius: 0.08, height: 2.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#5a4a2e' } } },
              { light: { type: 'point', params: { intensity: 2.2, range: 10, color: '#ffdd88' } }, localPosition: [0, 1.8, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // A couple of hay carts for dramatic drops
    for (let i = 0; i < 3; i++) {
      const x = rand(-half * 0.7, half * 0.7);
      const z = rand(-half * 0.7, half * 0.7);
      if (keepOut(x, z)) continue;
      const y = sampleH(x, z);
      spawn({
        Info: { name: 'Hay Cart' },
        Transform: { x, y: y + 0.6, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 3.2, lengthY: 0.6, lengthZ: 2.0 } }, material: { type: 'wood', params: { color: '#6e5234' } } },
              { geometry: { type: 'box', params: { lengthX: 3.0, lengthY: 1.2, lengthZ: 1.8 } }, material: { type: 'solid', params: { color: '#d1b77a' } }, localPosition: [0, 0.8, 0] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Final touch: a few extra rooftop planks near Duomo and Palazzo to ensure traversability
    const ensureLink = (ax, az, bx, bz) => {
      const ay = sampleH(ax, az) + 6;
      const by = sampleH(bx, bz) + 6;
      const angle = Math.atan2(bz - az, bx - ax);
      const midx = (ax + bx) / 2;
      const midz = (az + bz) / 2;
      spawn({
        Transform: { x: midx, y: (ay + by) / 2, z: midz, ry: angle },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: 1.0, lengthY: 0.2, lengthZ: Math.hypot(bx - ax, bz - az) + 0.6 } }, material: { type: 'wood', params: { color: '#6e5234' } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
    };
    ensureLink(duomoX + 22, duomoZ - 16, duomoX + 12, duomoZ - 6);
    ensureLink(palX - 14, palZ + 10, palX - 24, palZ + 12);
  }
};
