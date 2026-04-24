import { ComponentSchema } from '../FieldMetadata';

export const FactionSchema: ComponentSchema = {
  name: 'Faction',
  displayName: 'Faction',
  description: 'Faction identifier',
  inspectorTab: 'simulate',
  isStructural: false,
  fields: {
    id: {
      name: 'id',
      type: 'string',
      required: true,
      defaultValue: 'neutral',
      label: 'Faction Id'
    }
  },
  requiredFields: ['id']
};

export const PlayerSchema: ComponentSchema = {
  name: 'Player',
  displayName: 'Player',
  description: 'Marks entity as player controlled',
  inspectorTab: 'simulate',
  isStructural: false,
  fields: {
    id: {
      name: 'id',
      type: 'string',
      required: false,
      defaultValue: 'player',
      label: 'Player Id'
    }
  }
};

export const StableIDSchema: ComponentSchema = {
  name: 'StableID',
  displayName: 'Stable ID',
  description: 'Persistent identifier',
  inspectorOrder: 1,
  inspectorPlacement: 'metadata',
  removable: false,
  isStructural: true,
  fields: {
    id: {
      name: 'id',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Stable Id'
    }
  },
  requiredFields: ['id']
};

export const VelocitySchema: ComponentSchema = {
  name: 'Velocity',
  displayName: 'Velocity',
  description: 'Linear velocity',
  inspectorPlacement: 'hidden',
  addable: false,
  removable: false,
  isStructural: false,
  fields: {
    x: { name: 'x', type: 'number', required: false, defaultValue: 0, step: 0.1 },
    y: { name: 'y', type: 'number', required: false, defaultValue: 0, step: 0.1 },
    z: { name: 'z', type: 'number', required: false, defaultValue: 0, step: 0.1 }
  }
};

export const HeldSchema: ComponentSchema = {
  name: 'Held',
  displayName: 'Held',
  description: 'Indicates entity is held by another',
  inspectorPlacement: 'hidden',
  addable: false,
  removable: false,
  isStructural: false,
  fields: {
    eid: { name: 'eid', type: 'number', required: true, defaultValue: 0, label: 'Holder Entity Id' }
  },
  requiredFields: ['eid']
};

export const OwnerSchema: ComponentSchema = {
  name: 'Owner',
  displayName: 'Owner',
  description: 'Ownership reference',
  inspectorPlacement: 'hidden',
  addable: false,
  removable: false,
  isStructural: false,
  fields: {
    eid: { name: 'eid', type: 'number', required: true, defaultValue: 0, label: 'Owner Entity Id' }
  },
  requiredFields: ['eid']
};

export const MountingSchema: ComponentSchema = {
  name: 'Mounting',
  displayName: 'Mounting',
  description: 'Entity mounting another',
  inspectorPlacement: 'hidden',
  addable: false,
  removable: false,
  isStructural: false,
  fields: {
    target: { name: 'target', type: 'number', required: true, defaultValue: 0, label: 'Target Entity Id' },
    offsetX: { name: 'offsetX', type: 'number', required: false, defaultValue: 0, step: 0.1 },
    offsetY: { name: 'offsetY', type: 'number', required: false, defaultValue: 0, step: 0.1 },
    offsetZ: { name: 'offsetZ', type: 'number', required: false, defaultValue: 0, step: 0.1 }
  },
  requiredFields: ['target']
};

export const MountedBySchema: ComponentSchema = {
  name: 'MountedBy',
  displayName: 'Mounted By',
  description: 'Entity mounted by another',
  inspectorPlacement: 'hidden',
  addable: false,
  removable: false,
  isStructural: false,
  fields: {
    eid: { name: 'eid', type: 'number', required: true, defaultValue: 0, label: 'Rider Entity Id' }
  },
  requiredFields: ['eid']
};

export const StaticCameraSchema: ComponentSchema = {
  name: 'StaticCamera',
  displayName: 'Static Camera',
  description: 'Camera settings',
  inspectorTab: 'render',
  isStructural: false,
  fields: {
    fov: { name: 'fov', type: 'number', required: true, defaultValue: 75, min: 1, max: 179, step: 1 },
    lookAt: { name: 'lookAt', type: 'vector3', required: false, label: 'Look At' },
    lookAtX: { name: 'lookAtX', type: 'number', required: false, defaultValue: 0, step: 0.1 },
    lookAtY: { name: 'lookAtY', type: 'number', required: false, defaultValue: 0, step: 0.1 },
    lookAtZ: { name: 'lookAtZ', type: 'number', required: false, defaultValue: 0, step: 0.1 }
  },
  requiredFields: ['fov']
};

export const DamageFlashSchema: ComponentSchema = {
  name: 'DamageFlash',
  displayName: 'Damage Flash',
  description: 'Runtime damage flash settings',
  inspectorOrder: 2,
  inspectorPlacement: 'metadata',
  isStructural: false,
  fields: {
    duration: { name: 'duration', type: 'number', required: false, defaultValue: 0.15, step: 0.01 },
    intensity: { name: 'intensity', type: 'number', required: false, defaultValue: 1, step: 0.1 }
  }
};

export const SpawnedAtSchema: ComponentSchema = {
  name: 'SpawnedAt',
  displayName: 'Spawned At',
  description: 'Spawn timestamp (read only)',
  inspectorPlacement: 'hidden',
  addable: false,
  removable: false,
  isStructural: false,
  fields: {
    timestamp: { name: 'timestamp', type: 'number', required: false, defaultValue: 0, label: 'Timestamp' }
  }
};
