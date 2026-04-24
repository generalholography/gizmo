export interface AutomationResourceParameterDefinition {
  name: string;
  description: string;
}

export interface AutomationStaticResourceDefinition {
  kind: 'static';
  name: string;
  description: string;
  mimeType: string;
  aliases?: string[];
}

export interface AutomationResourceTemplateDefinition {
  kind: 'template';
  name: string;
  description: string;
  mimeType: string;
  parameters: AutomationResourceParameterDefinition[];
  aliases?: string[];
}

export type AutomationResourceDefinition =
  | AutomationStaticResourceDefinition
  | AutomationResourceTemplateDefinition;

export const ENGINE_AUTOMATION_RESOURCE_DEFINITIONS: AutomationResourceDefinition[] = [
  {
    kind: 'static',
    name: 'session-info',
    description: 'Information about the active automation session and backing world file.',
    mimeType: 'application/json',
  },
  {
    kind: 'static',
    name: 'world-state-summary',
    description: 'High-level summary of world entities and metadata.',
    mimeType: 'application/json',
    aliases: ['world-state-summary'],
  },
  {
    kind: 'static',
    name: 'component-catalog',
    description: 'Registered component schemas with structural metadata.',
    mimeType: 'application/json',
    aliases: ['component-catalog'],
  },
  {
    kind: 'static',
    name: 'module-type-catalog',
    description: 'Registered runtime module types, including persisted custom factories.',
    mimeType: 'application/json',
    aliases: ['module-type-catalog'],
  },
  {
    kind: 'static',
    name: 'module-instance-catalog',
    description: 'Named module instances across all modules.',
    mimeType: 'application/json',
    aliases: ['module-instance-catalog'],
  },
  {
    kind: 'static',
    name: 'entity-list',
    description: 'List of all entities with basic info.',
    mimeType: 'application/json',
    aliases: ['entity-list'],
  },
  {
    kind: 'static',
    name: 'selected-entities-full',
    description: 'Selected entities with IDs and full definitions.',
    mimeType: 'application/json',
    aliases: ['selected-entities-full'],
  },
  {
    kind: 'static',
    name: 'selected-body-parts-full',
    description: 'Selected body parts with IDs and full entity definitions.',
    mimeType: 'application/json',
    aliases: ['selected-body-parts-full'],
  },
  {
    kind: 'static',
    name: 'metadata',
    description: 'World metadata (title, description, dimensions).',
    mimeType: 'application/json',
    aliases: ['metadata'],
  },
  {
    kind: 'static',
    name: 'achievements',
    description: 'List of all achievements.',
    mimeType: 'application/json',
    aliases: ['achievements'],
  },
  {
    kind: 'static',
    name: 'full-world-state',
    description: 'Complete serialized world state.',
    mimeType: 'application/json',
    aliases: ['full-world-state'],
  },
  {
    kind: 'template',
    name: 'entity-bundle',
    description: 'Get a full entity bundle by StableID.',
    mimeType: 'application/json',
    parameters: [
      {
        name: 'stableId',
        description: 'StableID of the entity to read.',
      },
    ],
    aliases: ['entity-bundle'],
  },
  {
    kind: 'static',
    name: 'render-screenshot',
    description: 'Capture a screenshot of the full world viewport.',
    mimeType: 'application/json',
    aliases: ['render-screenshot'],
  },
  {
    kind: 'static',
    name: 'viewport-camera',
    description: 'Current viewport camera pose and framing direction.',
    mimeType: 'application/json',
    aliases: ['viewport-camera'],
  },
  {
    kind: 'template',
    name: 'entity-render-screenshot',
    description: 'Capture a screenshot focused on a single entity by StableID.',
    mimeType: 'application/json',
    parameters: [
      {
        name: 'stableId',
        description: 'StableID of the entity to capture.',
      },
    ],
    aliases: ['entity-render-screenshot'],
  },
];

export function findAutomationResourceDefinitionByName(name: string): AutomationResourceDefinition | undefined {
  return ENGINE_AUTOMATION_RESOURCE_DEFINITIONS.find((resource) => {
    if (resource.name === name) return true;
    return resource.aliases?.includes(name);
  });
}
