// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ItemList } from '../components/ItemList';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function render(ui: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe('ItemList interactions', () => {
  it('fires onItemClick when clicking the item label area', () => {
    const onItemClick = vi.fn();

    render(
      <ItemList
        title="Parts"
        showTitle={false}
        items={[{ key: 'part-1', label: 'Upper Arm', childCount: 0 }]}
        onItemClick={onItemClick}
      />
    );

    const label = document.querySelector('.ant-typography');
    expect(label?.textContent).toBe('Upper Arm');

    act(() => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick.mock.calls[0][0]).toMatchObject({ key: 'part-1', label: 'Upper Arm' });
  });

  it('fires onRemove without triggering onItemClick', () => {
    const onItemClick = vi.fn();
    const onRemove = vi.fn();

    render(
      <ItemList
        title="Parts"
        showTitle={false}
        items={[{ key: 'part-1', label: 'Upper Arm', childCount: 0 }]}
        onItemClick={onItemClick}
        onRemove={onRemove}
      />
    );

    const buttons = Array.from(document.querySelectorAll('button'));
    const removeButton = buttons[buttons.length - 1];

    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('does not render empty-state content when the list has no items', () => {
    render(
      <ItemList
        title="Parts"
        items={[]}
        onItemClick={() => {}}
        onAdd={() => {}}
        emptyText="No parts yet"
      />
    );

    expect(document.body.textContent).toContain('Parts');
    expect(document.body.textContent).not.toContain('No parts yet');
  });
});
