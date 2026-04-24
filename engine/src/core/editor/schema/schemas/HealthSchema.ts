/**
 * Health Component Schema
 * Entity health/damage system
 */

import { ComponentSchema } from '../FieldMetadata';

export const HealthSchema: ComponentSchema = {
  name: 'Health',
  displayName: 'Health',
  description: 'Entity health and damage tracking',
  isStructural: false, // Health can be changed without respawn
  inspectorPlacement: 'hidden',
  icon: 'health', // Figma-like icon for component header
  
  fields: {
    value: {
      name: 'value',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
      step: 1,
      label: 'Current Health',
      description: 'Current health value',
      displayMode: 'compact',
    },
    
    maxValue: {
      name: 'maxValue',
      type: 'number',
      required: false,
      defaultValue: 100,
      min: 1,
      step: 1,
      label: 'Max Health',
      description: 'Maximum health value',
      displayMode: 'compact',
    }
  },
  
  requiredFields: ['value']
};
