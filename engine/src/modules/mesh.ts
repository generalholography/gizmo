import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FieldDefinition } from "./field";
import { Module } from "./Module";
import { ECSContext, getModule } from "../core/ecs";
import { GroupOperation, Primitive, Pivot } from "../core/schema";
import { Shape2DModule } from "./shape2d";

function getShape2DResolver(ctx: ECSContext): Shape2DModule {
  const module = getModule<Shape2DModule>(ctx, "shape2d");
  if (!module) {
    throw new Error("Missing required module 'shape2d'");
  }
  return module;
}

export type MeshDefinition = {
  type:
  | "none"
  | "image"
  | "primitive"
  | "box"
  | "sphere"
  | "cylinder"
  | "hollowCylinder"
  | "cone"
  | "pyramid"
  | "hemisphere"
  | "icosahedron"
  | "displacedPlane"
  | "extrudedPolygon"
  | "roundedBox"
  | "wedge"
  | "lathe"
  | "star";
  params: Record<string, any>;
};

/**
 * Calculate the offset needed to move geometry from center to specified pivot point
 */
export function calculatePivotOffset(pivot: Pivot | undefined, dimensions: { width?: number; height?: number; depth?: number; }): THREE.Vector3 {
  if (!pivot || pivot === "center") {
    return new THREE.Vector3(0, 0, 0);
  }

  const { width = 0, height = 0, depth = 0 } = dimensions;

  switch (pivot) {
    case "top":
      return new THREE.Vector3(0, -height / 2, 0);
    case "bottom":
      return new THREE.Vector3(0, height / 2, 0);
    case "left":
      return new THREE.Vector3(width / 2, 0, 0);
    case "right":
      return new THREE.Vector3(-(width / 2), 0, 0);
    case "front":
      // -z is forward in this coordinate system
      return new THREE.Vector3(0, 0, depth / 2);
    case "back":
      return new THREE.Vector3(0, 0, -(depth / 2));
    default:
      return new THREE.Vector3(0, 0, 0);
  }
}

const FULL_ARC_RADIANS = Math.PI * 2;
const ARC_EPSILON = 1e-5;

function getArcRadians(params: any): number {
  const rawArc = params?.arc;
  if (rawArc === undefined || rawArc === null) return FULL_ARC_RADIANS;
  if (!Number.isFinite(rawArc)) return FULL_ARC_RADIANS;
  return THREE.MathUtils.clamp(rawArc, 0, FULL_ARC_RADIANS);
}

function isPartialArc(arc: number): boolean {
  return arc < FULL_ARC_RADIANS - ARC_EPSILON;
}

function createDoubleSidedBufferGeometry(vertices: number[], triangles: number[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [a, b, c] of triangles) {
    positions.push(
      vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
      vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
      vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2]
    );
    positions.push(
      vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2],
      vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
      vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2]
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const uv = new Float32Array((positions.length / 3) * 2);
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geom.computeVertexNormals();
  return geom;
}

function createCylinderArcCapGeometry(radius: number, height: number, angle: number): THREE.BufferGeometry {
  const x = radius * Math.sin(angle);
  const z = radius * Math.cos(angle);
  const halfHeight = height / 2;

  const vertices = [
    x, -halfHeight, z,
    x, halfHeight, z,
    0, halfHeight, 0,
    0, -halfHeight, 0,
  ];

  return createDoubleSidedBufferGeometry(vertices, [
    [0, 1, 2],
    [0, 2, 3],
  ]);
}

function createConeArcCapGeometry(radius: number, height: number, angle: number): THREE.BufferGeometry {
  const x = radius * Math.sin(angle);
  const z = radius * Math.cos(angle);
  const halfHeight = height / 2;

  const vertices = [
    0, halfHeight, 0,
    x, -halfHeight, z,
    0, -halfHeight, 0,
  ];

  return createDoubleSidedBufferGeometry(vertices, [[0, 1, 2]]);
}

function createOrientedCircleCap(radius: number, segments: number, normal: THREE.Vector3, center: THREE.Vector3): THREE.BufferGeometry {
  const geom = new THREE.CircleGeometry(radius, Math.max(8, segments));
  const unitNormal = normal.clone().normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), unitNormal);
  geom.applyQuaternion(rotation);
  geom.translate(center.x, center.y, center.z);
  return geom;
}

function mergeCompatibleGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = geometries.map((geometry) => (geometry.getIndex() ? geometry.toNonIndexed() : geometry));
  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  if (!merged) {
    throw new Error('Failed to merge geometries');
  }
  return merged;
}

function getDeformAxisIndices(axis: "x" | "y" | "z"): [number, number, number] {
  if (axis === "x") return [0, 1, 2];
  if (axis === "y") return [1, 0, 2];
  return [2, 0, 1];
}

function applyTaperDeform(geometry: THREE.BufferGeometry, axis: "x" | "y" | "z", factor: number): void {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position) return;

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) return;

  const [primaryAxis, scaleAxisA, scaleAxisB] = getDeformAxisIndices(axis);
  const minPrimary = bbox.min.getComponent(primaryAxis);
  const maxPrimary = bbox.max.getComponent(primaryAxis);
  const span = maxPrimary - minPrimary;
  const safeSpan = Math.abs(span) > 1e-6 ? span : 1;

  const safeFactor = Number.isFinite(factor) ? factor : 1;

  const value = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    value.fromBufferAttribute(position, i);
    const primaryValue = value.getComponent(primaryAxis);
    const t = (primaryValue - minPrimary) / safeSpan;
    const scale = THREE.MathUtils.lerp(1, safeFactor, THREE.MathUtils.clamp(t, 0, 1));
    value.setComponent(scaleAxisA, value.getComponent(scaleAxisA) * scale);
    value.setComponent(scaleAxisB, value.getComponent(scaleAxisB) * scale);
    position.setXYZ(i, value.x, value.y, value.z);
  }

  position.needsUpdate = true;
}

function swapTriangleVertices(attributes: THREE.BufferAttribute[], triangleStartVertex: number, indexA: number, indexB: number): void {
  for (const attribute of attributes) {
    const itemSize = attribute.itemSize;
    for (let c = 0; c < itemSize; c++) {
      const offsetA = (triangleStartVertex + indexA) * itemSize + c;
      const offsetB = (triangleStartVertex + indexB) * itemSize + c;
      const tmp = attribute.array[offsetA];
      attribute.array[offsetA] = attribute.array[offsetB];
      attribute.array[offsetB] = tmp;
    }
    attribute.needsUpdate = true;
  }
}

function flipTriangleWindingNonIndexed(geometry: THREE.BufferGeometry): void {
  const attributes = Object.values(geometry.attributes) as THREE.BufferAttribute[];
  if (attributes.length === 0) return;

  const vertexCount = attributes[0].count;
  for (let i = 0; i + 2 < vertexCount; i += 3) {
    swapTriangleVertices(attributes, i, 1, 2);
  }
}

function applySourceSideConstraint(
  geometry: THREE.BufferGeometry,
  axis: "x" | "y" | "z",
  planeOffset: number,
  sourceSide: "both" | "positive" | "negative"
): void {
  if (sourceSide === "both") return;

  const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position) return;

  const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  for (let i = 0; i < position.count; i++) {
    const current = position.getComponent(i, axisIndex);
    if (sourceSide === "positive" && current < planeOffset) {
      position.setComponent(i, axisIndex, planeOffset);
      continue;
    }
    if (sourceSide === "negative" && current > planeOffset) {
      position.setComponent(i, axisIndex, planeOffset);
    }
  }

  position.needsUpdate = true;
}

function applyMirrorSymmetry(
  geometry: THREE.BufferGeometry,
  axis: "x" | "y" | "z",
  planeOffset = 0,
  sourceSide: "both" | "positive" | "negative" = "both"
): THREE.BufferGeometry {
  const source = geometry.getIndex() ? geometry.toNonIndexed() : geometry.clone();
  applySourceSideConstraint(source, axis, planeOffset, sourceSide);

  const mirrored = source.clone();

  if (axis === "x") mirrored.translate(-planeOffset, 0, 0);
  else if (axis === "y") mirrored.translate(0, -planeOffset, 0);
  else mirrored.translate(0, 0, -planeOffset);

  if (axis === "x") mirrored.scale(-1, 1, 1);
  else if (axis === "y") mirrored.scale(1, -1, 1);
  else mirrored.scale(1, 1, -1);

  if (axis === "x") mirrored.translate(planeOffset, 0, 0);
  else if (axis === "y") mirrored.translate(0, planeOffset, 0);
  else mirrored.translate(0, 0, planeOffset);

  flipTriangleWindingNonIndexed(mirrored);

  const merged = mergeCompatibleGeometries([source, mirrored]);
  source.dispose();
  mirrored.dispose();
  return merged;
}

