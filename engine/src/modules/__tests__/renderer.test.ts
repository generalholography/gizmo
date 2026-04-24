import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, ECSContext, setResource } from '../../core/ecs';
import { getTaggedObjects } from '../renderer';

describe('Tag functionality with .name', () => {
  let ctx: ECSContext;
  let mockObjects: Map<number, THREE.Object3D>;

  beforeEach(() => {
    ctx = createECS();
    mockObjects = new Map();
    setResource(ctx, 'renderObjects', mockObjects);
  });

  it('should find objects with specified tags using .name', () => {
    // Create a test hierarchy
    const rootGroup = new THREE.Group();
    const headMesh = new THREE.Mesh();
    const bodyMesh = new THREE.Mesh();
    const spawnAnchorMesh = new THREE.Mesh();

    // Set tags using .name
    headMesh.name = 'head';
    bodyMesh.name = 'body';
    spawnAnchorMesh.name = 'spawnAnchor';

    // Build hierarchy
    rootGroup.add(headMesh);
    rootGroup.add(bodyMesh);
    bodyMesh.add(spawnAnchorMesh);

    // Register with mock eid
    const testEid = 123;
    mockObjects.set(testEid, rootGroup);

    // Test finding head objects
    const headObjects = getTaggedObjects(ctx, testEid, 'head');
    expect(headObjects).toHaveLength(1);
    expect(headObjects[0]).toBe(headMesh);

    // Test finding spawn anchor objects  
    const spawnAnchorObjects = getTaggedObjects(ctx, testEid, 'spawnAnchor');
    expect(spawnAnchorObjects).toHaveLength(1);
    expect(spawnAnchorObjects[0]).toBe(spawnAnchorMesh);

    // Test finding non-existent tag
    const nonExistentObjects = getTaggedObjects(ctx, testEid, 'nonexistent' as any);
    expect(nonExistentObjects).toHaveLength(0);
  });

  it('should return empty array for non-existent entity', () => {
    const objects = getTaggedObjects(ctx, 999, 'head');
    expect(objects).toHaveLength(0);
  });

  it('should find multiple objects with same tag', () => {
    const rootGroup = new THREE.Group();
    const mesh1 = new THREE.Mesh();
    const mesh2 = new THREE.Mesh();

    // Both have same tag using .name
    mesh1.name = 'head';
    mesh2.name = 'head';

    rootGroup.add(mesh1);
    rootGroup.add(mesh2);

    const testEid = 456;
    mockObjects.set(testEid, rootGroup);

    const headObjects = getTaggedObjects(ctx, testEid, 'head');
    expect(headObjects).toHaveLength(2);
    expect(headObjects).toContain(mesh1);
    expect(headObjects).toContain(mesh2);
  });
});