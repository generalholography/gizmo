import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createECS, setResource, type ECSContext } from '../core/ecs';
import { ReactiveMap } from '../utils/reactiveTypes';
import type { Achievement } from '../core/achievements';
import { registerArchetype } from '../modules/archetype';
import {
  componentSchemaRegistry,
  TransformSchema,
  BodySchema,
  MotionSourceSchema,
  HealthSchema,
  InfoSchema,
  AISchema,
  AnimationSchema,
  InventorySchema,
  FactionSchema,
  PlayerSchema,
  StableIDSchema,
  VelocitySchema,
  HeldSchema,
  OwnerSchema,
  MountingSchema,
  MountedBySchema,
  StaticCameraSchema,
  DamageFlashSchema,
  SpawnedAtSchema,
  worldSchemaRegistry,
  WorldMetadataSchema,
  WorldDimensionsSchema,
  WorldRuntimeSchema,
} from '../core/editor/schema';
import cube from '../data/cube';
import sphere from '../data/sphere';
import cylinder from '../data/cylinder';
import cone from '../data/cone';
import pyramid from '../data/pyramid';
import pointLight from '../data/pointLight';
import sceneCamera from '../data/sceneCamera';
import gun from '../data/gun';
import bullet from '../data/bullet';
import terrain from '../data/terrain';
import player from '../data/player';
import ufo from '../data/ufo';
import tree from '../data/tree';
import enemy from '../data/enemy';
import skeleton from '../data/skeleton';
import bow from '../data/bow';
import arrow from '../data/arrow';
import skull from '../data/skull';
import healthPotion from '../data/healthPotion';
import dragon from '../data/dragon';
import { assetGeneratorExampleArchetypes } from '../data/assetGeneratorExamples';

const EMPTY_INPUT_STATE = {
  moveX: 0,
  moveY: 0,
  moveZ: 0,
  yaw: 0,
  pitch: 0,
  interact: 0,
  primary: 0,
  secondary: 0,
  sprint: false,
};

let schemasRegistered = false;

function getRapierRuntime(): typeof RAPIER | null {
  const candidate = (RAPIER as any)?.init ? (RAPIER as any) : (RAPIER as any)?.default;
  return candidate?.World ? (candidate as typeof RAPIER) : null;
}

export function registerHeadlessEditorSchemas(): void {
  if (schemasRegistered) return;
  schemasRegistered = true;

  componentSchemaRegistry.register(TransformSchema);
  componentSchemaRegistry.register(BodySchema);
  componentSchemaRegistry.register(MotionSourceSchema);
  componentSchemaRegistry.register(HealthSchema);
  componentSchemaRegistry.register(InfoSchema);
  componentSchemaRegistry.register(AISchema);
  componentSchemaRegistry.register(AnimationSchema);
  componentSchemaRegistry.register(InventorySchema);
  componentSchemaRegistry.register(FactionSchema);
  componentSchemaRegistry.register(PlayerSchema);
  componentSchemaRegistry.register(StableIDSchema);
  componentSchemaRegistry.register(VelocitySchema);
  componentSchemaRegistry.register(HeldSchema);
  componentSchemaRegistry.register(OwnerSchema);
  componentSchemaRegistry.register(MountingSchema);
  componentSchemaRegistry.register(MountedBySchema);
  componentSchemaRegistry.register(StaticCameraSchema);
  componentSchemaRegistry.register(DamageFlashSchema);
  componentSchemaRegistry.register(SpawnedAtSchema);

  worldSchemaRegistry.register(WorldMetadataSchema);
  worldSchemaRegistry.register(WorldDimensionsSchema);
  worldSchemaRegistry.register(WorldRuntimeSchema);
}

export function registerHeadlessBuiltInArchetypes(ctx: ECSContext): void {
  registerArchetype(ctx, 'cube', cube, true);
  registerArchetype(ctx, 'sphere', sphere, true);
  registerArchetype(ctx, 'cylinder', cylinder, true);
  registerArchetype(ctx, 'cone', cone, true);
  registerArchetype(ctx, 'pyramid', pyramid, true);
  registerArchetype(ctx, 'pointLight', pointLight, true);
  registerArchetype(ctx, 'sceneCamera', sceneCamera, true);
  registerArchetype(ctx, 'gun', gun, true);
  registerArchetype(ctx, 'bullet', bullet, true);
  registerArchetype(ctx, 'terrain', terrain, true);
  registerArchetype(ctx, 'player', player, true);
  registerArchetype(ctx, 'ufo', ufo, true);
  registerArchetype(ctx, 'tree', tree, true);
  registerArchetype(ctx, 'enemy', enemy, true);
  registerArchetype(ctx, 'skeleton', skeleton, true);
  registerArchetype(ctx, 'bow', bow, true);
  registerArchetype(ctx, 'arrow', arrow, true);
  registerArchetype(ctx, 'skull', skull, true);
  registerArchetype(ctx, 'healthPotion', healthPotion, true);
  registerArchetype(ctx, 'dragon', dragon, true);
  for (const entry of assetGeneratorExampleArchetypes) {
    registerArchetype(ctx, entry.archetypeName, entry.bundle, true);
  }
}

export async function createHeadlessECSContext(): Promise<ECSContext> {
  const rapier = getRapierRuntime();
  if (rapier && typeof (rapier as any).init === 'function') {
    await (rapier as any).init({});
  }

  const ctx = createECS();
  ctx.isPlaying = false;
  ctx.input = { ...EMPTY_INPUT_STATE } as any;
  ctx.rapier = {
    world: rapier
      ? new rapier.World({ x: 0, y: -9.81, z: 0 })
      : ({
          gravity: { x: 0, y: -9.81, z: 0 },
        } as any),
  };
  ctx.three = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, 1, 0.1, 1000),
    renderer: {
      setClearColor: () => undefined,
    } as any,
    worldRoot: new THREE.Group(),
  };

  registerHeadlessEditorSchemas();
  registerHeadlessBuiltInArchetypes(ctx);

  setResource(ctx, 'nextStableId', 0);
  setResource(ctx, 'metadata', { title: 'Untitled World', description: '' });
  setResource(ctx, 'displayMode', false);
  setResource(ctx, 'editorMode', true);
  setResource(ctx, 'renderObjects', new Map<number, THREE.Object3D>());
  setResource(ctx, 'achievements', new ReactiveMap<Achievement>());
  setResource(ctx, 'selectedEntities', []);
  setResource(ctx, 'selectedEntity', undefined);
  setResource(ctx, 'selectedBodyPartPaths', []);
  setResource(ctx, 'selectedBodyPartPath', undefined);
  setResource(
    ctx,
    'eventQueue',
    rapier ? new rapier.EventQueue(true) : ({ free: () => undefined } as any),
    (queue: any) => queue?.free?.(),
  );

  return ctx;
}
