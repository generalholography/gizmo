/**
 * String Field Renderer
 * Renders a text input for string values
 */

import React, { useEffect, useRef } from 'react';
import { Input, Space, Tooltip, Typography } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';
import { EditorIcon, isValidEditorIcon, EditorIconName } from '../styles/EditorIcon';

const { Text } = Typography;

export function StringField({ metadata, value, onChange, onCommit, disabled }: FieldRendererProps) {
  const currentValue = value ?? metadata.defaultValue ?? '';
  const lastCommittedRef = useRef(currentValue);
  const isEditingRef = useRef(false);
  const dirtyRef = useRef(false);
  const isCompact = metadata.displayMode === 'compact' || metadata.displayMode === 'inline';
  const label = metadata.label || metadata.name;
  const iconName = metadata.icon && isValidEditorIcon(metadata.icon) ? metadata.icon as EditorIconName : undefined;

  const commitValue = (next: string) => {
    if (!onCommit) return;

    const normalized = next ?? '';
    if (dirtyRef.current && normalized !== lastCommittedRef.current) {
      onCommit(normalized);
      lastCommittedRef.current = normalized;
    }
    dirtyRef.current = false;
    isEditingRef.current = false;
  };

  useEffect(() => {
    if (!isEditingRef.current) {
      lastCommittedRef.current = currentValue;
      dirtyRef.current = false;
    }
  }, [currentValue]);

  if (isCompact) {
    return (
      <div style={{
        marginBottom: EDITOR_SPACING.fieldGap,
        display: 'flex',
        alignItems: 'center',
        gap: EDITOR_SPACING.sm,
      }}>
        {metadata.iconOnly && iconName ? (
          <Tooltip title={label}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <EditorIcon name={iconName} style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />
            </span>
          </Tooltip>
        ) : (
          <Space size={4} style={{ minWidth: 60, flexShrink: 0 }}>
            {iconName && <EditorIcon name={iconName} style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />}
            <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
              {metadata.condensedLabel || label}
            </Text>
          </Space>
        )}
        <Input
          value={currentValue}
          onChange={(e) => {
            const next = e.target.value;
            dirtyRef.current = dirtyRef.current || next !== lastCommittedRef.current;
            onChange(next);
          }}
          size="small"
          disabled={disabled}
          style={{ flex: 1 }}
          onFocus={(e) => {
            isEditingRef.current = true;
            dirtyRef.current = false;
            lastCommittedRef.current = currentValue;
            e.target.select();
          }}
          onBlur={(e) => commitValue(e.target.value)}
          onPressEnter={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block' }}>
          {label}
        </Text>
      </div>
      <Input
        value={currentValue}
        onChange={(e) => {
          const next = e.target.value;
          dirtyRef.current = dirtyRef.current || next !== lastCommittedRef.current;
          onChange(next);
        }}
        size="small"
        disabled={disabled}
        onFocus={(e) => {
          isEditingRef.current = true;
          dirtyRef.current = false;
          lastCommittedRef.current = currentValue;
          e.target.select();
        }}
        onBlur={(e) => commitValue(e.target.value)}
        onPressEnter={(e) => (e.currentTarget as HTMLInputElement).blur()}
      />
    </div>
  );
}
