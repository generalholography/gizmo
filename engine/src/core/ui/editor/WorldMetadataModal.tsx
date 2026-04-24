import React, { useEffect, useState } from 'react';
import { Modal, Typography, Divider, message } from 'antd';
import { WorldDefinition } from '../../worldSchema';
import { serializeWorld } from '../../serializeWorld';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { WorldMetadataSchema } from '../../editor/schema/worldSchemas';
import { ReinitializeWorldCommand } from '../../editor/commands/ReinitializeWorldCommand';
import { EDITOR_COLORS } from './styles/tokens';
import { SchemaSurfaceEditor } from './components/SchemaSurfaceEditor';

const { Text } = Typography;

interface WorldMetadataModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorldMetadataModal({ open, onClose }: WorldMetadataModalProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand } = useEditor();
  const [worldData, setWorldData] = useState<WorldDefinition>({ dimensions: [] });

  useEffect(() => {
    if (!open) return;
    const definition = serializeWorld(ctx, {
      includeEntities: false,
      includeRuntime: true,
    });
    setWorldData({
      dimensions: [],
      ...definition,
    });
  }, [ctx, open]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setWorldData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleFieldCommit = (fieldName: string, value: any) => {
    setWorldData((prev) => {
      const nextWorld = {
        ...prev,
        [fieldName]: value,
      } as WorldDefinition;
      handleApply(nextWorld);
      return nextWorld;
    });
  };

  const handleApply = (nextWorld?: WorldDefinition) => {
    try {
      const payload = nextWorld ?? worldData;
      const command = new ReinitializeWorldCommand(ctx, payload);
      executeCommand(command);
      message.success('World metadata updated');
    } catch (error) {
      console.error('Failed to update world metadata', error);
      message.error('Failed to update world metadata');
    }
  };

  return (
    <Modal
      title="World Metadata"
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
      <SchemaSurfaceEditor
        fields={WorldMetadataSchema.fields}
        groups={WorldMetadataSchema.groups}
        value={worldData as Record<string, any>}
        onFieldChange={handleFieldChange}
        onFieldCommit={handleFieldCommit}
        pathPrefix="world"
      />
    </Modal>
  );
}
