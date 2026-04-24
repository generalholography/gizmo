/**
 * Enum Field Renderer
 * Renders a select dropdown for enum values
 */

import React from 'react';
import { Select, Space, Tooltip, Typography } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EditorIcon, isValidEditorIcon, EditorIconName } from '../styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;

export function EnumField({ metadata, value, onChange, onCommit, disabled, path }: FieldRendererProps) {
  const currentValue = value ?? metadata.defaultValue ?? metadata.enumOptions?.[0]?.value;
  const isCompact = metadata.displayMode === 'compact' || metadata.displayMode === 'inline';
  const isTypeSelector = metadata.name === 'type';
  const hideLabel = metadata.name === 'type' && path.includes('.operation.type');
  const label = metadata.label ?? metadata.name;
  const fieldIcon = metadata.icon && isValidEditorIcon(metadata.icon) ? metadata.icon as EditorIconName : undefined;
  const options = (metadata.enumOptions ?? metadata.enumValues?.map(label => ({ value: label, label })) ?? [])
    .map(option => ({
      ...option,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {option.icon && isValidEditorIcon(option.icon) && (
            <EditorIcon name={option.icon as EditorIconName} size={14} style={{ color: '#ccc' }} />
          )}
          <span>{option.label ?? option.value}</span>
        </span>
      ),
    }));

  if (isCompact) {
    return (
      <div style={{
        marginBottom: EDITOR_SPACING.fieldGap,
        display: 'flex',
        alignItems: 'center',
        gap: EDITOR_SPACING.sm,
      }}>
        {metadata.iconOnly && fieldIcon ? (
          <Tooltip title={label}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <EditorIcon name={fieldIcon} style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />
            </span>
          </Tooltip>
        ) : (
          <Space size={4} style={{ minWidth: 60, flexShrink: 0 }}>
            {fieldIcon && <EditorIcon name={fieldIcon} style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />}
            <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
              {metadata.condensedLabel || label}
            </Text>
          </Space>
        )}
        <Select
          value={currentValue}
          onChange={(val) => {
            onChange(val);
            onCommit?.(val);
          }}
          style={{ flex: 1 }}
          size="small"
          disabled={disabled}
          options={options}
          optionLabelProp="label"
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: isTypeSelector ? EDITOR_SPACING.sm : EDITOR_SPACING.sectionGap }}>
      {!hideLabel && (
        <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd, display: 'block', marginBottom: EDITOR_SPACING.xs }}>
          {label}
        </Text>
      )}
      <Select
        value={currentValue}
        onChange={(val) => {
          onChange(val);
          onCommit?.(val);
        }}
        style={{ width: '100%' }}
        size="small"
        disabled={disabled}
        options={options}
        optionLabelProp="label"
      />
    </div>
  );
}
