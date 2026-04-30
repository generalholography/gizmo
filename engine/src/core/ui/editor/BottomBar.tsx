/**
 * BottomBar
 * Bottom toolbar with transform tools and spawn tools
 * Tools work as selection - clicking in viewport performs the selected action
 */

import React from 'react';
import { IconInputSpark } from '@tabler/icons-react';
import { EditorIconName } from './styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_RADIUS } from './styles/tokens';
import { useEditor } from './EditorContext';
import type { EditorTool, SpawnTool } from '../../editor/EditorState';
import { ToolButton, ToolOption } from './components/ToolButton';

/** Transform tools configuration */
const TRANSFORM_TOOLS: ToolOption<EditorTool>[] = [
  { tool: 'select', icon: 'select', label: 'Select', shortcut: 'V' },
  { tool: 'translate', icon: 'translate', label: 'Translate', shortcut: 'J' },
  { tool: 'rotate', icon: 'rotate', label: 'Rotate', shortcut: 'K' },
  { tool: 'scale', icon: 'scale', label: 'Scale', shortcut: 'L' },
];

/** Configuration for spawn tools with archetype mapping */
interface SpawnToolConfig extends ToolOption<NonNullable<SpawnTool>> {
  archetype?: string;
}

/**
 * Primitive spawn tools configuration
 * Uses registered archetypes from the engine.
 */
const PRIMITIVE_TOOLS: SpawnToolConfig[] = [
  { tool: 'box', icon: 'box', label: 'Box', archetype: 'cube' },
  { tool: 'sphere', icon: 'sphere', label: 'Sphere', archetype: 'sphere' },
  { tool: 'cylinder', icon: 'cylinder', label: 'Cylinder', archetype: 'cylinder' },
  { tool: 'cone', icon: 'cone', label: 'Cone', archetype: 'cone' },
  { tool: 'pyramid', icon: 'pyramid', label: 'Pyramid', archetype: 'pyramid' },
  { tool: 'prefab', icon: 'composite', label: 'Prefab' },
  { tool: 'asset', icon: 'gltf', label: 'Asset' },
];

/**
 * Lighting/camera spawn tools configuration
 */
const SCENE_TOOLS: SpawnToolConfig[] = [
  { tool: 'light', icon: 'light', label: 'Light', archetype: 'pointLight' },
  { tool: 'camera', icon: 'camera', label: 'Camera', archetype: 'sceneCamera' },
];

/**
 * Entity spawn tools configuration
 * Uses registered archetypes from the engine.
 */
const ENTITY_TOOLS: SpawnToolConfig[] = [
  { tool: 'player', icon: 'user', label: 'Player', archetype: 'player' },
  { tool: 'npc', icon: 'users', label: 'NPC', archetype: 'enemy' },
];

/** All spawn tools for lookup */
const ALL_SPAWN_TOOLS = [...PRIMITIVE_TOOLS, ...SCENE_TOOLS, ...ENTITY_TOOLS];

/**
 * Get the archetype to spawn for a given spawn tool
 */
export function getSpawnToolArchetype(tool: SpawnTool): string | null {
  if (!tool) return null;
  const config = ALL_SPAWN_TOOLS.find(t => t.tool === tool);
  return config?.archetype || null;
}

export function BottomBar() {
  const { tool, setTool, spawnTool, setSpawnTool, clearSpawnTool, requestComposer, composerOpen, taskStore, sessionConfig } = useEditor();
  const showComposerButton = Boolean(requestComposer && taskStore);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    background: EDITOR_COLORS.panelSecondary,
    borderRadius: EDITOR_RADIUS.lg,
    padding: `${EDITOR_SPACING.sm}px ${EDITOR_SPACING.md}px`,
    pointerEvents: 'auto',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: EDITOR_SPACING.sm,
  };

  // Handler for transform tool selection
  const handleTransformSelect = (selectedTool: EditorTool) => {
    setTool(selectedTool);
  };

  // Handler for spawn tool selection (sets both tool and archetype)
  const handleSpawnSelect = (toolOptions: SpawnToolConfig[]) => (selectedTool: NonNullable<SpawnTool>) => {
    // Toggle off if clicking same tool
    if (spawnTool === selectedTool) {
      clearSpawnTool();
      return;
    }
    
    const config = toolOptions.find(t => t.tool === selectedTool);
    if (config) {
      setSpawnTool(selectedTool, config.archetype);
    }
  };

  // Check if any spawn tool from a group is selected
  const isSpawnGroupActive = (tools: SpawnToolConfig[]) => {
    return spawnTool !== null && tools.some(t => t.tool === spawnTool);
  };

  // Get the selected tool from a group (or first if none)
  const getSelectedFromGroup = (tools: SpawnToolConfig[]): NonNullable<SpawnTool> | null => {
    const active = tools.find(t => t.tool === spawnTool);
    return active?.tool || null;
  };

  return (
    <div style={containerStyle}>
      {/* Transform Tools - Split button with all transform tools */}
      <ToolButton<EditorTool>
        options={TRANSFORM_TOOLS}
        selectedTool={tool}
        onSelect={handleTransformSelect}
        isActive={spawnTool === null}
        tooltip="Transform Tools"
      />

      {sessionConfig.capabilities.showSpawnTools ? (
        <>
          <ToolButton<NonNullable<SpawnTool>>
            options={PRIMITIVE_TOOLS}
            selectedTool={getSelectedFromGroup(PRIMITIVE_TOOLS) || 'box'}
            onSelect={handleSpawnSelect(PRIMITIVE_TOOLS)}
            isActive={isSpawnGroupActive(PRIMITIVE_TOOLS)}
            tooltip="Primitive Shapes - Click to place"
          />

          <ToolButton<NonNullable<SpawnTool>>
            options={SCENE_TOOLS}
            selectedTool={getSelectedFromGroup(SCENE_TOOLS) || 'light'}
            onSelect={handleSpawnSelect(SCENE_TOOLS)}
            isActive={isSpawnGroupActive(SCENE_TOOLS)}
            tooltip="Scene Objects - Click to place"
          />

          <ToolButton<NonNullable<SpawnTool>>
            options={ENTITY_TOOLS}
            selectedTool={getSelectedFromGroup(ENTITY_TOOLS) || 'player'}
            onSelect={handleSpawnSelect(ENTITY_TOOLS)}
            isActive={isSpawnGroupActive(ENTITY_TOOLS)}
            tooltip="Entities - Click to place"
          />
        </>
      ) : null}

      {showComposerButton && (
        <button
          type="button"
          onClick={() => requestComposer?.()}
          style={{
            background: composerOpen ? EDITOR_COLORS.primary : 'rgba(255,255,255,0.08)',
            color: composerOpen ? '#fff' : '#d9d9d9',
            border: 'none',
            borderRadius: EDITOR_RADIUS.md,
            padding: `${EDITOR_SPACING.xs}px ${EDITOR_SPACING.sm}px`,
            fontWeight: 600,
            cursor: 'pointer',
            pointerEvents: 'auto',
            boxShadow: composerOpen ? '0 0 0 2px rgba(255,255,255,0.12)' : 'none',
            transition: 'background 120ms ease, color 120ms ease, box-shadow 120ms ease',
          }}
        >
          <IconInputSpark size={18} aria-label="AI Edit" />
        </button>
      )}
    </div>
  );
}
