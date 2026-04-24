/**
 * Editor Context
 * Provides editor state and actions to all editor components
 * Coordinates SelectionContext and SpawnContext for unified editor state
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { EditorState, EditorTool, EditorMode, SpawnTool, defaultEditorState } from '../../editor/EditorState';
import { CommandManager, type EditorCommand } from '../../editor/CommandManager';
import { PlayModeController } from '../../editor/PlayModeController';
import { ECSContext, getResource, setResource } from '../../ecs';
import type { EngineAPI } from '../../..';
import { eidToStableId } from '../../../utils/stableId';
import { AddEntityCommand, DeleteEntityCommand, DuplicateEntityCommand } from '../../editor/commands/EntityCommand';
import { BulkDeleteCommand } from '../../editor/commands/BulkDeleteCommand';
import { BulkDuplicateCommand } from '../../editor/commands/BulkDuplicateCommand';
import { BulkCommand } from '../../editor/commands/BulkCommand';
import { getEntityBundle, type ArchetypeBundle } from '../../despawn';
import type { ArchetypeRef } from '../../spawn';
import { getPartAtPath, type CompositeBody } from '../../editor/utils/bodyParts';
import {
  cloneSelectionSnapshot,
  normalizeSelectionSnapshot,
  shouldApplyEcsSelection,
  type SelectionSnapshot,
} from '../../editor/utils/selectionSync';
import type { Body, Node } from '../../schema';
import type { BodyPartSelectionAddress, BodyPartSelectionTarget } from '../../systems/editorSelection/proxyTargets';
import { InsertBodyPartCommand } from '../../editor/commands/InsertBodyPartCommand';
import type { TransformState } from '../../editor/commands/BulkTransformCommand';
import type { EditorTaskStore } from './TaskStore';
import { isTextEditingActive } from '../../utils/textEditingGuards';
import { findAssetPrimaryEntity, resolveEditorSessionConfig, type ResolvedEditorSessionConfig } from '../../editor/sessionConfig';

function pathToKey(path: number[]): string {
  return JSON.stringify(path);
}

/** Pending body part transform command data from ECS */
interface PendingBodyPartTransform {
  eid: number;
  address?: BodyPartSelectionAddress;
  path: number[];
  initialTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
  };
  finalTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
  };
  timestamp: number;
}

export interface EditorContextValue {
  // State
  state: EditorState;
  
  // Selection
  selectedEntities: number[];
  selectedPartPaths: number[][] | null | undefined;
  selectEntity: (eid: number | null, multi?: boolean) => void;
  selectBodyPart: (eid: number, partPath: number[], multi?: boolean) => void;
  selectMultiple: (eids: number[]) => void;
  clearSelection: () => void;
  
  // Tools
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  
  // Spawn Tool
  spawnTool: SpawnTool;
  setSpawnTool: (tool: SpawnTool, archetype?: ArchetypeRef) => void;
  clearSpawnTool: () => void;
  
  // Mode
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  
  // Play mode
  isPlaying: boolean;
  enterPlayMode: () => void;
  exitPlayMode: () => void;
  
  // Transform space
  transformSpace: 'world' | 'local';
  toggleTransformSpace: () => void;
  
  // Snapping
  snapping: boolean;
  toggleSnapping: () => void;
  
  // Commands (undo/redo)
  commandManager: CommandManager;
  executeCommand: (command: EditorCommand) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Clipboard + entity utilities
  copySelection: () => boolean;
  cutSelection: () => boolean;
  pasteSelection: () => boolean;
  duplicateSelection: () => boolean;
  deleteSelection: () => boolean;
  
  // Play mode controller
  playModeController: PlayModeController;

  // World persistence (Milestone 1.2)
  saveWorld?: () => Promise<void>;
  isSaving: boolean;
  lastSaved: number | null;
  saveError: Error | null;

  // Optional web-layer hooks
  requestComposer?: () => void;
  openPlayMode?: (mode: 'game' | 'display') => void;
  composerOpen: boolean;

  // Optional task store (editor web app integration)
  taskStore?: EditorTaskStore;
  sessionConfig: ResolvedEditorSessionConfig;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  children: React.ReactNode;
  engine: EngineAPI;
  ctx: ECSContext;
  onRequestComposer?: () => void;
  onSaveWorld?: (worldId: string) => Promise<void>;
  onOpenPlayMode?: (mode: 'game' | 'display') => void;
}

