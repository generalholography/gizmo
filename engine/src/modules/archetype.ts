import { ECSContext, getModule } from "../core/ecs";
import { Module } from "./Module";
import type { SerializationMetadata } from "../core/worldSchema";

export type ArchetypeBundle = {
  _meta?: SerializationMetadata;
  [componentName: string]: any;
};

export type ArchetypeDefinition = {
  type: "bundle";
  params: ArchetypeBundle;
};

export const archetypeModule = (ctx: ECSContext) => new Module<ArchetypeDefinition, ArchetypeBundle>(ctx, {
  bundle: (params: ArchetypeBundle) => params,
});

// TODO: this is kind of confusing, probably just overload the module class with this def
export function registerArchetype(ctx: ECSContext, name: string, bundle: ArchetypeBundle, isBuiltIn: boolean = false) {
  getModule(ctx, 'archetype').addDefinition(name, { type: "bundle", params: bundle }, isBuiltIn);
}