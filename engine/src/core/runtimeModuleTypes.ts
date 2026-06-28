import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ECSContext, getModule, getResource, setResource } from './ecs';
import { Module } from '../modules/Module';
import { syncDimensionTerrain } from './dimensionTerrain';
import type { WorldMetadata } from './schema';

export interface RuntimeModuleTypeDefinition {
  moduleName: string;
  typeName: string;
  factorySource: string;
  description?: string;
  parameterSchema?: Record<string, any>;
}

export interface RuntimeModuleTypeCatalogEntry extends RuntimeModuleTypeDefinition {
  persisted: boolean;
}

export interface RuntimeModuleInstanceCatalogEntry {
  moduleName: string;
  instanceName: string;
  typeName: string;
  definition: { type: string; params: any };
  builtIn: boolean;
}

interface RuntimeModuleTypeFactoryHelpers {
  ctx: ECSContext;
  THREE: typeof THREE;
  RAPIER: typeof RAPIER;
  Math: Math;
  getModule: <T extends Module<any, any>>(name: string) => T | undefined;
  getResource: <R = any>(name: string, hideWarnings?: boolean) => R | undefined;
  moduleName: string;
  typeName: string;
}

const RUNTIME_MODULE_TYPE_RESOURCE = 'runtimeModuleTypeDefinitions';

function definitionKey(moduleName: string, typeName: string): string {
  return `${moduleName}:${typeName}`;
}

function normalizeRuntimeModuleTypeDefinition(
  definition: RuntimeModuleTypeDefinition,
): RuntimeModuleTypeDefinition {
  const moduleName = typeof definition.moduleName === 'string' ? definition.moduleName.trim() : '';
  const typeName = typeof definition.typeName === 'string' ? definition.typeName.trim() : '';
  const factorySource =
    typeof definition.factorySource === 'string' ? definition.factorySource.trim() : '';

  if (!moduleName) {
    throw new Error('Runtime module type definition requires moduleName');
  }
  if (!typeName) {
    throw new Error('Runtime module type definition requires typeName');
  }
  if (!factorySource) {
    throw new Error('Runtime module type definition requires factorySource');
  }

  return {
    moduleName,
    typeName,
    factorySource,
    ...(definition.description ? { description: definition.description } : {}),
    ...(definition.parameterSchema ? { parameterSchema: definition.parameterSchema } : {}),
  };
}

function getRuntimeModuleTypeMap(
  ctx: ECSContext,
  createIfMissing = false,
): Map<string, RuntimeModuleTypeDefinition> {
  let definitions = getResource<Map<string, RuntimeModuleTypeDefinition>>(
    ctx,
    RUNTIME_MODULE_TYPE_RESOURCE,
    true,
  );
  if (!definitions && createIfMissing) {
    definitions = new Map<string, RuntimeModuleTypeDefinition>();
    setResource(ctx, RUNTIME_MODULE_TYPE_RESOURCE, definitions);
  }
  return definitions ?? new Map<string, RuntimeModuleTypeDefinition>();
}

function getTargetModule(ctx: ECSContext, moduleName: string): Module<any, any> {
  const target = getModule<Module<any, any>>(ctx, moduleName, true);
  if (!target) {
    throw new Error(`Module '${moduleName}' not found`);
  }
  return target;
}

function syncReferencedDimensionTerrainField(
  ctx: ECSContext,
  moduleName: string,
  instanceName: string,
): void {
  if (moduleName !== 'field') return;
  const metadata = getResource<WorldMetadata>(ctx, 'metadata', true);
  if (!metadata?.dimensions) return;
  const isReferencedTerrainField = metadata.dimensions.some(
    (dimension) => dimension.terrain?.heightField === instanceName,
  );
  if (isReferencedTerrainField) {
    syncDimensionTerrain(ctx, metadata.dimensions);
    const spawnerModule = getModule<any>(ctx, 'spawner', true);
    spawnerModule?.resyncTerrainHeightField?.(instanceName);
  }
}

function buildFactoryHelpers(
  ctx: ECSContext,
  moduleName: string,
  typeName: string,
): RuntimeModuleTypeFactoryHelpers {
  return {
    ctx,
    THREE,
    RAPIER,
    Math,
    getModule: <T extends Module<any, any>>(name: string) => getModule<T>(ctx, name, true),
    getResource: <R = any>(name: string, hideWarnings?: boolean) => getResource<R>(ctx, name, hideWarnings),
    moduleName,
    typeName,
  };
}

function compileFactorySource(
  moduleName: string,
  typeName: string,
  factorySource: string,
): (params: any, helpers: RuntimeModuleTypeFactoryHelpers) => any {
  let compiled: unknown;
  try {
    compiled = new Function(`return (${factorySource});`)();
  } catch (error: any) {
    throw new Error(
      `Failed to compile runtime module type '${moduleName}:${typeName}': ${error?.message || error}`,
    );
  }

  if (typeof compiled !== 'function') {
    throw new Error(
      `Runtime module type '${moduleName}:${typeName}' must compile to a function`,
    );
  }

  return compiled as (params: any, helpers: RuntimeModuleTypeFactoryHelpers) => any;
}

