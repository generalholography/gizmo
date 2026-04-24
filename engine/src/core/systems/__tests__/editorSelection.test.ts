import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { collectTransformGizmoPickers, positionHelperAtCentroid } from '../editorSelection';
import { getBodyPartWorldTransformFromDefinition } from '../editorSelection/bodyPartTransforms';

describe('collectTransformGizmoPickers', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    warnSpy.mockClear();
  });

  const makeStub = (
    mode: 'translate' | 'rotate' | 'scale',
    gizmo: any
  ) => ({ mode, _gizmo: gizmo } as unknown as TransformControls & { _gizmo: any });

  it('returns modern picker children when available', () => {
    const child = new THREE.Object3D();
    const stub = makeStub('translate', { picker: { translate: { children: [child] } } });

    const pickers = collectTransformGizmoPickers(stub);

    expect(pickers).toEqual([child]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns legacy pickers stored under gizmo[mode].pickers', () => {
    const child = new THREE.Object3D();
    const stub = makeStub('rotate', { rotate: { pickers: { children: [child] } } });

    const pickers = collectTransformGizmoPickers(stub);

    expect(pickers).toEqual([child]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns legacy pickers stored under gizmo[mode].picker', () => {
    const child = new THREE.Object3D();
    const stub = makeStub('scale', { scale: { picker: { children: [child] } } });

    const pickers = collectTransformGizmoPickers(stub);

    expect(pickers).toEqual([child]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs once when pickers are missing for a mode', () => {
    const stub = makeStub('translate', { picker: {} });
    const diagnostics = new Set<string>();

    const pickers = collectTransformGizmoPickers(stub, diagnostics);

    expect(pickers).toEqual([]);
    expect(diagnostics.has('translate')).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('logs when _gizmo is missing entirely', () => {
    const stub = { mode: 'translate' } as TransformControls & { _gizmo: any };
    const diagnostics = new Set<string>();

    const pickers = collectTransformGizmoPickers(stub, diagnostics);

    expect(pickers).toEqual([]);
    expect(diagnostics.has('missing-gizmo')).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('positionHelperAtCentroid', () => {
  it('copies centroid into helper when not dragging', () => {
    const helper = new THREE.Object3D();
    helper.position.set(0, 0, 0);
    helper.scale.set(2, 2, 2);

    const centroid = new THREE.Vector3(1, 2, 3);

    positionHelperAtCentroid(helper, centroid);

    expect(helper.position.toArray()).toEqual([1, 2, 3]);
    expect(helper.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    expect(helper.scale.toArray()).toEqual([1, 1, 1]);
  });

  it('leaves helper untouched while dragging attached helper', () => {
    const helper = new THREE.Object3D();
    helper.position.set(5, 5, 5);
    helper.scale.set(2, 2, 2);

    const controls = { dragging: true, object: helper } as unknown as TransformControls;
    const centroid = new THREE.Vector3(1, 2, 3);

    positionHelperAtCentroid(helper, centroid, controls);

    expect(helper.position.toArray()).toEqual([5, 5, 5]);
    expect(helper.scale.toArray()).toEqual([2, 2, 2]);
  });
});

describe('getBodyPartWorldTransformFromDefinition', () => {
  it('resolves local + world transforms for nested part paths', () => {
    const body = {
      type: 'composite',
      params: {
        parts: [
          {
            type: 'group',
            operation: { type: 'subtract' },
            localPosition: { x: 1, y: 0, z: 0 },
            children: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                localPosition: { x: 0, y: 2, z: 0 },
                localRotation: { x: 0, y: Math.PI / 2, z: 0 },
                localScale: { x: 2, y: 1, z: 1 }
              }
            ]
          }
        ]
      }
    } as any;

    const entityWorld = new THREE.Matrix4().compose(
      new THREE.Vector3(10, 0, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1)
    );

    const resolved = getBodyPartWorldTransformFromDefinition(body, [0, 0], entityWorld);

    expect(resolved).toBeDefined();
    expect(resolved!.localTransform.position.toArray()).toEqual([0, 2, 0]);
    expect(resolved!.localTransform.scale.toArray()).toEqual([2, 1, 1]);

    const worldPosition = new THREE.Vector3().setFromMatrixPosition(resolved!.worldMatrix);
    expect(worldPosition.toArray()).toEqual([11, 2, 0]);
  });

  it('returns undefined for invalid paths', () => {
    const body = {
      type: 'composite',
      params: {
        parts: [{ geometry: { type: 'sphere', params: { radius: 1 } } }]
      }
    } as any;

    const entityWorld = new THREE.Matrix4().identity();
    const resolved = getBodyPartWorldTransformFromDefinition(body, [2], entityWorld);

    expect(resolved).toBeUndefined();
  });
});
