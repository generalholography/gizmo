import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { defineQuery, getEntityComponents, hasComponent } from 'bitecs';
import type { ECSContext } from '../../core/ecs';
import { getModule } from '../../core/ecs';
import { serializeWorld } from '../../core/serializeWorld';
import { Body, Info, MotionSource, StableID, Transform } from '../../core/components';
import * as Components from '../../core/components';
import { decode } from '../../utils/strings';
import type { BodyResolved } from '../../modules/body';
import type { MotionSourceResolved } from '../../modules/motionSource';
import type {
  BoundsSnapshot,
  EvaluatedEntity,
  SceneEvaluationCheckResult,
  SceneEvaluationFinding,
  SceneEvaluationOptions,
  SceneEvaluationReport,
  SceneEvaluationSeverity,
  SceneEvaluationStatus,
  SceneFacts,
  Vector3Snapshot,
} from './types';
export type {
  BoundsSnapshot,
  EvaluatedEntity,
  SceneEvaluationCheckId,
  SceneEvaluationCheckResult,
  SceneEvaluationFinding,
  SceneEvaluationOptions,
  SceneEvaluationProfile,
  SceneEvaluationReport,
  SceneEvaluationSeverity,
  SceneEvaluationStatus,
  SceneEvaluationSummary,
  SceneEvaluationWorldInfo,
  SceneFacts,
  Vector3Snapshot,
} from './types';

const DEFAULT_CHECKS = ['basic', 'inventory', 'bounds', 'intersections', 'coplanar'];
const DEFAULT_MAX_FINDINGS = 50;
const DEFAULT_OVERLAP_TOLERANCE = 0.02;
const DEFAULT_COPLANAR_TOLERANCE = 0.005;
const DEFAULT_GROUND_Y = 0;
const DEFAULT_FLOOR_TOLERANCE = 0.05;
const DEFAULT_FLOATING_TOLERANCE = 0.05;

const entityQuery = defineQuery([Transform]);
const KNOWN_COMPONENTS = Object.entries(Components) as Array<[string, any]>;

type ColliderFact = {
  entity: EvaluatedEntity;
  desc: RAPIER.ColliderDesc;
  shape: RAPIER.Shape;
  position: Vector3Snapshot;
  rotation: { x: number; y: number; z: number; w: number };
};

function vec3(x: number, y: number, z: number): Vector3Snapshot {
  return { x, y, z };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteVec3(value: Vector3Snapshot): boolean {
  return isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);
}

function toBoundsSnapshot(box: THREE.Box3): BoundsSnapshot | null {
  if (!box || box.isEmpty()) return null;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return {
    min: vec3(box.min.x, box.min.y, box.min.z),
    max: vec3(box.max.x, box.max.y, box.max.z),
    size: vec3(size.x, size.y, size.z),
    center: vec3(center.x, center.y, center.z),
  };
}

function fromBoundsSnapshot(bounds: BoundsSnapshot): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  );
}

function safeGetEntityName(ctx: ECSContext, eid: number): string {
  if (!hasComponent(ctx, Info, eid)) return `Entity ${eid}`;
  const name = decode(Info.name[eid]);
  return name || `Entity ${eid}`;
}

function resolveCategory(name: string, archetype?: string): string {
  const source = archetype || name || 'entity';
  const normalized = source.trim().toLowerCase();
  const firstWord = normalized.split(/\s+/)[0];
  return firstWord || 'entity';
}

function getComponentNames(ctx: ECSContext, eid: number): string[] {
  const components = new Set(getEntityComponents(ctx, eid));
  const knownNames = KNOWN_COMPONENTS
    .filter(([, component]) => components.has(component))
    .map(([name]) => name);
  return knownNames.sort();
}

