import { defineQuery, enterQuery, exitQuery } from "bitecs";
import * as THREE from "three";
import { ECSContext, getResource, setResource } from "../ecs";
import { ParticleEmitter } from "../components/ParticleEmitter";
import { Transform } from "../components/Transform";
import { ParticleShapeType, readParticleEmitterConfig } from "../particles";

const particleQuery = defineQuery([ParticleEmitter, Transform]);
const particleEnter = enterQuery(particleQuery);
const particleExit = exitQuery(particleQuery);

const HIDDEN_POSITION = 1e9;

type ParticleRuntime = {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  positions: Float32Array;
  velocities: Float32Array;
  ages: Float32Array;
  lifetimes: Float32Array;
  maxParticles: number;
  spawnAccumulator: number;
  burstPending: number;
  emitterAge: number;
  size: number;
  opacity: number;
  color: THREE.Color;
  localSpace: boolean;
};

function createParticleRuntime(config: ReturnType<typeof readParticleEmitterConfig>): ParticleRuntime {
  const positions = new Float32Array(config.maxParticles * 3);
  const velocities = new Float32Array(config.maxParticles * 3);
  const ages = new Float32Array(config.maxParticles);
  const lifetimes = new Float32Array(config.maxParticles);

  for (let i = 0; i < config.maxParticles; i++) {
    positions[i * 3] = HIDDEN_POSITION;
    positions[i * 3 + 1] = HIDDEN_POSITION;
    positions[i * 3 + 2] = HIDDEN_POSITION;
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;
    ages[i] = -1;
    lifetimes[i] = config.lifetime;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: config.size,
    color: config.color,
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    geometry,
    material,
    positions,
    velocities,
    ages,
    lifetimes,
    maxParticles: config.maxParticles,
    spawnAccumulator: 0,
    burstPending: config.burst,
    emitterAge: 0,
    size: config.size,
    opacity: config.opacity,
    color: config.color.clone(),
    localSpace: config.localSpace,
  };
}

function getRuntimeMap(ctx: ECSContext): Map<number, ParticleRuntime> {
  const existing = getResource<Map<number, ParticleRuntime>>(ctx, 'particleSystems');
  if (existing) return existing;
  const map = new Map<number, ParticleRuntime>();
  setResource(ctx, 'particleSystems', map);
  return map;
}

function randomDirection(base: THREE.Vector3, spread: number): THREE.Vector3 {
  if (spread <= 0) return base.clone();
  const randomVec = new THREE.Vector3(
    (Math.random() * 2 - 1) * spread,
    (Math.random() * 2 - 1) * spread,
    (Math.random() * 2 - 1) * spread
  );
  return base.clone().add(randomVec).normalize();
}

function randomShapeOffset(config: ReturnType<typeof readParticleEmitterConfig>): THREE.Vector3 {
  if (config.shapeType === ParticleShapeType.Box) {
    return new THREE.Vector3(
      (Math.random() - 0.5) * config.shapeSize.x,
      (Math.random() - 0.5) * config.shapeSize.y,
      (Math.random() - 0.5) * config.shapeSize.z
    );
  }

  if (config.shapeType === ParticleShapeType.Sphere) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    const radius = Math.cbrt(Math.random()) * config.shapeRadius;
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  return new THREE.Vector3();
}

function updateEmitterRuntime(runtime: ParticleRuntime, config: ReturnType<typeof readParticleEmitterConfig>): void {
  if (runtime.maxParticles !== config.maxParticles) {
    return;
  }

  if (runtime.size !== config.size) {
    runtime.material.size = config.size;
    runtime.size = config.size;
  }

  if (runtime.opacity !== config.opacity) {
    runtime.material.opacity = config.opacity;
    runtime.opacity = config.opacity;
  }

  if (!runtime.color.equals(config.color)) {
    runtime.material.color.copy(config.color);
    runtime.color.copy(config.color);
  }

  runtime.localSpace = config.localSpace;
}

