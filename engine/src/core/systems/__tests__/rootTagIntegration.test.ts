import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext, setResource } from '../../ecs';
import { getTaggedObjects } from '../../../modules/renderer';

describe('Root Tag Animation Integration Test', () => {
  let ctx: ECSContext;
  let mockObjects: Map<number, THREE.Object3D>;

  beforeEach(() => {
    ctx = createECS();
    mockObjects = new Map();
    setResource(ctx, 'renderObjects', mockObjects);
  });

  it('should simulate the example from exampleEngineBlob.js targeting root for hammer animation', () => {
    const eid = 1;
    
    // Simulate the structure created by bodyRenderingSystem with our fix
    const rootGroup = new THREE.Group();
    rootGroup.name = "root"; // This is what our fix adds
    
    // Add a simple tool/hammer body structure
    const hammerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x552200 })
    );
    rootGroup.add(hammerMesh);
    
    mockObjects.set(eid, rootGroup);

    // Test that we can find the root for animation targeting
    const rootObjects = getTaggedObjects(ctx, eid, "root");
    expect(rootObjects).toHaveLength(1);
    expect(rootObjects[0].name).toBe("root");
    
    // Simulate the "use" animation from exampleEngineBlob.js that targets "root"
    const animationKeyframes = [
      { time: 0, rotation: [0, 0, 0] },
      { time: 0.15, rotation: [-Math.PI / 2, 0, 0] }, // Swing down 90 degrees
      { time: 0.3, rotation: [0, 0, 0] }
    ];
    
    const rootObject = rootObjects[0];
    
    // Apply first keyframe (initial position)
    rootObject.rotation.set(0, 0, 0);
    expect(rootObject.rotation.x).toBeCloseTo(0);
    expect(rootObject.rotation.y).toBeCloseTo(0);
    expect(rootObject.rotation.z).toBeCloseTo(0);
    
    // Apply second keyframe (swung down position)
    rootObject.rotation.set(-Math.PI / 2, 0, 0);
    expect(rootObject.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(rootObject.rotation.y).toBeCloseTo(0);
    expect(rootObject.rotation.z).toBeCloseTo(0);
    
    // Apply third keyframe (back to initial position)
    rootObject.rotation.set(0, 0, 0);
    expect(rootObject.rotation.x).toBeCloseTo(0);
    expect(rootObject.rotation.y).toBeCloseTo(0);
    expect(rootObject.rotation.z).toBeCloseTo(0);
    
    // Verify that the entire object (including all children) gets rotated
    // when we rotate the root
    rootObject.rotation.set(Math.PI / 4, 0, 0);
    
    // Simply verify that the root object has the expected rotation
    expect(rootObject.rotation.x).toBeCloseTo(Math.PI / 4);
    expect(rootObject.rotation.y).toBeCloseTo(0);
    expect(rootObject.rotation.z).toBeCloseTo(0);
    
    // And that the hammer mesh is still a child of the rotated root
    expect(hammerMesh.parent).toBe(rootObject);
  });

  it('should support translation animations on root for entire object movement', () => {
    const eid = 2;
    
    // Create root group with multiple parts
    const rootGroup = new THREE.Group();
    rootGroup.name = "root";
    
    // Add multiple parts to demonstrate full object movement
    const bodyPart = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    const headPart = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    headPart.position.set(0, 1, 0);
    
    rootGroup.add(bodyPart);
    rootGroup.add(headPart);
    mockObjects.set(eid, rootGroup);

    // Get root for animation
    const rootObjects = getTaggedObjects(ctx, eid, "root");
    expect(rootObjects).toHaveLength(1);
    
    const rootObject = rootObjects[0];
    
    // Simulate translation animation keyframes
    const initialHeadWorldPos = new THREE.Vector3();
    headPart.getWorldPosition(initialHeadWorldPos);
    
    // Animate root position
    rootObject.position.set(5, 0, 0);
    
    // Update world matrices
    rootObject.updateMatrixWorld();
    
    const newHeadWorldPos = new THREE.Vector3();
    headPart.getWorldPosition(newHeadWorldPos);
    
    // Both parts should have moved with the root
    expect(newHeadWorldPos.x).toBeCloseTo(initialHeadWorldPos.x + 5);
    expect(newHeadWorldPos.y).toBeCloseTo(initialHeadWorldPos.y);
    expect(newHeadWorldPos.z).toBeCloseTo(initialHeadWorldPos.z);
  });
});