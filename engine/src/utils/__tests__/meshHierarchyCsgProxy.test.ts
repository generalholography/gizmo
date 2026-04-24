import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildMeshHierarchy } from '../meshHierarchy';
import type { BodyResolved } from '../../modules/body';

function makeBoxGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1, 1, 1);
}

function makeMaterial(): THREE.Material {
  return new THREE.MeshBasicMaterial({ color: 0x888888 });
}

describe('buildMeshHierarchy – bodyPartPath userData', () => {
  it('stores bodyPartPath on each mesh for top-level parts', () => {
    const parent = new THREE.Object3D();
    const parts: BodyResolved['parts'] = [
      { type: 'geometry', mesh: makeBoxGeometry(), material: makeMaterial(), ignoreCollisions: false },
      { type: 'geometry', mesh: makeBoxGeometry(), material: makeMaterial(), ignoreCollisions: false },
    ];

    buildMeshHierarchy(parent, parts);

    const meshes: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh) meshes.push(c);
    });

    expect(meshes.length).toBe(2);
    expect(meshes[0].userData.bodyPartPath).toEqual([0]);
    expect(meshes[1].userData.bodyPartPath).toEqual([1]);
  });

  it('stores nested bodyPartPath for children', () => {
    const parent = new THREE.Object3D();
    const child: BodyResolved['parts'][0] = {
      type: 'geometry',
      mesh: makeBoxGeometry(),
      material: makeMaterial(),
      ignoreCollisions: false,
    };
    const parts: BodyResolved['parts'] = [
      {
        type: 'geometry',
        mesh: makeBoxGeometry(),
        material: makeMaterial(),
        ignoreCollisions: false,
        children: [child],
      },
    ];

    buildMeshHierarchy(parent, parts);

    const meshes: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh) meshes.push(c);
    });

    expect(meshes.length).toBe(2);
    const paths = meshes.map((m) => m.userData.bodyPartPath as number[]);
    expect(paths).toContainEqual([0]);
    expect(paths).toContainEqual([0, 0]);
  });
});

