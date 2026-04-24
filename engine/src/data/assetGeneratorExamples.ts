export const workbenchAssetBundle = {
  Info: {
    name: 'Workshop Bench',
    description: 'A sturdy workbench with a rounded top, shelf, and wedge braces.',
  },
  Body: {
    type: 'composite',
    params: {
      parts: [
        {
          name: 'top',
          geometry: {
            type: 'roundedBox',
            params: { lengthX: 2.2, lengthY: 0.18, lengthZ: 0.82, radius: 0.05, segments: 2, pivot: 'bottom' },
          },
          material: {
            type: 'wood',
            params: { color: '#8b5a2b', grainColor: '#6f431d' },
          },
          localPosition: { x: 0, y: 0.84, z: 0 },
        },
        {
          name: 'shelf',
          geometry: {
            type: 'box',
            params: { lengthX: 1.9, lengthY: 0.12, lengthZ: 0.62, pivot: 'bottom' },
          },
          material: {
            type: 'wood',
            params: { color: '#7a4d28', grainColor: '#5f381a' },
          },
          localPosition: { x: 0, y: 0.3, z: 0 },
        },
        {
          name: 'legFrontRight',
          geometry: {
            type: 'box',
            params: { lengthX: 0.14, lengthY: 0.88, lengthZ: 0.14, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#4b5563', roughness: 0.85 } },
          localPosition: { x: 0.92, y: 0, z: 0.28 },
        },
        {
          name: 'legFrontLeft',
          geometry: {
            type: 'box',
            params: { lengthX: 0.14, lengthY: 0.88, lengthZ: 0.14, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#4b5563', roughness: 0.85 } },
          localPosition: { x: -0.92, y: 0, z: 0.28 },
        },
        {
          name: 'legBackRight',
          geometry: {
            type: 'box',
            params: { lengthX: 0.14, lengthY: 0.88, lengthZ: 0.14, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#4b5563', roughness: 0.85 } },
          localPosition: { x: 0.92, y: 0, z: -0.28 },
        },
        {
          name: 'legBackLeft',
          geometry: {
            type: 'box',
            params: { lengthX: 0.14, lengthY: 0.88, lengthZ: 0.14, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#4b5563', roughness: 0.85 } },
          localPosition: { x: -0.92, y: 0, z: -0.28 },
        },
        {
          name: 'braceRight',
          geometry: {
            type: 'wedge',
            params: { width: 0.4, height: 0.42, depth: 0.5, pivot: 'bottom' },
          },
          material: {
            type: 'wood',
            params: { color: '#7a4d28', grainColor: '#5f381a' },
          },
          localPosition: { x: 0.7, y: 0.42, z: 0 },
          localRotation: { x: 0, y: Math.PI, z: 0 },
        },
        {
          name: 'braceLeft',
          geometry: {
            type: 'wedge',
            params: { width: 0.4, height: 0.42, depth: 0.5, pivot: 'bottom' },
          },
          material: {
            type: 'wood',
            params: { color: '#7a4d28', grainColor: '#5f381a' },
          },
          localPosition: { x: -0.7, y: 0.42, z: 0 },
        },
      ],
    },
  },
  MotionSource: { type: 'static', params: {} },
};

export const archedWindowFrameAssetBundle = {
  Info: {
    name: 'Arched Window Frame',
    description: 'A thick stone frame made with subtractive CSG and a simple sill.',
  },
  Body: {
    type: 'composite',
    params: {
      parts: [
        {
          name: 'frameShell',
          type: 'group',
          operation: { type: 'subtract', params: {} },
          children: [
            {
              geometry: {
                type: 'roundedBox',
                params: { lengthX: 2.5, lengthY: 3.1, lengthZ: 0.42, radius: 0.08, segments: 2, pivot: 'bottom' },
              },
              material: { type: 'marble', params: { color: '#d6d3d1', grainColor: '#a8a29e', grainSize: 0.18 } },
            },
            {
              geometry: {
                type: 'box',
                params: { lengthX: 1.38, lengthY: 1.85, lengthZ: 0.7, pivot: 'bottom' },
              },
              localPosition: { x: 0, y: 0.38, z: 0 },
              material: { type: 'solid', params: { color: '#ffffff' } },
            },
            {
              geometry: {
                type: 'cylinder',
                params: { radius: 0.69, height: 0.9, pivot: 'center' },
              },
              localPosition: { x: 0, y: 2.23, z: 0 },
              localRotation: { x: Math.PI / 2, y: 0, z: 0 },
              material: { type: 'solid', params: { color: '#ffffff' } },
            },
          ],
        },
        {
          name: 'sill',
          geometry: {
            type: 'box',
            params: { lengthX: 2.72, lengthY: 0.16, lengthZ: 0.6, pivot: 'bottom' },
          },
          material: { type: 'marble', params: { color: '#cfc9c2', grainColor: '#a8a29e', grainSize: 0.14 } },
          localPosition: { x: 0, y: 0.12, z: 0.08 },
        },
      ],
    },
  },
  MotionSource: { type: 'static', params: {} },
};

export const shieldBossAssetBundle = {
  Info: {
    name: 'Shield Boss',
    description: 'A stylized shield face that uses union CSG to merge the boss with the plate.',
  },
  Body: {
    type: 'composite',
    params: {
      parts: [
        {
          name: 'plate',
          type: 'group',
          operation: { type: 'union', params: {} },
          children: [
            {
              geometry: {
                type: 'roundedBox',
                params: { lengthX: 1.5, lengthY: 1.9, lengthZ: 0.18, radius: 0.12, segments: 3, pivot: 'bottom' },
              },
              material: { type: 'solid', params: { color: '#374151', metalness: 0.42, roughness: 0.56 } },
            },
            {
              geometry: {
                type: 'sphere',
                params: { radius: 0.28, pivot: 'bottom' },
              },
              localPosition: { x: 0, y: 0.66, z: 0.2 },
              material: { type: 'solid', params: { color: '#9ca3af', metalness: 0.65, roughness: 0.28 } },
            },
          ],
        },
        {
          name: 'rim',
          geometry: {
            type: 'torus',
            params: { majorRadius: 0.7, minorRadius: 0.06, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#d1d5db', metalness: 0.72, roughness: 0.22 } },
          localPosition: { x: 0, y: 0.94, z: 0.03 },
          localRotation: { x: Math.PI / 2, y: 0, z: 0 },
        },
      ],
    },
  },
  MotionSource: { type: 'static', params: {} },
};

export const mirroredCrestAssetBundle = {
  Info: {
    name: 'Mirrored Crest',
    description: 'A heraldic crest built from mirrored wings and a tapered center rib.',
  },
  Body: {
    type: 'composite',
    params: {
      parts: [
        {
          name: 'wingAssembly',
          type: 'group',
          operation: { type: 'mirror', params: { axis: 'x', sourceSide: 'positive' } },
          children: [
            {
              name: 'wingPlate',
              geometry: {
                type: 'extrudedPolygon',
                params: {
                  shape: {
                    type: 'polygon',
                    params: {
                      points: [
                        { u: 0.06, v: -0.34 },
                        { u: 0.84, v: -0.08 },
                        { u: 0.6, v: 0.48 },
                        { u: 0.18, v: 0.22 },
                      ],
                    },
                  },
                  height: 0.22,
                  pivot: 'bottom',
                },
              },
              material: { type: 'solid', params: { color: '#60a5fa', metalness: 0.18, roughness: 0.4 } },
              localPosition: { x: 0.22, y: 0.18, z: 0 },
            },
            {
              name: 'centerRib',
              type: 'group',
              operation: { type: 'taper', params: { axis: 'y', factor: 0.5 } },
              localPosition: { x: 0.42, y: 0.1, z: 0.04 },
              children: [
                {
                  geometry: {
                    type: 'cylinder',
                    params: { radius: 0.05, height: 0.76, pivot: 'bottom' },
                  },
                  material: { type: 'solid', params: { color: '#bfdbfe', metalness: 0.3, roughness: 0.24 } },
                },
              ],
            },
          ],
        },
        {
          name: 'badge',
          geometry: {
            type: 'star',
            params: { outerRadius: 0.24, innerRadius: 0.12, points: 6, height: 0.16, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#fde68a', metalness: 0.42, roughness: 0.22 } },
          localPosition: { x: 0, y: 0.28, z: 0.08 },
        },
      ],
    },
  },
  MotionSource: { type: 'static', params: {} },
};

export const placedStudRingAssetBundle = {
  Info: {
    name: 'Stud Ring',
    description: 'A circular ornament that uses place to distribute repeating studs around a torus base.',
  },
  Body: {
    type: 'composite',
    params: {
      parts: [
        {
          name: 'baseRing',
          geometry: {
            type: 'torus',
            params: { majorRadius: 0.62, minorRadius: 0.1, pivot: 'bottom' },
          },
          material: { type: 'solid', params: { color: '#f59e0b', metalness: 0.52, roughness: 0.26 } },
          localPosition: { x: 0, y: 0.32, z: 0 },
        },
        {
          name: 'studs',
          type: 'group',
          operation: {
            type: 'place',
            params: {
              placement: {
                type: 'circle',
                params: {
                  center: { x: 0, y: 0.42, z: 0 },
                  radius: 0.62,
                  count: 8,
                },
              },
              orientation: 'radial',
            },
          },
          children: [
            {
              geometry: {
                type: 'cone',
                params: { radius: 0.07, height: 0.18, pivot: 'bottom' },
              },
              material: { type: 'solid', params: { color: '#fde68a', metalness: 0.34, roughness: 0.18 } },
              localRotation: { x: Math.PI / 2, y: 0, z: 0 },
            },
          ],
        },
      ],
    },
  },
  MotionSource: { type: 'static', params: {} },
};

export const assetGeneratorExampleArchetypes = [
  {
    archetypeName: 'workbench_asset',
    bundle: workbenchAssetBundle,
  },
  {
    archetypeName: 'arched_window_frame_asset',
    bundle: archedWindowFrameAssetBundle,
  },
  {
    archetypeName: 'shield_boss_asset',
    bundle: shieldBossAssetBundle,
  },
  {
    archetypeName: 'mirrored_crest_asset',
    bundle: mirroredCrestAssetBundle,
  },
  {
    archetypeName: 'placed_stud_ring_asset',
    bundle: placedStudRingAssetBundle,
  },
] as const;
