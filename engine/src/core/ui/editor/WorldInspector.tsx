import React, { useEffect, useMemo, useState } from 'react';
import { Typography, message } from 'antd';
import { WorldDefinition } from '../../worldSchema';
import { serializeWorld } from '../../serializeWorld';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { worldSchemaRegistry, type WorldSchema } from '../../editor/schema/worldSchemas';
import { ReinitializeWorldCommand } from '../../editor/commands/ReinitializeWorldCommand';
import { buildSchemaSurfaceItems } from './components/SchemaSurfaceEditor';
import { VirtualizedInspectorList } from './components/VirtualizedInspectorList';

const { Text } = Typography;
export function WorldInspector() {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand } = useEditor();
  const [dimensionSchema, setDimensionSchema] = useState<WorldSchema | null>(
    worldSchemaRegistry.get('dimensions') ?? null,
  );
  const [worldData, setWorldData] = useState<WorldDefinition>({ dimensions: [] });

  useEffect(() => {
    const refreshSchemas = () => setDimensionSchema(worldSchemaRegistry.get('dimensions') ?? null);
    refreshSchemas();
    const unsubscribe = worldSchemaRegistry.subscribe(refreshSchemas);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const definition = serializeWorld(ctx, {
      includeEntities: false,
      includeRuntime: true,
    });

    setWorldData({
      dimensions: [],
      ...definition,
    });
  }, [ctx]);

  const dimensionFields = useMemo(() => {
    const schema = dimensionSchema;
    if (!schema) return null;
    const dimensionsField = schema.fields.dimensions;
    if (!dimensionsField || dimensionsField.type !== 'array' || !dimensionsField.itemType) {
      return null;
    }
    if (dimensionsField.itemType.type !== 'object' || !dimensionsField.itemType.fields) {
      return null;
    }
    return dimensionsField.itemType.fields;
  }, [dimensionSchema]);

  if (!dimensionSchema || !dimensionFields) {
    return (
      <Text style={{ color: '#999', fontSize: '12px' }}>
        No dimension schema registered
      </Text>
    );
  }

  const currentDimension = worldData.dimensions?.[0] ?? {};
  const visibleFields = Object.fromEntries(
    Object.entries(dimensionFields).filter(([fieldName]) => fieldName !== 'name')
  );

  const updateDimension = (fieldName: string, value: any, commit = false) => {
    setWorldData((prev) => {
      const nextWorld = {
        ...prev,
        dimensions: [
          {
            ...(prev.dimensions?.[0] ?? {}),
            [fieldName]: value,
          },
          ...(prev.dimensions?.slice(1) ?? []),
        ],
      } as WorldDefinition;
      if (commit) {
        handleApply(nextWorld);
      }
      return nextWorld;
    });
  };

  const handleApply = (nextWorld?: WorldDefinition) => {
    try {
      const payload = nextWorld ?? worldData;
      const command = new ReinitializeWorldCommand(ctx, payload);
      executeCommand(command);
      message.success('World settings updated');
    } catch (error) {
      console.error('Failed to update world', error);
      message.error('Failed to update world');
    }
  };

  const items = buildSchemaSurfaceItems({
    fields: visibleFields,
    groups: dimensionSchema.groups,
    value: currentDimension as Record<string, any>,
    onFieldChange: updateDimension,
    onFieldCommit: (fieldName, value) => updateDimension(fieldName, value, true),
    pathPrefix: 'dimensions[0]',
  });

  return <VirtualizedInspectorList items={items} />;
}