describe('buildMeshHierarchy – CSG source proxy meshes', () => {
  it('creates invisible proxy meshes alongside the merged CSG mesh', () => {
    const parent = new THREE.Object3D();
    const proxyGeom0 = makeBoxGeometry();
    const proxyGeom1 = new THREE.SphereGeometry(0.5);

    const parts: BodyResolved['parts'] = [
      {
        type: 'geometry',
        mesh: makeBoxGeometry(),
        material: makeMaterial(),
        ignoreCollisions: false,
        csgSourceProxies: [
          { geometry: proxyGeom0, sourceIndex: 0 },
          { geometry: proxyGeom1, sourceIndex: 1 },
        ],
      },
    ];

    buildMeshHierarchy(parent, parts);

    const allMeshes: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh) allMeshes.push(c);
    });

    // Should have 1 real mesh + 2 proxy meshes = 3 total
    expect(allMeshes.length).toBe(3);

    const proxies = allMeshes.filter((m) => m.userData.isCsgSourceProxy === true);
    expect(proxies.length).toBe(2);

    // Proxies should be invisible by default
    proxies.forEach((p) => expect(p.visible).toBe(false));

    // Proxies should be very slightly scaled up to avoid z-fighting
    proxies.forEach((p) => {
      expect(p.scale.x).toBeGreaterThan(1);
      expect(p.scale.y).toBeGreaterThan(1);
      expect(p.scale.z).toBeGreaterThan(1);
    });
  });

  it('stores csgSourceIndex and csgMergedPartPath on proxy meshes', () => {
    const parent = new THREE.Object3D();

    const parts: BodyResolved['parts'] = [
      {
        type: 'geometry',
        mesh: makeBoxGeometry(),
        material: makeMaterial(),
        ignoreCollisions: false,
        csgSourceProxies: [
          { geometry: makeBoxGeometry(), sourceIndex: 0 },
          { geometry: makeBoxGeometry(), sourceIndex: 1 },
        ],
      },
      {
        type: 'geometry',
        mesh: makeBoxGeometry(),
        material: makeMaterial(),
        ignoreCollisions: false,
        csgSourceProxies: [
          { geometry: makeBoxGeometry(), sourceIndex: 2 },
        ],
      },
    ];

    buildMeshHierarchy(parent, parts);

    const proxies: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh && c.userData.isCsgSourceProxy) proxies.push(c);
    });

    expect(proxies.length).toBe(3);

    // Proxies from the first merged part (path [0])
    const proxyA = proxies.find(
      (p) => p.userData.csgSourceIndex === 0 &&
             JSON.stringify(p.userData.csgMergedPartPath) === JSON.stringify([0])
    );
    expect(proxyA).toBeDefined();

    const proxyB = proxies.find(
      (p) => p.userData.csgSourceIndex === 1 &&
             JSON.stringify(p.userData.csgMergedPartPath) === JSON.stringify([0])
    );
    expect(proxyB).toBeDefined();

    // Proxy from the second merged part (path [1])
    const proxyC = proxies.find(
      (p) => p.userData.csgSourceIndex === 2 &&
             JSON.stringify(p.userData.csgMergedPartPath) === JSON.stringify([1])
    );
    expect(proxyC).toBeDefined();
  });

  it('does not create proxy meshes when csgSourceProxies is absent', () => {
    const parent = new THREE.Object3D();
    const parts: BodyResolved['parts'] = [
      { type: 'geometry', mesh: makeBoxGeometry(), material: makeMaterial(), ignoreCollisions: false },
    ];

    buildMeshHierarchy(parent, parts);

    const proxies: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh && c.userData.isCsgSourceProxy) proxies.push(c);
    });

    expect(proxies.length).toBe(0);
  });

  it('derives the correct definition path for a CSG source proxy click: [...mergedPartPath, sourceIndex]', () => {
    // Simulate what editorSelection does when it hits a proxy mesh.
    const proxyMesh = new THREE.Mesh(makeBoxGeometry(), makeMaterial());
    proxyMesh.userData.isCsgSourceProxy = true;
    proxyMesh.userData.csgMergedPartPath = [0];
    proxyMesh.userData.csgSourceIndex = 1;

    // Reproduce the path computation from editorSelection.ts
    const mergedPath = proxyMesh.userData.csgMergedPartPath as number[];
    const sourceIndex = proxyMesh.userData.csgSourceIndex as number;
    const definitionPath = [...mergedPath, sourceIndex];

    // Path [0, 1] → body.params.parts[0].children[1]
    expect(definitionPath).toEqual([0, 1]);
  });

  it('rebuilds proxies cleanly during continuous preview updates and keeps rebuild timing bounded', () => {
    const parent = new THREE.Object3D();
    const iterations = 40;
    const proxiesPerRebuild = 24;

    const start = performance.now();

    for (let step = 0; step < iterations; step++) {
      parent.clear();

      const parts: BodyResolved['parts'] = [
        {
          type: 'geometry',
          mesh: makeBoxGeometry(),
          material: makeMaterial(),
          ignoreCollisions: false,
          csgSourceProxies: Array.from({ length: proxiesPerRebuild }, (_, i) => ({
            geometry: makeBoxGeometry(),
            sourceIndex: step * 100 + i,
          })),
        },
      ];

      buildMeshHierarchy(parent, parts);

      const proxies: THREE.Mesh[] = [];
      parent.traverse((c) => {
        if (c instanceof THREE.Mesh && c.userData.isCsgSourceProxy) proxies.push(c);
      });

      expect(proxies.length).toBe(proxiesPerRebuild);
      expect(proxies.every((p) => p.userData.csgMergedPartPath?.[0] === 0)).toBe(true);
      expect(proxies.every((p) => p.userData.csgSourceIndex >= step * 100)).toBe(true);
      expect(proxies.every((p) => p.userData.csgSourceIndex < step * 100 + proxiesPerRebuild)).toBe(true);
    }

    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(2500);
  });

  it('handles dense CSG proxy rebuild/raycast stress scenario within practical overhead bounds', () => {
    const parent = new THREE.Object3D();
    const mergedPartCount = 70;
    const proxiesPerPart = 14;

    const denseParts: BodyResolved['parts'] = Array.from({ length: mergedPartCount }, (_, partIndex) => ({
      type: 'geometry',
      mesh: makeBoxGeometry(),
      material: makeMaterial(),
      ignoreCollisions: false,
      localTransform: new THREE.Matrix4().makeTranslation((partIndex % 10) * 1.5, Math.floor(partIndex / 10) * 1.2, 0),
      csgSourceProxies: Array.from({ length: proxiesPerPart }, (_, proxyIndex) => ({
        geometry: new THREE.SphereGeometry(0.25),
        sourceIndex: proxyIndex,
      })),
    }));

    const buildStart = performance.now();
    for (let i = 0; i < 6; i++) {
      parent.clear();
      buildMeshHierarchy(parent, denseParts);
    }
    const buildMs = performance.now() - buildStart;

    parent.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    const raycastStart = performance.now();
    let totalHits = 0;
    for (let i = 0; i < 80; i++) {
      const x = (i % 16) - 8;
      const y = 12 + (i % 5);
      raycaster.set(new THREE.Vector3(x, y, 14), new THREE.Vector3(0, -0.5, -1).normalize());
      totalHits += raycaster.intersectObject(parent, true).length;
    }
    const raycastMs = performance.now() - raycastStart;

    const proxies: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh && c.userData.isCsgSourceProxy) proxies.push(c);
    });

    expect(proxies.length).toBe(mergedPartCount * proxiesPerPart);
    expect(totalHits).toBeGreaterThan(0);
    expect(buildMs).toBeLessThan(5000);
    expect(raycastMs).toBeLessThan(5000);
  });
});