export function EditorProvider({ children, engine, ctx, onRequestComposer, onSaveWorld, onOpenPlayMode }: EditorProviderProps) {
  const [state, setState] = useState<EditorState>(defaultEditorState);
  const [commandManager] = useState(() => getResource<CommandManager>(ctx, 'editorCommandManager', true) ?? new CommandManager());
  const [playModeController] = useState(() => new PlayModeController());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const taskStore = engine.getConfig().taskStore;
  const sessionConfig = useMemo(
    () => resolveEditorSessionConfig(engine.getConfig().editorSessionConfig),
    [engine],
  );

  useEffect(() => {
    setResource(ctx, 'editorCommandManager', commandManager);
  }, [commandManager, ctx]);

  useEffect(() => {
    setResource(ctx, 'editorSessionConfig', sessionConfig);
  }, [ctx, sessionConfig]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setComposerOpen(Boolean(detail));
    };
    window.addEventListener('editor-composer-state', handler);
    return () => window.removeEventListener('editor-composer-state', handler);
  }, []);
  
  // World persistence state (Milestone 1.2)
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);

  type ClipboardContent =
    | { type: 'entity'; bundle: ArchetypeBundle }
    | { type: 'entities'; bundles: ArchetypeBundle[] }
    | { type: 'bodyPart'; part: Node }
    | { type: 'bodyParts'; parts: Node[] };

  const clipboardRef = useRef<ClipboardContent | null>(null);

  const sanitizeBundleForSpawn = useCallback((bundle: ArchetypeBundle): ArchetypeBundle => {
    const sanitized = JSON.parse(JSON.stringify(bundle)) as ArchetypeBundle;
    if ('StableID' in sanitized) {
      delete (sanitized as any).StableID;
    }
    if (sanitized._meta && 'stableId' in sanitized._meta) {
      delete (sanitized._meta as any).stableId;
    }
    return sanitized;
  }, []);
  
  // Refs for selection sync
  const uiSelectionRef = useRef<number | undefined>(undefined);
  const uiBodyPartPathRef = useRef<number[] | null | undefined>(undefined);
  const uiSelectedEntitiesRef = useRef<number[]>([]);
  const uiSelectedPartPathsRef = useRef<number[][] | null>(null);
  const multiSelectModeRef = useRef<boolean>(false); // Track if we're in multi-select mode
  const undoStateRef = useRef<boolean>(false);
  const redoStateRef = useRef<boolean>(false);
  
  // Refs for timestamp tracking (consolidated polling)
  const lastCommandTimestampRef = useRef<number>(0);
  const lastSpawnTimestampRef = useRef<number>(0);
  const lastBodyPartCommandTimestampRef = useRef<number>(0);
  const lastMultiSelectToggleTimestampRef = useRef<number>(0);
  const lastMultiPartToggleTimestampRef = useRef<number>(0);
  const lastBulkTransformTimestampRef = useRef<number>(0);
  const lastBulkBodyPartCommandTimestampRef = useRef<number>(0);

  const executeCommand = useCallback((command: EditorCommand) => {
    commandManager.execute(command);
    setCanUndo(commandManager.canUndo());
    setCanRedo(commandManager.canRedo());
  }, [commandManager]);

  const writeSelectionRefs = useCallback((selection: SelectionSnapshot) => {
    const snapshot = cloneSelectionSnapshot(selection);
    uiSelectionRef.current = snapshot.selectedEntities[0] ?? undefined;
    uiBodyPartPathRef.current = snapshot.selectedPartPaths?.[0];
    uiSelectedEntitiesRef.current = snapshot.selectedEntities;
    uiSelectedPartPathsRef.current = snapshot.selectedPartPaths;
    multiSelectModeRef.current = snapshot.selectedEntities.length > 1 || (snapshot.selectedPartPaths?.length ?? 0) > 1;
  }, []);

  const writePrimarySelectionResources = useCallback((selection: SelectionSnapshot) => {
    const snapshot = cloneSelectionSnapshot(selection);
    setResource(ctx, 'selectedEntity', snapshot.selectedEntities[0] ?? undefined);
    setResource(ctx, 'selectedEntities', snapshot.selectedEntities);
    setResource(ctx, 'selectedBodyPartPath', snapshot.selectedPartPaths?.[0] ?? undefined);
    setResource(ctx, 'selectedBodyPartPaths', snapshot.selectedPartPaths ?? undefined);
  }, [ctx]);

  const mergeSelectionState = useCallback((prev: EditorState, selection: SelectionSnapshot): EditorState => {
    const snapshot = cloneSelectionSnapshot(selection);
    writeSelectionRefs(snapshot);
    writePrimarySelectionResources(snapshot);
    return {
      ...prev,
      selectedEntities: snapshot.selectedEntities,
      selectedPartPaths: snapshot.selectedPartPaths,
    };
  }, [writePrimarySelectionResources, writeSelectionRefs]);
  
  // Bidirectional selection sync between UI and ECS
  useEffect(() => {
    const selected = state.selectedEntities[0] ?? undefined;
    setResource(ctx, 'selectedEntity', selected);
    setResource(ctx, 'selectedEntities', state.selectedEntities); // For multi-entity transforms
    // For ECS compatibility, sync first part path as selectedBodyPartPath
    const firstPartPath = state.selectedPartPaths?.[0];
    setResource(ctx, 'selectedBodyPartPath', firstPartPath ?? undefined);
    setResource(ctx, 'selectedBodyPartPaths', state.selectedPartPaths ?? undefined);

    const currentTargetMap = getResource<Map<string, BodyPartSelectionTarget> | undefined>(ctx, 'selectedBodyPartSelectionTargets', true);
    if (!state.selectedPartPaths || state.selectedPartPaths.length === 0) {
      setResource(ctx, 'selectedBodyPartAddress', undefined);
      setResource(ctx, 'selectedBodyPartAddresses', undefined);
      setResource(ctx, 'selectedBodyPartSelectionTargets', undefined);
      return;
    }

    if (!currentTargetMap || currentTargetMap.size === 0) {
      const fallbackAddresses = state.selectedPartPaths.map((path) => ({
        definitionPath: [...path],
        instancePath: [...path],
      }));
      setResource(ctx, 'selectedBodyPartAddress', fallbackAddresses[0]);
      setResource(ctx, 'selectedBodyPartAddresses', fallbackAddresses);
      if (state.selectedPartPaths.length > 1) {
        setResource(ctx, 'selectedBodyPartSelectionTargets', undefined);
      }
      return;
    }

    const filtered = new Map<string, BodyPartSelectionTarget>();
    const filteredAddresses: BodyPartSelectionAddress[] = [];
    for (const path of state.selectedPartPaths) {
      const key = pathToKey(path);
      const target = currentTargetMap.get(key);
      if (target) {
        filtered.set(key, target);
        filteredAddresses.push({
          definitionPath: [...target.address.definitionPath],
          instancePath: target.address.instancePath ? [...target.address.instancePath] : undefined,
        });
      } else {
        filteredAddresses.push({
          definitionPath: [...path],
          instancePath: [...path],
        });
      }
    }

    setResource(ctx, 'selectedBodyPartAddress', filteredAddresses[0]);
    setResource(ctx, 'selectedBodyPartAddresses', filteredAddresses);
    setResource(ctx, 'selectedBodyPartSelectionTargets', filtered.size > 0 ? filtered : undefined);
  }, [state.selectedEntities, state.selectedPartPaths, ctx]);

  // Keep refs of current UI selection for comparison in the polling loop
  useEffect(() => {
    writeSelectionRefs({
      selectedEntities: state.selectedEntities,
      selectedPartPaths: state.selectedPartPaths ?? null,
    });
  }, [state.selectedEntities, state.selectedPartPaths, writeSelectionRefs]);
  
  // Sync editor state to ECS resources for gizmo
  useEffect(() => {
    setResource(ctx, 'editorTool', state.tool);
  }, [state.tool, ctx]);
  
  useEffect(() => {
    setResource(ctx, 'editorTransformSpace', state.transformSpace);
  }, [state.transformSpace, ctx]);
  
  useEffect(() => {
    setResource(ctx, 'editorSnapping', state.snapping);
  }, [state.snapping, ctx]);
  
  // Sync spawn tool to ECS resources for raycast spawn handling
  useEffect(() => {
    setResource(ctx, 'editorSpawnTool', state.spawnTool);
  }, [state.spawnTool, ctx]);
  
  // Consolidated ECS polling loop - handles selection, tools, transform commands, and spawn requests
  useEffect(() => {
    let frameId: number;
    
    const syncFromECS = () => {
      // --- Selection Sync ---
      const ecsSelected = getResource<number | undefined>(ctx, 'selectedEntity', true);
      const ecsSelectedEntities = getResource<number[] | undefined>(ctx, 'selectedEntities', true);
      const ecsBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
      const ecsBodyPartPaths = getResource<number[][] | undefined>(ctx, 'selectedBodyPartPaths', true);

      const ecsSelection = normalizeSelectionSnapshot(ecsSelected, ecsSelectedEntities, ecsBodyPartPath, ecsBodyPartPaths);
      const uiSelection = {
        selectedEntities: uiSelectedEntitiesRef.current,
        selectedPartPaths: uiSelectedPartPathsRef.current,
      };

      if (shouldApplyEcsSelection(uiSelection, ecsSelection, multiSelectModeRef.current)) {
        writeSelectionRefs(ecsSelection);
        setState(prev => mergeSelectionState(prev, ecsSelection));
      }
      
      // --- Tool Sync from Hotkeys ---
      const ecsTool = getResource<EditorTool>(ctx, 'editorTool', true);
      setState(prev => {
        if (ecsTool && ecsTool !== prev.tool) {
          return { ...prev, tool: ecsTool, spawnTool: null };
        }
        return prev;
      });
      
      // --- Transform Commands ---
      const pendingCommand = getResource<any>(ctx, 'pendingTransformCommand', true);
      if (pendingCommand && pendingCommand.timestamp > lastCommandTimestampRef.current) {
        lastCommandTimestampRef.current = pendingCommand.timestamp;
        
        import('../../editor/commands/TransformCommand').then(({ TransformCommand }) => {
          const stableId = eidToStableId(ctx, pendingCommand.eid);
          const command = new TransformCommand(
            ctx,
            pendingCommand.eid,
            pendingCommand.initialTransform,
            pendingCommand.finalTransform,
            undefined,
            stableId
          );
          executeCommand(command);
        });
      }
      
      // --- Bulk Transform Commands (multi-entity) ---
      type BulkTransformData = { eid: number; oldTransform: TransformState; newTransform: TransformState };
      const pendingBulkTransform = getResource<{ transforms: BulkTransformData[]; timestamp: number } | undefined>(ctx, 'pendingBulkTransformCommand', true);
      if (pendingBulkTransform && pendingBulkTransform.timestamp > lastBulkTransformTimestampRef.current) {
        lastBulkTransformTimestampRef.current = pendingBulkTransform.timestamp;
        
        import('../../editor/commands/BulkTransformCommand').then(({ BulkTransformCommand }) => {
          const command = new BulkTransformCommand(ctx, pendingBulkTransform.transforms);
          executeCommand(command);
        });
      }
      
      // --- Body Part Transform Commands ---
      const pendingBodyPartTransform = getResource<PendingBodyPartTransform | undefined>(ctx, 'pendingBodyPartTransformCommand', true);
      if (pendingBodyPartTransform && pendingBodyPartTransform.timestamp > lastBodyPartCommandTimestampRef.current) {
        lastBodyPartCommandTimestampRef.current = pendingBodyPartTransform.timestamp;
        
        import('../../editor/commands/BodyPartTransformCommand').then(({ BodyPartTransformCommand }) => {
          const command = new BodyPartTransformCommand(
            ctx,
            pendingBodyPartTransform.eid,
            pendingBodyPartTransform.address ?? pendingBodyPartTransform.path,
            pendingBodyPartTransform.initialTransform,
            pendingBodyPartTransform.finalTransform
          );
          executeCommand(command);
        });
      }
      
      // --- Bulk Body Part Transform Commands (multi-part) ---
      type BulkBodyPartTransformData = {
        eid: number;
        address?: BodyPartSelectionAddress;
        path: number[];
        oldTransform: { position: any; rotation: any; scale: any };
        newTransform: { position: any; rotation: any; scale: any };
      };
      const pendingBulkBodyPartTransform = getResource<{ transforms: BulkBodyPartTransformData[]; timestamp: number } | undefined>(ctx, 'pendingBulkBodyPartTransformCommand', true);
      if (pendingBulkBodyPartTransform && pendingBulkBodyPartTransform.timestamp > lastBulkBodyPartCommandTimestampRef.current) {
        lastBulkBodyPartCommandTimestampRef.current = pendingBulkBodyPartTransform.timestamp;
        
        import('../../editor/commands/BulkBodyPartTransformCommand').then(({ BulkBodyPartTransformCommand }) => {
          const command = new BulkBodyPartTransformCommand(ctx, pendingBulkBodyPartTransform.transforms);
          executeCommand(command);
        });
      }
      
      // --- Spawn Requests ---
      const pendingSpawn = getResource<any>(ctx, 'pendingSpawnRequest', true);
      if (pendingSpawn && pendingSpawn.timestamp > lastSpawnTimestampRef.current) {
        lastSpawnTimestampRef.current = pendingSpawn.timestamp;
        
        const command = new AddEntityCommand(
          ctx,
          pendingSpawn.archetype,
          { Transform: pendingSpawn.position },
          pendingSpawn.archetype
        );
        executeCommand(command);
        
        const spawnedEid = command.getSpawnedEntityId();
        if (spawnedEid !== null) {
          setState(prev => mergeSelectionState(prev, { selectedEntities: [spawnedEid], selectedPartPaths: null }));
        }
      }
      
      // --- Body Part Add Requests ---
      const pendingBodyPartAdd = getResource<any>(ctx, 'pendingBodyPartAddRequest', true);
      if (pendingBodyPartAdd && pendingBodyPartAdd.timestamp > lastSpawnTimestampRef.current) {
        lastSpawnTimestampRef.current = pendingBodyPartAdd.timestamp;
        
        import('../../editor/commands/AddBodyPartCommand').then(({ AddBodyPartCommand }) => {
          const command = new AddBodyPartCommand(
            ctx,
            pendingBodyPartAdd.entityId,
            pendingBodyPartAdd.archetype,
            pendingBodyPartAdd.localPosition
          );
          executeCommand(command);
        });
      }
      
      // --- Multi-Select Toggle (from viewport Ctrl+click) ---
      const pendingMultiSelectToggle = getResource<{ eid: number; timestamp: number } | undefined>(ctx, 'pendingMultiSelectToggle', true);
      if (pendingMultiSelectToggle && pendingMultiSelectToggle.timestamp > lastMultiSelectToggleTimestampRef.current) {
        lastMultiSelectToggleTimestampRef.current = pendingMultiSelectToggle.timestamp;
        
        const eid = pendingMultiSelectToggle.eid;
        setState(prev => {
          const index = prev.selectedEntities.indexOf(eid);
          if (index >= 0) {
            return mergeSelectionState(prev, {
              selectedEntities: prev.selectedEntities.filter(id => id !== eid),
              selectedPartPaths: null,
            });
          } else {
            return mergeSelectionState(prev, {
              selectedEntities: [...prev.selectedEntities, eid],
              selectedPartPaths: null,
            });
          }
        });
      }
      
      // --- Multi-Part Toggle (from viewport Ctrl+Shift+click) ---
      const pendingMultiPartToggle = getResource<{ eid: number; partPath: number[]; partAddress?: BodyPartSelectionAddress; timestamp: number } | undefined>(ctx, 'pendingMultiPartToggle', true);
      if (pendingMultiPartToggle && pendingMultiPartToggle.timestamp > lastMultiPartToggleTimestampRef.current) {
        lastMultiPartToggleTimestampRef.current = pendingMultiPartToggle.timestamp;
        
        const eid = pendingMultiPartToggle.eid;
        const partPath = pendingMultiPartToggle.partAddress?.definitionPath ?? pendingMultiPartToggle.partPath;
        
        setState(prev => {
          const primaryEntity = prev.selectedEntities[0];
          const clickTarget = getResource<BodyPartSelectionTarget | undefined>(ctx, 'selectedBodyPartSelectionTarget', true);
          const existingTargetMap = getResource<Map<string, BodyPartSelectionTarget> | undefined>(ctx, 'selectedBodyPartSelectionTargets', true);
          const nextTargetMap = new Map(existingTargetMap ?? []);
          
          // If selecting part from different entity, switch to that entity
          if (primaryEntity !== eid) {
            nextTargetMap.clear();
            if (clickTarget) {
              nextTargetMap.set(pathToKey(partPath), { ...clickTarget, entityId: eid });
            }
            setResource(ctx, 'selectedBodyPartSelectionTargets', nextTargetMap.size > 0 ? nextTargetMap : undefined);
            return mergeSelectionState(prev, { selectedEntities: [eid], selectedPartPaths: [[...partPath]] });
          }
          
          // Toggle within same entity
          const currentParts = prev.selectedPartPaths || [];
          const pathIndex = currentParts.findIndex(p => 
            p.length === partPath.length && 
            p.every((v, i) => v === partPath[i])
          );
          
          if (pathIndex >= 0) {
            // Part already selected - toggle it off
            const newParts = currentParts.filter((_, i) => i !== pathIndex);
            nextTargetMap.delete(pathToKey(partPath));
            setResource(ctx, 'selectedBodyPartSelectionTargets', nextTargetMap.size > 0 ? nextTargetMap : undefined);
            return mergeSelectionState(prev, {
              selectedEntities: prev.selectedEntities,
              selectedPartPaths: newParts.length > 0 ? newParts : null,
            });
          } else {
            // Add part to selection
            if (clickTarget) {
              nextTargetMap.set(pathToKey(partPath), { ...clickTarget, entityId: eid });
            }
            setResource(ctx, 'selectedBodyPartSelectionTargets', nextTargetMap.size > 0 ? nextTargetMap : undefined);
            return mergeSelectionState(prev, {
              selectedEntities: prev.selectedEntities,
              selectedPartPaths: [...currentParts, [...partPath]],
            });
          }
        });
      }

      const nextCanUndo = commandManager.canUndo();
      const nextCanRedo = commandManager.canRedo();
      if (nextCanUndo !== undoStateRef.current) {
        undoStateRef.current = nextCanUndo;
        setCanUndo(nextCanUndo);
      }
      if (nextCanRedo !== redoStateRef.current) {
        redoStateRef.current = nextCanRedo;
        setCanRedo(nextCanRedo);
      }
      
      frameId = requestAnimationFrame(syncFromECS);
    };
    
    syncFromECS();
    
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [ctx, executeCommand, mergeSelectionState, writeSelectionRefs]);

  useEffect(() => {
    if (!sessionConfig.capabilities.keepPrimarySelection) return;
    const frameId = requestAnimationFrame(() => {
      setState((prev) => {
        if (prev.selectedEntities.length > 0) return prev;
        const primaryEntity = findAssetPrimaryEntity(ctx);
        if (primaryEntity === undefined) return prev;
        return mergeSelectionState(prev, { selectedEntities: [primaryEntity], selectedPartPaths: null });
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [ctx, mergeSelectionState, sessionConfig.capabilities.keepPrimarySelection]);
  
  // Selection handlers
  const selectEntity = useCallback((eid: number | null, multi = false) => {
    setState(prev => {
      if (eid === null) {
        if (sessionConfig.capabilities.keepPrimarySelection) {
          const primaryEntity = findAssetPrimaryEntity(ctx);
          if (primaryEntity !== undefined) {
            return mergeSelectionState(prev, { selectedEntities: [primaryEntity], selectedPartPaths: null });
          }
        }
        return mergeSelectionState(prev, { selectedEntities: [], selectedPartPaths: null });
      }
      
      if (multi) {
        const index = prev.selectedEntities.indexOf(eid);
        if (index >= 0) {
          return mergeSelectionState(prev, {
            selectedEntities: prev.selectedEntities.filter(id => id !== eid),
            selectedPartPaths: null,
          });
        } else {
          return mergeSelectionState(prev, {
            selectedEntities: [...prev.selectedEntities, eid],
            selectedPartPaths: null,
          });
        }
      } else {
        return mergeSelectionState(prev, { selectedEntities: [eid], selectedPartPaths: null });
      }
    });
  }, [ctx, mergeSelectionState, sessionConfig.capabilities.keepPrimarySelection]);

  const selectBodyPart = useCallback((eid: number, partPath: number[], multi = false) => {
    setState(prev => {
      const primaryEntity = prev.selectedEntities[0];
      
      // If selecting part from different entity, switch to that entity
      if (primaryEntity !== eid) {
        return mergeSelectionState(prev, { selectedEntities: [eid], selectedPartPaths: [[...partPath]] });
      }
      
      // Multi-part selection within same entity
      if (multi) {
        const currentParts = prev.selectedPartPaths || [];
        // Check if this part is already selected
        const pathIndex = currentParts.findIndex(p => 
          p.length === partPath.length && p.every((v, i) => v === partPath[i])
        );
        
        if (pathIndex >= 0) {
          // Part already selected - toggle it off
          const newParts = currentParts.filter((_, i) => i !== pathIndex);
          return mergeSelectionState(prev, {
            selectedEntities: prev.selectedEntities,
            selectedPartPaths: newParts.length > 0 ? newParts : null,
          });
        } else {
          // Add part to selection
          return mergeSelectionState(prev, {
            selectedEntities: prev.selectedEntities,
            selectedPartPaths: [...currentParts, [...partPath]],
          });
        }
      } else {
        // Single part selection
        return mergeSelectionState(prev, { selectedEntities: [eid], selectedPartPaths: [[...partPath]] });
      }
    });
  }, [mergeSelectionState]);
  
  const selectMultiple = useCallback((eids: number[]) => {
    setState(prev => mergeSelectionState(prev, { selectedEntities: eids, selectedPartPaths: null }));
  }, [mergeSelectionState]);

  const clearSelection = useCallback(() => {
    setState(prev => {
      if (sessionConfig.capabilities.keepPrimarySelection) {
        const primaryEntity = findAssetPrimaryEntity(ctx);
        if (primaryEntity !== undefined) {
          return mergeSelectionState(prev, { selectedEntities: [primaryEntity], selectedPartPaths: null });
        }
      }
      return mergeSelectionState(prev, { selectedEntities: [], selectedPartPaths: null });
    });
  }, [ctx, mergeSelectionState, sessionConfig.capabilities.keepPrimarySelection]);
  
  // Tool handlers
  const setTool = useCallback((tool: EditorTool) => {
    setState(prev => ({ ...prev, tool, spawnTool: null }));
    setResource(ctx, 'editorSpawnTool', null);
    setResource(ctx, 'editorSpawnArchetype', null);
  }, [ctx]);
  
  // Spawn tool handlers
  const setSpawnTool = useCallback((spawnTool: SpawnTool, archetype?: ArchetypeRef) => {
    setState(prev => ({ ...prev, spawnTool }));
    if (archetype) {
      setResource(ctx, 'editorSpawnArchetype', archetype);
    }
  }, [ctx]);
  
  const clearSpawnTool = useCallback(() => {
    setState(prev => ({ ...prev, spawnTool: null }));
    setResource(ctx, 'editorSpawnTool', null);
    setResource(ctx, 'editorSpawnArchetype', null);
  }, [ctx]);
  
  // Mode handlers
  const setMode = useCallback((mode: EditorMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  // Play mode handlers
  const enterPlayMode = useCallback(() => {
    playModeController.enterPlayMode(ctx, engine);
    setState(prev => ({ ...prev, isPlaying: true, mode: 'simulate' }));
  }, [ctx, engine, playModeController]);

  const exitPlayMode = useCallback(async () => {
    await playModeController.exitPlayMode(ctx, engine);
    setState(prev => ({ ...prev, isPlaying: false, mode: 'design' }));
  }, [ctx, engine, playModeController]);
  
  // Transform space
  const toggleTransformSpace = useCallback(() => {
    setState(prev => ({
      ...prev,
      transformSpace: prev.transformSpace === 'world' ? 'local' : 'world'
    }));
  }, []);
  
  // Snapping
  const toggleSnapping = useCallback(() => {
    setState(prev => ({ ...prev, snapping: !prev.snapping }));
  }, []);

  // Clipboard helpers
  const copySelection = useCallback(() => {
    const selectedEids = state.selectedEntities;
    if (selectedEids.length === 0) return false;

    // Handle body part selection (single entity, multiple parts)
    if (state.selectedPartPaths && state.selectedPartPaths.length > 0) {
      const eid = selectedEids[0];
      const bundle = getEntityBundle(ctx, eid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });
      
      const body = bundle.Body as Body | undefined;
      if (!body || body.type !== 'composite') return false;

      // Copy all selected parts
      const parts: Node[] = [];
      for (const partPath of state.selectedPartPaths) {
        const part = getPartAtPath(body as CompositeBody, partPath);
        if (part) {
          parts.push(JSON.parse(JSON.stringify(part)) as Node);
        }
      }
      
      if (parts.length === 0) return false;
      
      // Use bodyParts type for multiple parts, bodyPart for single
      if (parts.length > 1) {
        clipboardRef.current = { type: 'bodyParts', parts };
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(JSON.stringify(parts, null, 2)).catch(() => {
            // Ignore clipboard errors (e.g., permissions)
          });
        }
      } else {
        clipboardRef.current = { type: 'bodyPart', part: parts[0] };
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(JSON.stringify(parts[0], null, 2)).catch(() => {
            // Ignore clipboard errors (e.g., permissions)
          });
        }
      }

      return true;
    }

    // Handle multi-entity selection
    if (selectedEids.length > 1) {
      const bundles = selectedEids.map(eid => {
        const bundle = getEntityBundle(ctx, eid, {
          includeRuntime: false,
          includeRuntimeComponents: false,
        });
        return sanitizeBundleForSpawn(bundle);
      });

      clipboardRef.current = { type: 'entities', bundles };

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(JSON.stringify(bundles, null, 2)).catch(() => {
          // Ignore clipboard errors (e.g., permissions)
        });
      }

      return true;
    }

    // Handle single entity selection
    const eid = selectedEids[0];
    const bundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    const sanitizedBundle = sanitizeBundleForSpawn(bundle);
    clipboardRef.current = { type: 'entity', bundle: sanitizedBundle };

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(JSON.stringify(sanitizedBundle, null, 2)).catch(() => {
        // Ignore clipboard errors (e.g., permissions)
      });
    }

    return true;
  }, [ctx, sanitizeBundleForSpawn, state.selectedEntities, state.selectedPartPaths]);

  const pasteSelection = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard) return false;

    // Handle multi-entity paste
    if (clipboard.type === 'entities') {
      // Create AddEntityCommand for each entity at original position
      const commands: AddEntityCommand[] = [];
      clipboard.bundles.forEach((bundle) => {
        // No offsets - spawn at original Transform positions
        const command = new AddEntityCommand(ctx, bundle, {}, bundle._meta?.archetype);
        commands.push(command);
      });
      
      // Wrap in BulkCommand for single undo/redo
      const bulkCommand = new BulkCommand(commands, `Paste ${commands.length} ${commands.length === 1 ? 'Entity' : 'Entities'}`);
      executeCommand(bulkCommand);
      
      // Collect spawned entity IDs
      const spawnedEids: number[] = [];
      for (const cmd of commands) {
        const spawnedEid = cmd.getSpawnedEntityId();
        if (spawnedEid !== null) {
          spawnedEids.push(spawnedEid);
        }
      }

      if (spawnedEids.length > 0) {
        setState(prev => mergeSelectionState(prev, { selectedEntities: spawnedEids, selectedPartPaths: null }));
      }

      return true;
    }

    // Handle single entity paste
    if (clipboard.type === 'entity') {
      const command = new AddEntityCommand(ctx, clipboard.bundle, {}, clipboard.bundle._meta?.archetype);
      executeCommand(command);

      const spawnedEid = command.getSpawnedEntityId();
      if (spawnedEid !== null) {
        setState(prev => mergeSelectionState(prev, { selectedEntities: [spawnedEid], selectedPartPaths: null }));
      }

      return true;
    }

    // Handle multi-part paste
    if (clipboard.type === 'bodyParts') {
      const targetEid = state.selectedEntities[0];
      if (targetEid === undefined) return false;

      const targetBundle = getEntityBundle(ctx, targetEid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });

      const body = targetBundle.Body as Body | undefined;
      if (!body || body.type !== 'composite') return false;

      const parentPath = state.selectedPartPaths?.[0] ?? [];
      
      // Create InsertBodyPartCommand for each part
      const commands: InsertBodyPartCommand[] = [];
      for (const part of clipboard.parts) {
        const command = new InsertBodyPartCommand(ctx, targetEid, part, parentPath);
        commands.push(command);
      }
      
      // Wrap in BulkCommand for single undo/redo
      const bulkCommand = new BulkCommand(commands, `Paste ${commands.length} Body ${commands.length === 1 ? 'Part' : 'Parts'}`);
      executeCommand(bulkCommand);

      // Get the last inserted part path for selection
      const lastCommand = commands[commands.length - 1];
      const updatedEid = lastCommand.getCurrentEntityId();
      const insertedPaths: number[][] = [];
      for (const cmd of commands) {
        const insertedPath = cmd.getInsertedPartPath();
        if (insertedPath) {
          insertedPaths.push([...insertedPath]);
        }
      }
      
      if (updatedEid !== null && insertedPaths.length > 0) {
        setState(prev => mergeSelectionState(prev, { selectedEntities: [updatedEid], selectedPartPaths: insertedPaths }));
      }

      return true;
    }

    // Handle single body part paste
    const targetEid = state.selectedEntities[0];

    if (targetEid !== undefined) {
      const targetBundle = getEntityBundle(ctx, targetEid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });

      const body = targetBundle.Body as Body | undefined;
      if (!body || body.type !== 'composite') return false;

      const parentPath = state.selectedPartPaths?.[0] ?? [];
      const command = new InsertBodyPartCommand(ctx, targetEid, clipboard.part, parentPath);
      executeCommand(command);

      const updatedEid = command.getCurrentEntityId();
      const insertedPath = command.getInsertedPartPath();
      if (updatedEid !== null && insertedPath) {
        setState(prev => mergeSelectionState(prev, { selectedEntities: [updatedEid], selectedPartPaths: [[...insertedPath]] }));
      }

      return true;
    }

    const newPart = JSON.parse(JSON.stringify(clipboard.part)) as Node;
    const newBundle: ArchetypeBundle = {
      Body: {
        type: 'composite',
        params: {
          parts: [newPart],
        },
      } as Body,
    };

    const command = new AddEntityCommand(ctx, newBundle, {}, 'Body Part');
    executeCommand(command);

    const spawnedEid = command.getSpawnedEntityId();
    if (spawnedEid !== null) {
      setState(prev => mergeSelectionState(prev, { selectedEntities: [spawnedEid], selectedPartPaths: [[0]] }));
    }

    return true;
  }, [ctx, executeCommand, mergeSelectionState, state.selectedEntities, state.selectedPartPaths]);

  const deleteSelection = useCallback(() => {
    const selectedEids = state.selectedEntities;
    if (selectedEids.length === 0) return false;

    // Handle multi-entity delete
    if (selectedEids.length > 1) {
      const command = new BulkDeleteCommand(ctx, selectedEids);
      executeCommand(command);
      setState(prev => mergeSelectionState(prev, { selectedEntities: [], selectedPartPaths: null }));
      return true;
    }

    // Handle single entity delete
    const eid = selectedEids[0];
    const command = new DeleteEntityCommand(ctx, eid);
    executeCommand(command);
    setState(prev => mergeSelectionState(prev, { selectedEntities: [], selectedPartPaths: null }));

    return true;
  }, [ctx, executeCommand, mergeSelectionState, state.selectedEntities]);

  const cutSelection = useCallback(() => {
    const copied = copySelection();
    if (!copied) return false;
    return deleteSelection();
  }, [copySelection, deleteSelection]);

  const duplicateSelection = useCallback(() => {
    const selectedEids = state.selectedEntities;
    if (selectedEids.length === 0) return false;

    // Handle multi-entity duplicate
    if (selectedEids.length > 1) {
      const command = new BulkDuplicateCommand(ctx, selectedEids);
      executeCommand(command);

      const duplicatedEids = command.getDuplicatedEntityIds();
      if (duplicatedEids.length > 0) {
        setState(prev => mergeSelectionState(prev, { selectedEntities: duplicatedEids, selectedPartPaths: null }));
      }
      return true;
    }

    // Handle single entity duplicate
    const eid = selectedEids[0];
    const command = new DuplicateEntityCommand(ctx, eid);
    executeCommand(command);

    const duplicatedEid = command.getDuplicatedEntityId();
    if (duplicatedEid !== null) {
      setState(prev => mergeSelectionState(prev, { selectedEntities: [duplicatedEid], selectedPartPaths: null }));
    }

    return true;
  }, [ctx, executeCommand, mergeSelectionState, state.selectedEntities]);
  
  // Undo/redo
  const undo = useCallback(() => {
    if (commandManager.undo()) {
      setCanUndo(commandManager.canUndo());
      setCanRedo(commandManager.canRedo());
    }
  }, [commandManager]);
  
  const redo = useCallback(() => {
    if (commandManager.redo()) {
      setCanUndo(commandManager.canUndo());
      setCanRedo(commandManager.canRedo());
    }
  }, [commandManager]);

  // World persistence (Milestone 1.2)
  const saveWorld = useCallback(async () => {
    if (!onSaveWorld) {
      console.warn('[EditorContext] saveWorld called but no onSaveWorld handler provided');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // onSaveWorld is expected to be bound to a specific worldId
      await onSaveWorld('');
      setLastSaved(Date.now());
    } catch (error: any) {
      console.error('[EditorContext] Save failed', error);
      setSaveError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [onSaveWorld]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEditingActive(event.target)) {
        return;
      }

      const metaOrCtrl = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (metaOrCtrl && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (metaOrCtrl && ((event.shiftKey && key === 'z') || key === 'y')) {
        event.preventDefault();
        redo();
        return;
      }

      if (metaOrCtrl && key === 'c') {
        const handled = copySelection();
        if (handled) event.preventDefault();
        return;
      }

      if (metaOrCtrl && key === 'x') {
        const handled = cutSelection();
        if (handled) event.preventDefault();
        return;
      }

      if (metaOrCtrl && key === 'v') {
        const handled = pasteSelection();
        if (handled) event.preventDefault();
        return;
      }

      if (metaOrCtrl && event.shiftKey && key === 'd') {
        const handled = duplicateSelection();
        if (handled) event.preventDefault();
        return;
      }

      if (!metaOrCtrl && (event.key === 'Delete' || event.key === 'Backspace')) {
        const handled = deleteSelection();
        if (handled) event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, cutSelection, deleteSelection, duplicateSelection, pasteSelection, redo, undo]);
  
  const requestComposerHandler = () => {
    const next = !composerOpen;
    onRequestComposer?.();
    setComposerOpen(next);
  };

  const value: EditorContextValue = {
    state,
    selectedEntities: state.selectedEntities,
    selectedPartPaths: state.selectedPartPaths,
    selectEntity,
    selectBodyPart,
    selectMultiple,
    clearSelection,
    tool: state.tool,
    setTool,
    spawnTool: state.spawnTool,
    setSpawnTool,
    clearSpawnTool,
    mode: state.mode,
    setMode,
    isPlaying: state.isPlaying,
    enterPlayMode,
    exitPlayMode,
    transformSpace: state.transformSpace,
    toggleTransformSpace,
    snapping: state.snapping,
    toggleSnapping,
    commandManager,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelection,
    cutSelection,
    pasteSelection,
    duplicateSelection,
    deleteSelection,
    playModeController,
    saveWorld: onSaveWorld ? saveWorld : undefined,
    isSaving,
    lastSaved,
    saveError,
    requestComposer: requestComposerHandler,
    openPlayMode: onOpenPlayMode,
    composerOpen,
    taskStore,
    sessionConfig,
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
}

// Convenience hooks
export function useSelectedEntity(): number | null {
  const { selectedEntities } = useEditor();
  return selectedEntities[0] ?? null;
}

export function useSelectedEntities(): number[] {
  const { selectedEntities } = useEditor();
  return selectedEntities;
}

export function useSelectedPartPath(): number[] | null {
  const { selectedPartPaths } = useEditor();
  return selectedPartPaths?.[0] ?? null;
}
