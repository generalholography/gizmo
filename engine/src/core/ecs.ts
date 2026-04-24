import RAPIER from "@dimforge/rapier3d-compat";
import { createWorld as createBitecsWorld } from "bitecs";
import * as THREE from "three";
import { Timer } from 'three/addons/misc/Timer.js';
import { InputState } from "./input";
import { Module } from "../modules/Module";
import { colliderModule } from "../modules/collider";
import { controllerModule } from "../modules/controller";
import { fieldModule } from "../modules/field";
import { effectModule } from "../modules/effect";
import { materialModule } from "../modules/material";
import { meshModule } from "../modules/mesh";
import { rendererModule } from "../modules/renderer";
import { archetypeModule } from "../modules/archetype";
import { bodyModule } from "../modules/body";
import { motionSourceModule } from "../modules/motionSource";
import { animationModule } from "../modules/animation";
import { noiseTextureModule } from "../modules/3dNoiseTextures";
import { entityStoreModule } from "../modules/entityStore";
import { conditionModule } from "../modules/condition";
import { spawnerModule } from "../modules/spawner";
import { triggerModule } from "../modules/trigger";
import { placementModule } from "../modules/spawner/placement";
import { selectionModule } from "../modules/spawner/selection";
import { constraintsModule } from "../modules/spawner/constraints";
import { shape2dModule } from "../modules/shape2d";
import { path3dModule } from "../modules/path3d";
import { groupOperationModule } from "../modules/groupOperation";

// Resource wrapper with optional dispose
type Resource<R = any> = { resource: R; dispose?: (res: R) => void };

// System function receives and returns the ECS context
export type System = (ctx: ECSContext) => void;

export type World = ReturnType<typeof createBitecsWorld>;

// ECS execution context, holds the world, resources, and system pipeline
export type ECSContext = World & {
  three: { scene: THREE.Scene; camera: THREE.Camera; renderer: THREE.WebGLRenderer; worldRoot: THREE.Group; };
  rapier: {
    world: RAPIER.World;
  };
  input: InputState;
  modules: Map<string, Module<any, any>>;
  resources: Map<string, Resource>;
  pipeline: System[];
  isPlaying: boolean;
  time: Timer;
}

export function getModule<T extends Module<any, any>>(ctx: ECSContext, name: string, hideWarnings?: boolean): T | undefined {
  const mod = ctx.modules.get(name);
  if (mod) {
    if (mod instanceof Module) {
      return mod as T;
    } else {
      if (!hideWarnings) console.warn(`Module '${name}' is not an instance of Module`);
      return undefined;
    }
  } else {
    if (!hideWarnings) console.warn(`Module '${name}' not found`);
    return undefined;
  }
}

export function setModule<T extends Module<any, any>>(ctx: ECSContext, name: string, mod: T): void {
  if (ctx.modules.has(name)) {
    console.warn(`Module '${name}' already exists, replacing it`);
  }
  ctx.modules.set(name, mod);
}

export function setResource<R>(ctx: ECSContext, name: string, resource: R, disposeFn?: (res: R) => void): void {
  ctx.resources.set(name, { resource, dispose: disposeFn });
}

export function getResource<R = any>(ctx: ECSContext, name: string, hideWarnings?: boolean): R | undefined {
  const res = ctx.resources.get(name);
  if (res) return res.resource as any;
  if (!hideWarnings) console.warn(`Resource '${name}' not found`);
  return undefined;
}

export function addSystem(ctx: ECSContext, sys: System): void {
  ctx.pipeline.push(sys);
}

export function runSystems(ctx: ECSContext): void {
  for (const sys of ctx.pipeline) {
    sys(ctx);
  }
}

