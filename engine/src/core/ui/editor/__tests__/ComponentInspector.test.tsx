// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { componentSchemaRegistry } from '../../../editor/schema/ComponentSchemaRegistry';
import { TransformSchema } from '../../../editor/schema/schemas/TransformSchema';
import { BodySchema } from '../../../editor/schema/schemas/BodySchema';
import { HealthSchema } from '../../../editor/schema/schemas/HealthSchema';
import { AISchema } from '../../../editor/schema/schemas/AISchema';
import { MotionSourceSchema } from '../../../editor/schema/schemas/MotionSourceSchema';
import { InfoSchema } from '../../../editor/schema/schemas/InfoSchema';
import {
  DamageFlashSchema,
  FactionSchema,
  StableIDSchema,
  StaticCameraSchema,
  VelocitySchema,
} from '../../../editor/schema/schemas/GameplaySchemas';
import { resolveInspectorComponents } from '../ComponentInspector';

describe('resolveInspectorComponents', () => {
  beforeEach(() => {
    componentSchemaRegistry.clear();
    componentSchemaRegistry.register(TransformSchema);
    componentSchemaRegistry.register(BodySchema);
    componentSchemaRegistry.register(HealthSchema);
    componentSchemaRegistry.register(InfoSchema);
    componentSchemaRegistry.register(StableIDSchema);
    componentSchemaRegistry.register(DamageFlashSchema);
    componentSchemaRegistry.register(AISchema);
    componentSchemaRegistry.register(FactionSchema);
    componentSchemaRegistry.register(MotionSourceSchema);
    componentSchemaRegistry.register(StaticCameraSchema);
    componentSchemaRegistry.register(VelocitySchema);
  });

  it('includes registered but missing tab components and omits metadata/hidden ones', () => {
    const resolved = resolveInspectorComponents({
      components: {
        Transform: { x: 0, y: 0, z: 0 },
        Health: { value: 20, maxValue: 20 },
      },
      activeTab: 'design',
    });

    expect(resolved).toEqual([
      { name: 'Transform', isPresent: true },
      { name: 'Body', isPresent: false },
    ]);
  });

  it('routes simulation and metadata surfaces through the same registry model', () => {
    const simulate = resolveInspectorComponents({
      components: {},
      activeTab: 'simulate',
    });
    const metadata = resolveInspectorComponents({
      components: {},
      activeTab: 'design',
      placement: 'metadata',
    });

    expect(simulate.map((entry) => entry.name)).toEqual(['AI', 'Faction', 'MotionSource']);
    expect(metadata.map((entry) => entry.name)).toEqual(['Info', 'StableID', 'DamageFlash']);
  });

  it('does not surface hidden runtime components in any inspector surface', () => {
    const resolved = resolveInspectorComponents({
      components: {
        Velocity: { x: 1, y: 2, z: 3 },
      },
      activeTab: 'render',
    });

    expect(resolved.map((entry) => entry.name)).toEqual(['StaticCamera']);
  });
});
