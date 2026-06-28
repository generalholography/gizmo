import { getModule, getResource } from '../../ecs';
import { syncDimensionTerrain } from '../../dimensionTerrain';
import type { WorldMetadata } from '../../schema';
import { Module } from '../../../modules/Module';
import { removeRuntimeModuleInstance, upsertRuntimeModuleInstance } from '../../runtimeModuleTypes';
import type { EditorCommand } from '../CommandManager';

export class UpsertModuleInstanceCommand implements EditorCommand {
  description: string;
  private previousDefinition: { type: string; params: any } | undefined;
  private previousBuiltIn = false;

  constructor(
    private ctx: any,
    private moduleName: string,
    private instanceName: string,
    private definition: { type: string; params: any },
  ) {
    this.description = `Update ${moduleName}:${instanceName}`;
    const targetModule = getModule<Module<any, any>>(ctx, moduleName, true);
    this.previousDefinition = targetModule?.getDefinitionByName(instanceName);
    this.previousBuiltIn = targetModule?.isBuiltIn(instanceName) ?? false;
  }

  execute(): void {
    upsertRuntimeModuleInstance(this.ctx, this.moduleName, this.instanceName, this.definition);
  }

  undo(): void {
    removeRuntimeModuleInstance(this.ctx, this.moduleName, this.instanceName);
    if (this.previousDefinition) {
      const targetModule = getModule<Module<any, any>>(this.ctx, this.moduleName, true);
      targetModule?.replaceDefinition(this.instanceName, this.previousDefinition, this.previousBuiltIn);
      targetModule?.resolve(this.instanceName);
    }
    this.afterApply();
  }

  redo(): void {
    this.execute();
  }

  private afterApply(): void {
    if (this.moduleName !== 'field') return;
    const metadata = getResource<WorldMetadata>(this.ctx, 'metadata', true);
    if (!metadata?.dimensions) return;
    const isReferencedTerrainField = metadata.dimensions.some(
      (dimension) => dimension.terrain?.heightField === this.instanceName,
    );
    if (isReferencedTerrainField) {
      syncDimensionTerrain(this.ctx, metadata.dimensions);
      const spawnerModule = getModule<any>(this.ctx, 'spawner', true);
      spawnerModule?.resyncTerrainHeightField?.(this.instanceName);
    }
  }
}
