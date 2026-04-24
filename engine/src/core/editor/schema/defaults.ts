import { ComponentSchema, FieldMetadata } from './FieldMetadata';

export function buildFieldDefault(meta: FieldMetadata): any {
  switch (meta.type) {
    case 'number':
      return meta.defaultValue ?? 0;
    case 'string':
      return meta.defaultValue ?? '';
    case 'boolean':
      return meta.defaultValue ?? false;
    case 'vector3':
      return meta.defaultValue ?? { x: 0, y: 0, z: 0 };
    case 'quaternion':
      return meta.defaultValue ?? { x: 0, y: 0, z: 0, w: 1 };
    case 'color':
      return meta.defaultValue ?? '#ffffff';
    case 'enum':
      return meta.defaultValue ?? meta.enumOptions?.[0]?.value ?? meta.enumValues?.[0];
    case 'array':
      return meta.defaultValue ?? [];
    case 'object':
    case 'moduleReference': {
      const obj: Record<string, any> = {};
      if (meta.fields) {
        for (const [fieldName, fieldMeta] of Object.entries(meta.fields)) {
          obj[fieldName] = buildFieldDefault(fieldMeta);
        }
      }
      return { ...obj, ...(meta.defaultValue ?? {}) };
    }
    case 'union': {
      const unionTypes = meta.unionTypes || {};
      const discriminator = meta.discriminator || 'type';
      const defaultKey = (meta.defaultValue as string) ?? Object.keys(unionTypes)[0];
      const unionFields = unionTypes[defaultKey] || [];
      const unionValue: Record<string, any> = { [discriminator]: defaultKey };
      for (const field of unionFields) {
        unionValue[field.name] = buildFieldDefault(field);
      }
      return unionValue;
    }
    default:
      return meta.defaultValue;
  }
}

export function buildComponentDefaults(schema: ComponentSchema): Record<string, any> {
  const data: Record<string, any> = {};
  for (const [fieldName, meta] of Object.entries(schema.fields)) {
    data[fieldName] = buildFieldDefault(meta);
  }
  return data;
}