function getMotionType(ctx: ECSContext, eid: number): EvaluatedEntity['motionType'] {
  if (!hasComponent(ctx, MotionSource, eid)) return 'unknown';
  try {
    const motionModule = getModule<any>(ctx, 'motionSource', true);
    const resolved = motionModule?.get(MotionSource.motionSourceId[eid]) as MotionSourceResolved | undefined;
    return resolved?.bodyType ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function getBodyResolved(ctx: ECSContext, eid: number): BodyResolved | null {
  if (!hasComponent(ctx, Body, eid)) return null;
  try {
    const bodyModule = getModule<any>(ctx, 'body', true);
    return bodyModule?.get(Body.bodyId[eid]) ?? null;
  } catch {
    return null;
  }
}

function entityMatrix(eid: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(Transform.x[eid], Transform.y[eid], Transform.z[eid]),
    new THREE.Quaternion(Transform.qx[eid], Transform.qy[eid], Transform.qz[eid], Transform.qw[eid]).normalize(),
    new THREE.Vector3(Transform.sx[eid], Transform.sy[eid], Transform.sz[eid]),
  );
}

function colliderMatrix(entity: EvaluatedEntity, desc: RAPIER.ColliderDesc): THREE.Matrix4 {
  const t = desc.translation ?? { x: 0, y: 0, z: 0 };
  const r = desc.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(t.x, t.y, t.z),
    new THREE.Quaternion(r.x, r.y, r.z, r.w).normalize(),
    new THREE.Vector3(1, 1, 1),
  );
  const root = new THREE.Matrix4().compose(
    new THREE.Vector3(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z),
    new THREE.Quaternion(
      entity.transform.rotation.x,
      entity.transform.rotation.y,
      entity.transform.rotation.z,
      entity.transform.rotation.w,
    ).normalize(),
    new THREE.Vector3(1, 1, 1),
  );
  return root.multiply(local);
}

function decomposePosition(matrix: THREE.Matrix4): Vector3Snapshot {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, rotation, scale);
  return vec3(position.x, position.y, position.z);
}

function decomposeRotation(matrix: THREE.Matrix4): { x: number; y: number; z: number; w: number } {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, rotation, scale);
  return { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w };
}

function buildEvaluatedEntity(ctx: ECSContext, eid: number): EvaluatedEntity {
  const body = getBodyResolved(ctx, eid);
  const localBounds = body?.localBounds && !body.localBounds.isEmpty()
    ? body.localBounds.clone().applyMatrix4(entityMatrix(eid))
    : null;
  const name = safeGetEntityName(ctx, eid);
  const stableId = hasComponent(ctx, StableID, eid) ? StableID.id[eid] : null;
  const archetype = undefined;
  return {
    eid,
    stableId,
    name,
    category: resolveCategory(name, archetype),
    archetype,
    components: getComponentNames(ctx, eid),
    transform: {
      position: vec3(Transform.x[eid], Transform.y[eid], Transform.z[eid]),
      rotation: {
        x: Transform.qx[eid],
        y: Transform.qy[eid],
        z: Transform.qz[eid],
        w: Transform.qw[eid],
      },
      scale: vec3(Transform.sx[eid], Transform.sy[eid], Transform.sz[eid]),
    },
    motionType: getMotionType(ctx, eid),
    hasBody: Boolean(body),
    hasCollider: Boolean(body?.colliders?.length),
    bounds: localBounds ? toBoundsSnapshot(localBounds) : null,
  };
}

export function collectSceneFacts(ctx: ECSContext, options: SceneEvaluationOptions = {}): SceneFacts {
  const world = serializeWorld(ctx, { includeEntities: true, includeRuntime: true });
  const entities = Array.from(entityQuery(ctx), (eid) => buildEvaluatedEntity(ctx, eid));
  const warnings: SceneEvaluationFinding[] = [];

  for (const entity of entities) {
    if (entity.hasBody && !entity.bounds) {
      warnings.push({
        severity: 'warning',
        message: `${entity.name} has a Body component, but no measurable bounds were produced.`,
        stableIds: entity.stableId !== null ? [entity.stableId] : undefined,
        entities: [entity.eid],
      });
    }
  }

  return {
    world,
    worldFilePath: options.worldFilePath,
    entities,
    warnings,
  };
}

function limitFindings(findings: SceneEvaluationFinding[], options: SceneEvaluationOptions): SceneEvaluationFinding[] {
  const max = options.maxFindingsPerCheck ?? DEFAULT_MAX_FINDINGS;
  return findings.slice(0, Math.max(0, max));
}

