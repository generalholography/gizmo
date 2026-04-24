import { ComponentSchema } from '../FieldMetadata';
import { AnimationClipSchema } from '../ModuleSchemas';

export const AnimationSchema: ComponentSchema = {
  name: 'Animation',
  displayName: 'Animation',
  description: 'Animation clips and tracks',
  isStructural: true,
  inspectorTab: 'animation',
  icon: 'animation', // Figma-like icon for component header
  fields: {
    clips: {
      name: 'clips',
      type: 'array',
      required: true,
      itemType: AnimationClipSchema,
      label: 'Clips'
    }
  },
  requiredFields: ['clips']
};
