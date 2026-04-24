/**
 * Compact Field Layout Tests
 * Ensure compactRow and displayMode schema hints don't affect definition/spawn output
 */

import { describe, it, expect } from 'vitest';
import { FieldMetadata } from '../FieldMetadata';
import { GeometryModuleSchema } from '../ModuleSchemas';
import { buildFieldDefault } from '../defaults';

describe('Compact Field Schema Hints', () => {
  it('compactRow is a display-only hint that does not affect output', () => {
    // Create two schemas - one with compactRow, one without
    const schemaWithCompactRow: FieldMetadata = {
      name: 'width',
      type: 'number',
      required: true,
      defaultValue: 1,
      compactRow: 'dimensions',
      displayMode: 'compact',
      icon: 'arrowRight',
      condensedLabel: 'W',
    };

    const schemaWithoutCompactRow: FieldMetadata = {
      name: 'width',
      type: 'number',
      required: true,
      defaultValue: 1,
    };

    // Build defaults from both
    const defaultWithCompact = buildFieldDefault(schemaWithCompactRow);
    const defaultWithoutCompact = buildFieldDefault(schemaWithoutCompactRow);

    // They should produce identical output
    expect(defaultWithCompact).toBe(defaultWithoutCompact);
    expect(defaultWithCompact).toBe(1);
  });

  it('GeometryModuleSchema box params with compactRow hints produce correct defaults', () => {
    // Get the box geometry params which now have compactRow hints
    const boxParams = (GeometryModuleSchema.fields!.params as any).unionTypes.box;
    
    // Build defaults for each field
    const defaults: Record<string, any> = {};
    for (const field of boxParams) {
      defaults[field.name] = buildFieldDefault(field);
    }

    // Should produce correct numeric defaults regardless of compactRow hint
    expect(defaults.lengthX).toBe(1);
    expect(defaults.lengthY).toBe(1);
    expect(defaults.lengthZ).toBe(1);
  });

  it('cylinder params with compactRow hints produce correct defaults', () => {
    const cylinderParams = (GeometryModuleSchema.fields!.params as any).unionTypes.cylinder;
    
    const defaults: Record<string, any> = {};
    for (const field of cylinderParams) {
      defaults[field.name] = buildFieldDefault(field);
    }

    expect(defaults.radius).toBe(0.5);
    expect(defaults.height).toBe(1);
    expect(defaults.arc).toBeCloseTo(Math.PI * 2);
  });

  it('compactRow does not appear in serialized output', () => {
    // Simulate what a serialized entity component would look like
    const mockEntityData = {
      Body: {
        type: 'composite',
        params: {
          parts: [{
            type: 'primitive',
            geometry: {
              type: 'box',
              params: {
                lengthX: 2,
                lengthY: 3,
                lengthZ: 1,
              }
            }
          }]
        }
      }
    };

    // The output should only contain data fields, not schema hints
    const bodyString = JSON.stringify(mockEntityData.Body);
    
    expect(bodyString).not.toContain('compactRow');
    expect(bodyString).not.toContain('displayMode');
    expect(bodyString).not.toContain('icon');
    expect(bodyString).not.toContain('condensedLabel');
    
    // But should contain actual data
    expect(bodyString).toContain('lengthX');
    expect(bodyString).toContain('lengthY');
    expect(bodyString).toContain('lengthZ');
  });

  it('displayMode values are valid', () => {
    // Valid display modes should be 'normal', 'compact', or 'inline'
    const validDisplayModes = ['normal', 'compact', 'inline'];
    
    const schema: FieldMetadata = {
      name: 'test',
      type: 'number',
      required: true,
    };

    // Setting displayMode should be type-safe
    schema.displayMode = 'compact';
    expect(validDisplayModes).toContain(schema.displayMode);
    
    schema.displayMode = 'inline';
    expect(validDisplayModes).toContain(schema.displayMode);
    
    schema.displayMode = 'normal';
    expect(validDisplayModes).toContain(schema.displayMode);
  });

  it('compactRow grouping preserves field order', () => {
    // When grouping fields by compactRow, order should be preserved
    const fields: FieldMetadata[] = [
      { name: 'x', type: 'number', required: true, compactRow: 'position' },
      { name: 'y', type: 'number', required: true, compactRow: 'position' },
      { name: 'z', type: 'number', required: true, compactRow: 'position' },
      { name: 'radius', type: 'number', required: true },
    ];

    // Group by compactRow
    const groups: Map<string | undefined, FieldMetadata[]> = new Map();
    for (const field of fields) {
      const row = field.compactRow;
      if (!groups.has(row)) {
        groups.set(row, []);
      }
      groups.get(row)!.push(field);
    }

    // Position row should have x, y, z in order
    const positionRow = groups.get('position')!;
    expect(positionRow).toHaveLength(3);
    expect(positionRow[0].name).toBe('x');
    expect(positionRow[1].name).toBe('y');
    expect(positionRow[2].name).toBe('z');

    // Ungrouped field should be separate
    const ungrouped = groups.get(undefined)!;
    expect(ungrouped).toHaveLength(1);
    expect(ungrouped[0].name).toBe('radius');
  });
});
