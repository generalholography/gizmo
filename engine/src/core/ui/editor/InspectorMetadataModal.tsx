import React, { useEffect, useRef, useState } from 'react';
import { Modal, Typography, Divider, message } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { getEntityBundle } from '../../despawn';
import { ModifyComponentCommand } from '../../editor/commands/ModifyComponentCommand';
import { GenericFieldRenderer } from './fieldRenderers/GenericFieldRenderer';
import { serializeWorld } from '../../serializeWorld';
import { worldSchemaRegistry } from '../../editor/schema/worldSchemas';
import { ReinitializeWorldCommand } from '../../editor/commands/ReinitializeWorldCommand';
import type { WorldDefinition } from '../../worldSchema';
import type { FieldMetadata } from '../../editor/schema/FieldMetadata';
import { EDITOR_COLORS } from './styles/tokens';
import { getPartAtPath, replacePartAtPath, type CompositeBody } from '../../editor/utils/bodyParts';
import { ComponentInspector } from './ComponentInspector';
import { SchemaSurfaceEditor } from './components/SchemaSurfaceEditor';

const { Text } = Typography;

type MetadataMode = 'entity' | 'dimension' | 'part';

interface InspectorMetadataModalProps {
  open: boolean;
  mode: MetadataMode;
  eid?: number;
  partPath?: number[];
  entityComponents?: Record<string, any>;
  onClose: () => void;
  onDimensionNameChange?: (name: string) => void;
}

type PartMetadataState = {
  name?: string;
  tag?: string;
};

const EMPTY_PART_METADATA: PartMetadataState = {
  name: '',
  tag: '',
};

const PartNameField: FieldMetadata = {
  name: 'name',
  type: 'string',
  required: false,
  label: 'Name',
};

const PartTagField: FieldMetadata = {
  name: 'tag',
  type: 'string',
  required: false,
  label: 'Tag',
};

