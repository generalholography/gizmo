import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext, setResource } from '../../ecs';
import { getTaggedObjects } from '../../../modules/renderer';
import { buildMeshHierarchy } from '../../../utils/meshHierarchy';

describe('Body Root Tag', () => {
  let ctx: ECSContext;
  let mockObjects: Map<number, THREE.Object3D>;

  beforeEach(() => {
    ctx = createECS();
    mockObjects = new Map();
    setResource(ctx, 'renderObjects', mockObjects);
  });

  it('should find root-tagged object in body hierarchy', () => {
    const eid = 1;
    
    // Create a root group and set its name to "root" (simulating our fix)
    const rootGroup = new THREE.Group();
    rootGroup.name = "root";
    
    // Add some mock parts to the hierarchy
    const mockGeometry = new THREE.BufferGeometry();
    const mockMaterial = new THREE.MeshBasicMaterial();
    
    const mockParts = [
      {
        type: 'geometry',
        mesh: mockGeometry,
        material: mockMaterial,
        tag: 'body-part',
        ignoreCollisions: false,
        children: []
      }
    ];
    
    // Build the mesh hierarchy inside the root group
    buildMeshHierarchy(rootGroup, mockParts, { setMeshNames: true });
    
    // Add to render objects
    mockObjects.set(eid, rootGroup);

    // Get the root objects tagged as "root"
    const rootObjects = getTaggedObjects(ctx, eid, "root");
    
    // Should find exactly one root object
    expect(rootObjects).toHaveLength(1);
    expect(rootObjects[0]).toBeInstanceOf(THREE.Group);
    expect(rootObjects[0].name).toBe("root");
    expect(rootObjects[0]).toBe(rootGroup);
  });

  it('should allow targeting the root tag for animations', () => {
    const eid = 2;
    
    // Create a root group with "root" tag
    const rootGroup = new THREE.Group();
    rootGroup.name = "root";
    
    // Add multiple parts to verify the root encompasses everything
    const mockGeometry = new THREE.BufferGeometry();
    const mockMaterial = new THREE.MeshBasicMaterial();
    
    const mockParts = [
      {
        type: 'geometry',
        mesh: mockGeometry,
        material: mockMaterial,
        tag: 'part1',
        ignoreCollisions: false,
        children: []
      },
      {
        type: 'geometry',
        mesh: mockGeometry,
        material: mockMaterial,
        tag: 'part2',
        ignoreCollisions: false,
        children: []
      }
    ];
    
    buildMeshHierarchy(rootGroup, mockParts, { setMeshNames: true });
    mockObjects.set(eid, rootGroup);

    // Verify root object exists and encompasses all parts
    const rootObjects = getTaggedObjects(ctx, eid, "root");
    expect(rootObjects).toHaveLength(1);
    
    const foundRoot = rootObjects[0] as THREE.Group;
    
    // Verify that both parts are children of the root group
    const part1Objects = getTaggedObjects(ctx, eid, "part1");
    const part2Objects = getTaggedObjects(ctx, eid, "part2");
    
    expect(part1Objects).toHaveLength(1);
    expect(part2Objects).toHaveLength(1);
    
    // Verify the parts are descendants of the root group
    let foundPart1 = false;
    let foundPart2 = false;
    
    foundRoot.traverse((object) => {
      if (object.name === "part1") foundPart1 = true;
      if (object.name === "part2") foundPart2 = true;
    });
    
    expect(foundPart1).toBe(true);
    expect(foundPart2).toBe(true);
    
    // Simulate an animation targeting the root
    const initialPosition = foundRoot.position.clone();
    foundRoot.position.set(1, 2, 3);
    
    expect(foundRoot.position.x).toBe(1);
    expect(foundRoot.position.y).toBe(2);
    expect(foundRoot.position.z).toBe(3);
    expect(foundRoot.position).not.toEqual(initialPosition);
  });

  it('should not find root objects when no root tag is set', () => {
    const eid = 3;
    
    // Create a group without setting the "root" name
    const group = new THREE.Group();
    // Intentionally NOT setting group.name = "root"
    
    mockObjects.set(eid, group);

    // Should not find any root objects
    const rootObjects = getTaggedObjects(ctx, eid, "root");
    expect(rootObjects).toHaveLength(0);
  });
});
