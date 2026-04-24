import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildExportScene, exportModel } from '../modelExport';
import type { ECSContext } from '../../ecs';
import { setResource } from '../../ecs';

function createMockContext(): ECSContext {
  return {
    three: {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: {} as THREE.WebGLRenderer,
      worldRoot: new THREE.Group(),
    },
    rapier: { world: {} as any },
    input: {} as any,
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: false,
    time: { update: () => {}, disconnect: () => {} } as any,
  } as ECSContext;
}

describe('buildExportScene', () => {
  it('builds a world export scene without editor proxy meshes', () => {
    const ctx = createMockContext();
    const visibleMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const hiddenMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    hiddenMesh.visible = false;
    const csgProxy = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    csgProxy.userData.isCsgSourceProxy = true;
    const mirrorProxy = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mirrorProxy.userData.isMirrorPartProxy = true;

    ctx.three.worldRoot.add(visibleMesh, hiddenMesh, csgProxy, mirrorProxy);

    const scene = buildExportScene(ctx, { scope: 'world', name: 'World' });
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry).toBeInstanceOf(THREE.BoxGeometry);
  });

  it('builds an entity export scene from renderObjects', () => {
    const ctx = createMockContext();
    const entityRoot = new THREE.Group();
    entityRoot.add(new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshStandardMaterial()));
    const renderObjects = new Map<number, THREE.Object3D>([[7, entityRoot]]);
    setResource(ctx, 'renderObjects', renderObjects);

    const scene = buildExportScene(ctx, { scope: 'entity', eid: 7, name: 'Entity' });
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry).toBeInstanceOf(THREE.SphereGeometry);
  });

  it('exports world STL even when some meshes have no position attribute', async () => {
    const ctx = createMockContext();
    const validMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const invalidGeometry = new THREE.BufferGeometry();
    const invalidMesh = new THREE.Mesh(invalidGeometry, new THREE.MeshBasicMaterial());

    ctx.three.worldRoot.add(validMesh, invalidMesh);

    const payload = await exportModel(ctx, { scope: 'world', name: 'World' }, 'stl');

    expect(payload.filename.endsWith('.stl')).toBe(true);
    expect(payload.blob.size).toBeGreaterThan(0);
  });
});