function statusFromFindings(findings: SceneEvaluationFinding[], fallback: SceneEvaluationStatus = 'pass'): SceneEvaluationStatus {
  if (findings.some((finding) => finding.severity === 'error')) return 'error';
  if (findings.some((finding) => finding.severity === 'warning')) return 'warning';
  if (findings.some((finding) => finding.severity === 'info')) return 'info';
  return fallback;
}

function scoreFromFindings(findings: SceneEvaluationFinding[], total = 1): number {
  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  if (errors === 0 && warnings === 0) return 1;
  const denominator = Math.max(total, errors + warnings, 1);
  const penalty = errors * 0.35 + warnings * 0.12;
  return Math.max(0, Math.min(1, 1 - penalty / denominator));
}

function makeCheck(
  id: string,
  label: string,
  findings: SceneEvaluationFinding[],
  options: SceneEvaluationOptions,
  metrics: Record<string, unknown> = {},
  totalForScore = 1,
): SceneEvaluationCheckResult {
  const limitedFindings = limitFindings(findings, options);
  return {
    id,
    label,
    status: statusFromFindings(findings),
    score: scoreFromFindings(findings, totalForScore),
    metrics: {
      ...metrics,
      findingCount: findings.length,
      returnedFindings: limitedFindings.length,
    },
    findings: limitedFindings,
  };
}

function evaluateLoadability(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  return makeCheck(
    'basic.loadability',
    'World loadability',
    facts.warnings,
    options,
    {
      entityCount: facts.entities.length,
      dimensionCount: facts.world.dimensions?.length ?? 0,
      hasSerializedWorld: true,
    },
    Math.max(1, facts.entities.length),
  );
}

function evaluateStableIds(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const findings: SceneEvaluationFinding[] = [];
  const seen = new Map<number, EvaluatedEntity>();
  for (const entity of facts.entities) {
    if (entity.stableId === null) {
      findings.push({
        severity: 'error',
        message: `${entity.name} is missing a StableID.`,
        entities: [entity.eid],
      });
      continue;
    }
    const previous = seen.get(entity.stableId);
    if (previous) {
      findings.push({
        severity: 'error',
        message: `StableID ${entity.stableId} is used by both ${previous.name} and ${entity.name}.`,
        stableIds: [entity.stableId],
        entities: [previous.eid, entity.eid],
      });
      continue;
    }
    seen.set(entity.stableId, entity);
  }

  return makeCheck(
    'basic.stableIds',
    'Stable ID integrity',
    findings,
    options,
    {
      entityCount: facts.entities.length,
      uniqueStableIds: seen.size,
    },
    Math.max(1, facts.entities.length),
  );
}

function evaluateTransforms(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const findings: SceneEvaluationFinding[] = [];
  for (const entity of facts.entities) {
    const positionOk = isFiniteVec3(entity.transform.position);
    const scaleOk = isFiniteVec3(entity.transform.scale);
    const rotation = entity.transform.rotation;
    const rotationOk =
      isFiniteNumber(rotation.x) &&
      isFiniteNumber(rotation.y) &&
      isFiniteNumber(rotation.z) &&
      isFiniteNumber(rotation.w);
    if (!positionOk || !scaleOk || !rotationOk) {
      findings.push({
        severity: 'error',
        message: `${entity.name} has a non-finite transform value.`,
        stableIds: entity.stableId !== null ? [entity.stableId] : undefined,
        entities: [entity.eid],
        data: { transform: entity.transform },
      });
    }
    if (scaleOk && (entity.transform.scale.x <= 0 || entity.transform.scale.y <= 0 || entity.transform.scale.z <= 0)) {
      findings.push({
        severity: 'error',
        message: `${entity.name} has a non-positive scale.`,
        stableIds: entity.stableId !== null ? [entity.stableId] : undefined,
        entities: [entity.eid],
        data: { scale: entity.transform.scale },
      });
    }
  }

  return makeCheck(
    'basic.transforms',
    'Transform sanity',
    findings,
    options,
    { entityCount: facts.entities.length },
    Math.max(1, facts.entities.length),
  );
}

