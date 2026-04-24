/**
 * CondensedModule
 * A condensed component view with summary display and optional popout for detailed editing
 * Follows Figma-like patterns for space-efficient UI
 */

import React, { useState } from 'react';
import { Typography, Modal, Card } from 'antd';
import { ComponentHeader, HeaderAction } from './ComponentHeader';
import type { EditorIconName } from '../styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_RADIUS, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;

export interface CondensedModuleProps {
  /** Title for the module */
  title: string;
  /** Optional icon */
  icon?: EditorIconName;
  /** Optional description for tooltip */
  description?: string;
  /** Summary text/node shown in condensed view */
  summary?: React.ReactNode;
  /** Children rendered in expanded/popout view */
  children: React.ReactNode;
  /** Actions for the header (excluding add) */
  actions?: HeaderAction[];
  /** Add action handler */
  onAdd?: () => void;
  /** Tooltip for add action */
  addTooltip?: string;
  /** Whether to show expanded inline instead of popout */
  expandInline?: boolean;
  /** Default expanded state (for inline mode) */
  defaultExpanded?: boolean;
  /** Popout modal width */
  popoutWidth?: number | string;
  /** Help text shown below summary */
  helpText?: string;
}

/**
 * CondensedModule provides a compact summary view with expand/popout capability.
 * In inline mode, it expands within the same panel.
 * In popout mode (default), it opens a modal for detailed editing.
 */
export function CondensedModule({
  title,
  icon,
  description,
  summary,
  children,
  actions = [],
  onAdd,
  addTooltip,
  expandInline = false,
  defaultExpanded = false,
  popoutWidth = 600,
  helpText,
}: CondensedModuleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [popoutOpen, setPopoutOpen] = useState(false);

  const containerStyle: React.CSSProperties = {
    background: EDITOR_COLORS.headerBg,
    borderRadius: EDITOR_RADIUS.md,
    padding: `${EDITOR_SPACING.sm}px ${EDITOR_SPACING.md}px`,
    marginBottom: EDITOR_SPACING.sm,
    border: `1px solid ${EDITOR_COLORS.border}`,
  };

  const summaryStyle: React.CSSProperties = {
    color: EDITOR_COLORS.textSecondary,
    fontSize: EDITOR_TYPOGRAPHY.fontSizeMd,
    marginBottom: expanded && expandInline ? EDITOR_SPACING.md : 0,
  };

  const helpTextStyle: React.CSSProperties = {
    color: EDITOR_COLORS.textMuted,
    fontSize: EDITOR_TYPOGRAPHY.fontSizeSm,
    marginTop: EDITOR_SPACING.xs,
  };

  // In popout mode, add an edit action that opens the modal
  const allActions: HeaderAction[] = expandInline
    ? actions
    : [
        ...actions,
        {
          icon: 'edit',
          tooltip: 'Edit in detail',
          onClick: () => setPopoutOpen(true),
        },
      ];

  const handleHeaderClick = expandInline ? () => setExpanded(!expanded) : undefined;

  return (
    <>
      <div style={containerStyle}>
        <ComponentHeader
          title={title}
          icon={icon}
          description={description}
          actions={allActions}
          onAdd={onAdd}
          addTooltip={addTooltip}
          collapsible={expandInline}
          expanded={expanded}
          onClick={handleHeaderClick}
        />
        
        {summary && (
          <div style={summaryStyle}>
            {typeof summary === 'string' ? <Text style={{ color: 'inherit' }}>{summary}</Text> : summary}
          </div>
        )}

        {helpText && <div style={helpTextStyle}>{helpText}</div>}

        {/* Inline expanded content */}
        {expandInline && expanded && (
          <div style={{ marginTop: EDITOR_SPACING.md }}>
            {children}
          </div>
        )}
      </div>

      {/* Popout modal */}
      {!expandInline && (
        <Modal
          title={title}
          open={popoutOpen}
          onCancel={() => setPopoutOpen(false)}
          footer={null}
          width={popoutWidth}
          styles={{
            content: {
              background: EDITOR_COLORS.panel,
              padding: EDITOR_SPACING.lg,
            },
            header: {
              background: EDITOR_COLORS.panel,
              borderBottom: `1px solid ${EDITOR_COLORS.border}`,
            },
            body: {
              padding: EDITOR_SPACING.lg,
              maxHeight: '70vh',
              overflowY: 'auto',
            },
          }}
          destroyOnClose
        >
          {children}
        </Modal>
      )}
    </>
  );
}
