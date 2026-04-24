/**
 * Body Component Editor
 * Dedicated editor for Body component with parts list and popout editing
 * Extracted from ComponentInspector for better separation of concerns
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Typography, message, Button } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { buildFieldDefault } from '../../editor/schema/defaults';
import { ModifyComponentCommand } from '../../editor/commands/ModifyComponentCommand';
import { GenericFieldRenderer } from './fieldRenderers/GenericFieldRenderer';
import { BodySchema, BodyPartSchema } from '../../editor/schema/schemas/BodySchema';
import { ItemList, ItemListItem } from './components/ItemList';
import { BodyPartFieldEditor } from './components/BodyPartFieldEditor';
import { PaneTitle } from './components/PaneTitle';
import { InspectorMetadataModal } from './InspectorMetadataModal';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from './styles/tokens';
import type { FieldMetadata } from '../../editor/schema/FieldMetadata';
import type { Node as BodyNode } from '../../schema';
import { applyBundle } from '../../spawn';
import { getEntityBundle } from '../../despawn';
import {
  getPartAtPath,
  hydrateCompositeBodyTypes,
  inferBodyNodeType,
  removePartAtPath,
  resolveBodyPartDisplayName,
  replacePartAtPath,
  type CompositeBody,
} from '../../editor/utils/bodyParts';

const { Text } = Typography;

// Build BodyOverviewMetadata (excludes parts from composite params)
const compositeParams = (BodySchema.fields.params as any).unionTypes.composite as FieldMetadata[];
const compositeParamsWithoutParts = compositeParams.filter(
  field => field.name !== 'parts' && field.name !== 'hasInterior',
);
const hasInteriorField = compositeParams.find(field => field.name === 'hasInterior');

const BodyOverviewMetadata: FieldMetadata = {
  name: 'BodyOverview',
  type: 'object',
  required: true,
  fields: {
    type: {
      ...BodySchema.fields.type,
      hidden: true,
    },
    params: {
      ...BodySchema.fields.params,
      unionTypes: {
        ...((BodySchema.fields.params as any).unionTypes || {}),
        composite: compositeParamsWithoutParts,
      },
    } as FieldMetadata,
  },
};

/**
 * Deep clone a value using JSON serialization
 */
