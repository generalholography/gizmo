/**
 * Automation commands - canonical structured actions that modify world state.
 */

import * as THREE from 'three';
import { ECSContext, getModule, getResource, setResource } from '../core/ecs';
import { CommandManager, type EditorCommand } from '../core/editor/CommandManager';
import { AddEntityCommand, DeleteEntityCommand, DuplicateEntityCommand } from '../core/editor/commands/EntityCommand';
import { AddComponentCommand } from '../core/editor/commands/AddComponentCommand';
import { RemoveComponentCommand } from '../core/editor/commands/RemoveComponentCommand';
import { ModifyComponentCommand } from '../core/editor/commands/ModifyComponentCommand';
import { ModifyBodyCommand } from '../core/editor/commands/BodyCommand';
import { TransformCommand } from '../core/editor/commands/TransformCommand';
import { ModifyWorldSettingsCommand } from '../core/editor/commands/WorldSettingsCommand';
import { ReinitializeWorldCommand } from '../core/editor/commands/ReinitializeWorldCommand';
import { AddBodyPartCommand } from '../core/editor/commands/AddBodyPartCommand';
import { InsertBodyPartCommand } from '../core/editor/commands/InsertBodyPartCommand';
import { BodyPartTransformCommand } from '../core/editor/commands/BodyPartTransformCommand';
import { BulkCommand } from '../core/editor/commands/BulkCommand';
import { TerminateCommand } from '../core/editor/commands/TerminateCommand';
import { NoOpCommand } from '../core/editor/commands/NoOpCommand';
import { ViewportCameraCommand } from '../core/editor/commands/ViewportCameraCommand';
import { componentSchemaRegistry } from '../core/editor/schema';
import { getEntityBundle } from '../core/despawn';
import { getPartAtPath, normalizeBodyPartPath, type CompositeBody } from '../core/editor/utils/bodyParts';
import { readAutomationResource } from './resources';
import { createWorldDefinition, initialize } from '../core/initializeWorld';
import { stableIdToEid } from '../utils/stableId';
import type { Body, Node } from '../core/schema';
import type { EngineAPI } from '..';
import {
  ENGINE_AUTOMATION_COMMAND_DEFINITIONS,
  ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS,
  type AutomationCommandDefinition,
  type AutomationParameterDefinition,
} from './definitions';
import { computeViewportFrameForEntity, getViewportCameraPose } from '../core/viewportCamera';
import {
  getPersistedRuntimeModuleType,
  registerRuntimeModuleType,
  removeRuntimeModuleInstance,
  unregisterRuntimeModuleType,
  upsertRuntimeModuleInstance,
} from '../core/runtimeModuleTypes';
import { Module } from '../modules/Module';

export type AutomationCommandParameter = AutomationParameterDefinition;
export type AutomationCommand = AutomationCommandDefinition;

export interface AutomationCommandCall {
  name: string;
  params: Record<string, any>;
}

interface CommandBuildResult {
  command: EditorCommand;
  result?: () => string;
}

type CommandBuilder = (ctx: ECSContext, engine: EngineAPI, params: Record<string, any>) => CommandBuildResult;
type WorldScriptContextRunner = (
  ctx: ECSContext,
  options: { source: string } | { path: string },
) => Promise<any>;

const QUATERNION_IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const resolveTargetEid = (ctx: ECSContext, params: Record<string, any>, commandName: string): number => {
  if (typeof params.eid === 'number') {
    return params.eid;
  }
  if (typeof params.stableId === 'number') {
    const resolved = stableIdToEid(ctx, params.stableId);
    if (resolved !== undefined) {
      return resolved;
    }
    throw new Error(`Entity with StableID ${params.stableId} not found for ${commandName}`);
  }
  throw new Error(`${commandName} requires stableId`);
};

function getCommandManager(ctx: ECSContext): CommandManager {
  let manager = getResource<CommandManager>(ctx, 'editorCommandManager', true);
  if (!manager) {
    manager = new CommandManager();
    setResource(ctx, 'editorCommandManager', manager);
  }
  return manager;
}

function createInlineCommand(
  description: string,
  execute: () => void,
  undo: () => void,
): EditorCommand {
  return {
    description,
    execute,
    undo,
    redo: execute,
  };
}

