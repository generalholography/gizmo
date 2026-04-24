import * as THREE from 'three';
import { ECSContext, getModule } from './ecs';
import { bodyModule } from '../modules/body';
import { buildMeshHierarchy } from '../utils/meshHierarchy';

export default class PreviewRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cache = new Map<string, string>();

  constructor(private ctx: ECSContext, private size = 64) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      logarithmicDepthBuffer: false
    });
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemi);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);
  }

  getPreview(def: Record<string, any>): string {
    // Use the Body module for preview generation
    const bodyMod = getModule<ReturnType<typeof bodyModule>>(this.ctx, 'body');
    if (!bodyMod) return '';

    const resolvedId = bodyMod.resolve(def.Body ?? def);

    // Cache based on the resolved body module ID, not the entire entity definition
    // This way caching works properly and only body changes invalidate the cache
    const cacheKey = resolvedId.toString();
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const resolved = bodyMod.get(resolvedId);
    const group = new THREE.Group();

    // Use shared mesh hierarchy building function with no shadows for previews
    buildMeshHierarchy(group, resolved.parts, {
      castShadow: false,
      receiveShadow: false,
      useZTieBreaking: false
    });

    this.scene.add(group);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL();
    this.scene.remove(group);

    // group.traverse(obj => {
    //   if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    // });
    // Do not dispose geometries here; meshes share module geometries
    // and disposing could invalidate other users. Let GC reclaim the Meshes.

    this.cache.set(cacheKey, url);
    return url;
  }

  dispose() {
    this.renderer.dispose();
    this.scene.clear();
    this.cache.clear();
  }
}
