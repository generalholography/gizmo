/**
 * Reusable module schema definitions
 * These correspond to engine module types that follow the { type, params } pattern
 */

import { FieldMetadata } from './FieldMetadata';

const Vector3Field: FieldMetadata = {
  name: 'vector3',
  type: 'vector3',
  required: false,
  label: 'Vector3'
};

const Shape2DParamsUnion = {
  polyline: [
    {
      name: 'points',
      type: 'array',
      required: true,
      itemType: {
        name: 'point',
        type: 'object',
        required: true,
        fields: {
          u: { name: 'u', type: 'number', required: true, defaultValue: 0 },
          v: { name: 'v', type: 'number', required: true, defaultValue: 0 },
        },
      },
    },
    { name: 'closed', type: 'boolean', required: false, defaultValue: false },
  ],
  polygon: [
    {
      name: 'points',
      type: 'array',
      required: true,
      itemType: {
        name: 'point',
        type: 'object',
        required: true,
        fields: {
          u: { name: 'u', type: 'number', required: true, defaultValue: 0 },
          v: { name: 'v', type: 'number', required: true, defaultValue: 0 },
        },
      },
    },
  ],
  circle: [
    { name: 'radius', type: 'number', required: true, defaultValue: 0.5, min: 0, step: 0.1 },
    {
      name: 'center',
      type: 'object',
      required: false,
      fields: {
        u: { name: 'u', type: 'number', required: true, defaultValue: 0 },
        v: { name: 'v', type: 'number', required: true, defaultValue: 0 },
      },
    },
    { name: 'segments', type: 'number', required: false, defaultValue: 24, min: 3, step: 1 },
  ],
  rectangle: [
    { name: 'width', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1 },
    { name: 'height', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1 },
    {
      name: 'center',
      type: 'object',
      required: false,
      fields: {
        u: { name: 'u', type: 'number', required: true, defaultValue: 0 },
        v: { name: 'v', type: 'number', required: true, defaultValue: 0 },
      },
    },
  ],
} as const;

/**
 * Geometry module schema for Body parts
 * Follows the Primitive.geometry union type from schema.ts
 */
export const FieldDefinitionSchema: FieldMetadata = {
  name: 'field',
  type: 'moduleReference',
  required: true,
  moduleName: 'field',
  label: 'Field',
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      enumValues: ['simplex', 'composite'],
      enumOptions: [
        { value: 'simplex', icon: 'adjustments', label: 'Simplex' },
        { value: 'composite', icon: 'duplicate', label: 'Composite' },
      ],
      required: true,
      defaultValue: 'simplex'
    },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: true,
      unionTypes: {
        simplex: [
          { name: 'amplitude', type: 'number', required: false, defaultValue: 1, step: 0.1 },
          { name: 'frequency', type: 'number', required: false, defaultValue: 1, step: 0.1 },
          { name: 'octaves', type: 'number', required: false, defaultValue: 4, step: 1 },
          { name: 'seed', type: 'number', required: false, defaultValue: 0, step: 1 }
        ],
        composite: [
          {
            name: 'blend',
            type: 'enum',
            required: false,
            enumValues: ['add', 'multiply', 'max', 'min'],
            defaultValue: 'add'
          },
          {
            name: 'fields',
            type: 'array',
            required: true,
            itemType: undefined as any // Assigned after schema creation for recursion
          }
        ]
      }
    }
  }
};