export function InspectorMetadataModal({
  open,
  mode,
  eid,
  partPath,
  entityComponents = {},
  onClose,
  onDimensionNameChange,
}: InspectorMetadataModalProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand, selectBodyPart } = useEditor();
  const [partMetadata, setPartMetadata] = useState<PartMetadataState>(EMPTY_PART_METADATA);
  const [worldData, setWorldData] = useState<WorldDefinition>({ dimensions: [] });
  const [dimensionNameField, setDimensionNameField] = useState<FieldMetadata | null>(null);
  const committedPartMetadataRef = useRef<PartMetadataState>(EMPTY_PART_METADATA);

  useEffect(() => {
    const refreshDimensionField = () => {
      const dimensionSchema = worldSchemaRegistry.get('dimensions');
      const dimensionsField = dimensionSchema?.fields?.dimensions;
      if (!dimensionsField || dimensionsField.type !== 'array' || !dimensionsField.itemType) {
        setDimensionNameField(null);
        return;
      }
      if (dimensionsField.itemType.type !== 'object' || !dimensionsField.itemType.fields) {
        setDimensionNameField(null);
        return;
      }
      setDimensionNameField(dimensionsField.itemType.fields.name ?? null);
    };

    refreshDimensionField();
    return worldSchemaRegistry.subscribe(refreshDimensionField);
  }, []);

  useEffect(() => {
    if (!open) return;

    if (mode === 'entity') {
      return;
    }

    if (mode === 'part') {
      if (eid === undefined || eid === null || !partPath || partPath.length === 0) return;

      const bundle = getEntityBundle(ctx, eid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });
      const body = bundle.Body?.type === 'composite' ? (bundle.Body as CompositeBody) : undefined;
      const part = getPartAtPath(body, partPath) as any;
      const nextState: PartMetadataState = {
        name: typeof part?.name === 'string' ? part.name : '',
        tag: typeof part?.tag === 'string' ? part.tag : '',
      };
      setPartMetadata(nextState);
      committedPartMetadataRef.current = nextState;
      return;
    }

    const definition = serializeWorld(ctx, {
      includeEntities: false,
      includeRuntime: true,
    });
    setWorldData({
      dimensions: [],
      ...definition,
    });
  }, [ctx, eid, mode, open, partPath]);

  const handleDimensionNameChange = (value: any, commit = false) => {
    setWorldData((prev) => {
      const safeName = typeof value === 'string' ? value : '';
      const nextWorld = {
        ...prev,
        dimensions: [
          {
            ...(prev.dimensions?.[0] ?? {}),
            name: safeName,
          },
          ...(prev.dimensions?.slice(1) ?? []),
        ],
      } as WorldDefinition;

      if (commit) {
        try {
          const command = new ReinitializeWorldCommand(ctx, nextWorld);
          executeCommand(command);
          onDimensionNameChange?.(safeName.trim() || 'Unnamed dimension');
        } catch (error) {
          console.error('Failed to update dimension metadata', error);
          message.error('Failed to update dimension metadata');
        }
      }

      return nextWorld;
    });
  };

  const applyPartMetadata = (nextMetadata: PartMetadataState): boolean => {
    if (eid === undefined || eid === null || !partPath || partPath.length === 0) return false;
    try {
      const previousBundle = getEntityBundle(ctx, eid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });
      const previousBody = previousBundle?.Body;
      const compositeBody = previousBody?.type === 'composite' ? (JSON.parse(JSON.stringify(previousBody)) as CompositeBody) : undefined;
      if (!compositeBody) return false;

      const currentPart = getPartAtPath(compositeBody, partPath) as any;
      if (!currentPart) return false;

      const updatedPart = {
        ...currentPart,
        name: nextMetadata.name || undefined,
        tag: nextMetadata.tag || undefined,
      };
      const updatedBody = replacePartAtPath(compositeBody, partPath, updatedPart);
      if (!updatedBody) return false;

      const command = new ModifyComponentCommand(
        ctx,
        api,
        eid,
        'Body',
        updatedBody,
        true,
        {
          previousBundle,
          previousComponentData: previousBody,
        },
      );
      executeCommand(command);
      const currentEid = (command as any).getCurrentEntityId?.() ?? eid;
      selectBodyPart(currentEid, partPath);
      return true;
    } catch (error) {
      console.error('Failed to update part metadata', error);
      message.error('Failed to update part metadata');
      return false;
    }
  };

  const handlePartFieldChange = (fieldName: keyof PartMetadataState, value: any) => {
    setPartMetadata((prev) => ({
      ...prev,
      [fieldName]: typeof value === 'string' ? value : '',
    }));
  };

  const handlePartFieldCommit = (fieldName: keyof PartMetadataState, value: any) => {
    let nextMetadata: PartMetadataState | null = null;
    setPartMetadata((prev) => {
      nextMetadata = {
        ...prev,
        [fieldName]: typeof value === 'string' ? value : '',
      };
      return nextMetadata!;
    });

    if (!nextMetadata) return;
    const applied = applyPartMetadata(nextMetadata);
    if (applied) {
      committedPartMetadataRef.current = nextMetadata;
    }
  };

  const currentDimension = worldData.dimensions?.[0] ?? {};

  return (
    <Modal
      title={mode === 'entity' ? 'Entity Metadata' : mode === 'part' ? 'Part Metadata' : 'Dimension Metadata'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <div style={{ paddingTop: 4 }}>
        <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: 12 }}>
          Changes apply immediately.
        </Text>
      </div>
      <Divider style={{ margin: '12px 0' }} />

      {mode === 'entity' ? (
        eid !== undefined && eid !== null ? (
          <ComponentInspector
            eid={eid}
            components={entityComponents}
            activeTab="design"
            placement="metadata"
            emptyState={(
              <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: 12 }}>
                No entity metadata components registered.
              </Text>
            )}
          />
        ) : null
      ) : mode === 'part' ? (
        <>
          <GenericFieldRenderer
            metadata={PartNameField}
            value={partMetadata.name}
            onChange={(value) => handlePartFieldChange('name', value)}
            onCommit={(value) => handlePartFieldCommit('name', value)}
            path="Body.params.parts.metadata.name"
            parentValue={partMetadata}
          />
          <GenericFieldRenderer
            metadata={PartTagField}
            value={partMetadata.tag}
            onChange={(value) => handlePartFieldChange('tag', value)}
            onCommit={(value) => handlePartFieldCommit('tag', value)}
            path="Body.params.parts.metadata.tag"
            parentValue={partMetadata}
          />
        </>
      ) : (
        <>
          {dimensionNameField ? (
            <SchemaSurfaceEditor
              fields={{ name: dimensionNameField }}
              value={currentDimension as Record<string, any>}
              onFieldChange={(fieldName, value) => {
                if (fieldName === 'name') handleDimensionNameChange(value, false);
              }}
              onFieldCommit={(fieldName, value) => {
                if (fieldName === 'name') handleDimensionNameChange(value, true);
              }}
              pathPrefix="dimensions[0]"
            />
          ) : (
            <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: 12 }}>
              No dimension metadata schema registered.
            </Text>
          )}
        </>
      )}
    </Modal>
  );
}
