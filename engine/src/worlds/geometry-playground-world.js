/**
 * Geometry Playground
 *
 * Demonstrates currently supported geometry primitives and CSG behavior
 * in one comprehensive world.
 */

function panel(color = '#334155', size = { x: 2.6, y: 0.15, z: 2.6 }) {
  return {
    type: 'composite',
    params: {
      parts: [{
        geometry: { type: 'box', params: { lengthX: size.x, lengthY: size.y, lengthZ: size.z } },
        material: { type: 'solid', params: { color, roughness: 0.8 } },
      }],
    },
  };
}

function primitiveBody(geometry, color, operation) {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: operation ?? { type: 'none' },
          children: [{
            geometry,
            material: {
              type: 'solid',
              params: { color, roughness: 0.45, metalness: 0.1 },
            },
          }],
        }
      ],
    },
  };
}

function deformedCsgUnionBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'union' },
          children: [
            {
              geometry: { type: 'cylinder', params: { radius: 0.45, height: 1.45, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#0891b2', roughness: 0.45 } },
            },
            {
              geometry: {
                type: 'extrudedPolygon',
                params: {
                  shape: {
                    type: 'polygon',
                    params: {
                      points: [
                        { u: 0.05, v: -0.36 },
                        { u: 0.78, v: -0.1 },
                        { u: 0.58, v: 0.48 },
                        { u: 0.12, v: 0.28 },
                      ],
                    },
                  },
                  height: 1.2,
                  pivot: 'bottom',
                },
              },
              localPosition: { x: 0, y: 0, z: 0.15 },
              material: { type: 'solid', params: { color: '#22d3ee', roughness: 0.35 } },
            },
          ],
        },
      ],
    },
  };
}

function csgWallBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'subtract' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 1.6, lengthZ: 0.45, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#a16207', roughness: 0.8 } },
            },
            {
              geometry: { type: 'box', params: { lengthX: 0.7, lengthY: 0.7, lengthZ: 0.8, pivot: 'bottom' } },
              localPosition: { x: 0, y: 0.5, z: 0 },
              material: { type: 'solid', params: { color: '#ffffff' } },
            },
          ],
        },
      ],
    },
  };
}

function csgNoneBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#475569', roughness: 0.6 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.7, pivot: 'bottom' } },
              localPosition: { x: 0.3, y: 0, z: 0.3 },
              material: { type: 'solid', params: { color: '#0ea5e9', roughness: 0.45 } },
            },
          ],
        },
      ],
    },
  };
}

function csgUnionBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'union' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.4, lengthY: 1.4, lengthZ: 1.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#0f766e', roughness: 0.55 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.8, pivot: 'bottom' } },
              localPosition: { x: 0.25, y: 0, z: 0.25 },
              material: { type: 'solid', params: { color: '#14b8a6', roughness: 0.4 } },
            },
          ],
        },
      ],
    },
  };
}

function csgIntersectBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'intersect' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 1.8, lengthZ: 1.8, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#2563eb', roughness: 0.45 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 1.0, pivot: 'bottom' } },
              localPosition: { x: 0.25, y: 0, z: 0.25 },
              material: { type: 'solid', params: { color: '#7c3aed', roughness: 0.35 } },
            },
          ],
        },
      ],
    },
  };
}

function csgExcludeBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'exclude' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 1.6, lengthZ: 1.8, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#be185d', roughness: 0.45 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.95, pivot: 'bottom' } },
              localPosition: { x: 0.25, y: 0, z: -0.15 },
              material: { type: 'solid', params: { color: '#ec4899', roughness: 0.35 } },
            },
          ],
        },
      ],
    },
  };
}

function csgGracefulFallbackBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'subtract' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 1.5, lengthZ: 1.2, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#0f766e', roughness: 0.65 } },
            },
            {
              geometry: {
                type: 'lathe',
                params: {
                  profile: {
                    type: 'polyline',
                    params: {
                      points: [
                        { u: 0.0, v: 0.0 },
                        { u: 0.25, v: 0.2 },
                        { u: 0.45, v: 0.65 },
                        { u: 0.2, v: 1.0 },
                      ],
                    },
                  },
                  capped: false,
                  segments: 18,
                  pivot: 'bottom',
                },
              },
              localPosition: { x: 0.15, y: 0, z: 0 },
              material: { type: 'solid', params: { color: '#ffffff' } },
            },
          ],
        },
      ],
    },
  };
}

function csgSweptSubtractBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'subtract' },
          children: [
            {
              geometry: { type: 'cylinder', params: { radius: 0.85, height: 1.5, arc: Math.PI * 1.25, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#b45309', roughness: 0.55 } },
            },
            {
              geometry: { type: 'cone', params: { radius: 0.48, height: 1.45, arc: Math.PI / 2, pivot: 'bottom' } },
              localPosition: { x: 0.2, y: 0, z: 0 },
              material: { type: 'solid', params: { color: '#ffffff' } },
            },
          ],
        },
      ],
    },
  };
}

function csgSweptUnionBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'union' },
          children: [
            {
              geometry: { type: 'hollowCylinder', params: { outerRadius: 0.8, innerRadius: 0.5, height: 1.1, arc: Math.PI * 1.5, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#0f766e', roughness: 0.5 } },
            },
            {
              geometry: { type: 'torus', params: { majorRadius: 0.75, minorRadius: 0.2, arc: Math.PI * 1.25, pivot: 'bottom' } },
              localPosition: { x: 0, y: 0.55, z: 0 },
              material: { type: 'solid', params: { color: '#2dd4bf', roughness: 0.35 } },
            },
          ],
        },
      ],
    },
  };
}

function layeredMirrorTaperBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              type: 'group',
              operation: { type: 'mirror', params: { axis: 'x', sourceSide: 'positive' } },
              children: [
                {
                  geometry: { type: 'extrudedPolygon', params: {
                    shape: {
                      type: 'polygon',
                      params: {
                        points: [
                          { u: -0.45, v: -0.35 },
                          { u: 0.8, v: -0.2 },
                          { u: 0.62, v: 0.58 },
                          { u: -0.12, v: 0.36 },
                        ],
                      },
                    },
                    height: 1.15,
                    pivot: 'bottom',
                  } },
                  material: { type: 'solid', params: { color: '#22d3ee', roughness: 0.38 } },
                },
                {
                  type: 'group',
                  operation: { type: 'taper', params: { axis: 'y', factor: 0.42 } },
                  localPosition: { x: 0, y: 0, z: 0.18 },
                  children: [
                    {
                      geometry: { type: 'cylinder', params: { radius: 0.24, height: 1.2, pivot: 'bottom' } },
                      material: { type: 'solid', params: { color: '#06b6d4', roughness: 0.32 } },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function layeredCsgStackBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              type: 'group',
              operation: { type: 'union' },
              children: [
                {
                  geometry: { type: 'box', params: { lengthX: 1.5, lengthY: 1.2, lengthZ: 1.1, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#155e75', roughness: 0.58 } },
                },
                {
                  geometry: { type: 'sphere', params: { radius: 0.65, pivot: 'bottom' } },
                  localPosition: { x: 0.32, y: 0.05, z: 0.22 },
                  material: { type: 'solid', params: { color: '#22d3ee', roughness: 0.36 } },
                },
              ],
            },
            {
              type: 'group',
              operation: { type: 'subtract' },
              localPosition: { x: 0.02, y: 0.05, z: -0.04 },
              children: [
                {
                  geometry: { type: 'roundedBox', params: { lengthX: 1.25, lengthY: 1.05, lengthZ: 1.05, radius: 0.2, segments: 2, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#0e7490', roughness: 0.48 } },
                },
                {
                  geometry: { type: 'capsule', params: { radius: 0.24, height: 1.15, pivot: 'bottom' } },
                  localPosition: { x: 0.2, y: 0, z: 0.08 },
                  material: { type: 'solid', params: { color: '#f8fafc', roughness: 0.2 } },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function layeredIntersectExcludeBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              type: 'group',
              operation: { type: 'intersect' },
              children: [
                {
                  geometry: { type: 'box', params: { lengthX: 1.8, lengthY: 1.35, lengthZ: 1.8, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#6d28d9', roughness: 0.42 } },
                },
                {
                  geometry: { type: 'torus', params: { majorRadius: 0.88, minorRadius: 0.28, pivot: 'bottom' } },
                  localPosition: { x: 0, y: 0.5, z: 0 },
                  material: { type: 'solid', params: { color: '#a78bfa', roughness: 0.3 } },
                },
              ],
            },
            {
              type: 'group',
              operation: { type: 'exclude' },
              localPosition: { x: 0.12, y: 0.08, z: -0.12 },
              children: [
                {
                  geometry: { type: 'sphere', params: { radius: 0.86, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#7c3aed', roughness: 0.35 } },
                },
                {
                  geometry: { type: 'hollowCylinder', params: { outerRadius: 0.62, innerRadius: 0.3, height: 1.3, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#ddd6fe', roughness: 0.25 } },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function deepMixedHierarchyBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              type: 'group',
              operation: { type: 'mirror', params: { axis: 'z', planeOffset: 0.14 } },
              children: [
                {
                  geometry: { type: 'star', params: { outerRadius: 0.72, innerRadius: 0.28, points: 7, height: 0.55, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#f59e0b', roughness: 0.38 } },
                  children: [
                    {
                      type: 'group',
                      operation: { type: 'taper', params: { axis: 'x', factor: 0.5 } },
                      localPosition: { x: 0, y: 0.52, z: 0 },
                      children: [
                        {
                          geometry: { type: 'cone', params: { radius: 0.24, height: 0.86, pivot: 'bottom' } },
                          material: { type: 'solid', params: { color: '#fcd34d', roughness: 0.32 } },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              light: {
                type: 'point',
                params: { color: '#f0f9ff', intensity: 0.45, range: 8 },
              },
              localPosition: { x: 0, y: 1.9, z: 0 },
            },
          ],
        },
      ],
    },
  };
}

function csgWithNestedDeformerChildrenBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'subtract' },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 1.7, lengthY: 1.45, lengthZ: 1.4, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#0f766e', roughness: 0.64 } },
              children: [
                {
                  type: 'group',
                  operation: { type: 'mirror', params: { axis: 'x', sourceSide: 'negative' } },
                  localPosition: { x: 0, y: 1.1, z: 0 },
                  children: [
                    {
                      geometry: { type: 'wedge', params: { width: 0.45, height: 0.34, depth: 0.4, pivot: 'bottom' } },
                      material: { type: 'solid', params: { color: '#a7f3d0', roughness: 0.4 } },
                    },
                  ],
                },
              ],
            },
            {
              geometry: { type: 'lathe', params: {
                profile: {
                  type: 'polyline',
                  params: {
                    points: [
                      { u: 0.0, v: 0.0 },
                      { u: 0.24, v: 0.35 },
                      { u: 0.42, v: 0.85 },
                      { u: 0.16, v: 1.2 },
                    ],
                  },
                },
                segments: 20,
                pivot: 'bottom',
              } },
              localPosition: { x: 0.12, y: 0, z: 0.08 },
              material: { type: 'solid', params: { color: '#ecfeff', roughness: 0.2 } },
            },
          ],
        },
      ],
    },
  };
}

function operationPermutationGridBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              type: 'group',
              operation: { type: 'union' },
              localPosition: { x: -0.5, y: 0, z: -0.45 },
              children: [
                { geometry: { type: 'box', params: { lengthX: 0.7, lengthY: 0.6, lengthZ: 0.7, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#0ea5e9' } } },
                { geometry: { type: 'sphere', params: { radius: 0.38, pivot: 'bottom' } }, localPosition: { x: 0.16, y: 0, z: 0.12 }, material: { type: 'solid', params: { color: '#67e8f9' } } },
              ],
            },
            {
              type: 'group',
              operation: { type: 'subtract' },
              localPosition: { x: 0.5, y: 0, z: -0.45 },
              children: [
                { geometry: { type: 'cylinder', params: { radius: 0.36, height: 0.9, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#f97316' } } },
                { geometry: { type: 'cone', params: { radius: 0.22, height: 0.9, pivot: 'bottom' } }, localPosition: { x: 0.08, y: 0, z: 0 }, material: { type: 'solid', params: { color: '#fff7ed' } } },
              ],
            },
            {
              type: 'group',
              operation: { type: 'intersect' },
              localPosition: { x: -0.5, y: 0, z: 0.42 },
              children: [
                { geometry: { type: 'box', params: { lengthX: 0.74, lengthY: 0.74, lengthZ: 0.74, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#7c3aed' } } },
                { geometry: { type: 'sphere', params: { radius: 0.44, pivot: 'bottom' } }, localPosition: { x: 0.12, y: 0, z: 0.1 }, material: { type: 'solid', params: { color: '#ddd6fe' } } },
              ],
            },
            {
              type: 'group',
              operation: { type: 'exclude' },
              localPosition: { x: 0.5, y: 0, z: 0.42 },
              children: [
                { geometry: { type: 'roundedBox', params: { lengthX: 0.74, lengthY: 0.74, lengthZ: 0.74, radius: 0.1, segments: 2, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#db2777' } } },
                { geometry: { type: 'hollowCylinder', params: { outerRadius: 0.33, innerRadius: 0.16, height: 0.9, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#fbcfe8' } } },
              ],
            },
            {
              type: 'group',
              operation: { type: 'taper', params: { axis: 'y', factor: 0.45 } },
              localPosition: { x: 0, y: 0.78, z: 0 },
              children: [
                {
                  type: 'group',
                  operation: { type: 'mirror', params: { axis: 'x' } },
                  children: [
                    { geometry: { type: 'extrudedPolygon', params: { shape: { type: 'polygon', params: { points: [{ u: 0.02, v: -0.2 }, { u: 0.48, v: -0.08 }, { u: 0.38, v: 0.24 }, { u: 0.06, v: 0.16 }] } }, height: 0.66, pivot: 'bottom' } }, material: { type: 'solid', params: { color: '#99f6e4' } } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function multiNestedMirrorBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: { type: 'none' },
          children: [
            {
              type: 'group',
              operation: { type: 'mirror', params: { axis: 'x', sourceSide: 'positive' } },
              children: [
                {
                  type: 'group',
                  operation: { type: 'mirror', params: { axis: 'z', planeOffset: 0.12 } },
                  children: [
                    {
                      geometry: {
                        type: 'extrudedPolygon',
                        params: {
                          shape: {
                            type: 'polygon',
                            params: {
                              points: [
                                { u: 0.06, v: -0.34 },
                                { u: 0.84, v: -0.1 },
                                { u: 0.62, v: 0.56 },
                                { u: 0.16, v: 0.26 },
                              ],
                            },
                          },
                          height: 1.02,
                          pivot: 'bottom',
                        },
                      },
                      material: { type: 'solid', params: { color: '#67e8f9', roughness: 0.34 } },
                      children: [
                        {
                          type: 'group',
                          operation: { type: 'mirror', params: { axis: 'y', planeOffset: 0.3 } },
                          localPosition: { x: 0.1, y: 0.62, z: 0.1 },
                          children: [
                            {
                              geometry: { type: 'cone', params: { radius: 0.2, height: 0.7, pivot: 'bottom' } },
                              material: { type: 'solid', params: { color: '#cffafe', roughness: 0.26 } },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function placementPointsBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: {
            type: 'place',
            params: {
              placement: {
                type: 'points',
                params: {
                  positions: [
                    { x: -0.65, y: 0, z: -0.45 },
                    { x: -0.15, y: 0, z: 0.35 },
                    { x: 0.55, y: 0, z: -0.2 },
                  ],
                },
              },
              orientation: 'none',
            },
          },
          children: [
            {
              geometry: { type: 'box', params: { lengthX: 0.36, lengthY: 0.55, lengthZ: 0.36, pivot: 'bottom' } },
              material: { type: 'solid', params: { color: '#22c55e', roughness: 0.45 } },
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.18, pivot: 'bottom' } },
              localPosition: { x: 0, y: 0.55, z: 0 },
              material: { type: 'solid', params: { color: '#86efac', roughness: 0.32 } },
            },
          ],
        },
      ],
    },
  };
}

function nestedPlacementBody() {
  return {
    type: 'composite',
    params: {
      parts: [
        {
          type: 'group',
          operation: {
            type: 'place',
            params: {
              placement: {
                type: 'line',
                params: {
                  start: { x: -0.8, y: 0, z: 0 },
                  end: { x: 0.8, y: 0, z: 0 },
                  count: 3,
                },
              },
              orientation: 'none',
            },
          },
          children: [
            {
              type: 'group',
              operation: {
                type: 'place',
                params: {
                  placement: {
                    type: 'circle',
                    params: {
                      center: { x: 0, y: 0, z: 0 },
                      radius: 0.34,
                      count: 4,
                    },
                  },
                  orientation: 'none',
                },
              },
              children: [
                {
                  geometry: { type: 'cylinder', params: { radius: 0.11, height: 0.42, pivot: 'bottom' } },
                  material: { type: 'solid', params: { color: '#3b82f6', roughness: 0.35 } },
                },
              ],
            },
            {
              geometry: { type: 'sphere', params: { radius: 0.14, pivot: 'bottom' } },
              localPosition: { x: 0, y: 0.45, z: 0 },
              material: { type: 'solid', params: { color: '#93c5fd', roughness: 0.28 } },
            },
          ],
        },
      ],
    },
  };
}

export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    initialize({
      title: 'Geometry Playground',
      description: 'Visual catalog of supported body geometry primitives. Extend this world with future CSG/deformation phases.',
      tags: ['demo', 'geometry', 'playground'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#c7d2fe' },
      }],
    });

    spawn({
      Info: { name: 'Ground', description: 'Main floor for geometry playground.' },
      Transform: { x: 0, y: -0.75, z: 0 },
      MotionSource: { type: 'static', params: {} },
      Body: {
        type: 'composite',
        params: {
          parts: [{
            geometry: { type: 'box', params: { lengthX: 54, lengthY: 1.5, lengthZ: 64 } },
            material: { type: 'solid', params: { color: '#86efac', roughness: 0.95 } },
          }],
        },
      },
    });

    const entries = [
      {
        name: 'Box',
        geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2, pivot: 'bottom' } },
        color: '#60a5fa',
      },
      {
        name: 'Rounded Box (New)',
        geometry: { type: 'roundedBox', params: { lengthX: 1.4, lengthY: 1.1, lengthZ: 1.1, radius: 0.2, segments: 3, pivot: 'bottom' } },
        color: '#0ea5e9',
      },
      {
        name: 'Sphere',
        geometry: { type: 'sphere', params: { radius: 0.7, pivot: 'bottom' } },
        color: '#f87171',
      },
      {
        name: 'Cylinder',
        geometry: { type: 'cylinder', params: { radius: 0.55, height: 1.4, pivot: 'bottom' } },
        color: '#fb923c',
      },
      {
        name: 'Cylinder Arc Sweep (90°)',
        geometry: { type: 'cylinder', params: { radius: 0.55, height: 1.4, arc: Math.PI / 2, pivot: 'bottom' } },
        color: '#fdba74',
      },
      {
        name: 'Capsule',
        geometry: { type: 'capsule', params: { radius: 0.45, height: 1.7, pivot: 'bottom' } },
        color: '#a3e635',
      },
      {
        name: 'Cone',
        geometry: { type: 'cone', params: { radius: 0.7, height: 1.4, pivot: 'bottom' } },
        color: '#facc15',
      },
      {
        name: 'Cone Arc Sweep (180°)',
        geometry: { type: 'cone', params: { radius: 0.7, height: 1.4, arc: Math.PI, pivot: 'bottom' } },
        color: '#fde047',
      },
      {
        name: 'Pyramid',
        geometry: { type: 'pyramid', params: { width: 1.3, height: 1.4, depth: 1.3, pivot: 'bottom' } },
        color: '#f472b6',
      },
      {
        name: 'Hemisphere',
        geometry: { type: 'hemisphere', params: { radius: 0.75, pivot: 'bottom' } },
        color: '#22d3ee',
      },
      {
        name: 'Icosahedron',
        geometry: { type: 'icosahedron', params: { radius: 0.75, pivot: 'bottom' } },
        color: '#a78bfa',
      },
      {
        name: 'Torus',
        geometry: { type: 'torus', params: { majorRadius: 0.75, minorRadius: 0.24, pivot: 'bottom' } },
        color: '#fda4af',
      },
      {
        name: 'Torus Arc Sweep (270°)',
        geometry: { type: 'torus', params: { majorRadius: 0.75, minorRadius: 0.24, arc: Math.PI * 1.5, pivot: 'bottom' } },
        color: '#f9a8d4',
      },
      {
        name: 'Hollow Cylinder',
        geometry: { type: 'hollowCylinder', params: { outerRadius: 0.7, innerRadius: 0.42, height: 1.2, pivot: 'bottom' } },
        color: '#2dd4bf',
      },
      {
        name: 'Hollow Cylinder Arc Sweep (225°)',
        geometry: { type: 'hollowCylinder', params: { outerRadius: 0.7, innerRadius: 0.42, height: 1.2, arc: Math.PI * 1.25, pivot: 'bottom' } },
        color: '#5eead4',
      },
      {
        name: 'Extruded Polygon',
        geometry: {
          type: 'extrudedPolygon',
          params: {
            shape: {
              type: 'polygon',
              params: {
                points: [
                  { u: -0.7, v: -0.5 },
                  { u: 0.2, v: -0.7 },
                  { u: 0.8, v: -0.1 },
                  { u: 0.45, v: 0.75 },
                  { u: -0.6, v: 0.55 },
                ],
              },
            },
            height: 1.1,
            pivot: 'bottom',
          },
        },
        color: '#34d399',
      },
      {
        name: 'Wedge (New)',
        geometry: { type: 'wedge', params: { width: 1.4, height: 1.2, depth: 1.2, pivot: 'bottom' } },
        color: '#c084fc',
      },
      {
        name: 'Deform: Tapered Cylinder',
        geometry: {
          type: 'cylinder',
          params: {
            radius: 0.55,
            height: 1.45,
            pivot: 'bottom',
          },
        },
        operation: { type: 'taper', params: { axis: 'y', factor: 0.35 } },
        color: '#06b6d4',
        infoText: 'Group operation: taper(axis=y, factor=0.35)',
      },
      {
        name: 'Symmetry: Mirrored Extruded Polygon',
        geometry: {
          type: 'extrudedPolygon',
          params: {
            shape: {
              type: 'polygon',
              params: {
                points: [
                  { u: 0.08, v: -0.42 },
                  { u: 0.92, v: -0.12 },
                  { u: 0.76, v: 0.62 },
                  { u: 0.14, v: 0.34 },
                ],
              },
            },
            height: 1.05,
            pivot: 'bottom',
          },
        },
        operation: { type: 'mirror', params: { axis: 'x' } },
        color: '#67e8f9',
        infoText: 'Group operation: mirror(axis=x)',
      },
      {
        name: 'Symmetry: Mirror Offset Plane',
        geometry: {
          type: 'extrudedPolygon',
          params: {
            shape: {
              type: 'polygon',
              params: {
                points: [
                  { u: 0.1, v: -0.35 },
                  { u: 0.85, v: -0.08 },
                  { u: 0.7, v: 0.5 },
                  { u: 0.18, v: 0.3 },
                ],
              },
            },
            height: 1.05,
            pivot: 'bottom',
          },
        },
        operation: { type: 'mirror', params: { axis: 'x', planeOffset: 0.5 } },
        color: '#a5f3fc',
        infoText: 'Option A symmetry: mirror(axis=x, planeOffset=0.5)',
      },
      {
        name: 'Symmetry: Source Half Positive',
        geometry: {
          type: 'extrudedPolygon',
          params: {
            shape: {
              type: 'polygon',
              params: {
                points: [
                  { u: -0.55, v: -0.38 },
                  { u: 0.86, v: -0.12 },
                  { u: 0.72, v: 0.58 },
                  { u: -0.2, v: 0.28 },
                ],
              },
            },
            height: 1.05,
            pivot: 'bottom',
          },
        },
        operation: { type: 'mirror', params: { axis: 'x', sourceSide: 'positive' } },
        color: '#cffafe',
        infoText: 'Option A source-side editing: mirror(axis=x, sourceSide=positive)',
      },
      {
        name: 'Placement: Points Replication',
        body: placementPointsBody(),
        infoText: 'Group operation: place(points). Replicates full direct-child set at each point.',
      },
      {
        name: 'Placement: Nested Line × Circle',
        body: nestedPlacementBody(),
        infoText: 'Nested place operations: outer place(line) with inner place(circle) per replicated child set.',
      },
      {
        name: 'Lathe (New)',
        geometry: {
          type: 'lathe',
          params: {
            profile: {
              type: 'polyline',
              params: {
                points: [
                  { u: 0.0, v: 0.0 },
                  { u: 0.2, v: 0.2 },
                  { u: 0.45, v: 0.55 },
                  { u: 0.3, v: 1.0 },
                  { u: 0.12, v: 1.2 },
                ],
              },
            },
            segments: 24,
            pivot: 'bottom',
          },
        },
        color: '#38bdf8',
      },
      {
        name: 'Star (New)',
        geometry: { type: 'star', params: { outerRadius: 0.75, innerRadius: 0.35, points: 5, height: 0.5, pivot: 'bottom' } },
        color: '#f59e0b',
      },
      {
        name: 'CSG None (Group)',
        body: csgNoneBody(),
        infoText: 'Group operation: none (no boolean merge)',
      },
      {
        name: 'CSG Union (Group)',
        body: csgUnionBody(),
        infoText: 'Group operation: union',
      },
      {
        name: 'CSG Subtract (Group)',
        body: csgWallBody(),
        infoText: 'Group operation: subtract',
      },
      {
        name: 'CSG Intersect (Group)',
        body: csgIntersectBody(),
        infoText: 'Group operation: intersect',
      },
      {
        name: 'CSG Exclude (Group)',
        body: csgExcludeBody(),
        infoText: 'Group operation: exclude (symmetric difference)',
      },
      {
        name: 'CSG Swept Subtract',
        body: csgSweptSubtractBody(),
        infoText: 'Subtract between capped partial sweeps: cylinder (225°) - cone (90°)',
      },
      {
        name: 'CSG Swept Union',
        body: csgSweptUnionBody(),
        infoText: 'Union between capped partial sweeps: hollowCylinder (270°) + torus (225°)',
      },
      {
        name: 'CSG Deformed Union',
        body: deformedCsgUnionBody(),
        infoText: 'Union with direct CSG operands (group-level op composition for CSG+mesh ops is follow-up)',
      },
      {
        name: 'CSG Graceful Fallback',
        body: csgGracefulFallbackBody(),
        infoText: 'Unsupported operand is skipped (show-must-go-on behavior)',
      },
      {
        name: 'Stress: Layered Mirror + Taper',
        body: layeredMirrorTaperBody(),
        infoText: 'Nested group stack: none -> mirror(sourceSide=positive) -> taper',
      },
      {
        name: 'Stress: Layered CSG Stack',
        body: layeredCsgStackBody(),
        infoText: 'Sibling nested CSG groups in one parent: union + subtract',
      },
      {
        name: 'Stress: Intersect + Exclude Layers',
        body: layeredIntersectExcludeBody(),
        infoText: 'Concurrent layered boolean groups with intersect/exclude branches',
      },
      {
        name: 'Stress: Deep Mixed Hierarchy',
        body: deepMixedHierarchyBody(),
        infoText: 'Deep hierarchy with mirror + taper + light node descendants',
      },
      {
        name: 'Stress: CSG + Nested Deformer Child',
        body: csgWithNestedDeformerChildrenBody(),
        infoText: 'Subtract CSG shell with nested mirror deformation inside primitive children',
      },
      {
        name: 'Stress: Operation Permutation Grid',
        body: operationPermutationGridBody(),
        infoText: 'Single body includes union/subtract/intersect/exclude/taper/mirror permutations',
      },
      {
        name: 'Stress: Multi Nested Mirror',
        body: multiNestedMirrorBody(),
        infoText: 'Nested symmetry chain: mirror(x) -> mirror(z) -> mirror(y) across subtree levels',
      },
    ];

    const columns = 5;
    const spacingX = 5.2;
    const spacingZ = 7;

    entries.forEach((entry, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = (col - (columns - 1) / 2) * spacingX;
      const z = row * spacingZ - 4;

      spawn({
        Info: { name: `${entry.name} Pedestal`, description: `Pedestal for ${entry.name}.` },
        Transform: { x, y: 0.05, z },
        MotionSource: { type: 'static', params: {} },
        Body: panel('#334155', { x: 3.2, y: 0.1, z: 3.2 }),
      });

      spawn({
        Info: { name: entry.name, description: `Geometry sample: ${entry.name}` },
        Transform: { x, y: 0.2, z },
        MotionSource: { type: 'static', params: {} },
        Body: entry.body ?? primitiveBody(entry.geometry, entry.color, entry.operation),
        Rules: [{
          trigger: { type: 'interact' },
          actions: [{
            type: 'popup',
            target: 'other',
            params: { text: `${entry.name}\n\n${entry.infoText ?? `Geometry type: ${entry.geometry.type}`}` },
          }],
        }],
      });
    });

    spawn('player', {
        Transform: {
          x: 0,
          y: 2,
          z: 0,
        },
    }
    )

    spawn({
      Info: { name: 'Roadmap Sign', description: 'Future expansion reminder.' },
      Transform: { x: -11, y: 1.1, z: -11 },
      MotionSource: { type: 'static', params: {} },
      Body: primitiveBody({ type: 'box', params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2 } }, '#1d4ed8'),
      Rules: [{
        trigger: { type: 'interact' },
        actions: [{
          type: 'popup',
          target: 'other',
          params: { text: 'Geometry Playground roadmap:\n- Current: primitives + CSG + deformation + symmetry (mirror planeOffset/sourceSide)\n- Future: expanded deformation + blob demos' },
        }],
      }],
    });
  },
};
