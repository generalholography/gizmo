/**
 * Transform Component Schema
 * Position, rotation (quaternion), and scale
 */

import { ComponentSchema } from '../FieldMetadata';

export const TransformSchema: ComponentSchema = {
  name: 'Transform',
  displayName: 'Transform',
  description: 'Entity position, rotation, and scale in 3D space',
  inspectorOrder: 1,
  removable: false,
  isStructural: false, // Can hot-swap without respawn

  fields: {
    position: {
      name: 'position',
      type: 'vector3',
      required: false,
      defaultValue: { x: 0, y: 0, z: 0 },
      step: 0.1,
      label: 'Position',
      condensedLabel: 'Pos',
      displayMode: 'compact',
    },

    // Rotation (quaternion - internal representation)
    qx: {
      name: 'qx',
      type: 'number',
      required: false,
      defaultValue: 0,
      step: 0.01,
      label: 'Quaternion X',
      hidden: true, // Hide raw quaternion from UI
    },
    qy: {
      name: 'qy',
      type: 'number',
      required: false,
      defaultValue: 0,
      step: 0.01,
      label: 'Quaternion Y',
      hidden: true,
    },
    qz: {
      name: 'qz',
      type: 'number',
      required: false,
      defaultValue: 0,
      step: 0.01,
      label: 'Quaternion Z',
      hidden: true,
    },
    qw: {
      name: 'qw',
      type: 'number',
      required: false,
      defaultValue: 1,
      step: 0.01,
      label: 'Quaternion W',
      hidden: true,
    },

    rotation: {
      name: 'rotation',
      type: 'vector3',
      required: false,
      defaultValue: { x: 0, y: 0, z: 0 },
      step: 0.1,
      label: 'Rotation',
      description: 'Rotation around XYZ axes (radians)',
      condensedLabel: 'Rot',
      displayMode: 'compact',
    },

    scale: {
      name: 'scale',
      type: 'vector3',
      required: false,
      defaultValue: { x: 1, y: 1, z: 1 },
      step: 0.1,
      min: 0.01,
      label: 'Scale',
      condensedLabel: 'Scale',
      displayMode: 'compact',
    },
  },
};
