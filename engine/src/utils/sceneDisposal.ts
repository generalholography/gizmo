import * as THREE from 'three';

/**
 * Recursively dispose all THREE.js resources in a scene
 * This prevents memory leaks by properly disposing geometries, materials, and textures
 */
export function disposeSceneRecursively(scene: THREE.Scene | THREE.Group | THREE.Object3D): void {
  console.log('[SCENE] Starting recursive disposal...');
  
  let geometryCount = 0;
  let materialCount = 0;
  let textureCount = 0;
  
  scene.traverse((object) => {
    // Dispose geometry
    if ((object as THREE.Mesh).geometry) {
      const geometry = (object as THREE.Mesh).geometry;
      geometry.dispose();
      geometryCount++;
    }
    
    // Dispose material(s) and textures
    if ((object as THREE.Mesh).material) {
      const materials = Array.isArray((object as THREE.Mesh).material)
        ? (object as THREE.Mesh).material as THREE.Material[]
        : [(object as THREE.Mesh).material as THREE.Material];
      
      materials.forEach(material => {
        // Dispose textures in material
        Object.keys(material).forEach(key => {
          const value = (material as any)[key];
          if (value && value.isTexture) {
            value.dispose();
            textureCount++;
          }
        });
        
        // Dispose material
        material.dispose();
        materialCount++;
      });
    }
    
    // Dispose render targets
    if ((object as any).isWebGLRenderTarget) {
      (object as any).dispose();
    }
  });
  
  console.log(`[SCENE] Disposed: ${geometryCount} geometries, ${materialCount} materials, ${textureCount} textures`);
  
  // Clear scene after disposing
  if (scene instanceof THREE.Scene) {
    scene.clear();
  } else {
    // For groups, remove all children
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
  }
  console.log('[SCENE] Scene cleared');
}
