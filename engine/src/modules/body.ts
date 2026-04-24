import * as THREE from "three";
import alea from "alea";
import { Module } from "./Module";
import { ECSContext, getModule } from "../core/ecs";
import { Primitive, MaterialDefinition, Body, Light, Node, GroupNode, GroupOperation, GroupOperationType } from "../core/schema";
import * as RAPIER from "@dimforge/rapier3d-compat";
import * as ColliderModule from "./collider";
import { MeshDefinition, MeshModule, applyGroupOperationToGeometry } from "./mesh";
import { PlacementModule } from "./spawner/placement";
import type { PlacementDefinition } from "./spawner/types";
import { calculateLocalBodyBounds } from "../utils/geometry";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GroupOperationModule } from "./groupOperation";

// Import three-bvh-csg for CSG operations
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION, DIFFERENCE } from "three-bvh-csg";

// Wall thickness for interior hollowing
const WALL_THICKNESS = 0.1;
const CSG_INPUT_TRIANGLE_BUDGET_WARN = 20_000;
const CSG_RESULT_TRIANGLE_BUDGET_WARN = 30_000;
const CSG_EVAL_SLOW_MS_WARN = 12;

function triangleCount(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return Math.floor(index.count / 3);
  const position = geometry.getAttribute('position');
  return position ? Math.floor(position.count / 3) : 0;
}

function toMeshDefinition(primitive: Primitive): MeshDefinition {
  return {
    type: primitive.geometry.type as MeshDefinition["type"],
    params: {
      ...(primitive.geometry.params ?? {}),
    },
  };
}

function getGroupOperationResolver(ctx: ECSContext): GroupOperationModule {
  const module = getModule<GroupOperationModule>(ctx, "groupOperation");
  if (!module) {
    throw new Error("Missing required module 'groupOperation'");
  }
  return module;
}

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const previousRandom = Math.random;
  const seeded = alea(String(seed));
  Math.random = seeded;
  try {
    return fn();
  } finally {
    Math.random = previousRandom;
  }
}

// Adapted schema for the module system (params is required)

/** A single CSG source part proxy: geometry baked to entity-local space. */
export interface CsgSourceProxy {
  /** Geometry with transforms pre-applied (entity-local space). */
  geometry: THREE.BufferGeometry;
  /** Index of the source primitive in its parent GroupNode's `children` array. */
  sourceIndex: number;
}

export type BodyResolvedGroupOperation = GroupOperation;

export type BodyResolvedNode =
  | BodyResolvedGeometryNode
  | BodyResolvedLightNode
  | BodyResolvedGroupNode;

export interface BodyResolvedNodeBase {
  definitionPath?: number[];
  renderTransformBaked?: boolean;
  localTransform?: THREE.Matrix4;
  tag?: string;
  children?: BodyResolvedNode[];
}

export interface BodyResolvedGeometryNode extends BodyResolvedNodeBase {
  type: "geometry";
  mesh: THREE.BufferGeometry;
  material: THREE.Material;
  ignoreCollisions: boolean;
  hasMirrorSymmetry?: boolean;
  csgSourceProxies?: CsgSourceProxy[];
}

export interface BodyResolvedLightNode extends BodyResolvedNodeBase {
  type: "light";
  light: THREE.Light;
}

export interface BodyResolvedGroupNode extends BodyResolvedNodeBase {
  type: "group";
  operation: BodyResolvedGroupOperation;
  children: BodyResolvedNode[];
}

export interface BodyResolved {
  parts: BodyResolvedNode[];
  colliders: RAPIER.ColliderDesc[];
  colliderDefinitionPaths?: Array<number[] | undefined>;
  localBounds: THREE.Box3;
  hasGroupMeshOperations?: boolean;
}

