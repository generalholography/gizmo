/**
 * Reusable Search Input Component
 * Consistent search bar styling used across hierarchy, archetype browser, and other panels
 */

import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

// Theme constants for search input styling
const SEARCH_ICON_COLOR = '#666';
const SEARCH_BG_COLOR = 'rgba(255, 255, 255, 0.05)';
const SEARCH_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';

export interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Called when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the clear button */
  allowClear?: boolean;
  /** Input size */
  size?: 'small' | 'middle' | 'large';
  /** Additional styles */
  style?: React.CSSProperties;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  allowClear = true,
  size = 'small',
  style,
}: SearchInputProps) {
  return (
    <Input
      placeholder={placeholder}
      prefix={<SearchOutlined style={{ color: SEARCH_ICON_COLOR }} />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      allowClear={allowClear}
      size={size}
      style={{
        background: SEARCH_BG_COLOR,
        borderColor: SEARCH_BORDER_COLOR,
        ...style,
      }}
    />
  );
}