function evaluateInventory(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const categories = new Map<string, number>();
  const componentCounts = new Map<string, number>();
  let bodies = 0;
  let colliders = 0;
  for (const entity of facts.entities) {
    categories.set(entity.category, (categories.get(entity.category) ?? 0) + 1);
    if (entity.hasBody) bodies += 1;
    if (entity.hasCollider) colliders += 1;
    for (const component of entity.components) {
      componentCounts.set(component, (componentCounts.get(component) ?? 0) + 1);
    }
  }

  const findings: SceneEvaluationFinding[] = [
    {
      severity: 'info',
      message: `Evaluated ${facts.entities.length} entities across ${categories.size} categories.`,
      data: {
        categories: Object.fromEntries([...categories.entries()].sort()),
      },
    },
  ];

  return {
    id: 'inventory.summary',
    label: 'Entity inventory',
    status: 'info',
    score: 1,
    metrics: {
      entityCount: facts.entities.length,
      categories: Object.fromEntries([...categories.entries()].sort()),
      componentCounts: Object.fromEntries([...componentCounts.entries()].sort()),
      bodyCount: bodies,
      colliderEntityCount: colliders,
    },
    findings: limitFindings(findings, options),
  };
}

function evaluateWorldBounds(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const worldBox = new THREE.Box3();
  let measurable = 0;
  for (const entity of facts.entities) {
    if (!entity.bounds) continue;
    measurable += 1;
    worldBox.union(fromBoundsSnapshot(entity.bounds));
  }

  const bounds = toBoundsSnapshot(worldBox);
  const findings: SceneEvaluationFinding[] = [];
  if (facts.entities.length > 0 && measurable === 0) {
    findings.push({
      severity: 'warning',
      message: 'No entities produced measurable world bounds.',
    });
  }
  if (bounds && (bounds.size.x > 10000 || bounds.size.y > 10000 || bounds.size.z > 10000)) {
    findings.push({
      severity: 'warning',
      message: 'World bounds are extremely large; check for misplaced or mis-scaled entities.',
      data: { bounds },
    });
  }

  return makeCheck(
    'bounds.world',
    'World bounds',
    findings,
    options,
    {
      measurableEntities: measurable,
      bounds,
    },
    Math.max(1, facts.entities.length),
  );
}

function evaluatePlacement(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const findings: SceneEvaluationFinding[] = [];
  const groundY = options.groundY ?? DEFAULT_GROUND_Y;
  const floorTolerance = options.floorTolerance ?? DEFAULT_FLOOR_TOLERANCE;
  const floatingTolerance = options.floatingTolerance ?? DEFAULT_FLOATING_TOLERANCE;

  for (const entity of facts.entities) {
    if (!entity.bounds || entity.motionType !== 'static') continue;
    const bottom = entity.bounds.min.y;
    if (bottom < groundY - floorTolerance) {
      findings.push({
        severity: 'warning',
        message: `${entity.name} extends below the configured ground plane.`,
        stableIds: entity.stableId !== null ? [entity.stableId] : undefined,
        entities: [entity.eid],
        data: { bottomY: bottom, groundY },
      });
    } else if (bottom > groundY + floatingTolerance && !hasSupportBelow(entity, facts.entities, floatingTolerance)) {
      findings.push({
        severity: 'warning',
        message: `${entity.name} appears to float above the configured ground plane without support below it.`,
        stableIds: entity.stableId !== null ? [entity.stableId] : undefined,
        entities: [entity.eid],
        data: { bottomY: bottom, groundY },
      });
    }
  }

  return makeCheck(
    'bounds.placement',
    'Grounding and placement',
    findings,
    options,
    { groundY, floorTolerance, floatingTolerance },
    Math.max(1, facts.entities.length),
  );
}

function horizontalOverlap(a: BoundsSnapshot, b: BoundsSnapshot): boolean {
  return a.min.x <= b.max.x && a.max.x >= b.min.x && a.min.z <= b.max.z && a.max.z >= b.min.z;
}