class BodyModule extends Module<Body, BodyResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {
      composite: (params: { parts: Node[]; hasInterior?: boolean }) => {
        const parts = params.parts ?? [];
        const hasInterior = params.hasInterior ?? false;

        // If hasInterior is true, generate hollowed-out geometry using CSG
        // Note: This is intended primarily for static entities representing buildings/structures
        if (hasInterior) {
          return this.resolveCompositeWithInterior(ctx, parts);
        }

        const { resolvedParts, colliders, colliderDefinitionPaths } = this.resolveSiblingNodes(ctx, parts, undefined);

        // Calculate local bounds for the entire body (only from geometry parts)
        const localBounds = calculateLocalBodyBounds(this.collectGeometryNodes(resolvedParts) as any);
        const hasGroupMeshOperations = this.containsGroupMeshOperations(resolvedParts);

        return { parts: resolvedParts, colliders, colliderDefinitionPaths, localBounds, hasGroupMeshOperations };
      },
      gltf: (params: any) => {
        // GLTF models are resolved asynchronously by gltfRenderingSystem.
        return { parts: [], colliders: [], colliderDefinitionPaths: [], localBounds: new THREE.Box3() };
      },
      humanoid: (params: any) => {
        // Stub for humanoid implementation  
        console.warn("Humanoid body type not yet implemented, using empty body");
        return { parts: [], colliders: [], colliderDefinitionPaths: [], localBounds: new THREE.Box3() };
      },
    });
  }

  private resolveSiblingNodes(
    ctx: ECSContext,
    nodes: Node[],
    parentAccum?: THREE.Matrix4,
    parentDefinitionPath: number[] = []
  ): { resolvedParts: BodyResolved["parts"]; colliders: RAPIER.ColliderDesc[]; colliderDefinitionPaths: Array<number[] | undefined> } {
    if (!nodes || nodes.length === 0) {
      return { resolvedParts: [], colliders: [], colliderDefinitionPaths: [] };
    }

    const resolvedParts: BodyResolvedNode[] = [];
    const colliders: RAPIER.ColliderDesc[] = [];
    const colliderDefinitionPaths: Array<number[] | undefined> = [];

    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const definitionPath = [...parentDefinitionPath, index];
      if (isGroup(node)) {
        const groupResolved = this.resolveGroupNode(ctx, node, parentAccum, definitionPath);
        resolvedParts.push(...groupResolved.resolvedParts);
        colliders.push(...groupResolved.colliders);
        colliderDefinitionPaths.push(...groupResolved.colliderDefinitionPaths);
      } else {
        const { resolvedPart, colliders: partColliders, colliderDefinitionPaths: partColliderDefinitionPaths } = this.resolvePartRecursive(ctx, node, parentAccum, definitionPath);
        resolvedParts.push(resolvedPart);
        for (const c of partColliders) colliders.push(c);
        colliderDefinitionPaths.push(...partColliderDefinitionPaths);
      }
    }

    return { resolvedParts, colliders, colliderDefinitionPaths };
  }

  private resolveGroupNode(
    ctx: ECSContext,
    group: GroupNode,
    parentAccum?: THREE.Matrix4,
    groupDefinitionPath: number[] = []
  ): { resolvedParts: BodyResolved["parts"]; colliders: RAPIER.ColliderDesc[]; colliderDefinitionPaths: Array<number[] | undefined> } {
    const groupLocal = this.buildLocalMatrix(group) || new THREE.Matrix4();
    const combined = (parentAccum ? parentAccum.clone() : new THREE.Matrix4()).multiply(groupLocal);

    const operation = this.normalizeGroupOperation(group.operation);
    if (operation.type === "none") {
      const childResolution = this.resolveSiblingNodes(ctx, group.children ?? [], combined, groupDefinitionPath);
      const groupResolved: BodyResolvedGroupNode = {
        type: 'group',
        operation,
        definitionPath: groupDefinitionPath,
        localTransform: this.buildLocalMatrix(group),
        tag: group.tag,
        children: childResolution.resolvedParts,
      };
      return { resolvedParts: [groupResolved], colliders: childResolution.colliders, colliderDefinitionPaths: childResolution.colliderDefinitionPaths };
    }

    if (this.isMeshOperation(operation)) {
      const childResolution = this.resolveSiblingNodes(ctx, group.children ?? [], combined, groupDefinitionPath);
      if (operation.type === 'mirror') {
        this.applyMirrorSourceSideConstraint(childResolution.resolvedParts, operation);
        childResolution.resolvedParts = this.buildMirroredChildren(childResolution.resolvedParts, operation);
      } else {
        this.applyGroupMeshOperation(childResolution.resolvedParts, operation);
      }
      const { colliders, colliderDefinitionPaths } = this.buildCollidersFromResolvedParts(childResolution.resolvedParts);
      const groupResolved: BodyResolvedGroupNode = {
        type: 'group',
        operation,
        definitionPath: groupDefinitionPath,
        localTransform: this.buildLocalMatrix(group),
        tag: group.tag,
        children: childResolution.resolvedParts,
      };
      return { resolvedParts: [groupResolved], colliders, colliderDefinitionPaths };
    }

    if (this.isPlacementOperation(operation)) {
      const childResolution = this.resolveSiblingNodes(ctx, group.children ?? [], combined, groupDefinitionPath);
      const placedChildren = this.buildPlacedChildren(childResolution.resolvedParts, operation);
      const { colliders, colliderDefinitionPaths } = this.buildCollidersFromResolvedParts(placedChildren);

      const groupResolved: BodyResolvedGroupNode = {
        type: 'group',
        operation,
        definitionPath: groupDefinitionPath,
        localTransform: this.buildLocalMatrix(group),
        tag: group.tag,
        children: placedChildren,
      };
      return { resolvedParts: [groupResolved], colliders, colliderDefinitionPaths };
    }

    // Build index-aware candidate list so proxy meshes carry correct GroupNode child indices.
    const childrenWithIndex = (group.children ?? []).map((node, i) => ({ node, childIndex: i }));
    const primitiveEntries = childrenWithIndex.filter(({ node }) => isPrimitive(node)) as Array<{ node: Primitive; childIndex: number }>;
    const csgCandidateEntries = primitiveEntries.filter(({ node }) => !this.isUnsupportedForCSG(node));
    const csgCandidates = csgCandidateEntries.map(e => e.node);
    const csgCandidateIndices = csgCandidateEntries.map(e => e.childIndex);

    const csgGroup = this.resolvePrimitiveCSGGroup(ctx, csgCandidates, combined, operation.type, csgCandidateIndices, groupDefinitionPath);
    if (!csgGroup || !csgGroup.resolvedPart) {
      const childResolution = this.resolveSiblingNodes(ctx, group.children ?? [], combined, groupDefinitionPath);
      const groupResolved: BodyResolvedGroupNode = {
        type: 'group',
        operation,
        definitionPath: groupDefinitionPath,
        localTransform: this.buildLocalMatrix(group),
        tag: group.tag,
        children: childResolution.resolvedParts,
      };
      return { resolvedParts: [groupResolved], colliders: childResolution.colliders, colliderDefinitionPaths: childResolution.colliderDefinitionPaths };
    }

    const resolvedParts: BodyResolvedNode[] = [];
    const colliders: RAPIER.ColliderDesc[] = [];
    const colliderDefinitionPaths: Array<number[] | undefined> = [];
    let csgInserted = false;

    for (let childIndex = 0; childIndex < (group.children ?? []).length; childIndex++) {
      const node = (group.children ?? [])[childIndex];
      const childPath = [...groupDefinitionPath, childIndex];
      if (isPrimitive(node) && csgGroup.participating.has(node)) {
        if (!csgInserted) {
          csgGroup.resolvedPart.tag = group.tag ?? csgGroup.resolvedPart.tag;
          resolvedParts.push(csgGroup.resolvedPart);
          colliders.push(...csgGroup.colliders);
          colliderDefinitionPaths.push(...csgGroup.colliderDefinitionPaths);
          csgInserted = true;
        }
        continue;
      }

      if (isGroup(node)) {
        const nested = this.resolveGroupNode(ctx, node, combined, childPath);
        resolvedParts.push(...nested.resolvedParts);
        colliders.push(...nested.colliders);
        colliderDefinitionPaths.push(...nested.colliderDefinitionPaths);
      } else {
        const { resolvedPart, colliders: partColliders, colliderDefinitionPaths: partColliderDefinitionPaths } = this.resolvePartRecursive(ctx, node, combined, childPath);
        resolvedParts.push(resolvedPart);
        colliders.push(...partColliders);
        colliderDefinitionPaths.push(...partColliderDefinitionPaths);
      }
    }

    if (!csgInserted) {
      csgGroup.resolvedPart.tag = group.tag ?? csgGroup.resolvedPart.tag;
      resolvedParts.push(csgGroup.resolvedPart);
      colliders.push(...csgGroup.colliders);
      colliderDefinitionPaths.push(...csgGroup.colliderDefinitionPaths);
    }

    const groupResolved: BodyResolvedGroupNode = {
      type: 'group',
      operation,
      definitionPath: groupDefinitionPath,
      localTransform: this.buildLocalMatrix(group),
      tag: group.tag,
      children: resolvedParts,
    };

    return { resolvedParts: [groupResolved], colliders, colliderDefinitionPaths };
  }

  private resolvePrimitiveCSGGroup(
    ctx: ECSContext,
    primitives: Primitive[],
    parentAccum: THREE.Matrix4 | undefined,
    operation: Extract<GroupOperationType, "union" | "subtract" | "intersect" | "exclude">,
    /** Index of each primitive in its parent GroupNode's `children` array. */
    childIndices?: number[],
    groupDefinitionPath: number[] = []
  ): {
    resolvedPart: BodyResolved["parts"][0] | null;
    colliders: RAPIER.ColliderDesc[];
    colliderDefinitionPaths: Array<number[] | undefined>;
    participating: Set<Primitive>;
  } | null {
    const csgEvalStart = performance.now();
    const meshModule = getModule<MeshModule>(ctx, "mesh");
    const materialModule = getModule(ctx, "material");
    const colliderModule = getModule<ReturnType<typeof ColliderModule.colliderModule>>(ctx, "collider");
    const evaluator = new Evaluator();
    evaluator.useGroups = true;

    let combinedBrush: Brush | null = null;
    const participating = new Set<Primitive>();
    let totalInputTriangles = 0;
    let inputBudgetWarned = false;
    // Track per-primitive index within `primitives` and its entity-local geometry for proxy meshes.
    const participatingInfo: Array<{ primitive: Primitive; arrayIndex: number; entityLocalGeometry: THREE.BufferGeometry }> = [];

    for (let pi = 0; pi < primitives.length; pi++) {
      const primitive = primitives[pi];
      if (this.isUnsupportedForCSG(primitive)) {
        console.warn(`[BodyModule] Skipping unsupported CSG primitive "${primitive.geometry.type}" and continuing.`);
        continue;
      }

      try {
        const meshId = meshModule.resolve(toMeshDefinition(primitive));
        const geometry = meshModule.get(meshId);
        const materialId = materialModule.resolve(primitive.material || { type: "solid" });
        const material = materialModule.get(materialId);

        const localTransform = this.buildLocalMatrix(primitive) || new THREE.Matrix4();
        const combined = (parentAccum ? parentAccum.clone() : new THREE.Matrix4()).multiply(localTransform);
        const transformed = geometry.clone().applyMatrix4(combined);
        const inputTriangles = triangleCount(transformed);
        totalInputTriangles += inputTriangles;

        if (!inputBudgetWarned && totalInputTriangles > CSG_INPUT_TRIANGLE_BUDGET_WARN) {
          inputBudgetWarned = true;
          console.warn('[BodyModule][CSG] Input triangle budget exceeded', {
            operation,
            totalInputTriangles,
            budget: CSG_INPUT_TRIANGLE_BUDGET_WARN,
            candidateCount: primitives.length,
          });
        }

        const brush = new Brush(transformed, material);

        if (combinedBrush === null) {
          combinedBrush = brush;
        } else {
          const csgOp =
            operation === "subtract"
              ? SUBTRACTION
              : operation === "intersect"
                ? INTERSECTION
                : operation === "exclude"
                  ? DIFFERENCE
                  : ADDITION;
          combinedBrush = evaluator.evaluate(combinedBrush, brush, csgOp);
        }

        participating.add(primitive);
        participatingInfo.push({ primitive, arrayIndex: pi, entityLocalGeometry: transformed });
      } catch (error) {
        console.warn("[BodyModule] Failed CSG operand, skipping and continuing:", error);
      }
    }

    if (!combinedBrush || participating.size < 2) {
      return null;
    }

    let combinedGeometry = combinedBrush.geometry.clone();
    if (!combinedGeometry.index) {
      combinedGeometry = BufferGeometryUtils.mergeVertices(combinedGeometry);
    }
    if (!combinedGeometry.getAttribute("normal")) {
      combinedGeometry.computeVertexNormals();
    }

    const resultTriangles = triangleCount(combinedGeometry);
    if (resultTriangles > CSG_RESULT_TRIANGLE_BUDGET_WARN) {
      console.warn('[BodyModule][CSG] Result triangle budget exceeded', {
        operation,
        resultTriangles,
        budget: CSG_RESULT_TRIANGLE_BUDGET_WARN,
        totalInputTriangles,
      });
    }

    // Build source proxy list: one entry per participating primitive.
    const csgSourceProxies: CsgSourceProxy[] = participatingInfo.map(({ arrayIndex, entityLocalGeometry }) => ({
      geometry: entityLocalGeometry.clone(),
      sourceIndex: childIndices?.[arrayIndex] ?? arrayIndex,
    }));

    const resolvedPart: BodyResolved["parts"][0] = {
      type: "geometry",
      mesh: combinedGeometry,
      material: combinedBrush.material as any,
      renderTransformBaked: true,
      ignoreCollisions: false,
      children: [],
      definitionPath: groupDefinitionPath,
      csgSourceProxies,
    };

    const colliders: RAPIER.ColliderDesc[] = [];
    const colliderDefinitionPaths: Array<number[] | undefined> = [];
    const includeColliders = Array.from(participating).some((primitive) => !primitive.ignoreCollisions);

    if (includeColliders) {
      const colliderId = colliderModule.resolve({ type: "fromMesh", params: { mesh: combinedGeometry } });
      const colliderResolved = colliderModule.get(colliderId);
      for (const desc of colliderResolved.getDesc()) {
        colliders.push(desc);
        colliderDefinitionPaths.push(groupDefinitionPath);
      }
    }

    for (const primitiveInfo of participatingInfo) {
      const primitive = primitiveInfo.primitive;
      if (!primitive.children || primitive.children.length === 0) continue;
      const localTransform = this.buildLocalMatrix(primitive) || new THREE.Matrix4();
      const combined = (parentAccum ? parentAccum.clone() : new THREE.Matrix4()).multiply(localTransform);
      const primitivePathIndex = childIndices?.[primitiveInfo.arrayIndex] ?? primitiveInfo.arrayIndex;
      const childResolution = this.resolveSiblingNodes(ctx, primitive.children, combined, [...groupDefinitionPath, primitivePathIndex]);
      this.prependLocalTransformToUnbaked(childResolution.resolvedParts, combined);
      if (!resolvedPart.children) resolvedPart.children = [];
      resolvedPart.children.push(...childResolution.resolvedParts);
      colliders.push(...childResolution.colliders);
      colliderDefinitionPaths.push(...childResolution.colliderDefinitionPaths);
    }

    const csgEvalDurationMs = performance.now() - csgEvalStart;
    if (csgEvalDurationMs > CSG_EVAL_SLOW_MS_WARN) {
      console.warn('[BodyModule][CSG] Slow CSG evaluation', {
        operation,
        durationMs: Number(csgEvalDurationMs.toFixed(2)),
        operandCount: participating.size,
        totalInputTriangles,
        resultTriangles,
      });
    }

    return { resolvedPart, colliders, colliderDefinitionPaths, participating };
  }

  private normalizeGroupOperation(operation: GroupNode["operation"] | undefined): GroupOperation {
    const groupOperation = getGroupOperationResolver(this.ctx);
    return groupOperation.resolveOperation(operation);
  }

  private isCsgOperationType(operation: GroupOperation): operation is Extract<GroupOperation, { type: "union" | "subtract" | "intersect" | "exclude" }> {
    const groupOperation = getGroupOperationResolver(this.ctx);
    return groupOperation.isCsgOperation(operation);
  }

  private isMeshOperation(operation: GroupOperation): operation is Extract<GroupOperation, { type: "taper" | "mirror" }> {
    const groupOperation = getGroupOperationResolver(this.ctx);
    return groupOperation.isMeshOperation(operation);
  }

  private isPlacementOperation(operation: GroupOperation): operation is Extract<GroupOperation, { type: "place" }> {
    const groupOperation = getGroupOperationResolver(this.ctx);
    return groupOperation.isPlacementOperation(operation);
  }

  private isStochasticPlacement(placement: PlacementDefinition): boolean {
    if (placement.type === 'random' || placement.type === 'cluster' || placement.type === 'poisson') {
      return true;
    }
    if (placement.type === 'grid') {
      const jitter = placement.params?.jitter;
      return Number.isFinite(jitter) && Math.abs(jitter) > 0;
    }
    return false;
  }

  private resolvePlacementPositions(operation: Extract<GroupOperation, { type: "place" }>): Array<{ x: number; y: number; z: number }> {
    const placementModule = getModule<PlacementModule>(this.ctx, 'placement');
    if (!placementModule) {
      throw new Error("Missing required module 'placement'");
    }

    const placement = operation.params.placement as PlacementDefinition;
    const seed = operation.params.seed;

    if (this.isStochasticPlacement(placement) && !Number.isFinite(seed)) {
      throw new Error(`Group operation 'place' requires a finite seed for stochastic placement type '${placement.type}'`);
    }

    if (Number.isFinite(seed)) {
      return withSeededRandom(seed as number, () => placementModule.generate(placement));
    }

    return placementModule.generate(placement);
  }

  private buildPlacedChildren(
    sourceChildren: BodyResolvedNode[],
    operation: Extract<GroupOperation, { type: "place" }>
  ): BodyResolvedNode[] {
    const positions = this.resolvePlacementPositions(operation);
    const placed: BodyResolvedNode[] = [];

    for (let index = 0; index < positions.length; index++) {
      const position = positions[index];
      const clones = sourceChildren.map((child) => this.cloneResolvedNode(child));
      const wrapper: BodyResolvedGroupNode = {
        type: 'group',
        operation: { type: 'none', params: {} },
        localTransform: this.buildPlacementWrapperTransform(operation, positions, index),
        children: clones,
      };
      placed.push(wrapper);
    }

    return placed;
  }

  private resolvePlaceOrientationYaw(
    operation: Extract<GroupOperation, { type: 'place' }>,
    positions: Array<{ x: number; y: number; z: number }>,
    index: number,
  ): number | undefined {
    const orientation = operation.params?.orientation ?? 'none';
    if (orientation === 'none') {
      return undefined;
    }

    if (orientation === 'fixed') {
      return Number.isFinite(operation.params?.fixedYaw) ? operation.params.fixedYaw : 0;
    }

    const current = positions[index];
    if (!current) {
      return undefined;
    }

    if (orientation === 'tangent') {
      const prev = index > 0 ? positions[index - 1] : undefined;
      const next = index < positions.length - 1 ? positions[index + 1] : undefined;

      let dx = 0;
      let dz = 0;
      if (prev && next) {
        dx = next.x - prev.x;
        dz = next.z - prev.z;
      } else if (next) {
        dx = next.x - current.x;
        dz = next.z - current.z;
      } else if (prev) {
        dx = current.x - prev.x;
        dz = current.z - prev.z;
      }

      if (Math.hypot(dx, dz) <= 1e-6) {
        return undefined;
      }

      return Math.atan2(dx, dz);
    }

    if (orientation === 'radial') {
      const placement = operation.params?.placement as PlacementDefinition | undefined;
      let center: { x: number; y: number; z: number } | undefined;

      if (placement?.type === 'circle' || placement?.type === 'spiral') {
        center = placement.params?.center;
      } else if (placement?.type === 'line') {
        const start = placement.params?.start;
        const end = placement.params?.end;
        if (start && end) {
          center = {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
            z: (start.z + end.z) / 2,
          };
        }
      }

      if (!center && positions.length > 0) {
        const total = positions.reduce(
          (acc, pos) => {
            acc.x += pos.x;
            acc.y += pos.y;
            acc.z += pos.z;
            return acc;
          },
          { x: 0, y: 0, z: 0 },
        );
        center = {
          x: total.x / positions.length,
          y: total.y / positions.length,
          z: total.z / positions.length,
        };
      }

      if (!center) {
        return undefined;
      }

      const dx = current.x - center.x;
      const dz = current.z - center.z;
      if (Math.hypot(dx, dz) <= 1e-6) {
        return undefined;
      }

      return Math.atan2(dx, dz);
    }

    return undefined;
  }

  private buildPlacementWrapperTransform(
    operation: Extract<GroupOperation, { type: 'place' }>,
    positions: Array<{ x: number; y: number; z: number }>,
    index: number,
  ): THREE.Matrix4 {
    const position = positions[index];
    const yaw = this.resolvePlaceOrientationYaw(operation, positions, index);

    if (!Number.isFinite(yaw)) {
      return new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
    }

    const transform = new THREE.Matrix4().makeRotationY(yaw as number);
    transform.setPosition(position.x, position.y, position.z);
    return transform;
  }

  private applyGroupMeshOperation(parts: BodyResolvedNode[], operation: Extract<GroupOperation, { type: "taper" | "mirror" }>): void {
    const applyToNode = (node: BodyResolvedNode): void => {
      if (node.type === 'geometry') {
        const localTransform = node.localTransform;
        if (localTransform) {
          node.mesh = node.mesh.clone().applyMatrix4(localTransform);
          node.renderTransformBaked = true;
          node.localTransform = undefined;
          if (node.children && node.children.length > 0) {
            this.prependLocalTransformToUnbaked(node.children, localTransform);
          }
        }

        node.mesh = applyGroupOperationToGeometry(node.mesh, operation);
        node.hasMirrorSymmetry = false;
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) applyToNode(child);
      }
    };

    for (const part of parts) applyToNode(part);

    console.warn('[BodyModule][Physics] Group mesh operation colliders rebuilt from deformed geometry; motion policy determines runtime simplification.', {
      operation: operation.type,
    });
  }

  private cloneResolvedNode(node: BodyResolvedNode): BodyResolvedNode {
    if (node.type === 'group') {
      return {
        ...node,
        localTransform: node.localTransform ? node.localTransform.clone() : undefined,
        children: (node.children || []).map((child) => this.cloneResolvedNode(child)),
      };
    }

    if (node.type === 'light') {
      return {
        ...node,
        light: node.light.clone(),
        localTransform: node.localTransform ? node.localTransform.clone() : undefined,
        children: (node.children || []).map((child) => this.cloneResolvedNode(child)),
      };
    }

    return {
      ...node,
      mesh: node.mesh.clone(),
      material: node.material,
      localTransform: node.localTransform ? node.localTransform.clone() : undefined,
      csgSourceProxies: node.csgSourceProxies?.map((proxy) => ({
        sourceIndex: proxy.sourceIndex,
        geometry: proxy.geometry.clone(),
      })),
      children: (node.children || []).map((child) => this.cloneResolvedNode(child)),
    };
  }

  private buildMirrorTransformMatrix(operation: Extract<GroupOperation, { type: 'mirror' }>): THREE.Matrix4 {
    const axis = operation.params?.axis ?? 'x';
    const planeOffset = Number.isFinite(operation.params?.planeOffset) ? operation.params.planeOffset : 0;
    const matrix = new THREE.Matrix4();
    const translateA = new THREE.Matrix4();
    const translateB = new THREE.Matrix4();
    const reflect = new THREE.Matrix4();

    if (axis === 'x') {
      translateA.makeTranslation(-planeOffset, 0, 0);
      reflect.makeScale(-1, 1, 1);
      translateB.makeTranslation(planeOffset, 0, 0);
    } else if (axis === 'y') {
      translateA.makeTranslation(0, -planeOffset, 0);
      reflect.makeScale(1, -1, 1);
      translateB.makeTranslation(0, planeOffset, 0);
    } else {
      translateA.makeTranslation(0, 0, -planeOffset);
      reflect.makeScale(1, 1, -1);
      translateB.makeTranslation(0, 0, planeOffset);
    }

    matrix.multiply(translateB).multiply(reflect).multiply(translateA);
    return matrix;
  }

  private buildMirroredChildren(
    children: BodyResolvedNode[],
    operation: Extract<GroupOperation, { type: 'mirror' }>
  ): BodyResolvedNode[] {
    const mirrorTransform = this.buildMirrorTransformMatrix(operation);
    const mirrored: BodyResolvedNode[] = [];

    for (const child of children) {
      const clone = this.cloneResolvedNode(child);
      const wrapper: BodyResolvedGroupNode = {
        type: 'group',
        operation: { type: 'none', params: {} },
        localTransform: mirrorTransform.clone(),
        children: [clone],
      };
      mirrored.push(wrapper);
    }

    return [...children, ...mirrored];
  }

  private applyMirrorSourceSideConstraint(
    parts: BodyResolvedNode[],
    operation: Extract<GroupOperation, { type: 'mirror' }>
  ): void {
    const sourceSide = operation.params?.sourceSide;
    if (!sourceSide || sourceSide === 'both') return;
    const axis = operation.params?.axis ?? 'x';
    const planeOffset = Number.isFinite(operation.params?.planeOffset) ? operation.params.planeOffset : 0;

    const clampGeometry = (node: BodyResolvedNode) => {
      if (node.type === 'geometry') {
        const source = node.mesh.getIndex() ? node.mesh.toNonIndexed() : node.mesh.clone();
        const position = source.getAttribute('position') as THREE.BufferAttribute | undefined;
        if (position) {
          const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
          for (let i = 0; i < position.count; i++) {
            const value = position.getComponent(i, axisIndex);
            if (sourceSide === 'positive' && value < planeOffset) {
              position.setComponent(i, axisIndex, planeOffset);
            } else if (sourceSide === 'negative' && value > planeOffset) {
              position.setComponent(i, axisIndex, planeOffset);
            }
          }
          position.needsUpdate = true;
          source.computeVertexNormals();
          source.computeBoundingBox();
          node.mesh = source;
          node.renderTransformBaked = true;
        }
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) clampGeometry(child);
      }
    };

    for (const part of parts) clampGeometry(part);
  }

  private isUnsupportedForCSG(primitive: Primitive): boolean {
    if (primitive.geometry.type === "image") return true;
    if (primitive.geometry.type === "displacedPlane") return true;
    if (primitive.geometry.type === "lathe" && primitive.geometry.params.capped === false) return true;
    if (primitive.geometry.type === "none") return true;
    return false;
  }

  private prependLocalTransformToUnbaked(parts: BodyResolvedNode[], prefix: THREE.Matrix4): void {
    for (const part of parts) {
      if (part.renderTransformBaked) continue;
      const existing = part.localTransform ? part.localTransform.clone() : new THREE.Matrix4();
      part.localTransform = prefix.clone().multiply(existing);
      if (part.children && part.children.length > 0) {
        this.prependLocalTransformToUnbaked(part.children, prefix);
      }
    }
  }

  private collectGeometryNodes(parts: BodyResolvedNode[]): BodyResolvedGeometryNode[] {
    const out: BodyResolvedGeometryNode[] = [];
    const visit = (node: BodyResolvedNode) => {
      if (node.type === 'geometry') out.push(node);
      if (node.children && node.children.length > 0) {
        for (const child of node.children) visit(child);
      }
    };
    for (const part of parts) visit(part);
    return out;
  }

  private containsGroupMeshOperations(parts: BodyResolvedNode[]): boolean {
    const visit = (node: BodyResolvedNode): boolean => {
      if (node.type === 'group' && this.isMeshOperation(node.operation)) {
        return true;
      }
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (visit(child)) return true;
        }
      }
      return false;
    };

    for (const part of parts) {
      if (visit(part)) return true;
    }
    return false;
  }

  private buildCollidersFromResolvedParts(parts: BodyResolvedNode[]): { colliders: RAPIER.ColliderDesc[]; colliderDefinitionPaths: Array<number[] | undefined> } {
    const colliderModule = getModule<ReturnType<typeof ColliderModule.colliderModule>>(this.ctx, 'collider');
    const colliders: RAPIER.ColliderDesc[] = [];
    const colliderDefinitionPaths: Array<number[] | undefined> = [];

    const visit = (node: BodyResolvedNode, parentMatrix: THREE.Matrix4) => {
      const local = node.localTransform ?? new THREE.Matrix4();
      const world = parentMatrix.clone().multiply(local);

      if (node.type === 'geometry' && !node.ignoreCollisions) {
        const mesh = node.mesh.clone().applyMatrix4(world);
        const colliderId = colliderModule.resolve({ type: 'fromMesh', params: { mesh } });
        const colliderResolved = colliderModule.get(colliderId);
        for (const desc of colliderResolved.getDesc()) {
          colliders.push(desc);
          colliderDefinitionPaths.push(node.definitionPath);
        }
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          visit(child, world);
        }
      }
    };

    const identity = new THREE.Matrix4();
    for (const part of parts) {
      visit(part, identity);
    }

    return { colliders, colliderDefinitionPaths };
  }

  // Unified resolver for both primitives and lights
  private resolvePartRecursive(
    ctx: ECSContext,
    part: Node,
    parentAccum?: THREE.Matrix4,
    definitionPath: number[] = []
  ): {
    resolvedPart: BodyResolved["parts"][0];
    colliders: RAPIER.ColliderDesc[];
    colliderDefinitionPaths: Array<number[] | undefined>;
  } {
    // Build this node's local transform
    const localTransform = this.buildLocalMatrix(part);

    // Combined matrix for collider placement relative to the rigid body
    const combined = (parentAccum ? parentAccum.clone() : new THREE.Matrix4()).multiply(localTransform ?? new THREE.Matrix4());

    const colliders: RAPIER.ColliderDesc[] = [];
    const colliderDefinitionPaths: Array<number[] | undefined> = [];

    // Check if this is a Light or Primitive
    if (isLight(part)) {
      // Handle Light
      let threeLight: THREE.Light;

      if (part.light.type === "point") {
        const pointLight = new THREE.PointLight(
          part.light.params.color as any,
          part.light.params.intensity,
          part.light.params.range
        );
        threeLight = pointLight;
      } else if (part.light.type === "spot") {
        const spotLight = new THREE.SpotLight(
          part.light.params.color as any,
          part.light.params.intensity,
          part.light.params.range,
          part.light.params.beamAngle
        );

        // Set direction if provided
        if (part.light.params.direction) {
          const dir = this.vector3ToThree(part.light.params.direction);
          spotLight.target.position.copy(dir);
        }

        spotLight.position.set(0, 0, 0); // Light position is at origin of local space
        spotLight.penumbra = 0.5;

        threeLight = spotLight;
      } else {
        // Fallback to point light
        threeLight = new THREE.PointLight(0xffffff, 1, 10);
      }

      const resolvedPart: BodyResolved["parts"][0] = {
        type: "light",
        light: threeLight,
        definitionPath,
        localTransform: localTransform,
        tag: part.tag,
        children: [],
      };

      // Recurse into children
      if (part.children && part.children.length > 0) {
        const childResolution = this.resolveSiblingNodes(ctx, part.children, combined, definitionPath);
        if (!resolvedPart.children) resolvedPart.children = [];
        resolvedPart.children.push(...childResolution.resolvedParts);
        for (const c of childResolution.colliders) colliders.push(c);
        colliderDefinitionPaths.push(...childResolution.colliderDefinitionPaths);
      }

      return { resolvedPart, colliders, colliderDefinitionPaths };
    } else  {
      const prim = part as Primitive;
      // Handle Primitive
      const meshModule = getModule<MeshModule>(ctx, "mesh");
      const materialModule = getModule(ctx, "material");

      // Resolve mesh and material
      const meshId = meshModule.resolve(toMeshDefinition(prim));
      const materialId = materialModule.resolve(prim.material || { type: "solid" });

      const ignoreCollisions = prim.ignoreCollisions ?? prim.geometry.type === 'image';

      const resolvedPart: BodyResolved["parts"][0] = {
        type: "geometry",
        mesh: meshModule.get(meshId),
        material: materialModule.get(materialId),
        definitionPath,
        localTransform: localTransform,
        tag: part.tag,
        ignoreCollisions,
        hasMirrorSymmetry: false,
        children: [],
      };

      // Prepare decomposed transforms (including scale) for collider placement and sizing
      const t = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      combined.decompose(t, q, s);

      // Create collider for this primitive with scale applied
      if (!ignoreCollisions) {
        const colliderModule = getModule<ReturnType<typeof ColliderModule.colliderModule>>(this.ctx, "collider");
        const colliderDef: ColliderModule.ColliderDefinition = {
          type: "fromPrimitive",
          params: {
            geometry: prim.geometry ?? { type: "none", params: {} },
            scale: { x: s.x, y: s.y, z: s.z },
          },
        };
        const colliderId = colliderModule.resolve(colliderDef);
        const colliderResolved = colliderModule.get(colliderId);

        colliderResolved.getDesc().forEach((desc) => {
          // Need to get current translation and rotation 
          // and convert from local -> world space, then apply.
          // Rapier expects these in world space since there is no parent hierarchy in colliders.
          const dt = desc.translation;
          const worldPos = new THREE.Vector3(dt.x, dt.y, dt.z).applyMatrix4(combined);
          desc.setTranslation(worldPos.x, worldPos.y, worldPos.z);

          // Combine rotations: world = parent * local
          const dq = desc.rotation;
          const localQ = new THREE.Quaternion(dq.x, dq.y, dq.z, dq.w);
          const worldQ = q.clone().multiply(localQ);
          desc.setRotation(worldQ);
          colliders.push(desc);
          colliderDefinitionPaths.push(definitionPath);
        });
      }

      // Recurse into children
      if (part.children && part.children.length > 0) {
        const childResolution = this.resolveSiblingNodes(ctx, part.children, combined, definitionPath);
        if (!resolvedPart.children) resolvedPart.children = [];
        resolvedPart.children.push(...childResolution.resolvedParts);
        for (const c of childResolution.colliders) colliders.push(c);
        colliderDefinitionPaths.push(...childResolution.colliderDefinitionPaths);
      }

      return { resolvedPart, colliders, colliderDefinitionPaths };
    }
  }

  // Resolve composite with interior flag - generates hollowed-out geometry using CSG
  private resolveCompositeWithInterior(
    ctx: ECSContext,
    parts: Node[]
  ): BodyResolved {
    try {
      const meshModule = getModule<MeshModule>(ctx, "mesh");
      const materialModule = getModule(ctx, "material");
      const colliderModule = getModule<ReturnType<typeof ColliderModule.colliderModule>>(ctx, "collider");

      // Separate primitives and lights
      const primitives: Primitive[] = [];
      const lights: Light[] = [];
      for (const part of parts) {
        if (isLight(part)) {
          lights.push(part);
        } else if (isPrimitive(part)) {
          primitives.push(part);
        }
      }

      // Resolve lights separately
      const resolvedLightParts: BodyResolved["parts"] = [];
      const lightColliders: RAPIER.ColliderDesc[] = [];
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i];
        const { resolvedPart, colliders } = this.resolvePartRecursive(ctx, light, undefined, [i]);
        resolvedLightParts.push(resolvedPart);
        for (const c of colliders) lightColliders.push(c);
      }

      // Generate primitive geometries without colliders first
      const primitiveGeometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4; primitive: Primitive }[] = [];
      const excludedGeometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4; primitive: Primitive }[] = [];

      // Process each primitive and flatten the hierarchy
      for (const primitive of primitives) {
        this.collectPrimitiveGeometriesRecursive(ctx, primitive, new THREE.Matrix4(), primitiveGeometries, excludedGeometries);
      }

      // Filter primitives by size heuristic (min bounds dimension > 3x wall thickness)
      const validGeometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4; primitive: Primitive }[] = [];

      for (const item of primitiveGeometries) {
        validGeometries.push(item);
      }

      if (validGeometries.length === 0) {
        console.warn("No geometries large enough for interior hollowing, falling back to normal composite");
        return this.resolveFallbackComposite(ctx, parts);
      }

      // Use CSG to union all valid primitives
      const evaluator = new Evaluator();
      evaluator.useGroups = true; // Preserve original mesh materials per section
      let combinedBrush: Brush | null = null;

      for (const { geometry, transform, primitive } of validGeometries) {
        try {
          // Create a copy of the geometry and apply the transform
          const transformedGeometry = geometry.clone().applyMatrix4(transform);
          const mat = materialModule.get(materialModule.resolve(primitive.material || { type: "solid" }));
          const brush = new Brush(transformedGeometry, mat);

          if (combinedBrush === null) {
            combinedBrush = brush;
          } else {
            combinedBrush = evaluator.evaluate(combinedBrush, brush, ADDITION);
          }
        } catch (error) {
          console.warn("Failed to process geometry for CSG union:", error);
          continue;
        }
      }

      // --- Replace the block after creating combinedBrush and combinedGeometry ---
      if (!combinedBrush) {
        console.warn("Failed to create combined brush, falling back to normal composite");
        return this.resolveFallbackComposite(ctx, parts);
      }

      // Use the geometry straight from the brush — preserve index + groups
      let combinedGeometry = combinedBrush.geometry.clone();

      // Ensure we keep index and groups (these are what make material arrays work)
      if (!combinedGeometry.index) {
        // If the CSG output was non-indexed, index it for stability
        combinedGeometry = BufferGeometryUtils.mergeVertices(combinedGeometry); // returns indexed geometry
      }

      // If normals are missing, compute them (preserve groups)
      if (!combinedGeometry.getAttribute('normal')) {
        combinedGeometry.computeVertexNormals();
      }

      // Make materials double-sided rather than duplicating geometry
      const brushMaterial = combinedBrush.material;
      if (Array.isArray(brushMaterial)) {
        for (const m of brushMaterial) {
          if (m && (m as THREE.Material).hasOwnProperty('side')) {
            (m as any).side = THREE.DoubleSide;
            (m as any).shadowSide = THREE.FrontSide;
          }
        }
      } else if (brushMaterial) {
        (brushMaterial as any).side = THREE.DoubleSide;
        (brushMaterial as any).shadowSide = THREE.FrontSide;
      }

      // Generate mesh collider from the combined outer geometry only (use the indexed geometry)
      const colliderDef: ColliderModule.ColliderDefinition = {
        type: "fromMesh",
        params: { mesh: combinedGeometry }
      };
      const colliderId = colliderModule.resolve(colliderDef);
      const colliderResolved = colliderModule.get(colliderId);
      const colliders = colliderResolved.getDesc();

      // DON'T replace groups/indices here — keep them intact.
      // If you need to add other geometries (too-small / excluded), merge them with groups preserved:
      const finalGeometries: THREE.BufferGeometry[] = [combinedGeometry];
      for (const { geometry, transform } of excludedGeometries) {
        const transformedGeometry = geometry.clone().applyMatrix4(transform);
        finalGeometries.push(transformedGeometry);
      }

      let finalGeometry: THREE.BufferGeometry;
      if (finalGeometries.length === 1) {
        finalGeometry = finalGeometries[0];
      } else {
        // mergeGeometries(..., true) attempts to preserve groups from each geometry as material groups
        try {
          finalGeometry = BufferGeometryUtils.mergeGeometries(finalGeometries, true);
          // If mergedGeometry lost normals, recompute
          if (!finalGeometry.getAttribute('normal')) finalGeometry.computeVertexNormals();
        } catch (error) {
          console.warn("Failed to merge geometries, using combinedGeometry only:", error);
          finalGeometry = combinedGeometry;
        }
      }

      const resolvedPart: BodyResolved["parts"][0] = {
        type: "geometry",
        mesh: finalGeometry,
        // @ts-ignore combinedBrush.material can be an array; accepted for multi-material geometry
        material: combinedBrush.material,
        ignoreCollisions: false,
        children: [],
      };

      const localBounds = calculateLocalBodyBounds([resolvedPart]);

      const finalColliders = [...colliders, ...lightColliders];
      return {
        parts: [resolvedPart, ...resolvedLightParts],
        colliders: finalColliders,
        colliderDefinitionPaths: finalColliders.map(() => undefined),
        localBounds
      };
    } catch (error) {
      console.warn("Failed to create interior geometry, falling back to normal composite:", error);
      return this.resolveFallbackComposite(ctx, parts);
    }
  }

  // Helper method to recursively collect primitive geometries with transforms
  private collectPrimitiveGeometriesRecursive(
    ctx: ECSContext,
    primitive: Primitive,
    parentTransform: THREE.Matrix4,
    geometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4; primitive: Primitive }[],
    excludedGeometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4; primitive: Primitive }[]
  ): void {
    const meshModule = getModule<MeshModule>(ctx, "mesh");

    // Get the mesh for this primitive
    const meshId = meshModule.resolve(toMeshDefinition(primitive));
    const geometry = meshModule.get(meshId);

    // Build local transform
    const localTransform = this.buildLocalMatrix(primitive) || new THREE.Matrix4();
    const combinedTransform = parentTransform.clone().multiply(localTransform);

    // Add to collection if not ignoring collisions
    if (!primitive.ignoreCollisions) {
      // Exclude displaced plane primitives immediately as they are never two-manifold
      if (primitive.geometry.type === "displacedPlane") {
        excludedGeometries.push({
          geometry: geometry.clone(),
          transform: combinedTransform,
          primitive
        });
      } else {
        geometries.push({
          geometry: geometry.clone(),
          transform: combinedTransform,
          primitive
        });
      }
    }

    // Recurse into children (only primitives, not lights)
    if (primitive.children && primitive.children.length > 0) {
      for (const child of primitive.children) {
        if (isPrimitive(child)) {
          this.collectPrimitiveGeometriesRecursive(ctx, child, combinedTransform, geometries, excludedGeometries);
        }
      }
    }
  }

  // Create two-sided geometry by duplicating and flipping winding order
  private createTwoSidedGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const originalPositions = geometry.getAttribute('position').array as Float32Array;
    const originalNormals = geometry.getAttribute('normal').array as Float32Array;
    const originalIndices = geometry.getIndex()?.array;
    const vertexCount = originalPositions.length / 3;

    // Duplicate positions and normals (flip normals for the second set)
    const doubledPositions = new Float32Array(originalPositions.length * 2);
    const doubledNormals = new Float32Array(originalNormals.length * 2);
    doubledPositions.set(originalPositions, 0);
    doubledPositions.set(originalPositions, originalPositions.length);
    for (let i = 0; i < originalNormals.length; i++) {
      doubledNormals[i] = originalNormals[i]; // original
      doubledNormals[originalNormals.length + i] = -originalNormals[i]; // flipped
    }

    // Apply small offset to back faces to avoid z-fighting (move along flipped normal)
    // const EPSILON = 0.0001;
    // for (let i = 0; i < vertexCount; i++) {
    //   const idx = i * 3;
    //   doubledPositions[originalPositions.length + idx] += originalNormals[idx] * EPSILON;
    //   doubledPositions[originalPositions.length + idx + 1] += originalNormals[idx + 1] * EPSILON;
    //   doubledPositions[originalPositions.length + idx + 2] += originalNormals[idx + 2] * EPSILON;
    // }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(doubledPositions, 3));
    newGeometry.setAttribute('normal', new THREE.BufferAttribute(doubledNormals, 3));

    // Handle indices
    if (originalIndices) {
      const doubledIndices = new Uint32Array(originalIndices.length * 2);
      doubledIndices.set(originalIndices, 0);
      for (let i = 0; i < originalIndices.length; i += 3) {
        const base = originalIndices.length + i;
        doubledIndices[base] = originalIndices[i + 2] + vertexCount;
        doubledIndices[base + 1] = originalIndices[i + 1] + vertexCount;
        doubledIndices[base + 2] = originalIndices[i] + vertexCount;
      }
      newGeometry.setIndex(new THREE.BufferAttribute(doubledIndices, 1));
    }

    // ✅ Preserve and duplicate groups
    newGeometry.groups = [];
    for (const group of geometry.groups) {
      // Original group
      newGeometry.groups.push({
        start: group.start,
        count: group.count,
        materialIndex: group.materialIndex
      });
      // Flipped group (offset by index length)
      newGeometry.groups.push({
        start: group.start + (originalIndices?.length || 0),
        count: group.count,
        materialIndex: group.materialIndex
      });
    }

    return newGeometry;
  }

  // Fallback to normal composite resolution
  private resolveFallbackComposite(ctx: ECSContext, parts: Node[]): BodyResolved {
    const { resolvedParts, colliders, colliderDefinitionPaths } = this.resolveSiblingNodes(ctx, parts, undefined, []);
    const localBounds = calculateLocalBodyBounds(this.collectGeometryNodes(resolvedParts) as any);
    const hasGroupMeshOperations = this.containsGroupMeshOperations(resolvedParts);

    return { parts: resolvedParts, colliders, colliderDefinitionPaths, localBounds, hasGroupMeshOperations };
  }

  private buildLocalMatrix(node: Node): THREE.Matrix4 | undefined {
    if (!node.localPosition && !node.localRotation && !node.localScale) return undefined;

    const pos = node.localPosition
      ? this.vector3ToThree(node.localPosition)
      : new THREE.Vector3(0, 0, 0);
    const euler = node.localRotation
      ? new THREE.Euler(
        this.vector3ToThree(node.localRotation).x,
        this.vector3ToThree(node.localRotation).y,
        this.vector3ToThree(node.localRotation).z
      )
      : new THREE.Euler(0, 0, 0);
    const scale = node.localScale
      ? this.vector3ToThree(node.localScale)
      : new THREE.Vector3(1, 1, 1);

    const quat = new THREE.Quaternion().setFromEuler(euler);
    return new THREE.Matrix4().compose(pos, quat, scale);
  }

  private vector3ToThree(v: any): THREE.Vector3 {
    if (Array.isArray(v)) {
      return new THREE.Vector3(v[0], v[1], v[2]);
    }
    return new THREE.Vector3(v.x, v.y, v.z);
  }

  // Overload resolve
  resolve(def: string): number;
  resolve(def: Body): number;
  resolve(def: { parts: Node[]; hasInterior?: boolean }): number;
  resolve(def: string | Body | { parts: Node[]; hasInterior?: boolean }): number {
    if (typeof def === "string") {
      return super.resolve(def);
    }
    if ((def as Body).type) {
      return super.resolve(def as Body);
    }
    return super.resolve({ type: "composite", params: def as { parts: Node[]; hasInterior?: boolean } });
  }
}

function isLight(part: Node): part is Light {
  return (part as Light).light !== undefined;
}

function isPrimitive(part: Node): part is Primitive {
  return (part as Primitive).geometry !== undefined;
}

function isGroup(part: Node): part is GroupNode {
  return (part as GroupNode).type === "group";
}

export const bodyModule = (ctx: ECSContext) => new BodyModule(ctx);
