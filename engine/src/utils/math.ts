import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Creates a unique key for a pair of entity IDs.
 * This can be used to deduplicate interactions between two entities.
 * @param eid1 
 * @param eid2 
 * @returns 
 */
export function makePairKey(eid1: number, eid2: number): bigint {
  return eid1 < eid2
    ? (BigInt(eid1) << 32n) | BigInt(eid2)
    : (BigInt(eid2) << 32n) | BigInt(eid1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function timeToSunDirection(time: number): THREE.Vector3 {
  const timeAngle = (-Math.PI / 2) + (time / 2400) * Math.PI * 2;
  const sunHeight = Math.sin(timeAngle);
  const sunDirection = new THREE.Vector3(
    Math.cos(timeAngle),
    sunHeight,
    0
  ).normalize();
  return sunDirection;
}