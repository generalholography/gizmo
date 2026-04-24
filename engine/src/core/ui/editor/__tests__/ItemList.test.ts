import { describe, expect, it } from 'vitest';
import { calculatePopoutLayout } from '../components/ItemList';

describe('calculatePopoutLayout', () => {
  it('centers on the anchor when the pane has enough room', () => {
    const layout = calculatePopoutLayout({
      anchorRect: { top: 200, bottom: 224, left: 0, height: 24 },
      paneRect: { top: 100, bottom: 700, left: 900, height: 600 },
      popoutWidth: 320,
      popoutHeight: 240,
      viewportWidth: 1440,
      viewportHeight: 900,
    });

    expect(layout.top).toBe(100);
    expect(layout.left).toBe(568);
    expect(layout.maxHeight).toBe(600);
  });

  it('clamps to the bottom of the visible pane when the anchor is too low', () => {
    const layout = calculatePopoutLayout({
      anchorRect: { top: 620, bottom: 644, left: 0, height: 24 },
      paneRect: { top: 100, bottom: 700, left: 900, height: 600 },
      popoutWidth: 320,
      popoutHeight: 360,
      viewportWidth: 1440,
      viewportHeight: 900,
    });

    expect(layout.top).toBe(340);
    expect(layout.maxHeight).toBe(600);
  });

  it('prevents top overflow and caps oversized popouts to the pane height', () => {
    const layout = calculatePopoutLayout({
      anchorRect: { top: 80, bottom: 104, left: 0, height: 24 },
      paneRect: { top: 48, bottom: 468, left: 720, height: 420 },
      popoutWidth: 320,
      popoutHeight: 560,
      viewportWidth: 1280,
      viewportHeight: 720,
    });

    expect(layout.top).toBe(48);
    expect(layout.left).toBe(388);
    expect(layout.maxHeight).toBe(420);
  });
});
