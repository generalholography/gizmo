import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import type { ECSContext } from '../ecs';
import { getResource } from '../ecs';

export type ModelExportFormat = 'gltf' | 'glb' | 'stl';
export type ModelExportScope = 'world' | 'entity';

export interface ModelExportTarget {
  scope: ModelExportScope;
  eid?: number;
  name?: string;
}

export interface ModelExportPayload {
  filename: string;
  blob: Blob;
}

function sanitizeExportObject(root: THREE.Object3D): void {
  const removals: THREE.Object3D[] = [];

  root.traverse((child) => {
    if (child.userData?.isCsgSourceProxy === true || child.userData?.isMirrorPartProxy === true) {
      removals.push(child);
      return;
    }

    if (!child.visible) {
      removals.push(child);
      return;
    }

    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const material = mesh.material;
      if (Array.isArray(material)) {
        mesh.material = material.map((entry) => entry.clone());
      } else if (material) {
        mesh.material = material.clone();
      }
    }
  });

  removals.forEach((child) => {
    child.parent?.remove(child);
  });
}

export function buildExportScene(ctx: ECSContext, target: ModelExportTarget): THREE.Scene {
  const scene = new THREE.Scene();
  const source = (() => {
    if (target.scope === 'world') {
      return ctx.three.worldRoot;
    }

    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects', true);
    if (!renderObjects || target.eid === undefined) {
      throw new Error('Render objects are not available for entity export.');
    }

    const object = renderObjects.get(target.eid);
    if (!object) {
      throw new Error(`Entity ${target.eid} does not have a render object.`);
    }

    return object;
  })();

  const clonedRoot = cloneSkeleton(source);
  sanitizeExportObject(clonedRoot);
  clonedRoot.updateMatrixWorld(true);
  scene.add(clonedRoot);
  return scene;
}

function slugifyFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
}

function buildFilename(target: ModelExportTarget, format: ModelExportFormat): string {
  const baseName = slugifyFilenamePart(target.name || (target.scope === 'world' ? 'world' : `entity-${target.eid}`));
  return `${baseName}-${Date.now()}.${format}`;
}

async function exportGLTF(scene: THREE.Scene, binary: boolean): Promise<Blob> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, {
    binary,
    onlyVisible: true,
    trs: false,
  });

  if (binary) {
    return new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
  }

  const json = JSON.stringify(result, null, 2);
  return new Blob([json], { type: 'model/gltf+json' });
}

function exportSTL(scene: THREE.Scene): Blob {
  const exporter = new STLExporter();
  const removals: Array<{ object: THREE.Object3D; parent: THREE.Object3D | null }> = [];

  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
    const positionAttribute = geometry?.getAttribute?.('position');

    if (!geometry || !positionAttribute) {
      removals.push({ object: child, parent: child.parent });
    }
  });

  let result: unknown;
  try {
    removals.forEach(({ object, parent }) => {
      parent?.remove(object);
    });
    result = exporter.parse(scene, { binary: true });
  } finally {
    removals.forEach(({ object, parent }) => {
      parent?.add(object);
    });
  }

  if (result instanceof DataView) {
    const bytes = new Uint8Array(result.byteLength);
    bytes.set(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
    return new Blob([bytes], { type: 'model/stl' });
  }

  if (result instanceof ArrayBuffer) {
    return new Blob([result], { type: 'model/stl' });
  }

  return new Blob([String(result ?? '')], { type: 'model/stl' });
}

export async function exportModel(ctx: ECSContext, target: ModelExportTarget, format: ModelExportFormat): Promise<ModelExportPayload> {
  const scene = buildExportScene(ctx, target);
  const blob = format === 'glb'
    ? await exportGLTF(scene, true)
    : format === 'gltf'
      ? await exportGLTF(scene, false)
      : exportSTL(scene);

  return {
    filename: buildFilename(target, format),
    blob,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
