import React from 'react';
import { Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;

interface InspectorComponentSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function InspectorComponentSection({
  title,
  description,
  action,
  children,
}: InspectorComponentSectionProps) {
  return (
    <section
      style={{
        color: EDITOR_COLORS.textSecondary,
        borderRadius: 0,
        padding: `${EDITOR_SPACING.md}px`,
        borderBottom: `1px solid ${EDITOR_COLORS.divider}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: EDITOR_SPACING.sm,
          width: '100%',
          marginBottom: children ? EDITOR_SPACING.sm : 0,
        }}
      >
        <Text style={{ color: EDITOR_COLORS.textPrimary, fontWeight: EDITOR_TYPOGRAPHY.fontWeightBold }}>
          {title}
        </Text>
        {description && (
          <Tooltip title={description} placement="top">
            <InfoCircleOutlined style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }} />
          </Tooltip>
        )}
        {action ? <div style={{ marginLeft: 'auto' }}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
