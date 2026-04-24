import { describe, it, expect } from 'vitest';
import { applyGroupOperationToGeometry, meshModule } from '../mesh';
import * as THREE from 'three';
import { createECS } from '../../core/ecs';

const ctx = createECS() as any;

function boundaryEdgeCount(geometry: THREE.BufferGeometry): number {
  const nonIndexed = geometry.getIndex() ? geometry.toNonIndexed() : geometry;
  const positions = nonIndexed.getAttribute('position') as THREE.BufferAttribute;
  const vertexMap = new Map<string, number>();
  const canonicalIndices: number[] = [];

  const quantize = (value: number) => Math.round(value * 1e5) / 1e5;

  for (let i = 0; i < positions.count; i++) {
    const key = `${quantize(positions.getX(i))},${quantize(positions.getY(i))},${quantize(positions.getZ(i))}`;
    let canonical = vertexMap.get(key);
    if (canonical === undefined) {
      canonical = vertexMap.size;
      vertexMap.set(key, canonical);
    }
    canonicalIndices.push(canonical);
  }

  const edgeCounts = new Map<string, number>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  };

  for (let i = 0; i < canonicalIndices.length; i += 3) {
    const a = canonicalIndices[i];
    const b = canonicalIndices[i + 1];
    const c = canonicalIndices[i + 2];
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  let boundaryCount = 0;
  for (const count of edgeCounts.values()) {
    if (count === 1) boundaryCount++;
  }
  return boundaryCount;
}