export const GeometryModuleSchema: FieldMetadata = {
  name: 'geometry',
  type: 'object',
  required: true,
  label: 'Geometry',
  sectionStyle: 'inspector',
  description: 'Physical shape definition',
    fields: {
      type: {
        name: 'type',
        type: 'enum',
        enumValues: [
        'none',
        'image',
        'box',
        'sphere',
        'cylinder',
        'capsule',
        'cone',
        'pyramid',
        'hemisphere',
        'icosahedron',
        'torus',
        'roundedBox',
        'wedge',
        'lathe',
        'star',
        'hollowCylinder',
        'displacedPlane',
        'extrudedPolygon'
        ],
        enumOptions: [
          { value: 'none', icon: 'close', label: 'None' },
          { value: 'image', icon: 'box', label: 'Image' },
          { value: 'box', icon: 'box', label: 'Box' },
          { value: 'sphere', icon: 'sphere', label: 'Sphere' },
          { value: 'cylinder', icon: 'cylinder', label: 'Cylinder' },
          { value: 'capsule', icon: 'cylinder', label: 'Capsule' },
          { value: 'cone', icon: 'cone', label: 'Cone' },
          { value: 'pyramid', icon: 'pyramid', label: 'Pyramid' },
          { value: 'hemisphere', icon: 'hemisphere', label: 'Hemisphere' },
          { value: 'icosahedron', icon: 'cube', label: 'Icosahedron' },
          { value: 'torus', icon: 'primitive', label: 'Torus' },
          { value: 'roundedBox', icon: 'box', label: 'Rounded Box' },
          { value: 'wedge', icon: 'pyramid', label: 'Wedge' },
          { value: 'lathe', icon: 'primitive', label: 'Lathe' },
          { value: 'star', icon: 'primitive', label: 'Star' },
          { value: 'hollowCylinder', icon: 'cylinder', label: 'Hollow Cylinder' },
          { value: 'displacedPlane', icon: 'shape', label: 'Displaced Plane' },
          { value: 'extrudedPolygon', icon: 'primitive', label: 'Extruded Polygon' },
        ],
        required: true,
        defaultValue: 'box',
        label: ''
      },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type', // Uses sibling 'type' field
      required: true,
      defaultValue: 'box',
      unionTypes: {
        none: [],
        image: [
          {
            name: 'width',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Width',
            condensedLabel: 'W',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            compactRow: 'dimensions',
            displayMode: 'compact',
          }
        ],
        box: [
          {
            name: 'lengthX',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Width (X)',
            condensedLabel: 'X',
            icon: 'arrowRight',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'lengthY',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height (Y)',
            condensedLabel: 'Y',
            icon: 'arrowUp',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'lengthZ',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Depth (Z)',
            condensedLabel: 'Z',
            compactRow: 'dimensions',
            displayMode: 'compact',
          }
        ],
        sphere: [
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Radius',
            condensedLabel: 'R',
            icon: 'sphere',
            displayMode: 'compact',
          }
        ],
        cylinder: [
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Radius',
            condensedLabel: 'R',
            icon: 'sphere',
            compactRow: 'size',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            icon: 'arrowUp',
            compactRow: 'size',
            displayMode: 'compact',
          },
          {
            name: 'arc',
            type: 'number',
            required: false,
            defaultValue: Math.PI * 2,
            min: 0,
            max: Math.PI * 2,
            step: 0.1,
            label: 'Arc (rad)',
            condensedLabel: 'A',
            compactRow: 'size',
            displayMode: 'compact',
          }
        ],
        capsule: [
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Radius',
            condensedLabel: 'R',
            icon: 'sphere',
            compactRow: 'size',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            icon: 'arrowUp',
            compactRow: 'size',
            displayMode: 'compact',
          }
        ],
        cone: [
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Base Radius',
            condensedLabel: 'R',
            icon: 'sphere',
            compactRow: 'size',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            icon: 'arrowUp',
            compactRow: 'size',
            displayMode: 'compact',
          },
          {
            name: 'arc',
            type: 'number',
            required: false,
            defaultValue: Math.PI * 2,
            min: 0,
            max: Math.PI * 2,
            step: 0.1,
            label: 'Arc (rad)',
            condensedLabel: 'A',
            compactRow: 'size',
            displayMode: 'compact',
          }
        ],
        pyramid: [
          {
            name: 'width',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Width',
            condensedLabel: 'W',
            icon: 'arrowRight',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            icon: 'arrowUp',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'depth',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Depth',
            condensedLabel: 'D',
            compactRow: 'dimensions',
            displayMode: 'compact',
          }
        ],
        hemisphere: [
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Radius',
            condensedLabel: 'R',
            icon: 'sphere',
            displayMode: 'compact',
          }
        ],
        icosahedron: [
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Radius',
            condensedLabel: 'R',
            icon: 'sphere',
            displayMode: 'compact',
          }
        ],
        torus: [
          {
            name: 'majorRadius',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Major Radius',
            condensedLabel: 'Ma',
            compactRow: 'radii',
            displayMode: 'compact',
          },
          {
            name: 'minorRadius',
            type: 'number',
            required: true,
            defaultValue: 0.25,
            min: 0.01,
            step: 0.05,
            label: 'Minor Radius',
            condensedLabel: 'Mi',
            compactRow: 'radii',
            displayMode: 'compact',
          },
          {
            name: 'arc',
            type: 'number',
            required: false,
            defaultValue: Math.PI * 2,
            min: 0,
            max: Math.PI * 2,
            step: 0.1,
            label: 'Arc (rad)',
            condensedLabel: 'A',
            compactRow: 'radii',
            displayMode: 'compact',
          }
        ],
        roundedBox: [
          {
            name: 'lengthX',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Width (X)',
            condensedLabel: 'X',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'lengthY',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height (Y)',
            condensedLabel: 'Y',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'lengthZ',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Depth (Z)',
            condensedLabel: 'Z',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'radius',
            type: 'number',
            required: true,
            defaultValue: 0.1,
            min: 0,
            step: 0.05,
            label: 'Corner Radius',
            condensedLabel: 'R',
            compactRow: 'shape',
            displayMode: 'compact',
          },
          {
            name: 'segments',
            type: 'number',
            required: false,
            defaultValue: 3,
            min: 1,
            step: 1,
            label: 'Segments',
            condensedLabel: 'Seg',
            compactRow: 'shape',
            displayMode: 'compact',
          }
        ],
        wedge: [
          {
            name: 'width',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Width',
            condensedLabel: 'W',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            compactRow: 'dimensions',
            displayMode: 'compact',
          },
          {
            name: 'depth',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Depth',
            condensedLabel: 'D',
            compactRow: 'dimensions',
            displayMode: 'compact',
          }
        ],
        lathe: [
          {
            name: 'profile',
            type: 'object',
            required: true,
            label: 'Profile',
            defaultValue: {
              type: 'polyline',
              params: {
                points: [
                  { u: 0, v: 0 },
                  { u: 0.2, v: 0.25 },
                  { u: 0.35, v: 0.6 },
                  { u: 0.15, v: 1 },
                ],
                closed: false,
              },
            },
            fields: {
              type: {
                name: 'type',
                type: 'enum',
                required: true,
                enumValues: ['polyline', 'polygon', 'circle', 'rectangle'],
                defaultValue: 'polyline',
              },
              params: {
                name: 'params',
                type: 'union',
                required: true,
                discriminator: 'type',
                unionTypes: Shape2DParamsUnion as any,
              }
            }
          },
          {
            name: 'segments',
            type: 'number',
            required: false,
            defaultValue: 24,
            min: 3,
            step: 1,
            label: 'Segments',
            condensedLabel: 'Seg',
            displayMode: 'compact',
          },
          {
            name: 'capped',
            type: 'boolean',
            required: false,
            defaultValue: true,
            label: 'Capped Ends',
          }
        ],
        star: [
          {
            name: 'outerRadius',
            type: 'number',
            required: true,
            defaultValue: 0.75,
            min: 0.1,
            step: 0.05,
            label: 'Outer Radius',
            condensedLabel: 'Ro',
            compactRow: 'radii',
            displayMode: 'compact',
          },
          {
            name: 'innerRadius',
            type: 'number',
            required: true,
            defaultValue: 0.35,
            min: 0.05,
            step: 0.05,
            label: 'Inner Radius',
            condensedLabel: 'Ri',
            compactRow: 'radii',
            displayMode: 'compact',
          },
          {
            name: 'points',
            type: 'number',
            required: true,
            defaultValue: 5,
            min: 3,
            step: 1,
            label: 'Points',
            condensedLabel: 'P',
            compactRow: 'shape',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0.1,
            step: 0.1,
            label: 'Height',
            condensedLabel: 'H',
            compactRow: 'shape',
            displayMode: 'compact',
          }
        ],
        hollowCylinder: [
          {
            name: 'outerRadius',
            type: 'number',
            required: true,
            defaultValue: 0.6,
            min: 0.1,
            step: 0.1,
            label: 'Outer Radius',
            condensedLabel: 'Ro',
            compactRow: 'radii',
            displayMode: 'compact',
          },
          {
            name: 'innerRadius',
            type: 'number',
            required: true,
            defaultValue: 0.4,
            min: 0.05,
            step: 0.05,
            label: 'Inner Radius',
            condensedLabel: 'Ri',
            compactRow: 'radii',
            displayMode: 'compact',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height',
          },
          {
            name: 'arc',
            type: 'number',
            required: false,
            defaultValue: Math.PI * 2,
            min: 0,
            max: Math.PI * 2,
            step: 0.1,
            label: 'Arc (rad)',
            condensedLabel: 'A',
            compactRow: 'radii',
            displayMode: 'compact',
          }
        ],
        displacedPlane: [
          {
            name: 'lengthX',
            type: 'number',
            required: true,
            defaultValue: 10,
            min: 0.1,
            step: 0.5,
            label: 'Length X'
          },
          {
            name: 'lengthZ',
            type: 'number',
            required: true,
            defaultValue: 10,
            min: 0.1,
            step: 0.5,
            label: 'Length Z'
          },
          { ...FieldDefinitionSchema, name: 'field' }
        ],
        extrudedPolygon: [
          {
            name: 'shape',
            type: 'object',
            required: true,
            defaultValue: {
              type: 'polygon',
              params: {
                points: [
                  { u: -0.5, v: -0.5 },
                  { u: 0.5, v: -0.5 },
                  { u: 0.5, v: 0.5 },
                  { u: -0.5, v: 0.5 },
                ],
                closed: true,
              },
            },
            fields: {
              type: {
                name: 'type',
                type: 'enum',
                required: true,
                enumValues: ['polyline', 'polygon', 'circle', 'rectangle'],
                defaultValue: 'polygon',
              },
              params: {
                name: 'params',
                type: 'union',
                required: true,
                discriminator: 'type',
                unionTypes: Shape2DParamsUnion as any,
              }
            }
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            label: 'Height'
          }
        ]
      }
    }
  }
};

