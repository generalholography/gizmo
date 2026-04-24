/**
 * AI Component Schema
 * AI behavior configuration
 */

import { ComponentSchema } from '../FieldMetadata';

export const AISchema: ComponentSchema = {
  name: 'AI',
  displayName: 'AI',
  description: 'AI behavior and awareness',
  inspectorTab: 'simulate',
  isStructural: false, // AI settings can be changed without respawn
  
  fields: {
    isAggressive: {
      name: 'isAggressive',
      type: 'boolean',
      required: true,
      defaultValue: false,
      label: 'Is Aggressive',
      description: 'Whether the AI will attack detected entities'
    },
    
    awarenessRange: {
      name: 'awarenessRange',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 0,
      step: 1,
      label: 'Awareness Range',
      description: 'Range within which AI can detect entities (in units)'
    }
  },
  
  requiredFields: ['isAggressive', 'awarenessRange']
};
