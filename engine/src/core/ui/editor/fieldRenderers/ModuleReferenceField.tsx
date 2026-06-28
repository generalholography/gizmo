/**
 * Module Reference Field Renderer
 * Renders inline module definitions and named module-instance references.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Select, Tag, Tooltip, Typography } from 'antd';
import { FieldRendererProps } from './FieldRendererProps';
import { GenericFieldRenderer } from './GenericFieldRenderer';
import { useAPI } from '../../App';
import { useEditor } from '../EditorContext';
import { getModule } from '../../../ecs';
import { Module } from '../../../../modules/Module';
import { UpsertModuleInstanceCommand } from '../../../editor/commands/ModuleInstanceCommand';
import type { FieldMetadata } from '../../../editor/schema/FieldMetadata';
import { FieldRow, groupFieldsByCompactRow } from '../components/FieldRow';
import { EditorIcon } from '../styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_RADIUS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from '../styles/tokens';

const { Text } = Typography;
const { TextArea } = Input;

const POPOUT_WIDTH = 340;
const POPOUT_GAP = EDITOR_SPACING.md;
const POPOUT_MARGIN = EDITOR_SPACING.md;

interface ModuleInstanceEntry {
  instanceName: string;
  definition: { type: string; params: any };
  builtIn: boolean;
}

function cloneDefinition(definition: any): { type: string; params: any } {
  if (!definition || typeof definition !== 'object') {
    return { type: 'simplex', params: {} };
  }
  return JSON.parse(JSON.stringify(definition));
}

function setByPath(value: any, path: string, nextValue: any): any {
  const keys = path.split('.');
  const root = { ...(value ?? {}) };
  let current = root;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = nextValue;
      return;
    }
    current[key] = { ...(current[key] ?? {}) };
    current = current[key];
  });
  return root;
}

function getFieldDefaultValue(field: FieldMetadata): any {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === 'number') return field.min ?? 0;
  if (field.type === 'string') return '';
  if (field.type === 'boolean') return false;
  if (field.type === 'enum') return field.enumOptions?.[0]?.value ?? field.enumValues?.[0] ?? '';
  if (field.type === 'array') return [];
  if (field.type === 'object') return {};
  return undefined;
}

function buildDefaultDefinition(metadata: FieldMetadata): { type: string; params: any } {
  const typeField = metadata.fields?.type;
  const paramsField = metadata.fields?.params;
  const type = typeField?.defaultValue ?? typeField?.enumOptions?.[0]?.value ?? typeField?.enumValues?.[0] ?? 'simplex';
  const params: Record<string, any> = {};
  if (paramsField?.type === 'union' && paramsField.unionTypes) {
    for (const field of paramsField.unionTypes[type] ?? []) {
      params[field.name] = getFieldDefaultValue(field);
    }
  }
  return { type, params };
}

function listModuleInstances(ctx: any, moduleName: string | undefined): ModuleInstanceEntry[] {
  if (!moduleName) return [];
  const module = getModule<Module<any, any>>(ctx, moduleName, true);
  if (!module) return [];
  const builtIns = module.getBuiltInDefinitions().map((entry) => ({
    instanceName: entry.name,
    definition: entry.definition,
    builtIn: true,
  }));
  const runtime = module.getRuntimeDefinitions().map((entry) => ({
    instanceName: entry.name,
    definition: entry.definition,
    builtIn: false,
  }));
  return [...builtIns, ...runtime].sort((a, b) => {
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    return a.instanceName.localeCompare(b.instanceName);
  });
}

function resolveParamsFields(metadata: FieldMetadata, definition: { type: string; params: any }): FieldMetadata[] {
  const paramsField = metadata.fields?.params;
  if (paramsField?.type !== 'union' || !paramsField.unionTypes) return [];
  return paramsField.unionTypes[definition.type] ?? [];
}

function buildCompactParamFields(metadata: FieldMetadata, definition: { type: string; params: any }) {
  const allowed = new Set(metadata.compactFields ?? []);
  const fields = resolveParamsFields(metadata, definition);
  const compactFields = fields
    .filter((field) => allowed.size === 0 || allowed.has(`params.${field.name}`) || allowed.has(field.name))
    .map((field) => ({
      ...field,
      compactRow: 'module',
      displayMode: 'compact' as const,
      condensedLabel: field.condensedLabel ?? field.label?.[0] ?? field.name[0]?.toUpperCase(),
    }));
  return Object.fromEntries(compactFields.map((field) => [field.name, field]));
}

function ModuleInstancePopout({
  anchorRef,
  title,
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const popoutRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  const updateLayout = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const popoutRect = popoutRef.current?.getBoundingClientRect();
    const height = Math.min(popoutRect?.height ?? 420, window.innerHeight - POPOUT_MARGIN * 2);
    const preferredTop = anchorRect.top + anchorRect.height / 2 - height / 2;
    const top = Math.min(Math.max(preferredTop, POPOUT_MARGIN), window.innerHeight - height - POPOUT_MARGIN);
    const preferredLeft = anchorRect.left - POPOUT_WIDTH - POPOUT_GAP;
    const left = Math.max(POPOUT_MARGIN, preferredLeft);
    setLayout({ top, left, maxHeight: window.innerHeight - POPOUT_MARGIN * 2 });
  }, [anchorRef]);

  useLayoutEffect(() => {
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [updateLayout]);

  return createPortal(
    <div
      ref={popoutRef}
      style={{
        position: 'fixed',
        top: layout?.top ?? -10000,
        left: layout?.left ?? -10000,
        width: POPOUT_WIDTH,
        maxHeight: layout?.maxHeight,
        zIndex: 1000,
        background: EDITOR_COLORS.panel,
        border: `1px solid ${EDITOR_COLORS.border}`,
        borderRadius: EDITOR_RADIUS.md,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        visibility: layout ? 'visible' : 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `${EDITOR_SPACING.sm}px ${EDITOR_SPACING.md}px`,
          background: EDITOR_COLORS.headerBg,
          borderBottom: `1px solid ${EDITOR_COLORS.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm, minWidth: 0 }}>
          <EditorIcon name="adjustments" size={14} style={{ color: EDITOR_COLORS.textSecondary }} />
          <Text ellipsis style={{ color: EDITOR_COLORS.textPrimary, fontWeight: 500 }}>{title}</Text>
        </div>
        <Button type="text" size="small" onClick={onClose} style={{ padding: 0, width: 24, height: 24 }}>
          <EditorIcon name="close" size={14} />
        </Button>
      </div>
      <div style={{ padding: EDITOR_SPACING.md, overflowY: 'auto', maxHeight: `calc(${layout?.maxHeight ?? 420}px - 42px)` }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModuleReferenceField({ metadata, value, onChange, onCommit, disabled, path }: FieldRendererProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand } = useEditor();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [popoutOpen, setPopoutOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);

  const isInstanceReference = metadata.referenceMode === 'instance';
  const instances = useMemo(
    () => listModuleInstances(ctx, metadata.moduleName),
    [ctx, metadata.moduleName, refreshVersion],
  );
  const selectedName = typeof value === 'string' ? value : instances[0]?.instanceName ?? '';
  const selectedEntry = instances.find((entry) => entry.instanceName === selectedName);
  const selectedDefinition = cloneDefinition(selectedEntry?.definition ?? (typeof value === 'object' ? value : buildDefaultDefinition(metadata)));
  const [draftDefinition, setDraftDefinition] = useState(selectedDefinition);

  useEffect(() => {
    setDraftDefinition(selectedDefinition);
  }, [selectedName, refreshVersion]);

  const commitDefinition = (
    definition: { type: string; params: any },
    instanceName = selectedName,
    updateReference = false,
  ) => {
    if (!metadata.moduleName || !instanceName) return;
    executeCommand(new UpsertModuleInstanceCommand(ctx, metadata.moduleName, instanceName, definition));
    setRefreshVersion((version) => version + 1);
    if (updateReference) {
      onChange(instanceName);
      onCommit?.(instanceName);
    }
  };

  const applyDefinitionChange = (definition: { type: string; params: any }, commit = false) => {
    setDraftDefinition(definition);
    if (commit) {
      commitDefinition(definition);
    }
  };

  const handleSelectInstance = (instanceName: string) => {
    onChange(instanceName);
    onCommit?.(instanceName);
  };

  const handleCreateInstance = () => {
    const safeName = newInstanceName.trim();
    if (!safeName || !metadata.moduleName) return;
    commitDefinition(buildDefaultDefinition(metadata), safeName, true);
    setNewInstanceName('');
    setPopoutOpen(true);
  };

  const handleDefinitionFieldChange = (fieldName: string, fieldValue: any, commit = false) => {
    let nextDefinition = cloneDefinition(draftDefinition);
    if (fieldName === 'type') {
      nextDefinition = {
        type: fieldValue,
        params: buildDefaultDefinition({
          ...metadata,
          fields: metadata.fields,
        }).params,
      };
      const paramsField = metadata.fields?.params;
      if (paramsField?.type === 'union' && paramsField.unionTypes) {
        const params: Record<string, any> = {};
        for (const field of paramsField.unionTypes[fieldValue] ?? []) {
          params[field.name] = getFieldDefaultValue(field);
        }
        nextDefinition.params = params;
      }
    } else if (fieldName === 'params') {
      nextDefinition.params = fieldValue;
    } else {
      nextDefinition = setByPath(nextDefinition, fieldName, fieldValue);
    }
    applyDefinitionChange(nextDefinition, commit);
  };

  const handleParamFieldChange = (fieldName: string, fieldValue: any, commit = false) => {
    const nextDefinition = {
      ...draftDefinition,
      params: {
        ...(draftDefinition.params ?? {}),
        [fieldName]: fieldValue,
      },
    };
    applyDefinitionChange(nextDefinition, commit);
  };

  if (isInstanceReference) {
    const compactFieldSet = buildCompactParamFields(metadata, draftDefinition);
    const compactRows = groupFieldsByCompactRow(compactFieldSet, draftDefinition.params ?? {});
    const canEdit = metadata.allowEditInstance !== false && !selectedEntry?.builtIn;

    return (
      <div ref={anchorRef} style={{ marginBottom: EDITOR_SPACING.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm, marginBottom: EDITOR_SPACING.xs }}>
          <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
            {metadata.label || metadata.name}
          </Text>
          <Tag color="blue" style={{ fontSize: 10 }}>{metadata.moduleName || 'module'}</Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm }}>
          <Tooltip title="Edit selected module instance">
            <Button
              type="text"
              size="small"
              disabled={disabled || !selectedName}
              onClick={() => setPopoutOpen((open) => !open)}
              style={{
                padding: 0,
                width: 24,
                height: 24,
                color: popoutOpen ? EDITOR_COLORS.primary : EDITOR_COLORS.textSecondary,
              }}
            >
              <EditorIcon name="adjustments" size={14} />
            </Button>
          </Tooltip>
          <Select
            value={selectedName || undefined}
            onChange={handleSelectInstance}
            size="small"
            disabled={disabled}
            placeholder="Select field"
            style={{ minWidth: 130, flex: '0 0 130px' }}
            options={instances.map((entry) => ({
              value: entry.instanceName,
              label: `${entry.instanceName}${entry.builtIn ? ' (built-in)' : ''}`,
            }))}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {compactRows.map(({ row, fields }) => row ? (
              <FieldRow
                key={row}
                fields={fields}
                onChange={(fieldName, fieldValue) => handleParamFieldChange(fieldName, fieldValue)}
                onCommit={(fieldName, fieldValue) => handleParamFieldChange(fieldName, fieldValue, true)}
                disabled={disabled || !canEdit}
              />
            ) : null)}
          </div>
        </div>

        {metadata.allowCreateInstance && (
          <div style={{ display: 'flex', gap: EDITOR_SPACING.sm, marginTop: EDITOR_SPACING.xs }}>
            <Input
              value={newInstanceName}
              onChange={(event) => setNewInstanceName(event.target.value)}
              onPressEnter={handleCreateInstance}
              placeholder="New field name"
              size="small"
              disabled={disabled}
            />
            <Button size="small" onClick={handleCreateInstance} disabled={disabled || !newInstanceName.trim()}>
              Create
            </Button>
          </div>
        )}

        {popoutOpen && selectedName && (
          <ModuleInstancePopout
            anchorRef={anchorRef}
            title={`${selectedName} field`}
            onClose={() => setPopoutOpen(false)}
          >
            {selectedEntry?.builtIn ? (
              <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
                Built-in module instances can be selected but not edited.
              </Text>
            ) : (
              <>
                {metadata.fields?.type && (
                  <GenericFieldRenderer
                    metadata={metadata.fields.type}
                    value={draftDefinition.type}
                    onChange={(nextValue) => handleDefinitionFieldChange('type', nextValue, true)}
                    onCommit={(nextValue) => handleDefinitionFieldChange('type', nextValue, true)}
                    path={`${path}.definition.type`}
                    disabled={disabled || !canEdit}
                    parentValue={draftDefinition}
                  />
                )}
                {metadata.fields?.params && (
                  <GenericFieldRenderer
                    metadata={metadata.fields.params}
                    value={draftDefinition.params}
                    onChange={(nextValue) => handleDefinitionFieldChange('params', nextValue, true)}
                    onCommit={(nextValue) => handleDefinitionFieldChange('params', nextValue, true)}
                    path={`${path}.definition.params`}
                    disabled={disabled || !canEdit}
                    parentValue={draftDefinition}
                  />
                )}
              </>
            )}
          </ModuleInstancePopout>
        )}
      </div>
    );
  }

  const hasStructuredFields = metadata.fields && Object.keys(metadata.fields).length > 0;

  if (hasStructuredFields) {
    const currentValue = value || {};

    const handleFieldChange = (fieldName: string, fieldValue: any, commit = false) => {
      const nextValue = {
        ...currentValue,
        [fieldName]: fieldValue
      };
      onChange(nextValue);
      if (commit) {
        onCommit?.(nextValue);
      }
    };

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Text style={{ color: '#ccc', fontSize: '12px' }}>
            {metadata.label || metadata.name}
          </Text>
          <Tag color="blue" style={{ fontSize: '10px' }}>
            {metadata.moduleName || 'module'}
          </Tag>
        </div>
        <div>
          {Object.entries(metadata.fields!).map(([fieldName, fieldMeta]) => (
            <div key={fieldName}>
              <GenericFieldRenderer
                metadata={fieldMeta}
                value={currentValue[fieldName]}
                onChange={(val) => handleFieldChange(fieldName, val)}
                onCommit={(val) => handleFieldChange(fieldName, val, true)}
                path={`${metadata.name}.${fieldName}`}
                disabled={disabled}
                parentValue={currentValue}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const jsonValue = value ? JSON.stringify(value, null, 2) : '';
  const handleChange = (newValue: string) => {
    if (!newValue.trim()) {
      onChange(undefined);
      setJsonError(null);
      onCommit?.(undefined);
      return;
    }

    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed);
      onCommit?.(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px' }}>
          {metadata.label || metadata.name}
        </Text>
        <Tag color="blue" style={{ fontSize: '10px' }}>
          {metadata.moduleName || 'module'}
        </Tag>
      </div>

      <TextArea
        value={jsonValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`{"type": "solid", "params": {"color": "#808080"}}`}
        size="small"
        disabled={disabled}
        rows={4}
        onBlur={(e) => handleChange(e.target.value)}
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          borderColor: jsonError ? '#ff4d4f' : undefined
        }}
      />

      {jsonError && (
        <Text style={{ color: '#ff4d4f', fontSize: '11px', display: 'block', marginTop: '4px' }}>
          Invalid JSON: {jsonError}
        </Text>
      )}
    </div>
  );
}
