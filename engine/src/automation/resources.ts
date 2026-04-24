/**
 * Automation resources - canonical read-only views of world state.
 */

import { ECSContext, getResource } from '../core/ecs';
import { getEntityBundle } from '../core/despawn';
import { serializeWorld } from '../core/serializeWorld';
import { componentSchemaRegistry } from '../core/editor/schema';
import { getPartAtPath, type CompositeBody } from '../core/editor/utils/bodyParts';
import { ReactiveMap } from '../utils/reactiveTypes';
import { Achievement } from '../core/achievements';
import { eidToStableId, stableIdToEid } from '../utils/stableId';
import { captureEntityScreenshot, captureWorldScreenshot } from '../core/render/screenshot';
import { getViewportCameraPose } from '../core/viewportCamera';
import { listRuntimeModuleInstances, listRuntimeModuleTypes } from '../core/runtimeModuleTypes';
import {
  ENGINE_AUTOMATION_RESOURCE_DEFINITIONS,
  type AutomationResourceDefinition,
} from './resourceCatalog';

export interface AutomationResource {
  name: string;
  description: string;
  contentType: 'text' | 'json';
  handler: (ctx: ECSContext, params?: Record<string, any>) => string | object;
}

function collectEntityBundles(worldState: ReturnType<typeof serializeWorld>) {
  const entities = worldState.dimensions
    ?.flatMap((dimension) => dimension.chunks ?? [])
    .flatMap((chunk) => chunk.entities ?? []) ?? [];
  return entities;
}

function resolveEntityLabel(entity: any): string {
  const infoName = entity?.Info?.name;
  if (infoName) return infoName;
  const archetypeName = entity?._meta?.archetype;
  if (archetypeName) return archetypeName;
  return 'Unknown';
}

function createWorldStateSummary(ctx: ECSContext): object {
  const worldState = serializeWorld(ctx, { includeEntities: true });
  const entities = collectEntityBundles(worldState);

  const entityGroups = new Map<string, number>();
  entities.forEach((entity) => {
    const name = resolveEntityLabel(entity);
    const type = name.split(' ')[0];
    entityGroups.set(type, (entityGroups.get(type) || 0) + 1);
  });

  return {
    title: worldState.title || 'Untitled World',
    description: worldState.description,
    entityCount: entities.length,
    entityGroups: Array.from(entityGroups.entries()).map(([type, count]) => ({
      type,
      count,
    })),
    achievementCount: worldState.achievements?.length || 0,
    timeOfDay: worldState.timeOfDay,
  };
}

function resolveSelectedEntityIds(ctx: ECSContext): number[] {
  const selectedEntities = getResource<number[] | undefined>(ctx, 'selectedEntities', true);
  if (selectedEntities && selectedEntities.length > 0) {
    return selectedEntities;
  }
  const selectedEntity = getResource<number | undefined>(ctx, 'selectedEntity', true);
  return selectedEntity !== undefined ? [selectedEntity] : [];
}

function resolveSelectedBodyPartPaths(ctx: ECSContext): number[][] {
  const selectedBodyPartPaths = getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true);
  if (selectedBodyPartPaths && selectedBodyPartPaths.length > 0) {
    return selectedBodyPartPaths;
  }
  const selectedBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
  return selectedBodyPartPath && selectedBodyPartPath.length > 0 ? [selectedBodyPartPath] : [];
}

function readSessionInfo(ctx: ECSContext) {
  return getResource<Record<string, unknown> | undefined>(ctx, 'automationSessionInfo', true) ?? {
    serverName: 'engine',
    mode: 'embedded',
  };
}

function readEntityBundle(ctx: ECSContext, params?: { eid?: number; stableId?: number }) {
  const resolvedEid =
    params?.eid ??
    (params?.stableId !== undefined ? stableIdToEid(ctx, params.stableId) : undefined);

  if (resolvedEid === undefined) {
    throw new Error('entity-bundle resource requires eid or stableId parameter');
  }

  const bundle = getEntityBundle(ctx, resolvedEid, { includeRuntime: false });
  return {
    eid: resolvedEid,
    stableId: eidToStableId(ctx, resolvedEid),
    label: resolveEntityLabel(bundle),
    bundle,
  };
}

