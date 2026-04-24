/**
 * Vector3 Input Component
 * Editable 3D vector input with individual X/Y/Z fields
 */

import React from 'react';
import { InputNumber, Space } from 'antd';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector3InputProps {
  label?: string;
  value: Vector3;
  onChange: (value: Vector3) => void;
  step?: number;
  precision?: number;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Vector3Input({
  label,
  value,
  onChange,
  step = 0.1,
  precision = 2,
  disabled = false,
  onFocus,
  onBlur,
}: Vector3InputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      {label && (
        <div style={{ color: '#ccc', fontSize: '12px', marginBottom: '4px' }}>
          {label}
        </div>
      )}
      <Space>
        <InputNumber
          addonBefore="X"
          value={value.x}
          onChange={(v) => onChange({ ...value, x: v ?? 0 })}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          step={step}
          precision={precision}
          disabled={disabled}
          style={{ width: '110px' }}
          size="small"
        />
        <InputNumber
          addonBefore="Y"
          value={value.y}
          onChange={(v) => onChange({ ...value, y: v ?? 0 })}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          step={step}
          precision={precision}
          disabled={disabled}
          style={{ width: '110px' }}
          size="small"
        />
        <InputNumber
          addonBefore="Z"
          value={value.z}
          onChange={(v) => onChange({ ...value, z: v ?? 0 })}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          step={step}
          precision={precision}
          disabled={disabled}
          style={{ width: '110px' }}
          size="small"
        />
      </Space>
    </div>
  );
}
