import { describe, expect, it } from 'vitest';
import { EffectArrayField } from '../schemas/EffectSchemas';
import { EFFECT_TARGET_OPTIONS, EFFECT_TYPE_OPTIONS } from '../../../schema';
import { RUNTIME_EFFECT_TYPES } from '../../../../modules/effect';

function getEffectTypeValues(): string[] {
  const effectField = (EffectArrayField as any).itemType;
  return [...effectField.fields.type.enumValues];
}

function getEffectTargetValues(): string[] {
  const effectField = (EffectArrayField as any).itemType;
  return [...effectField.fields.target.enumValues];
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe('effect schema parity', () => {
  it('keeps effect type options aligned across runtime, schema, and editor metadata', () => {
    const editorTypes = getEffectTypeValues();
    expect(sorted(editorTypes)).toEqual(sorted(EFFECT_TYPE_OPTIONS));
    expect(sorted(editorTypes)).toEqual(sorted(RUNTIME_EFFECT_TYPES));
  });

  it('keeps target options aligned across schema and editor metadata', () => {
    const editorTargets = getEffectTargetValues();
    expect(sorted(editorTargets)).toEqual(sorted(EFFECT_TARGET_OPTIONS));
  });

  it('defines object field metadata for emitParticles and emitEvent params', () => {
    const effectField = (EffectArrayField as any).itemType;
    const params = effectField.fields.params;
    const emitParticles = params.unionTypes.emitParticles;
    const emitEvent = params.unionTypes.emitEvent;

    const emitter = emitParticles.find((field: any) => field.name === 'emitter');
    expect(emitter?.type).toBe('object');
    expect(emitter?.fields).toBeDefined();
    expect(emitter?.fields.shape?.type).toBe('object');
    expect(emitter?.fields.shape?.fields?.params?.type).toBe('union');

    const payload = emitEvent.find((field: any) => field.name === 'payload');
    expect(payload?.type).toBe('object');
    expect(payload?.fields).toBeDefined();
  });
});
