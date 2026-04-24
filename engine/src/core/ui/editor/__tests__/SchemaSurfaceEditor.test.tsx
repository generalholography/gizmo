// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaSurfaceEditor } from '../components/SchemaSurfaceEditor';
import { WorldDimensionsSchema, WorldMetadataSchema } from '../../../editor/schema/worldSchemas';
import type { FieldMetadata } from '../../../editor/schema/FieldMetadata';

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

function getDimensionFields() {
  const dimensionsField = WorldDimensionsSchema.fields.dimensions;
  if (!dimensionsField.itemType || dimensionsField.itemType.type !== 'object' || !dimensionsField.itemType.fields) {
    throw new Error('WorldDimensionsSchema dimension item fields missing');
  }
  return Object.fromEntries(
    Object.entries(dimensionsField.itemType.fields).filter(([fieldName]) => fieldName !== 'name')
  ) as Record<string, FieldMetadata>;
}

describe('SchemaSurfaceEditor', () => {
  it('renders world dimension surfaces with shared group and section shells', () => {
    render(
      <SchemaSurfaceEditor
        fields={getDimensionFields()}
        groups={WorldDimensionsSchema.groups}
        value={{
          gravity: -9.81,
          useDayNightCycle: false,
          sky: {
            color: '#87ceeb',
            sun: { color: '#ffffff', intensity: 1, timeOfDay: 1200 },
            clouds: { color: '#ffffff', coverage: 0.5 },
            stars: { intensity: 0.2 },
          },
          terrain: {
            heightField: 'terrainHeight',
            size: 100,
            heightOffset: 0,
          },
        }}
        onFieldChange={() => {}}
        onFieldCommit={() => {}}
        pathPrefix="dimensions[0]"
      />
    );

    const titles = Array.from(document.querySelectorAll('section .ant-typography')).map((node) => node.textContent);
    expect(titles).toContain('Environment');
    expect(titles).toContain('Sky');
    expect(titles).toContain('Terrain');
  });

  it('renders world metadata surfaces through grouped shared sections', () => {
    render(
      <SchemaSurfaceEditor
        fields={WorldMetadataSchema.fields}
        groups={WorldMetadataSchema.groups}
        value={{
          title: 'Demo',
          description: 'A world',
          tags: ['tag-1'],
          brandColors: ['#ffffff'],
        }}
        onFieldChange={() => {}}
        onFieldCommit={() => {}}
        pathPrefix="world"
      />
    );

    const titles = Array.from(document.querySelectorAll('section .ant-typography')).map((node) => node.textContent);
    expect(titles).toContain('General');
    expect(titles).toContain('Branding');
  });
});
