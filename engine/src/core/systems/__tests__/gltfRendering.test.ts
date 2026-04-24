import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { addComponent, addEntity } from 'bitecs';
import { createECS, ECSContext, getModule, setResource } from '../../ecs';
import { Body } from '../../components/Body';
import { Transform } from '../../components/Transform';
import { bodyRenderingSystem } from '../bodyRendering';
import { gltfRenderingSystem } from '../gltfRendering';

describe('gltfRenderingSystem', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createECS();
    const scene = new THREE.Scene();
    const worldRoot = new THREE.Group();
    scene.add(worldRoot);
    ctx.three = {
      scene,
      worldRoot,
      camera: new THREE.PerspectiveCamera(),
      renderer: {} as THREE.WebGLRenderer,
    };

    setResource(ctx, 'renderObjects', new Map<number, THREE.Object3D>());
    setResource(ctx, 'originalMaterialsMap', new Map<number, THREE.Material>());
    setResource(ctx, 'startTime', 0);
  });

  it('attaches loaded GLTF scenes to body render groups', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    addComponent(ctx, Body, eid);

    const bodyMod = getModule(ctx, 'body')!;
    Body.bodyId[eid] = bodyMod.resolve({ type: 'gltf', params: { file: 'asset.glb' } });

    const gltfScene = new THREE.Group();
    gltfScene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
    const cache = new Map<string, { status: 'loaded'; scene: THREE.Object3D }>();
    cache.set('asset.glb', { status: 'loaded', scene: gltfScene });
    setResource(ctx, 'gltfAssetCache', cache);

    bodyRenderingSystem(ctx);
    gltfRenderingSystem(ctx);

    const renderObjects = ctx.resources.get('renderObjects')!.resource as Map<number, THREE.Object3D>;
    const group = renderObjects.get(eid);
    expect(group).toBeDefined();
    const root = group!.getObjectByName('root') ?? group!;
    expect(root.children.length).toBeGreaterThan(0);
  });
});
