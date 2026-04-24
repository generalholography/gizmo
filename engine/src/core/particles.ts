import * as THREE from "three";
import type { ParticleEmitter as ParticleEmitterDefinition, ParticleShape, Vector3 } from "./schema";
import { ParticleEmitter } from "./components/ParticleEmitter";

export const ParticleShapeType = {
  Point: 0,
  Box: 1,
  Sphere: 2,
} as const;

export type ParticleEmitterConfig = {
  rate: number;
  burst: number;
  maxParticles: number;
  lifetime: number;
  duration: number;
  speedMin: number;
  speedMax: number;
  spread: number;
  size: number;
  opacity: number;
  gravity: number;
  color: THREE.Color;
  direction: THREE.Vector3;
  shapeType: number;
  shapeSize: THREE.Vector3;
  shapeRadius: number;
  localSpace: boolean;
};

function resolveVector3(value: Vector3 | undefined, fallback: THREE.Vector3): THREE.Vector3 {
  if (Array.isArray(value)) {
    return new THREE.Vector3(value[0] ?? fallback.x, value[1] ?? fallback.y, value[2] ?? fallback.z);
  }
  if (value && typeof value === 'object') {
    return new THREE.Vector3(value.x ?? fallback.x, value.y ?? fallback.y, value.z ?? fallback.z);
  }
  return fallback.clone();
}

function resolveSpeedRange(speed: number | { min: number; max: number } | undefined): { min: number; max: number } {
  if (typeof speed === 'number') {
    return { min: speed, max: speed };
  }
  if (speed && typeof speed === 'object') {
    return { min: speed.min ?? 1, max: speed.max ?? speed.min ?? 1 };
  }
  return { min: 1, max: 1 };
}

function resolveShape(shape?: ParticleShape): { type: number; size: THREE.Vector3; radius: number } {
  if (!shape) {
    return { type: ParticleShapeType.Point, size: new THREE.Vector3(), radius: 0 };
  }
  if (shape.type === 'box') {
    const size = resolveVector3(shape.size, new THREE.Vector3(1, 1, 1));
    return { type: ParticleShapeType.Box, size, radius: 0 };
  }
  if (shape.type === 'sphere') {
    return { type: ParticleShapeType.Sphere, size: new THREE.Vector3(), radius: shape.radius ?? 1 };
  }
  return { type: ParticleShapeType.Point, size: new THREE.Vector3(), radius: 0 };
}

export function normalizeParticleEmitterDefinition(definition?: ParticleEmitterDefinition): ParticleEmitterConfig {
  const speedRange = resolveSpeedRange(definition?.speed);
  const color = new THREE.Color(definition?.color ?? '#ffffff');
  const direction = resolveVector3(definition?.direction, new THREE.Vector3(0, 1, 0)).normalize();
  const shape = resolveShape(definition?.shape);

  return {
    rate: definition?.rate ?? 0,
    burst: definition?.burst ?? 0,
    maxParticles: definition?.maxParticles ?? 200,
    lifetime: definition?.lifetime ?? 1.5,
    duration: definition?.duration ?? 0,
    speedMin: speedRange.min,
    speedMax: speedRange.max,
    spread: definition?.spread ?? 0.25,
    size: definition?.size ?? 0.2,
    opacity: definition?.opacity ?? 1,
    gravity: definition?.gravity ?? 0,
    color,
    direction,
    shapeType: shape.type,
    shapeSize: shape.size,
    shapeRadius: shape.radius,
    localSpace: definition?.localSpace ?? false,
  };
}

export function applyParticleEmitterDefinition(
  eid: number,
  definition: ParticleEmitterDefinition | undefined
): void {
  const resolved = normalizeParticleEmitterDefinition(definition);
  ParticleEmitter.rate[eid] = resolved.rate;
  ParticleEmitter.burst[eid] = resolved.burst;
  ParticleEmitter.maxParticles[eid] = resolved.maxParticles;
  ParticleEmitter.lifetime[eid] = resolved.lifetime;
  ParticleEmitter.duration[eid] = resolved.duration;
  ParticleEmitter.speedMin[eid] = resolved.speedMin;
  ParticleEmitter.speedMax[eid] = resolved.speedMax;
  ParticleEmitter.spread[eid] = resolved.spread;
  ParticleEmitter.size[eid] = resolved.size;
  ParticleEmitter.opacity[eid] = resolved.opacity;
  ParticleEmitter.gravity[eid] = resolved.gravity;
  ParticleEmitter.colorR[eid] = resolved.color.r;
  ParticleEmitter.colorG[eid] = resolved.color.g;
  ParticleEmitter.colorB[eid] = resolved.color.b;
  ParticleEmitter.directionX[eid] = resolved.direction.x;
  ParticleEmitter.directionY[eid] = resolved.direction.y;
  ParticleEmitter.directionZ[eid] = resolved.direction.z;
  ParticleEmitter.shapeType[eid] = resolved.shapeType;
  ParticleEmitter.shapeX[eid] = resolved.shapeSize.x;
  ParticleEmitter.shapeY[eid] = resolved.shapeSize.y;
  ParticleEmitter.shapeZ[eid] = resolved.shapeSize.z;
  ParticleEmitter.shapeRadius[eid] = resolved.shapeRadius;
  ParticleEmitter.localSpace[eid] = resolved.localSpace ? 1 : 0;
}

export function readParticleEmitterConfig(eid: number): ParticleEmitterConfig {
  return {
    rate: ParticleEmitter.rate[eid] ?? 0,
    burst: ParticleEmitter.burst[eid] ?? 0,
    maxParticles: ParticleEmitter.maxParticles[eid] ?? 200,
    lifetime: ParticleEmitter.lifetime[eid] ?? 1.5,
    duration: ParticleEmitter.duration[eid] ?? 0,
    speedMin: ParticleEmitter.speedMin[eid] ?? 1,
    speedMax: ParticleEmitter.speedMax[eid] ?? 1,
    spread: ParticleEmitter.spread[eid] ?? 0.25,
    size: ParticleEmitter.size[eid] ?? 0.2,
    opacity: ParticleEmitter.opacity[eid] ?? 1,
    gravity: ParticleEmitter.gravity[eid] ?? 0,
    color: new THREE.Color(
      ParticleEmitter.colorR[eid] ?? 1,
      ParticleEmitter.colorG[eid] ?? 1,
      ParticleEmitter.colorB[eid] ?? 1
    ),
    direction: new THREE.Vector3(
      ParticleEmitter.directionX[eid] ?? 0,
      ParticleEmitter.directionY[eid] ?? 1,
      ParticleEmitter.directionZ[eid] ?? 0
    ).normalize(),
    shapeType: ParticleEmitter.shapeType[eid] ?? ParticleShapeType.Point,
    shapeSize: new THREE.Vector3(
      ParticleEmitter.shapeX[eid] ?? 0,
      ParticleEmitter.shapeY[eid] ?? 0,
      ParticleEmitter.shapeZ[eid] ?? 0
    ),
    shapeRadius: ParticleEmitter.shapeRadius[eid] ?? 0,
    localSpace: (ParticleEmitter.localSpace[eid] ?? 0) === 1,
  };
}
