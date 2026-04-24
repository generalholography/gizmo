/**
 * Union Field Renderer
 * Renders a discriminated union type with type selector and conditional fields
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Select, Typography, Divider } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { FieldMetadata } from '../../../editor/schema/FieldMetadata';
import { GenericFieldRenderer } from './GenericFieldRenderer';
import { FieldRow, groupFieldsByCompactRow } from '../components/FieldRow';
import { EDITOR_SPACING } from '../styles/tokens';
import { InspectorComponentSection } from '../components/InspectorComponentSection';

const { Text } = Typography;

/**
 * Default values for different field types
 */
const DEFAULT_VALUES_BY_TYPE: Record<string, any> = {
  number: 0,
  string: '',
  boolean: false,
  vector3: { x: 0, y: 0, z: 0 },
  array: [],
  object: {}
};

/**
 * Get default value for a field based on its metadata
 */
function getFieldDefaultValue(field: FieldMetadata): any {
  // Use explicit default if provided
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  
  // For numbers, prefer min value if available
  if (field.type === 'number' && field.min !== undefined) {
    return field.min;
  }
  
  // For union types, initialize with the first type and its defaults
  if (field.type === 'union' && field.unionTypes && field.discriminator) {
    const firstType = Object.keys(field.unionTypes)[0];
    const firstTypeFields = field.unionTypes[firstType] || [];
    const unionValue: any = {};
    
    // Initialize all fields for the first type
    // NOTE: We do NOT include the discriminator in the union value itself
    // The discriminator is managed externally (by parent or sibling field)
    for (const unionField of firstTypeFields) {
      unionValue[unionField.name] = getFieldDefaultValue(unionField);
    }
    
    return unionValue;
  }
  
  // For object types, initialize with empty object or field defaults
  if (field.type === 'object' && field.fields) {
    const objValue: any = {};
    for (const [fieldName, fieldMeta] of Object.entries(field.fields)) {
      if (fieldMeta.required) {
        objValue[fieldName] = getFieldDefaultValue(fieldMeta);
      }
    }
    return objValue;
  }
  
  // Use type-based defaults
  return DEFAULT_VALUES_BY_TYPE[field.type];
}

/**
 * Get the discriminator value with fallback chain
 * 1. Try value from data
 * 2. Try first enum value (if discriminator is an enum)
 * 3. Use first union type key
 */
function getDiscriminatorValue(
  value: any,
  parentValue: any,
  discriminator: string,
  metadata: FieldMetadata
): string {
  return value?.[discriminator] ||
         parentValue?.[discriminator] ||
         metadata.enumOptions?.[0]?.value ||
         metadata.enumValues?.[0] ||
         Object.keys(metadata.unionTypes!)[0];
}

function isBodyPartContext(path: string): boolean {
  return path.startsWith('bodyPart') || path.startsWith('Body.params.parts');
}

interface RenderGroup {
  key: string;
  section?: string;
  description?: string;
  content: React.ReactNode[];
}

