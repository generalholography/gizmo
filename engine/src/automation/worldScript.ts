import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ECSContext } from '../core/ecs';
import { getModule } from '../core/ecs';
import { initialize } from '../core/initializeWorld';
import { registerRuntimeModuleType, removeRuntimeModuleInstance, unregisterRuntimeModuleType, upsertRuntimeModuleInstance } from '../core/runtimeModuleTypes';
import { restoreDeferredEntityReferences, spawn } from '../core/spawn';
import { registerArchetype } from '../modules/archetype';

export interface WorldScriptRunnerOptions {
  source?: string;
  path?: string;
}

export interface WorldScriptRunResult {
  sourceKind: 'inline' | 'path';
  sourcePath?: string;
}

function requireOneScriptSource(options: WorldScriptRunnerOptions): { source?: string; sourcePath?: string } {
  const source = typeof options.source === 'string' && options.source.trim() ? options.source : undefined;
  const sourcePath = typeof options.path === 'string' && options.path.trim() ? path.resolve(options.path) : undefined;

  if (source && sourcePath) {
    throw new Error('run-world-script requires exactly one of source or path.');
  }
  if (!source && !sourcePath) {
    throw new Error('run-world-script requires source or path.');
  }
  return { source, sourcePath };
}

function buildWorldScriptApi(ctx: ECSContext) {
  return {
    ecsWorld: ctx,
    initialize: (definition: any, options?: Record<string, any>) => initialize(ctx, definition, options),
    spawn: (ref: any, overrides?: Record<string, any>) => spawn(ctx, ref, overrides),
    getModule: (name: string) => getModule(ctx, name),
    registerArchetype: (name: string, definition: any, builtIn = false) =>
      registerArchetype(ctx, name, definition, builtIn),
    registerRuntimeModuleType: (definition: any) =>
      registerRuntimeModuleType(ctx, definition, { persist: true }),
    unregisterRuntimeModuleType: (moduleName: string, typeName: string) =>
      unregisterRuntimeModuleType(ctx, moduleName, typeName),
    registerRuntimeModuleInstance: (moduleName: string, instanceName: string, definition: any) =>
      upsertRuntimeModuleInstance(ctx, moduleName, instanceName, definition),
    unregisterRuntimeModuleInstance: (moduleName: string, instanceName: string) =>
      removeRuntimeModuleInstance(ctx, moduleName, instanceName),
  };
}

function loadWorldScriptInline(source: string, label = 'inline world script'): any {
  if (!/\bexport\s+default\b/.test(source)) {
    throw new Error(`World script ${label} requires an 'export default' object.`);
  }

  const transformed = `${source.replace(/\bexport\s+default\b/, 'const __default__ =')}\nreturn { default: __default__ };`;
  const factory = new Function(transformed);
  return factory();
}

async function loadWorldScriptModuleFromPath(sourcePath: string): Promise<any> {
  const source = await fs.readFile(sourcePath, 'utf8');
  if (/\bimport\s+/.test(source)) {
    const moduleUrl = `${pathToFileURL(sourcePath).href}?mtime=${Date.now()}`;
    return import(/* @vite-ignore */ moduleUrl);
  }
  return loadWorldScriptInline(source, `at ${sourcePath}`);
}

export async function runWorldScriptInContext(
  ctx: ECSContext,
  options: WorldScriptRunnerOptions,
): Promise<WorldScriptRunResult> {
  const { source, sourcePath } = requireOneScriptSource(options);
  const imported = sourcePath
    ? await loadWorldScriptModuleFromPath(sourcePath)
    : loadWorldScriptInline(source ?? '');
  const worldScript = imported?.default;

  if (!worldScript || typeof worldScript.setupScene !== 'function') {
    throw new Error('World script must default-export an object with setupScene(api).');
  }

  await Promise.resolve(worldScript.setupScene(buildWorldScriptApi(ctx)));
  restoreDeferredEntityReferences(ctx);

  return sourcePath
    ? { sourceKind: 'path', sourcePath }
    : { sourceKind: 'inline' };
}
