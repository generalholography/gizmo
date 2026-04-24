import { FieldMetadata } from '../FieldMetadata';
import { EFFECT_TARGET_OPTIONS, EFFECT_TYPE_OPTIONS } from '../../../schema';
import { EffectField } from './EffectSchemas';
import { ConditionDefinitionField } from './ConditionSchemas';

const LEAF_ACTION_TYPES = [...EFFECT_TYPE_OPTIONS] as const;
const CONTROL_ACTION_TYPES = ['sequence', 'firstSuccess', 'parallel', 'if'] as const;
const ACTION_TYPE_VALUES = [...LEAF_ACTION_TYPES, ...CONTROL_ACTION_TYPES];
const ACTION_TYPE_ICONS: Record<string, string> = {
  sequence: 'arrowRight',
  firstSuccess: 'confirm',
  parallel: 'adjustments',
  if: 'tool',
  teleport: 'adjustments',
  kill: 'close',
  getPickedUp: 'user',
  addToInventory: 'add',
  removeFromInventory: 'close',
  incrementStock: 'adjustments',
  setMetric: 'edit',
  incrementMetric: 'plusMinus',
  damage: 'health',
  heal: 'health',
  spawnEntityFrom: 'add',
  spawnAtHit: 'add',
  emitParticles: 'animation',
  emitEvent: 'info',
  mount: 'tool',
  discover: 'experiment',
  popup: 'info',
};

const effectParamUnionTypes = (EffectField as any).fields.params.unionTypes as Record<string, FieldMetadata[]>;

const leafUnionTypes: Record<string, FieldMetadata[]> = Object.fromEntries(
  LEAF_ACTION_TYPES.map((type) => {
    const sourceFields = effectParamUnionTypes[type] ?? [];
    return [type, sourceFields.map((field) => ({ ...field }))];
  }),
);

const ActionSchema: any = {
  name: 'action',
  type: 'object',
  required: true,
  defaultValue: { type: 'emitEvent', target: 'self', params: { name: 'event_name' } },
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      required: true,
      enumValues: ACTION_TYPE_VALUES,
      enumOptions: ACTION_TYPE_VALUES.map((value) => ({
        value,
        label: value,
        icon: ACTION_TYPE_ICONS[value] ?? 'effect',
      })),
      defaultValue: 'emitEvent',
      displayMode: 'compact',
      compactLabelMode: 'none',
      compactRow: 'action_type',
    },
    target: {
      name: 'target',
      type: 'enum',
      required: false,
      enumValues: [...EFFECT_TARGET_OPTIONS],
      defaultValue: 'self',
      displayMode: 'compact',
      icon: 'user',
      iconOnly: true,
      compactRow: 'action_scope',
    },
    range: {
      name: 'range',
      type: 'number',
      required: false,
      min: 0,
      step: 0.1,
      displayMode: 'compact',
      icon: 'radius',
      iconOnly: true,
      compactRow: 'action_scope',
    },
    params: {
      name: 'params',
      type: 'union',
      required: false,
      discriminator: 'type',
      unionTypes: {
        ...leafUnionTypes,
        sequence: [
          {
            name: 'actions',
            type: 'array',
            required: true,
            itemType: undefined as any,
          },
          {
            name: 'continueOnFailure',
            type: 'boolean',
            required: false,
            defaultValue: false,
            displayMode: 'compact',
            icon: 'arrowRight',
            iconOnly: true,
          },
        ],
        firstSuccess: [
          {
            name: 'actions',
            type: 'array',
            required: true,
            itemType: undefined as any,
          },
        ],
        parallel: [
          {
            name: 'actions',
            type: 'array',
            required: true,
            itemType: undefined as any,
          },
          {
            name: 'successPolicy',
            type: 'enum',
            required: false,
            enumValues: ['all', 'any'],
            defaultValue: 'all',
            displayMode: 'compact',
            icon: 'adjustments',
            iconOnly: true,
          },
        ],
        if: [
          {
            ...ConditionDefinitionField,
            name: 'condition',
            required: true,
          },
          {
            name: 'then',
            type: 'object',
            required: true,
            fields: undefined as any,
          },
          {
            name: 'else',
            type: 'object',
            required: false,
            fields: undefined as any,
          },
        ],
      },
    },
  },
};

ActionSchema.fields.params.unionTypes.sequence[0].itemType = ActionSchema;
ActionSchema.fields.params.unionTypes.firstSuccess[0].itemType = ActionSchema;
ActionSchema.fields.params.unionTypes.parallel[0].itemType = ActionSchema;
ActionSchema.fields.params.unionTypes.if[1].fields = ActionSchema.fields;
ActionSchema.fields.params.unionTypes.if[2].fields = ActionSchema.fields;

export const ActionDefinitionField: FieldMetadata = ActionSchema;
