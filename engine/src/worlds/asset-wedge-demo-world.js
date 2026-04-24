export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    initialize({
      title: 'Asset Wedge Demo',
      description: 'Live editor inspection world for single-asset wedge examples covering primitives, CSG, mirror, taper, and placement.',
      tags: ['asset', 'editor', 'geometry', 'csg'],
      dimensions: [
        {
          name: 'base',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#d7e4f2',
            sun: {
              color: '#ffffff',
              intensity: 0.9,
              timeOfDay: 1030,
            },
            clouds: {
              color: '#ffffff',
              coverage: 0.08,
            },
            stars: {
              intensity: 0,
            },
          },
        },
      ],
      achievements: [],
    });

    spawn({
      Info: { name: 'Ground', description: 'Neutral inspection ground plane' },
      Transform: { x: 0, y: -0.5, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 28, lengthY: 1, lengthZ: 20 },
              },
              material: {
                type: 'solid',
                params: { color: '#cbd5e1', roughness: 0.96 },
              },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    spawn({
      Info: { name: 'Backdrop', description: 'Simple backdrop for silhouette reads' },
      Transform: { x: 0, y: 0, z: -5.5 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'box',
                params: { lengthX: 22, lengthY: 7, lengthZ: 0.24, pivot: 'bottom' },
              },
              material: {
                type: 'solid',
                params: { color: '#e2e8f0', roughness: 0.92 },
              },
            },
          ],
        },
      },
      MotionSource: { type: 'static', params: {} },
    });

    const pedestalXs = [-8, -4, 0, 4, 8];
    for (const x of pedestalXs) {
      spawn({
        Info: { name: `Pedestal ${x}`, description: 'Display pedestal' },
        Transform: { x, y: 0, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: {
                  type: 'roundedBox',
                  params: { lengthX: 2.3, lengthY: 0.2, lengthZ: 2.3, radius: 0.08, segments: 2, pivot: 'bottom' },
                },
                material: {
                  type: 'solid',
                  params: { color: '#94a3b8', roughness: 0.84 },
                },
              },
            ],
          },
        },
        MotionSource: { type: 'static', params: {} },
      });
    }

    spawn('workbench_asset', { Transform: { x: -8, y: 0.1, z: 0 } });
    spawn('arched_window_frame_asset', { Transform: { x: -4, y: 0.1, z: 0 } });
    spawn('shield_boss_asset', { Transform: { x: 0, y: 0.1, z: 0 } });
    spawn('mirrored_crest_asset', { Transform: { x: 4, y: 0.1, z: 0 } });
    spawn('placed_stud_ring_asset', { Transform: { x: 8, y: 0.1, z: 0 } });
  },
};
