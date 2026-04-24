/**
 * ToolButton Component
 * Reusable split-button component for tool selection with dropdown menu
 * Shows the currently selected tool's icon with dropdown to switch between tools
 */

import React, { useMemo } from 'react';
import { Dropdown, Button, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { EditorIcon, EditorIconName } from '../styles/EditorIcon';
import { EDITOR_COLORS } from '../styles/tokens';

export interface ToolOption<T extends string> {
  /** Unique tool identifier */
  tool: T;
  /** Icon name to display */
  icon: EditorIconName;
  /** Display label */
  label: string;
  /** Optional description shown in menu */
  description?: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
}

export interface ToolButtonProps<T extends string> {
  /** Available tool options */
  options: ToolOption<T>[];
  /** Currently selected tool */
  selectedTool: T | null;
  /** Called when a tool is selected */
  onSelect: (tool: T) => void;
  /** Whether this tool group is currently active */
  isActive?: boolean;
  /** Tooltip text (uses selected tool label if not provided) */
  tooltip?: string;
  /** Size of the button */
  size?: 'small' | 'middle' | 'large';
  /** Whether to show the dropdown arrow */
  showDropdownArrow?: boolean;
}

/**
 * ToolButton - A split button for selecting tools from a group
 * Shows the selected tool's icon, with dropdown to switch between options
 */
export function ToolButton<T extends string>({
  options,
  selectedTool,
  onSelect,
  isActive = false,
  tooltip,
  size = 'middle',
  showDropdownArrow = true,
}: ToolButtonProps<T>) {
  // Find the currently selected option, default to first
  const selectedOption = useMemo(() => {
    return options.find(o => o.tool === selectedTool) || options[0];
  }, [options, selectedTool]);

  // Build dropdown menu items
  const menuItems: MenuProps['items'] = useMemo(() => {
    return options.map(option => ({
      key: option.tool,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <EditorIcon name={option.icon} size={16} />
          <span>{option.label}</span>
          {option.shortcut && (
            <span style={{ marginLeft: 'auto', color: EDITOR_COLORS.textMuted, fontSize: 11 }}>
              ({option.shortcut})
            </span>
          )}
        </div>
      ),
    }));
  }, [options]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    onSelect(key as T);
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const tooltipText = tooltip || `${selectedOption?.label || 'Tool'} - Click to select, dropdown for more options`;

  // If only one option, render as simple button
  if (options.length === 1) {
    return (
      <Tooltip title={tooltipText}>
        <Button
          size={size}
          icon={<EditorIcon name={selectedOption?.icon || 'tool'} size={18} />}
          onClick={() => onSelect(options[0].tool)}
          type={isActive ? 'primary' : 'default'}
          style={buttonStyle}
        />
      </Tooltip>
    );
  }

  // Multiple options - render as dropdown button
  return (
    <Dropdown.Button
      size={size}
      menu={{ items: menuItems, onClick: handleMenuClick, selectedKeys: selectedTool ? [selectedTool] : [] }}
      onClick={() => {
        // On main button click, select this tool (or toggle if already active)
        if (selectedOption) {
          onSelect(selectedOption.tool);
        }
      }}
      icon={showDropdownArrow ? <EditorIcon name="collapse" size={12} /> : undefined}
      type={isActive ? 'primary' : 'default'}
      buttonsRender={([leftButton, rightButton]) => [
        <Tooltip title={tooltipText} key="left">
          {React.cloneElement(leftButton as React.ReactElement, {
            icon: <EditorIcon name={selectedOption?.icon || 'tool'} size={18} />,
            style: buttonStyle,
          })}
        </Tooltip>,
        showDropdownArrow ? rightButton : null,
      ].filter(Boolean)}
    />
  );
}
