// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { BodyPartFieldEditor, getBodyPartEditorFields } from '../components/BodyPartFieldEditor';

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

describe('BodyPartFieldEditor', () => {
  it('renders primitive body-part modules through inspector section shells', () => {
    render(
      <BodyPartFieldEditor
        value={{
          type: 'primitive',
          localPosition: { x: 0, y: 0, z: 0 },
          localRotation: { x: 0, y: 0, z: 0 },
          localScale: { x: 1, y: 1, z: 1 },
          geometry: {
            type: 'cylinder',
            params: { radius: 0.55, height: 1.4 },
          },
          material: {
            type: 'solid',
            params: {
              color: '#fb923c',
              emissive: '#000000',
              emissiveIntensity: 1,
              metalness: 0.1,
              roughness: 0.45,
              opacity: 1,
              flatShading: false,
            },
          },
          ignoreCollisions: false,
        }}
        onChange={() => {}}
        path="bodyPart"
        hideChildren
      />
    );

    const titles = Array.from(document.querySelectorAll('section .ant-typography')).map((node) => node.textContent);
    expect(titles).toContain('Transform');
    expect(titles).toContain('Geometry');
    expect(titles).toContain('Material');
    expect(document.querySelectorAll('section')).toHaveLength(3);
  });

  it('renders group operations through the shared inspector section shell', () => {
    render(
      <BodyPartFieldEditor
        value={{
          type: 'group',
          localPosition: { x: 0, y: 0, z: 0 },
          localRotation: { x: 0, y: 0, z: 0 },
          localScale: { x: 1, y: 1, z: 1 },
          operation: {
            type: 'none',
            params: {},
          },
        }}
        onChange={() => {}}
        path="bodyPart"
        hideChildren
      />
    );

    const titles = Array.from(document.querySelectorAll('section .ant-typography')).map((node) => node.textContent);
    expect(titles).toContain('Transform');
    expect(titles).toContain('Group Operation');
  });

  it('routes physics-only fields to the simulate tab field set', () => {
    const designFields = getBodyPartEditorFields(
      {
        type: 'primitive',
        ignoreCollisions: false,
      },
      true,
      true,
      'design',
    );

    const simulateFields = getBodyPartEditorFields(
      {
        type: 'primitive',
        localPosition: { x: 0, y: 0, z: 0 },
        ignoreCollisions: false,
      },
      true,
      true,
      'simulate',
    );

    expect(designFields.ignoreCollisions).toBeUndefined();
    expect(simulateFields.localPosition).toBeUndefined();
    expect(simulateFields.ignoreCollisions?.section).toBe('Physics');
    expect(simulateFields.ignoreCollisions?.inspectorTab).toBe('simulate');
  });
});
