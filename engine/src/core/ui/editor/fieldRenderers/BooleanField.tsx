/**
 * Boolean Field Renderer
 * Renders a checkbox for boolean values
 */

import React from 'react';
import { Checkbox } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EDITOR_SPACING } from '../styles/tokens';

export function BooleanField({ metadata, value, onChange, onCommit, disabled }: FieldRendererProps) {
  const currentValue = value ?? metadata.defaultValue ?? false;
  const label = metadata.label || metadata.name;

  return (
    <div style={{ marginBottom: EDITOR_SPACING.sm }}>
      <Checkbox
        checked={currentValue}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ color: '#ccc' }}
        onBlur={() => onCommit?.(currentValue)}
      >
        {label}
      </Checkbox>
    </div>
  );
}