export const worldStateResources: AutomationResource[] = [
  {
    name: 'session-info',
    description: 'Information about the active automation session and backing world file.',
    contentType: 'json',
    handler: (ctx) => readSessionInfo(ctx),
  },
  {
    name: 'world-state-summary',
    description: 'High-level summary of world entities and metadata',
    contentType: 'json',
    handler: (ctx) => createWorldStateSummary(ctx),
  },
  {
    name: 'component-catalog',
    description: 'Registered component schemas with structural metadata',
    contentType: 'json',
    handler: () => {
      const componentNames = componentSchemaRegistry.getEditableComponents();
      return componentNames.map((name) => {
        const schema = componentSchemaRegistry.get(name);
        return {
          name,
          displayName: schema?.displayName ?? name,
          isStructural: schema?.isStructural ?? false,
          requiredFields: schema?.requiredFields ?? [],
          fields: schema?.fields
            ? Object.entries(schema.fields).map(([fieldName, field]) => ({
                name: fieldName,
                type: field.type,
                required: field.required ?? false,
                description: field.description,
                enumValues: field.enumValues,
              }))
            : [],
        };
      });
    },
  },
  {
    name: 'module-type-catalog',
    description: 'Registered runtime module types, including persisted custom factories',
    contentType: 'json',
    handler: (ctx) => listRuntimeModuleTypes(ctx),
  },
  {
    name: 'module-instance-catalog',
    description: 'Named module instances across all modules',
    contentType: 'json',
    handler: (ctx) => listRuntimeModuleInstances(ctx),
  },
  {
    name: 'entity-list',
    description: 'List of all entities with basic info',
    contentType: 'json',
    handler: (ctx) => {
      const worldState = serializeWorld(ctx, { includeEntities: true });
      const entities = collectEntityBundles(worldState);
      return entities.map((entity) => ({
        stableId: entity.StableID?.id,
        transform: entity.Transform,
        name: resolveEntityLabel(entity),
        health: entity.Health ? `${entity.Health.value}/${entity.Health.maxValue}` : null,
      }));
    },
  },
  {
    name: 'selected-entities-full',
    description: 'Selected entities with IDs and full definitions',
    contentType: 'json',
    handler: (ctx) => {
      const selectedEntities = resolveSelectedEntityIds(ctx);
      return selectedEntities.map((eid) => {
        const bundle = getEntityBundle(ctx, eid, { includeRuntime: false });
        return {
          eid,
          stableId: eidToStableId(ctx, eid),
          label: resolveEntityLabel(bundle),
          bundle,
        };
      });
    },
  },
  {
    name: 'selected-body-parts-full',
    description: 'Selected body parts with IDs and full entity definitions',
    contentType: 'json',
    handler: (ctx) => {
      const selectedEntities = resolveSelectedEntityIds(ctx);
      const primaryEid = selectedEntities[0];
      if (primaryEid === undefined) return [];
      const partPaths = resolveSelectedBodyPartPaths(ctx);
      if (partPaths.length === 0) return [];
      const bundle = getEntityBundle(ctx, primaryEid, { includeRuntime: false });
      const body = bundle.Body as CompositeBody | undefined;

      return partPaths
        .map((partPath) => {
          const part = getPartAtPath(body, partPath);
          return {
            eid: primaryEid,
            stableId: eidToStableId(ctx, primaryEid),
            label: resolveEntityLabel(bundle),
            partPath,
            part,
            bundle,
          };
        })
        .filter((entry) => entry.part);
    },
  },
  {
    name: 'entity-bundle',
    description: 'Get full entity bundle by StableID or entity ID',
    contentType: 'json',
    handler: (ctx, params?: { eid?: number; stableId?: number }) => readEntityBundle(ctx, params),
  },
  {
    name: 'metadata',
    description: 'World metadata (title, description, dimensions)',
    contentType: 'json',
    handler: (ctx) => getResource(ctx, 'metadata', true) || {},
  },
  {
    name: 'achievements',
    description: 'List of all achievements',
    contentType: 'json',
    handler: (ctx) => {
      const achievements = getResource<ReactiveMap<Achievement>>(ctx, 'achievements', true);
      if (!achievements) return [];
      return Array.from(achievements.entries()).map(([name, achievement]) => ({
        name,
        description: achievement.description,
        condition: achievement.condition,
      }));
    },
  },
  {
    name: 'full-world-state',
    description: 'Complete serialized world state (use sparingly, can be large)',
    contentType: 'json',
    handler: (ctx) => serializeWorld(ctx, { includeEntities: true, includeRuntime: true }),
  },
  {
    name: 'render-screenshot',
    description: 'Capture a screenshot of the world or a single entity (optional stableId or eid).',
    contentType: 'json',
    handler: (ctx, params?: { eid?: number; stableId?: number }) => {
      const resolvedEid =
        params?.eid ??
        (params?.stableId !== undefined ? stableIdToEid(ctx, params.stableId) : undefined);
      if (resolvedEid !== undefined) {
        return captureEntityScreenshot(ctx, resolvedEid);
      }
      return captureWorldScreenshot(ctx);
    },
  },
  {
    name: 'viewport-camera',
    description: 'Current viewport camera pose and framing direction.',
    contentType: 'json',
    handler: (ctx) => getViewportCameraPose(ctx),
  },
];

const resourceHandlers = new Map(worldStateResources.map((resource) => [resource.name, resource]));

function getResourceByName(name: string): AutomationResource {
  const resource = resourceHandlers.get(name);
  if (!resource) {
    throw new Error(`Automation resource '${name}' not found`);
  }
  return resource;
}

export function listAutomationResourceDefinitions(): AutomationResourceDefinition[] {
  return ENGINE_AUTOMATION_RESOURCE_DEFINITIONS;
}

export function readAutomationResource(ctx: ECSContext, name: string, params?: Record<string, any>): any {
  return getResourceByName(name).handler(ctx, params);
}

export function listAutomationResources(): Array<{ name: string; description: string }> {
  return worldStateResources.map((resource) => ({
    name: resource.name,
    description: resource.description,
  }));
}
