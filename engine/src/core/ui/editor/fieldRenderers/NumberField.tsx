/**
 * Number Field Renderer
 * Renders a numeric input with optional min/max/step constraints
 * Supports compact mode for dense UI layouts
 */

import React, { useEffect, useRef } from 'react';
import { InputNumber, Tooltip, Typography, Space } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EDITOR_SPACING, EDITOR_TYPOGRAPHY, EDITOR_COLORS, EDITOR_HEIGHTS } from '../styles/tokens';
import { EditorIcon, isValidEditorIcon, EditorIconName } from '../styles/EditorIcon';

const { Text } = Typography;

export function NumberField({ metadata, value, onChange, onCommit, disabled }: FieldRendererProps) {
  const currentValue = value ?? metadata.defaultValue ?? 0;
  const lastCommittedRef = useRef(currentValue);
  const isEditingRef = useRef(false);
  const dirtyRef = useRef(false);
  const inputRef = useRef<any>(null);

  const isCompact = metadata.displayMode === 'compact' || metadata.displayMode === 'inline';
  // Type-safe icon name validation
  const iconName = metadata.icon && isValidEditorIcon(metadata.icon) ? metadata.icon as EditorIconName : undefined;
  const commitValue = (next: number | null) => {
    if (!onCommit) return;

    const normalized = next ?? metadata.defaultValue ?? 0;
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

  const label = metadata.label || metadata.name;

  // Compact mode: reduced spacing and inline layout
  if (isCompact) {
    return (
      <div style={{ 
        marginBottom: EDITOR_SPACING.fieldGap,
        display: 'flex',
        alignItems: 'center',
        gap: EDITOR_SPACING.sm,
        minHeight: EDITOR_HEIGHTS.rowStandard,
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
        <InputNumber
          ref={inputRef}
          value={currentValue}
          onChange={(val) => {
            const normalized = val ?? metadata.defaultValue ?? 0;
            if (normalized !== lastCommittedRef.current) {
              dirtyRef.current = true;
              onChange(normalized);
            }
          }}
          min={metadata.min}
          max={metadata.max}
          step={metadata.step ?? 1}
          style={{ flex: 1, minWidth: 60 }}
          size="small"
          disabled={disabled}
          onFocus={() => {
            isEditingRef.current = true;
            dirtyRef.current = false;
            lastCommittedRef.current = currentValue;
            inputRef.current?.focus?.({ cursor: 'all' });
          }}
          onBlur={(e) => commitValue(Number((e.target as HTMLInputElement).value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    );
  }

  // Normal mode: standard layout with label above
  return (
    <div style={{ marginBottom: EDITOR_SPACING.sectionGap }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.xs, marginBottom: EDITOR_SPACING.xs }}>
        {iconName && <EditorIcon name={iconName} style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />}
        <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd, display: 'block' }}>
          {label}
        </Text>
      </div>
      <InputNumber
        ref={inputRef}
        value={currentValue}
        onChange={(val) => {
          const normalized = val ?? metadata.defaultValue ?? 0;
          if (normalized !== lastCommittedRef.current) {
            dirtyRef.current = true;
            onChange(normalized);
          }
        }}
        min={metadata.min}
        max={metadata.max}
        step={metadata.step ?? 1}
        style={{ width: '100%' }}
        size="small"
        disabled={disabled}
        onFocus={() => {
          isEditingRef.current = true;
          dirtyRef.current = false;
          lastCommittedRef.current = currentValue;
          inputRef.current?.focus?.({ cursor: 'all' });
        }}
        onBlur={(e) => commitValue(Number((e.target as HTMLInputElement).value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
