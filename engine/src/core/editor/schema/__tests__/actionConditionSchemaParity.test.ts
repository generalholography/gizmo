import { describe, expect, it } from 'vitest';
import { ActionDefinitionField } from '../schemas/ActionSchemas';
import { ConditionDefinitionField } from '../schemas/ConditionSchemas';
import { ACTION_CONTROL_FLOW_TYPE_OPTIONS } from '../../../../modules/action';
import { CONDITION_TYPE_OPTIONS } from '../../../../modules/condition';
import { EFFECT_TYPE_OPTIONS } from '../../../schema';

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe('action/condition schema parity', () => {
  it('keeps action type options aligned with runtime canonical action and effect types', () => {
    const actionTypeValues = (ActionDefinitionField as any).fields.type.enumValues as string[];
    const expected = [...EFFECT_TYPE_OPTIONS, ...ACTION_CONTROL_FLOW_TYPE_OPTIONS];

    expect(sorted(actionTypeValues)).toEqual(sorted(expected));
    expect(actionTypeValues).not.toContain('operation');
    expect(actionTypeValues).not.toContain('selector');
    expect(actionTypeValues).toContain('firstSuccess');
  });

  it('keeps condition type options canonical', () => {
    const conditionTypeValues = (ConditionDefinitionField as any).fields.type.enumValues as string[];

    expect(sorted(conditionTypeValues)).toEqual(sorted(CONDITION_TYPE_OPTIONS));
    expect(conditionTypeValues).not.toContain('greaterThanOrEqual');
    expect(conditionTypeValues).not.toContain('equals');
    expect(conditionTypeValues).not.toContain('sum');
  });
});
