import { describe, it, expect, beforeEach } from 'vitest';
import { worldSchemaRegistry, WorldDimensionsSchema, WorldMetadataSchema } from '../worldSchemas';

describe('WorldSchemaRegistry', () => {
  beforeEach(() => {
    worldSchemaRegistry.clear();
  });

  it('notifies subscribers when schemas are registered or cleared', () => {
    let notifications = 0;
    const unsubscribe = worldSchemaRegistry.subscribe(() => {
      notifications += 1;
    });

    worldSchemaRegistry.register(WorldMetadataSchema);
    expect(notifications).toBe(1);

    worldSchemaRegistry.clear();
    expect(notifications).toBe(2);

    unsubscribe();
  });

  it('defines grouped world surfaces for metadata and dimensions', () => {
    expect(WorldMetadataSchema.groups?.map((group) => group.label)).toEqual(['General', 'Branding']);
    expect(WorldMetadataSchema.fields.title.group).toBe('general');
    expect(WorldMetadataSchema.fields.brandColors.group).toBe('branding');

    const dimensionsField = WorldDimensionsSchema.fields.dimensions;
    expect(WorldDimensionsSchema.groups?.map((group) => group.label)).toEqual(['Environment']);
    expect(dimensionsField.itemType?.type).toBe('object');
    if (dimensionsField.itemType?.type !== 'object' || !dimensionsField.itemType.fields) {
      throw new Error('Expected dimensions item type fields');
    }
    expect(dimensionsField.itemType.fields.gravity.group).toBe('environment');
    expect(dimensionsField.itemType.fields.sky.sectionStyle).toBe('inspector');
    expect(dimensionsField.itemType.fields.terrain.sectionStyle).toBe('inspector');
  });
});
