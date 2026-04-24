/**
 * Vector3 Field Renderer
 * Renders three number inputs for X, Y, Z components
 * Supports compact mode with inline XYZ for dense UI layouts
 */

import React, { useEffect, useRef } from 'react';
import { InputNumber, Typography, Space } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { EDITOR_SPACING, EDITOR_TYPOGRAPHY, EDITOR_COLORS, EDITOR_HEIGHTS } from '../styles/tokens';
import { EditorIcon, isValidEditorIcon, EditorIconName } from '../styles/EditorIcon';
import { FieldRow } from '../components/FieldRow';

const { Text } = Typography;

function normalizeVector3(meta: any, input: any) {
  const defaultValue = meta?.defaultValue || { x: 0, y: 0, z: 0 };

  if (Array.isArray(input)) {
    return {
      x: input[0] ?? defaultValue.x ?? 0,
      y: input[1] ?? defaultValue.y ?? 0,
      z: input[2] ?? defaultValue.z ?? 0,
    };
  }

  if (input && typeof input === 'object') {
    return {
      x: input.x ?? defaultValue.x ?? 0,
      y: input.y ?? defaultValue.y ?? 0,
      z: input.z ?? defaultValue.z ?? 0,
    };
  }

  return {
    x: defaultValue.x ?? 0,
    y: defaultValue.y ?? 0,
    z: defaultValue.z ?? 0,
  };
}

export function Vector3Field({ metadata, value, onChange, onCommit, disabled }: FieldRendererProps) {
  const currentValue = normalizeVector3(metadata, value);
  const lastCommittedRef = useRef(currentValue);
  const isEditingRef = useRef(false);
  const dirtyRef = useRef(false);

  const isCompact = metadata.displayMode === 'compact' || metadata.displayMode === 'inline';
  // Type-safe icon name validation
  const iconName = metadata.icon && isValidEditorIcon(metadata.icon) ? metadata.icon as EditorIconName : undefined;
  const label = metadata.label || metadata.name;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const updateComponent = (component: 'x' | 'y' | 'z', val: number | null, commit = false) => {
    const nextValue = {
      ...currentValue,
      [component]: val ?? 0
    };
    if (!commit) {
      isEditingRef.current = true;
    }
    dirtyRef.current = dirtyRef.current || nextValue[component] !== lastCommittedRef.current[component];
    onChange(nextValue);
    if (commit && dirtyRef.current && onCommit) {
      onCommit(nextValue);
      lastCommittedRef.current = nextValue;
      dirtyRef.current = false;
      isEditingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isEditingRef.current) {
      lastCommittedRef.current = currentValue;
      dirtyRef.current = false;
    }
  }, [currentValue]);

  const inputProps = {
    size: 'small' as const,
    step: metadata.step ?? 0.1,
    disabled,
    style: { flex: 1, minWidth: 50 },
    onFocus: () => {
      isEditingRef.current = true;
      dirtyRef.current = false;
      lastCommittedRef.current = currentValue;
    },
    onKeyDown: handleKeyDown,
  };

  // Compact mode: render each axis as its own compact field sharing the row evenly
  if (isCompact) {
    const axisMeta = (axis: 'x' | 'y' | 'z') => ({
      ...metadata,
      type: 'number' as const,
      // Keep context in the tooltip while showing concise inline XYZ labels
      label: `${label} ${axis.toUpperCase()}`,
      condensedLabel: axis.toUpperCase(),
      name: `${metadata.name}.${axis}`,
      compactRow: undefined,
      displayMode: 'compact' as const,
      icon: undefined,
      iconOnly: false,
    });

    const axisFields = (
      [
        { key: 'x' as const, value: currentValue.x },
        { key: 'y' as const, value: currentValue.y },
        { key: 'z' as const, value: currentValue.z },
      ]
    ).map(({ key, value }) => ({
      name: key,
      metadata: axisMeta(key),
      value,
    }));

    const handleAxisChange = (axis: 'x' | 'y' | 'z', val: any, commit = false) => updateComponent(axis, val, commit);

    return (
      <FieldRow
        fields={axisFields}
        onChange={(fieldName, val) => handleAxisChange(fieldName as 'x' | 'y' | 'z', val)}
        onCommit={(fieldName, val) => handleAxisChange(fieldName as 'x' | 'y' | 'z', val, true)}
      />
    );
  }

  // Normal mode: label above with three columns
  return (
    <div style={{ marginBottom: EDITOR_SPACING.sectionGap }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.xs, marginBottom: EDITOR_SPACING.xs }}>
        {iconName && <EditorIcon name={iconName} style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />}
        <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd, display: 'block' }}>
          {label}
        </Text>
      </div>
      <Space direction="horizontal" size="small" style={{ width: '100%' }}>
        <div style={{ flex: 1 }}>
          <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeXs }}>X</Text>
          <InputNumber
            {...inputProps}
            value={currentValue.x}
            onChange={(val) => updateComponent('x', val)}
            onBlur={(e) => updateComponent('x', Number((e.target as HTMLInputElement).value), true)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeXs }}>Y</Text>
          <InputNumber
            {...inputProps}
            value={currentValue.y}
            onChange={(val) => updateComponent('y', val)}
            onBlur={(e) => updateComponent('y', Number((e.target as HTMLInputElement).value), true)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeXs }}>Z</Text>
          <InputNumber
            {...inputProps}
            value={currentValue.z}
            onChange={(val) => updateComponent('z', val)}
            onBlur={(e) => updateComponent('z', Number((e.target as HTMLInputElement).value), true)}
            style={{ width: '100%' }}
          />
        </div>
      </Space>
    </div>
  );
}