function hasSupportBelow(entity: EvaluatedEntity, entities: EvaluatedEntity[], tolerance: number): boolean {
  if (!entity.bounds) return false;
  return entities.some((candidate) => {
    if (candidate === entity || !candidate.bounds) return false;
    if (!horizontalOverlap(entity.bounds!, candidate.bounds)) return false;
    return Math.abs(candidate.bounds.max.y - entity.bounds!.min.y) <= tolerance;
  });
}

function overlapDepth(a: BoundsSnapshot, b: BoundsSnapshot): Vector3Snapshot {
  return vec3(
    Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x),
    Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y),
    Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z),
  );
}

function areLikelySupportContact(a: EvaluatedEntity, b: EvaluatedEntity, depth: Vector3Snapshot, tolerance: number): boolean {
  if (!a.bounds || !b.bounds) return false;
  if (Math.min(depth.x, depth.y, depth.z) > tolerance) return false;
  const verticalTouch =
    Math.abs(a.bounds.min.y - b.bounds.max.y) <= tolerance ||
    Math.abs(b.bounds.min.y - a.bounds.max.y) <= tolerance;
  return verticalTouch && depth.x > tolerance && depth.z > tolerance;
}

function buildColliderFacts(ctx: ECSContext, entities: EvaluatedEntity[]): ColliderFact[] {
  const facts: ColliderFact[] = [];
  for (const entity of entities) {
    const body = getBodyResolved(ctx, entity.eid);
    if (!body?.colliders?.length) continue;
    for (const desc of body.colliders) {
      if (!desc?.shape) continue;
      const matrix = colliderMatrix(entity, desc);
      facts.push({
        entity,
        desc,
        shape: desc.shape,
        position: decomposePosition(matrix),
        rotation: decomposeRotation(matrix),
      });
    }
  }
  return facts;
}

function colliderIntersects(a: ColliderFact, b: ColliderFact): boolean | null {
  try {
    return a.shape.intersectsShape(a.position, a.rotation, b.shape, b.position, b.rotation);
  } catch {
    try {
      return Boolean(a.shape.contactShape(a.position, a.rotation, b.shape, b.position, b.rotation, 0));
    } catch {
      return null;
    }
  }
}

function evaluateIntersections(ctx: ECSContext, facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const tolerance = options.overlapTolerance ?? DEFAULT_OVERLAP_TOLERANCE;
  const findings: SceneEvaluationFinding[] = [];
  const measurable = facts.entities.filter((entity) => entity.bounds);
  let candidatePairs = 0;
  let aabbOverlapPairs = 0;
  let rapierConfirmedPairs = 0;
  let maxOverlapDepth = 0;
  const colliderFacts = buildColliderFacts(ctx, facts.entities);
  const collidersByEntity = new Map<number, ColliderFact[]>();
  for (const fact of colliderFacts) {
    const existing = collidersByEntity.get(fact.entity.eid) ?? [];
    existing.push(fact);
    collidersByEntity.set(fact.entity.eid, existing);
  }

  for (let i = 0; i < measurable.length; i++) {
    for (let j = i + 1; j < measurable.length; j++) {
      const a = measurable[i];
      const b = measurable[j];
      if (!a.bounds || !b.bounds) continue;
      candidatePairs += 1;
      if (!fromBoundsSnapshot(a.bounds).intersectsBox(fromBoundsSnapshot(b.bounds))) continue;
      const depth = overlapDepth(a.bounds, b.bounds);
      const minDepth = Math.min(depth.x, depth.y, depth.z);
      if (minDepth <= tolerance || areLikelySupportContact(a, b, depth, tolerance)) continue;
      aabbOverlapPairs += 1;
      maxOverlapDepth = Math.max(maxOverlapDepth, minDepth);

      const aColliders = collidersByEntity.get(a.eid) ?? [];
      const bColliders = collidersByEntity.get(b.eid) ?? [];
      let checkedColliderPairs = 0;
      let confirmed = false;
      let inconclusive = false;
      for (const ac of aColliders) {
        for (const bc of bColliders) {
          checkedColliderPairs += 1;
          const result = colliderIntersects(ac, bc);
          if (result === true) {
            confirmed = true;
            break;
          }
          if (result === null) inconclusive = true;
        }
        if (confirmed) break;
      }
      if (confirmed) rapierConfirmedPairs += 1;

      const severeByBounds = minDepth > tolerance * 5;
      findings.push({
        severity: confirmed || severeByBounds ? 'error' : 'warning',
        message: confirmed
          ? `${a.name} intersects ${b.name}.`
          : `${a.name} overlaps ${b.name}${inconclusive || checkedColliderPairs === 0 ? ' by bounds; collider-level confirmation was unavailable.' : ' by bounds.'}`,
        stableIds: [a.stableId, b.stableId].filter((value): value is number => value !== null),
        entities: [a.eid, b.eid],
        data: {
          overlapDepth: depth,
          minOverlapDepth: minDepth,
          colliderPairsChecked: checkedColliderPairs,
          rapierConfirmed: confirmed,
        },
      });
    }
  }

  return makeCheck(
    'geometry.intersections',
    'Object intersections',
    findings,
    options,
    {
      measurableEntities: measurable.length,
      candidatePairs,
      aabbOverlapPairs,
      rapierConfirmedPairs,
      colliderEntityCount: collidersByEntity.size,
      colliderCount: colliderFacts.length,
      maxOverlapDepth,
      overlapTolerance: tolerance,
    },
    Math.max(1, candidatePairs),
  );
}

