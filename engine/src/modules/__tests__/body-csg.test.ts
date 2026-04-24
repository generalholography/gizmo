import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext } from '../../core/ecs';
import { bodyModule } from '../body';
import { Body } from '../../core/schema';

function collectNodesByType(parts: any[], type: string): any[] {
  const out: any[] = [];
  const visit = (node: any) => {
    if (node?.type === type) out.push(node);
    if (Array.isArray(node?.children)) {
      for (const child of node.children) visit(child);
    }
  };
  for (const part of parts) visit(part);
  return out;
}

function findFirstNodeByType(parts: any[], type: string): any | undefined {
  return collectNodesByType(parts, type)[0];
}

function collectGeometryWorldPositions(parts: any[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const visit = (node: any, parentMatrix: THREE.Matrix4) => {
    const local = node?.localTransform ? (node.localTransform as THREE.Matrix4) : new THREE.Matrix4();
    const world = parentMatrix.clone().multiply(local);
    if (node?.type === 'geometry') {
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(world);
      out.push(position);
    }
    if (Array.isArray(node?.children)) {
      for (const child of node.children) visit(child, world);
    }
  };
  const identity = new THREE.Matrix4();
  for (const part of parts) visit(part, identity);
  return out;
}

describe('body module CSG operations', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createECS();
  });

  it('combines sibling primitives with subtract into one CSG mesh', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'subtract' },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2, lengthZ: 2 } },
                material: { type: 'solid', params: { color: '#888888' } },
              },
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                localPosition: { x: 0.4, y: 0, z: 0 },
                material: { type: 'solid', params: { color: '#ffffff' } },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);

    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');

    expect(geometryParts.length).toBe(1);
    expect(resolved.colliders.length).toBe(1);
  });

  it('gracefully falls back when subtract operand is unsupported for CSG', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'subtract' },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 1, lengthZ: 2 } },
                material: { type: 'solid', params: { color: '#777777' } },
              },
              {
                geometry: {
                  type: 'displacedPlane',
                  params: {
                    lengthX: 4,
                    lengthZ: 4,
                    field: { type: 'simplex', params: { amplitude: 0.2, frequency: 0.5 } },
                  },
                },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);

    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');

    expect(geometryParts.length).toBe(2);
    expect(resolved.localBounds.isEmpty()).toBe(false);
  });

  it('applies CSG to primitive siblings in child lists', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
            ignoreCollisions: true,
            children: [
              {
                type: 'group',
                operation: { type: 'subtract' },
                children: [
                  {
                    geometry: { type: 'box', params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2 } },
                    ignoreCollisions: true,
                  },
                  {
                    geometry: { type: 'sphere', params: { radius: 0.5 } },
                    ignoreCollisions: true,
                  },
                ],
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);

    const resolved = body.get(bodyId);
    const rootPart = findFirstNodeByType(resolved.parts as any[], 'geometry');

    expect(rootPart.type).toBe('geometry');
    expect(rootPart.children).toBeDefined();
    expect(rootPart.children?.length).toBe(1);
  });

  it('supports exclude operation via group node', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'exclude' },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 1.6, lengthY: 1.6, lengthZ: 1.6 } },
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.9 } },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');

    expect(geometryParts.length).toBe(1);
  });

  it('supports subtract CSG with capped partial arc primitives', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'subtract' },
            children: [
              {
                geometry: { type: 'cylinder', params: { radius: 1.0, height: 1.8, arc: Math.PI * 1.25, pivot: 'bottom' } },
              },
              {
                geometry: { type: 'cone', params: { radius: 0.55, height: 1.6, arc: Math.PI / 2, pivot: 'bottom' } },
                localPosition: { x: 0.2, y: 0, z: 0 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');

    expect(geometryParts.length).toBe(1);
    expect(resolved.colliders.length).toBe(1);
  });

  it('supports union CSG with capped partial torus and hollow cylinder', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'union' },
            children: [
              {
                geometry: { type: 'hollowCylinder', params: { outerRadius: 0.95, innerRadius: 0.6, height: 1.1, arc: Math.PI * 1.5, pivot: 'bottom' } },
              },
              {
                geometry: { type: 'torus', params: { majorRadius: 0.85, minorRadius: 0.22, arc: Math.PI * 1.25, pivot: 'bottom' } },
                localPosition: { x: 0, y: 0.55, z: 0 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');

    expect(geometryParts.length).toBe(1);
    expect(resolved.colliders.length).toBe(1);
  });

  it('applies group-level taper operation to direct child outputs', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'taper', params: { axis: 'y', factor: 0.45 } },
            children: [
              {
                geometry: { type: 'cylinder', params: { radius: 0.45, height: 1.4, pivot: 'bottom' } },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');

    expect(geometryParts.length).toBe(1);
    const part = geometryParts[0] as any;
    expect(part.hasMirrorSymmetry).toBe(false);
    expect(resolved.colliders.length).toBe(1);
  });

  it('applies mirror symmetry relative to group plane when child has local translation', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'mirror', params: { axis: 'x' } },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 0.6 } },
                localPosition: { x: 0.6, y: 0, z: 0 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');
    expect(geometryParts.length).toBe(2);

    const positions = collectGeometryWorldPositions(resolved.parts as any[])
      .map((p) => Number(p.x.toFixed(5)))
      .sort((a, b) => a - b);

    // Source child at +0.6 and mirrored instance at -0.6 around x=0 plane.
    expect(positions[0]).toBeCloseTo(-0.6, 5);
    expect(positions[1]).toBeCloseTo(0.6, 5);
  });

  it('rebuilds colliders from mirrored geometry outputs', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'mirror', params: { axis: 'x' } },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.6, lengthY: 0.6, lengthZ: 0.6 } },
                localPosition: { x: 0.5, y: 0, z: 0 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);

    expect(resolved.colliders.length).toBe(2);
  });

  it('marks bodies with taper/mirror groups for downstream collider policy', () => {
    const body = bodyModule(ctx);

    const bodyId = body.resolve({
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'taper', params: { axis: 'y', factor: 0.5 } },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
              },
            ],
          },
        ] as any,
      },
    } as Body);

    const resolved = body.get(bodyId);
    expect(resolved.hasGroupMeshOperations).toBe(true);
  });

  it('attaches csgSourceProxies to the merged part for each participating source primitive', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'subtract' },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2, lengthZ: 2 } },
                material: { type: 'solid', params: { color: '#888888' } },
              },
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                localPosition: { x: 0.4, y: 0, z: 0 },
                material: { type: 'solid', params: { color: '#ffffff' } },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const mergedPart = findFirstNodeByType(resolved.parts as any[], 'geometry') as any;

    expect(mergedPart).toBeDefined();
    expect(mergedPart.csgSourceProxies).toBeDefined();
    expect(mergedPart.csgSourceProxies.length).toBe(2);
    // sourceIndex must correspond to the child index within the group's children array
    expect(mergedPart.csgSourceProxies[0].sourceIndex).toBe(0);
    expect(mergedPart.csgSourceProxies[1].sourceIndex).toBe(1);
  });

  it('sourceIndex in csgSourceProxies matches GroupNode.children index (not filtered array index)', () => {
    const body = bodyModule(ctx);

    // Group has 3 children: unsupported (displacedPlane), primitive, primitive.
    // Only children[1] and children[2] participate in CSG; their sourceIndex should be 1 and 2.
    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'subtract' },
            children: [
              {
                // Not a primitive node – filtered out of CSG candidates
                type: 'group',
                operation: { type: 'none', params: {} },
                children: [],
              } as any,
              {
                geometry: { type: 'box', params: { lengthX: 2, lengthY: 2, lengthZ: 2 } },
                material: { type: 'solid', params: { color: '#888888' } },
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.8 } },
                material: { type: 'solid', params: { color: '#ffffff' } },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const mergedPart = findFirstNodeByType(resolved.parts as any[], 'geometry') as any;

    // Only the two primitive children participate → 2 proxies
    expect(mergedPart.csgSourceProxies).toBeDefined();
    expect(mergedPart.csgSourceProxies.length).toBe(2);
    // sourceIndex must be the original child index (1 and 2), not the filtered position (0 and 1)
    const indices = mergedPart.csgSourceProxies.map((p: any) => p.sourceIndex);
    expect(indices).toContain(1);
    expect(indices).toContain(2);
  });

  it('preserves child local transform and group local transform as separate nodes', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'none', params: {} },
            localPosition: { x: 3, y: 2, z: -1 },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                localPosition: { x: 0.5, y: 0.25, z: 0.75 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const geometryPart = findFirstNodeByType(resolved.parts as any[], 'geometry') as any;
    const groupPart = findFirstNodeByType(resolved.parts as any[], 'group') as any;

    expect(geometryPart).toBeDefined();
    expect(groupPart).toBeDefined();
    expect(geometryPart.localTransform).toBeDefined();
    expect(groupPart.localTransform).toBeDefined();

    const childPos = new THREE.Vector3();
    childPos.setFromMatrixPosition(geometryPart.localTransform);
    expect(childPos.x).toBeCloseTo(0.5, 5);
    expect(childPos.y).toBeCloseTo(0.25, 5);
    expect(childPos.z).toBeCloseTo(0.75, 5);

    const groupPos = new THREE.Vector3();
    groupPos.setFromMatrixPosition(groupPart.localTransform);
    expect(groupPos.x).toBeCloseTo(3, 5);
    expect(groupPos.y).toBeCloseTo(2, 5);
    expect(groupPos.z).toBeCloseTo(-1, 5);
  });

  it('replicates the whole direct child set for place operation and excludes original source set', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
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
                      { x: 1, y: 0, z: 0 },
                      { x: 3, y: 0, z: 0 },
                    ],
                  },
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.4, lengthY: 0.4, lengthZ: 0.4 } },
              },
              {
                geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.2, lengthZ: 0.2 } },
                localPosition: { x: 0.5, y: 0, z: 0 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const positions = collectGeometryWorldPositions(resolved.parts as any[])
      .map((p) => Number(p.x.toFixed(5)))
      .sort((a, b) => a - b);

    expect(positions).toEqual([1, 1.5, 3, 3.5]);
    expect(positions).not.toContain(0);
    expect(positions).not.toContain(0.5);
  });

  it('defaults place orientation to none when omitted', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
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
                    start: { x: 0, y: 0, z: 0 },
                    end: { x: 2, y: 0, z: 0 },
                    count: 3,
                  },
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.25, lengthY: 0.25, lengthZ: 0.25 } },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const positions = collectGeometryWorldPositions(resolved.parts as any[])
      .map((p) => Number(p.x.toFixed(5)))
      .sort((a, b) => a - b);

    expect(positions).toEqual([0, 1, 2]);
  });

  it('requires a seed for stochastic place random placement', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: {
              type: 'place',
              params: {
                placement: {
                  type: 'random',
                  params: {
                    bounds: { x: [0, 2], z: [0, 2] },
                    count: 2,
                  },
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.3, lengthY: 0.3, lengthZ: 0.3 } },
              },
            ],
          },
        ] as any,
      },
    };

    expect(() => {
      const bodyId = body.resolve(bodyDef);
      body.get(bodyId);
    }).toThrow(/requires a finite seed/i);
  });

  it('supports tangent orientation for placed child sets', () => {
    const body = bodyModule(ctx);

    const bodyDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: {
              type: 'place',
              params: {
                orientation: 'tangent',
                placement: {
                  type: 'line',
                  params: {
                    start: { x: 0, y: 0, z: 0 },
                    end: { x: 2, y: 0, z: 0 },
                    count: 3,
                  },
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.2, lengthZ: 0.2 } },
                localPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
        ] as any,
      },
    };

    const bodyId = body.resolve(bodyDef);
    const resolved = body.get(bodyId);
    const positions = collectGeometryWorldPositions(resolved.parts as any[])
      .map((p) => ({ x: Number(p.x.toFixed(5)), z: Number(p.z.toFixed(5)) }))
      .sort((a, b) => a.x - b.x);

    expect(positions).toEqual([
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ]);
  });

  it('supports radial orientation and fixed yaw for place operation', () => {
    const body = bodyModule(ctx);

    const radialDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: {
              type: 'place',
              params: {
                orientation: 'radial',
                placement: {
                  type: 'points',
                  params: {
                    positions: [
                      { x: 1, y: 0, z: 0 },
                      { x: -1, y: 0, z: 0 },
                    ],
                  },
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.2, lengthZ: 0.2 } },
                localPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
        ] as any,
      },
    };

    const radialResolved = body.get(body.resolve(radialDef));
    const radialPositions = collectGeometryWorldPositions(radialResolved.parts as any[])
      .map((p) => ({ x: Number(p.x.toFixed(5)), z: Number(p.z.toFixed(5)) }))
      .sort((a, b) => a.x - b.x);
    expect(radialPositions).toEqual([
      { x: -2, z: 0 },
      { x: 2, z: 0 },
    ]);

    const fixedDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: {
              type: 'place',
              params: {
                orientation: 'fixed',
                fixedYaw: Math.PI,
                placement: {
                  type: 'points',
                  params: {
                    positions: [{ x: 0, y: 0, z: 0 }],
                  },
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.2, lengthZ: 0.2 } },
                localPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
        ] as any,
      },
    };

    const fixedResolved = body.get(body.resolve(fixedDef));
    const fixedPos = collectGeometryWorldPositions(fixedResolved.parts as any[])[0];
    expect(Number(fixedPos.x.toFixed(5))).toBeCloseTo(0, 5);
    expect(Number(fixedPos.z.toFixed(5))).toBeCloseTo(-1, 5);
  });

  it('does not crash when place placement type is switched with incomplete params', () => {
    const body = bodyModule(ctx);

    const switchedDef: Body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: {
              type: 'place',
              params: {
                placement: {
                  type: 'circle',
                  params: {},
                },
              },
            },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 0.2, lengthY: 0.2, lengthZ: 0.2 } },
              },
            ],
          },
        ] as any,
      },
    };

    expect(() => {
      const bodyId = body.resolve(switchedDef);
      const resolved = body.get(bodyId);
      const geometryParts = collectNodesByType(resolved.parts as any[], 'geometry');
      expect(geometryParts.length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});
