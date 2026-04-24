import React from 'react';
import { Button, Typography } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;

interface PaneTitleProps {
  title: string;
  onMetadataClick?: () => void;
  metadataAriaLabel?: string;
  size?: 'lg' | 'md';
  rightSlot?: React.ReactNode;
}

export function PaneTitle({
  title,
  onMetadataClick,
  metadataAriaLabel = 'Metadata options',
  size = 'lg',
  rightSlot,
}: PaneTitleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm, flex: 1, minWidth: 0 }}>
      <Text
        style={{
          color: EDITOR_COLORS.textPrimary,
          fontSize: size === 'lg' ? EDITOR_TYPOGRAPHY.fontSizeXl : EDITOR_TYPOGRAPHY.fontSizeLg,
          fontWeight: EDITOR_TYPOGRAPHY.fontWeightBold,
          marginBottom: 0,
          maxWidth: '100%',
        }}
        ellipsis={{ tooltip: title }}
      >
        {title}
      </Text>
      {onMetadataClick && (
        <Button
          type="text"
          size="small"
          icon={<EllipsisOutlined />}
          aria-label={metadataAriaLabel}
          onClick={(event) => {
            event.stopPropagation();
            onMetadataClick();
          }}
        />
      )}
      {rightSlot}
    </div>
  );
}