export function applyGroupOperationToGeometry(
  geometry: THREE.BufferGeometry,
  operation: Extract<GroupOperation, { type: "taper" | "mirror" }>
): THREE.BufferGeometry {
  const source = geometry.clone();

  if (operation.type === "taper") {
    const axis = operation.params?.axis ?? "y";
    const factor = operation.params?.factor ?? 1;
    applyTaperDeform(source, axis, factor);
    source.computeVertexNormals();
    source.computeBoundingBox();
    return source;
  }

  const axis = operation.params?.axis ?? "x";
  const planeOffset = Number.isFinite(operation.params?.planeOffset) ? operation.params.planeOffset : 0;
  const sourceSide = operation.params?.sourceSide === "positive" || operation.params?.sourceSide === "negative"
    ? operation.params.sourceSide
    : "both";
  const mirrored = applyMirrorSymmetry(source, axis, planeOffset, sourceSide);
  source.dispose();
  mirrored.computeVertexNormals();
  mirrored.computeBoundingBox();
  return mirrored;
}

export class MeshModule extends Module<MeshDefinition, THREE.BufferGeometry> {
  constructor(ctx: ECSContext, factories: Record<string, (params: any) => THREE.BufferGeometry>) {
    super(ctx, factories);
  }

  // Overload resolve to accept Primitive geometry objects directly  
  resolve(def: string): number;
  resolve(def: MeshDefinition): number;
  resolve(def: Primitive["geometry"]): number;
  resolve(def: string | MeshDefinition | Primitive["geometry"]): number {
    if (def === undefined || def === null) {
      def = { type: "none", params: {} };
    }
    if (typeof def === "string") {
      return super.resolve(def);
    }
    if ((def as MeshDefinition).type) {
      return super.resolve(def as MeshDefinition);
    }
    // Handle Primitive geometry objects
    const geometryDef = def as Primitive["geometry"];
    const meshDef: MeshDefinition = {
      type: geometryDef.type as any,
      params: geometryDef.params,
    };
    return super.resolve(meshDef);
  }
}

