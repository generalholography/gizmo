/**
 * Info Component Schema
 * Entity name and description metadata
 */

import { ComponentSchema } from '../FieldMetadata';

export const InfoSchema: ComponentSchema = {
  name: 'Info',
  displayName: 'Info',
  description: 'Entity name and description',
  inspectorOrder: 0,
  inspectorPlacement: 'metadata',
  removable: false,
  isStructural: false, // Info can be changed without respawn
  
  fields: {
    name: {
      name: 'name',
      type: 'string',
      required: true,
      defaultValue: 'Unnamed Entity',
      label: 'Name',
      description: 'Display name for this entity'
    },
    
    description: {
      name: 'description',
      type: 'string',
      required: false,
      defaultValue: '',
      label: 'Description',
      description: 'Detailed description of this entity'
    }
  },
  
  requiredFields: ['name']
};
