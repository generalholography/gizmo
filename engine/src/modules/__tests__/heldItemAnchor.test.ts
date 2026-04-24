import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { addComponent, addEntity } from 'bitecs';
import { createECS, ECSContext, setResource } from '../../core/ecs';
import { getHeldItemTransform } from '../renderer';
import { _InputState } from '../../core/components/_InputState';

describe('getHeldItemTransform - heldItemAnchor functionality', () => {
  let ctx: ECSContext;
  let mockObjects: Map<number, THREE.Object3D>;

  beforeEach(() => {
    ctx = createECS();
    mockObjects = new Map();
    setResource(ctx, 'renderObjects', mockObjects);
  });

  it('should use heldItemAnchor when available', () => {
    const eid = addEntity(ctx);
    
    // Create a hierarchy with heldItemAnchor
    const rootGroup = new THREE.Group();
    const heldItemAnchor = new THREE.Mesh();
    heldItemAnchor.name = 'heldItemAnchor';
    
    // Position and rotate the anchor
    heldItemAnchor.position.set(1, 2, 3);
    heldItemAnchor.rotation.set(0.1, 0.2, 0.3);
    rootGroup.add(heldItemAnchor);
    mockObjects.set(eid, rootGroup);
    
    const result = getHeldItemTransform(ctx, eid);
    
    expect(result).not.toBeNull();
    if (result) {
      const worldPosition = heldItemAnchor.getWorldPosition(new THREE.Vector3());
      const worldQuaternion = heldItemAnchor.getWorldQuaternion(new THREE.Quaternion());
      
      expect(result.x).toBeCloseTo(worldPosition.x, 5);
      expect(result.y).toBeCloseTo(worldPosition.y, 5);
      expect(result.z).toBeCloseTo(worldPosition.z, 5);
      expect(result.qx).toBeCloseTo(worldQuaternion.x, 5);
      expect(result.qy).toBeCloseTo(worldQuaternion.y, 5);
      expect(result.qz).toBeCloseTo(worldQuaternion.z, 5);
      expect(result.qw).toBeCloseTo(worldQuaternion.w, 5);
    }
  });

  it('should prioritize heldItemAnchor over fallback logic', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    // Set InputState values that would be used in fallback
    _InputState.yaw[eid] = Math.PI / 4;
    _InputState.pitch[eid] = Math.PI / 6;
    
    // Create both heldItemAnchor and head objects
    const rootGroup = new THREE.Group();
    const heldItemAnchor = new THREE.Mesh();
    const headMesh = new THREE.Mesh();
    
    heldItemAnchor.name = 'heldItemAnchor';
    headMesh.name = 'head';
    
    // Position them differently
    heldItemAnchor.position.set(10, 20, 30);
    headMesh.position.set(1, 2, 3);
    
    rootGroup.add(heldItemAnchor);
    rootGroup.add(headMesh);
    mockObjects.set(eid, rootGroup);
    
    const result = getHeldItemTransform(ctx, eid);
    
    expect(result).not.toBeNull();
    if (result) {
      // Should use heldItemAnchor position, not head position or computed position
      const anchorWorldPosition = heldItemAnchor.getWorldPosition(new THREE.Vector3());
      expect(result.x).toBeCloseTo(anchorWorldPosition.x, 5);
      expect(result.y).toBeCloseTo(anchorWorldPosition.y, 5);
      expect(result.z).toBeCloseTo(anchorWorldPosition.z, 5);
    }
  });

  it('should handle multiple heldItemAnchor objects by using the first one', () => {
    const eid = addEntity(ctx);
    
    const rootGroup = new THREE.Group();
    const anchor1 = new THREE.Mesh();
    const anchor2 = new THREE.Mesh();
    
    anchor1.name = 'heldItemAnchor';
    anchor2.name = 'heldItemAnchor';
    
    anchor1.position.set(1, 1, 1);
    anchor2.position.set(2, 2, 2);
    
    // Add them in order
    rootGroup.add(anchor1);
    rootGroup.add(anchor2);
    mockObjects.set(eid, rootGroup);
    
    const result = getHeldItemTransform(ctx, eid);
    
    expect(result).not.toBeNull();
    if (result) {
      // Should use the first anchor's position
      const anchor1WorldPosition = anchor1.getWorldPosition(new THREE.Vector3());
      expect(result.x).toBeCloseTo(anchor1WorldPosition.x, 5);
      expect(result.y).toBeCloseTo(anchor1WorldPosition.y, 5);
      expect(result.z).toBeCloseTo(anchor1WorldPosition.z, 5);
    }
  });

  it('should fall back to existing logic when no heldItemAnchor is present', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, _InputState, eid);
    
    // Set InputState values
    _InputState.yaw[eid] = 0;
    _InputState.pitch[eid] = 0;
    
    // Create only head object, no heldItemAnchor
    const rootGroup = new THREE.Group();
    const headMesh = new THREE.Mesh();
    headMesh.name = 'head';
    headMesh.position.set(0, 0, 0);
    rootGroup.add(headMesh);
    mockObjects.set(eid, rootGroup);
    
    const result = getHeldItemTransform(ctx, eid);
    
    expect(result).not.toBeNull();
    // This should use the fallback logic which computes position based on spawn transform and input state
    // We don't test the exact values here since that's the existing logic, 
    // but we verify it doesn't crash and returns a valid result
    if (result) {
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(typeof result.z).toBe('number');
      expect(typeof result.qx).toBe('number');
      expect(typeof result.qy).toBe('number');
      expect(typeof result.qz).toBe('number');
      expect(typeof result.qw).toBe('number');
    }
  });
});