function registerRuntimeModuleTypeInternal(
  ctx: ECSContext,
  rawDefinition: RuntimeModuleTypeDefinition,
  options: { persist: boolean; allowReplace: boolean },
): RuntimeModuleTypeDefinition {
  const definition = normalizeRuntimeModuleTypeDefinition(rawDefinition);
  const targetModule = getTargetModule(ctx, definition.moduleName);
  const persisted = getRuntimeModuleTypeMap(ctx, options.persist);
  const key = definitionKey(definition.moduleName, definition.typeName);
  const alreadyTracked = persisted.has(key);
  const alreadyRegistered = targetModule.getRegisteredTypes().includes(definition.typeName);

  if (alreadyRegistered && !options.allowReplace && !alreadyTracked) {
    throw new Error(
      `Module type '${definition.typeName}' is already registered on module '${definition.moduleName}'`,
    );
  }

  const compiledFactory = compileFactorySource(
    definition.moduleName,
    definition.typeName,
    definition.factorySource,
  );
  targetModule.registerType(definition.typeName, (params: any) =>
    compiledFactory(params, buildFactoryHelpers(ctx, definition.moduleName, definition.typeName)),
  );

  if (options.persist) {
    persisted.set(key, definition);
  }

  return definition;
}

export function registerRuntimeModuleType(
  ctx: ECSContext,
  definition: RuntimeModuleTypeDefinition,
  options: { persist?: boolean; allowReplace?: boolean } = {},
): RuntimeModuleTypeDefinition {
  return registerRuntimeModuleTypeInternal(ctx, definition, {
    persist: options.persist !== false,
    allowReplace: options.allowReplace === true,
  });
}

export function unregisterRuntimeModuleType(
  ctx: ECSContext,
  moduleName: string,
  typeName: string,
  options: { persist?: boolean } = {},
): boolean {
  const normalizedModuleName = typeof moduleName === 'string' ? moduleName.trim() : '';
  const normalizedTypeName = typeof typeName === 'string' ? typeName.trim() : '';
  if (!normalizedModuleName || !normalizedTypeName) {
    throw new Error('unregisterRuntimeModuleType requires moduleName and typeName');
  }

  const key = definitionKey(normalizedModuleName, normalizedTypeName);
  const tracked = getRuntimeModuleTypeMap(ctx).has(key);
  if (!tracked) {
    throw new Error(
      `Runtime module type '${normalizedModuleName}:${normalizedTypeName}' is not managed by the runtime extensibility registry`,
    );
  }

  const targetModule = getTargetModule(ctx, normalizedModuleName);
  const dependents = listRuntimeModuleInstances(ctx).filter(
    (entry) => entry.moduleName === normalizedModuleName && entry.typeName === normalizedTypeName,
  );
  if (dependents.length > 0) {
    throw new Error(
      `Cannot remove module type '${normalizedModuleName}:${normalizedTypeName}' while module instances still reference it`,
    );
  }

  const removed = targetModule.unregisterType(normalizedTypeName);
  if (options.persist !== false) {
    const definitions = getRuntimeModuleTypeMap(ctx, true);
    definitions.delete(key);
  }
  return removed;
}

export function hydrateRuntimeModuleTypes(
  ctx: ECSContext,
  definitions: RuntimeModuleTypeDefinition[] | undefined,
): void {
  const previousDefinitions = Array.from(getRuntimeModuleTypeMap(ctx).values());
  for (const definition of previousDefinitions) {
    const targetModule = getModule<Module<any, any>>(ctx, definition.moduleName, true);
    targetModule?.unregisterType(definition.typeName);
  }

  const tracked = new Map<string, RuntimeModuleTypeDefinition>();
  setResource(ctx, RUNTIME_MODULE_TYPE_RESOURCE, tracked);

  for (const definition of definitions ?? []) {
    const normalized = registerRuntimeModuleTypeInternal(ctx, definition, {
      persist: false,
      allowReplace: true,
    });
    tracked.set(definitionKey(normalized.moduleName, normalized.typeName), normalized);
  }
}

export function listPersistedRuntimeModuleTypes(ctx: ECSContext): RuntimeModuleTypeDefinition[] {
  return Array.from(getRuntimeModuleTypeMap(ctx).values()).sort((a, b) => {
    if (a.moduleName !== b.moduleName) return a.moduleName.localeCompare(b.moduleName);
    return a.typeName.localeCompare(b.typeName);
  });
}

export function getPersistedRuntimeModuleType(
  ctx: ECSContext,
  moduleName: string,
  typeName: string,
): RuntimeModuleTypeDefinition | undefined {
  return getRuntimeModuleTypeMap(ctx).get(definitionKey(moduleName, typeName));
}