describe('buildMeshHierarchy – mirror deformation proxy meshes', () => {
  it('creates an invisible mirror proxy for mirrored deformation parts', () => {
    const parent = new THREE.Object3D();
    const parts: BodyResolved['parts'] = [
      {
        type: 'geometry',
        mesh: makeBoxGeometry(),
        material: makeMaterial(),
        ignoreCollisions: false,
        hasMirrorSymmetry: true,
      },
    ];

    buildMeshHierarchy(parent, parts);

    const mirrorProxies: THREE.Mesh[] = [];
    parent.traverse((c) => {
      if (c instanceof THREE.Mesh && c.userData.isMirrorPartProxy === true) mirrorProxies.push(c);
    });

    expect(mirrorProxies.length).toBe(1);
    expect(mirrorProxies[0].visible).toBe(false);
    expect(mirrorProxies[0].name).toBe('mirror-proxy');
    expect(mirrorProxies[0].scale.x).toBeGreaterThan(1);
  });

  it('stores mirrorPartPath metadata for mirror proxy meshes', () => {
    const parent = new THREE.Object3D();
    const parts: BodyResolved['parts'] = [
      {
        type: 'geometry',
        mesh: makeBoxGeometry(),
        material: makeMaterial(),
        ignoreCollisions: false,
        children: [
          {
            type: 'geometry',
            mesh: makeBoxGeometry(),
            material: makeMaterial(),
            ignoreCollisions: false,
            hasMirrorSymmetry: true,
          },
        ],
      },
    ];

    buildMeshHierarchy(parent, parts);

    const mirrorProxy = (() => {
      let found: THREE.Mesh | undefined;
      parent.traverse((c) => {
        if (found) return;
        if (c instanceof THREE.Mesh && c.userData.isMirrorPartProxy === true) {
          found = c;
        }
      });
      return found;
    })();

    expect(mirrorProxy).toBeDefined();
    expect(mirrorProxy!.userData.mirrorPartPath).toEqual([0, 0]);
  });
});