export function clearECS(ctx: ECSContext): void {
  // clear modules with internal cleanup
  console.log('[ECS] Clearing modules...');
  for (const [name, module] of ctx.modules.entries()) {
    if (typeof (module as any).clear === 'function') {
      try {
        (module as any).clear();
      } catch (e) {
        console.warn(`[ECS] Failed to clear module ${name}:`, e);
      }
    }
  }
  ctx.modules.clear();
  console.log('[ECS] Modules cleared');
  
  // clear resources
  for (const { resource, dispose} of ctx.resources.values()) {
    if (dispose) dispose(resource);
  }
  ctx.resources.clear();
  ctx.time.disconnect(); // disconnect timer
  ctx.time = new Timer(); // reset timer
  ctx.time.update(); // Initialize the timer with the first update to set internal state
  // clear pipeline
  ctx.pipeline.length = 0;
}

export function resetECS(ctx: ECSContext): void {
  // Preserve isPlaying state across reset (important for editor mode)
  const wasPlaying = ctx.isPlaying;
  // Preserve editor camera state across reset (important for keyboard input in editor mode)
  const editorCameraState = ctx.resources.get('editorCameraState')?.resource;
  // Preserve editor camera cleanup function (important - don't dispose event listeners!)
  const editorCameraCleanup = ctx.resources.get('editorCameraCleanup')?.resource;
  const editorCameraCleanupDispose = ctx.resources.get('editorCameraCleanup')?.dispose;
  
  // Temporarily remove cleanup so clearECS doesn't call it and remove event listeners
  if (editorCameraCleanup) {
    ctx.resources.delete('editorCameraCleanup');
  }
  
  clearECS(ctx);
  // recreate world
  const newWorld = createBitecsWorld();
  Object.assign(ctx, newWorld);
  // re-add default modules
  addDefaultModules(ctx);
  // Restore isPlaying state instead of forcing true
  ctx.isPlaying = wasPlaying;
  // Restore editor camera state if it existed
  if (editorCameraState) {
    setResource(ctx, 'editorCameraState', editorCameraState);
  }
  // Restore editor camera cleanup if it existed
  if (editorCameraCleanup && editorCameraCleanupDispose) {
    setResource(ctx, 'editorCameraCleanup', editorCameraCleanup, editorCameraCleanupDispose);
  }
}

function addDefaultModules(ctx: ECSContext): void {
  ctx.modules.set("shape2d", shape2dModule(ctx));
  ctx.modules.set("path3d", path3dModule(ctx));
  ctx.modules.set("groupOperation", groupOperationModule(ctx));
  ctx.modules.set("collider", colliderModule(ctx));
  ctx.modules.set("controller", controllerModule(ctx));
  ctx.modules.set("field", fieldModule(ctx));
  ctx.modules.set("effect", effectModule(ctx));
  ctx.modules.set("material", materialModule(ctx));
  ctx.modules.set("mesh", meshModule(ctx));
  ctx.modules.set("renderer", rendererModule(ctx));
  ctx.modules.set("archetype", archetypeModule(ctx));
  ctx.modules.set("body", bodyModule(ctx));
  ctx.modules.set("motionSource", motionSourceModule(ctx));
  ctx.modules.set("animation", animationModule(ctx));
  ctx.modules.set("noiseTexture", noiseTextureModule(ctx));
  ctx.modules.set("entityStore", entityStoreModule(ctx));
  ctx.modules.set("condition", conditionModule(ctx));
  ctx.modules.set("placement", placementModule(ctx));
  ctx.modules.set("selection", selectionModule(ctx));
  ctx.modules.set("constraints", constraintsModule(ctx));
  ctx.modules.set("spawner", spawnerModule(ctx));
  ctx.modules.set("trigger", triggerModule(ctx));
}

// Factory to create a new ECS context
export function createECS(): ECSContext {
  const ctx = createBitecsWorld() as ECSContext;
  ctx.modules = new Map<string, Module<any, any>>(); addDefaultModules(ctx);
  ctx.resources = new Map<string, Resource>();
  ctx.pipeline = [];
  ctx.time = new Timer();
  if (typeof document !== 'undefined') {
    ctx.time.connect(document);
  }
  ctx.isPlaying = true;
  return ctx;
}
