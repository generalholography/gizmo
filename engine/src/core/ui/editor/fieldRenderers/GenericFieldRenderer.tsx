/**
 * Generic Field Renderer
 * Dispatches to appropriate field renderer based on field type
 */

import React from 'react';
import { Typography } from 'antd';
import { FieldRendererProps, FieldRenderer } from './FieldRendererProps';
import { FieldType } from '../../../editor/schema/FieldMetadata';
import { NumberField } from './NumberField';
import { StringField } from './StringField';
import { BooleanField } from './BooleanField';
import { EnumField } from './EnumField';
import { Vector3Field } from './Vector3Field';
import { UnionField } from './UnionField';
import { ArrayField } from './ArrayField';
import { ObjectField } from './ObjectField';
import { ModuleReferenceField } from './ModuleReferenceField';
import { ColorField } from './ColorField';

const { Text } = Typography;

/**
 * Field renderer registry
 * Maps field types to their renderer components
 */
const fieldRenderers: Record<FieldType, FieldRenderer> = {
  number: NumberField,
  string: StringField,
  boolean: BooleanField,
  enum: EnumField,
  vector3: Vector3Field,
  union: UnionField,
  array: ArrayField,
  object: ObjectField,
  moduleReference: ModuleReferenceField,
  // Placeholder renderers for unsupported types
  quaternion: NumberField, // TODO: Implement quaternion editor
  color: ColorField,
};

/**
 * Generic field renderer that dispatches to the appropriate specific renderer
 */
export function GenericFieldRenderer(props: FieldRendererProps) {
  const { metadata, path } = props;
  
  // Skip hidden fields
  if (metadata.hidden) {
    return null;
  }
  
  // Get the appropriate renderer
  const Renderer = fieldRenderers[metadata.type];
  
  if (!Renderer) {
    return (
      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          {metadata.label || metadata.name}
        </Text>
        <Text type="danger">Unknown field type: {metadata.type}</Text>
      </div>
    );
  }
  
  return <Renderer {...props} />;
}
