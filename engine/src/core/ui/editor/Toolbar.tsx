/**
 * Editor Toolbar
 * Main toolbar with play mode toggle and editor controls
 * Transform tools moved to BottomBar
 */

import React from 'react';
import { Button, Space, Divider, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { EditorIcon } from './styles/EditorIcon';
import { useEditor } from './EditorContext';

export function Toolbar() {
  const {
    isPlaying,
    enterPlayMode,
    exitPlayMode,
    transformSpace,
    toggleTransformSpace,
    snapping,
    toggleSnapping,
    undo,
    redo,
    canUndo,
    canRedo,
    saveWorld,
    isSaving,
    lastSaved,
    openPlayMode,
    sessionConfig,
  } = useEditor();

  const playMenuItems: MenuProps['items'] = [
    {
      key: 'game',
      label: 'Play in new tab (Game mode)',
      onClick: () => openPlayMode?.('game'),
    },
    {
      key: 'display',
      label: 'Play in new tab (Display mode)',
      onClick: () => openPlayMode?.('display'),
    },
  ];
  
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.85)',
      padding: '8px 16px',
      borderRadius: '8px',
      pointerEvents: 'auto',
      zIndex: 100,
    }}>
      <Space split={<Divider type="vertical" style={{ background: '#666' }} />}>
        {/* Transform Options */}
        <Space>
          <Tooltip title={`Transform Space: ${transformSpace === 'world' ? 'World' : 'Local'} (X)`}>
            <Button
              type={transformSpace === 'local' ? 'primary' : 'default'}
              icon={<EditorIcon name={transformSpace === 'world' ? 'world' : 'local'} size={18} />}
              onClick={toggleTransformSpace}
              size="middle"
            />
          </Tooltip>
          <Tooltip title="Snapping (Shift)">
            <Button
              type={snapping ? 'primary' : 'default'}
              icon={<EditorIcon name="snap" size={18} />}
              onClick={toggleSnapping}
              size="middle"
            />
          </Tooltip>
        </Space>
        
        {/* Undo/Redo */}
        <Space>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              icon={<EditorIcon name="undo" size={18} />}
              onClick={undo}
              disabled={!canUndo}
              size="middle"
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)">
            <Button
              icon={<EditorIcon name="redo" size={18} />}
              onClick={redo}
              disabled={!canRedo}
              size="middle"
            />
          </Tooltip>
        </Space>
        
        {/* Save World (Milestone 1.2 - temporary for testing) */}
        {saveWorld && (
          <Tooltip title={lastSaved ? `Last saved: ${new Date(lastSaved).toLocaleTimeString()}` : 'Save to Cloud Storage (Ctrl+S)'}>
            <Button
              icon={<EditorIcon name="save" size={18} />}
              onClick={saveWorld}
              disabled={isSaving}
              loading={isSaving}
              size="middle"
              type={lastSaved && Date.now() - lastSaved < 5000 ? 'primary' : 'default'}
            >
              {isSaving ? 'Saving...' : lastSaved ? 'Saved' : 'Save'}
            </Button>
          </Tooltip>
        )}
        
        {/* Play Mode Toggle */}
        {sessionConfig.capabilities.showPlayControls ? (
          <Tooltip title={isPlaying ? 'Stop Playing (Ctrl+P)' : 'Play (Ctrl+P)'}>
            {openPlayMode ? (
              <Space.Compact>
                <Button
                  type={isPlaying ? 'primary' : 'default'}
                  danger={isPlaying}
                  icon={<EditorIcon name={isPlaying ? 'pause' : 'play'} size={18} />}
                  onClick={isPlaying ? exitPlayMode : enterPlayMode}
                  size="large"
                  style={{ fontWeight: 'bold' }}
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </Button>
                <Dropdown menu={{ items: playMenuItems }} disabled={isPlaying}>
                  <Button
                    type={isPlaying ? 'primary' : 'default'}
                    danger={isPlaying}
                    size="large"
                    icon={<DownOutlined />}
                  />
                </Dropdown>
              </Space.Compact>
            ) : (
              <Button
                type={isPlaying ? 'primary' : 'default'}
                danger={isPlaying}
                icon={<EditorIcon name={isPlaying ? 'pause' : 'play'} size={18} />}
                onClick={isPlaying ? exitPlayMode : enterPlayMode}
                size="large"
                style={{ fontWeight: 'bold' }}
              >
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
            )}
          </Tooltip>
        ) : null}
      </Space>
    </div>
  );
}
