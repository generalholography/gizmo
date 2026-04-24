import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMeshHierarchy } from '../../utils/meshHierarchy';
import * as THREE from 'three';

describe('Mesh hierarchy utility', () => {
  let group: THREE.Group;
  let mockParts: any[];
  
  beforeEach(() => {
    group = new THREE.Group();
    
    // Mock geometry and material objects
    const mockGeometry = new THREE.BufferGeometry();
    const mockMaterial = new THREE.MeshBasicMaterial();
    
    mockParts = [
      {
        type: 'geometry',
        mesh: mockGeometry,
        material: mockMaterial,
        tag: 'root-part',
        localTransform: new THREE.Matrix4().makeTranslation(1, 0, 0),
        children: [
          {
            type: 'geometry',
            mesh: mockGeometry,
            material: mockMaterial,
            tag: 'child-part',
            localTransform: new THREE.Matrix4().makeTranslation(0, 1, 0),
            children: []
          }
        ]
      }
    ];
  });
  
  it('should build mesh hierarchy without additional options', () => {
    buildMeshHierarchy(group, mockParts);
    
    expect(group.children).toHaveLength(1);
    const rootMesh = group.children[0] as THREE.Mesh;
    expect(rootMesh).toBeInstanceOf(THREE.Mesh);
    expect(rootMesh.name).toBe(''); // No name set by default
    
    // Check child
    expect(rootMesh.children).toHaveLength(1);
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    expect(childMesh).toBeInstanceOf(THREE.Mesh);
    expect(childMesh.name).toBe(''); // No name set by default
  });
  
  it('should set mesh names when setMeshNames option is true', () => {
    buildMeshHierarchy(group, mockParts, { setMeshNames: true });
    
    const rootMesh = group.children[0] as THREE.Mesh;
    expect(rootMesh.name).toBe('root-part');
    
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    expect(childMesh.name).toBe('child-part');
  });
  
  it('should store original materials when originalMaterialsMap is provided', () => {
    const originalMaterialsMap = new Map<number, THREE.Material>();
    
    buildMeshHierarchy(group, mockParts, { originalMaterialsMap });
    
    const rootMesh = group.children[0] as THREE.Mesh;
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    
    expect(originalMaterialsMap.has(rootMesh.id)).toBe(true);
    expect(originalMaterialsMap.has(childMesh.id)).toBe(true);
    expect(originalMaterialsMap.get(rootMesh.id)).toBe(mockParts[0].material);
    expect(originalMaterialsMap.get(childMesh.id)).toBe(mockParts[0].children[0].material);
  });
  
  it('should apply local transforms', () => {
    buildMeshHierarchy(group, mockParts);
    
    const rootMesh = group.children[0] as THREE.Mesh;
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    
    // Check that transforms were applied
    const rootPosition = new THREE.Vector3();
    rootMesh.matrix.decompose(rootPosition, new THREE.Quaternion(), new THREE.Vector3());
    expect(rootPosition.x).toBeCloseTo(1);
    expect(rootPosition.y).toBeCloseTo(0);
    expect(rootPosition.z).toBeCloseTo(0);
    
    const childPosition = new THREE.Vector3();
    childMesh.matrix.decompose(childPosition, new THREE.Quaternion(), new THREE.Vector3());
    expect(childPosition.x).toBeCloseTo(0);
    expect(childPosition.y).toBeCloseTo(1);
    expect(childPosition.z).toBeCloseTo(0);
  });
  
  it('should handle parts without children', () => {
    const partWithoutChildren = [{
      type: 'geometry',
      mesh: new THREE.BufferGeometry(),
      material: new THREE.MeshBasicMaterial(),
      tag: 'single-part'
    }];
    
    buildMeshHierarchy(group, partWithoutChildren, { setMeshNames: true });
    
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.name).toBe('single-part');
    expect(mesh.children).toHaveLength(0);
  });

  it('should set shadow properties based on options', () => {
    // Test with shadows enabled (default)
    buildMeshHierarchy(group, mockParts);
    
    const rootMesh = group.children[0] as THREE.Mesh;
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    
    expect(rootMesh.castShadow).toBe(true);
    expect(rootMesh.receiveShadow).toBe(true);
    expect(childMesh.castShadow).toBe(true);
    expect(childMesh.receiveShadow).toBe(true);
  });

  it('should disable shadows when castShadow and receiveShadow are false', () => {
    buildMeshHierarchy(group, mockParts, {
      castShadow: false,
      receiveShadow: false
    });
    
    const rootMesh = group.children[0] as THREE.Mesh;
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    
    expect(rootMesh.castShadow).toBe(false);
    expect(rootMesh.receiveShadow).toBe(false);
    expect(childMesh.castShadow).toBe(false);
    expect(childMesh.receiveShadow).toBe(false);
  });

  it('should handle mixed shadow settings', () => {
    buildMeshHierarchy(group, mockParts, {
      castShadow: true,
      receiveShadow: false
    });
    
    const rootMesh = group.children[0] as THREE.Mesh;
    const childMesh = rootMesh.children[0] as THREE.Mesh;
    
    expect(rootMesh.castShadow).toBe(true);
    expect(rootMesh.receiveShadow).toBe(false);
    expect(childMesh.castShadow).toBe(true);
    expect(childMesh.receiveShadow).toBe(false);
  });
});
