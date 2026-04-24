import React, { useMemo } from 'react';
import { FieldRow, groupFieldsByCompactRow } from './FieldRow';
import { GenericFieldRenderer } from '../fieldRenderers/GenericFieldRenderer';
import type { FieldMetadata, InspectorTab } from '../../../editor/schema/FieldMetadata';
import { EDITOR_SPACING } from '../styles/tokens';
import { InspectorComponentSection } from './InspectorComponentSection';
import type { VirtualizedInspectorItem } from './VirtualizedInspectorList';

interface SchemaSurfaceGroup {
  name: string;
  label: string;
}

interface SchemaSurfaceEditorProps {
  fields: Record<string, FieldMetadata>;
  value: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  onFieldCommit: (fieldName: string, value: any) => void;
  pathPrefix?: string;
  groups?: SchemaSurfaceGroup[];
  activeTab?: InspectorTab;
}

interface BuildSchemaSurfaceItemsOptions {
  fields: Record<string, FieldMetadata>;
  value: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  onFieldCommit: (fieldName: string, value: any) => void;
  pathPrefix?: string;
  groups?: SchemaSurfaceGroup[];
  activeTab?: InspectorTab;
}

type RenderBlock =
  | { type: 'field'; key: string; fieldName: string; metadata: FieldMetadata }
  | { type: 'group'; key: string; label: string; fields: Record<string, FieldMetadata> }
  | { type: 'section'; key: string; title: string; fields: Record<string, FieldMetadata> };

function buildFieldPath(pathPrefix: string | undefined, fieldName: string) {
  return pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;
}

function renderFieldSet(
  fieldSet: Record<string, FieldMetadata>,
  value: Record<string, any>,
  onFieldChange: (fieldName: string, value: any) => void,
  onFieldCommit: (fieldName: string, value: any) => void,
  pathPrefix?: string,
) {
  const fieldRows = groupFieldsByCompactRow(fieldSet, value);

  return fieldRows.map(({ row, fields: rowFields }) => {
    if (row) {
      return (
        <div key={row}>
          <FieldRow
            fields={rowFields}
            onChange={onFieldChange}
            onCommit={onFieldCommit}
            disabled={false}
          />
        </div>
      );
    }

    return rowFields.map((field) => (
      <div key={field.name}>
        <GenericFieldRenderer
          metadata={field.metadata}
          value={value[field.name]}
          onChange={(nextValue) => onFieldChange(field.name, nextValue)}
          onCommit={(nextValue) => onFieldCommit(field.name, nextValue)}
          path={buildFieldPath(pathPrefix, field.name)}
          parentValue={value}
        />
      </div>
    ));
  });
}

export function buildSchemaSurfaceItems({
  fields,
  value,
  onFieldChange,
  onFieldCommit,
  pathPrefix,
  groups = [],
  activeTab,
}: BuildSchemaSurfaceItemsOptions): VirtualizedInspectorItem[] {
  const groupLabels = new Map(groups.map((group) => [group.name, group.label]));
  const blocks: RenderBlock[] = [];
  const groupedBlocks = new Map<string, Extract<RenderBlock, { type: 'group' }>>();

  for (const [fieldName, fieldMeta] of Object.entries(fields)) {
    if (fieldMeta.inspectorTab && fieldMeta.inspectorTab !== activeTab) {
      continue;
    }

    const groupName = fieldMeta.group;
    const sectionTitle = fieldMeta.sectionStyle === 'inspector' ? fieldMeta.section : undefined;

    if (groupName) {
      let block = groupedBlocks.get(groupName);
      if (!block) {
        block = {
          type: 'group',
          key: `group:${groupName}`,
          label: groupLabels.get(groupName) ?? groupName,
          fields: {},
        };
        groupedBlocks.set(groupName, block);
        blocks.push(block);
      }
      block.fields[fieldName] = fieldMeta;
      continue;
    }

    const lastBlock = blocks[blocks.length - 1];
    if (sectionTitle && lastBlock?.type === 'section' && lastBlock.title === sectionTitle) {
      lastBlock.fields[fieldName] = fieldMeta;
      continue;
    }

    if (sectionTitle) {
      blocks.push({
        type: 'section',
        key: `section:${sectionTitle}:${fieldName}`,
        title: sectionTitle,
        fields: { [fieldName]: fieldMeta },
      });
      continue;
    }

    blocks.push({
      type: 'field',
      key: `field:${fieldName}`,
      fieldName,
      metadata: fieldMeta,
    });
  }

  return blocks.map((block) => {
    if (block.type === 'group') {
      return {
        key: block.key,
        node: (
          <InspectorComponentSection title={block.label}>
            {renderFieldSet(block.fields, value, onFieldChange, onFieldCommit, pathPrefix)}
          </InspectorComponentSection>
        ),
      };
    }

    if (block.type === 'section') {
      return {
        key: block.key,
        node: (
          <InspectorComponentSection title={block.title}>
            {renderFieldSet(block.fields, value, onFieldChange, onFieldCommit, pathPrefix)}
          </InspectorComponentSection>
        ),
      };
    }

    return {
      key: block.key,
      node: (
        <div>
          <GenericFieldRenderer
            metadata={block.metadata}
            value={value[block.fieldName]}
            onChange={(nextValue) => onFieldChange(block.fieldName, nextValue)}
            onCommit={(nextValue) => onFieldCommit(block.fieldName, nextValue)}
            path={buildFieldPath(pathPrefix, block.fieldName)}
            parentValue={value}
          />
        </div>
      ),
    };
  });
}

export function SchemaSurfaceEditor({
  fields,
  value,
  onFieldChange,
  onFieldCommit,
  pathPrefix,
  groups = [],
  activeTab,
}: SchemaSurfaceEditorProps) {
  const items = useMemo(
    () => buildSchemaSurfaceItems({
      fields,
      value,
      onFieldChange,
      onFieldCommit,
      pathPrefix,
      groups,
      activeTab,
    }),
    [fields, value, onFieldChange, onFieldCommit, pathPrefix, groups, activeTab]
  );

  return (
    <div style={{ padding: `${EDITOR_SPACING.sm}px 0` }}>
      {items.map((item) => (
        <React.Fragment key={item.key}>{item.node}</React.Fragment>
      ))}
    </div>
  );
}
