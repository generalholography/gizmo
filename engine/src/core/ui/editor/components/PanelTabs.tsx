import React, { useMemo } from 'react';
import { Segmented } from 'antd';
import type { SegmentedProps } from 'antd';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';

type PanelTabItem = {
  key: string;
  label: React.ReactNode;
  children: React.ReactNode;
};

export interface PanelTabsProps {
  items?: PanelTabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  style?: React.CSSProperties;
  className?: string;
  inset?: number;
}

const panelTabsStyle = `
  .panel-tabs {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }

  .panel-tabs__control {
    display: flex;
    align-items: center;
    min-height: 32px;
    padding-bottom: 12px;
    border-bottom: 1px solid ${EDITOR_COLORS.divider};
    margin-bottom: 12px;
  }

  .panel-tabs__segmented.ant-segmented {
    background: transparent;
    padding: 0;
    gap: 4px;
    font-size: ${EDITOR_TYPOGRAPHY.fontSizeMd}px;
  }

  .panel-tabs__segmented.ant-segmented .ant-segmented-group {
    gap: 4px;
  }

  .panel-tabs__segmented.ant-segmented .ant-segmented-item {
    color: ${EDITOR_COLORS.textSecondary};
    border-radius: 6px;
    transition: none;
  }

  .panel-tabs__segmented.ant-segmented .ant-segmented-item-selected {
    color: ${EDITOR_COLORS.textPrimary};
    background: ${EDITOR_COLORS.field};
  }

  .panel-tabs__segmented.ant-segmented .ant-segmented-thumb {
    background: ${EDITOR_COLORS.field};
    border-radius: 6px;
    box-shadow: none;
  }

  .panel-tabs__content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .panel-tabs__pane {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
`;

export function PanelTabs({
  items = [],
  activeKey,
  defaultActiveKey,
  onChange,
  style,
  className,
  inset = EDITOR_SPACING.lg,
}: PanelTabsProps) {
  const selectedKey = activeKey ?? defaultActiveKey ?? items[0]?.key;

  const options = useMemo<SegmentedProps['options']>(
    () => items.map((item) => ({ label: item.label, value: item.key })),
    [items],
  );

  const selectedItem = items.find((item) => item.key === selectedKey) ?? items[0];

  return (
    <>
      <style>{panelTabsStyle}</style>
      <div className={className ? `panel-tabs ${className}` : 'panel-tabs'} style={style}>
        <div className="panel-tabs__control" style={{ paddingLeft: inset, paddingRight: inset }}>
          <Segmented
            className="panel-tabs__segmented"
            options={options}
            value={selectedItem?.key}
            onChange={(value) => onChange?.(String(value))}
            style={{ background: 'transparent' }}
          />
        </div>
        <div className="panel-tabs__content">
          {selectedItem ? (
            <div className="panel-tabs__pane">{selectedItem.children}</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