function resolveStructuralFlag(componentName: string, params: Record<string, any>): boolean {
  return componentSchemaRegistry.isStructural(componentName);
}

function normalizeVector3(input: any, fallback = { x: 0, y: 0, z: 0 }): { x: number; y: number; z: number } {
  if (Array.isArray(input)) {
    const [x, y, z] = input;
    return {
      x: typeof x === 'number' ? x : fallback.x,
      y: typeof y === 'number' ? y : fallback.y,
      z: typeof z === 'number' ? z : fallback.z,
    };
  }
  if (input && typeof input === 'object') {
    return {
      x: typeof input.x === 'number' ? input.x : fallback.x,
      y: typeof input.y === 'number' ? input.y : fallback.y,
      z: typeof input.z === 'number' ? input.z : fallback.z,
    };
  }
  return fallback;
}

function toQuaternion(rotation: { x?: number; y?: number; z?: number; w?: number } | [number, number, number]): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  if (rotation && typeof (rotation as any).w === 'number') {
    return {
      x: (rotation as any).x ?? 0,
      y: (rotation as any).y ?? 0,
      z: (rotation as any).z ?? 0,
      w: (rotation as any).w ?? 1,
    };
  }

  const { x, y, z } = normalizeVector3(rotation);
  const euler = new THREE.Euler(x, y, z, 'XYZ');
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

function mergeTransform(
  base: ReturnType<typeof TransformCommand.captureTransform>,
  overrides: Record<string, any>,
) {
  const next = { ...base };
  if (typeof overrides.x === 'number') next.x = overrides.x;
  if (typeof overrides.y === 'number') next.y = overrides.y;
  if (typeof overrides.z === 'number') next.z = overrides.z;
  if (typeof overrides.qx === 'number') next.qx = overrides.qx;
  if (typeof overrides.qy === 'number') next.qy = overrides.qy;
  if (typeof overrides.qz === 'number') next.qz = overrides.qz;
  if (typeof overrides.qw === 'number') next.qw = overrides.qw;
  if (typeof overrides.sx === 'number') next.sx = overrides.sx;
  if (typeof overrides.sy === 'number') next.sy = overrides.sy;
  if (typeof overrides.sz === 'number') next.sz = overrides.sz;

  if (overrides.position) {
    const { x, y, z } = overrides.position;
    if (typeof x === 'number') next.x = x;
    if (typeof y === 'number') next.y = y;
    if (typeof z === 'number') next.z = z;
  }

  if (overrides.rotation) {
    const quat = toQuaternion(overrides.rotation);
    next.qx = quat.x;
    next.qy = quat.y;
    next.qz = quat.z;
    next.qw = quat.w;
  }

  if (overrides.scale) {
    const { x, y, z } = overrides.scale;
    if (typeof x === 'number') next.sx = x;
    if (typeof y === 'number') next.sy = y;
    if (typeof z === 'number') next.sz = z;
  }

  return next;
}

function captureBodyPartTransform(part: Node) {
  return {
    position: normalizeVector3(part.localPosition, { x: 0, y: 0, z: 0 }),
    rotation: part.localRotation ? toQuaternion(part.localRotation) : QUATERNION_IDENTITY,
    scale: normalizeVector3(part.localScale, { x: 1, y: 1, z: 1 }),
  };
}

function normalizeBodyPartTransform(input: Record<string, any>, fallback: ReturnType<typeof captureBodyPartTransform>) {
  const next = {
    position: fallback.position,
    rotation: fallback.rotation,
    scale: fallback.scale,
  };

  if (input.position) {
    next.position = normalizeVector3(input.position, fallback.position);
  }

  if (input.rotation) {
    next.rotation = toQuaternion(input.rotation);
  }

  if (input.scale) {
    next.scale = normalizeVector3(input.scale, fallback.scale);
  }

  return next;
}

