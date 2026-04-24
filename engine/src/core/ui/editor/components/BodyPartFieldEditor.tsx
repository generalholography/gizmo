import React from 'react';
import type { InspectorTab } from '../../../editor/schema/FieldMetadata';
import type { FieldMetadata } from '../../../editor/schema/FieldMetadata';
import { BodyPartSchema } from '../../../editor/schema/schemas/BodySchema';
import { GenericFieldRenderer } from '../fieldRenderers/GenericFieldRenderer';

interface BodyPartFieldEditorProps {
  value: any;
  onChange: (value: any) => void;
  onCommit?: (value: any) => void;
  path: string;
  hideChildren?: boolean;
  hideMetadata?: boolean;
  inspectorTab?: InspectorTab;
  editorKey?: string;
}

function filterUnionFields(
  schema: FieldMetadata,
  predicate: (field: FieldMetadata) => boolean,
): FieldMetadata {
  if (!schema || schema.type !== 'union' || !schema.unionTypes) return schema;
  const unionTypes: Record<string, FieldMetadata[]> = {};
  Object.entries(schema.unionTypes).forEach(([key, fields]) => {
    unionTypes[key] = (fields as FieldMetadata[]).filter(predicate);
  });
  return { ...schema, unionTypes };
}

function resolveBodyPartSchema(
  hideChildren: boolean,
  hideMetadata: boolean,
  inspectorTab: InspectorTab,
): FieldMetadata {
  return filterUnionFields(BodyPartSchema as FieldMetadata, (field) => {
    if (hideChildren && field.name === 'children') return false;
    if (hideMetadata && (field.name === 'name' || field.name === 'tag')) return false;
    if (inspectorTab === 'design') {
      if (field.inspectorTab && field.inspectorTab !== 'design') return false;
    } else if (field.inspectorTab !== inspectorTab) {
      return false;
    }
    return true;
  });
}

export function getBodyPartEditorFields(
  value: any,
  hideChildren = false,
  hideMetadata = true,
  inspectorTab: InspectorTab = 'design',
): Record<string, FieldMetadata> {
  const schema = resolveBodyPartSchema(hideChildren, hideMetadata, inspectorTab);
  if (schema.type !== 'union' || !schema.unionTypes) {
    return {};
  }

  const unionType = value?.type && schema.unionTypes[value.type]
    ? value.type
    : Object.keys(schema.unionTypes)[0];
  const fieldsForType = schema.unionTypes[unionType] || [];

  const visibleFields = fieldsForType.filter((field) => !field.inspectorTab || field.inspectorTab === inspectorTab);

  return Object.fromEntries(visibleFields.map((field) => [field.name, field]));
}

export function BodyPartFieldEditor({
  value,
  onChange,
  onCommit,
  path,
  hideChildren = false,
  hideMetadata = true,
  inspectorTab = 'design',
  editorKey,
}: BodyPartFieldEditorProps) {
  const schema = resolveBodyPartSchema(hideChildren, hideMetadata, inspectorTab);

  return (
    <GenericFieldRenderer
      key={editorKey}
      metadata={schema}
      value={value}
      onChange={onChange}
      onCommit={onCommit}
      path={path}
      // Pass node value as parentValue so the union discriminator ("type") is treated
      // as sibling-managed and its selector stays hidden in the part inspector UI.
      parentValue={value}
    />
  );
}
