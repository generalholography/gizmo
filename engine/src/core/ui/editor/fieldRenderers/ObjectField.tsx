/**
 * Object Field Renderer
 * Renders nested object fields recursively
 */

import React, { useMemo } from 'react';
import { Typography } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { GenericFieldRenderer } from './GenericFieldRenderer';
import { FieldRow, groupFieldsByCompactRow } from '../components/FieldRow';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';
import { InspectorComponentSection } from '../components/InspectorComponentSection';

const { Text } = Typography;

function cloneObjectValue(value: any): any {
  if (value === undefined || value === null) return {};
  if (Array.isArray(value)) return [...value];
  if (typeof value === 'object') return { ...value };
  return {};
}

function shouldUseInspectorSection(path: string): boolean {
  return (
    path.startsWith('bodyPart') ||
    path.startsWith('Body.params.parts') ||
    path.startsWith('dimensions[')
  );
}

export function ObjectField({ metadata, value, onChange, onCommit, path, disabled }: FieldRendererProps) {
  const currentValue = value !== undefined && value !== null
    ? cloneObjectValue(value)
    : cloneObjectValue(metadata.defaultValue);

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
  
  if (!metadata.fields) {
    return <Text type="danger">Object field missing fields definition</Text>;
  }

  const fields = metadata.fields || {};
  const isBodyModuleHeader = metadata.name === 'geometry' || metadata.name === 'material' || metadata.name === 'operation';
  const shouldRenderInspectorSection = metadata.sectionStyle === 'inspector' && shouldUseInspectorSection(path);

  const fieldRows = useMemo(
    () => groupFieldsByCompactRow(fields, currentValue),
    [fields, currentValue]
  );

  if (fieldRows.length === 0) {
    return null;
  }
  
  const content = (
    <div>
      {fieldRows.map(({ row, fields }) => {
        if (row) {
          return (
            <FieldRow
              key={`${path}.${row}`}
              fields={fields}
              onChange={(fieldName, fieldValue) => handleFieldChange(fieldName, fieldValue)}
              onCommit={(fieldName, fieldValue) => handleFieldChange(fieldName, fieldValue, true)}
              disabled={disabled}
            />
          );
        }

        return fields.map(({ name, metadata: fieldMeta }) => (
          <div key={`${path}.${name}`}>
            <GenericFieldRenderer
              metadata={fieldMeta}
              value={currentValue[name]}
              onChange={(val) => handleFieldChange(name, val)}
              onCommit={(val) => handleFieldChange(name, val, true)}
              path={`${path}.${name}`}
              disabled={disabled}
              parentValue={currentValue}
            />
          </div>
        ));
      })}
    </div>
  );

  if (shouldRenderInspectorSection) {
    return (
      <InspectorComponentSection
        title={metadata.label || metadata.name}
        description={metadata.description}
      >
        {content}
      </InspectorComponentSection>
    );
  }

  return (
    <div style={{ marginBottom: isBodyModuleHeader ? 0 : EDITOR_SPACING.sectionGap }}>
      {metadata.label && (
        <Text
          style={{
            color: isBodyModuleHeader ? EDITOR_COLORS.textPrimary : '#ccc',
            fontSize: isBodyModuleHeader ? EDITOR_TYPOGRAPHY.fontSizeLg : '12px',
            display: 'block',
            marginBottom: EDITOR_SPACING.sm,
            fontWeight: 'bold',
          }}
        >
          {metadata.label}
        </Text>
      )}
      {content}
    </div>
  );
}
