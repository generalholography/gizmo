import * as THREE from "three";
import { Module } from "./Module";
import { ECSContext, getModule } from "../core/ecs";
import { MaterialDefinition as SchemaMaterialDefinition } from "../core/schema";
import { NoiseTextureModule } from "./3dNoiseTextures";

const marbleSeed = 0xABCDEF01;
const woodSeed = 0x12345678;

export type MaterialDefinition = {
  type: "solid" | "fieldColored" | "liquid" | "wireframe" | "marble" | "wood" | "image";
  params: Record<string, any>;
};

function createFallbackImageTexture(): THREE.DataTexture {
  const data = new Uint8Array([255, 255, 255, 255]);
  const texture = new THREE.DataTexture(data, 1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function resolveImageTextureSource(src: string): string {
  if (typeof window === 'undefined') return src;
  try {
    return new URL(src, window.location.href).toString();
  } catch {
    return src;
  }
}

function createImageTexture(src: string): THREE.Texture {
  if (!src) return createFallbackImageTexture();
  if (typeof document === 'undefined' && typeof Image === 'undefined') {
    const texture = createFallbackImageTexture();
    texture.name = src;
    return texture;
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load(resolveImageTextureSource(src));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export class MaterialModule extends Module<MaterialDefinition, THREE.Material> {
  constructor(ctx: ECSContext, factories: Record<string, (params: any) => THREE.Material>) {
    super(ctx, factories);
  }

  // Override resolve to pass context to material factories that need it
  resolve(def: string): number;
  resolve(def: MaterialDefinition): number;
  resolve(def: SchemaMaterialDefinition): number;
  resolve(def: string | MaterialDefinition | SchemaMaterialDefinition): number {
    if (typeof def === "string") {
      return super.resolve(def);
    }
    if ((def as MaterialDefinition).params !== undefined && typeof (def as MaterialDefinition).params === 'object') {
      return super.resolve(def as MaterialDefinition);
    }
    // Handle schema MaterialDefinition objects
    const schemaDef = def as SchemaMaterialDefinition;
    if (schemaDef.type === "none") {
      // Convert "none" type to solid with transparent material
      const materialDef: MaterialDefinition = {
        type: "solid",
        params: { opacity: 0, transparent: true },
      };
      return super.resolve(materialDef);
    }
    const materialDef: MaterialDefinition = {
      type: schemaDef.type as any,
      params: (schemaDef as any).params || {},
    };
    return super.resolve(materialDef);
  }
}

export const materialModule = (ctx: ECSContext) => new MaterialModule(ctx, {
  image: (params: any) => {
    const texture = createImageTexture(params?.src ?? '');
    const opacity = params?.opacity ?? 1;
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      side: params?.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      alphaTest: 0.01,
    });
    mat.name = params?.src ?? 'image';
    return mat;
  },
  solid: (params: any) => {
    const mat = new THREE.MeshStandardMaterial({
      color: params?.color ?? new THREE.Color().setHex(0xDDDDDD),
      metalness: params?.metalness ?? 0,
      roughness: params?.roughness ?? 1,
      opacity: params?.opacity ?? 1,
      transparent: params?.opacity !== undefined && params.opacity < 1,
      emissive: params?.emissive ?? 0x000000,
      emissiveIntensity: params?.emissiveIntensity ?? 1,
      flatShading: params?.flatShading ?? false,
    });
    // Inject a per-object zBump uniform to slightly offset depth and reduce z-fighting.
    // We keep materials shared and update the uniform per draw using object.onBeforeRender.
    mat.onBeforeCompile = (shader) => {
      // Expose shader for per-object updates and add custom uniform
      (mat as any).userData.shader = shader;
      shader.uniforms.zBump = { value: 0.0 };

      // Declare the uniform
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nuniform float zBump;'
      );

      // After the projection, nudge depth forward slightly
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n  gl_Position.z += zBump;'
      );
    };
    // Mark that this material supports zBump so systems can opt-in per object
    (mat as any).userData.supportsZBump = true;
    return mat;
  },
  wireframe: (params: any) => {
    const mat = new THREE.MeshBasicMaterial({
      color: params?.color ?? 0xffffff,
      opacity: params?.opacity ?? 1,
      transparent: params?.opacity !== undefined && params.opacity < 1,
      wireframe: true,
    });
    return mat;
  },
  liquid: (params: any) => {
    const baseColor = new THREE.Color(params?.baseColor ?? params?.color ?? 0x3366ff);
    const depthTint = new THREE.Color(
      params?.depthTint ?? baseColor.clone().multiplyScalar(0.5)
    );
    const uniforms = {
      baseColor: { value: baseColor },
      depthTint: { value: depthTint },
      depthScale: { value: params?.depthScale ?? 0.25 },
      opacity: { value: params?.opacity ?? 0.7 },
      waveFreq: { value: params?.waveFreq ?? 1 },
      waveAmp: { value: params?.waveAmp ?? 0.2 },
      waveSpeed: { value: params?.waveSpeed ?? 1 },
      time: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: `
        uniform float time;
        uniform float waveFreq;
        uniform float waveAmp;
        uniform float waveSpeed;
        varying float vDepth;
        void main() {
          vec3 pos = position;
          pos.y += sin(pos.x * waveFreq + time * waveSpeed) * waveAmp;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          vDepth = -mvPos.z;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 depthTint;
        uniform float depthScale;
        uniform float opacity;
        varying float vDepth;
        void main() {
          float t = clamp(vDepth * depthScale, 0.0, 1.0);
          vec3 col = mix(baseColor, depthTint, t);
          gl_FragColor = vec4(col, opacity);
        }
      `,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return mat;
  },
  marble: (params: any) => {    
    if (!ctx) {
      throw new Error("Marble material requires ECS context to be passed in params.__ctx");
    }
    
    const noiseTexModule = getModule<NoiseTextureModule>(ctx, "noiseTexture");
    if (!noiseTexModule) {
      throw new Error("NoiseTexture module not found");
    }
    
    // grainSize is in world space units
    const grainSize = params?.grainSize ?? 1.0;
    const textureSize = 64;
    
    const seed1 = marbleSeed;
    const seed2 = (marbleSeed + 1) >>> 0;
    
    // Fixed frequencies 8 and 16
    const tex1 = noiseTexModule.resolve({
      type: "perlin3d",
      params: { size: textureSize, frequency: 8, seed: seed1 }
    });
    const tex2 = noiseTexModule.resolve({
      type: "perlin3d",
      params: { size: textureSize, frequency: 16, seed: seed2 }
    });
    
    const uniforms = {
      uTex1: { value: noiseTexModule.get(tex1) },
      uTex2: { value: noiseTexModule.get(tex2) },
      uGrainSize: { value: grainSize },
      uColor: { value: new THREE.Color(params?.color ?? 0xffffff) },
      uGrainColor: { value: new THREE.Color(params?.grainColor ?? 0xcccccc) },
    };

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
    });

    mat.onBeforeCompile = (shader) => {
      // Add custom uniforms
      shader.uniforms.uTex1 = uniforms.uTex1;
      shader.uniforms.uTex2 = uniforms.uTex2;
      shader.uniforms.uGrainSize = uniforms.uGrainSize;
      shader.uniforms.uColor = uniforms.uColor;
      shader.uniforms.uGrainColor = uniforms.uGrainColor;

      // Declare uniforms in vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLocalPos;`
      );

      // Pass local position to fragment shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vLocalPos = position;`
      );

      // Declare uniforms and varyings in fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform sampler3D uTex1;
        uniform sampler3D uTex2;
        uniform float uGrainSize;
        uniform vec3 uColor;
        uniform vec3 uGrainColor;
        varying vec3 vLocalPos;`
      );

      // Apply marble pattern before output
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        // Sample 3D noise textures based on local position
        vec3 p = fract(vLocalPos / uGrainSize);
        float n1 = texture(uTex1, p).r;
        float n2 = texture(uTex2, p).r;
        
        // Combine octaves
        float n = clamp(n1 + (n2 - 0.5) * 0.5, 0.0, 1.0);
        
        // Create marble bands
        float bands = 0.5 + 0.5 * sin((vLocalPos.x + vLocalPos.y + vLocalPos.z) / uGrainSize + n * 6.28318);
        
        // Mix colors based on bands
        vec3 marbleColor = mix(uColor, uGrainColor, bands);
        
        // Apply marble color to diffuse color
        outgoingLight = outgoingLight * marbleColor;
        
        #include <opaque_fragment>`
      );
    };
    mat.needsUpdate = true;

    return mat;
  },
  wood: (params: any) => {
    if (!ctx) {
      throw new Error("Wood material requires ECS context to be passed in params.__ctx");
    }
    
    const noiseTexModule = ctx.modules.get("noiseTexture");
    if (!noiseTexModule) {
      throw new Error("NoiseTexture module not found");
    }
    
    // grainSize is in world space units
    const grainSize = params?.grainSize ?? 1.0;
    const textureSize = 64;
    
    // Grain direction vector (default: along Y axis)
    const grainDirection = params?.grainDirection ?? { x: 0, y: 1, z: 0 };
    const grainDir = new THREE.Vector3(grainDirection.x, grainDirection.y, grainDirection.z).normalize();
    
    // Generate a random seed or use provided one
    const seed1 = woodSeed;
    const seed2 = (woodSeed + 1) >>> 0;
    
    // Fixed frequencies 8 and 16
    const tex1 = noiseTexModule.resolve({
      type: "perlin3d",
      params: { size: textureSize, frequency: 8, seed: seed1 }
    });
    const tex2 = noiseTexModule.resolve({
      type: "perlin3d",
      params: { size: textureSize, frequency: 16, seed: seed2 }
    });
    
    const uniforms = {
      uTex1: { value: noiseTexModule.get(tex1) },
      uTex2: { value: noiseTexModule.get(tex2) },
      uGrainSize: { value: grainSize },
      uGrainDirection: { value: grainDir },
      uColor: { value: new THREE.Color(params?.color ?? 0x8B4513) },
      uGrainColor: { value: new THREE.Color(params?.grainColor ?? 0x654321) },
    };

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
    });

    mat.onBeforeCompile = (shader) => {
      // Add custom uniforms
      shader.uniforms.uTex1 = uniforms.uTex1;
      shader.uniforms.uTex2 = uniforms.uTex2;
      shader.uniforms.uGrainSize = uniforms.uGrainSize;
      shader.uniforms.uGrainDirection = uniforms.uGrainDirection;
      shader.uniforms.uColor = uniforms.uColor;
      shader.uniforms.uGrainColor = uniforms.uGrainColor;

      // Declare uniforms in vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLocalPos;`
      );

      // Pass local position to fragment shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vLocalPos = position;`
      );

      // Declare uniforms and varyings in fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform sampler3D uTex1;
        uniform sampler3D uTex2;
        uniform float uGrainSize;
        uniform vec3 uGrainDirection;
        uniform vec3 uColor;
        uniform vec3 uGrainColor;
        varying vec3 vLocalPos;`
      );

      // Apply wood pattern before output
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        // Sample 3D noise textures for distortion
        vec3 p = fract(vLocalPos / uGrainSize / 2.0);
        float n1 = texture(uTex1, p).r;
        float n2 = texture(uTex2, p).r;
        
        // Combine octaves for distortion
        float distortion = (n1 * 0.7 + n2 * 0.3 - 0.5) * 0.5;
        
        // Project position onto plane perpendicular to grain direction
        // to get the cross-section for wood rings
        vec3 crossVec = cross(uGrainDirection, vec3(1.0, 0.0, 0.0));
        vec3 perpAxis1 = normalize(crossVec);
        if (length(crossVec) < 0.1) {
          perpAxis1 = normalize(cross(uGrainDirection, vec3(0.0, 1.0, 0.0)));
        }
        vec3 perpAxis2 = normalize(cross(uGrainDirection, perpAxis1));
        
        float x = dot(vLocalPos, perpAxis1) / uGrainSize;
        float y = dot(vLocalPos, perpAxis2) / uGrainSize;
        
        // Create concentric rings with distortion
        float radius = sqrt(x * x + y * y) + distortion * 0.5;
        float rings = fract(radius * 3.0); // Control ring frequency
        
        // Create smoother transitions with smoothstep
        float woodPattern = smoothstep(0.3, 0.7, rings);
        
        // Mix colors based on wood pattern
        vec3 woodColor = mix(uGrainColor, uColor, woodPattern);
        
        // Add some variation along the grain direction
        float grainVariation = sin(dot(vLocalPos, uGrainDirection) / uGrainSize * 10.0 + distortion) * 0.1 + 0.9;
        woodColor *= grainVariation;
        
        // Apply wood color to diffuse color
        outgoingLight = outgoingLight * woodColor;
        
        #include <opaque_fragment>`
      );
    };

    return mat;
  }
});
