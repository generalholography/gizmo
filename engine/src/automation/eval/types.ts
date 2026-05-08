import type { WorldDefinition } from '../../core/worldSchema';

export type SceneEvaluationSeverity = 'info' | 'warning' | 'error';
export type SceneEvaluationStatus = 'pass' | 'info' | 'warning' | 'error' | 'skipped';
export type SceneEvaluationCheckId =
  | 'basic.loadability'
  | 'basic.stableIds'
  | 'basic.transforms'
  | 'inventory.summary'
  | 'bounds.world'
  | 'bounds.placement'
  | 'geometry.intersections'
  | 'geometry.coplanar';

export type SceneEvaluationProfile = 'quick' | 'agent' | 'gameplay';

export interface SceneEvaluationOptions {
  checks?: string[];
  profile?: SceneEvaluationProfile | string;
  maxFindingsPerCheck?: number;
  overlapTolerance?: number;
  coplanarTolerance?: number;
  groundY?: number;
  floorTolerance?: number;
  floatingTolerance?: number;
  worldFilePath?: string;
}

export interface SceneEvaluationWorldInfo {
  title: string;
  description?: string;
  entityCount: number;
  worldFilePath?: string;
}

export interface SceneEvaluationSummary {
  errors: number;
  warnings: number;
  info: number;
  passed: number;
  skipped: number;
}

export interface SceneEvaluationFinding {
  severity: SceneEvaluationSeverity;
  message: string;
  stableIds?: number[];
  entities?: number[];
  data?: Record<string, unknown>;
}

export interface SceneEvaluationCheckResult {
  id: SceneEvaluationCheckId | string;
  label: string;
  status: SceneEvaluationStatus;
  score: number;
  metrics?: Record<string, unknown>;
  findings: SceneEvaluationFinding[];
}

export interface SceneEvaluationReport {
  ok: boolean;
  score: number;
  profile: string;
  checksRequested: string[];
  world: SceneEvaluationWorldInfo;
  summary: SceneEvaluationSummary;
  checks: SceneEvaluationCheckResult[];
  artifacts: Array<Record<string, unknown>>;
}

export interface Vector3Snapshot {
  x: number;
  y: number;
  z: number;
}

export interface BoundsSnapshot {
  min: Vector3Snapshot;
  max: Vector3Snapshot;
  size: Vector3Snapshot;
  center: Vector3Snapshot;
}

export interface EvaluatedEntity {
  eid: number;
  stableId: number | null;
  name: string;
  category: string;
  archetype?: string;
  components: string[];
  transform: {
    position: Vector3Snapshot;
    rotation: { x: number; y: number; z: number; w: number };
    scale: Vector3Snapshot;
  };
  motionType: 'static' | 'dynamic' | 'kinematic' | 'unknown';
  hasBody: boolean;
  hasCollider: boolean;
  bounds: BoundsSnapshot | null;
}

export interface SceneFacts {
  world: WorldDefinition;
  worldFilePath?: string;
  entities: EvaluatedEntity[];
  warnings: SceneEvaluationFinding[];
}