export const DeformOpSchema: FieldMetadata = {
  name: 'deformOp',
  type: 'object',
  required: true,
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      enumValues: ['taper'],
      enumOptions: [
        { value: 'taper', icon: 'arrowUp', label: 'Taper' },
      ],
      required: true,
      defaultValue: 'taper',
      label: 'Operation'
    },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: true,
      defaultValue: 'taper',
      unionTypes: {
        taper: [
          {
            name: 'axis',
            type: 'enum',
            required: true,
            enumValues: ['x', 'y', 'z'],
            defaultValue: 'y',
            label: 'Axis',
            condensedLabel: 'Axis',
            compactRow: 'deform',
            displayMode: 'compact',
          },
          {
            name: 'factor',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0,
            step: 0.05,
            label: 'Factor',
            condensedLabel: 'F',
            compactRow: 'deform',
            displayMode: 'compact',
          }
        ]
      }
    }
  }
};

export const SymmetryOpSchema: FieldMetadata = {
  name: 'symmetryOp',
  type: 'object',
  required: true,
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      enumValues: ['mirror'],
      enumOptions: [
        { value: 'mirror', icon: 'duplicate', label: 'Mirror' },
      ],
      required: true,
      defaultValue: 'mirror',
      label: 'Operation'
    },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: true,
      defaultValue: 'mirror',
      unionTypes: {
        mirror: [
          {
            name: 'axis',
            type: 'enum',
            required: true,
            enumValues: ['x', 'y', 'z'],
            defaultValue: 'x',
            label: 'Axis',
            condensedLabel: 'Axis',
            displayMode: 'compact',
          },
          {
            name: 'planeOffset',
            type: 'number',
            required: false,
            defaultValue: 0,
            step: 0.05,
            label: 'Plane Offset',
            condensedLabel: 'Offset',
            displayMode: 'compact',
          },
          {
            name: 'sourceSide',
            type: 'enum',
            required: false,
            enumValues: ['both', 'positive', 'negative'],
            defaultValue: 'both',
            label: 'Source Side',
            condensedLabel: 'Source',
            displayMode: 'compact',
          }
        ]
      }
    }
  }
};

