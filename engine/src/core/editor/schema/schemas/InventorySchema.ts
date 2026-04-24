import { ComponentSchema } from '../FieldMetadata';

export const InventorySchema: ComponentSchema = {
  name: 'Inventory',
  displayName: 'Inventory',
  description: 'Inventory size, selection, and item definitions',
  inspectorPlacement: 'hidden',
  addable: false,
  isStructural: false,
  fields: {
    size: {
      name: 'size',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      step: 1,
      label: 'Slots'
    },
    selectedItemIndex: {
      name: 'selectedItemIndex',
      type: 'number',
      required: false,
      defaultValue: 0,
      min: 0,
      step: 1,
      label: 'Selected Slot'
    },
    items: {
      name: 'items',
      type: 'array',
      required: false,
      itemType: {
        name: 'item',
        type: 'moduleReference',
        required: false,
        moduleName: 'inventoryItem',
        description: 'Entity definition or material entry',
        fields: {
          type: {
            name: 'type',
            type: 'enum',
            enumValues: ['entity', 'material'],
            required: false,
            defaultValue: 'entity'
          },
          definition: {
            name: 'definition',
            type: 'moduleReference',
            required: false,
            moduleName: 'archetype',
            description: 'Archetype name or entity bundle'
          },
          amount: {
            name: 'amount',
            type: 'number',
            required: false,
            defaultValue: 1,
            min: 1,
            step: 1
          }
        }
      },
      label: 'Items'
    }
  },
  requiredFields: ['size']
};