function cloneValue<T>(value: T): T {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

/**
 * Resolve a human-readable label for a body part
 */
function resolvePartLabel(part: BodyNode): string {
  return resolveBodyPartDisplayName(part);
}

/**
 * Map geometry type to editor icon name.
 * Returns 'cube' as default for unknown geometry types.
 */
function resolvePartIcon(part: BodyNode): 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'light' | 'cube' {
  const geoType = (part as any).geometry?.type;
  if (geoType) {
    const iconMap: Record<string, 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'cube'> = {
      image: 'box',
      box: 'box',
      sphere: 'sphere',
      cylinder: 'cylinder',
      cone: 'cone',
      pyramid: 'pyramid',
      cube: 'cube',
      capsule: 'cylinder',
      hemisphere: 'sphere',
      icosahedron: 'sphere',
      torus: 'sphere',
      roundedBox: 'box',
      wedge: 'pyramid',
      lathe: 'cylinder',
      star: 'cube',
      hollowCylinder: 'cylinder',
      displacedPlane: 'box',
      extrudedPolygon: 'box',
    };
    return iconMap[geoType] || 'cube';
  }
  if ((part as any).light) return 'light';
  return 'cube';
}

interface PartItem extends ItemListItem {
  path: number[];
  childCount: number;
  partData?: BodyNode;
}

export interface BodyHeaderActions {
  onAddPart: () => void;
  showAddPart: boolean;
  addPartTooltip?: string;
}

/**
 * List top-level parts as PartItem objects
 */
function listTopLevelParts(parts: BodyNode[] = []): PartItem[] {
  return parts.map((part, index) => ({
    key: `part-${index}`,
    label: resolvePartLabel(part),
    icon: resolvePartIcon(part),
    path: [index],
    childCount: part.children?.length || 0,
    partData: part,
  }));
}

export interface BodyComponentEditorProps {
  eid: number;
  bodyData: any;
  onHeaderActionsChange?: (actions: BodyHeaderActions | null) => void;
}

/**
 * BodyComponentEditor - Dedicated editor for Body component
 */
export function BodyComponentEditor({ eid, bodyData, onHeaderActionsChange }: BodyComponentEditorProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand, selectBodyPart } = useEditor();
  const [bodyDraft, setBodyDraft] = useState<any | null>(null);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [popoutMetadataPath, setPopoutMetadataPath] = useState<number[] | null>(null);
  const [isPopoutMetadataOpen, setIsPopoutMetadataOpen] = useState(false);
  const lastCommittedBodyRef = useRef<any>(null);
  const lastCommittedBundleRef = useRef<any>(null);
  const latestBodyDraftRef = useRef<any>(null);
  const bodyDirtyRef = useRef(false);

  // Sync draft with incoming body data
  useEffect(() => {
    if (!bodyDirty) {
      const clonedBody = bodyData ? cloneValue(bodyData) : null;
      const hydratedBody = clonedBody?.type === 'composite'
        ? hydrateCompositeBodyTypes(clonedBody)
        : clonedBody;
      setBodyDraft(hydratedBody);
      lastCommittedBodyRef.current = hydratedBody;
      latestBodyDraftRef.current = hydratedBody;
      bodyDirtyRef.current = false;
      try {
        lastCommittedBundleRef.current = getEntityBundle(ctx, eid, {
          includeRuntime: false,
          includeRuntimeComponents: false,
        });
      } catch {
        lastCommittedBundleRef.current = null;
      }
    }
  }, [bodyData, bodyDirty, ctx, eid]);


  // Memoize part items
  const partItems = useMemo(
    () => listTopLevelParts(bodyDraft?.params?.parts || []),
    [bodyDraft?.params?.parts]
  );

  // Apply body draft as a command
  const applyBodyDraft = useCallback((draft?: any, force = false) => {
    const nextBody = draft ?? bodyDraft;
    if (!nextBody || (!force && !bodyDirty)) return;

    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Body',
      nextBody,
      true,
      {
        previousComponentData: lastCommittedBodyRef.current,
        previousBundle: lastCommittedBundleRef.current,
      }
    );
    executeCommand(command);
    const currentEid = (command as any).getCurrentEntityId?.() ?? eid;
    try {
      const refreshedBundle = getEntityBundle(ctx, currentEid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });
      lastCommittedBundleRef.current = refreshedBundle;
      lastCommittedBodyRef.current = refreshedBundle?.Body ?? nextBody;
    } catch {
      lastCommittedBodyRef.current = nextBody;
    }
    setBodyDraft(nextBody);
    setBodyDirty(false);
    latestBodyDraftRef.current = nextBody;
    bodyDirtyRef.current = false;
  }, [ctx, api, eid, executeCommand, bodyDraft, bodyDirty]);

  // Handle live body changes
  const handleBodyChange = useCallback((value: any) => {
    setBodyDraft(value);
    setBodyDirty(true);
    latestBodyDraftRef.current = value;
    bodyDirtyRef.current = true;
    try {
      applyBundle(ctx, eid, { Body: value });
    } catch (error) {
      console.warn('Failed to live-apply Body draft:', error);
    }
  }, [ctx, eid]);

  // Handle body commit
  const handleBodyCommit = useCallback((value: any) => {
    setBodyDraft(value);
    setBodyDirty(true);
    latestBodyDraftRef.current = value;
    bodyDirtyRef.current = true;
    applyBodyDraft(value, true);
  }, [applyBodyDraft]);

  useEffect(() => {
    latestBodyDraftRef.current = bodyDraft;
    bodyDirtyRef.current = bodyDirty;
  }, [bodyDraft, bodyDirty]);

  useEffect(() => {
    return () => {
      if (!bodyDirtyRef.current || !latestBodyDraftRef.current) return;

      try {
        const command = new ModifyComponentCommand(
          ctx,
          api,
          eid,
          'Body',
          latestBodyDraftRef.current,
          true,
          {
            previousComponentData: lastCommittedBodyRef.current,
            previousBundle: lastCommittedBundleRef.current,
          }
        );
        executeCommand(command);
        bodyDirtyRef.current = false;
      } catch (error) {
        console.error('Failed to commit Body on unmount:', error);
      }
    };
  }, [api, ctx, eid, executeCommand]);

  // Add a new part
  const addPart = useCallback(() => {
    let nextDraft: any = null;
    setBodyDraft((prev: any) => {
      const next = prev ? cloneValue(prev) : { type: 'composite', params: { parts: [] } };
      if (next.type !== 'composite') {
        message.warning('Parts can only be added to composite bodies');
        return prev ?? next;
      }
      next.params = next.params || {};
      next.params.parts = next.params.parts || [];
      next.params.parts.push(buildFieldDefault(BodyPartSchema));
      nextDraft = next;
      return next;
    });
    if (nextDraft) {
      setBodyDirty(true);
      applyBodyDraft(nextDraft, true);
    }
  }, [applyBodyDraft]);

  useEffect(() => {
    if (!onHeaderActionsChange) return;
    onHeaderActionsChange({
      onAddPart: addPart,
      showAddPart: bodyDraft?.type === 'composite',
      addPartTooltip: 'Add part',
    });
    return () => onHeaderActionsChange(null);
  }, [addPart, bodyDraft?.type, onHeaderActionsChange]);

  // Render popout widget for part editing
  const renderPartPopoutHeader = useCallback((item: PartItem, _index: number, onClose: () => void) => {
    const compositeBody = bodyDraft?.type === 'composite' ? (bodyDraft as CompositeBody) : undefined;
    const part = getPartAtPath(compositeBody, item.path) ?? item.partData;
    const title = resolveBodyPartDisplayName(part);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${EDITOR_SPACING.sm}px ${EDITOR_SPACING.md}px`,
          background: EDITOR_COLORS.headerBg,
          borderBottom: `1px solid ${EDITOR_COLORS.border}`,
          borderRadius: '6px 6px 0 0',
        }}
      >
        <PaneTitle
          title={title}
          onMetadataClick={() => {
            setPopoutMetadataPath(item.path);
            setIsPopoutMetadataOpen(true);
          }}
          metadataAriaLabel="Part metadata options"
          size="md"
        />
        <Button
          type="text"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          style={{ padding: 0, width: 24, height: 24, marginLeft: EDITOR_SPACING.xs }}
          aria-label="Close part popout"
        >
          ×
        </Button>
      </div>
    );
  }, [bodyDraft]);

  // Render popout widget for part editing
  const renderPartPopout = useCallback((item: PartItem) => {
    const compositeBody = bodyDraft?.type === 'composite' ? (bodyDraft as CompositeBody) : undefined;
    const partData = getPartAtPath(compositeBody, item.path) ?? item.partData;
    if (!partData) return null;

    const partNode = partData as BodyNode;
    const partWithType = (partNode as any).type
      ? partNode
      : { ...partNode, type: inferBodyNodeType(partNode) };

    const updatePartAtPath = (nextPart: BodyNode) => {
      return compositeBody ? replacePartAtPath(compositeBody, item.path, nextPart) : undefined;
    };

    return (
      <div style={{ minWidth: 200 }}>
        <BodyPartFieldEditor
          editorKey={`body-popout-${eid}-${item.path.join('.')}-${(partWithType as any)?.type ?? 'unknown'}`}
          value={partWithType}
          onChange={(val: any) => {
            const newBody = updatePartAtPath(val);
            if (!newBody) return;
            handleBodyChange(newBody);
          }}
          onCommit={(val: any) => {
            const newBody = updatePartAtPath(val);
            if (!newBody) return;
            handleBodyCommit(newBody);
          }}
          path={`Body.params.parts.${item.path.join('.children.')}`}
          hideChildren
        />
      </div>
    );
  }, [bodyDraft, eid, handleBodyChange, handleBodyCommit]);

  const removePart = useCallback((item: PartItem) => {
    const compositeBody = bodyDraft?.type === 'composite' ? (bodyDraft as CompositeBody) : undefined;
    const nextBody = removePartAtPath(compositeBody, item.path);
    if (!nextBody) return;
    handleBodyCommit(nextBody);
  }, [bodyDraft, handleBodyCommit]);

  if (!bodyDraft) {
    return (
      <Text style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }}>
        Body component missing or failed to load.
      </Text>
    );
  }

  return (
    <>
      <GenericFieldRenderer
        metadata={BodyOverviewMetadata}
        value={bodyDraft}
        onChange={handleBodyChange}
        onCommit={handleBodyCommit}
        path="Body"
        parentValue={bodyDraft}
      />

      {bodyDraft.type === 'composite' && (
        <>
          <ItemList<PartItem>
            title="Parts"
            showTitle={false}
            items={partItems}
            itemIcon="cube"
            onItemClick={(item) => selectBodyPart(eid, item.path)}
            emptyText="No parts yet"
            renderPopout={renderPartPopout}
            renderPopoutHeader={renderPartPopoutHeader}
            onRemove={removePart}
            removeTooltip="Delete part"
          />
          {hasInteriorField && (
            <div style={{ marginTop: EDITOR_SPACING.md }}>
              <GenericFieldRenderer
                metadata={hasInteriorField}
                value={bodyDraft?.params?.hasInterior}
                onChange={(value) => {
                  const next = cloneValue(bodyDraft);
                  next.params = next.params || {};
                  next.params.hasInterior = value;
                  handleBodyChange(next);
                }}
                onCommit={(value) => {
                  const next = cloneValue(bodyDraft);
                  next.params = next.params || {};
                  next.params.hasInterior = value;
                  handleBodyCommit(next);
                }}
                path="Body.params.hasInterior"
                parentValue={bodyDraft?.params}
              />
            </div>
          )}
        </>
      )}
      <InspectorMetadataModal
        open={isPopoutMetadataOpen}
        mode="part"
        eid={eid}
        partPath={popoutMetadataPath ?? undefined}
        onClose={() => setIsPopoutMetadataOpen(false)}
      />
    </>
  );
}
