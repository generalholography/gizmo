import { FieldMetadata } from '../FieldMetadata';
import {
  CONDITION_COMPARE_OPERATOR_OPTIONS,
  CONDITION_TYPE_OPTIONS,
  VALUE_EXPRESSION_TYPE_OPTIONS,
} from '../../../../modules/condition';

const ValueExpressionSchema: any = {
  name: 'valueExpression',
  type: 'object',
  required: true,
  defaultValue: { type: 'literal', params: { value: '' } },
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      required: true,
      enumValues: [...VALUE_EXPRESSION_TYPE_OPTIONS],
      defaultValue: 'literal',
    },
    params: {
      name: 'params',
      type: 'union',
      required: false,
      discriminator: 'type',
      unionTypes: {
        literal: [
          { name: 'value', type: 'string', required: false, defaultValue: '' },
        ],
        parameter: [
          { name: 'name', type: 'string', required: true, defaultValue: 'param' },
          { name: 'defaultValue', type: 'string', required: false, defaultValue: '' },
        ],
        metric: [
          { name: 'metric', type: 'string', required: true, defaultValue: 'score' },
          { name: 'subtype', type: 'string', required: false },
          { name: 'subject', type: 'string', required: false, defaultValue: 'self' },
          { name: 'defaultValue', type: 'number', required: false, defaultValue: 0, step: 1 },
        ],
        store: [
          { name: 'store', type: 'string', required: true, defaultValue: 'health' },
          { name: 'path', type: 'string', required: false, defaultValue: 'current' },
          { name: 'subject', type: 'string', required: false, defaultValue: 'self' },
          { name: 'defaultValue', type: 'string', required: false, defaultValue: '' },
        ],
        component: [
          { name: 'component', type: 'string', required: true, defaultValue: 'Transform' },
          { name: 'field', type: 'string', required: false, defaultValue: 'x' },
          { name: 'subject', type: 'string', required: false, defaultValue: 'self' },
          { name: 'defaultValue', type: 'string', required: false, defaultValue: '' },
        ],
        query: [
          { name: 'query', type: 'string', required: true, defaultValue: 'entityCount' },
          { name: 'params', type: 'object', required: false, fields: {} },
          { name: 'defaultValue', type: 'string', required: false, defaultValue: '' },
        ],
        sum: [
          {
            name: 'values',
            type: 'array',
            required: true,
            itemType: undefined as any,
          },
        ],
      },
    },
  },
};

const ConditionSchema: any = {
  name: 'condition',
  type: 'object',
  required: true,
  defaultValue: { type: 'always', params: {} },
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      required: true,
      enumValues: [...CONDITION_TYPE_OPTIONS],
      defaultValue: 'always',
    },
    params: {
      name: 'params',
      type: 'union',
      required: false,
      discriminator: 'type',
      unionTypes: {
        always: [],
        compare: [
          {
            name: 'operator',
            type: 'enum',
            required: true,
            enumValues: [...CONDITION_COMPARE_OPERATOR_OPTIONS],
            defaultValue: 'eq',
          },
          { ...ValueExpressionSchema, name: 'left', label: 'Left' },
          { ...ValueExpressionSchema, name: 'right', label: 'Right' },
        ],
        reference: [
          { name: 'name', type: 'string', required: true, defaultValue: 'condition_name' },
          { name: 'args', type: 'object', required: false, fields: {} },
        ],
        not: [
          {
            name: 'condition',
            type: 'object',
            required: true,
            fields: undefined as any,
          },
        ],
        all: [
          {
            name: 'conditions',
            type: 'array',
            required: true,
            itemType: undefined as any,
          },
        ],
        any: [
          {
            name: 'conditions',
            type: 'array',
            required: true,
            itemType: undefined as any,
          },
        ],
      },
    },
  },
};

ValueExpressionSchema.fields.params.unionTypes.sum[0].itemType = ValueExpressionSchema;
ConditionSchema.fields.params.unionTypes.not[0].fields = ConditionSchema.fields;
ConditionSchema.fields.params.unionTypes.all[0].itemType = ConditionSchema;
ConditionSchema.fields.params.unionTypes.any[0].itemType = ConditionSchema;

export const ValueExpressionField: FieldMetadata = ValueExpressionSchema;
export const ConditionDefinitionField: FieldMetadata = ConditionSchema;
