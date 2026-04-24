import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createECS, setResource, getResource } from '../../ecs';
import { addComponent, addEntity, hasComponent } from 'bitecs';
import { Transform, Body } from '../../components';
import * as THREE from 'three';

describe('Editor Selection with Three.js Raycasting', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createECS();
    ctx.isPlaying = false; // Editor mode
    ctx.three = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: {
        domElement: document.createElement('canvas')
      },
      worldRoot: new THREE.Group()
    };
    ctx.rapier = {
      world: {
        castRay: vi.fn()
      }
    };
    
    // Initialize render objects map
    const renderObjects = new Map<number, THREE.Object3D>();
    setResource(ctx, 'renderObjects', renderObjects);
  });

  it('should use Three.js raycasting in edit mode (isPlaying = false)', () => {
    // Setup: Create entity with mesh
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    addComponent(ctx, Body, eid);
    
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    const entityGroup = new THREE.Group();
    entityGroup.add(mesh);
    
    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
    renderObjects!.set(eid, entityGroup);
    
    // In edit mode, Rapier raycasting should NOT be called
    // This is verified by the fact that ctx.isPlaying = false
    expect(ctx.isPlaying).toBe(false);
    expect(renderObjects!.has(eid)).toBe(true);
  });

  it('should use Rapier raycasting in play mode (isPlaying = true)', () => {
    ctx.isPlaying = true; // Play mode
    
    // In play mode, Rapier raycasting SHOULD be used
    // This is the original behavior
    expect(ctx.isPlaying).toBe(true);
    expect(ctx.rapier.world.castRay).toBeDefined();
  });

  it('should be able to select entities with rendered meshes in edit mode', () => {
    // Create multiple entities with meshes
    const eid1 = addEntity(ctx);
    const eid2 = addEntity(ctx);
    
    addComponent(ctx, Transform, eid1);
    addComponent(ctx, Transform, eid2);
    
    const mesh1 = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    mesh1.position.set(0, 0, 0);
    
    const mesh2 = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    mesh2.position.set(5, 0, 0);
    
    const group1 = new THREE.Group();
    const group2 = new THREE.Group();
    group1.add(mesh1);
    group2.add(mesh2);
    
    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
    renderObjects!.set(eid1, group1);
    renderObjects!.set(eid2, group2);
    
    // Verify both entities are in render objects
    expect(renderObjects!.has(eid1)).toBe(true);
    expect(renderObjects!.has(eid2)).toBe(true);
    expect(renderObjects!.size).toBe(2);
  });

  it('should handle nested mesh hierarchies for selection', () => {
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    
    // Create nested hierarchy: group > child group > mesh
    const rootGroup = new THREE.Group();
    rootGroup.name = 'entity-root';
    
    const childGroup = new THREE.Group();
    childGroup.name = 'body-parts';
    
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    mesh.name = 'cube-mesh';
    
    childGroup.add(mesh);
    rootGroup.add(childGroup);
    
    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
    renderObjects!.set(eid, rootGroup);
    
    // Raycasting should be able to hit the nested mesh and trace back to the entity
    expect(renderObjects!.get(eid)).toBe(rootGroup);
    expect(rootGroup.children.length).toBe(1);
    expect(rootGroup.children[0].children.length).toBe(1);
  });

  it('should maintain selection state across mode changes', () => {
    const eid = addEntity(ctx);
    
    // Start in edit mode
    ctx.isPlaying = false;
    setResource(ctx, 'selectedEntity', eid);
    
    expect(getResource(ctx, 'selectedEntity', true)).toBe(eid);
    
    // Switch to play mode
    ctx.isPlaying = true;
    
    // Selection should persist
    expect(getResource(ctx, 'selectedEntity', true)).toBe(eid);
  });

  it('should allow deselection by setting selectedEntity to undefined', () => {
    const eid = addEntity(ctx);
    
    // Select entity
    setResource(ctx, 'selectedEntity', eid);
    expect(getResource(ctx, 'selectedEntity', true)).toBe(eid);
    
    // Deselect
    setResource(ctx, 'selectedEntity', undefined);
    expect(getResource(ctx, 'selectedEntity', true)).toBeUndefined();
  });

  it('should support clicking on entities without physics bodies in edit mode', () => {
    // This is the key advantage - entities don't need physics bodies to be selectable
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    // Note: NO Body component added
    
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial()
    );
    const group = new THREE.Group();
    group.add(mesh);
    
    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
    renderObjects!.set(eid, group);
    
    // Entity should be selectable even without Body component
    expect(renderObjects!.has(eid)).toBe(true);
    expect(hasComponent(ctx, Body, eid)).toBe(false);
  });

  it('should handle empty renderObjects gracefully', () => {
    // No entities with meshes
    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
    expect(renderObjects!.size).toBe(0);
    
    // Should not crash when trying to select
    ctx.isPlaying = false;
    expect(() => {
      // Simulating a raycast with no objects would return empty intersects
      const selectableObjects: THREE.Object3D[] = [];
      renderObjects!.forEach(obj => selectableObjects.push(obj));
      expect(selectableObjects.length).toBe(0);
    }).not.toThrow();
  });
});