export function UnionField({ metadata, value, onChange, onCommit, path, disabled, parentValue }: FieldRendererProps) {
  if (!metadata.unionTypes || !metadata.discriminator) {
    return <Text type="danger">Union field missing unionTypes or discriminator</Text>;
  }

  const discriminatorValue = getDiscriminatorValue(value, parentValue, metadata.discriminator, metadata);
  const lastDiscriminatorRef = useRef<string>(discriminatorValue);
  
  // Get the fields for the current type
  const fieldsForType = metadata.unionTypes[discriminatorValue] || [];
  const fieldsRecord = useMemo(() => {
    const record: Record<string, FieldMetadata> = {};
    for (const fieldMeta of fieldsForType) {
      record[fieldMeta.name] = fieldMeta;
    }
    return record;
  }, [fieldsForType]);

  const fieldRows = useMemo(
    () => groupFieldsByCompactRow(fieldsRecord, value || {}),
    [fieldsRecord, value]
  );
  
  // Check if discriminator is a sibling field (e.g., geometry.type vs geometry.params)
  // If parent has the discriminator field, then it's managed by ObjectField, not us
  const discriminatorIsSibling = parentValue && parentValue[metadata.discriminator!] !== undefined;

  // When the discriminator is a sibling (managed by parent object), ensure we reset
  // the union value when the parent changes the discriminator so params match the
  // newly selected type.
  useEffect(() => {
    if (!discriminatorIsSibling) return;

    const siblingValue = parentValue?.[metadata.discriminator!];
    if (!siblingValue) return;

    if (siblingValue !== lastDiscriminatorRef.current) {
      const newTypeFields = metadata.unionTypes![siblingValue] || [];
      const newValue: any = {};

      for (const field of newTypeFields) {
        newValue[field.name] = getFieldDefaultValue(field);
      }

      lastDiscriminatorRef.current = siblingValue;
      onChange(newValue);
    }
  }, [
    discriminatorIsSibling,
    parentValue?.[metadata.discriminator!],
    metadata.discriminator,
    metadata.unionTypes,
    onChange
  ]);
  
  const handleTypeChange = (newType: string) => {
    // When type changes, create default values for the new type's fields
    const newTypeFields = metadata.unionTypes![newType] || [];
    const newValue: any = {};
    
    // Initialize ALL fields with default values for the new type
    // This ensures nested unions (like geometry) are properly initialized
    // NOTE: We do NOT include the discriminator in the union value itself
    // The discriminator is managed externally (by parent or sibling field)
    for (const field of newTypeFields) {
      newValue[field.name] = getFieldDefaultValue(field);
    }
    
    onChange(newValue);
    onCommit?.(newValue);
  };

  const handleFieldChange = useCallback((fieldName: string, fieldValue: any, commit = false) => {
    // Don't include the discriminator in the union value itself
    // The discriminator is managed by the parent (e.g., geometry.type or Body.type)
    const nextValue = {
      ...value,
      [fieldName]: fieldValue
    };
    onChange(nextValue);
    if (commit) {
      onCommit?.(nextValue);
    }
  }, [onChange, onCommit, value]);

  const renderedGroups = useMemo<RenderGroup[]>(() => {
    const groups: RenderGroup[] = [];
    const shouldRenderInspectorSections = isBodyPartContext(path);

    const pushEntry = (
      key: string,
      content: React.ReactNode,
      section?: string,
      description?: string
    ) => {
      const lastGroup = groups[groups.length - 1];
      if (section && lastGroup?.section === section) {
        lastGroup.content.push(content);
        return;
      }

      groups.push({
        key,
        section,
        description,
        content: [content],
      });
    };

    fieldRows.forEach(({ row, fields }) => {
      if (row) {
        const sharedSection =
          shouldRenderInspectorSections &&
          fields.length > 0 &&
          fields.every((field) => (
            field.metadata.sectionStyle === 'inspector' &&
            field.metadata.section === fields[0].metadata.section
          ))
            ? fields[0].metadata.section
            : undefined;

        pushEntry(
          `${path}.${row}`,
          <FieldRow
            key={`${path}.${row}`}
            fields={fields}
            onChange={(fieldName, fieldValue) => handleFieldChange(fieldName, fieldValue)}
            onCommit={(fieldName, fieldValue) => handleFieldChange(fieldName, fieldValue, true)}
            disabled={disabled}
          />,
          sharedSection,
          sharedSection ? fields[0].metadata.description : undefined
        );
        return;
      }

      fields.forEach(({ name, metadata: fieldMeta }) => {
        const section =
          shouldRenderInspectorSections && fieldMeta.sectionStyle === 'inspector'
            ? fieldMeta.section
            : undefined;

        pushEntry(
          `${path}.${name}`,
          <div key={`${path}.${name}`}>
            <GenericFieldRenderer
              metadata={fieldMeta}
              value={value?.[name]}
              onChange={(val) => handleFieldChange(name, val)}
              onCommit={(val) => handleFieldChange(name, val, true)}
              path={`${path}.${name}`}
              disabled={disabled}
              parentValue={value}
            />
          </div>,
          section,
          section ? fieldMeta.description : undefined
        );
      });
    });

    return groups;
  }, [disabled, fieldRows, handleFieldChange, path, value]);
  
  return (
    <div style={{ marginBottom: EDITOR_SPACING.sectionGap }}>
      {/* Only show type selector if discriminator is NOT a sibling field */}
      {!discriminatorIsSibling && (
        <>
          <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            {metadata.label || metadata.name} - Type
          </Text>
          <Select
            value={discriminatorValue}
            onChange={handleTypeChange}
            style={{ width: '100%', marginBottom: EDITOR_SPACING.sm }}
            size="small"
            disabled={disabled}
            options={Object.keys(metadata.unionTypes).map(type => ({
              label: type,
              value: type
            }))}
          />
        </>
      )}
      
      {/* Conditional fields based on selected type */}
      {fieldsForType.length > 0 && (
        <>
          {!discriminatorIsSibling && <Divider style={{ margin: '8px 0', background: '#444' }} />}
          <div>
            {renderedGroups.map((group) => (
              group.section ? (
                <InspectorComponentSection
                  key={group.key}
                  title={group.section}
                  description={group.description}
                >
                  {group.content}
                </InspectorComponentSection>
              ) : (
                <React.Fragment key={group.key}>
                  {group.content}
                </React.Fragment>
              )
            ))}
          </div>
        </>
      )}
      
    </div>
  );
}
