import React, { useLayoutEffect, useRef, useState } from 'react';
import VirtualList from 'rc-virtual-list';

export interface VirtualizedInspectorItem {
  key: string;
  node: React.ReactNode;
}

interface VirtualizedInspectorListProps {
  items: VirtualizedInspectorItem[];
  itemHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_ITEM_HEIGHT = 72;

export function VirtualizedInspectorList({
  items,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  className,
  style,
}: VirtualizedInspectorListProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateHeight = () => {
      setViewportHeight(node.clientHeight);
    };

    updateHeight();
    const rafId = requestAnimationFrame(updateHeight);

    const handleResize = () => updateHeight();
    window.addEventListener('resize', handleResize);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(node);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      {viewportHeight > 0 ? (
        <VirtualList
          data={items}
          itemKey="key"
          height={viewportHeight}
          itemHeight={itemHeight}
          fullHeight
          showScrollBar="optional"
          data-editor-pane-scroll="true"
          className={className}
          style={{ overflowX: 'hidden' }}
        >
          {(item) => (
            <div key={item.key}>
              {item.node}
            </div>
          )}
        </VirtualList>
      ) : items.length > 0 ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          {items.map((item) => (
            <div key={item.key}>{item.node}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
