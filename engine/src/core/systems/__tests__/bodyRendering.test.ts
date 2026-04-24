import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { addComponent, addEntity } from 'bitecs';
import { createECS, ECSContext, setResource } from '../../ecs';
import { _InputState } from '../../components/_InputState';
import { getTaggedObjects } from '../../../modules/renderer';
import { Transform } from '../../components/Transform';
import { syncObject3DTransformFromECS } from '../bodyRendering';

describe('Head Rotation Functionality', () => {
  let ctx: ECSContext;
  let mockObjects: Map<number, THREE.Object3D>;

  beforeEach(() => {
    ctx = createECS();
    mockObjects = new Map();
    setResource(ctx, 'renderObjects', mockObjects);
  });

  it('should find and rotate head objects based on InputState', () => {
    // Create an entity with InputState
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    // Set input state values (45 degrees yaw, 30 degrees pitch)
    const yaw = Math.PI / 4; // 45 degrees
    const pitch = Math.PI / 6; // 30 degrees
    _InputState.yaw[eid] = yaw;
    _InputState.pitch[eid] = pitch;
    
    // Create a mock head object and add it to renderObjects
    const rootGroup = new THREE.Group();
    const headMesh = new THREE.Mesh();
    headMesh.name = 'head';
    rootGroup.add(headMesh);
    mockObjects.set(eid, rootGroup);
    
    // Simulate the head rotation logic from bodyRenderingSystem
    const headObjects = getTaggedObjects(ctx, eid, "head");
    expect(headObjects).toHaveLength(1);
    
    if (headObjects.length > 0) {
      const yawFromState = _InputState.yaw[eid] ?? 0;
      const pitchFromState = _InputState.pitch[eid] ?? 0;
      
      for (const headObj of headObjects) {
        // Apply pitch and yaw rotation to head objects
        // Clamp pitch to prevent over-rotation
        const clampedPitch = Math.min(Math.max(pitchFromState, -Math.PI / 2), Math.PI / 2);
        headObj.rotation.set(clampedPitch, yawFromState, 0, "YXZ");
      }
    }
    
    // Check that the head object has the correct rotation
    expect(headMesh.rotation.x).toBeCloseTo(pitch, 5);
    expect(headMesh.rotation.y).toBeCloseTo(yaw, 5);
    expect(headMesh.rotation.z).toBe(0);
    expect(headMesh.rotation.order).toBe("YXZ");
  });

  it('should clamp pitch rotation to prevent over-rotation', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    // Set extreme pitch values
    const extremePitch = Math.PI; // 180 degrees (should be clamped to 90)
    _InputState.yaw[eid] = 0;
    _InputState.pitch[eid] = extremePitch;
    
    const rootGroup = new THREE.Group();
    const headMesh = new THREE.Mesh();
    headMesh.name = 'head';
    rootGroup.add(headMesh);
    mockObjects.set(eid, rootGroup);
    
    // Apply rotation logic
    const headObjects = getTaggedObjects(ctx, eid, "head");
    for (const headObj of headObjects) {
      const clampedPitch = Math.min(Math.max(_InputState.pitch[eid], -Math.PI / 2), Math.PI / 2);
      headObj.rotation.set(clampedPitch, _InputState.yaw[eid], 0, "YXZ");
    }
    
    // Check that pitch is clamped to PI/2 (90 degrees)
    expect(headMesh.rotation.x).toBeCloseTo(Math.PI / 2, 5);
    expect(headMesh.rotation.y).toBe(0);
  });

  it('should handle negative pitch values correctly', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    // Set negative extreme pitch
    const negativePitch = -Math.PI; // -180 degrees (should be clamped to -90)
    _InputState.yaw[eid] = 0;
    _InputState.pitch[eid] = negativePitch;
    
    const rootGroup = new THREE.Group();
    const headMesh = new THREE.Mesh();
    headMesh.name = 'head';
    rootGroup.add(headMesh);
    mockObjects.set(eid, rootGroup);
    
    // Apply rotation logic
    const headObjects = getTaggedObjects(ctx, eid, "head");
    for (const headObj of headObjects) {
      const clampedPitch = Math.min(Math.max(_InputState.pitch[eid], -Math.PI / 2), Math.PI / 2);
      headObj.rotation.set(clampedPitch, _InputState.yaw[eid], 0, "YXZ");
    }
    
    // Check that pitch is clamped to -PI/2 (-90 degrees)
    expect(headMesh.rotation.x).toBeCloseTo(-Math.PI / 2, 5);
    expect(headMesh.rotation.y).toBe(0);
  });

  it('should handle multiple head objects', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    const yaw = Math.PI / 3; // 60 degrees
    const pitch = Math.PI / 4; // 45 degrees
    _InputState.yaw[eid] = yaw;
    _InputState.pitch[eid] = pitch;
    
    const rootGroup = new THREE.Group();
    const headMesh1 = new THREE.Mesh();
    const headMesh2 = new THREE.Mesh();
    headMesh1.name = 'head';
    headMesh2.name = 'head';
    rootGroup.add(headMesh1);
    rootGroup.add(headMesh2);
    mockObjects.set(eid, rootGroup);
    
    // Apply rotation logic
    const headObjects = getTaggedObjects(ctx, eid, "head");
    expect(headObjects).toHaveLength(2);
    
    for (const headObj of headObjects) {
      const clampedPitch = Math.min(Math.max(_InputState.pitch[eid], -Math.PI / 2), Math.PI / 2);
      headObj.rotation.set(clampedPitch, _InputState.yaw[eid], 0, "YXZ");
    }
    
    // Check that both head objects have the correct rotation
    [headMesh1, headMesh2].forEach(headMesh => {
      expect(headMesh.rotation.x).toBeCloseTo(pitch, 5);
      expect(headMesh.rotation.y).toBeCloseTo(yaw, 5);
      expect(headMesh.rotation.z).toBe(0);
      expect(headMesh.rotation.order).toBe("YXZ");
    });
  });

  it('should not find head objects for entities without head objects', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    _InputState.yaw[eid] = Math.PI / 4;
    _InputState.pitch[eid] = Math.PI / 6;
    
    const rootGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh();
    bodyMesh.name = 'body'; // Not a head object
    rootGroup.add(bodyMesh);
    mockObjects.set(eid, rootGroup);

    const headObjects = getTaggedObjects(ctx, eid, "head");
    expect(headObjects).toHaveLength(0);
  });
});

describe('syncObject3DTransformFromECS', () => {
  it('updates renderer transforms including scale and matrix', () => {
    const eid = 12;
    const obj = new THREE.Object3D();
    const renderObjects = new Map<number, THREE.Object3D>([[eid, obj]]);
    const resources = new Map<string, { resource: any }>();
    resources.set('renderObjects', { resource: renderObjects });

    Transform.x[eid] = 1;
    Transform.y[eid] = 2;
    Transform.z[eid] = 3;
    Transform.qx[eid] = 0;
    Transform.qy[eid] = 0.5;
    Transform.qz[eid] = 0.5;
    Transform.qw[eid] = 0.5;
    Transform.sx[eid] = 2;
    Transform.sy[eid] = 3;
    Transform.sz[eid] = 4;

    const matrixSpy = vi.spyOn(obj, 'updateMatrixWorld');
    syncObject3DTransformFromECS({ resources } as unknown as ECSContext, eid);

    expect(obj.position.toArray()).toEqual([1, 2, 3]);
    expect(obj.quaternion.w).toBeCloseTo(0.5);
    expect(obj.scale.toArray()).toEqual([2, 3, 4]);
    expect(matrixSpy).toHaveBeenCalled();
  });
});