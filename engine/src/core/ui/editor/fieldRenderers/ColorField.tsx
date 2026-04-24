/**
 * Color Field Renderer
 * Renders a color input with preview swatch and color picker overlay
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ColorPicker, Input, Tooltip, Typography } from 'antd';
import type { Color } from 'antd/es/color-picker';
import type { InputRef } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';

export interface ColorFieldProps extends FieldRendererProps {
  /** Compact mode omits labels for use inside FieldRow */
  mode?: 'standard' | 'compact';
  /** Custom width for inline layouts */
  inputWidth?: number | string;
}

const FALLBACK_COLOR = '#ffffff';

const toHexString = (value: any): string => {
  if (typeof value === 'number') {
    return `#${value.toString(16).padStart(6, '0')}`;
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return FALLBACK_COLOR;
};

export function ColorField({
  metadata,
  value,
  onChange,
  onCommit,
  disabled,
  mode = 'standard',
  inputWidth = '100%',
}: ColorFieldProps) {
  const defaultColor = useMemo(() => toHexString(metadata.defaultValue), [metadata.defaultValue]);
  const currentValue = toHexString(value ?? defaultColor);

  const [pickerOpen, setPickerOpen] = useState(false);
  const lastCommittedRef = useRef(currentValue);
  const dirtyRef = useRef(false);
  const isEditingRef = useRef(false);
  const inputRef = useRef<InputRef>(null);

  const label = metadata.label || metadata.name;

  const commitValue = (next: string) => {
    if (!onCommit) return;

    const normalized = toHexString(next || defaultColor);
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

  const handleChange = (next: string) => {
    const normalized = toHexString(next || defaultColor);
    dirtyRef.current = normalized !== lastCommittedRef.current;
    onChange(normalized);
  };

  const renderInput = (addonBefore?: React.ReactNode) => (
    <Input
      ref={inputRef}
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      size="small"
      disabled={disabled}
      style={{ width: inputWidth }}
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

  const renderPreview = () => (
    <ColorPicker
      value={currentValue}
      onChange={(_: Color, hex) => handleChange(hex)}
      open={pickerOpen}
      onOpenChange={(open) => {
        setPickerOpen(open);
        isEditingRef.current = open;
        if (!open) {
          commitValue(currentValue);
        }
      }}
      disabled={disabled}
      trigger="click"
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `1px solid ${EDITOR_COLORS.border}`,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
          background: currentValue,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
    </ColorPicker>
  );

  if (mode === 'compact') {
    return renderInput(
      <div style={{
        display: 'flex',
        alignItems: 'center',
        paddingInline: EDITOR_SPACING.xs,
        background: EDITOR_COLORS.headerBg,
        borderRight: `1px solid ${EDITOR_COLORS.border}`,
        borderRadius: '4px 0 0 4px',
        height: 24,
        boxSizing: 'border-box',
      }}>
        {renderPreview()}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: EDITOR_SPACING.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.xs, marginBottom: 4 }}>
        <Typography.Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
          {label}
        </Typography.Text>
      </div>
      {renderInput(
        <div style={{
          display: 'flex',
          alignItems: 'center',
          paddingInline: EDITOR_SPACING.xs,
          background: EDITOR_COLORS.headerBg,
          borderRight: `1px solid ${EDITOR_COLORS.border}`,
          borderRadius: '4px 0 0 4px',
          height: 24,
          boxSizing: 'border-box',
        }}>
          {renderPreview()}
        </div>
      )}
    </div>
  );
}