export function particleSystem(ctx: ECSContext): void {
  const dtResource = getResource<number>(ctx, 'deltaTime') ?? 0;
  const editorDt = getResource<number>(ctx, 'editorDeltaTime') ?? 0;
  const dt = dtResource > 0 ? dtResource : editorDt;

  const runtimeMap = getRuntimeMap(ctx);
  const enter = particleEnter(ctx);
  for (const eid of enter) {
    const config = readParticleEmitterConfig(eid);
    const runtime = createParticleRuntime(config);
    runtimeMap.set(eid, runtime);
    ctx.three.worldRoot.add(runtime.points);
  }

  const exit = particleExit(ctx);
  for (const eid of exit) {
    const runtime = runtimeMap.get(eid);
    if (runtime) {
      ctx.three.worldRoot.remove(runtime.points);
      runtime.geometry.dispose();
      runtime.material.dispose();
      runtimeMap.delete(eid);
    }
  }

  if (dt <= 0) return;

  const entities = particleQuery(ctx);
  for (const eid of entities) {
    let runtime = runtimeMap.get(eid);
    const config = readParticleEmitterConfig(eid);

    if (!runtime || runtime.maxParticles !== config.maxParticles) {
      if (runtime) {
        ctx.three.worldRoot.remove(runtime.points);
        runtime.geometry.dispose();
        runtime.material.dispose();
      }
      runtime = createParticleRuntime(config);
      runtimeMap.set(eid, runtime);
      ctx.three.worldRoot.add(runtime.points);
    }

    updateEmitterRuntime(runtime, config);

    runtime.emitterAge += dt;
    const emitterDuration = config.duration;
    const emitRate = emitterDuration > 0 && runtime.emitterAge >= emitterDuration ? 0 : config.rate;

    runtime.spawnAccumulator += emitRate * dt;
    let spawnCount = Math.floor(runtime.spawnAccumulator);
    runtime.spawnAccumulator -= spawnCount;

    if (runtime.burstPending > 0) {
      spawnCount += runtime.burstPending;
      runtime.burstPending = 0;
    }

    const emitterPosition = new THREE.Vector3(Transform.x[eid], Transform.y[eid], Transform.z[eid]);
    if (config.localSpace) {
      runtime.points.position.copy(emitterPosition);
    } else {
      runtime.points.position.set(0, 0, 0);
    }

    let dirty = false;

    if (spawnCount > 0) {
      for (let i = 0; i < runtime.maxParticles && spawnCount > 0; i++) {
        if (runtime.ages[i] >= 0 && runtime.ages[i] < runtime.lifetimes[i]) {
          continue;
        }

        const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
        const direction = randomDirection(config.direction, config.spread);
        const offset = randomShapeOffset(config);
        const index = i * 3;

        const localPosition = config.localSpace ? offset : emitterPosition.clone().add(offset);

        runtime.positions[index] = localPosition.x;
        runtime.positions[index + 1] = localPosition.y;
        runtime.positions[index + 2] = localPosition.z;

        runtime.velocities[index] = direction.x * speed;
        runtime.velocities[index + 1] = direction.y * speed;
        runtime.velocities[index + 2] = direction.z * speed;

        runtime.ages[i] = 0;
        runtime.lifetimes[i] = config.lifetime;
        dirty = true;
        spawnCount--;
      }
    }

    for (let i = 0; i < runtime.maxParticles; i++) {
      const age = runtime.ages[i];
      if (age < 0 || age >= runtime.lifetimes[i]) {
        if (age >= runtime.lifetimes[i]) {
          const index = i * 3;
          runtime.positions[index] = HIDDEN_POSITION;
          runtime.positions[index + 1] = HIDDEN_POSITION;
          runtime.positions[index + 2] = HIDDEN_POSITION;
          runtime.ages[i] = -1;
          dirty = true;
        }
        continue;
      }

      const index = i * 3;
      runtime.velocities[index + 1] -= config.gravity * dt;

      runtime.positions[index] += runtime.velocities[index] * dt;
      runtime.positions[index + 1] += runtime.velocities[index + 1] * dt;
      runtime.positions[index + 2] += runtime.velocities[index + 2] * dt;

      runtime.ages[i] = age + dt;
      dirty = true;
    }

    if (dirty) {
      (runtime.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}
