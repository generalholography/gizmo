/**
 * Module Reference Field Renderer
 * Renders a module reference (e.g., material, motion source)
 * For now, displays as JSON input until module picker is implemented
 */

import React from 'react';
import { Input, Typography, Tag } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { GenericFieldRenderer } from './GenericFieldRenderer';

const { Text } = Typography;
const { TextArea } = Input;

export function ModuleReferenceField({ metadata, value, onChange, onCommit, disabled }: FieldRendererProps) {
  const jsonValue = value ? JSON.stringify(value, null, 2) : '';

  const [jsonError, setJsonError] = React.useState<string | null>(null);

  const handleChange = (newValue: string) => {
    if (!newValue.trim()) {
      onChange(undefined);
      setJsonError(null);
      onCommit?.(undefined);
      return;
    }
    
    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed);
      onCommit?.(parsed);
      setJsonError(null);
    } catch (e) {
      // Invalid JSON, show error to user
      setJsonError((e as Error).message);
    }
  };
  
  const hasStructuredFields = metadata.fields && Object.keys(metadata.fields).length > 0;

  if (hasStructuredFields) {
    const currentValue = value || {};

    const handleFieldChange = (fieldName: string, fieldValue: any, commit = false) => {
      const nextValue = {
        ...currentValue,
        [fieldName]: fieldValue
      };
      onChange(nextValue);
      if (commit) {
        onCommit?.(nextValue);
      }
    };

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Text style={{ color: '#ccc', fontSize: '12px' }}>
            {metadata.label || metadata.name}
          </Text>
          <Tag color="blue" style={{ fontSize: '10px' }}>
            {metadata.moduleName || 'module'}
          </Tag>
        </div>
        <div>
          {Object.entries(metadata.fields!).map(([fieldName, fieldMeta]) => (
            <div key={fieldName}>
              <GenericFieldRenderer
                metadata={fieldMeta}
                value={currentValue[fieldName]}
                onChange={(val) => handleFieldChange(fieldName, val)}
                onCommit={(val) => handleFieldChange(fieldName, val, true)}
                path={`${metadata.name}.${fieldName}`}
                disabled={disabled}
                parentValue={currentValue}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px' }}>
          {metadata.label || metadata.name}
        </Text>
        <Tag color="blue" style={{ fontSize: '10px' }}>
          {metadata.moduleName || 'module'}
        </Tag>
      </div>

      <TextArea
        value={jsonValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`{"type": "solid", "params": {"color": "#808080"}}`}
        size="small"
        disabled={disabled}
        rows={4}
        onBlur={(e) => handleChange(e.target.value)}
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          borderColor: jsonError ? '#ff4d4f' : undefined
        }}
      />

      {jsonError && (
        <Text style={{ color: '#ff4d4f', fontSize: '11px', display: 'block', marginTop: '4px' }}>
          Invalid JSON: {jsonError}
        </Text>
      )}

    </div>
  );
}