type Axis = 'x' | 'y' | 'z';
type FaceSide = 'min' | 'max';

const AXES: Axis[] = ['x', 'y', 'z'];

function otherAxes(axis: Axis): [Axis, Axis] {
  if (axis === 'x') return ['y', 'z'];
  if (axis === 'y') return ['x', 'z'];
  return ['x', 'y'];
}

function intervalOverlap(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

function coplanarOverlapArea(a: BoundsSnapshot, b: BoundsSnapshot, axis: Axis): number {
  const [u, v] = otherAxes(axis);
  const uOverlap = intervalOverlap(a.min[u], a.max[u], b.min[u], b.max[u]);
  const vOverlap = intervalOverlap(a.min[v], a.max[v], b.min[v], b.max[v]);
  if (uOverlap <= 0 || vOverlap <= 0) return 0;
  return uOverlap * vOverlap;
}

function facePosition(bounds: BoundsSnapshot, axis: Axis, side: FaceSide): number {
  return bounds[side][axis];
}

function evaluateCoplanarSurfaces(facts: SceneFacts, options: SceneEvaluationOptions): SceneEvaluationCheckResult {
  const tolerance = options.coplanarTolerance ?? DEFAULT_COPLANAR_TOLERANCE;
  const findings: SceneEvaluationFinding[] = [];
  const measurable = facts.entities.filter((entity) => entity.bounds);
  let candidateFacePairs = 0;
  let coplanarFacePairs = 0;
  let maxSharedArea = 0;

  for (let i = 0; i < measurable.length; i++) {
    for (let j = i + 1; j < measurable.length; j++) {
      const a = measurable[i];
      const b = measurable[j];
      if (!a.bounds || !b.bounds) continue;

      let best:
        | {
            axis: Axis;
            side: FaceSide;
            plane: number;
            separation: number;
            sharedArea: number;
          }
        | null = null;

      for (const axis of AXES) {
        for (const side of ['max', 'min'] as const) {
          candidateFacePairs += 1;
          const aPlane = facePosition(a.bounds, axis, side);
          const bPlane = facePosition(b.bounds, axis, side);
          const separation = Math.abs(aPlane - bPlane);
          if (separation > tolerance) continue;
          const sharedArea = coplanarOverlapArea(a.bounds, b.bounds, axis);
          if (sharedArea <= tolerance * tolerance) continue;
          if (!best || sharedArea > best.sharedArea) {
            best = {
              axis,
              side,
              plane: (aPlane + bPlane) / 2,
              separation,
              sharedArea,
            };
          }
        }
      }

      if (!best) continue;
      coplanarFacePairs += 1;
      maxSharedArea = Math.max(maxSharedArea, best.sharedArea);
      findings.push({
        severity: 'warning',
        message: `${a.name} and ${b.name} have nearly coplanar ${best.side} ${best.axis.toUpperCase()} faces that may z-fight.`,
        stableIds: [a.stableId, b.stableId].filter((value): value is number => value !== null),
        entities: [a.eid, b.eid],
        data: best,
      });
    }
  }

  return makeCheck(
    'geometry.coplanar',
    'Coplanar surface risk',
    findings,
    options,
    {
      measurableEntities: measurable.length,
      candidateFacePairs,
      coplanarFacePairs,
      maxSharedArea,
      coplanarTolerance: tolerance,
    },
    Math.max(1, measurable.length),
  );
}

function normalizeChecks(options: SceneEvaluationOptions): string[] {
  const requested = options.checks?.length ? options.checks : DEFAULT_CHECKS;
  const expanded = new Set<string>();
  for (const check of requested) {
    const normalized = check.trim();
    if (!normalized) continue;
    switch (normalized) {
      case 'basic':
        expanded.add('basic.loadability');
        expanded.add('basic.stableIds');
        expanded.add('basic.transforms');
        break;
      case 'geometry':
      case 'intersections':
        expanded.add('geometry.intersections');
        break;
      case 'coplanar':
        expanded.add('geometry.coplanar');
        break;
      case 'bounds':
        expanded.add('bounds.world');
        expanded.add('bounds.placement');
        break;
      case 'inventory':
        expanded.add('inventory.summary');
        break;
      default:
        expanded.add(normalized);
        break;
    }
  }
  return [...expanded];
}

function summarize(checks: SceneEvaluationCheckResult[]) {
  return checks.reduce(
    (summary, check) => {
      if (check.status === 'error') summary.errors += 1;
      else if (check.status === 'warning') summary.warnings += 1;
      else if (check.status === 'info') summary.info += 1;
      else if (check.status === 'skipped') summary.skipped += 1;
      else summary.passed += 1;
      return summary;
    },
    { errors: 0, warnings: 0, info: 0, passed: 0, skipped: 0 },
  );
}

function aggregateScore(checks: SceneEvaluationCheckResult[]): number {
  const scored = checks.filter((check) => check.status !== 'skipped');
  if (scored.length === 0) return 1;
  return Number((scored.reduce((sum, check) => sum + check.score, 0) / scored.length).toFixed(4));
}

function skippedCheck(id: string): SceneEvaluationCheckResult {
  return {
    id,
    label: id,
    status: 'skipped',
    score: 1,
    metrics: {},
    findings: [
      {
        severity: 'info',
        message: `Unknown scene evaluation check '${id}'.`,
      },
    ],
  };
}

export function evaluateScene(
  ctx: ECSContext,
  options: SceneEvaluationOptions = {},
): SceneEvaluationReport {
  const checksRequested = normalizeChecks(options);
  const facts = collectSceneFacts(ctx, options);
  const checks: SceneEvaluationCheckResult[] = [];

  for (const check of checksRequested) {
    switch (check) {
      case 'basic.loadability':
        checks.push(evaluateLoadability(facts, options));
        break;
      case 'basic.stableIds':
        checks.push(evaluateStableIds(facts, options));
        break;
      case 'basic.transforms':
        checks.push(evaluateTransforms(facts, options));
        break;
      case 'inventory.summary':
        checks.push(evaluateInventory(facts, options));
        break;
      case 'bounds.world':
        checks.push(evaluateWorldBounds(facts, options));
        break;
      case 'bounds.placement':
        checks.push(evaluatePlacement(facts, options));
        break;
      case 'geometry.intersections':
        checks.push(evaluateIntersections(ctx, facts, options));
        break;
      case 'geometry.coplanar':
        checks.push(evaluateCoplanarSurfaces(facts, options));
        break;
      default:
        checks.push(skippedCheck(check));
        break;
    }
  }

  const summary = summarize(checks);
  const score = aggregateScore(checks);
  const title = facts.world.title || 'Untitled World';
  return {
    ok: summary.errors === 0,
    score,
    profile: options.profile ?? 'agent',
    checksRequested,
    world: {
      title,
      description: facts.world.description,
      entityCount: facts.entities.length,
      worldFilePath: facts.worldFilePath,
    },
    summary,
    checks,
    artifacts: [],
  };
}
