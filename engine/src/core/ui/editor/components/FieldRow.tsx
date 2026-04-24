/**
 * Field Row Component
 * Renders multiple compact fields in a single row for dense Figma-like layouts
 * Uses ant-d Space.Compact for tight grouping of related fields
 * Used by GenericComponentEditor when fields have matching compactRow values
 */

import React from 'react';
import { Typography, Tooltip } from 'antd';
import { CompactField } from '../fieldRenderers/CompactField';
import { EDITOR_SPACING, EDITOR_COLORS, EDITOR_HEIGHTS, EDITOR_TYPOGRAPHY } from '../styles/tokens';
import { EditorIcon, isValidEditorIcon, EditorIconName } from '../styles/EditorIcon';
import { ColorField } from '../fieldRenderers/ColorField';
import type { FieldMetadata } from '../../../editor/schema/FieldMetadata';

const { Text } = Typography;

export interface FieldRowField {
  name: string;
  metadata: FieldMetadata;
  value: any;
}

export interface FieldRowProps {
  /** Row label (optional) */
  label?: string;
  /** Row icon (optional) */
  icon?: string;
  /** Fields to render in this row */
  fields: FieldRowField[];
  /** Change handler - called with field name and new value */
  onChange: (fieldName: string, value: any) => void;
  /** Commit handler - called with field name and final value */
  onCommit: (fieldName: string, value: any) => void;
  /** Whether to disable all fields */
  disabled?: boolean;
  /** Help text shown as tooltip */
  helpText?: string;
}

/**
 * FieldRow renders a horizontal row of compact fields using Space.Compact.
 * Each field shows an icon or single letter label with its input in tight grouping.
 */
export function FieldRow({
  label,
  icon,
  fields,
  onChange,
  onCommit,
  disabled = false,
  helpText,
}: FieldRowProps) {
  const iconName = icon && isValidEditorIcon(icon) ? icon as EditorIconName : undefined;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: EDITOR_SPACING.md,
      minHeight: EDITOR_HEIGHTS.rowStandard,
      padding: `${EDITOR_SPACING.xs}px 0`,
    }}>
      {/* Row label (optional) */}
      {(label || iconName) && (
        <Tooltip title={helpText || label}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: EDITOR_SPACING.xs,
            minWidth: 30,
            flexShrink: 0,
          }}>
            {iconName && <EditorIcon name={iconName} size={14} style={{ color: EDITOR_COLORS.textSecondary }} />}
            {label && (
              <Text style={{ 
                color: EDITOR_COLORS.textSecondary, 
                fontSize: EDITOR_TYPOGRAPHY.fontSizeSm,
              }}>
                {label}
              </Text>
            )}
          </div>
        </Tooltip>
      )}

      {/* Fields share available space evenly while keeping their own borders */}
      <div style={{ display: 'flex', flex: 1, gap: EDITOR_SPACING.sm }}>
        {fields.map((field) => (
          <div key={field.name} style={{ flex: 1, minWidth: 60 }}>
            {field.metadata.type === 'color' ? (
              <ColorField
                metadata={field.metadata}
                value={field.value}
                onChange={(val) => onChange(field.name, val)}
                onCommit={(val) => onCommit(field.name, val)}
                disabled={disabled}
                inputWidth="100%"
                mode="compact"
                path={field.name}
              />
            ) : (
              <CompactField
                metadata={field.metadata}
                value={field.value}
                onChange={(val) => onChange(field.name, val)}
                onCommit={(val) => onCommit(field.name, val)}
                disabled={disabled}
                inputWidth="100%"
                path={field.name}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Group fields by their compactRow property
 * Returns an array of [rowName, fields[]] tuples
 */
export function groupFieldsByCompactRow(
  fields: Record<string, FieldMetadata>,
  values: Record<string, any>
): { row: string | null; fields: FieldRowField[] }[] {
  const rowGroups: Map<string | null, FieldRowField[]> = new Map();
  
  for (const [name, metadata] of Object.entries(fields)) {
    if (metadata.hidden) continue;
    
    const rowName = metadata.compactRow ?? null;
    if (!rowGroups.has(rowName)) {
      rowGroups.set(rowName, []);
    }
    rowGroups.get(rowName)!.push({
      name,
      metadata,
      value: values[name],
    });
  }
  
  // Convert to array, maintaining insertion order
  return Array.from(rowGroups.entries()).map(([row, fields]) => ({ row, fields }));
}
