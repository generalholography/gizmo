/**
 * Compact Field Renderer
 * Ultra-compact field with icon-only label for Figma-like dense UI
 * Uses ant-d Space.Compact with addonBefore for icons
 * Supports number, string, and enum/select types
 */

import React, { useRef, useEffect } from 'react';
import { InputNumber, Input, Select, Tooltip, Space } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EDITOR_COLORS, EDITOR_HEIGHTS, EDITOR_TYPOGRAPHY } from '../styles/tokens';
import { EditorIcon, isValidEditorIcon, EditorIconName } from '../styles/EditorIcon';

export interface CompactFieldProps extends FieldRendererProps {
  /** Whether to show only the icon (no label at all) - default true for compact */
  iconOnly?: boolean;
  /** Custom width for the input */
  inputWidth?: number | string;
}

/**
 * CompactField renders an ultra-compact field using Space.Compact with addonBefore for icons.
 * Designed for row layouts where multiple fields share space.
 */
export function CompactField({ 
  metadata, 
  value, 
  onChange, 
  onCommit, 
  disabled,
  iconOnly = true,
  inputWidth = 60,
}: CompactFieldProps) {
  // Type-specific default value handling
  const getDefaultValue = () => {
    if (metadata.defaultValue !== undefined) return metadata.defaultValue;
    switch (metadata.type) {
      case 'string': return '';
      case 'number': return 0;
      case 'enum': return metadata.enumOptions?.[0]?.value ?? metadata.enumValues?.[0] ?? '';
      default: return '';
    }
  };
  
  const currentValue = value ?? getDefaultValue();
  const lastCommittedRef = useRef(currentValue);
  const dirtyRef = useRef(false);
  const isEditingRef = useRef(false);
  const inputRef = useRef<any>(null);
  const latestValueRef = useRef(currentValue);
  
  const iconName = metadata.icon && isValidEditorIcon(metadata.icon) ? metadata.icon as EditorIconName : undefined;
  const label = metadata.label || metadata.name;
  const singleLetterLabel = metadata.condensedLabel || label.charAt(0).toUpperCase();
  const compactLabelMode = metadata.compactLabelMode ?? 'addon';

  // Commit logic
  const commitValue = (next: any) => {
    if (!onCommit) return;
    if (dirtyRef.current && next !== lastCommittedRef.current) {
      onCommit(next);
      lastCommittedRef.current = next;
    }
    dirtyRef.current = false;
    isEditingRef.current = false;
  };

  useEffect(() => {
    if (!isEditingRef.current) {
      lastCommittedRef.current = currentValue;
      dirtyRef.current = false;
    }
    latestValueRef.current = currentValue;
  }, [currentValue]);

  // Render addon label (icon or single letter) for use with addonBefore
  const renderAddonLabel = () => {
    const content = iconName ? (
      <EditorIcon name={iconName} size={12} style={{ color: EDITOR_COLORS.textTertiary }} />
    ) : (
      <span style={{ 
        color: EDITOR_COLORS.textTertiary, 
        fontSize: EDITOR_TYPOGRAPHY.fontSizeXs,
        fontWeight: EDITOR_TYPOGRAPHY.fontWeightMedium,
      }}>
        {singleLetterLabel}
      </span>
    );

    return (
      <Tooltip title={label}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {content}
        </span>
      </Tooltip>
    );
  };

  // Render input based on type
  const renderInput = () => {
    const addonBefore = renderAddonLabel();
    
    switch (metadata.type) {
      case 'number':
        return (
          <InputNumber
            ref={inputRef}
            value={currentValue}
            onChange={(val) => {
              const normalized = val ?? metadata.defaultValue ?? 0;
              latestValueRef.current = normalized;
              dirtyRef.current = normalized !== lastCommittedRef.current;
              onChange(normalized);
            }}
            min={metadata.min}
            max={metadata.max}
            step={metadata.step ?? 1}
            style={{ width: inputWidth }}
            size="small"
            disabled={disabled}
            addonBefore={addonBefore}
            onFocus={() => {
              isEditingRef.current = true;
              dirtyRef.current = false;
              lastCommittedRef.current = currentValue;
              inputRef.current?.focus?.({ cursor: 'all' });
            }}
            onBlur={() => {
              // Use the most recent edited value rather than the render snapshot
              commitValue(latestValueRef.current);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
          />
        );

      case 'string':
        return (
          <Input
            ref={inputRef}
            value={currentValue}
            onChange={(e) => {
              const next = e.target.value;
              latestValueRef.current = next;
              dirtyRef.current = next !== lastCommittedRef.current;
              onChange(next);
            }}
            style={{ width: inputWidth }}
            size="small"
            disabled={disabled}
            addonBefore={addonBefore}
            onFocus={() => {
              isEditingRef.current = true;
              dirtyRef.current = false;
              lastCommittedRef.current = currentValue;
              inputRef.current?.select?.();
            }}
            onBlur={(e) => commitValue(e.target.value)}
            onPressEnter={(e) => (e.currentTarget as HTMLInputElement).blur()}
          />
        );

      case 'enum':
        const enumOptions = metadata.enumOptions ?? metadata.enumValues?.map(value => ({ value, label: value }));
        if (compactLabelMode === 'none') {
          return (
            <Select
              value={currentValue}
              onChange={(val) => {
                latestValueRef.current = val;
                onChange(val);
                onCommit?.(val);
              }}
              style={{ width: inputWidth }}
              size="small"
              disabled={disabled}
              options={(enumOptions || []).map(option => ({
                ...option,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {option.icon && isValidEditorIcon(option.icon) && (
                      <EditorIcon name={option.icon as EditorIconName} size={12} style={{ color: EDITOR_COLORS.textTertiary }} />
                    )}
                    <span>{option.label ?? option.value}</span>
                  </span>
                ),
              }))}
              optionLabelProp="label"
            />
          );
        }
        return (
          <Space.Compact size="small" style={{ width: inputWidth }}>
            <Tooltip title={label}>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '0 8px',
                height: 24,
                background: EDITOR_COLORS.headerBg,
                border: `1px solid ${EDITOR_COLORS.border}`,
                borderRight: 'none',
                borderRadius: '4px 0 0 4px',
              }}>
                {iconName ? (
                  <EditorIcon name={iconName} size={12} style={{ color: EDITOR_COLORS.textTertiary }} />
                ) : (
                  <span style={{ 
                    color: EDITOR_COLORS.textTertiary, 
                    fontSize: EDITOR_TYPOGRAPHY.fontSizeXs,
                    fontWeight: EDITOR_TYPOGRAPHY.fontWeightMedium,
                  }}>
                    {singleLetterLabel}
                  </span>
                )}
              </span>
            </Tooltip>
            <Select
              value={currentValue}
              onChange={(val) => {
                latestValueRef.current = val;
                onChange(val);
                onCommit?.(val);
              }}
              style={{ width: '100%' }}
              size="small"
              disabled={disabled}
              options={(enumOptions || []).map(option => ({
                ...option,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {option.icon && isValidEditorIcon(option.icon) && (
                      <EditorIcon name={option.icon as EditorIconName} size={12} style={{ color: EDITOR_COLORS.textTertiary }} />
                    )}
                    <span>{option.label ?? option.value}</span>
                  </span>
                ),
              }))}
              optionLabelProp="label"
            />
          </Space.Compact>
        );

      default:
        return <span style={{ color: EDITOR_COLORS.textMuted }}>?</span>;
    }
  };

  // Return the input directly without wrapping div to allow Space.Compact grouping
  return renderInput();
}
