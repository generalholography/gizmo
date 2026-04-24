/**
 * Array Field Renderer
 * Renders an array with add/remove buttons
 */

import React from 'react';
import { Button, Typography, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FieldRendererProps } from './FieldRendererProps';
import { FieldMetadata } from '../../../editor/schema/FieldMetadata';
import { GenericFieldRenderer } from './GenericFieldRenderer';

const { Text } = Typography;

/**
 * Create a default value for a field based on its metadata
 */
function createDefaultValue(fieldMeta: FieldMetadata): any {
  // Use explicit default if provided
  if (fieldMeta.defaultValue !== undefined) {
    return fieldMeta.defaultValue;
  }
  
  // Generate defaults based on type
  switch (fieldMeta.type) {
    case 'number': 
      // Prefer min value if available
      return fieldMeta.min !== undefined ? fieldMeta.min : 0;
    case 'string': return '';
    case 'boolean': return false;
    case 'vector3': return { x: 0, y: 0, z: 0 };
    case 'union':
      // For unions, initialize with first type and its defaults
      if (fieldMeta.unionTypes && fieldMeta.discriminator) {
        const firstType = Object.keys(fieldMeta.unionTypes)[0];
        const firstTypeFields = fieldMeta.unionTypes[firstType] || [];
        const unionValue: any = {};
        
        // Initialize all fields for the first type
        // NOTE: We do NOT include the discriminator in the union value itself
        // The discriminator is managed externally (by parent or sibling field)
        for (const unionField of firstTypeFields) {
          unionValue[unionField.name] = createDefaultValue(unionField);
        }
        
        return unionValue;
      }
      return {};
    case 'object':
      if (fieldMeta.fields) {
        const obj: any = {};
        for (const [name, meta] of Object.entries(fieldMeta.fields)) {
          // Initialize all fields (not just required ones) to ensure completeness
          obj[name] = createDefaultValue(meta);
        }
        return obj;
      }
      return {};
    case 'array': return [];
    case 'enum': return fieldMeta.enumOptions?.[0]?.value ?? fieldMeta.enumValues?.[0];
    default: return undefined;
  }
}

export function ArrayField({ metadata, value, onChange, onCommit, path, disabled }: FieldRendererProps) {
  const currentValue: any[] = value || [];
  
  const handleAdd = () => {
    const defaultItem = metadata.itemType ? createDefaultValue(metadata.itemType) : {};
    const nextArray = [...currentValue, defaultItem];
    onChange(nextArray);
    onCommit?.(nextArray);
  };
  
  const handleRemove = (index: number) => {
    const newArray = [...currentValue];
    newArray.splice(index, 1);
    onChange(newArray);
    onCommit?.(newArray);
  };

  const handleItemChange = (index: number, itemValue: any) => {
    const newArray = [...currentValue];
    newArray[index] = itemValue;
    onChange(newArray);
  };

  const handleItemCommit = (index: number, itemValue: any) => {
    const newArray = [...currentValue];
    newArray[index] = itemValue;
    onChange(newArray);
    onCommit?.(newArray);
  };
  
  if (!metadata.itemType) {
    return <Text type="danger">Array field missing itemType</Text>;
  }
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', fontWeight: 'bold' }}>
          {metadata.label || metadata.name} ({currentValue.length})
        </Text>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={disabled}
        >
          Add
        </Button>
      </div>
      
      {currentValue.length === 0 ? (
        <Text style={{ color: '#666', fontSize: '11px', display: 'block', fontStyle: 'italic' }}>
          No items
        </Text>
      ) : (
        <div>
          {currentValue.map((item, index) => (
            <div
              key={`${path}[${index}]`}
              style={{
                marginBottom: '12px',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text style={{ color: '#999', fontSize: '11px' }}>Item {index + 1}</Text>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                />
              </div>
              <Divider style={{ margin: '8px 0', background: '#444' }} />
              <GenericFieldRenderer
                metadata={metadata.itemType}
                value={item}
                onChange={(val) => handleItemChange(index, val)}
                onCommit={(val) => handleItemCommit(index, val)}
                path={`${path}[${index}]`}
                disabled={disabled}
                parentValue={item}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
