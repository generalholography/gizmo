export type AutomationParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface AutomationParameterDefinition {
  name: string;
  type: AutomationParameterType;
  required: boolean;
  description: string;
  schema?: Record<string, any>;
}

export interface AutomationCommandDefinition {
  name: string;
  description: string;
  parameters: AutomationParameterDefinition[];
  changesState?: boolean;
  persistsWorld?: boolean;
}

export const ENGINE_AUTOMATION_COMMAND_DEFINITIONS: AutomationCommandDefinition[] = [
  {
    name: 'add-entity',
    description: 'Spawn a new entity from an archetype or bundle.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'archetypeOrDef',
        type: 'object',
        required: true,
        description: 'Archetype name string or inline entity definition.',
        schema: {
          anyOf: [
            {
              type: 'string',
              description: 'Archetype name registered in the engine.',
            },
            {
              type: 'object',
              description: 'Inline entity definition object.',
              properties: {
                definition: {
                  type: 'object',
                  description: 'Entity definition bundle keyed by component name.',
                  additionalProperties: true,
                },
                archetype: {
                  type: 'string',
                  description: 'Optional archetype name for metadata.',
                },
              },
              required: ['definition'],
              additionalProperties: true,
            },
          ],
        },
      },
      {
        name: 'overrides',
        type: 'object',
        required: false,
        description: 'Component overrides to apply after spawning.',
      },
    ],
  },
  {
    name: 'delete-entity',
    description: 'Delete an entity by its stable ID.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to delete.',
      },
    ],
  },
  {
    name: 'duplicate-entity',
    description: 'Duplicate an entity with an optional offset.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to duplicate.',
      },
      {
        name: 'offset',
        type: 'object',
        required: false,
        description: 'Optional offset { x, y, z } applied to the duplicate.',
      },
    ],
  },
  {
    name: 'set-transform',
    description: 'Set an entity transform (position/rotation/scale).',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to transform.',
      },
      {
        name: 'transform',
        type: 'object',
        required: true,
        description: 'Transform values to apply (supports partials).',
      },
    ],
  },
  {
    name: 'add-component',
    description: 'Add a component to an entity.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'componentName',
        type: 'string',
        required: true,
        description: 'Component name to add.',
      },
      {
        name: 'componentData',
        type: 'object',
        required: true,
        description: 'Component payload to attach.',
      },
    ],
  },
  {
    name: 'remove-component',
    description: 'Remove a component from an entity.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'componentName',
        type: 'string',
        required: true,
        description: 'Component name to remove.',
      },
    ],
  },
  {
    name: 'modify-component',
    description: 'Modify an existing component on an entity.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'componentName',
        type: 'string',
        required: true,
        description: 'Component name to update.',
      },
      {
        name: 'componentData',
        type: 'object',
        required: true,
        description: 'New component payload.',
      },
    ],
  },
  {
    name: 'modify-body',
    description: 'Modify an entity body definition.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'body',
        type: 'object',
        required: true,
        description: 'Body definition overrides.',
      },
    ],
  },
  {
    name: 'insert-body-part',
    description: 'Insert a new body part into a composite body.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'parentPath',
        type: 'array',
        required: true,
        description: 'Path to the parent body part (array of node ids).',
      },
      {
        name: 'part',
        type: 'object',
        required: true,
        description: 'Body part definition to insert.',
      },
    ],
  },
  {
    name: 'add-body-part',
    description: 'Append a new body part to a composite body.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'archetype',
        type: 'string',
        required: true,
        description: 'Body part archetype to add.',
      },
      {
        name: 'localPosition',
        type: 'object',
        required: true,
        description: 'Local position { x, y, z } for the new body part.',
      },
    ],
  },
  {
    name: 'set-body-part-transform',
    description: 'Set a body part transform.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to modify.',
      },
      {
        name: 'path',
        type: 'array',
        required: true,
        description: 'Path to the body part (array of node ids).',
      },
      {
        name: 'transform',
        type: 'object',
        required: true,
        description: 'Transform values to apply (position/rotation/scale).',
      },
    ],
  },
  {
    name: 'reinitialize-world',
    description: 'Reinitialize the world (respawn entities).',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'definition',
        type: 'object',
        required: true,
        description: 'Full world definition to load.',
      },
    ],
  },
  {
    name: 'run-world-script',
    description: 'Execute a trusted JavaScript world script and replace the current world.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'source',
        type: 'string',
        required: false,
        description: 'Inline JavaScript/MJS world script source. Requires explicit world-script permission.',
      },
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'Path to a trusted JavaScript/MJS world script file. Requires explicit world-script permission.',
      },
      {
        name: 'validate',
        type: 'boolean',
        required: false,
        description: 'When true, include a scene-evaluation report after the script runs.',
      },
    ],
  },
  {
    name: 'modify-world-settings',
    description: 'Update world-level settings.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'settings',
        type: 'object',
        required: true,
        description: 'World settings to update.',
      },
    ],
  },
  {
    name: 'upsert-module-type',
    description: 'Register or replace a persisted runtime module type backed by factory source.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'moduleName',
        type: 'string',
        required: true,
        description: 'Target module name (for example "field" or "material").',
      },
      {
        name: 'typeName',
        type: 'string',
        required: true,
        description: 'Registered type name within the target module.',
      },
      {
        name: 'factorySource',
        type: 'string',
        required: true,
        description: 'JavaScript source that evaluates to a factory function `(params, helpers) => resolvedValue`.',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Optional human-readable description of the custom type.',
      },
      {
        name: 'parameterSchema',
        type: 'object',
        required: false,
        description: 'Optional JSON-schema-like description of the expected params payload.',
      },
    ],
  },
  {
    name: 'remove-module-type',
    description: 'Remove a persisted runtime module type.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'moduleName',
        type: 'string',
        required: true,
        description: 'Target module name.',
      },
      {
        name: 'typeName',
        type: 'string',
        required: true,
        description: 'Registered type name to remove.',
      },
    ],
  },
  {
    name: 'upsert-module-instance',
    description: 'Register or replace a named module instance.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'moduleName',
        type: 'string',
        required: true,
        description: 'Target module name.',
      },
      {
        name: 'instanceName',
        type: 'string',
        required: true,
        description: 'Instance name within the module.',
      },
      {
        name: 'definition',
        type: 'object',
        required: true,
        description: 'Module definition `{ type, params }` to register.',
      },
    ],
  },
  {
    name: 'remove-module-instance',
    description: 'Remove a named module instance.',
    changesState: true,
    persistsWorld: true,
    parameters: [
      {
        name: 'moduleName',
        type: 'string',
        required: true,
        description: 'Target module name.',
      },
      {
        name: 'instanceName',
        type: 'string',
        required: true,
        description: 'Instance name to remove.',
      },
    ],
  },
  {
    name: 'set-viewport-camera',
    description: 'Set the current viewport camera pose.',
    changesState: true,
    parameters: [
      {
        name: 'position',
        type: 'object',
        required: false,
        description: 'Optional camera position { x, y, z }.',
      },
      {
        name: 'lookAt',
        type: 'object',
        required: false,
        description: 'Optional look-at target { x, y, z }.',
      },
      {
        name: 'rotation',
        type: 'object',
        required: false,
        description: 'Optional camera rotation as quaternion { x, y, z, w } or Euler angles { x, y, z }.',
      },
      {
        name: 'fov',
        type: 'number',
        required: false,
        description: 'Optional perspective FOV in degrees.',
      },
    ],
  },
  {
    name: 'frame-viewport-entity',
    description: 'Move the viewport camera to frame one entity by stable ID.',
    changesState: true,
    parameters: [
      {
        name: 'stableId',
        type: 'number',
        required: true,
        description: 'Stable ID of the entity to frame.',
      },
      {
        name: 'padding',
        type: 'number',
        required: false,
        description: 'Optional framing padding multiplier.',
      },
      {
        name: 'fov',
        type: 'number',
        required: false,
        description: 'Optional perspective FOV in degrees.',
      },
    ],
  },
];

export const ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS: AutomationCommandDefinition[] = [
  ...ENGINE_AUTOMATION_COMMAND_DEFINITIONS,
  {
    name: 'terminate',
    description: 'Signal completion of agentic editing task with a message for the user.',
    parameters: [
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'User-facing message describing what was accomplished.',
      },
      {
        name: 'success',
        type: 'boolean',
        required: false,
        description: 'Whether task completed successfully (default: true).',
      },
    ],
  },
  {
    name: 'read-resource',
    description: 'Fetch an automation resource by name to get additional world state information.',
    parameters: [
      {
        name: 'resourceName',
        type: 'string',
        required: true,
        description: 'Resource name (e.g., "entity-list", "entity-bundle", "selected-entities-full").',
      },
      {
        name: 'stableId',
        type: 'number',
        required: false,
        description: 'Stable ID for resources that require an entity (e.g., "entity-bundle").',
      },
    ],
  },
];
