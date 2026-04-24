/**
 * Starter Game World
 * A minimal scene with terrain and a player spawn.
 */

export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    initialize({
      title: 'Starter Game World',
      description: 'A minimal play space with terrain and a player.',
      tags: ['game', 'starter'],
      dimensions: [
        {
          name: 'Playfield',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#9fc9ff',
            sun: {
              color: '#ffffff',
              intensity: 0.9,
              timeOfDay: 1030
            },
            clouds: {
              color: '#f0f4ff',
              coverage: 0.2
            },
            stars: {
              intensity: 0.0
            }
          }
        }
      ],
      achievements: []
    });

    spawn({
      Info: { name: 'Ground' },
      Transform: { x: 0, y: -0.5, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 80, lengthY: 1, lengthZ: 80, pivot: 'center' }
              },
              material: {
                type: 'solid',
                params: { color: '#6ab46f', roughness: 0.9 }
              }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    spawn('player', {
      Transform: { x: 0, y: 1.2, z: 0 },
      Inventory: { size: 4, items: [], selectedItemIndex: 0 }
    });
  }
};
