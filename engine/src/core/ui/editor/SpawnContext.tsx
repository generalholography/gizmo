/**
 * Spawn Context
 * Manages spawn tool state and pending spawn requests
 * Extracted from EditorContext for better separation of concerns
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ECSContext, getResource, setResource } from '../../ecs';
import { CommandManager, type EditorCommand } from '../../editor/CommandManager';
import { AddEntityCommand } from '../../editor/commands/EntityCommand';
import type { ArchetypeRef } from '../../spawn';

export type SpawnTool = 
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid'
  | 'light' | 'player' | 'npc' | 'camera'
  | 'prefab' | 'asset'
  | null;

export interface SpawnState {
  /** Current spawn tool (if any) - clicking in viewport spawns this entity type */
  spawnTool: SpawnTool;
}

export interface SpawnContextValue {
  // State
  spawnTool: SpawnTool;
  
  // Actions
  setSpawnTool: (tool: SpawnTool, archetype?: ArchetypeRef) => void;
  clearSpawnTool: () => void;
}

const SpawnContext = createContext<SpawnContextValue | null>(null);

export interface SpawnProviderProps {
  children: React.ReactNode;
  ctx: ECSContext;
  commandManager: CommandManager;
  onEntitySpawned?: (eid: number) => void;
}

const defaultSpawnState: SpawnState = {
  spawnTool: null,
};

/**
 * SpawnProvider - Manages spawn tool state and handles spawn requests
 */
export function SpawnProvider({ children, ctx, commandManager, onEntitySpawned }: SpawnProviderProps) {
  const [state, setState] = useState<SpawnState>(defaultSpawnState);
  const lastSpawnTimestampRef = useRef<number>(0);

  // Sync spawn tool to ECS resources for raycast spawn handling
  useEffect(() => {
    setResource(ctx, 'editorSpawnTool', state.spawnTool);
  }, [state.spawnTool, ctx]);

  // Poll ECS for pending spawn requests from viewport clicks
  useEffect(() => {
    let frameId: number;

    const pollSpawnRequests = () => {
      // Check for pending spawn requests
      const pendingSpawn = getResource<any>(ctx, 'pendingSpawnRequest', true);
      if (pendingSpawn && pendingSpawn.timestamp > lastSpawnTimestampRef.current) {
        lastSpawnTimestampRef.current = pendingSpawn.timestamp;

        // Execute spawn as command for undo/redo support
        const command = new AddEntityCommand(
          ctx,
          pendingSpawn.archetype,
          { Transform: pendingSpawn.position },
          pendingSpawn.archetype
        );
        commandManager.execute(command);

        // Select the newly spawned entity
        const spawnedEid = command.getSpawnedEntityId();
        if (spawnedEid !== null && onEntitySpawned) {
          onEntitySpawned(spawnedEid);
        }
      }

      // Check for pending body part add requests (shift+spawn on composite body)
      const pendingBodyPartAdd = getResource<any>(ctx, 'pendingBodyPartAddRequest', true);
      if (pendingBodyPartAdd && pendingBodyPartAdd.timestamp > lastSpawnTimestampRef.current) {
        lastSpawnTimestampRef.current = pendingBodyPartAdd.timestamp;

        // Import and execute AddBodyPartCommand
        import('../../editor/commands/AddBodyPartCommand').then(({ AddBodyPartCommand }) => {
          const command = new AddBodyPartCommand(
            ctx,
            pendingBodyPartAdd.entityId,
            pendingBodyPartAdd.archetype,
            pendingBodyPartAdd.localPosition
          );
          commandManager.execute(command);
        });
      }

      frameId = requestAnimationFrame(pollSpawnRequests);
    };

    pollSpawnRequests();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [ctx, commandManager, onEntitySpawned]);

  // Spawn tool handlers
  const setSpawnTool = useCallback((spawnTool: SpawnTool, archetype?: ArchetypeRef) => {
    setState(prev => ({ ...prev, spawnTool }));
    // Also set archetype in ECS for raycast spawn handling
    if (archetype) {
      setResource(ctx, 'editorSpawnArchetype', archetype);
    }
  }, [ctx]);

  const clearSpawnTool = useCallback(() => {
    setState(prev => ({ ...prev, spawnTool: null }));
    setResource(ctx, 'editorSpawnTool', null);
    setResource(ctx, 'editorSpawnArchetype', null);
  }, [ctx]);

  const value: SpawnContextValue = {
    spawnTool: state.spawnTool,
    setSpawnTool,
    clearSpawnTool,
  };

  return (
    <SpawnContext.Provider value={value}>
      {children}
    </SpawnContext.Provider>
  );
}

/**
 * Hook to access spawn context
 */
export function useSpawn(): SpawnContextValue {
  const context = useContext(SpawnContext);
  if (!context) {
    throw new Error('useSpawn must be used within SpawnProvider');
  }
  return context;
}
