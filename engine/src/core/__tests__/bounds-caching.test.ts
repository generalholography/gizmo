import { describe, it, expect } from 'vitest';
import { calculateLocalBodyBounds } from '../../utils/geometry';
import * as THREE from 'three';

describe('Bounds Caching Utility Functions', () => {
  it('should calculate local bounds correctly', () => {
    // Create a mock part with geometry
    const mockGeometry = new THREE.BoxGeometry(2, 3, 1);
    mockGeometry.computeBoundingBox();
    
    const mockMaterial = new THREE.MeshBasicMaterial();
    
    const parts = [{
      type: 'geometry',
      mesh: mockGeometry,
      material: mockMaterial,
      ignoreCollisions: false
    }];
    
    const bounds = calculateLocalBodyBounds(parts);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    
    // Box geometry should have the expected dimensions
    expect(size.x).toBeCloseTo(2, 1);
    expect(size.y).toBeCloseTo(3, 1);
    expect(size.z).toBeCloseTo(1, 1);
  });

  it('should handle empty parts array', () => {
    const bounds = calculateLocalBodyBounds([]);
    expect(bounds.isEmpty()).toBe(true);
  });

  it('should apply local transforms to bounds', () => {
    const mockGeometry = new THREE.BoxGeometry(1, 1, 1);
    mockGeometry.computeBoundingBox();
    
    const mockMaterial = new THREE.MeshBasicMaterial();
    
    // Create a transform that scales by 2
    const scaleTransform = new THREE.Matrix4().makeScale(2, 2, 2);
    
    const parts = [{
      type: 'geometry',
      mesh: mockGeometry,
      material: mockMaterial,
      localTransform: scaleTransform,
      ignoreCollisions: false
    }];
    
    const bounds = calculateLocalBodyBounds(parts);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    
    // Bounds should be scaled by the transform
    expect(size.x).toBeCloseTo(2, 1);
    expect(size.y).toBeCloseTo(2, 1);
    expect(size.z).toBeCloseTo(2, 1);
  });
});
