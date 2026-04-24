import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { disposeSceneRecursively } from '../sceneDisposal';

describe('Scene Disposal', () => {
  let scene: THREE.Scene;
  
  beforeEach(() => {
    scene = new THREE.Scene();
  });
  
  it('should dispose all geometries in scene', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    const disposeSpy = vi.spyOn(geometry, 'dispose');
    
    disposeSceneRecursively(scene);
    
    expect(disposeSpy).toHaveBeenCalled();
  });
  
  it('should dispose all materials in scene', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    const disposeSpy = vi.spyOn(material, 'dispose');
    
    disposeSceneRecursively(scene);
    
    expect(disposeSpy).toHaveBeenCalled();
  });
  
  it('should dispose all textures in materials', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    const texDisposeSpy = vi.spyOn(texture, 'dispose');
    
    disposeSceneRecursively(scene);
    
    expect(texDisposeSpy).toHaveBeenCalled();
  });
  
  it('should handle nested groups', () => {
    const group1 = new THREE.Group();
    const group2 = new THREE.Group();
    
    const geo1 = new THREE.BoxGeometry(1, 1, 1);
    const mat1 = new THREE.MeshBasicMaterial();
    const mesh1 = new THREE.Mesh(geo1, mat1);
    
    const geo2 = new THREE.SphereGeometry(1);
    const mat2 = new THREE.MeshBasicMaterial();
    const mesh2 = new THREE.Mesh(geo2, mat2);
    
    group1.add(mesh1);
    group2.add(mesh2);
    scene.add(group1);
    scene.add(group2);
    
    const geo1Spy = vi.spyOn(geo1, 'dispose');
    const geo2Spy = vi.spyOn(geo2, 'dispose');
    const mat1Spy = vi.spyOn(mat1, 'dispose');
    const mat2Spy = vi.spyOn(mat2, 'dispose');
    
    disposeSceneRecursively(scene);
    
    expect(geo1Spy).toHaveBeenCalled();
    expect(geo2Spy).toHaveBeenCalled();
    expect(mat1Spy).toHaveBeenCalled();
    expect(mat2Spy).toHaveBeenCalled();
  });
  
  it('should clear scene after disposal', () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    scene.add(mesh);
    
    expect(scene.children.length).toBe(1);
    
    disposeSceneRecursively(scene);
    
    expect(scene.children.length).toBe(0);
  });
  
  it('should handle array materials', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material1 = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, [material1, material2]);
    scene.add(mesh);
    
    const mat1Spy = vi.spyOn(material1, 'dispose');
    const mat2Spy = vi.spyOn(material2, 'dispose');
    
    disposeSceneRecursively(scene);
    
    expect(mat1Spy).toHaveBeenCalled();
    expect(mat2Spy).toHaveBeenCalled();
  });
  
  it('should handle groups as root object', () => {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    const geoSpy = vi.spyOn(geometry, 'dispose');
    const matSpy = vi.spyOn(material, 'dispose');
    
    expect(group.children.length).toBe(1);
    
    disposeSceneRecursively(group);
    
    expect(geoSpy).toHaveBeenCalled();
    expect(matSpy).toHaveBeenCalled();
    expect(group.children.length).toBe(0);
  });
  
  it('should handle scenes with lights', () => {
    const light = new THREE.PointLight(0xffffff, 1);
    scene.add(light);
    
    expect(scene.children.length).toBe(1);
    
    // Should not throw when disposing scenes with lights
    expect(() => disposeSceneRecursively(scene)).not.toThrow();
    
    expect(scene.children.length).toBe(0);
  });
  
  it('should handle empty scenes', () => {
    expect(scene.children.length).toBe(0);
    
    // Should not throw on empty scenes
    expect(() => disposeSceneRecursively(scene)).not.toThrow();
    
    expect(scene.children.length).toBe(0);
  });
  
  it('should handle multiple textures in material', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const diffuseTexture = new THREE.Texture();
    const normalTexture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ 
      map: diffuseTexture,
      normalMap: normalTexture
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    const diffuseSpy = vi.spyOn(diffuseTexture, 'dispose');
    const normalSpy = vi.spyOn(normalTexture, 'dispose');
    
    disposeSceneRecursively(scene);
    
    expect(diffuseSpy).toHaveBeenCalled();
    expect(normalSpy).toHaveBeenCalled();
  });
});