export function listRuntimeModuleTypes(ctx: ECSContext): RuntimeModuleTypeCatalogEntry[] {
  const persisted = getRuntimeModuleTypeMap(ctx);
  const entries = new Map<string, RuntimeModuleTypeCatalogEntry>();

  for (const [moduleName, module] of ctx.modules.entries()) {
    if (!(module instanceof Module)) continue;
    for (const typeName of module.getRegisteredTypes()) {
      const definition = persisted.get(definitionKey(moduleName, typeName));
      entries.set(definitionKey(moduleName, typeName), {
        moduleName,
        typeName,
        factorySource: definition?.factorySource ?? '',
        description: definition?.description,
        parameterSchema: definition?.parameterSchema,
        persisted: Boolean(definition),
      });
    }
  }

  for (const definition of persisted.values()) {
    const key = definitionKey(definition.moduleName, definition.typeName);
    if (!entries.has(key)) {
      entries.set(key, {
        ...definition,
        persisted: true,
      });
    }
  }

  return Array.from(entries.values()).sort((a, b) => {
    if (a.moduleName !== b.moduleName) return a.moduleName.localeCompare(b.moduleName);
    return a.typeName.localeCompare(b.typeName);
  });
}

export function upsertRuntimeModuleInstance(
  ctx: ECSContext,
  moduleName: string,
  instanceName: string,
  definition: { type: string; params: any },
): void {
  const normalizedModuleName = typeof moduleName === 'string' ? moduleName.trim() : '';
  const normalizedInstanceName = typeof instanceName === 'string' ? instanceName.trim() : '';
  if (!normalizedModuleName || !normalizedInstanceName) {
    throw new Error('upsertRuntimeModuleInstance requires moduleName and instanceName');
  }

  const targetModule = getTargetModule(ctx, normalizedModuleName);
  if (targetModule.isBuiltIn(normalizedInstanceName)) {
    throw new Error(
      `Cannot overwrite built-in module instance '${normalizedModuleName}:${normalizedInstanceName}' through the runtime extensibility API`,
    );
  }
  if (normalizedModuleName === 'spawner' && typeof (targetModule as any).upsertSpawner === 'function') {
    const spawnerDefinition = {
      ...(definition as any),
      params: {
        ...(definition as any).params,
        name: (definition as any).params?.name ?? normalizedInstanceName,
      },
    };
    (targetModule as any).upsertSpawner(spawnerDefinition);
    return;
  }
  targetModule.replaceDefinition(normalizedInstanceName, definition as any);
  targetModule.resolve(normalizedInstanceName);
  syncReferencedDimensionTerrainField(ctx, normalizedModuleName, normalizedInstanceName);
}

export function removeRuntimeModuleInstance(
  ctx: ECSContext,
  moduleName: string,
  instanceName: string,
): boolean {
  const normalizedModuleName = typeof moduleName === 'string' ? moduleName.trim() : '';
  const normalizedInstanceName = typeof instanceName === 'string' ? instanceName.trim() : '';
  if (!normalizedModuleName || !normalizedInstanceName) {
    throw new Error('removeRuntimeModuleInstance requires moduleName and instanceName');
  }

  const targetModule = getTargetModule(ctx, normalizedModuleName);
  if (targetModule.isBuiltIn(normalizedInstanceName)) {
    throw new Error(
      `Cannot remove built-in module instance '${normalizedModuleName}:${normalizedInstanceName}' through the runtime extensibility API`,
    );
  }
  const removed =
    normalizedModuleName === 'spawner' && typeof (targetModule as any).removeSpawner === 'function'
      ? (targetModule as any).removeSpawner(normalizedInstanceName)
      : targetModule.unregister(normalizedInstanceName);
  if (removed) {
    syncReferencedDimensionTerrainField(ctx, normalizedModuleName, normalizedInstanceName);
  }
  return removed;
}

export function listRuntimeModuleInstances(ctx: ECSContext): RuntimeModuleInstanceCatalogEntry[] {
  const results: RuntimeModuleInstanceCatalogEntry[] = [];

  for (const [moduleName, module] of ctx.modules.entries()) {
    if (!(module instanceof Module)) continue;

    const builtIns = module.getBuiltInDefinitions().map((entry) => ({
      moduleName,
      instanceName: entry.name,
      typeName: entry.definition.type,
      definition: entry.definition,
      builtIn: true,
    }));
    const runtime = module.getRuntimeDefinitions().map((entry) => ({
      moduleName,
      instanceName: entry.name,
      typeName: entry.definition.type,
      definition: entry.definition,
      builtIn: false,
    }));

    results.push(...builtIns, ...runtime);
  }

  return results.sort((a, b) => {
    if (a.moduleName !== b.moduleName) return a.moduleName.localeCompare(b.moduleName);
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    return a.instanceName.localeCompare(b.instanceName);
  });
}