const commandBuilders: Record<string, CommandBuilder> = {
  'add-entity': (ctx, _engine, params) => {
    const archetypeOrDef = params.archetypeOrDef ?? params.archetype ?? params.definition;
    if (!archetypeOrDef) {
      throw new Error('add-entity requires archetypeOrDef');
    }
    let archetypeRef = archetypeOrDef;
    let archetypeName: string | undefined =
      typeof archetypeOrDef === 'string' ? archetypeOrDef : undefined;
    if (archetypeOrDef && typeof archetypeOrDef === 'object' && 'definition' in archetypeOrDef) {
      archetypeRef = archetypeOrDef.definition;
      if (typeof archetypeOrDef.archetype === 'string') {
        archetypeName = archetypeOrDef.archetype;
      }
    }
    const command = new AddEntityCommand(
      ctx,
      archetypeRef,
      params.overrides ?? {},
      archetypeName,
    );
    return {
      command,
      result: () => `Spawned entity ${command.getSpawnedEntityId() ?? 'unknown'}`,
    };
  },
  'delete-entity': (ctx, _engine, params) => ({
    command: new DeleteEntityCommand(ctx, resolveTargetEid(ctx, params, 'delete-entity')),
  }),
  'duplicate-entity': (ctx, _engine, params) => {
    const targetEid = resolveTargetEid(ctx, params, 'duplicate-entity');
    const command = new DuplicateEntityCommand(ctx, targetEid, params.offset);
    return {
      command,
      result: () => `Duplicated entity ${targetEid} as ${command.getDuplicatedEntityId() ?? 'unknown'}`,
    };
  },
  'set-transform': (ctx, _engine, params) => {
    const targetEid = resolveTargetEid(ctx, params, 'set-transform');
    const oldTransform = TransformCommand.captureTransform(ctx, targetEid);
    const newTransform = mergeTransform(oldTransform, params.transform ?? {});
    return {
      command: new TransformCommand(ctx, targetEid, oldTransform, newTransform),
    };
  },
  'add-component': (ctx, _engine, params) => {
    const componentName = params.componentName;
    const isStructural = resolveStructuralFlag(componentName, params);
    const targetEid = resolveTargetEid(ctx, params, 'add-component');
    return {
      command: new AddComponentCommand(ctx, targetEid, componentName, params.componentData, isStructural),
    };
  },
  'remove-component': (ctx, _engine, params) => {
    const componentName = params.componentName;
    const isStructural = resolveStructuralFlag(componentName, params);
    const targetEid = resolveTargetEid(ctx, params, 'remove-component');
    return {
      command: new RemoveComponentCommand(ctx, targetEid, componentName, isStructural),
    };
  },
  'modify-component': (ctx, engine, params) => {
    if (!engine) {
      throw new Error('Engine API is required for modify-component');
    }
    const componentName = params.componentName;
    const isStructural = resolveStructuralFlag(componentName, params);
    const targetEid = resolveTargetEid(ctx, params, 'modify-component');
    return {
      command: new ModifyComponentCommand(
        ctx,
        engine,
        targetEid,
        componentName,
        params.componentData,
        isStructural,
      ),
    };
  },
  'modify-body': (ctx, engine, params) => {
    if (!engine) {
      throw new Error('Engine API is required for modify-body');
    }
    const targetEid = resolveTargetEid(ctx, params, 'modify-body');
    const bundle = getEntityBundle(ctx, targetEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    const oldBody = bundle?.Body as Body | undefined;
    if (!oldBody) {
      throw new Error(`Entity ${targetEid} has no Body component`);
    }
    return {
      command: new ModifyBodyCommand(ctx, engine, targetEid, oldBody, params.body),
    };
  },
  'add-body-part': (ctx, _engine, params) => {
    const targetEid = resolveTargetEid(ctx, params, 'add-body-part');
    return {
      command: new AddBodyPartCommand(ctx, targetEid, params.archetype, params.localPosition),
    };
  },
  'insert-body-part': (ctx, _engine, params) => {
    const targetEid = resolveTargetEid(ctx, params, 'insert-body-part');
    const parentPath = normalizeBodyPartPath(params.parentPath);
    return {
      command: new InsertBodyPartCommand(ctx, targetEid, params.part, parentPath),
    };
  },
  'set-body-part-transform': (ctx, _engine, params) => {
    const targetEid = resolveTargetEid(ctx, params, 'set-body-part-transform');
    const bundle = getEntityBundle(ctx, targetEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    const body = bundle?.Body as CompositeBody | undefined;
    const partPath = normalizeBodyPartPath(params.path);
    const part = getPartAtPath(body, partPath);
    if (!part) {
      const rawPath = typeof params.path === 'string' ? params.path : JSON.stringify(params.path ?? []);
      throw new Error(`Body part not found at path ${rawPath}`);
    }
    const oldTransform = captureBodyPartTransform(part);
    const newTransform = normalizeBodyPartTransform(params.transform ?? {}, oldTransform);
    return {
      command: new BodyPartTransformCommand(ctx, targetEid, partPath, oldTransform, newTransform),
    };
  },
  'modify-world-settings': (ctx, _engine, params) => {
    const current = getResource(ctx, 'metadata', true) || {};
    return {
      command: new ModifyWorldSettingsCommand(ctx, current, params.settings),
    };
  },
  'upsert-module-type': (ctx, _engine, params) => {
    const moduleName = params.moduleName;
    const typeName = params.typeName;
    const previousDefinition = getPersistedRuntimeModuleType(ctx, moduleName, typeName);

    const nextDefinition = {
      moduleName,
      typeName,
      factorySource: params.factorySource,
      ...(params.description ? { description: params.description } : {}),
      ...(params.parameterSchema ? { parameterSchema: params.parameterSchema } : {}),
    };

    return {
      command: createInlineCommand(
        `Upsert module type ${moduleName}:${typeName}`,
        () => {
          registerRuntimeModuleType(ctx, nextDefinition, { persist: true });
        },
        () => {
          if (previousDefinition) {
            registerRuntimeModuleType(ctx, previousDefinition, { persist: true });
            return;
          }
          unregisterRuntimeModuleType(ctx, moduleName, typeName);
        },
      ),
      result: () => `Registered module type ${moduleName}:${typeName}`,
    };
  },
  'remove-module-type': (ctx, _engine, params) => {
    const moduleName = params.moduleName;
    const typeName = params.typeName;
    const previousDefinition = getPersistedRuntimeModuleType(ctx, moduleName, typeName);
    if (!previousDefinition) {
      throw new Error(`Runtime module type '${moduleName}:${typeName}' not found`);
    }

    return {
      command: createInlineCommand(
        `Remove module type ${moduleName}:${typeName}`,
        () => {
          unregisterRuntimeModuleType(ctx, moduleName, typeName);
        },
        () => {
          registerRuntimeModuleType(ctx, previousDefinition, { persist: true });
        },
      ),
      result: () => `Removed module type ${moduleName}:${typeName}`,
    };
  },
  'upsert-module-instance': (ctx, _engine, params) => {
    const moduleName = params.moduleName;
    const instanceName = params.instanceName;
    const targetModule = getModule<Module<any, any>>(ctx, moduleName);
    if (!targetModule) {
      throw new Error(`Module '${moduleName}' not found`);
    }
    const previousDefinition = targetModule.getDefinitionByName(instanceName);
    const previousBuiltIn = targetModule.isBuiltIn(instanceName);
    const nextDefinition = params.definition;

    return {
      command: createInlineCommand(
        `Upsert module instance ${moduleName}:${instanceName}`,
        () => {
          upsertRuntimeModuleInstance(ctx, moduleName, instanceName, nextDefinition);
        },
        () => {
          removeRuntimeModuleInstance(ctx, moduleName, instanceName);
          if (previousDefinition) {
            targetModule.addDefinition(instanceName, previousDefinition, previousBuiltIn);
            targetModule.resolve(instanceName);
          }
        },
      ),
      result: () => `Registered module instance ${moduleName}:${instanceName}`,
    };
  },
  'remove-module-instance': (ctx, _engine, params) => {
    const moduleName = params.moduleName;
    const instanceName = params.instanceName;
    const targetModule = getModule<Module<any, any>>(ctx, moduleName);
    if (!targetModule) {
      throw new Error(`Module '${moduleName}' not found`);
    }
    const previousDefinition = targetModule.getDefinitionByName(instanceName);
    const previousBuiltIn = targetModule.isBuiltIn(instanceName);
    if (!previousDefinition) {
      throw new Error(`Module instance '${moduleName}:${instanceName}' not found`);
    }

    return {
      command: createInlineCommand(
        `Remove module instance ${moduleName}:${instanceName}`,
        () => {
          removeRuntimeModuleInstance(ctx, moduleName, instanceName);
        },
        () => {
          targetModule.addDefinition(instanceName, previousDefinition, previousBuiltIn);
          targetModule.resolve(instanceName);
        },
      ),
      result: () => `Removed module instance ${moduleName}:${instanceName}`,
    };
  },
  'set-viewport-camera': (ctx, _engine, params) => {
    const description =
      params.lookAt ? 'Set viewport camera pose and target' : 'Set viewport camera pose';
    return {
      command: new ViewportCameraCommand(
        ctx,
        {
          position: params.position,
          lookAt: params.lookAt,
          rotation: params.rotation,
          fov: params.fov,
        },
        description,
      ),
      result: () => JSON.stringify(getViewportCameraPose(ctx), null, 2),
    };
  },
  'frame-viewport-entity': (ctx, _engine, params) => {
    const targetEid = resolveTargetEid(ctx, params, 'frame-viewport-entity');
    return {
      command: new ViewportCameraCommand(
        ctx,
        computeViewportFrameForEntity(ctx, targetEid, {
          padding: params.padding,
          fov: params.fov,
        }),
        `Frame viewport entity ${targetEid}`,
      ),
      result: () => JSON.stringify(getViewportCameraPose(ctx), null, 2),
    };
  },
  'reinitialize-world': (ctx, _engine, params) => ({
    command: new ReinitializeWorldCommand(ctx, params.definition),
  }),
  'terminate': (ctx, _engine, params) => {
    const message = params.message || 'Task completed.';
    const success = params.success !== undefined ? params.success : true;
    return {
      command: new TerminateCommand(message, success),
      result: () => message,
    };
  },
  'read-resource': (ctx, _engine, params) => {
    const resourceName = params.resourceName;
    if (!resourceName) {
      throw new Error('read-resource requires resourceName parameter');
    }
    
    // Build params for resource handler
    const resourceParams: Record<string, any> = {};
    if (params.stableId !== undefined) {
      resourceParams.stableId = params.stableId;
    }
    
    const data = readAutomationResource(ctx, resourceName, resourceParams);
    return {
      command: new NoOpCommand(`Read resource: ${resourceName}`),
      result: () => JSON.stringify(data, null, 2),
    };
  },
};

export const AUTOMATION_COMMAND_NAMES = Object.keys(commandBuilders);

function validateParameterValue(parameter: AutomationParameterDefinition, value: any): void {
  if (value === undefined || value === null) {
    if (parameter.required) {
      throw new Error(`Missing required parameter '${parameter.name}'`);
    }
    return;
  }

  if (parameter.schema?.anyOf || parameter.schema?.oneOf) {
    if (parameter.name === 'archetypeOrDef') {
      if (typeof value !== 'string' && (typeof value !== 'object' || Array.isArray(value))) {
        throw new Error(`Parameter '${parameter.name}' must be an archetype string or entity definition object`);
      }
    }
    return;
  }

  const type = Array.isArray(value) ? 'array' : typeof value;
  if (parameter.type === 'array') {
    if ((parameter.name === 'path' || parameter.name === 'parentPath') && typeof value === 'string') {
      return;
    }
    if (!Array.isArray(value)) {
      throw new Error(`Parameter '${parameter.name}' must be an array`);
    }
    return;
  }
  if (parameter.type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Parameter '${parameter.name}' must be an object`);
    }
    return;
  }
  if (type !== parameter.type) {
    throw new Error(`Parameter '${parameter.name}' must be a ${parameter.type}`);
  }
}

export function validateAutomationCommandCall(name: string, params: Record<string, any> = {}): void {
  const definition = ENGINE_AUTOMATION_COMMAND_DEFINITIONS.find((command) => command.name === name);
  if (!definition) {
    return;
  }

  const known = new Set(definition.parameters.map((parameter) => parameter.name));
  for (const parameter of definition.parameters) {
    validateParameterValue(parameter, params[parameter.name]);
  }

  const unknown = Object.keys(params).filter((key) => !known.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown parameter(s) for ${name}: ${unknown.join(', ')}`);
  }
}

function buildCommand(ctx: ECSContext, engine: EngineAPI, name: string, params: Record<string, any>): CommandBuildResult {
  validateAutomationCommandCall(name, params);
  const builder = commandBuilders[name];
  if (!builder) {
    throw new Error(`Automation command '${name}' not found`);
  }
  return builder(ctx, engine, params);
}

function worldScriptsAllowed(ctx: ECSContext): boolean {
  const capabilities = getResource<{ allowWorldScripts?: boolean }>(ctx, 'automationCapabilities', true);
  return capabilities?.allowWorldScripts === true;
}

async function executeRunWorldScriptCommand(ctx: ECSContext, engine: EngineAPI, params: Record<string, any>): Promise<string> {
  validateAutomationCommandCall('run-world-script', params);
  if (!worldScriptsAllowed(ctx)) {
    throw new Error('run-world-script requires explicit world-script permission.');
  }

  const source = typeof params.source === 'string' && params.source.trim() ? params.source : undefined;
  const sourcePath = typeof params.path === 'string' && params.path.trim() ? params.path : undefined;
  if ((source ? 1 : 0) + (sourcePath ? 1 : 0) !== 1) {
    throw new Error('run-world-script requires exactly one of source or path.');
  }

  if (source && engine && typeof engine.loadWorld === 'function') {
    await engine.loadWorld(source);
    setResource(ctx, 'automationCapabilities', {
      allowWorldScripts: true,
    });
  } else {
    const runWorldScriptInContext = getResource<WorldScriptContextRunner>(ctx, 'runWorldScriptInContext', true);
    if (!runWorldScriptInContext) {
      throw new Error('run-world-script path execution requires a headless world-script runner.');
    }
    initialize(ctx, createWorldDefinition(), {
      merge: false,
      spawnEntities: true,
    });
    setResource(ctx, 'automationCapabilities', {
      allowWorldScripts: true,
    });
    await runWorldScriptInContext(ctx, source ? { source } : { path: sourcePath });
  }

  const summary = readAutomationResource(ctx, 'world-state-summary');
  const payload: Record<string, any> = {
    ok: true,
    changed: true,
    source: source ? 'inline' : 'path',
    summary,
  };
  if (sourcePath) {
    payload.path = sourcePath;
  }
  if (params.validate === true) {
    payload.evaluation = readAutomationResource(ctx, 'scene-evaluation');
  }
  return JSON.stringify(payload, null, 2);
}

/** Execute one automation command. */
export async function executeAutomationCommand(ctx: ECSContext, engine: EngineAPI, name: string, params: any): Promise<string> {
  if (name === 'run-world-script') {
    return await executeRunWorldScriptCommand(ctx, engine, params ?? {});
  }
  const { command, result } = buildCommand(ctx, engine, name, params);
  const manager = getCommandManager(ctx);
  manager.execute(command);
  return result ? result() : command.description;
}

/** Execute a batch of automation commands as a single undoable operation. */
export async function executeAutomationBatch(
  ctx: ECSContext,
  engine: EngineAPI,
  calls: AutomationCommandCall[],
  description = 'AI Edit Batch',
): Promise<string[]> {
  if (calls.some((call) => call.name === 'run-world-script')) {
    throw new Error('run-world-script cannot be used in a batch.');
  }
  const built = calls.map((call) => buildCommand(ctx, engine, call.name, call.params));
  const bulkCommand = new BulkCommand(
    built.map((entry) => entry.command),
    description,
  );
  const manager = getCommandManager(ctx);
  manager.execute(bulkCommand);
  return built.map((entry) => (entry.result ? entry.result() : entry.command.description));
}

/** List all available automation commands. */
export function listAutomationCommands(): Array<{ name: string; description: string; parameters: AutomationCommandParameter[] }> {
  return ENGINE_AUTOMATION_COMMAND_DEFINITIONS.map((command) => ({
    name: command.name,
    description: command.description,
    parameters: command.parameters,
  }));
}

export function listEditorAgentCommands(): Array<{ name: string; description: string; parameters: AutomationCommandParameter[] }> {
  return ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.map((command) => ({
    name: command.name,
    description: command.description,
    parameters: command.parameters,
  }));
}