export const GroupOperationSchema: FieldMetadata = {
  name: 'operation',
  type: 'object',
  required: false,
  label: 'Group Operation',
  sectionStyle: 'inspector',
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      required: true,
      enumValues: ['none', 'union', 'subtract', 'intersect', 'exclude', 'taper', 'mirror', 'place'],
      defaultValue: 'none',
      label: 'Type'
    },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: true,
      unionTypes: {
        none: [],
        union: [],
        subtract: [],
        intersect: [],
        exclude: [],
        taper: [
          {
            name: 'axis',
            type: 'enum',
            required: true,
            enumValues: ['x', 'y', 'z'],
            defaultValue: 'y',
            label: 'Axis',
            condensedLabel: 'Axis',
            compactRow: 'operation',
            displayMode: 'compact',
          },
          {
            name: 'factor',
            type: 'number',
            required: true,
            defaultValue: 0.5,
            min: 0,
            step: 0.05,
            label: 'Factor',
            condensedLabel: 'F',
            compactRow: 'operation',
            displayMode: 'compact',
          }
        ],
        mirror: [
          {
            name: 'axis',
            type: 'enum',
            required: true,
            enumValues: ['x', 'y', 'z'],
            defaultValue: 'x',
            label: 'Axis',
            condensedLabel: 'Axis',
            displayMode: 'compact',
          },
          {
            name: 'planeOffset',
            type: 'number',
            required: false,
            defaultValue: 0,
            step: 0.05,
            label: 'Plane Offset',
            condensedLabel: 'Offset',
            displayMode: 'compact',
          },
          {
            name: 'sourceSide',
            type: 'enum',
            required: false,
            enumValues: ['both', 'positive', 'negative'],
            defaultValue: 'both',
            label: 'Source Side',
            condensedLabel: 'Source',
            displayMode: 'compact',
          }
        ],
        place: [
          {
            name: 'placement',
            type: 'object',
            required: true,
            fields: {
              type: {
                name: 'type',
                type: 'enum',
                required: true,
                enumValues: ['points', 'line', 'circle', 'spiral', 'polyline', 'grid', 'random', 'cluster', 'poisson'],
                defaultValue: 'points',
                label: 'Placement Type',
              },
              params: {
                name: 'params',
                type: 'union',
                required: true,
                discriminator: 'type',
                label: 'Placement Params',
                unionTypes: {
                  points: [
                    {
                      name: 'positions',
                      type: 'array',
                      required: true,
                      itemType: {
                        name: 'position',
                        type: 'vector3',
                        required: true,
                        defaultValue: { x: 0, y: 0, z: 0 },
                      },
                    },
                  ],
                  line: [
                    {
                      name: 'start',
                      type: 'vector3',
                      required: true,
                      defaultValue: { x: -1, y: 0, z: 0 },
                    },
                    {
                      name: 'end',
                      type: 'vector3',
                      required: true,
                      defaultValue: { x: 1, y: 0, z: 0 },
                    },
                    {
                      name: 'count',
                      type: 'number',
                      required: true,
                      defaultValue: 3,
                      min: 1,
                      step: 1,
                    },
                  ],
                  circle: [
                    {
                      name: 'center',
                      type: 'vector3',
                      required: true,
                      defaultValue: { x: 0, y: 0, z: 0 },
                    },
                    {
                      name: 'radius',
                      type: 'number',
                      required: true,
                      defaultValue: 1,
                      min: 0,
                      step: 0.1,
                    },
                    {
                      name: 'count',
                      type: 'number',
                      required: true,
                      defaultValue: 8,
                      min: 1,
                      step: 1,
                    },
                  ],
                  spiral: [
                    {
                      name: 'center',
                      type: 'vector3',
                      required: true,
                      defaultValue: { x: 0, y: 0, z: 0 },
                    },
                    {
                      name: 'startRadius',
                      type: 'number',
                      required: true,
                      defaultValue: 0.2,
                      min: 0,
                      step: 0.1,
                    },
                    {
                      name: 'endRadius',
                      type: 'number',
                      required: true,
                      defaultValue: 1,
                      min: 0,
                      step: 0.1,
                    },
                    {
                      name: 'turns',
                      type: 'number',
                      required: true,
                      defaultValue: 2,
                      min: 0,
                      step: 0.1,
                    },
                    {
                      name: 'count',
                      type: 'number',
                      required: true,
                      defaultValue: 12,
                      min: 1,
                      step: 1,
                    },
                  ],
                  polyline: [
                    {
                      name: 'path',
                      type: 'object',
                      required: true,
                      fields: {
                        type: {
                          name: 'type',
                          type: 'enum',
                          required: true,
                          enumValues: ['polyline', 'line', 'circle', 'rectangle'],
                          defaultValue: 'polyline',
                        },
                        params: {
                          name: 'params',
                          type: 'union',
                          required: true,
                          discriminator: 'type',
                          unionTypes: {
                            polyline: [
                              {
                                name: 'points',
                                type: 'array',
                                required: true,
                                itemType: {
                                  name: 'point',
                                  type: 'vector3',
                                  required: true,
                                  defaultValue: { x: 0, y: 0, z: 0 },
                                },
                              },
                              {
                                name: 'closed',
                                type: 'boolean',
                                required: false,
                                defaultValue: false,
                              },
                            ],
                            line: [
                              {
                                name: 'start',
                                type: 'vector3',
                                required: true,
                                defaultValue: { x: -1, y: 0, z: 0 },
                              },
                              {
                                name: 'end',
                                type: 'vector3',
                                required: true,
                                defaultValue: { x: 1, y: 0, z: 0 },
                              },
                              {
                                name: 'segments',
                                type: 'number',
                                required: false,
                                defaultValue: 1,
                                min: 1,
                                step: 1,
                              },
                            ],
                            circle: [
                              {
                                name: 'center',
                                type: 'vector3',
                                required: true,
                                defaultValue: { x: 0, y: 0, z: 0 },
                              },
                              {
                                name: 'radius',
                                type: 'number',
                                required: true,
                                defaultValue: 1,
                                min: 0,
                                step: 0.1,
                              },
                              {
                                name: 'segments',
                                type: 'number',
                                required: true,
                                defaultValue: 24,
                                min: 3,
                                step: 1,
                              },
                            ],
                            rectangle: [
                              {
                                name: 'center',
                                type: 'vector3',
                                required: true,
                                defaultValue: { x: 0, y: 0, z: 0 },
                              },
                              {
                                name: 'width',
                                type: 'number',
                                required: true,
                                defaultValue: 1,
                                min: 0,
                                step: 0.1,
                              },
                              {
                                name: 'depth',
                                type: 'number',
                                required: true,
                                defaultValue: 1,
                                min: 0,
                                step: 0.1,
                              },
                              {
                                name: 'closed',
                                type: 'boolean',
                                required: false,
                                defaultValue: true,
                              },
                            ],
                          },
                        },
                      },
                    },
                    {
                      name: 'spacing',
                      type: 'number',
                      required: true,
                      defaultValue: 1,
                      min: 0.01,
                      step: 0.1,
                    },
                    {
                      name: 'offset',
                      type: 'number',
                      required: false,
                      defaultValue: 0,
                      step: 0.1,
                    },
                    {
                      name: 'orientation',
                      type: 'enum',
                      required: false,
                      enumValues: ['none', 'tangent', 'radial', 'fixed'],
                      defaultValue: 'none',
                    },
                    {
                      name: 'fixedYaw',
                      type: 'number',
                      required: false,
                      step: 0.05,
                    },
                  ],
                  grid: [
                    {
                      name: 'bounds',
                      type: 'object',
                      required: true,
                      fields: {
                        x: {
                          name: 'x',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        z: {
                          name: 'z',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        y: {
                          name: 'y',
                          type: 'array',
                          required: false,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                      },
                    },
                    {
                      name: 'spacing',
                      type: 'object',
                      required: true,
                      fields: {
                        x: { name: 'x', type: 'number', required: true, defaultValue: 1, min: 0.01, step: 0.1 },
                        z: { name: 'z', type: 'number', required: true, defaultValue: 1, min: 0.01, step: 0.1 },
                      },
                    },
                    {
                      name: 'jitter',
                      type: 'number',
                      required: false,
                      defaultValue: 0,
                      min: 0,
                      step: 0.05,
                    },
                  ],
                  random: [
                    {
                      name: 'bounds',
                      type: 'object',
                      required: true,
                      fields: {
                        x: {
                          name: 'x',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        z: {
                          name: 'z',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        y: {
                          name: 'y',
                          type: 'array',
                          required: false,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                      },
                    },
                    {
                      name: 'count',
                      type: 'number',
                      required: true,
                      defaultValue: 8,
                      min: 1,
                      step: 1,
                    },
                  ],
                  cluster: [
                    {
                      name: 'bounds',
                      type: 'object',
                      required: true,
                      fields: {
                        x: {
                          name: 'x',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        z: {
                          name: 'z',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        y: {
                          name: 'y',
                          type: 'array',
                          required: false,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                      },
                    },
                    { name: 'clusterCount', type: 'number', required: true, defaultValue: 3, min: 1, step: 1 },
                    { name: 'perCluster', type: 'number', required: true, defaultValue: 4, min: 1, step: 1 },
                    { name: 'clusterRadius', type: 'number', required: true, defaultValue: 1, min: 0.01, step: 0.1 },
                    { name: 'clusterSeparation', type: 'number', required: false, defaultValue: 0, min: 0, step: 0.1 },
                  ],
                  poisson: [
                    {
                      name: 'bounds',
                      type: 'object',
                      required: true,
                      fields: {
                        x: {
                          name: 'x',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        z: {
                          name: 'z',
                          type: 'array',
                          required: true,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                        y: {
                          name: 'y',
                          type: 'array',
                          required: false,
                          itemType: { name: 'value', type: 'number', required: true, defaultValue: 0 },
                        },
                      },
                    },
                    {
                      name: 'minDistance',
                      type: 'number',
                      required: true,
                      defaultValue: 0.5,
                      min: 0.01,
                      step: 0.05,
                    },
                    {
                      name: 'maxAttempts',
                      type: 'number',
                      required: false,
                      defaultValue: 30,
                      min: 1,
                      step: 1,
                    },
                  ],
                },
              },
            },
          },
          {
            name: 'orientation',
            type: 'enum',
            required: false,
            enumValues: ['none', 'tangent', 'radial', 'fixed'],
            defaultValue: 'none',
            label: 'Orientation',
          },
          {
            name: 'fixedYaw',
            type: 'number',
            required: false,
            step: 0.05,
            label: 'Fixed Yaw',
          },
          {
            name: 'seed',
            type: 'number',
            required: false,
            step: 1,
            label: 'Seed',
          }
        ]
      }
    }
  }
};

/**
 * Material module schema
 * Follows the MaterialDefinition union type from schema.ts
 */
export const MaterialModuleSchema: FieldMetadata = {
  name: 'material',
  type: 'object',
  required: false,
  label: 'Material',
  sectionStyle: 'inspector',
  description: 'Visual material definition',
    fields: {
      type: {
        name: 'type',
        type: 'enum',
        enumValues: ['none', 'image', 'solid', 'wireframe', 'liquid', 'marble', 'wood'],
        enumOptions: [
          { value: 'none', icon: 'close', label: 'None' },
          { value: 'image', icon: 'box', label: 'Image' },
          { value: 'solid', icon: 'cube', label: 'Solid' },
          { value: 'wireframe', icon: 'primitive', label: 'Wireframe' },
          { value: 'liquid', icon: 'liquid', label: 'Liquid' },
          { value: 'marble', icon: 'marble', label: 'Marble' },
          { value: 'wood', icon: 'wood', label: 'Wood' },
        ],
        required: true,
        defaultValue: 'solid',
        label: ''
      },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: false,
      unionTypes: {
        none: [],
        image: [
          {
            name: 'src',
            type: 'string',
            required: true,
            defaultValue: '/point.svg',
            label: 'Source',
            description: 'Image asset URL or path',
          },
          {
            name: 'opacity',
            type: 'number',
            required: false,
            defaultValue: 1,
            min: 0,
            max: 1,
            step: 0.05,
            label: 'Opacity',
            condensedLabel: 'O',
            icon: 'opacity',
            displayMode: 'compact',
            compactRow: 'surface',
          },
          {
            name: 'doubleSided',
            type: 'boolean',
            required: false,
            defaultValue: false,
            label: 'Double Sided',
          }
        ],
        solid: [
          {
            name: 'color',
            type: 'color',
            required: false,
            defaultValue: '#dddddd',
            label: 'Color',
            description: 'Hex color code',
            displayMode: 'compact',
            compactRow: 'color'
          },
          {
            name: 'emissive',
            type: 'color',
            required: false,
            defaultValue: '#000000',
            label: 'Emissive',
            description: 'Glow color contribution',
            displayMode: 'compact',
            compactRow: 'emissive'
          },
          {
            name: 'emissiveIntensity',
            type: 'number',
            required: false,
            defaultValue: 1,
            min: 0,
            max: 10,
            step: 0.1,
            label: 'Emissive Intensity',
            condensedLabel: 'EI',
            icon: 'lightning',
            compactRow: 'emissive',
            displayMode: 'compact'
          },
          { name: 'metalness', type: 'number', required: false, defaultValue: 0, min: 0, max: 1, step: 0.1, label: 'Metalness', condensedLabel: 'M', icon: 'metalness', compactRow: 'surface', displayMode: 'compact' },
          { name: 'roughness', type: 'number', required: false, defaultValue: 0.5, min: 0, max: 1, step: 0.1, label: 'Roughness', condensedLabel: 'R', icon: 'roughness', compactRow: 'surface', displayMode: 'compact' },
          { name: 'opacity', type: 'number', required: false, defaultValue: 1, min: 0, max: 1, step: 0.05, label: 'Opacity', condensedLabel: 'O', icon: 'opacity', displayMode: 'compact', compactRow: 'color' },
          { name: 'flatShading', type: 'boolean', required: false, defaultValue: false, label: 'Flat Shading' }
        ],
        wireframe: [
          { name: 'color', type: 'color', required: false, defaultValue: '#ffffff', label: 'Color', displayMode: 'compact', compactRow: 'color' },
          { name: 'opacity', type: 'number', required: false, defaultValue: 1, min: 0, max: 1, step: 0.05, label: 'Opacity', condensedLabel: 'O', icon: 'opacity', displayMode: 'compact', compactRow: 'color' }
        ],
        liquid: [
          { name: 'baseColor', type: 'color', required: false, defaultValue: '#4FC3F7', label: 'Base Color', displayMode: 'compact', compactRow: 'color' },
          { name: 'depthTint', type: 'color', required: false, defaultValue: '#0288D1', label: 'Depth Tint', compactRow: 'depth' },
          { name: 'depthScale', type: 'number', required: false, defaultValue: 1, min: 0, step: 0.1, label: 'Depth Scale', condensedLabel: 'D', icon: 'depthScale', displayMode: 'compact', compactRow: 'depth' },
          { name: 'opacity', type: 'number', required: false, defaultValue: 0.8, min: 0, max: 1, step: 0.05, label: 'Opacity', condensedLabel: 'O', icon: 'opacity', displayMode: 'compact', compactRow: 'color' },
          { name: 'waveFreq', type: 'number', required: false, defaultValue: 1, min: 0, step: 0.1, label: 'Wave Freq', condensedLabel: 'F', compactRow: 'wave', displayMode: 'compact' },
          { name: 'waveAmp', type: 'number', required: false, defaultValue: 1, min: 0, step: 0.1, label: 'Wave Amp', condensedLabel: 'A', compactRow: 'wave', displayMode: 'compact' },
          { name: 'waveSpeed', type: 'number', required: false, defaultValue: 1, min: 0, step: 0.1, label: 'Wave Speed', condensedLabel: 'S', compactRow: 'wave', displayMode: 'compact' }
        ],
        marble: [
          { name: 'color', type: 'color', required: false, defaultValue: '#eceff1', label: 'Color' },
          { name: 'grainColor', type: 'color', required: false, defaultValue: '#90a4ae', label: 'Grain Color' },
          { name: 'grainSize', type: 'number', required: false, defaultValue: 1, min: 0, step: 0.1, label: 'Grain Size', condensedLabel: 'G', displayMode: 'compact' },
          { name: 'seed', type: 'number', required: false, defaultValue: 0, step: 1, label: 'Seed', condensedLabel: 'S', displayMode: 'compact' }
        ],
        wood: [
          { name: 'color', type: 'color', required: false, defaultValue: '#8d6e63', label: 'Color' },
          { name: 'grainColor', type: 'color', required: false, defaultValue: '#5d4037', label: 'Grain Color' },
          { name: 'grainSize', type: 'number', required: false, defaultValue: 1, min: 0, step: 0.1, label: 'Grain Size', condensedLabel: 'G', displayMode: 'compact' },
          { name: 'grainDirection', type: 'vector3', required: false, defaultValue: { x: 1, y: 0, z: 0 }, label: 'Grain Direction' },
          { name: 'seed', type: 'number', required: false, defaultValue: 0, step: 1, label: 'Seed', condensedLabel: 'S', displayMode: 'compact' }
        ]
      }
    }
  }
};

export const LightModuleSchema: FieldMetadata = {
  name: 'light',
  type: 'object',
  required: true,
  label: 'Light',
  sectionStyle: 'inspector',
    fields: {
      type: {
        name: 'type',
        type: 'enum',
        required: true,
        enumValues: ['point', 'spot'],
        enumOptions: [
          { value: 'point', icon: 'point', label: 'Point' },
          { value: 'spot', icon: 'spot', label: 'Spot' },
        ],
        defaultValue: 'point'
      },
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: true,
      unionTypes: {
        point: [
          { name: 'intensity', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1, label: 'Intensity', condensedLabel: 'I', compactRow: 'light', displayMode: 'compact' },
          { name: 'range', type: 'number', required: true, defaultValue: 10, min: 0, step: 0.5, label: 'Range', condensedLabel: 'R', compactRow: 'light', displayMode: 'compact' },
          { name: 'color', type: 'color', required: false, defaultValue: '#ffffff', label: 'Color' }
        ],
        spot: [
          { name: 'intensity', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1, label: 'Intensity', condensedLabel: 'I', compactRow: 'light', displayMode: 'compact' },
          { name: 'range', type: 'number', required: true, defaultValue: 10, min: 0, step: 0.5, label: 'Range', condensedLabel: 'R', compactRow: 'light', displayMode: 'compact' },
          { name: 'beamAngle', type: 'number', required: true, defaultValue: 0.4, min: 0, step: 0.05, label: 'Beam Angle', condensedLabel: 'A', displayMode: 'compact' },
          { name: 'color', type: 'color', required: false, defaultValue: '#ffffff', label: 'Color' },
          { ...Vector3Field, name: 'direction', label: 'Direction' }
        ]
      }
    }
  }
};

export const AnimationKeyframeSchema: FieldMetadata = {
  name: 'keyframe',
  type: 'object',
  required: true,
  fields: {
    time: { name: 'time', type: 'number', required: true, defaultValue: 0, min: 0, step: 0.01 },
    position: { ...Vector3Field, name: 'position', label: 'Position' },
    rotation: { ...Vector3Field, name: 'rotation', label: 'Rotation' },
    scale: { ...Vector3Field, name: 'scale', label: 'Scale' },
  },
};

export const AnimationTrackSchema: FieldMetadata = {
  name: 'track',
  type: 'object',
  required: true,
  fields: {
    targetTag: { name: 'targetTag', type: 'string', required: true, defaultValue: '' },
    keyframes: {
      name: 'keyframes',
      type: 'array',
      required: true,
      itemType: AnimationKeyframeSchema,
    },
  },
};

export const AnimationClipSchema: FieldMetadata = {
  name: 'clip',
  type: 'object',
  required: true,
  fields: {
    name: { name: 'name', type: 'string', required: true, defaultValue: 'default', label: 'Clip Name' },
    duration: { name: 'duration', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1 },
    tracks: {
      name: 'tracks',
      type: 'array',
      required: true,
      itemType: undefined as any,
    }
  }
};

(AnimationClipSchema.fields!.tracks as any).itemType = AnimationTrackSchema;

(FieldDefinitionSchema.fields!.params as any).unionTypes.composite[1].itemType = FieldDefinitionSchema;