export const meshModule = (ctx: ECSContext) => {
  const shapeFactories: Record<string, (params: any) => THREE.BufferGeometry> = {
    image: (params: any) => {
      const width = params?.width ?? 1;
      const height = params?.height ?? 1;
      const geom = new THREE.PlaneGeometry(width, height);
      const offset = calculatePivotOffset(params?.pivot, { width, height, depth: 0 });
      geom.translate(offset.x, offset.y, offset.z);
      return geom;
    },
    box: (params: any) => {
      // Handle both old format (size array) and new format (lengthX, lengthY, lengthZ)
      let lengthX, lengthY, lengthZ;
      if (params?.lengthX !== undefined) {
        lengthX = params.lengthX;
        lengthY = params.lengthY;
        lengthZ = params.lengthZ;
      } else {
        const size = params?.size ?? [1, 1, 1];
        lengthX = size[0];
        lengthY = size[1];
        lengthZ = size[2];
      }

      const geom = new THREE.BoxGeometry(lengthX, lengthY, lengthZ);

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: lengthX, height: lengthY, depth: lengthZ });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    sphere: (params: any) => {
      const r = params?.radius ?? 0.5;
      const geom = new THREE.SphereGeometry(r, 16, 16);

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: r * 2, depth: r * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    cylinder: (params: any) => {
      // Handle both old format and new format
      let r, h;
      if (params?.radius !== undefined && params?.height !== undefined) {
        r = params.radius;
        h = params.height;
      } else {
        const s = params?.size ?? [1, 1, 1];
        r = params?.radius ?? s[0] / 2;
        h = params?.height ?? s[1];
      }

      const arc = getArcRadians(params);
      const geom = new THREE.CylinderGeometry(r, r, h, 16, 1, false, 0, arc);

      if (isPartialArc(arc)) {
        const startCap = createCylinderArcCapGeometry(r, h, 0);
        const endCap = createCylinderArcCapGeometry(r, h, arc);
        const merged = mergeCompatibleGeometries([geom, startCap, endCap]);
        merged.computeVertexNormals();
        geom.dispose();
        startCap.dispose();
        endCap.dispose();
        
        const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: h, depth: r * 2 });
        merged.translate(offset.x, offset.y, offset.z);
        return merged;
      }

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: h, depth: r * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    hollowCylinder: (params: any) => {
      const outer = params?.outerRadius ?? 0.5;
      const inner = params?.innerRadius ?? outer * 0.6;
      const height = params?.height ?? 1;
      const segments = params?.segments ?? 16;
      const arc = getArcRadians(params);

      const shape = new THREE.Shape();
      if (isPartialArc(arc)) {
        const safeOuter = Math.max(outer, inner + 1e-4);
        shape.moveTo(safeOuter, 0);
        shape.absarc(0, 0, safeOuter, 0, arc, false);
        shape.lineTo(inner * Math.cos(arc), inner * Math.sin(arc));
        shape.absarc(0, 0, inner, arc, 0, true);
        shape.closePath();
      } else {
        shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
        steps: 1,
        curveSegments: segments,
      });
      geom.rotateX(-Math.PI / 2);
      geom.translate(0, -height / 2, 0);

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: outer * 2, height: height, depth: outer * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    cone: (params: any) => {
      // Handle both old format and new format
      let r, h, f;
      if (params?.radius !== undefined && params?.height !== undefined) {
        r = params.radius;
        h = params.height;
        f = 16;
      } else {
        const s = params?.size ?? [1, 1];
        r = params?.radius ?? s[0] / 2;
        h = params?.height ?? s[1];
        f = params?.faces ?? 16;
      }

      const arc = getArcRadians(params);
      const geom = new THREE.ConeGeometry(r, h, f, 1, false, 0, arc);

      if (isPartialArc(arc)) {
        const startCap = createConeArcCapGeometry(r, h, 0);
        const endCap = createConeArcCapGeometry(r, h, arc);
        const merged = mergeCompatibleGeometries([geom, startCap, endCap]);
        merged.computeVertexNormals();
        geom.dispose();
        startCap.dispose();
        endCap.dispose();

        const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: h, depth: r * 2 });
        merged.translate(offset.x, offset.y, offset.z);
        return merged;
      }

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: h, depth: r * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    pyramid: (params: any) => {
      // Handle both old format (size array) and new format (width, height, depth)
      let size;
      if (params?.width !== undefined) {
        size = [params.width, params.height, params.depth];
      } else {
        size = params?.size ?? [1, 1, 1];
      }
      const hx = size[0] / 2;
      const hy = size[1] / 2;
      const hz = size[2] / 2;

      const verts = [
        -1, -1, -1,
        1, -1, -1,
        1, -1, 1,
        -1, -1, 1,
        0, 1, 0,
      ];
      const faces = [
        0, 4, 1,
        1, 4, 2,
        2, 4, 3,
        3, 4, 0,
        0, 2, 3,
        0, 1, 2,
      ];

      const geom = new THREE.PolyhedronGeometry(verts, faces, 1, 0);
      const pos = geom.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > 0) {
          pos.setXYZ(i, 0, hy, 0);
        } else {
          const sx = pos.getX(i) >= 0 ? hx : -hx;
          const sz = pos.getZ(i) >= 0 ? hz : -hz;
          pos.setXYZ(i, sx, -hy, sz);
        }
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: size[0], height: size[1], depth: size[2] });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    hemisphere: (params: any) => {
      const r = params?.radius ?? 0.5;
      const f = params?.faces ?? 16;

      // Create the hemisphere (top half of sphere)
      const hemisphere = new THREE.SphereGeometry(r, f, f, 0, Math.PI * 2, 0, Math.PI / 2);

      // Create a disk to close off the bottom
      const cap = new THREE.CircleGeometry(r, f);
      cap.rotateX(Math.PI / 2); // Orient the disk horizontally

      hemisphere.translate(0, -r/2, 0); // Position hemisphere at the top
      cap.translate(0, -r/2, 0); // Position at the bottom of the hemisphere

      // Merge both geometries to create a closed hemisphere
      const geom = BufferGeometryUtils.mergeGeometries([hemisphere, cap]);

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: r, depth: r * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    icosahedron: (params: any) => {
      const r = params?.radius ?? 0.5;
      const geom = new THREE.IcosahedronGeometry(r, 0);

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: r * 2, height: r * 2, depth: r * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    capsule: (params: any) => {
      const radius = params?.radius ?? 0.5;
      const height = params?.height ?? 2;

      // Create a capsule by combining a cylinder with two hemispheres
      const cylinderHeight = Math.max(0, height - 2 * radius);
      const cylinder = new THREE.CylinderGeometry(
        radius, 
        radius, 
        cylinderHeight, 
        16, 
        undefined, 
        true  // needs to be open to cleanly attach hemispheres
      );

      // Create top hemisphere
      const topHemisphere = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      topHemisphere.translate(0, cylinderHeight / 2, 0);

      // Create bottom hemisphere  
      const bottomHemisphere = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      bottomHemisphere.translate(0, -cylinderHeight / 2, 0);

      // Merge all parts
      const geom = BufferGeometryUtils.mergeGeometries([cylinder, topHemisphere, bottomHemisphere]);

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: radius * 2, height: height, depth: radius * 2 });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    torus: (params: any) => {
      const majorRadius = params?.majorRadius ?? 1;
      const minorRadius = params?.minorRadius ?? 0.3;
      const arc = getArcRadians(params);
      const radialSegments = 16;
      const tubularSegments = 32;
      const geom = new THREE.TorusGeometry(majorRadius, minorRadius, radialSegments, tubularSegments, arc);

      // Align torus to rest on the XZ plane (Y-up world)
      geom.rotateX(Math.PI / 2);

      if (isPartialArc(arc)) {
        const startTheta = 0;
        const endTheta = arc;

        const startCenter = new THREE.Vector3(
          majorRadius * Math.cos(startTheta),
          0,
          majorRadius * Math.sin(startTheta)
        );
        const endCenter = new THREE.Vector3(
          majorRadius * Math.cos(endTheta),
          0,
          majorRadius * Math.sin(endTheta)
        );

        const startTangent = new THREE.Vector3(-Math.sin(startTheta), 0, Math.cos(startTheta)).normalize();
        const endTangent = new THREE.Vector3(-Math.sin(endTheta), 0, Math.cos(endTheta)).normalize();

        const startCap = createOrientedCircleCap(minorRadius, radialSegments, startTangent.clone().multiplyScalar(-1), startCenter);
        const endCap = createOrientedCircleCap(minorRadius, radialSegments, endTangent, endCenter);

        const merged = mergeCompatibleGeometries([geom, startCap, endCap]);
        merged.computeVertexNormals();
        geom.dispose();
        startCap.dispose();
        endCap.dispose();

        const offset = calculatePivotOffset(params?.pivot, {
          width: majorRadius * 2,
          height: minorRadius * 2,
          depth: majorRadius * 2,
        });
        merged.translate(offset.x, offset.y, offset.z);
        return merged;
      }

      // Apply pivot in the final orientation
      const offset = calculatePivotOffset(params?.pivot, {
        width: majorRadius * 2,
        height: minorRadius * 2,
        depth: majorRadius * 2,
      });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    roundedBox: (params: any) => {
      const lengthX = params?.lengthX ?? 1;
      const lengthY = params?.lengthY ?? 1;
      const lengthZ = params?.lengthZ ?? 1;
      const maxRadius = Math.max(0, Math.min(lengthX, lengthY, lengthZ) / 2);
      const radius = Math.min(params?.radius ?? 0.1, maxRadius);
      const segments = Math.max(1, Math.floor(params?.segments ?? 3));

      const geom = new RoundedBoxGeometry(lengthX, lengthY, lengthZ, segments, radius);

      const offset = calculatePivotOffset(params?.pivot, { width: lengthX, height: lengthY, depth: lengthZ });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    wedge: (params: any) => {
      const width = params?.width ?? 1;
      const height = params?.height ?? 1;
      const depth = params?.depth ?? 1;

      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, -height / 2);
      shape.lineTo(width / 2, -height / 2);
      shape.lineTo(-width / 2, height / 2);
      shape.lineTo(-width / 2, -height / 2);

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        steps: 1,
      });

      geom.translate(0, 0, -depth / 2);

      const offset = calculatePivotOffset(params?.pivot, { width, height, depth });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    lathe: (params: any) => {
      const shape2d = getShape2DResolver(ctx);
      const profile = shape2d.resolveShape(params.profile);
      const points = profile.points.map((point) => new THREE.Vector2(point.u ?? 0, point.v ?? 0));
      const segments = params?.segments ?? 24;
      const capped = params?.capped ?? true;

      if (points.length < 2) {
        console.warn("lathe requires at least 2 profile points, defaulting to cylinder");
        return shapeFactories["cylinder"]({ radius: 0.5, height: 1, pivot: params?.pivot });
      }

      const lathe = new THREE.LatheGeometry(points, segments);
      const geometries: THREE.BufferGeometry[] = [lathe];

      if (capped && points.length > 1) {
        const first = points[0];
        const last = points[points.length - 1];

        if (Math.abs(first.x) > 1e-5) {
          const bottomCap = new THREE.CircleGeometry(Math.abs(first.x), Math.max(8, segments));
          bottomCap.rotateX(Math.PI / 2);
          bottomCap.translate(0, first.y, 0);
          geometries.push(bottomCap);
        }

        if (Math.abs(last.x) > 1e-5) {
          const topCap = new THREE.CircleGeometry(Math.abs(last.x), Math.max(8, segments));
          topCap.rotateX(-Math.PI / 2);
          topCap.translate(0, last.y, 0);
          geometries.push(topCap);
        }
      }

      const geom = BufferGeometryUtils.mergeGeometries(geometries, false);
      geom.computeVertexNormals();

      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;
      const width = bbox.max.x - bbox.min.x;
      const height = bbox.max.y - bbox.min.y;
      const depth = bbox.max.z - bbox.min.z;

      const offset = calculatePivotOffset(params?.pivot, { width, height, depth });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    star: (params: any) => {
      const outerRadius = params?.outerRadius ?? 0.75;
      const innerRadius = params?.innerRadius ?? 0.35;
      const pointCount = Math.max(3, params?.points ?? 5);
      const extrusionHeight = params?.height ?? 0.5;

      const shape = new THREE.Shape();
      for (let i = 0; i < pointCount * 2; i++) {
        const angle = (i / (pointCount * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: extrusionHeight,
        bevelEnabled: false,
        steps: 1,
      });

      geom.rotateX(Math.PI / 2);
      geom.translate(0, extrusionHeight / 2, 0);

      const width = outerRadius * 2;
      const height = extrusionHeight;
      const depth = outerRadius * 2;
      const offset = calculatePivotOffset(params?.pivot, { width, height, depth });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    extrudedPolygon: (params: any) => {
      const shape2d = getShape2DResolver(ctx);
      const shapeDef = shape2d.resolveShape(params.shape);
      const points = shapeDef.points ?? [];
      const extrusionHeight = params?.height ?? 1;

      if (points.length < 3) {
        console.warn("extrudedPolygon requires at least 3 points, defaulting to box");
        return shapeFactories["box"]({ lengthX: 1, lengthY: 1, lengthZ: 1 });
      }

      // Convert canonical generic points (u, v) to THREE.Vector2 for the shape
      const shapePoints: THREE.Vector2[] = [];
      for (const point of points) {
        shapePoints.push(new THREE.Vector2(point.u, point.v));
      }

      // Create the shape from the points
      const shape = new THREE.Shape(shapePoints);
      if (shapeDef.closed === true) {
        shape.closePath();
      }

      // Extrude the shape along the Y axis
      const extrudeSettings = {
        depth: extrusionHeight,
        bevelEnabled: false,
        steps: 1,
      };

      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Rotate to align with Y-up convention (ExtrudeGeometry extrudes along Z by default)
      // After rotation, the extrusion will be along the Y axis
      geom.rotateX(Math.PI / 2);
      
      // Center the geometry in Y (ExtrudeGeometry creates from 0 to depth, after rotation it's -depth to 0)
      // Move it so it's centered: -height/2 to +height/2
      geom.translate(0, extrusionHeight / 2, 0);

      // Calculate bounds for pivot offset
      geom.computeBoundingBox();
      const boundingBox = geom.boundingBox!;
      const width = boundingBox.max.x - boundingBox.min.x;
      const height = extrusionHeight;
      const depth = boundingBox.max.z - boundingBox.min.z;

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width, height, depth });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
  };

  return new MeshModule(ctx, {
    none: (params: any) => {
      const geom = new THREE.BufferGeometry();

      // Apply pivot offset (though for empty geometry this doesn't matter)
      const offset = calculatePivotOffset(params?.pivot, {});
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
    primitive: (params: any) => {
      const shape = params?.shape ?? "box";
      const factory = shapeFactories[shape];
      if (!factory) {
        console.warn(`Unknown shape '${shape}', defaulting to box.`);
        return shapeFactories["box"](params);
      }
      return factory(params);
    },
    image: shapeFactories.image,
    box: shapeFactories.box,
    sphere: shapeFactories.sphere,
    cylinder: shapeFactories.cylinder,
    hollowCylinder: shapeFactories.hollowCylinder,
    cone: shapeFactories.cone,
    pyramid: shapeFactories.pyramid,
    hemisphere: shapeFactories.hemisphere,
    icosahedron: shapeFactories.icosahedron,
    capsule: shapeFactories.capsule,
    torus: shapeFactories.torus,
    roundedBox: shapeFactories.roundedBox,
    wedge: shapeFactories.wedge,
    lathe: shapeFactories.lathe,
    star: shapeFactories.star,
    extrudedPolygon: shapeFactories.extrudedPolygon,
    displacedPlane: (params: any) => {
      // Handle both old format and new format
      let sizeX, sizeZ, fieldDef;
      if (params?.lengthX !== undefined) {
        // New format from schema
        sizeX = params.lengthX;
        sizeZ = params.lengthZ;
        fieldDef = params.field;
      } else {
        // Old format
        sizeX = params?.sizeX ?? 100;
        sizeZ = params?.sizeZ ?? 100;
        if (params?.field) {
          fieldDef = params.field;
        } else if (params?.noise) {
          fieldDef = params.noise.type
            ? (params.noise as FieldDefinition)
            : { type: "simplex", params: params.noise };
        } else {
          fieldDef = { type: "simplex", params: {} };
        }
      }

      const resolution = params?.resolution ?? 256;
      const fieldModule: Module<any, any> = getModule(ctx, "field");
      const field = fieldModule.get(fieldModule.resolve(fieldDef));

      const geom = new THREE.PlaneGeometry(sizeX, sizeZ, resolution - 1, resolution - 1);
      geom.rotateX(-Math.PI / 2);
      const verts = geom.attributes.position as THREE.BufferAttribute;

      // Use global-normalized coordinates for field sampling
      // This matches the spawner's coordinate system where positions are normalized by terrain size
      // For a terrain centered at origin with size S, world position x maps to x/S
      // Vertex at world x=-S/2 -> u=-0.5, vertex at x=S/2 -> u=0.5
      for (let i = 0; i < verts.count; ++i) {
        const ix = i % resolution;
        const iz = Math.floor(i / resolution);
        
        // Convert vertex index to world position, then normalize by terrain size
        // Vertex x position: lerp from -sizeX/2 to sizeX/2
        // Vertex z position: lerp from -sizeZ/2 to sizeZ/2
        const worldX = (ix / (resolution - 1) - 0.5) * sizeX;
        const worldZ = (iz / (resolution - 1) - 0.5) * sizeZ;
        
        // Normalize by terrain size (using max dimension for consistency)
        // This creates "global-normalized" coordinates
        const normSize = Math.max(sizeX, sizeZ);
        const u = worldX / normSize;
        const v = worldZ / normSize;

        const n = field.sample3D(u, 0, v);
        verts.setY(i, n);
      }
      verts.needsUpdate = true;
      geom.computeVertexNormals();

      // Apply pivot offset
      const offset = calculatePivotOffset(params?.pivot, { width: sizeX, depth: sizeZ });
      geom.translate(offset.x, offset.y, offset.z);

      return geom;
    },
  });
};
