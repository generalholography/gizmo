/**
 * ItemList Component
 * Reusable list component for displaying items like parts and tracks.
 * Provides consistent styling and behavior across the editor using design tokens.
 * 
 * Features:
 * - Left-justified icon that opens config popout widget
 * - Optional inline compact fields rendered within the list item
 * - Popout widget for detailed editing
 */

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Typography, Button, Tooltip } from 'antd';
import { MinusOutlined } from '@ant-design/icons';
import { EditorIcon, EditorIconName, isValidEditorIcon } from '../styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_HEIGHTS, EDITOR_RADIUS, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;

// List constants
const LIST_ITEM_HEIGHT = EDITOR_HEIGHTS.rowModule;
const MAX_LIST_HEIGHT = 200; // Maximum height before scrolling

// Popout positioning constants
const POPOUT_MIN_WIDTH = 250;
const POPOUT_MAX_WIDTH = 350;
const POPOUT_GAP = EDITOR_SPACING.md;
const POPOUT_VIEWPORT_MARGIN = EDITOR_SPACING.md;

interface RectLike {
  top: number;
  bottom: number;
  left: number;
  height: number;
}

interface PopoutLayout {
  top: number;
  left: number;
  maxHeight: number;
}

interface CalculatePopoutLayoutArgs {
  anchorRect: RectLike;
  paneRect: RectLike;
  popoutWidth: number;
  popoutHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export function calculatePopoutLayout({
  anchorRect,
  paneRect,
  popoutWidth,
  popoutHeight,
  viewportWidth,
  viewportHeight,
}: CalculatePopoutLayoutArgs): PopoutLayout {
  const paneTop = Math.max(paneRect.top, POPOUT_VIEWPORT_MARGIN);
  const paneBottom = Math.min(paneRect.bottom, viewportHeight - POPOUT_VIEWPORT_MARGIN);
  const availableHeight = Math.max(paneBottom - paneTop, 0);
  const effectiveHeight = availableHeight > 0 ? Math.min(popoutHeight, availableHeight) : popoutHeight;
  const preferredTop = anchorRect.top + anchorRect.height / 2 - effectiveHeight / 2;
  const maxTop = Math.max(paneTop, paneBottom - effectiveHeight);
  const top = Math.min(Math.max(preferredTop, paneTop), maxTop);
  const preferredLeft = paneRect.left - popoutWidth - POPOUT_GAP;
  const maxLeft = Math.max(POPOUT_VIEWPORT_MARGIN, viewportWidth - popoutWidth - POPOUT_VIEWPORT_MARGIN);
  const left = Math.min(Math.max(preferredLeft, POPOUT_VIEWPORT_MARGIN), maxLeft);

  return {
    top,
    left,
    maxHeight: availableHeight > 0 ? availableHeight : viewportHeight - POPOUT_VIEWPORT_MARGIN * 2,
  };
}

function getPaneViewportElement(element: HTMLElement | null): HTMLElement | null {
  return element?.closest('[data-editor-pane-scroll="true"]') as HTMLElement | null;
}

export interface ItemListItem {
  key: string;
  label: string;
  secondaryLabel?: string;
  /** Icon for the item (opens popout widget) */
  icon?: EditorIconName;
  /** Optional number of children for consumer-owned labeling */
  childCount?: number;
}

export interface ItemListProps<T extends ItemListItem> {
  /** Title displayed above the list */
  title: string;
  /** Whether to render the list heading */
  showTitle?: boolean;
  /** Items to display in the list */
  items: T[];
  /** Called when an item is clicked (for selection/navigation) */
  onItemClick: (item: T, index: number) => void;
  /** Called when the add button is clicked */
  onAdd?: () => void;
  /** Label for the add button */
  addButtonLabel?: string;
  /** Tooltip for add button in heading */
  addTooltip?: string;
  /** Text shown when list is empty */
  emptyText?: string;
  /** Help text shown below the list */
  helpText?: string;
  /** 
   * Render function for inline compact fields within each item.
   * Return null to show no inline fields.
   */
  renderInlineFields?: (item: T, index: number) => React.ReactNode;
  /**
   * Render function for popout widget content.
   * If not provided, clicking icon just calls onItemClick.
   */
  renderPopout?: (item: T, index: number, onClose: () => void) => React.ReactNode;
  /** Optional custom popout header renderer */
  renderPopoutHeader?: (item: T, index: number, onClose: () => void) => React.ReactNode;
  /** Called when an item is removed */
  onRemove?: (item: T, index: number) => void;
  /** Tooltip for remove action */
  removeTooltip?: string;
  /** Default icon for all items */
  itemIcon?: EditorIconName;
}

export function ItemList<T extends ItemListItem>({
  title,
  showTitle = true,
  items,
  onItemClick,
  onAdd,
  addButtonLabel = 'Add Item',
  addTooltip = 'Add',
  emptyText = 'No items yet',
  helpText,
  renderInlineFields,
  renderPopout,
  renderPopoutHeader,
  onRemove,
  removeTooltip = 'Remove',
  itemIcon,
}: ItemListProps<T>) {
  const [popoutKey, setPopoutKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popoutRef = useRef<HTMLDivElement>(null);
  const iconButtonRefs = useRef(new Map<string, HTMLElement | null>());
  const [popoutLayout, setPopoutLayout] = useState<PopoutLayout | null>(null);

  const popoutIndex = popoutKey === null ? -1 : items.findIndex((item) => item.key === popoutKey);
  const popoutItem = popoutIndex >= 0 ? items[popoutIndex] : null;

  const updatePopoutPosition = useCallback(() => {
    if (!popoutItem || !listRef.current) {
      setPopoutLayout(null);
      return;
    }

    const anchorElement = iconButtonRefs.current.get(popoutItem.key);
    const paneElement = getPaneViewportElement(listRef.current);
    const anchorRect = anchorElement?.getBoundingClientRect() ?? listRef.current.getBoundingClientRect();
    const paneRect = paneElement?.getBoundingClientRect() ?? listRef.current.getBoundingClientRect();
    const popoutRect = popoutRef.current?.getBoundingClientRect();

    setPopoutLayout(calculatePopoutLayout({
      anchorRect,
      paneRect,
      popoutWidth: popoutRect?.width ?? POPOUT_MAX_WIDTH,
      popoutHeight: popoutRect?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
  }, [popoutItem]);

  useEffect(() => {
    if (popoutKey !== null && popoutItem === null) {
      setPopoutKey(null);
      setPopoutLayout(null);
    }
  }, [popoutItem, popoutKey]);

  useLayoutEffect(() => {
    if (!popoutItem || !listRef.current) return;

    const paneElement = getPaneViewportElement(listRef.current);
    const anchorElement = iconButtonRefs.current.get(popoutItem.key);
    let rafId = 0;

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePopoutPosition);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    paneElement?.addEventListener('scroll', scheduleUpdate, { passive: true });

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => scheduleUpdate())
      : null;

    if (resizeObserver) {
      resizeObserver.observe(listRef.current);
      if (paneElement) resizeObserver.observe(paneElement);
      if (anchorElement) resizeObserver.observe(anchorElement);
      if (popoutRef.current) resizeObserver.observe(popoutRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleUpdate);
      paneElement?.removeEventListener('scroll', scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [popoutItem, updatePopoutPosition]);

  const handleIconClick = (e: React.MouseEvent, item: T, index: number) => {
    e.stopPropagation();
    if (renderPopout) {
      setPopoutKey(popoutKey === item.key ? null : item.key);
    } else {
      onItemClick(item, index);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent, item: T, index: number) => {
    e.stopPropagation();
    onRemove?.(item, index);
  };

  const renderItem = (item: T, index: number) => {
    const icon = item.icon || itemIcon || 'box';
    const isPopoutOpen = popoutKey === item.key;
    const inlineFields = renderInlineFields?.(item, index);

    return (
      <div
        key={item.key}
        style={{
          padding: `${EDITOR_SPACING.sm}px 0`,
          display: 'flex',
          alignItems: 'center',
          gap: EDITOR_SPACING.sm,
          width: '100%',
          boxSizing: 'border-box',
          minHeight: LIST_ITEM_HEIGHT,
          position: 'relative',
        }}
      >
        <Tooltip title="Edit details">
          <Button
            ref={(node) => {
              iconButtonRefs.current.set(item.key, node);
            }}
            type="text"
            size="small"
            onClick={(e) => handleIconClick(e, item, index)}
            style={{
              padding: 0,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPopoutOpen ? EDITOR_COLORS.primary : EDITOR_COLORS.textSecondary,
            }}
          >
            <EditorIcon 
              name={isValidEditorIcon(icon) ? icon : 'box'} 
              size={14} 
              style={{ color: isPopoutOpen ? EDITOR_COLORS.primary : EDITOR_COLORS.textSecondary }} 
            />
          </Button>
        </Tooltip>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: EDITOR_SPACING.sm,
          }}
        >
          <div
            style={{
              minWidth: inlineFields ? 'auto' : 0,
              flex: inlineFields ? '0 1 auto' : '1 1 auto',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onItemClick(item, index);
            }}
          >
            <Text
              ellipsis
              style={{
                color: EDITOR_COLORS.textPrimary,
                display: 'block',
              }}
            >
              {item.label}
            </Text>
          </div>

          {inlineFields && (
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: EDITOR_SPACING.sm,
              }}
            >
              {inlineFields}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.xs, marginLeft: 'auto', flexShrink: 0 }}>
          {item.secondaryLabel && (
            <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
              {item.secondaryLabel}
            </Text>
          )}

          {onRemove && (
            <Tooltip title={removeTooltip}>
              <Button
                type="text"
                size="small"
                onClick={(e) => handleRemoveClick(e, item, index)}
                style={{
                  padding: 0,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: EDITOR_COLORS.textSecondary,
                }}
                aria-label={`${removeTooltip} ${item.label}`}
              >
                <MinusOutlined style={{ fontSize: EDITOR_TYPOGRAPHY.fontSizeLg }} />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        marginTop: showTitle ? EDITOR_SPACING.md : EDITOR_SPACING.xs,
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
      ref={listRef}
    >
      {showTitle && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: EDITOR_SPACING.sm,
            marginBottom: EDITOR_SPACING.xs,
          }}
        >
          <Text style={{
            color: EDITOR_COLORS.textPrimary,
            fontSize: EDITOR_TYPOGRAPHY.fontSizeMd,
            fontWeight: EDITOR_TYPOGRAPHY.fontWeightBold,
            display: 'block',
          }}>
            {title}
          </Text>
          {onAdd && (
            <Tooltip title={addTooltip}>
              <Button
                type="text"
                size="small"
                icon={<EditorIcon name="add" size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                style={{ padding: 0, width: 24, height: 24 }}
                aria-label={addButtonLabel}
              />
            </Tooltip>
          )}
        </div>
      )}
      
      {/* Popout widget - positioned to the left of the list */}
      {renderPopout && popoutItem && createPortal(
        <div
          ref={popoutRef}
          style={{
            position: 'fixed',
            left: popoutLayout?.left ?? -10000,
            top: popoutLayout?.top ?? -10000,
            zIndex: 1000,
            minWidth: POPOUT_MIN_WIDTH,
            maxWidth: POPOUT_MAX_WIDTH,
            background: EDITOR_COLORS.panel,
            border: `1px solid ${EDITOR_COLORS.border}`,
            borderRadius: EDITOR_RADIUS.md,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxHeight: popoutLayout?.maxHeight,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            visibility: popoutLayout ? 'visible' : 'hidden',
          }}
        >
          {renderPopoutHeader ? (
            renderPopoutHeader(popoutItem, popoutIndex, () => setPopoutKey(null))
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${EDITOR_SPACING.sm}px ${EDITOR_SPACING.md}px`,
              background: EDITOR_COLORS.headerBg,
              borderBottom: `1px solid ${EDITOR_COLORS.border}`,
              borderRadius: `${EDITOR_RADIUS.md}px ${EDITOR_RADIUS.md}px 0 0`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm }}>
                <EditorIcon
                  name={popoutItem.icon || itemIcon || 'box'}
                  size={14}
                  style={{ color: EDITOR_COLORS.textSecondary }}
                />
                <Text style={{ color: EDITOR_COLORS.textPrimary, fontWeight: 500 }}>{popoutItem.label}</Text>
              </div>
              <Button
                type="text"
                size="small"
                onClick={() => setPopoutKey(null)}
                style={{ padding: 0, width: 24, height: 24 }}
              >
                <EditorIcon name="close" size={14} />
              </Button>
            </div>
          )}
          {/* Body */}
          <div style={{ padding: EDITOR_SPACING.md, overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
            {renderPopout(popoutItem, popoutIndex, () => setPopoutKey(null))}
          </div>
        </div>,
        document.body
      )}
      
      {/* List items - use simple rendering for now */}
      {items.length > 0 && (
        <div style={{
          maxHeight: MAX_LIST_HEIGHT,
          width: '100%',
          boxSizing: 'border-box',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      )}

      {helpText && (
        <Text style={{ 
          color: EDITOR_COLORS.textMuted, 
          fontSize: EDITOR_TYPOGRAPHY.fontSizeSm, 
          display: 'block', 
          marginTop: EDITOR_SPACING.xs 
        }}>
          {helpText}
        </Text>
      )}
    </div>
  );
}
