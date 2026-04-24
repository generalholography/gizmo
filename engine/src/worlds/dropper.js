export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    initialize({
      title: 'Dropper Collider Sync Stress Test',
      description: 'A vertical dropper packed with animated obstacle colliders.',
      tags: ['physics', 'animation', 'stress-test'],
      dimensions: [
        {
          name: 'Dropper',
          gravity: -18,
          useDayNightCycle: false,
          sky: {
            color: '#8ec8ff',
            sun: {
              color: '#ffffff',
              intensity: 1,
              timeOfDay: 1100
            },
            clouds: {
              color: '#f4fbff',
              coverage: 0.15
            },
            stars: {
              intensity: 0
            }
          }
        }
      ],
      achievements: []
    });

    const wallMaterial = { type: 'solid', params: { color: '#d8dde8', roughness: 0.85 } };
    const floorMaterial = { type: 'solid', params: { color: '#6fc28b', roughness: 0.9 } };
    const hazardColors = ['#e84855', '#ffd166', '#06d6a0', '#118ab2', '#ef476f'];

    spawn({
      Info: { name: 'Landing Pad' },
      Transform: { x: 0, y: -122, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 28, lengthY: 1, lengthZ: 28 } },
              material: floorMaterial
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    const wallParts = [
      { localPosition: [0, -55, -14], geometry: { type: 'box', params: { lengthX: 30, lengthY: 140, lengthZ: 1 } }, material: wallMaterial },
      { localPosition: [0, -55, 14], geometry: { type: 'box', params: { lengthX: 30, lengthY: 140, lengthZ: 1 } }, material: wallMaterial },
      { localPosition: [-14, -55, 0], geometry: { type: 'box', params: { lengthX: 1, lengthY: 140, lengthZ: 30 } }, material: wallMaterial },
      { localPosition: [14, -55, 0], geometry: { type: 'box', params: { lengthX: 1, lengthY: 140, lengthZ: 30 } }, material: wallMaterial }
    ];

    spawn({
      Info: { name: 'Dropper Shaft Walls' },
      Transform: { x: 0, y: 0, z: 0 },
      Body: { type: 'composite', params: { parts: wallParts } },
      MotionSource: { type: 'static', params: {} }
    });

    function spawnSpinner(index, x, y, z, yaw, length, duration) {
      spawn({
        Info: { name: `Spinner ${index}` },
        Transform: { x, y, z, ry: yaw },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'bar',
                geometry: { type: 'box', params: { lengthX: length, lengthY: 0.35, lengthZ: 0.35 } },
                material: { type: 'solid', params: { color: hazardColors[index % hazardColors.length], roughness: 0.35 } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Animation: {
          clips: [
            {
              name: 'default',
              duration,
              tracks: [
                {
                  targetTag: 'bar',
                  keyframes: [
                    { time: 0, rotation: [0, 0, 0] },
                    { time: duration * 0.25, rotation: [0, Math.PI / 2, 0] },
                    { time: duration * 0.5, rotation: [0, Math.PI, 0] },
                    { time: duration * 0.75, rotation: [0, Math.PI * 1.5, 0] },
                    { time: duration, rotation: [0, Math.PI * 2, 0] }
                  ]
                }
              ]
            }
          ]
        }
      });
    }

    function spawnSlider(index, x, y, z, axis, distance, duration) {
      const horizontal = axis === 'x';
      spawn({
        Info: { name: `Slider ${index}` },
        Transform: { x, y, z },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                tag: 'bar',
                geometry: {
                  type: 'box',
                  params: horizontal
                    ? { lengthX: 4.5, lengthY: 0.35, lengthZ: 0.45 }
                    : { lengthX: 0.45, lengthY: 0.35, lengthZ: 4.5 }
                },
                material: { type: 'solid', params: { color: hazardColors[(index + 2) % hazardColors.length], roughness: 0.4 } }
              }
            ]
          }
        },
        MotionSource: { type: 'static', params: {} },
        Animation: {
          clips: [
            {
              name: 'default',
              duration,
              tracks: [
                {
                  targetTag: 'bar',
                  keyframes: [
                    { time: 0, position: horizontal ? [-distance, 0, 0] : [0, 0, -distance] },
                    { time: duration * 0.5, position: horizontal ? [distance, 0, 0] : [0, 0, distance] },
                    { time: duration, position: horizontal ? [-distance, 0, 0] : [0, 0, -distance] }
                  ]
                }
              ]
            }
          ]
        }
      });
    }

    let obstacleIndex = 0;
    for (let level = 0; level < 22; level++) {
      const y = -6 - level * 5;
      const phase = level % 4;
      const duration = 1.35 + (level % 5) * 0.22;

      spawnSpinner(obstacleIndex++, -5, y, -5, phase * 0.3, 7 + (level % 3), duration);
      spawnSpinner(obstacleIndex++, 5, y - 1.8, 5, Math.PI / 2 + phase * 0.2, 6.5, duration * 1.15);
      spawnSlider(obstacleIndex++, 0, y - 3.1, -6, level % 2 === 0 ? 'x' : 'z', 4 + (level % 3), duration * 1.4);

      if (level % 2 === 0) {
        spawnSpinner(obstacleIndex++, 0, y - 4.1, 0, Math.PI / 4, 10, duration * 0.9);
      }
    }

    spawn({
      Info: { name: 'Start Platform' },
      Transform: { x: 0, y: 4, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: { type: 'box', params: { lengthX: 10, lengthY: 0.5, lengthZ: 10 } },
              material: { type: 'solid', params: { color: '#34495e', roughness: 0.7 } }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    spawn('player', {
      Transform: { x: 0, y: 6, z: 0 },
      Inventory: { size: 4, items: [], selectedItemIndex: 0 }
    });
  }
};
