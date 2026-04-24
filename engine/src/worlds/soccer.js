export default {
  setupScene(api) {
    const { spawn, initialize, getModule } = api;

    // Resources and modules
    const fields = getModule('field');
    const archetypes = getModule('archetype');

    // World initialization
    initialize({
      title: 'Soccer Stadium – Match Day',
      description: 'A modern football stadium with full bowl seating, canopy roofs, perimeter catwalk ring, and a player tunnel. Kick the ball around as NPCs swarm and chase it.',
      tags: ['sports', 'stadium', 'soccer', 'football'],
      brandColors: ['#1f8f45', '#ffffff', '#c0c0c0'],
      dimensions: [{
        name: 'Stadium',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#91c9f7',
          sun: {
            color: '#ffeedd',
            intensity: 1.05,
            timeOfDay: 1300
          },
          clouds: {
            color: '#ffffff',
            coverage: 0.2
          },
          stars: {
            intensity: 0.0
          }
        }
      }],
      achievements: [
        {
          name: 'Kickoff',
          description: 'Approach the match ball at midfield.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Match Ball',
              targetValue: 1
            }
          }
        },
        {
          name: 'End-to-End',
          description: 'Visit both goals.',
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'discoveries', subtype: 'Home Goal' },
                { metric: 'discoveries', subtype: 'Away Goal' }
              ],
              targetValue: 2
            }
          }
        },
        {
          name: 'Find the Tunnel',
          description: 'Discover the player tunnel behind the South Stand.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'discoveries',
              subtype: 'Player Tunnel',
              targetValue: 1
            }
          }
        },
        {
          name: 'Stadium Tour',
          description: 'Discover all four stands.',
          condition: {
            type: 'sum',
            params: {
              metrics: [
                { metric: 'discoveries', subtype: 'North Stand' },
                { metric: 'discoveries', subtype: 'South Stand' },
                { metric: 'discoveries', subtype: 'East Stand' },
                { metric: 'discoveries', subtype: 'West Stand' }
              ],
              targetValue: 4
            }
          }
        },
        {
          name: 'Hydrated',
          description: 'Pick up a water bottle from the sideline.',
          condition: {
            type: 'greaterThanOrEqual',
            params: {
              metric: 'items picked up',
              subtype: 'Water Bottle',
              targetValue: 1
            }
          }
        }
      ]
    });

    // Field constants (meters)
    const pitchLength = 105;
    const pitchWidth = 68;
    const halfL = pitchLength / 2;
    const halfW = pitchWidth / 2;
    const lineThickness = 0.2; // ~20cm
    const lineLift = 0.02; // lifted to avoid z-fighting

    // Subtle grass variation via a tiny displacement field (visual micro-variation)
    const grassNoise = fields.register('grassNoise', {
      type: 'simplex',
      params: { seed: 2025, frequency: 0.08, amplitude: 0.02, octaves: 3 }
    });

    // Stadium ground slab
    const groundSize = 260;
    spawn({
      Info: { name: 'Stadium Base' },
      Transform: { y: -0.2 },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: groundSize, lengthY: 0.4, lengthZ: groundSize } },
            material: { type: 'solid', params: { color: '#606770', roughness: 0.9 } }
          }]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Grass pitch (slightly displaced)
    spawn({
      Info: { name: 'Pitch' },
      Transform: {},
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              tag: 'pitch',
              geometry: { type: 'displacedPlane', params: { lengthX: pitchWidth, lengthZ: pitchLength, field: 'grassNoise' } },
              material: { type: 'solid', params: { color: '#1f8f45', roughness: 1.0 } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Alternating mowing stripes (subtle color bands)
    const stripeCount = 10;
    for (let i = 0; i < stripeCount; i++) {
      const stripeW = pitchWidth / stripeCount;
      const xCenter = -halfW + stripeW * (i + 0.5);
      const color = i % 2 === 0 ? '#209548' : '#1c7f3e';
      spawn({
        Transform: { x: xCenter, y: 0.005, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [{
              geometry: { type: 'box', params: { lengthX: stripeW, lengthY: 0.01, lengthZ: pitchLength } },
              material: { type: 'solid', params: { color, roughness: 1.0 } }
            }]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Field lines
    const linePart = (x, z, sx, sz) => ({
      geometry: { type: 'box', params: { lengthX: sx, lengthY: 0.02, lengthZ: sz } },
      material: { type: 'solid', params: { color: '#ffffff', roughness: 0.8 } },
      localPosition: [x, 0, z]
    });

    // Boundary lines
    {
      const parts = [];
      // Sidelines (along Z at x = +/- halfW)
      parts.push(linePart(halfW, 0, lineThickness, pitchLength));
      parts.push(linePart(-halfW, 0, lineThickness, pitchLength));
      // Goal lines (along X at z = +/- halfL)
      parts.push(linePart(0, halfL, pitchWidth, lineThickness));
      parts.push(linePart(0, -halfL, pitchWidth, lineThickness));
      // Center line
      parts.push(linePart(0, 0, pitchWidth, lineThickness));
      // Penalty boxes and goal areas
      const pbDepth = 16.5, pbWidth = 40.3;
      const gaDepth = 5.5, gaWidth = 18.32;
      const mkRect = (zSign, depth, width) => {
        const frontZ = zSign * (halfL - depth);
        const backZ = zSign * halfL;
        // Sides
        parts.push(linePart(width / 2, (frontZ + backZ) / 2, lineThickness, Math.abs(backZ - frontZ)));
        parts.push(linePart(-width / 2, (frontZ + backZ) / 2, lineThickness, Math.abs(backZ - frontZ)));
        // Top
        parts.push(linePart(0, frontZ, width, lineThickness));
      };
      mkRect(1, pbDepth, pbWidth);
      mkRect(-1, pbDepth, pbWidth);
      mkRect(1, gaDepth, gaWidth);
      mkRect(-1, gaDepth, gaWidth);

      spawn({
        Transform: { y: lineLift },
        Body: { type: 'composite', params: { parts } },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Center circle and spots
    spawn({
      Transform: { y: lineLift },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'torus', params: { majorRadius: 9.15, minorRadius: 0.06 } },
              material: { type: 'solid', params: { color: '#ffffff' } }
            },
            {
              geometry: { type: 'cylinder', params: { radius: 0.1, height: 0.02 } },
              material: { type: 'solid', params: { color: '#ffffff' } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    // Penalty spots
    const penSpot = (zSign) => spawn({
      Transform: { y: lineLift, z: zSign * (halfL - 11) },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.1, height: 0.02 } }, material: { type: 'solid', params: { color: '#ffffff' } } }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });
    penSpot(1);
    penSpot(-1);

    // Goals (frames + simple lattice nets)
    const goalWidth = 7.32;
    const goalHeight = 2.44;
    const netDepth = 2.0;
    const mkGoal = (zSign, name) => {
      const z = zSign * (halfL + 0.05);
      const y = 0; // base
      const x = 0;
      const posts = [];
      // Posts
      posts.push({
        geometry: { type: 'box', params: { lengthX: 0.12, lengthY: goalHeight, lengthZ: 0.12, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: '#ffffff' } },
        localPosition: [-goalWidth / 2, y, z]
      });
      posts.push({
        geometry: { type: 'box', params: { lengthX: 0.12, lengthY: goalHeight, lengthZ: 0.12, pivot: 'bottom' } },
        material: { type: 'solid', params: { color: '#ffffff' } },
        localPosition: [goalWidth / 2, y, z]
      });
      // Crossbar
      posts.push({
        geometry: { type: 'box', params: { lengthX: goalWidth + 0.12, lengthY: 0.12, lengthZ: 0.12 } },
        material: { type: 'solid', params: { color: '#ffffff' } },
        localPosition: [0, goalHeight, z]
      });
      // Net lattice (thin vertical and horizontal slats)
      const slats = [];
      const vCount = 7;
      const hCount = 5;
      for (let i = 0; i <= vCount; i++) {
        const vx = -goalWidth / 2 + (goalWidth / vCount) * i;
        slats.push({
          geometry: { type: 'box', params: { lengthX: 0.03, lengthY: goalHeight, lengthZ: netDepth } },
          material: { type: 'solid', params: { color: '#dfe5ef', opacity: 0.35 } },
          localPosition: [vx, goalHeight / 2, z - zSign * (netDepth / 2)]
        });
      }
      for (let j = 0; j <= hCount; j++) {
        const vy = (goalHeight / hCount) * j;
        slats.push({
          geometry: { type: 'box', params: { lengthX: goalWidth, lengthY: 0.03, lengthZ: netDepth } },
          material: { type: 'solid', params: { color: '#dfe5ef', opacity: 0.35 } },
          localPosition: [0, vy, z - zSign * (netDepth / 2)]
        });
      }

      spawn({
        Info: { name },
        Transform: { x, y, z },
        Body: { type: 'composite', params: { parts: [...posts, ...slats] } },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 4.5 } }, cooldown: 2, actions: [
            { type: 'discover', params: {}, target: 'self', range: 4.5 }
          ] }]
      });
    };
    mkGoal(1, 'Home Goal');
    mkGoal(-1, 'Away Goal');

    // Player tunnel behind the South Stand (negative Z)
    {
      const tunnelZ = -(halfL + 10);
      const tunnelX = 0;
      const tunnelY = 0;
      spawn({
        Info: { name: 'Player Tunnel', description: 'Access tunnel to the dressing rooms.' },
        Transform: { x: tunnelX, y: tunnelY + 1.2, z: tunnelZ },
        Body: {
          type: 'composite',
          params: {
            hasInterior: true,
            parts: [
              // Portal frame
              { geometry: { type: 'box', params: { lengthX: 6, lengthY: 3, lengthZ: 0.4 } }, material: { type: 'solid', params: { color: '#b5b9bf' } } },
              // Tunnel body
              { geometry: { type: 'box', params: { lengthX: 4.5, lengthY: 2.5, lengthZ: 14 } }, material: { type: 'solid', params: { color: '#9ea4aa', opacity: 0.92 } }, localPosition: [0, -0.1, -7] },
              // Floor strip
              { geometry: { type: 'box', params: { lengthX: 4.5, lengthY: 0.1, lengthZ: 14, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#6b737a' } }, localPosition: [0, -1.3, -7] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 6 } }, cooldown: 2, actions: [
            { type: 'discover', params: {}, target: 'self', range: 6.0 }
          ] }]
      });
    }

    // Stand generator
    function spawnStand(label, facing, offset, length, depthRows, rowLen, vomGaps = [ -2, 0, 2 ]) {
      // facing: 'north' (z+), 'south' (z-), 'east' (x+), 'west' (x-)
      const rowHeight = 0.4;
      const rowDepth = 1.1;
      const parts = [];

      // Seating rows with vomitories (gaps) in lower rows
      const segmentsAcross = 12; // segmentation for leaving gaps
      for (let r = 0; r < depthRows; r++) {
        const y = (r + 0.5) * rowHeight;
        const depth = (r + 0.5) * rowDepth;
        const nearRows = r < 6;
        for (let s = -segmentsAcross / 2; s < segmentsAcross / 2; s++) {
          const gapCol = vomGaps.includes(s) && nearRows;
          if (gapCol) continue;

          const segW = rowLen / segmentsAcross - 0.2;
          const segXCenter = (s + 0.5) * (rowLen / segmentsAcross);

          const seatColor = r % 2 === 0 ? '#d4d8dc' : '#c9cfd6';
          const bench = {
            geometry: { type: 'box', params: { lengthX: segW, lengthY: 0.25, lengthZ: rowDepth } },
            material: { type: 'solid', params: { color: seatColor, roughness: 0.9 } }
          };

          if (facing === 'north') {
            parts.push({ ...bench, localPosition: [segXCenter, y, halfL + offset + depth] });
          } else if (facing === 'south') {
            parts.push({ ...bench, localPosition: [segXCenter, y, -(halfL + offset + depth)] });
          } else if (facing === 'east') {
            // rotate notionally: swap x/z usage for east/west stands
            parts.push({ ...bench, localPosition: [halfW + offset + depth, y, segXCenter], localRotation: [0, Math.PI / 2, 0] });
          } else if (facing === 'west') {
            parts.push({ ...bench, localPosition: [-(halfW + offset + depth), y, segXCenter], localRotation: [0, Math.PI / 2, 0] });
          }
        }
      }

      // Low wall/railing at front
      if (facing === 'north') {
        parts.push({
          geometry: { type: 'box', params: { lengthX: rowLen, lengthY: 1.0, lengthZ: 0.2 } },
          material: { type: 'solid', params: { color: '#bfc5cb' } },
          localPosition: [0, 0.6, halfL + offset]
        });
      } else if (facing === 'south') {
        parts.push({
          geometry: { type: 'box', params: { lengthX: rowLen, lengthY: 1.0, lengthZ: 0.2 } },
          material: { type: 'solid', params: { color: '#bfc5cb' } },
          localPosition: [0, 0.6, -(halfL + offset)]
        });
      } else if (facing === 'east') {
        parts.push({
          geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 1.0, lengthZ: rowLen } },
          material: { type: 'solid', params: { color: '#bfc5cb' } },
          localPosition: [halfW + offset, 0.6, 0]
        });
      } else if (facing === 'west') {
        parts.push({
          geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 1.0, lengthZ: rowLen } },
          material: { type: 'solid', params: { color: '#bfc5cb' } },
          localPosition: [-(halfW + offset), 0.6, 0]
        });
      }

      // Canopy roof and vertical supports
      const topY = depthRows * rowHeight + 3;
      const roofDepth = 10;
      const supportEvery = 10;
      if (facing === 'north' || facing === 'south') {
        const roofZ = facing === 'north' ? (halfL + offset + depthRows * rowDepth + 0.6) : -(halfL + offset + depthRows * rowDepth + 0.6);
        parts.push({
          geometry: { type: 'box', params: { lengthX: rowLen + 6, lengthY: 0.4, lengthZ: roofDepth } },
          material: { type: 'solid', params: { color: '#a7b0b8' } },
          localPosition: [0, topY, roofZ + (facing === 'north' ? 0 : 0)]
        });
        for (let x = -rowLen / 2; x <= rowLen / 2; x += supportEvery) {
          parts.push({
            geometry: { type: 'cylinder', params: { radius: 0.25, height: topY - 1.0, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#8b939a' } },
            localPosition: [x, 1.0, facing === 'north' ? (roofZ - roofDepth / 2) : (roofZ + roofDepth / 2)]
          });
        }
      } else {
        const roofX = facing === 'east' ? (halfW + offset + depthRows * rowDepth + 0.6) : -(halfW + offset + depthRows * rowDepth + 0.6);
        parts.push({
          geometry: { type: 'box', params: { lengthX: roofDepth, lengthY: 0.4, lengthZ: rowLen + 6 } },
          material: { type: 'solid', params: { color: '#a7b0b8' } },
          localPosition: [roofX, topY, 0]
        });
        for (let z = -rowLen / 2; z <= rowLen / 2; z += supportEvery) {
          parts.push({
            geometry: { type: 'cylinder', params: { radius: 0.25, height: topY - 1.0, pivot: 'bottom' } },
            material: { type: 'solid', params: { color: '#8b939a' } },
            localPosition: [facing === 'east' ? (roofX - roofDepth / 2) : (roofX + roofDepth / 2), 1.0, z]
          });
        }
      }

      // Stand entity with discovery marker range
      spawn({
        Info: { name: label },
        Transform: {},
        Body: { type: 'composite', params: { parts } },
        MotionSource: { type: 'static', params: {} },
                Rules: [{ trigger: { type: 'entityInRange', params: { range: 6 } }, cooldown: 4, actions: [{ type: 'discover', params: {}, target: 'self', range: 6.0 }] }]
      });
    }

    // Spawn four stands
    spawnStand('North Stand', 'north', 6, pitchLength, 16, pitchWidth + 60);
    spawnStand('South Stand', 'south', 6, pitchLength, 16, pitchWidth + 60);
    spawnStand('East Stand', 'east', 6, pitchWidth, 14, pitchLength + 60);
    spawnStand('West Stand', 'west', 6, pitchWidth, 14, pitchLength + 60);

    // Perimeter catwalk ring tying stadium together (rectangular ring above roofs)
    {
      const ringY = 16;
      const ringW = pitchWidth + 120;
      const ringL = pitchLength + 120;
      const ringThickness = 1.2;
      const ringDepth = 0.6;
      const ringColor = '#9aa3ab';
      // North and South
      spawn({
        Transform: { y: ringY, z: (ringL / 2) },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: ringW, lengthY: ringDepth, lengthZ: ringThickness } }, material: { type: 'solid', params: { color: ringColor } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
      spawn({
        Transform: { y: ringY, z: -(ringL / 2) },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: ringW, lengthY: ringDepth, lengthZ: ringThickness } }, material: { type: 'solid', params: { color: ringColor } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
      // East and West
      spawn({
        Transform: { y: ringY, x: (ringW / 2) },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: ringThickness, lengthY: ringDepth, lengthZ: ringL } }, material: { type: 'solid', params: { color: ringColor } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
      spawn({
        Transform: { y: ringY, x: -(ringW / 2) },
        Body: { type: 'composite', params: { parts: [{ geometry: { type: 'box', params: { lengthX: ringThickness, lengthY: ringDepth, lengthZ: ringL } }, material: { type: 'solid', params: { color: ringColor } } }] } },
        MotionSource: { type: 'static', params: {} }
      });
    }

    // Water bottle pickup near the touchline
    spawn({
      Info: { name: 'Water Bottle' },
      Transform: { x: -halfW - 3, y: 0.2, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            { geometry: { type: 'cylinder', params: { radius: 0.08, height: 0.28, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#1aa3c4' } } },
            { geometry: { type: 'cylinder', params: { radius: 0.07, height: 0.06, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#e7ecef' } }, localPosition: [0, 0.28, 0] }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.25 } },
            Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }]
    });

    // Kicking boot item (gives the player a strong "kick" on primary action)
    archetypes.register('kicker_boot', {
      type: 'bundle',
      params: {
        Info: { name: 'Kicking Boot' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // very small visible token
              { geometry: { type: 'box', params: { lengthX: 0.18, lengthY: 0.08, lengthZ: 0.3 } }, material: { type: 'solid', params: { color: '#333333' } } }
            ]
          }
        },
        MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.5 } },
                Rules: [{ trigger: { type: 'interact' }, actions: [{ type: 'getPickedUp', params: {}, target: 'self' }] }, { trigger: { type: 'primaryAction', params: { range: 2.2 } }, cooldown: 0.25, actions: [
            {
              type: 'damage',
              params: { amount: 1, knockback: 18 },
              target: 'other',
              range: 2.2
            }
          ] }]
      }
    });

    // NPC chaser archetype (player_faction, will pursue the ball since it's enemy)
    archetypes.register('ball_chaser', {
      type: 'bundle',
      params: {
        Info: { name: 'Chaser' },
        Body: {
          type: 'composite',
          params: {
            parts: [
              // Simple humanoid
              {
                tag: 'spine',
                geometry: { type: 'box', params: { lengthX: 0.5, lengthY: 1.4, lengthZ: 0.3 } },
                material: { type: 'solid', params: { color: '#c8ccd2' } },
                children: [
                  { tag: 'head', geometry: { type: 'sphere', params: { radius: 0.22, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#e1e5ea' } }, localPosition: [0, 0.7, 0] },
                  { tag: 'arm_l', geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.7, lengthZ: 0.12, pivot: 'top' } }, material: { type: 'solid', params: { color: '#c8ccd2' } }, localPosition: [-0.31, 0.5, 0] },
                  { tag: 'arm_r', geometry: { type: 'box', params: { lengthX: 0.12, lengthY: 0.7, lengthZ: 0.12, pivot: 'top' } }, material: { type: 'solid', params: { color: '#c8ccd2' } }, localPosition: [0.31, 0.5, 0] },
                  { tag: 'leg_l', geometry: { type: 'box', params: { lengthX: 0.14, lengthY: 0.8, lengthZ: 0.14, pivot: 'top' } }, material: { type: 'solid', params: { color: '#b0b6bc' } }, localPosition: [-0.18, -0.7, 0] },
                  { tag: 'leg_r', geometry: { type: 'box', params: { lengthX: 0.14, lengthY: 0.8, lengthZ: 0.14, pivot: 'top' } }, material: { type: 'solid', params: { color: '#b0b6bc' } }, localPosition: [0.18, -0.7, 0] }
                ]
              }
            ]
          }
        },
        MotionSource: { type: 'characterController', params: { speed: 6.2, jumpHeight: 2.2, canFly: false } },
        Health: { value: 20 },
        AI: { isAggressive: true, awarenessRange: 120 },
        Faction: { id: 'player_faction' },
        Animation: {
          clips: [
            {
              name: 'default',
              duration: 1.5,
              tracks: [
                { targetTag: 'arm_l', keyframes: [{ time: 0, rotation: [0, 0, 0] }, { time: 0.75, rotation: [0, 0, -0.1] }, { time: 1.5, rotation: [0, 0, 0] }] },
                { targetTag: 'arm_r', keyframes: [{ time: 0, rotation: [0, 0, 0] }, { time: 0.75, rotation: [0, 0, 0.1] }, { time: 1.5, rotation: [0, 0, 0] }] }
              ]
            },
            {
              name: 'move',
              duration: 0.9,
              tracks: [
                { targetTag: 'arm_l', keyframes: [{ time: 0, rotation: [0.6, 0, 0] }, { time: 0.45, rotation: [-0.6, 0, 0] }, { time: 0.9, rotation: [0.6, 0, 0] }] },
                { targetTag: 'arm_r', keyframes: [{ time: 0, rotation: [-0.6, 0, 0] }, { time: 0.45, rotation: [0.6, 0, 0] }, { time: 0.9, rotation: [-0.6, 0, 0] }] },
                { targetTag: 'leg_l', keyframes: [{ time: 0, rotation: [-0.4, 0, 0] }, { time: 0.45, rotation: [0.4, 0, 0] }, { time: 0.9, rotation: [-0.4, 0, 0] }] },
                { targetTag: 'leg_r', keyframes: [{ time: 0, rotation: [0.4, 0, 0] }, { time: 0.45, rotation: [-0.4, 0, 0] }, { time: 0.9, rotation: [0.4, 0, 0] }] }
              ]
            }
          ]
        }
      }
    });

    // Player
    const playerY = 1.2;
    spawn('player', {
      Transform: { x: 0, y: playerY, z: 0 },
      Inventory: { size: 3, items: ['kicker_boot'], selectedItemIndex: 0 }
    });

    // The match ball (enemy faction; ONLY enemy)
    const ballRadius = 0.11;
    spawn({
      Info: { name: 'Match Ball', description: 'Official size 5 ball.' },
      Transform: { x: 0, y: ballRadius + 0.05, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              tag: 'ball',
              geometry: { type: 'sphere', params: { radius: ballRadius } },
              material: { type: 'solid', params: { color: '#ffffff', roughness: 0.5 } }
            }
          ]
        }
      },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 0.45, gravityScale: 1 } },
      Faction: { id: 'enemy_faction' },
            Rules: [{ trigger: { type: 'entityInRange', params: { range: 2.4 } }, cooldown: 1.5, actions: [
          { type: 'discover', params: {}, target: 'self', range: 2.4 }
        ] }]
    });

    // NPCs: defenders and teammates (all in player_faction)
    const npcPositions = [
      { x: -10, z: -8 },
      { x: 10, z: -12 },
      { x: -14, z: 12 },
      { x: 14, z: 8 },
      { x: -20, z: 0 },
      { x: 20, z: 0 }
    ];
    npcPositions.forEach((p, idx) => {
      spawn('ball_chaser', {
        Transform: { x: p.x, y: 1.2, z: p.z },
        Info: { name: idx < 3 ? 'Defender' : 'Teammate' }
      });
    });

    // Simple benches near the sideline
    {
      const benchZ = halfL - 15;
      const benchX = -halfW - 6;
      spawn({
        Transform: { x: benchX, y: 0.2, z: benchZ },
        Body: {
          type: 'composite',
          params: {
            parts: [
              { geometry: { type: 'box', params: { lengthX: 4.5, lengthY: 0.2, lengthZ: 0.8 } }, material: { type: 'wood', params: { color: '#825f3b', grainColor: '#604327', grainSize: 0.5 } } },
              { geometry: { type: 'box', params: { lengthX: 4.5, lengthY: 0.2, lengthZ: 0.4 } }, material: { type: 'wood', params: { color: '#906b42', grainColor: '#6a4a2e', grainSize: 0.4 } }, localPosition: [0, 0.5, -0.2] },
              { geometry: { type: 'cylinder', params: { radius: 0.1, height: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4b4f54' } }, localPosition: [-2.1, -0.2, -0.3] },
              { geometry: { type: 'cylinder', params: { radius: 0.1, height: 0.4, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#4b4f54' } }, localPosition: [2.1, -0.2, -0.3] }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} }
      });
    }
  }
};