export default {
  setupScene(api) {
    const {
      initialize,
      spawn,
      registerRuntimeModuleType,
      registerRuntimeModuleInstance,
    } = api;

    initialize({
      title: 'Runtime Module Type Script Demo',
      description: 'Registers a persisted custom field type from a world script and uses it immediately.',
      tags: ['demo', 'runtime-module-types'],
      dimensions: [
        {
          name: 'main',
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#f0f9ff',
            sun: { color: '#ffffff', intensity: 0.9, timeOfDay: 1200 },
            clouds: { color: '#ffffff', coverage: 0.15 },
            stars: { intensity: 0 },
          },
        },
      ],
      achievements: [],
    });

    registerRuntimeModuleType({
      moduleName: 'field',
      typeName: 'radialPulse',
      description: 'Simple radial field that returns amplitude inside a radius and zero outside.',
      parameterSchema: {
        type: 'object',
        properties: {
          radius: { type: 'number' },
          amplitude: { type: 'number' },
        },
      },
      factorySource:
        '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
    });

    registerRuntimeModuleInstance('field', 'pulseMask', {
      type: 'radialPulse',
      params: {
        radius: 0.35,
        amplitude: 1.5,
      },
    });

    spawn({
      Info: {
        name: 'Pulse Terrain',
        description: 'Terrain displaced by the persisted custom field type.',
      },
      Transform: { x: 0, y: 0, z: 0 },
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              geometry: {
                type: 'displacedPlane',
                params: {
                  lengthX: 16,
                  lengthZ: 16,
                  field: 'pulseMask',
                },
              },
              material: {
                type: 'solid',
                params: {
                  color: '#38bdf8',
                  roughness: 0.9,
                },
              },
            },
          ],
        },
      },
      MotionSource: {
        type: 'static',
        params: {},
      },
    });
  },
};
