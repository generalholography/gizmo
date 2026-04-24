/**
 * Body Component Schema
 * Physical geometry definition with support for composite, gltf, and humanoid types
 */

import { ComponentSchema, FieldMetadata } from '../FieldMetadata';
import { GeometryModuleSchema, GroupOperationSchema, LightModuleSchema, MaterialModuleSchema } from '../ModuleSchemas';

const BodyNodeSchema: FieldMetadata = {
  name: 'node',
  type: 'union',
  required: true,
  discriminator: 'type',
  label: 'Body Part',
  unionTypes: {}
};

const baseTransformFields: FieldMetadata[] = [
  {
    name: 'name',
    type: 'string',
    required: false,
    label: 'Name',
  },
  {
    name: 'tag',
    type: 'string',
    required: false,
    label: 'Tag',
    description: 'Optional tag for referencing this part'
  },
  {
    name: 'localPosition',
    type: 'vector3',
    required: false,
    label: 'Local Position',
    section: 'Transform',
    sectionStyle: 'inspector',
    condensedLabel: 'Pos',
    displayMode: 'compact'
  },
  {
    name: 'localRotation',
    type: 'vector3',
    required: false,
    label: 'Local Rotation',
    section: 'Transform',
    sectionStyle: 'inspector',
    condensedLabel: 'Rot',
    displayMode: 'compact'
  },
  {
    name: 'localScale',
    type: 'vector3',
    required: false,
    defaultValue: { x: 1, y: 1, z: 1 },
    label: 'Local Scale',
    section: 'Transform',
    sectionStyle: 'inspector',
    condensedLabel: 'Scale',
    displayMode: 'compact'
  }
];

export const BodySchema: ComponentSchema = {
  name: 'Body',
  displayName: 'Body',
  description: 'Physical body geometry and collision shape',
  inspectorOrder: 2,
  removable: false,
  isStructural: true, // Requires entity respawn when changed
  icon: 'box', // Figma-like icon for component header
  
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      enumValues: ['composite', 'gltf', 'humanoid'],
      enumOptions: [
        { value: 'composite', icon: 'composite', label: 'Composite' },
        { value: 'gltf', icon: 'gltf', label: 'GLTF' },
        { value: 'humanoid', icon: 'humanoid', label: 'Humanoid' },
      ],
      required: true,
      defaultValue: 'composite',
      label: 'Body Type',
      description: 'Type of body definition'
    },
    
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type', // Uses parent 'type' field to determine structure
      required: true,
      unionTypes: {
        // Composite body: parts array with hasInterior
        composite: [
          {
            name: 'parts',
            type: 'array',
            required: true,
            label: 'Parts',
            description: 'Array of primitives and lights that make up this body',
            itemType: BodyNodeSchema
          },
          {
            name: 'hasInterior',
            type: 'boolean',
            required: false,
            defaultValue: false,
            label: 'Has Interior',
            description: 'Whether to generate a hollowed-out interior (for buildings)'
          }
        ],

        // GLTF body: file path
        gltf: [
          {
            name: 'file',
            type: 'string',
            required: true,
            label: 'GLTF File',
            description: 'Path to GLTF file'
          },
          {
            ...MaterialModuleSchema,
            name: 'material',
            label: 'Material Override',
            description: 'Optional material override for the model'
          }
        ],

        // Humanoid body: dimensions
        humanoid: [
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1.8,
            min: 0.5,
            max: 3,
            step: 0.1,
            label: 'Height',
            description: 'Total height of humanoid'
          },
          {
            ...MaterialModuleSchema,
            name: 'headMaterial',
            label: 'Head Material'
          },
          {
            ...MaterialModuleSchema,
            name: 'bodyMaterial',
            label: 'Body Material'
          }
        ]
      }
    }
  },

  requiredFields: ['type', 'params']
};

BodyNodeSchema.unionTypes = {
  primitive: [
    ...baseTransformFields,
    GeometryModuleSchema,
    MaterialModuleSchema,
    {
      name: 'ignoreCollisions',
      type: 'boolean',
      required: false,
      defaultValue: false,
      label: 'Ignore Collisions',
      section: 'Physics',
      sectionStyle: 'inspector',
      inspectorTab: 'simulate',
    },
    {
      name: 'children',
      type: 'array',
      required: false,
      itemType: BodyNodeSchema,
      label: 'Children'
    }
  ],
  group: [
    ...baseTransformFields,
    {
      ...GroupOperationSchema,
      name: 'operation',
      label: 'Group Operation',
      description: 'One operation per group: CSG (`union/subtract/intersect/exclude`) or mesh op (`taper/mirror`)'
    },
    {
      name: 'children',
      type: 'array',
      required: true,
      itemType: BodyNodeSchema,
      label: 'Children'
    }
  ],
  light: [
    ...baseTransformFields,
    { ...LightModuleSchema, name: 'light' },
    {
      name: 'children',
      type: 'array',
      required: false,
      itemType: BodyNodeSchema,
      label: 'Children'
    }
  ]
};

export const BodyPartSchema = BodyNodeSchema;