describe('mesh module', () => {
  it('creates basic shapes', () => {
    const mod = meshModule(ctx);
    
    // Test box creation
    const boxGeom = mod.get(mod.resolve({ type: 'box', params: { size: [2, 2, 2] } }));
    expect(boxGeom).toBeInstanceOf(THREE.BufferGeometry);
    
    // Test sphere creation
    const sphereGeom = mod.get(mod.resolve({ type: 'sphere', params: { radius: 1 } }));
    expect(sphereGeom).toBeInstanceOf(THREE.BufferGeometry);
  });

  it('analyzes current hemisphere implementation', () => {
    const mod = meshModule(ctx);
    const radius = 0.5;
    const faces = 16;
    
    // Create hemisphere geometry using current implementation
    const hemisphereGeom = mod.get(mod.resolve({ 
      type: 'hemisphere', 
      params: { radius, faces } 
    }));
    
    expect(hemisphereGeom).toBeInstanceOf(THREE.BufferGeometry);
    
    const positions = hemisphereGeom.attributes.position;
    console.log('Closed hemisphere vertices:', positions.count);
    
    // Analyze Y coordinates to understand the geometry
    let minY = Infinity;
    let maxY = -Infinity;
    let bottomVertices = 0;
    
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      if (Math.abs(y + radius / 2) < 0.001) { // Very close to the cap plane
        bottomVertices++;
      }
    }
    
    console.log('Y range:', minY, 'to', maxY);
    console.log('Vertices at bottom (y ≈ -radius/2):', bottomVertices);
    
    // Closed hemisphere should have more vertices than the open one (289 + circle vertices)
    expect(positions.count).toBeGreaterThan(289);
    
    // Current hemisphere is centered around y = 0 and translated by -radius/2.
    expect(minY).toBeCloseTo(-radius / 2, 2);
    expect(maxY).toBeCloseTo(radius / 2, 2);
    
    // For a closed hemisphere, we should have significantly more vertices at the bottom
    // because of the added circular cap
    expect(bottomVertices).toBeGreaterThan(17); // More than the open hemisphere
  });

  it('creates new geometry types', () => {
    const mod = meshModule(ctx);

    const imageGeom = mod.get(mod.resolve({ type: 'image', params: { width: 4, height: 3 } }));
    expect(imageGeom).toBeInstanceOf(THREE.BufferGeometry);
    imageGeom.computeBoundingBox();
    expect(imageGeom.boundingBox?.min.x).toBeCloseTo(-2);
    expect(imageGeom.boundingBox?.max.x).toBeCloseTo(2);
    expect(imageGeom.boundingBox?.min.y).toBeCloseTo(-1.5);
    expect(imageGeom.boundingBox?.max.y).toBeCloseTo(1.5);
    expect(imageGeom.boundingBox?.min.z).toBeCloseTo(0);
    expect(imageGeom.boundingBox?.max.z).toBeCloseTo(0);
    
    // Test capsule creation
    const capsuleGeom = mod.get(mod.resolve({ type: 'capsule', params: { radius: 1, height: 3 } }));
    expect(capsuleGeom).toBeInstanceOf(THREE.BufferGeometry);
    
    // Test torus creation
    const torusGeom = mod.get(mod.resolve({ type: 'torus', params: { majorRadius: 2, minorRadius: 0.5 } }));
    expect(torusGeom).toBeInstanceOf(THREE.BufferGeometry);

    // Test rounded box creation
    const roundedBoxGeom = mod.get(mod.resolve({
      type: 'roundedBox',
      params: { lengthX: 2, lengthY: 1.5, lengthZ: 1, radius: 0.2, segments: 3 }
    }));
    expect(roundedBoxGeom).toBeInstanceOf(THREE.BufferGeometry);

    // Test wedge creation
    const wedgeGeom = mod.get(mod.resolve({ type: 'wedge', params: { width: 2, height: 1, depth: 3 } }));
    expect(wedgeGeom).toBeInstanceOf(THREE.BufferGeometry);

    // Test lathe creation
    const latheGeom = mod.get(mod.resolve({
      type: 'lathe',
      params: {
        profile: {
          type: 'polyline',
          params: {
            points: [
              { u: 0, v: 0 },
              { u: 0.2, v: 0.3 },
              { u: 0.4, v: 0.8 },
              { u: 0.1, v: 1.2 },
            ],
          },
        },
        segments: 16,
      }
    }));
    expect(latheGeom).toBeInstanceOf(THREE.BufferGeometry);

    // Test star creation
    const starGeom = mod.get(mod.resolve({
      type: 'star',
      params: { outerRadius: 1, innerRadius: 0.45, points: 5, height: 0.5 }
    }));
    expect(starGeom).toBeInstanceOf(THREE.BufferGeometry);
    
    // Test that new schema geometry objects work
    const schemaBoxGeom = mod.get(mod.resolve({ type: 'box', params: { lengthX: 2, lengthY: 3, lengthZ: 4 } }));
    expect(schemaBoxGeom).toBeInstanceOf(THREE.BufferGeometry);
    
    // Test pyramid with new schema format
    const pyramidGeom = mod.get(mod.resolve({ type: 'pyramid', params: { width: 2, height: 3, depth: 4 } }));
    expect(pyramidGeom).toBeInstanceOf(THREE.BufferGeometry);
  });

  it('caps lathe ends by default', () => {
    const mod = meshModule(ctx);

    const latheGeom = mod.get(mod.resolve({
      type: 'lathe',
      params: {
        profile: {
          type: 'polyline',
          params: {
            points: [
              { u: 0.25, v: 0 },
              { u: 0.4, v: 0.6 },
              { u: 0.3, v: 1.2 },
            ],
          },
        },
        segments: 20,
      },
    }));

    const positions = latheGeom.getAttribute('position');
    let hasBottomCenter = false;
    let hasTopCenter = false;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      if (Math.abs(x) < 1e-3 && Math.abs(z) < 1e-3 && Math.abs(y - 0) < 1e-3) {
        hasBottomCenter = true;
      }
      if (Math.abs(x) < 1e-3 && Math.abs(z) < 1e-3 && Math.abs(y - 1.2) < 1e-3) {
        hasTopCenter = true;
      }
    }

    expect(hasBottomCenter).toBe(true);
    expect(hasTopCenter).toBe(true);
  });

  it('supports uncapped lathe via capped=false', () => {
    const mod = meshModule(ctx);

    const latheGeom = mod.get(mod.resolve({
      type: 'lathe',
      params: {
        profile: {
          type: 'polyline',
          params: {
            points: [
              { u: 0.25, v: 0 },
              { u: 0.4, v: 0.6 },
              { u: 0.3, v: 1.2 },
            ],
          },
        },
        segments: 20,
        capped: false,
      },
    }));

    const positions = latheGeom.getAttribute('position');
    let hasBottomCenter = false;
    let hasTopCenter = false;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      if (Math.abs(x) < 1e-3 && Math.abs(z) < 1e-3 && Math.abs(y - 0) < 1e-3) {
        hasBottomCenter = true;
      }
      if (Math.abs(x) < 1e-3 && Math.abs(z) < 1e-3 && Math.abs(y - 1.2) < 1e-3) {
        hasTopCenter = true;
      }
    }

    expect(hasBottomCenter).toBe(false);
    expect(hasTopCenter).toBe(false);
  });

  it('creates hemisphere with closed bottom', () => {
    const mod = meshModule(ctx);
    const radius = 1.0;
    const faces = 32;
    
    // Create hemisphere geometry
    const hemisphereGeom = mod.get(mod.resolve({ 
      type: 'hemisphere', 
      params: { radius, faces } 
    }));
    
    expect(hemisphereGeom).toBeInstanceOf(THREE.BufferGeometry);
    
    const positions = hemisphereGeom.attributes.position;
    
    // Should have a center vertex at (0, 0, 0) from the CircleGeometry
    let hasCenterVertex = false;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      if (Math.abs(x) < 0.001 && Math.abs(y + radius / 2) < 0.001 && Math.abs(z) < 0.001) {
        hasCenterVertex = true;
        break;
      }
    }
    
    expect(hasCenterVertex).toBe(true);
  });

  it('hemisphere has consistent radius', () => {
    const mod = meshModule(ctx);
    const radius = 1.0;
    
    const hemisphereGeom = mod.get(mod.resolve({ 
      type: 'hemisphere', 
      params: { radius } 
    }));
    
    const positions = hemisphereGeom.attributes.position;
    
    // Check that vertices on the curved part are approximately at the correct radius
    let maxRadius = 0;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const distance = Math.sqrt(x * x + y * y + z * z);
      maxRadius = Math.max(maxRadius, distance);
    }
    
    // Center is offset downward by radius/2; farthest point is sqrt(r^2 + (r/2)^2).
    expect(maxRadius).toBeCloseTo(Math.sqrt(radius * radius + (radius / 2) * (radius / 2)), 1);
  });

  it('torus bottom pivot is aligned after rotation', () => {
    const mod = meshModule(ctx);
    const majorRadius = 0.75;
    const minorRadius = 0.24;

    const torusGeom = mod.get(mod.resolve({
      type: 'torus',
      params: { majorRadius, minorRadius, pivot: 'bottom' }
    }));

    torusGeom.computeBoundingBox();
    const boundingBox = torusGeom.boundingBox!;

    expect(boundingBox.min.y).toBeCloseTo(0, 2);
    expect(boundingBox.max.y).toBeCloseTo(minorRadius * 2, 2);
  });

  it('caps partial arc sweeps for supported circular primitives', () => {
    const mod = meshModule(ctx);

    const partialCylinder = mod.get(mod.resolve({ type: 'cylinder', params: { radius: 1, height: 2, arc: Math.PI } }));
    const partialCone = mod.get(mod.resolve({ type: 'cone', params: { radius: 1, height: 2, arc: Math.PI * 1.2 } }));
    const partialHollowCylinder = mod.get(mod.resolve({
      type: 'hollowCylinder',
      params: { outerRadius: 1, innerRadius: 0.6, height: 1.5, arc: Math.PI * 1.5 },
    }));
    const partialTorus = mod.get(mod.resolve({ type: 'torus', params: { majorRadius: 1.5, minorRadius: 0.3, arc: Math.PI * 1.25 } }));

    const uncappedCylinder = new THREE.CylinderGeometry(1, 1, 2, 16, 1, false, 0, Math.PI);
    const uncappedCone = new THREE.ConeGeometry(1, 2, 16, 1, false, 0, Math.PI * 1.2);
    const uncappedTorus = new THREE.TorusGeometry(1.5, 0.3, 16, 32, Math.PI * 1.25);

    expect(partialCylinder.getAttribute('position').count).toBeGreaterThan(uncappedCylinder.getAttribute('position').count);
    expect(partialCone.getAttribute('position').count).toBeGreaterThan(uncappedCone.getAttribute('position').count);
    expect(boundaryEdgeCount(partialCylinder)).toBe(0);
    expect(boundaryEdgeCount(partialCone)).toBe(0);
    expect(boundaryEdgeCount(partialHollowCylinder)).toBe(0);
    expect(partialTorus.getAttribute('position').count).toBeGreaterThan(uncappedTorus.getAttribute('position').count);
  });

  it('applies group taper operation along y axis', () => {
    const mod = meshModule(ctx);

    const base = mod.get(mod.resolve({
      type: 'box',
      params: {
        lengthX: 1.6,
        lengthY: 1.4,
        lengthZ: 1.6,
        pivot: 'bottom',
      },
    }));

    const tapered = applyGroupOperationToGeometry(base, { type: 'taper', params: { axis: 'y', factor: 0.4 } });

    tapered.computeBoundingBox();
    const bbox = tapered.boundingBox!;
    expect(bbox.min.y).toBeCloseTo(0, 3);

    const pos = tapered.getAttribute('position') as THREE.BufferAttribute;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    let bottomWidth = 0;
    let topWidth = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const absX = Math.abs(pos.getX(i));
      if (Math.abs(y - minY) < 1e-3) bottomWidth = Math.max(bottomWidth, absX * 2);
      if (Math.abs(y - maxY) < 1e-3) topWidth = Math.max(topWidth, absX * 2);
    }

    expect(topWidth).toBeLessThan(bottomWidth);
  });

  it('applies group mirror operation by duplicating and reflecting geometry', () => {
    const mod = meshModule(ctx);

    const base = mod.get(mod.resolve({
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0.1, v: -0.4 },
              { u: 0.95, v: -0.1 },
              { u: 0.8, v: 0.55 },
              { u: 0.15, v: 0.35 },
            ],
          },
        },
        height: 1,
        pivot: 'bottom',
      },
    }));

    const mirrored = applyGroupOperationToGeometry(base, { type: 'mirror', params: { axis: 'x' } });

    expect(mirrored.getAttribute('position').count).toBeGreaterThan(base.getAttribute('position').count);
    expect(boundaryEdgeCount(mirrored)).toBe(0);

    mirrored.computeBoundingBox();
    const bbox = mirrored.boundingBox!;
    expect(bbox.min.x).toBeLessThan(-0.09);
    expect(bbox.max.x).toBeGreaterThan(0.9);
  });

  it('supports mirror planeOffset to reflect around an offset plane', () => {
    const mod = meshModule(ctx);

    const base = mod.get(mod.resolve({
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: 0.2, v: -0.3 },
              { u: 0.8, v: -0.1 },
              { u: 0.7, v: 0.45 },
              { u: 0.25, v: 0.3 },
            ],
          },
        },
        height: 1,
        pivot: 'bottom',
      },
    }));
    const mirrored = applyGroupOperationToGeometry(base, { type: 'mirror', params: { axis: 'x', planeOffset: 1 } });

    mirrored.computeBoundingBox();
    const bbox = mirrored.boundingBox!;
    expect(bbox.min.x).toBeGreaterThan(0.19);
    expect(bbox.max.x).toBeGreaterThan(1.7);
  });

  it('supports sourceSide positive to treat one half as editable source', () => {
    const mod = meshModule(ctx);

    const base = mod.get(mod.resolve({
      type: 'extrudedPolygon',
      params: {
        shape: {
          type: 'polygon',
          params: {
            points: [
              { u: -0.6, v: -0.35 },
              { u: 0.75, v: -0.1 },
              { u: 0.6, v: 0.45 },
              { u: -0.2, v: 0.32 },
            ],
          },
        },
        height: 1,
        pivot: 'bottom',
      },
    }));
    const mirrored = applyGroupOperationToGeometry(base, { type: 'mirror', params: { axis: 'x', sourceSide: 'positive' } });

    mirrored.computeBoundingBox();
    const bbox = mirrored.boundingBox!;
    expect(bbox.min.x).toBeLessThan(-0.7);
    expect(bbox.max.x).toBeGreaterThan(0.7);
  });
});
