/**
 * Render Scene
 * A flat plane with a scene camera for framing renders.
 */

export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    initialize({
      title: 'Render Scene',
      description: 'A flat plane with a scene camera for framing renders.',
      tags: ['render', 'camera'],
      dimensions: [
        {
          name: 'Studio',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#f5f5f7',
            sun: {
              color: '#ffffff',
              intensity: 0.85,
              timeOfDay: 1200
            },
            clouds: {
              color: '#ffffff',
              coverage: 0.05
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
      Info: { name: 'Backdrop Plane' },
      Transform: { x: 0, y: -0.25, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 40, lengthY: 0.5, lengthZ: 40, pivot: 'center' }
              },
              material: {
                type: 'solid',
                params: { color: '#d8d8dd', roughness: 0.7 }
              }
            }
          ]
        }
      },
      MotionSource: { type: 'static', params: {} }
    });

    spawn('sceneCamera', {
      Transform: { x: 0, y: 4, z: 8, ry: Math.PI }
    });
  }
};
