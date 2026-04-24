import { EditorCommand } from '../CommandManager';
import { ECSContext, getResource, setResource } from '../../ecs';
import { WorldDefinition, ensureCompleteSkyConfig } from '../../worldSchema';
import { initialize } from '../../initializeWorld';
import { serializeWorld } from '../../serializeWorld';
import { WorldMetadata } from '../../schema';
import type { SkyboxObjects } from '../../..';
import * as THREE from 'three';
import { timeToSunDirection } from '../../../utils/math';

export class ReinitializeWorldCommand implements EditorCommand {
  description: string;
  private previousDefinition: WorldDefinition;

  constructor(private ctx: ECSContext, private newDefinition: WorldDefinition) {
    this.description = 'Reinitialize World';
    this.previousDefinition = serializeWorld(ctx, {
      includeEntities: false,
      includeRuntime: true,
    });
  }

  execute(): void {
    this.applyDefinition(this.newDefinition);
  }

  undo(): void {
    this.applyDefinition(this.previousDefinition);
  }

  redo(): void {
    this.execute();
  }

  private applyDefinition(definition: WorldDefinition): void {
    const { entities: _entities, modules: _modules, ...sanitized } = definition;

    initialize(this.ctx, sanitized, {
      merge: true,
      spawnEntities: false,
    });

    this.updateWorldVisuals();
  }

  private updateWorldVisuals(): void {
    const metadata = getResource<WorldMetadata>(this.ctx, 'metadata', true);
    if (!metadata || !metadata.dimensions || metadata.dimensions.length === 0) return;

    const baseDimension = metadata.dimensions.find(dim => dim.name === 'base') ?? metadata.dimensions[0];
    if (!baseDimension) return;

    // Ensure complete sky configuration
    baseDimension.sky = ensureCompleteSkyConfig(baseDimension.sky);

    const skybox = getResource<SkyboxObjects>(this.ctx, 'skybox', true);
    const renderer = this.ctx.three?.renderer;
    const skyColor = new THREE.Color(baseDimension.sky.color as any);

    if (renderer) {
      renderer.setClearColor(skyColor);
    }

    if (skybox) {
      const material = skybox.skybox.material;
      if (material instanceof THREE.ShaderMaterial) {
        material.uniforms.topColor.value = skyColor;
        material.uniforms.bottomColor.value = skyColor.clone().multiplyScalar(0.6);

        if (baseDimension.sky.clouds) {
          material.uniforms.cloudsColor.value = new THREE.Color(baseDimension.sky.clouds.color as any);
          material.uniforms.cloudsCoverage.value = baseDimension.sky.clouds.coverage ?? 0;
        } else if (material.uniforms.cloudsCoverage) {
          material.uniforms.cloudsCoverage.value = 0;
        }

        if (baseDimension.sky.stars) {
          material.uniforms.starsIntensity.value = baseDimension.sky.stars.intensity ?? 0;
        } else if (material.uniforms.starsIntensity) {
          material.uniforms.starsIntensity.value = 0;
        }
      }

      if (skybox.ambientLight) {
        skybox.ambientLight.color.copy(skyColor.clone().lerp(new THREE.Color(0xffffff), 0.5));
      }

      if (skybox.directionalLight) {
        const sunData = baseDimension.sky.sun;
        if (sunData) {
          skybox.directionalLight.color.copy(new THREE.Color(sunData.color as any));
          skybox.directionalLight.intensity = sunData.intensity * 0.8;
        } else {
          skybox.directionalLight.intensity = 0;
        }
      }
    }

    if (baseDimension.sky.sun) {
      setResource(this.ctx, 'timeOfDay', baseDimension.sky.sun.timeOfDay);

      const skyboxObjects = getResource<SkyboxObjects>(this.ctx, 'skybox', true);
      if (skyboxObjects && skyboxObjects.skybox.material instanceof THREE.ShaderMaterial) {
        skyboxObjects.skybox.material.uniforms.sunDirection.value = timeToSunDirection(baseDimension.sky.sun.timeOfDay);
        skyboxObjects.skybox.material.uniforms.sunColor.value = new THREE.Color(baseDimension.sky.sun.color as any);
        skyboxObjects.skybox.material.uniforms.sunIntensity.value = baseDimension.sky.sun.intensity;
      }
    }

    if (this.ctx.rapier?.world && 'gravity' in this.ctx.rapier.world) {
      (this.ctx.rapier.world as any).gravity = { x: 0, y: baseDimension.gravity, z: 0 };
    }
  }
}
