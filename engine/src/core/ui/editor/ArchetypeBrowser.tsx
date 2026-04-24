/**
 * Archetype Browser
 * Browse and spawn entities from registered archetypes
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Typography, List, Empty, message, Collapse } from 'antd';
import type { CollapseProps } from 'antd';
import { AppstoreOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { getModule } from '../../ecs';
import { SearchInput } from './components/SearchInput';

const { Text, Title } = Typography;

interface ArchetypeInfo {
  name: string;
  source: 'engine' | 'world';
}

export function ArchetypeBrowser() {
  const api = useAPI();
  const { setSpawnTool } = useEditor();
  const ctx = api.ecsWorld;

  const [archetypes, setArchetypes] = useState<ArchetypeInfo[]>([]);
  const [filteredArchetypes, setFilteredArchetypes] = useState<ArchetypeInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Load archetypes
  useEffect(() => {
    try {
      const archetypeModule = getModule(ctx, 'archetype');
      const runtimeDefs = archetypeModule.getRuntimeDefinitions();
      const builtInDefs = archetypeModule.getBuiltInDefinitions();

      const archetypeList: ArchetypeInfo[] = [
        ...builtInDefs.map(({ name }) => ({
          name,
          source: 'engine' as const,
        })),
        ...runtimeDefs.map(({ name }) => ({
          name,
          source: 'world' as const,
        }))
      ].sort((a, b) => a.name.localeCompare(b.name));

      setArchetypes(archetypeList);
      setFilteredArchetypes(archetypeList);
    } catch (error) {
      console.error('Failed to load archetypes:', error);
    }
  }, [ctx]);

  // Filter archetypes based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredArchetypes(archetypes);
    } else {
      const filtered = archetypes.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredArchetypes(filtered);
    }
  }, [searchTerm, archetypes]);

  const handleSelect = (archetype: ArchetypeInfo) => {
    try {
      setSpawnTool('prefab', archetype.name);
      message.success(`Selected ${archetype.name}. Click in the viewport to place.`);
    } catch (error) {
      console.error('Failed to select archetype:', error);
      message.error('Failed to select prefab');
    }
  };

  const groupedArchetypes = useMemo(() => {
    return filteredArchetypes.reduce(
      (groups, archetype) => {
        groups[archetype.source].push(archetype);
        return groups;
      },
      { engine: [] as ArchetypeInfo[], world: [] as ArchetypeInfo[] }
    );
  }, [filteredArchetypes]);

  const renderArchetypeList = (items: ArchetypeInfo[]) => {
    if (items.length === 0) {
      return (
        <Empty
          description="No archetypes found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ color: '#999' }}
        />
      );
    }

    return (
      <List
        dataSource={items}
        renderItem={(archetype: ArchetypeInfo) => (
          <List.Item
            key={archetype.name}
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              marginBottom: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
            onClick={() => handleSelect(archetype)}
          >
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {archetype.source === 'engine'
                    ? <GlobalOutlined style={{ color: '#69c0ff' }} />
                    : <AppstoreOutlined style={{ color: '#95de64' }} />}
                  <Text style={{ color: '#fff', fontSize: '14px' }}>
                    {archetype.name}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const collapseItems: CollapseProps['items'] = [
    groupedArchetypes.world.length > 0 && {
      key: 'world',
      label: 'World prefabs',
      children: renderArchetypeList(groupedArchetypes.world),
    },
    groupedArchetypes.engine.length > 0 && {
      key: 'engine',
      label: 'Engine prefabs',
      children: renderArchetypeList(groupedArchetypes.engine),
    },
  ].filter(Boolean) as CollapseProps['items'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <Title level={5} style={{ color: '#fff', margin: 0 }}>
        Prefab Browser
      </Title>

      <SearchInput
        placeholder="Search prefabs..."
        value={searchTerm}
        onChange={(value) => setSearchTerm(value)}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {collapseItems.length > 0 ? (
          <Collapse
            ghost
            defaultActiveKey={collapseItems.map((item) => String(item.key))}
            items={collapseItems}
            style={{ background: 'transparent' }}
          />
        ) : (
          <Empty
            description="No archetypes found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ color: '#999' }}
          />
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #444' }}>
        <Text style={{ color: '#666', fontSize: '11px' }}>
          {filteredArchetypes.length} prefab{filteredArchetypes.length !== 1 ? 's' : ''} available
        </Text>
      </div>
    </div>
  );
}
