import * as RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { FieldDefinition } from "./field";
import { Module } from "./Module";
import { ECSContext, getModule } from "../core/ecs";
import { Primitive, Pivot } from "../core/schema";
import { calculatePivotOffset } from "./mesh";
import { Shape2DModule } from "./shape2d";

export type ColliderDefinition = {
  type:
  | "fromPrimitive"
  | "fromMesh"
  params: Record<string, any>;
};

interface ColliderResolved {
  definition: ColliderDefinition;
  getDesc: () => RAPIER.ColliderDesc[]; // changed to array
}

export const colliderModule = (ctx: ECSContext) => {
  const FULL_ARC_RADIANS = Math.PI * 2;
  const ARC_EPSILON = 1e-5;

  const hasPartialArc = (geometry: Primitive["geometry"]): boolean => {
    const arcEligibleTypes = new Set(["cylinder", "cone", "torus", "hollowCylinder"]);
    if (!arcEligibleTypes.has(geometry.type)) return false;
    const arc = (geometry as any)?.params?.arc;
    if (arc === undefined || arc === null) return false;
    if (!Number.isFinite(arc)) return false;
    return arc < FULL_ARC_RADIANS - ARC_EPSILON;
  };

  const shapeFactories: Record<string, (p: any) => () => RAPIER.ColliderDesc[]> = {
    box: (p: any) => () => {
      const size = p.size || [1, 1, 1];
      const desc = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width: size[0], height: size[1], depth: size[2] });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }
      
      return [desc];
    },
    sphere: (p: any) => () => {
      const r = p.radius || 0.5;
      const desc = RAPIER.ColliderDesc.ball(r)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width: r * 2, height: r * 2, depth: r * 2 });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }
      
      return [desc];
    },
    cylinder: (p: any) => () => {
      const s = p.size || [1, 1, 1];
      const r = p.radius || s[0] / 2;
      const h = p.height || s[1];
      const desc = RAPIER.ColliderDesc.cylinder(h / 2, r)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width: r * 2, height: h, depth: r * 2 });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }
      
      return [desc];
    },
    cone: (p: any) => () => {
      const s = p.size || [1, 1, 1];
      const h = p.height || s[1];
      const r = p.radius || s[0] / 2;
      const desc = RAPIER.ColliderDesc.cone(h / 2, r)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width: r * 2, height: h, depth: r * 2 });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }
      
      return [desc];
    },
    pyramid: (p: any) => {
      const size = p.size || [1, 1, 1];
      const hx = size[0] / 2;
      const hy = size[1] / 2;
      const hz = size[2] / 2;
      const vertices = new Float32Array([
        -hx, -hy, -hz,
        hx, -hy, -hz,
        hx, -hy, hz,
        -hx, -hy, hz,
        0, hy, 0,
      ]);
      const indices = new Uint32Array([
        0, 4, 1,
        1, 4, 2,
        2, 4, 3,
        3, 4, 0,
        0, 2, 3,
        0, 1, 2,
      ]);
      return () => {
        const desc = RAPIER.ColliderDesc.convexMesh(vertices, indices);
        if (!desc) return [];
        desc
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
        
        // Apply pivot offset
        const offset = calculatePivotOffset(p.pivot, { width: size[0], height: size[1], depth: size[2] });
        if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
          desc.setTranslation(offset.x, offset.y, offset.z);
        }
        
        return [desc];
      };
    },
    capsule: (p: any) => () => {
      const r = p.radius || 0.5;
      const halfSegment = Math.max(0, (p.height || 1) / 2 - r);
      const desc = RAPIER.ColliderDesc.capsule(halfSegment, r)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width: r * 2, height: p.height || 1, depth: r * 2 });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }
      
      return [desc];
    },
    hollowCylinder: (p: any) => () => {
      const outer = p.outerRadius ?? 0.5;
      const inner = Math.max(0, Math.min(p.innerRadius ?? 0, outer));
      const h = p.height ?? 1;

      // If the radius is small, keep the simple approximation (as before)
      if (inner <= 0.75) {
        const simple = RAPIER.ColliderDesc.cylinder(h / 2, outer)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

        const simpleOffset = calculatePivotOffset(p.pivot, { width: outer * 2, height: h, depth: outer * 2 });
        if (simpleOffset.x !== 0 || simpleOffset.y !== 0 || simpleOffset.z !== 0) {
          simple.setTranslation(simpleOffset.x, simpleOffset.y, simpleOffset.z);
        }
        return [simple];
      }

      // Otherwise, build a compound collider made of boxes (wall segments)
      // and vertical cylinders at joints to smooth transitions.
      const thickness = Math.max(outer - inner, 0.0001);
      const R = outer - thickness / 2; // mid-radius of the wall
      const circumference = 2 * Math.PI * R;
      const segments = Math.min(Math.max(6, Math.floor(circumference / 3)), 32);
      const colliders: RAPIER.ColliderDesc[] = [];

      const pivotOffset = calculatePivotOffset(p.pivot, { width: outer * 2, height: h, depth: outer * 2 });

      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const x1 = R * Math.cos(a1);
        const z1 = -R * Math.sin(a1);
        const x2 = R * Math.cos(a2);
        const z2 = -R * Math.sin(a2);
        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;
        const angle = (a1 + a2) / 2; // yaw around Y
        const chord = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);

        // Box segment approximating curved wall slice
        const box = RAPIER.ColliderDesc.cuboid(chord / 2, h / 2, thickness / 2)
          .setTranslation(cx + pivotOffset.x, pivotOffset.y, cz + pivotOffset.z)
          .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle + (Math.PI / 2), 0)))
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
        colliders.push(box);

        // Joint cylinder to smooth between segments
        const jx = R * Math.cos(a2);
        const jz = -R * Math.sin(a2);
        const joint = RAPIER.ColliderDesc.cylinder(h / 2, thickness / 2)
          .setTranslation(jx + pivotOffset.x, pivotOffset.y, jz + pivotOffset.z)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
        colliders.push(joint);
      }

      return colliders;
    },
    hemisphere: (p: any) => () => {
      const r = p.radius || 0.5;
      // Use a cone to approximate hemisphere shape
      // Height equals radius for dome-like proportions
      const h = r;
      const desc = RAPIER.ColliderDesc.roundCone(h / 4, r / 2, r / 4)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset (combining with existing offset)
      const pivotOffset = calculatePivotOffset(p.pivot, { width: r * 2, height: h, depth: r * 2 });
      desc.setTranslation(pivotOffset.x, pivotOffset.y, pivotOffset.z);
      
      return [desc];
    },
    icosahedron: (p: any) => () => {
      const r = p.radius || 0.5;
      const desc = RAPIER.ColliderDesc.ball(r)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      
      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width: r * 2, height: r * 2, depth: r * 2 });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }
      
      return [desc];
    },
    torus: (p: any) => () => {
      // Approximate torus with ball using major radius
      const R = p.majorRadius || 0.5;
      const r = p.minorRadius || 0.2; // Minor radius for the tube
      const pivotOffset = calculatePivotOffset(p.pivot, { width: R * 2, height: r * 2, depth: R * 2 });
      if (R - (2 * r) <= 0.5) {
        const desc = RAPIER.ColliderDesc.roundCylinder(0, R, r)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
        if (pivotOffset.x !== 0 || pivotOffset.y !== 0 || pivotOffset.z !== 0) {
          desc.setTranslation(pivotOffset.x, pivotOffset.y, pivotOffset.z);
        }
        return [desc];
      } else {
        const circumference = 2 * Math.PI * R;
        // 6 - 32 segments based on circumference
        const segments = Math.min(Math.max(6, Math.floor(circumference / 3)), 32);
        const colliders: RAPIER.ColliderDesc[] = [];
        for (let i = 0; i < segments; i++) {
          const a1 = (i / segments) * Math.PI * 2;
          const a2 = ((i + 1) / segments) * Math.PI * 2;
          const x1 = R * Math.cos(a1);
          const y1 = R * Math.sin(a1);
          const x2 = R * Math.cos(a2);
          const y2 = R * Math.sin(a2);
          const x = (x1 + x2) / 2;
          const y = (y1 + y2) / 2;
          const angle = (a1 + a2) / 2;
            const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const desc = RAPIER.ColliderDesc.capsule(segmentLength / 2, r)
            .setTranslation(x + pivotOffset.x, pivotOffset.y, -y + pivotOffset.z)
            .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -angle)))
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
            .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
          colliders.push(desc);
        }
        return colliders;
      }
    },
    roundedBox: (p: any) => () => {
      const size = p.size || [1, 1, 1];
      const desc = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

      const offset = calculatePivotOffset(p.pivot, { width: size[0], height: size[1], depth: size[2] });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }

      return [desc];
    },
    wedge: (p: any) => () => {
      const width = p.width ?? 1;
      const height = p.height ?? 1;
      const depth = p.depth ?? 1;
      const desc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

      const offset = calculatePivotOffset(p.pivot, { width, height, depth });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }

      return [desc];
    },
    lathe: (p: any) => () => {
      const shape2d = getModule<Shape2DModule>(ctx, "shape2d");
      if (!shape2d) return [];
      const profile = shape2d.resolveShape(p.profile).points;

      let maxRadius = 0.5;
      let minY = 0;
      let maxY = 1;

      for (const point of profile) {
        const x = point?.u ?? 0;
        const y = point?.v ?? 0;
        maxRadius = Math.max(maxRadius, Math.abs(x));
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }

      const height = Math.max(0.1, maxY - minY);
      const radius = Math.max(0.05, maxRadius);
      const desc = RAPIER.ColliderDesc.cylinder(height / 2, radius)
        .setTranslation(0, (minY + maxY) / 2, 0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

      const offset = calculatePivotOffset(p.pivot, { width: radius * 2, height, depth: radius * 2 });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        const t = desc.translation;
        desc.setTranslation(t.x + offset.x, t.y + offset.y, t.z + offset.z);
      }

      return [desc];
    },
    star: (p: any) => () => {
      const outerRadius = p.outerRadius ?? 0.75;
      const height = p.height ?? 0.5;
      const width = outerRadius * 2;
      const depth = outerRadius * 2;

      const desc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

      const offset = calculatePivotOffset(p.pivot, { width, height, depth });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        desc.setTranslation(offset.x, offset.y, offset.z);
      }

      return [desc];
    },
    displacedPlane: (p: any) => () => {
      const sizeX = p.lengthX || 10;
      const sizeZ = p.lengthZ || 10;
      const resolution = p.resolution || 32;
      let fieldDef: FieldDefinition;
      if (p.field) {
        fieldDef = p.field;
      } else if (p.noise) {
        fieldDef = p.noise.type
          ? (p.noise as FieldDefinition)
          : { type: "simplex", params: p.noise };
      } else {
        fieldDef = { type: "simplex", params: {} };
      }
      const fieldModule: Module<any, any> = getModule(ctx, "field");
      const field = fieldModule.get(fieldModule.resolve(fieldDef));
      const vertexArray: number[] = [];
      const indexArray: number[] = [];
      for (let iz = 0; iz < resolution; iz++) {
        const v = iz / (resolution - 1) - 0.5;
        const z = v * sizeZ;
        for (let ix = 0; ix < resolution; ix++) {
          const u = ix / (resolution - 1) - 0.5;
          const x = u * sizeX;

          const y = field.sample3D(u, 0, v);
          vertexArray.push(x, y, z);
        }
      }

      for (let iz = 0; iz < resolution - 1; iz++) {
        for (let ix = 0; ix < resolution - 1; ix++) {
          const a = iz * resolution + ix;
          const b = a + 1;
          const c = a + resolution;
          const d = c + 1;
          indexArray.push(a, c, b, b, c, d);
        }
      }

      const vertices = new Float32Array(vertexArray);
      const indices = new Uint32Array(indexArray);
      const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      return [desc];
    },
    extrudedPolygon: (p: any) => () => {
      const shape2d = getModule<Shape2DModule>(ctx, "shape2d");
      if (!shape2d) return [];
      const points = shape2d.resolveShape(p.shape).points;
      const height = p.height || 1;

      if (points.length < 3) {
        console.warn("extrudedPolygon requires at least 3 points for collider");
        return [];
      }

      // Calculate bounding box from 2D points (x, z)
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const point of points) {
        const x = point?.u ?? 0;
        const z = point?.v ?? 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }

      const width = maxX - minX;
      const depth = maxZ - minZ;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Create a box collider that bounds the extruded polygon
      const desc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setTranslation(centerX, 0, centerZ)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);

      // Apply pivot offset
      const offset = calculatePivotOffset(p.pivot, { width, height: height, depth });
      if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
        const currentTranslation = desc.translation;
        desc.setTranslation(
          currentTranslation.x + offset.x,
          currentTranslation.y + offset.y,
          currentTranslation.z + offset.z
        );
      }

      return [desc];
    },
  };

  return new Module<ColliderDefinition, ColliderResolved>(ctx, {
    fromPrimitive: (params: { geometry: Primitive["geometry"]; scale?: { x: number; y: number; z: number } }): ColliderResolved => {
      const { geometry, scale } = params;
      const s = scale || { x: 1, y: 1, z: 1 };
      const avgXZ = (s.x + s.z) / 2;
      const uniformMax = Math.max(s.x, s.y, s.z);

      if (hasPartialArc(geometry)) {
        const meshModule = getModule(ctx, "mesh");
        const meshId = meshModule.resolve(geometry as any);
        const scaledMesh = meshModule.get(meshId).clone();
        scaledMesh.scale(s.x, s.y, s.z);

        return {
          definition: { type: "fromPrimitive", params },
          getDesc: () => {
            const positionAttribute = scaledMesh.getAttribute('position') as THREE.BufferAttribute;
            if (!positionAttribute) {
              console.warn('Mesh has no position attribute for collider generation');
              return [];
            }

            const vertices = new Float32Array(positionAttribute.array);

            let indices: Uint32Array;
            const indexAttribute = scaledMesh.getIndex();
            if (indexAttribute) {
              indices = new Uint32Array(indexAttribute.array);
            } else {
              const vertexCount = vertices.length / 3;
              indices = new Uint32Array(vertexCount);
              for (let i = 0; i < vertexCount; i++) indices[i] = i;
            }

            const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
              .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
              .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
            return [desc];
          }
        };
      }

      let factoryParams: any;
      let factoryType: string;

      switch (geometry.type) {
        case "box":
          factoryType = "box";
          factoryParams = {
            size: [geometry.params.lengthX * s.x, geometry.params.lengthY * s.y, geometry.params.lengthZ * s.z],
            pivot: geometry.params.pivot
          };
          break;
        case "cylinder":
          factoryType = "cylinder";
          factoryParams = {
            radius: geometry.params.radius * avgXZ,
            height: geometry.params.height * s.y,
            pivot: geometry.params.pivot
          };
          break;
        case "sphere":
          factoryType = "sphere";
          factoryParams = {
            radius: geometry.params.radius * uniformMax,
            pivot: geometry.params.pivot
          };
          break;
        case "cone":
          factoryType = "cone";
          factoryParams = {
            radius: geometry.params.radius * avgXZ,
            height: geometry.params.height * s.y,
            pivot: geometry.params.pivot
          };
          break;
        case "capsule":
          factoryType = "capsule";
          factoryParams = {
            radius: geometry.params.radius * avgXZ,
            height: geometry.params.height * s.y,
            pivot: geometry.params.pivot
          };
          break;
        case "hollowCylinder":
          factoryType = "hollowCylinder";
          factoryParams = {
            outerRadius: geometry.params.outerRadius * avgXZ,
            innerRadius: geometry.params.innerRadius * avgXZ,
            height: geometry.params.height * s.y,
            pivot: geometry.params.pivot
          };
          break;
        case "hemisphere":
          factoryType = "hemisphere";
          factoryParams = {
            radius: geometry.params.radius * uniformMax,
            pivot: geometry.params.pivot
          };
          break;
        case "icosahedron":
          factoryType = "icosahedron";
          factoryParams = {
            radius: geometry.params.radius * uniformMax,
            pivot: geometry.params.pivot
          };
          break;
        case "torus":
          factoryType = "torus";
          factoryParams = {
            majorRadius: geometry.params.majorRadius * uniformMax,
            minorRadius: geometry.params.minorRadius * uniformMax,
            pivot: geometry.params.pivot
          };
          break;
        case "roundedBox":
          factoryType = "roundedBox";
          factoryParams = {
            size: [geometry.params.lengthX * s.x, geometry.params.lengthY * s.y, geometry.params.lengthZ * s.z],
            pivot: geometry.params.pivot
          };
          break;
        case "wedge":
          factoryType = "wedge";
          factoryParams = {
            width: geometry.params.width * s.x,
            height: geometry.params.height * s.y,
            depth: geometry.params.depth * s.z,
            pivot: geometry.params.pivot
          };
          break;
        case "lathe":
          {
          const shape2d = getModule<Shape2DModule>(ctx, "shape2d");
          const resolvedProfile = shape2d?.resolveShape(geometry.params.profile);
          factoryType = "lathe";
          factoryParams = {
            profile: {
              type: resolvedProfile?.closed ? "polygon" : "polyline",
              params: {
                points: (resolvedProfile?.points ?? []).map((point: any) => ({
                  u: (point?.u ?? 0) * avgXZ,
                  v: (point?.v ?? 0) * s.y,
                })),
                closed: resolvedProfile?.closed,
              }
            },
            segments: geometry.params.segments,
            pivot: geometry.params.pivot
          };
          break;
          }
        case "star":
          factoryType = "star";
          factoryParams = {
            outerRadius: geometry.params.outerRadius * uniformMax,
            innerRadius: geometry.params.innerRadius * uniformMax,
            points: geometry.params.points,
            height: geometry.params.height * s.y,
            pivot: geometry.params.pivot
          };
          break;
        case "pyramid":
          factoryType = "pyramid";
          factoryParams = {
            size: [geometry.params.width * s.x, geometry.params.height * s.y, geometry.params.depth * s.z],
            pivot: geometry.params.pivot
          };
          break;
        case "displacedPlane":
          factoryType = "displacedPlane";
          factoryParams = {
            lengthX: geometry.params.lengthX * s.x,
            lengthZ: geometry.params.lengthZ * s.z,
            field: geometry.params.field,
            resolution: Math.max(geometry.params.lengthX, geometry.params.lengthZ),
            pivot: geometry.params.pivot
          };
          break;
        case "extrudedPolygon":
          {
          const shape2d = getModule<Shape2DModule>(ctx, "shape2d");
          const resolvedShape = shape2d?.resolveShape(geometry.params.shape);
          factoryType = "extrudedPolygon";
          factoryParams = {
            shape: {
              type: resolvedShape?.closed ? "polygon" : "polyline",
              params: {
                points: (resolvedShape?.points ?? []).map((point: any) => ({
                  u: (point?.u ?? 0) * s.x,
                  v: (point?.v ?? 0) * s.z,
                })),
                closed: resolvedShape?.closed,
              }
            },
            height: geometry.params.height * s.y,
            pivot: geometry.params.pivot
          };
          break;
          }
        default:
          console.warn(`Collider for geometry type ${(geometry as any).type} not yet supported`);
          return { definition: { type: "fromPrimitive", params }, getDesc: () => [] };
      }

      const factory = shapeFactories[factoryType];
      const getDesc = factory ? factory(factoryParams) : () => [];

      return { definition: { type: "fromPrimitive", params }, getDesc };
    },

    fromMesh: (params: { mesh: THREE.BufferGeometry }): ColliderResolved => {
      const { mesh } = params;
      
      const getDesc = () => {
        // Extract vertices and indices from the mesh
        const positionAttribute = mesh.getAttribute('position') as THREE.BufferAttribute;
        if (!positionAttribute) {
          console.warn('Mesh has no position attribute for collider generation');
          return [];
        }

        const vertices = new Float32Array(positionAttribute.array);
        
        let indices: Uint32Array;
        const indexAttribute = mesh.getIndex();
        if (indexAttribute) {
          indices = new Uint32Array(indexAttribute.array);
        } else {
          // If no indices, create them sequentially
          const vertexCount = vertices.length / 3;
          indices = new Uint32Array(vertexCount);
          for (let i = 0; i < vertexCount; i++) {
            indices[i] = i;
          }
        }

        const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
        return [desc];
      };

      return { definition: { type: "fromMesh", params }, getDesc };
    },
  });
};
