import * as THREE from 'three';
import { ECSContext, getResource } from '../ecs';

export interface ScreenshotResult {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  mimeType?: string;
  renderFrame?: () => void;
}

type CameraSnapshot = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov?: number;
  near?: number;
  far?: number;
  zoom?: number;
};

function snapshotCamera(camera: THREE.Camera): CameraSnapshot {
  const base = {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),

  };
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    return {
      ...base,
      fov: (camera as THREE.PerspectiveCamera).fov,
      near: (camera as THREE.PerspectiveCamera).near,
      far: (camera as THREE.PerspectiveCamera).far,
      zoom: (camera as THREE.PerspectiveCamera).zoom,
    };
  }
  return base;
}

function restoreCamera(camera: THREE.Camera, snapshot: CameraSnapshot) {
  camera.position.copy(snapshot.position);
  camera.quaternion.copy(snapshot.quaternion);
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && snapshot.fov !== undefined) {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = snapshot.fov;
    if (snapshot.near !== undefined) perspective.near = snapshot.near;
    if (snapshot.far !== undefined) perspective.far = snapshot.far;
    if (snapshot.zoom !== undefined) {
      perspective.zoom = snapshot.zoom;
    }
    perspective.updateProjectionMatrix();
  }
}

function renderFrame(ctx: ECSContext, options?: ScreenshotOptions) {
  if (options?.renderFrame) {
    options.renderFrame();
    return;
  }
  ctx.three.renderer.render(ctx.three.scene, ctx.three.camera);
}

export function captureWorldScreenshot(ctx: ECSContext, options?: ScreenshotOptions): ScreenshotResult {
  renderFrame(ctx, options);
  const mimeType = options?.mimeType ?? 'image/png';
  const dataUrl = ctx.three.renderer.domElement.toDataURL(mimeType);
  return {
    dataUrl,
    mimeType,
    width: ctx.three.renderer.domElement.width,
    height: ctx.three.renderer.domElement.height,
  };
}

export function captureEntityScreenshot(
  ctx: ECSContext,
  eid: number,
  options?: ScreenshotOptions,
): ScreenshotResult {
  const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects', true);
  if (!renderObjects) {
    throw new Error('Render objects are not available for screenshot capture.');
  }
  const target = renderObjects.get(eid);
  if (!target) {
    throw new Error(`Entity ${eid} does not have a render object.`);
  }

  const camera = ctx.three.camera as THREE.PerspectiveCamera;
  const cameraSnapshot = snapshotCamera(camera);
  const hidden = new Map<THREE.Object3D, boolean>();

  renderObjects.forEach((obj, objEid) => {
    if (objEid === eid) return;
    hidden.set(obj, obj.visible);
    obj.visible = false;
  });

  const box = new THREE.Box3().setFromObject(target);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  if (size.lengthSq() > 0 && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = Math.max(fitHeightDistance, fitWidthDistance);

    const direction = cameraSnapshot.position.clone().sub(center).normalize();
    if (direction.lengthSq() < 0.0001) {
      direction.set(0, 0, 1);
    }

    camera.position.copy(center).add(direction.multiplyScalar(distance * 1.2));
    camera.near = Math.max(0.01, distance / 100);
    camera.far = Math.max(distance * 4, camera.near + 10);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }

  const result = captureWorldScreenshot(ctx, options);

  hidden.forEach((visible, obj) => {
    obj.visible = visible;
  });
  restoreCamera(camera, cameraSnapshot);

  return result;
}
