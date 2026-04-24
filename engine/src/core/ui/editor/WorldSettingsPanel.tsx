/**
 * World Settings Panel
 * Edit world metadata, dimensions, and global settings
 */

import React, { useState, useEffect } from 'react';
import { Typography, Input, InputNumber, Divider, Button, Space, message, ColorPicker } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { getResource, setResource } from '../../ecs';
import { WorldMetadata } from '../../schema';
import { ModifyWorldSettingsCommand } from '../../editor/commands/WorldSettingsCommand';
import type { Color } from 'antd/es/color-picker';

const { Text, Title } = Typography;
const { TextArea } = Input;

export function WorldSettingsPanel() {
  const api = useAPI();
  const { executeCommand } = useEditor();
  const ctx = api.ecsWorld;

  // Metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // Dimension state (using first dimension for now)
  const [gravity, setGravity] = useState(-20);
  const [skyColor, setSkyColor] = useState('#87CEEB');

  const [loading, setLoading] = useState(false);

  // Load current world settings
  useEffect(() => {
    const metadata = getResource<WorldMetadata>(ctx, 'metadata', true);
    if (metadata) {
      setTitle(metadata.title || '');
      setDescription(metadata.description || '');
      setTags(metadata.tags?.join(', ') || '');

      if (metadata.dimensions && metadata.dimensions.length > 0) {
        const dim = metadata.dimensions[0];
        setGravity(dim.gravity ?? -20);
        if (dim.sky?.color) {
          setSkyColor(typeof dim.sky.color === 'string' ? dim.sky.color : '#87CEEB');
        }
      }
    }
  }, [ctx]);

  const handleApply = () => {
    setLoading(true);
    try {
      // Capture current settings
      const oldMetadata = getResource<WorldMetadata>(ctx, 'metadata', true);
      
      // Create new metadata
      const newMetadata: WorldMetadata = {
        ...oldMetadata,
        title,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        dimensions: [
          {
            name: 'base',
            gravity,
            useDayNightCycle: oldMetadata?.dimensions?.[0]?.useDayNightCycle ?? false,
            sky: {
              color: skyColor,
              sun: oldMetadata?.dimensions?.[0]?.sky?.sun
            },
            chunks: oldMetadata?.dimensions?.[0]?.chunks ?? []
          }
        ]
      };

      // Create and execute command
      const command = new ModifyWorldSettingsCommand(
        ctx,
        oldMetadata || {},
        newMetadata
      );

      executeCommand(command);
      message.success('World settings updated');
    } catch (error) {
      console.error('Failed to update world settings:', error);
      message.error('Failed to update world settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '400px',
      maxHeight: 'calc(100vh - 100px)',
      background: 'rgba(0, 0, 0, 0.9)',
      borderRadius: '8px',
      padding: '20px',
      pointerEvents: 'auto',
      overflowY: 'auto',
    }}>
      <Title level={4} style={{ color: '#fff', marginTop: 0 }}>
        World Settings
      </Title>

      {/* Metadata Section */}
      <Divider style={{ margin: '16px 0', background: '#444' }} />
      <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>
        Metadata
      </Text>

      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Title
        </Text>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="World Title"
          size="small"
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Description
        </Text>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="World description..."
          rows={3}
          size="small"
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Tags (comma-separated)
        </Text>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="adventure, puzzle, multiplayer"
          size="small"
        />
      </div>

      {/* Dimensions Section */}
      <Divider style={{ margin: '16px 0', background: '#444' }} />
      <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>
        Dimensions
      </Text>

      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Gravity
        </Text>
        <InputNumber
          value={gravity}
          onChange={(val) => setGravity(val ?? -20)}
          style={{ width: '100%' }}
          size="small"
          step={1}
          placeholder="-20"
        />
        <Text style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '4px' }}>
          Negative values pull down, positive values push up
        </Text>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Sky Color
        </Text>
        <ColorPicker
          value={skyColor}
          onChange={(color: Color) => setSkyColor(color.toHexString())}
          showText
          size="small"
          style={{ width: '100%' }}
        />
      </div>

      {/* Apply Button */}
      <Divider style={{ margin: '16px 0', background: '#444' }} />
      <Button
        type="primary"
        onClick={handleApply}
        loading={loading}
        block
      >
        Apply Settings
      </Button>

      <Text style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '8px' }}>
        Changes are applied in real-time and can be undone
      </Text>
    </div>
  );
}
