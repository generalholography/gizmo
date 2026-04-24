/**
 * ComponentHeader
 * Consistent header for component sections with title and right-justified actions.
 */

import React from 'react';
import { Typography, Button, Tooltip, Space, Dropdown } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { EditorIcon, EditorIconName } from '../styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_HEIGHTS, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;

export interface HeaderAction {
  /** Icon to display */
  icon: EditorIconName;
  /** Tooltip text */
  tooltip: string;
  /** Click handler */
  onClick: () => void;
  /** Whether this is a destructive action */
  danger?: boolean;
  /** Whether to disable the action */
  disabled?: boolean;
}

export interface ComponentHeaderProps {
  /** Title text */
  title: string;
  /** Optional icon to show before title */
  icon?: EditorIconName;
  /** Optional description (shown as tooltip on info icon) */
  description?: string;
  /** Actions to show on the right side */
  actions?: HeaderAction[];
  /** Special "add" action (always shown rightmost with + icon) */
  onAdd?: () => void;
  /** Optional dropdown menu for add action */
  addMenuItems?: MenuProps['items'];
  /** Optional select handler for add dropdown menu */
  onAddMenuSelect?: (key: string) => void;
  /** Tooltip for add action */
  addTooltip?: string;
  /** Whether to disable add action */
  addDisabled?: boolean;
  /** Whether header is collapsible (shows expand/collapse indicator) */
  collapsible?: boolean;
  /** Whether currently expanded (only relevant if collapsible) */
  expanded?: boolean;
  /** Click handler for the header itself (for collapse toggling) */
  onClick?: () => void;
}

/**
 * ComponentHeader renders a clean header with title and right-justified actions.
 * The add action (if provided) is always rendered as the rightmost button.
 */
export function ComponentHeader({
  title,
  icon: _icon,
  description,
  actions = [],
  onAdd,
  addMenuItems,
  onAddMenuSelect,
  addTooltip = 'Add',
  addDisabled = false,
  collapsible = false,
  expanded = true,
  onClick,
}: ComponentHeaderProps) {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: EDITOR_SPACING.sm,
    padding: `${EDITOR_SPACING.md}px 0 ${EDITOR_SPACING.sm}px`,
    minHeight: EDITOR_HEIGHTS.header,
    cursor: onClick ? 'pointer' : 'default',
  };

  const titleStyle: React.CSSProperties = {
    color: EDITOR_COLORS.textPrimary,
    fontSize: EDITOR_TYPOGRAPHY.fontSizeLg,
    fontWeight: EDITOR_TYPOGRAPHY.fontWeightBold,
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: `0 ${EDITOR_SPACING.xs}px`,
    height: EDITOR_HEIGHTS.iconButton,
    minWidth: EDITOR_HEIGHTS.iconButton,
  };

  return (
    <div style={headerStyle} onClick={onClick}>
      {/* Left side: expand/collapse indicator, icon, title, info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm, flex: 1 }}>
        {collapsible && (
          <EditorIcon 
            name={expanded ? 'collapse' : 'expand'} 
            style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}
          />
        )}
        <Text style={titleStyle}>{title}</Text>
        {description && (
          <Tooltip title={description} placement="top">
            <InfoCircleOutlined style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }} />
          </Tooltip>
        )}
      </div>

      {/* Right side: actions, then add button */}
      <Space size={2} style={{ flexShrink: 0 }}>
        {actions.map((action, index) => (
          <Tooltip key={index} title={action.tooltip}>
            <Button
              type="text"
              size="small"
              icon={<EditorIcon name={action.icon} style={{ fontSize: EDITOR_TYPOGRAPHY.fontSizeLg }} />}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              danger={action.danger}
              disabled={action.disabled}
              style={actionButtonStyle}
            />
          </Tooltip>
        ))}
        {onAdd && !addMenuItems && (
          <Tooltip title={addTooltip}>
            <Button
              type="text"
              size="small"
              icon={<EditorIcon name="add" style={{ fontSize: EDITOR_TYPOGRAPHY.fontSizeLg }} />}
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              disabled={addDisabled}
              style={actionButtonStyle}
            />
          </Tooltip>
        )}
        {addMenuItems && (
          <Dropdown
            menu={{
              items: addMenuItems,
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                onAddMenuSelect?.(String(key));
              },
            }}
            trigger={['click']}
            disabled={addDisabled}
          >
            <span>
              <Tooltip title={addTooltip}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditorIcon name="add" style={{ fontSize: EDITOR_TYPOGRAPHY.fontSizeLg }} />}
                  disabled={addDisabled}
                  style={actionButtonStyle}
                />
              </Tooltip>
            </span>
          </Dropdown>
        )}
      </Space>
    </div>
  );
}
