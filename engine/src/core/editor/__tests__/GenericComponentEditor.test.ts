/**
 * Generic Component Editor Tests
 * Tests for the schema-driven component editing system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentSchemaRegistry } from '../schema/ComponentSchemaRegistry';
import { ComponentSchema, FieldMetadata } from '../schema/FieldMetadata';
import { TransformSchema } from '../schema/schemas/TransformSchema';
import { BodySchema } from '../schema/schemas/BodySchema';
import { AISchema } from '../schema/schemas/AISchema';
import {
  DamageFlashSchema,
  FactionSchema,
  SpawnedAtSchema,
  StableIDSchema,
  StaticCameraSchema,
  VelocitySchema,
} from '../schema/schemas/GameplaySchemas';

describe('Component Schema Registry', () => {
  let registry: ComponentSchemaRegistry;

  beforeEach(() => {
    registry = new ComponentSchemaRegistry();
  });

  it('should register and retrieve schemas', () => {
    registry.register(TransformSchema);
    
    const schema = registry.get('Transform');
    expect(schema).toBeDefined();
    expect(schema?.name).toBe('Transform');
    expect(schema?.displayName).toBe('Transform');
  });

  it('should identify structural components', () => {
    registry.register(TransformSchema);
    registry.register(BodySchema);
    
    expect(registry.isStructural('Transform')).toBe(false);
    expect(registry.isStructural('Body')).toBe(true);
  });

  it('should list editable components', () => {
    registry.register(TransformSchema);
    registry.register(BodySchema);
    
    const components = registry.getEditableComponents();
    expect(components).toContain('Transform');
    expect(components).toContain('Body');
    expect(components.length).toBe(2);
  });

  it('should validate component data', () => {
    registry.register(TransformSchema);
    
    // Valid data
    const validResult = registry.validate('Transform', {
      x: 1,
      y: 2,
      z: 3
    });
    expect(validResult.valid).toBe(true);
    expect(validResult.errors.length).toBe(0);
  });

  it('should detect validation errors', () => {
    registry.register(BodySchema);
    
    // Missing required fields
    const invalidResult = registry.validate('Body', {});
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should validate number ranges', () => {
    const testSchema: ComponentSchema = {
      name: 'TestComponent',
      displayName: 'Test',
      isStructural: false,
      fields: {
        value: {
          name: 'value',
          type: 'number',
          required: true,
          min: 0,
          max: 100
        }
      },
      requiredFields: ['value']
    };
    
    registry.register(testSchema);
    
    // Valid range
    expect(registry.validate('TestComponent', { value: 50 }).valid).toBe(true);
    
    // Below min
    const belowMin = registry.validate('TestComponent', { value: -1 });
    expect(belowMin.valid).toBe(false);
    expect(belowMin.errors.some(e => e.field === 'value')).toBe(true);
    
    // Above max
    const aboveMax = registry.validate('TestComponent', { value: 101 });
    expect(aboveMax.valid).toBe(false);
    expect(aboveMax.errors.some(e => e.field === 'value')).toBe(true);
  });

  it('should validate enum values', () => {
    const testSchema: ComponentSchema = {
      name: 'TestEnum',
      displayName: 'Test Enum',
      isStructural: false,
      fields: {
        type: {
          name: 'type',
          type: 'enum',
          required: true,
          enumValues: ['option1', 'option2', 'option3']
        }
      },
      requiredFields: ['type']
    };
    
    registry.register(testSchema);
    
    // Valid enum
    expect(registry.validate('TestEnum', { type: 'option1' }).valid).toBe(true);
    
    // Invalid enum
    const invalid = registry.validate('TestEnum', { type: 'invalid' });
    expect(invalid.valid).toBe(false);
  });

  it('should clear all schemas', () => {
    registry.register(TransformSchema);
    registry.register(BodySchema);
    
    expect(registry.count()).toBe(2);
    
    registry.clear();
    
    expect(registry.count()).toBe(0);
    expect(registry.get('Transform')).toBeUndefined();
  });

  it('tracks inspector placement and add/remove policy', () => {
    registry.register(TransformSchema);
    registry.register(StableIDSchema);
    registry.register(VelocitySchema);

    expect(registry.getInspectorPlacement('Transform')).toBe('tab');
    expect(registry.isRemovable('Transform')).toBe(false);
    expect(registry.getInspectorPlacement('StableID')).toBe('metadata');
    expect(registry.getInspectorPlacement('Velocity')).toBe('hidden');
    expect(registry.isAddable('Velocity')).toBe(false);
  });

  it('returns registered components by surface', () => {
    registry.register(TransformSchema);
    registry.register(AISchema);
    registry.register(FactionSchema);
    registry.register(StableIDSchema);
    registry.register(DamageFlashSchema);
    registry.register(StaticCameraSchema);
    registry.register(SpawnedAtSchema);

    expect(registry.getComponentsForPlacement('tab', 'simulate')).toEqual(['AI', 'Faction']);
    expect(registry.getComponentsForPlacement('tab', 'render')).toEqual(['StaticCamera']);
    expect(registry.getComponentsForPlacement('metadata')).toEqual(['StableID', 'DamageFlash']);
  });
});

describe('Component Schemas', () => {
  describe('Transform Schema', () => {
    it('should have correct structure', () => {
      expect(TransformSchema.name).toBe('Transform');
      expect(TransformSchema.isStructural).toBe(false);
      expect(TransformSchema.removable).toBe(false);
      expect(TransformSchema.fields).toBeDefined();
    });

    it('should have position fields', () => {
      expect(TransformSchema.fields.position).toBeDefined();
      expect(TransformSchema.fields.position.type).toBe('vector3');
      expect(TransformSchema.fields.position.displayMode).toBe('compact');
    });

    it('should have rotation fields', () => {
      expect(TransformSchema.fields.rotation).toBeDefined();
      expect(TransformSchema.fields.rotation.type).toBe('vector3');
      expect(TransformSchema.fields.qx?.hidden).toBe(true);
    });

    it('should have scale fields', () => {
      expect(TransformSchema.fields.scale).toBeDefined();
      expect(TransformSchema.fields.scale.type).toBe('vector3');
      expect(TransformSchema.fields.scale.defaultValue).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('should render as ungrouped compact rows', () => {
      expect(TransformSchema.groups).toBeUndefined();
      expect(TransformSchema.fields.position.group).toBeUndefined();
      expect(TransformSchema.fields.rotation.group).toBeUndefined();
      expect(TransformSchema.fields.scale.group).toBeUndefined();
    });
  });

  describe('Body Schema', () => {
    it('should have correct structure', () => {
      expect(BodySchema.name).toBe('Body');
      expect(BodySchema.isStructural).toBe(true);
      expect(BodySchema.fields).toBeDefined();
    });

    it('should have type enum field', () => {
      expect(BodySchema.fields.type).toBeDefined();
      expect(BodySchema.fields.type.type).toBe('enum');
      expect(BodySchema.fields.type.enumValues).toEqual(['composite', 'gltf', 'humanoid']);
    });

    it('should have union params field', () => {
      expect(BodySchema.fields.params).toBeDefined();
      expect(BodySchema.fields.params.type).toBe('union');
      expect(BodySchema.fields.params.discriminator).toBe('type');
    });

    it('should have composite union type', () => {
      const unionTypes = BodySchema.fields.params.unionTypes;
      expect(unionTypes?.composite).toBeDefined();
      expect(Array.isArray(unionTypes?.composite)).toBe(true);
    });

    it('should have parts array in composite', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      expect(partsField).toBeDefined();
      expect(partsField?.type).toBe('array');
    });

    it('should have geometry object in primitive parts', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      // Body parts use BodyNodeSchema which is a union with primitive and light types
      // The primitive type contains the geometry field via GeometryModuleSchema
      const primitiveFields = partsField?.itemType?.unionTypes?.primitive;
      expect(primitiveFields).toBeDefined();
      const nameField = primitiveFields?.find((f: any) => f.name === 'name');
      const tagField = primitiveFields?.find((f: any) => f.name === 'tag');
      expect(nameField?.type).toBe('string');
      expect(tagField?.type).toBe('string');
      const geometryField = primitiveFields?.find((f: any) => f.name === 'geometry');
      expect(geometryField).toBeDefined();
      expect(geometryField?.type).toBe('object');
      // Geometry is now an object with { type, params } structure
      expect(geometryField?.fields?.type).toBeDefined();
      expect(geometryField?.fields?.params).toBeDefined();
    });

    it('should have box geometry type with params', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      // Body parts use BodyNodeSchema which is a union with primitive and light types
      const primitiveFields = partsField?.itemType?.unionTypes?.primitive;
      const geometryField = primitiveFields?.find((f: any) => f.name === 'geometry');
      const paramsField = geometryField?.fields?.params;
      const boxFields = paramsField?.unionTypes?.box;
      expect(boxFields).toBeDefined();
      expect(boxFields?.length).toBe(3); // lengthX, lengthY, lengthZ
    });

    it('should expose image geometry params', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      const primitiveFields = partsField?.itemType?.unionTypes?.primitive;
      const geometryField = primitiveFields?.find((f: any) => f.name === 'geometry');
      const paramsField = geometryField?.fields?.params;
      const imageFields = paramsField?.unionTypes?.image;

      expect(geometryField?.fields?.type?.enumValues).toContain('image');
      expect(imageFields?.find((f: any) => f.name === 'width')).toBeDefined();
      expect(imageFields?.find((f: any) => f.name === 'height')).toBeDefined();
    });

    it('should not expose primitive deform/symmetry arrays', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      const primitiveFields = partsField?.itemType?.unionTypes?.primitive;
      const deformField = primitiveFields?.find((f: any) => f.name === 'deform');
      const symmetryField = primitiveFields?.find((f: any) => f.name === 'symmetry');

      expect(deformField).toBeUndefined();
      expect(symmetryField).toBeUndefined();
    });

    it('should expose object-based group operation with type+params', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      const groupFields = partsField?.itemType?.unionTypes?.group;
      const operationField = groupFields?.find((f: any) => f.name === 'operation');

      expect(operationField).toBeDefined();
      expect(operationField?.type).toBe('object');
      expect(operationField?.fields?.type?.enumValues).toEqual(['none', 'union', 'subtract', 'intersect', 'exclude', 'taper', 'mirror', 'place']);
      const taperParams = operationField?.fields?.params?.unionTypes?.taper;
      const mirrorParams = operationField?.fields?.params?.unionTypes?.mirror;
      const placeParams = operationField?.fields?.params?.unionTypes?.place;
      expect(taperParams?.find((f: any) => f.name === 'axis')).toBeDefined();
      expect(taperParams?.find((f: any) => f.name === 'factor')).toBeDefined();
      expect(mirrorParams?.find((f: any) => f.name === 'planeOffset')).toBeDefined();
      expect(mirrorParams?.find((f: any) => f.name === 'sourceSide')).toBeDefined();
      expect(placeParams?.find((f: any) => f.name === 'placement')).toBeDefined();
      const orientationField = placeParams?.find((f: any) => f.name === 'orientation');
      expect(orientationField?.enumValues).toEqual(['none', 'tangent', 'radial', 'fixed']);
      expect(placeParams?.find((f: any) => f.name === 'fixedYaw')).toBeDefined();
    });

    it('should expose Shape2D params as discriminated unions for lathe and extrudedPolygon', () => {
      const composite = BodySchema.fields.params.unionTypes?.composite;
      const partsField = composite?.find(f => f.name === 'parts');
      const primitiveFields = partsField?.itemType?.unionTypes?.primitive;
      const geometryField = primitiveFields?.find((f: any) => f.name === 'geometry');
      const paramsField = geometryField?.fields?.params;

      const latheFields = paramsField?.unionTypes?.lathe;
      const profileField = latheFields?.find((f: any) => f.name === 'profile');
      const profileParamsField = profileField?.fields?.params;
      expect(profileParamsField?.type).toBe('union');
      expect(profileParamsField?.discriminator).toBe('type');
      expect(profileParamsField?.unionTypes?.polyline).toBeDefined();
      expect(profileParamsField?.unionTypes?.polygon).toBeDefined();
      expect(profileParamsField?.unionTypes?.circle).toBeDefined();
      expect(profileParamsField?.unionTypes?.rectangle).toBeDefined();

      const extrudedFields = paramsField?.unionTypes?.extrudedPolygon;
      const shapeField = extrudedFields?.find((f: any) => f.name === 'shape');
      const shapeParamsField = shapeField?.fields?.params;
      expect(shapeParamsField?.type).toBe('union');
      expect(shapeParamsField?.discriminator).toBe('type');
      expect(shapeParamsField?.unionTypes?.polyline).toBeDefined();
      expect(shapeParamsField?.unionTypes?.polygon).toBeDefined();
      expect(shapeParamsField?.unionTypes?.circle).toBeDefined();
      expect(shapeParamsField?.unionTypes?.rectangle).toBeDefined();
    });
  });
});

describe('Field Metadata', () => {
  it('should define field with constraints', () => {
    const field: FieldMetadata = {
      name: 'testField',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      step: 0.1,
      defaultValue: 50,
      label: 'Test Field',
      description: 'A test field'
    };

    expect(field.name).toBe('testField');
    expect(field.type).toBe('number');
    expect(field.min).toBe(0);
    expect(field.max).toBe(100);
  });

  it('should define enum field', () => {
    const field: FieldMetadata = {
      name: 'enumField',
      type: 'enum',
      required: true,
      enumValues: ['a', 'b', 'c']
    };

    expect(field.enumValues).toEqual(['a', 'b', 'c']);
  });

  it('should define union field', () => {
    const field: FieldMetadata = {
      name: 'unionField',
      type: 'union',
      required: true,
      discriminator: 'type',
      unionTypes: {
        typeA: [{ name: 'fieldA', type: 'string', required: true }],
        typeB: [{ name: 'fieldB', type: 'number', required: true }]
      }
    };

    expect(field.discriminator).toBe('type');
    expect(field.unionTypes?.typeA).toBeDefined();
  });
});
