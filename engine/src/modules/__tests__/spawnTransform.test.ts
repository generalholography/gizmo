import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext, setResource } from '../../core/ecs';
import { getSpawnTransform } from '../renderer';
import { addComponent, addEntity } from 'bitecs';
import { Transform, _InputState } from '../../core/components';

describe('getSpawnTransform with .name tags', () => {
  let ctx: ECSContext;
  let mockObjects: Map<number, THREE.Object3D>;

  beforeEach(() => {
    ctx = createECS();
    mockObjects = new Map();
    setResource(ctx, 'renderObjects', mockObjects);
  });

  it('should get spawn transform from head tagged object', () => {
    // Create entity properly in the ECS world
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    Transform.x[eid] = 10;
    Transform.y[eid] = 5;
    Transform.z[eid] = 0;

    // Create head object
    const rootGroup = new THREE.Group();
    const headMesh = new THREE.Mesh();
    headMesh.name = 'head';
    headMesh.position.set(10, 5, 0); // Position the head
    rootGroup.add(headMesh);
    mockObjects.set(eid, rootGroup);

    const spawnTransform = getSpawnTransform(ctx, eid);
    
    // Should use head position + forward offset
    expect(spawnTransform.position.x).toBeCloseTo(10, 1);
    expect(spawnTransform.position.y).toBeCloseTo(5, 1);
    expect(spawnTransform.position.z).toBeCloseTo(-1, 1); // Forward vector applied
  });

  it('should fallback to Transform component when no head tag found', () => {
    // Create entity properly in the ECS world
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    Transform.x[eid] = 20;
    Transform.y[eid] = 10;
    Transform.z[eid] = 5;

    // Create object without head tag
    const rootGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh();
    bodyMesh.name = 'body'; // Not a head tag
    rootGroup.add(bodyMesh);
    mockObjects.set(eid, rootGroup);

    const spawnTransform = getSpawnTransform(ctx, eid);
    
    // Should fallback to Transform component position
    expect(spawnTransform.position.x).toBe(20);
    expect(spawnTransform.position.y).toBe(10);
    expect(spawnTransform.position.z).toBe(5);
  });

  it('should use Transform position with InputState rotation when no head tag', () => {
    // Create entity with Transform and InputState components
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    addComponent(ctx, _InputState, eid);
    
    // Set Transform position
    Transform.x[eid] = 15;
    Transform.y[eid] = 8;
    Transform.z[eid] = 3;
    
    // Set InputState rotation (yaw = 90 degrees, pitch = 30 degrees)
    _InputState.yaw[eid] = Math.PI / 2; // 90 degrees
    _InputState.pitch[eid] = Math.PI / 6; // 30 degrees
    
    // Create object without head tag
    const rootGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh();
    bodyMesh.name = 'body'; // Not a head tag
    rootGroup.add(bodyMesh);
    mockObjects.set(eid, rootGroup);

    const spawnTransform = getSpawnTransform(ctx, eid);
    
    // Should use Transform position
    expect(spawnTransform.position.x).toBe(15);
    expect(spawnTransform.position.y).toBe(8);
    expect(spawnTransform.position.z).toBe(3);
    
    // Should create rotation from InputState yaw/pitch
    const expectedQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 6, Math.PI / 2, 0, 'YXZ'));
    expect(spawnTransform.rotation.x).toBeCloseTo(expectedQuaternion.x, 5);
    expect(spawnTransform.rotation.y).toBeCloseTo(expectedQuaternion.y, 5);
    expect(spawnTransform.rotation.z).toBeCloseTo(expectedQuaternion.z, 5);
    expect(spawnTransform.rotation.w).toBeCloseTo(expectedQuaternion.w, 5);
  });

  it('should use Transform position and rotation when no head tag and no InputState', () => {
    // Create entity with only Transform component
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    
    // Set Transform position and rotation
    Transform.x[eid] = 12;
    Transform.y[eid] = 7;
    Transform.z[eid] = 4;
    
    // Set Transform rotation (quaternion for 45 degree rotation around Y axis)
    const rotationQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
    Transform.qx[eid] = rotationQuaternion.x;
    Transform.qy[eid] = rotationQuaternion.y;
    Transform.qz[eid] = rotationQuaternion.z;
    Transform.qw[eid] = rotationQuaternion.w;
    
    // Create object without head tag and no InputState
    const rootGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh();
    bodyMesh.name = 'body'; // Not a head tag
    rootGroup.add(bodyMesh);
    mockObjects.set(eid, rootGroup);

    const spawnTransform = getSpawnTransform(ctx, eid);
    
    // Should use Transform position
    expect(spawnTransform.position.x).toBe(12);
    expect(spawnTransform.position.y).toBe(7);
    expect(spawnTransform.position.z).toBe(4);
    
    // Should use Transform rotation
    expect(spawnTransform.rotation.x).toBeCloseTo(rotationQuaternion.x, 5);
    expect(spawnTransform.rotation.y).toBeCloseTo(rotationQuaternion.y, 5);
    expect(spawnTransform.rotation.z).toBeCloseTo(rotationQuaternion.z, 5);
    expect(spawnTransform.rotation.w).toBeCloseTo(rotationQuaternion.w, 5);
  });

  it('should return default transform when no entity found', () => {
    const spawnTransform = getSpawnTransform(ctx, 999);
    
    // Should return origin
    expect(spawnTransform.position.x).toBe(0);
    expect(spawnTransform.position.y).toBe(0);
    expect(spawnTransform.position.z).toBe(0);
  });
});