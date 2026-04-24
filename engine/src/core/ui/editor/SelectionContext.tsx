/**
 * Selection Context
 * Manages entity and body part selection state
 * Extracted from EditorContext for better separation of concerns
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ECSContext, getResource, setResource } from '../../ecs';

export interface SelectionState {
  /** Currently selected entity IDs (supports multi-select) */
  selectedEntities: number[];
  /** Currently selected body part path within the primary entity (if any) */
  selectedPartPath: number[] | null;
}

export interface SelectionContextValue {
  // State
  selectedEntities: number[];
  /** Selected body part path, or null if no part is selected */
  selectedPartPath: number[] | null;
  
  // Actions
  selectEntity: (eid: number | null, multi?: boolean) => void;
  selectBodyPart: (eid: number, partPath: number[]) => void;
  selectMultiple: (eids: number[]) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export interface SelectionProviderProps {
  children: React.ReactNode;
  ctx: ECSContext;
}

const defaultSelectionState: SelectionState = {
  selectedEntities: [],
  selectedPartPath: null,
};

/**
 * SelectionProvider - Manages entity and body part selection
 */
export function SelectionProvider({ children, ctx }: SelectionProviderProps) {
  const [state, setState] = useState<SelectionState>(defaultSelectionState);
  const uiSelectionRef = useRef<number | undefined>(undefined);
  const uiBodyPartPathRef = useRef<number[] | null>(null);

  // Bidirectional selection sync between UI and ECS
  useEffect(() => {
    // Push UI selection to ECS
    const selected = state.selectedEntities[0] ?? undefined;
    setResource(ctx, 'selectedEntity', selected);
    setResource(ctx, 'selectedBodyPartPath', state.selectedPartPath ?? undefined);
  }, [state.selectedEntities, state.selectedPartPath, ctx]);

  // Keep refs of current UI selection for comparison in the polling loop
  useEffect(() => {
    uiSelectionRef.current = state.selectedEntities[0] ?? undefined;
    uiBodyPartPathRef.current = state.selectedPartPath;
  }, [state.selectedEntities, state.selectedPartPath]);

  // Poll ECS for selection changes from world (gizmo interactions, viewport clicks)
  useEffect(() => {
    let frameId: number;

    const syncSelectionFromECS = () => {
      const ecsSelected = getResource<number | undefined>(ctx, 'selectedEntity', true);
      const ecsBodyPartPath = getResource<number[] | undefined>(ctx, 'selectedBodyPartPath', true);
      const uiSelected = uiSelectionRef.current;
      const uiBodyPartPath = uiBodyPartPathRef.current;

      // Check if body part path changed (array compare)
      const bodyPartPathChanged = (() => {
        if (!ecsBodyPartPath && !uiBodyPartPath) return false;
        if (!ecsBodyPartPath || !uiBodyPartPath) return true;
        if (ecsBodyPartPath.length !== uiBodyPartPath.length) return true;
        return !ecsBodyPartPath.every((v, i) => v === uiBodyPartPath[i]);
      })();

      // If ECS selection differs from UI, update UI (includes body part path)
      if (ecsSelected !== uiSelected || bodyPartPathChanged) {
        if (ecsSelected === undefined) {
          setState(prev => ({ ...prev, selectedEntities: [], selectedPartPath: null }));
        } else {
          // Convert undefined to null for consistency
          const partPath = ecsBodyPartPath && ecsBodyPartPath.length > 0 ? [...ecsBodyPartPath] : null;
          setState(prev => ({ ...prev, selectedEntities: [ecsSelected], selectedPartPath: partPath }));
        }
      }

      frameId = requestAnimationFrame(syncSelectionFromECS);
    };

    syncSelectionFromECS();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [ctx]);

  // Selection handlers
  const selectEntity = useCallback((eid: number | null, multi = false) => {
    setState(prev => {
      if (eid === null) {
        return { ...prev, selectedEntities: [], selectedPartPath: null };
      }

      if (multi) {
        // Toggle selection in multi-select mode
        const index = prev.selectedEntities.indexOf(eid);
        if (index >= 0) {
          return {
            ...prev,
            selectedEntities: prev.selectedEntities.filter(id => id !== eid)
          };
        } else {
          return {
            ...prev,
            selectedEntities: [...prev.selectedEntities, eid]
          };
        }
      } else {
        // Single selection
        return { ...prev, selectedEntities: [eid], selectedPartPath: null };
      }
    });
  }, []);

  const selectBodyPart = useCallback((eid: number, partPath: number[]) => {
    setState(prev => ({
      ...prev,
      selectedEntities: [eid],
      selectedPartPath: [...partPath],
    }));
  }, []);

  const selectMultiple = useCallback((eids: number[]) => {
    setState(prev => ({ ...prev, selectedEntities: eids, selectedPartPath: null }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedEntities: [], selectedPartPath: null }));
  }, []);

  const value: SelectionContextValue = {
    selectedEntities: state.selectedEntities,
    selectedPartPath: state.selectedPartPath,
    selectEntity,
    selectBodyPart,
    selectMultiple,
    clearSelection,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

/**
 * Hook to access selection context
 */
export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
}

/**
 * Hook to get the first selected entity
 */
export function useSelectedEntity(): number | null {
  const { selectedEntities } = useSelection();
  return selectedEntities[0] ?? null;
}

/**
 * Hook to get all selected entities
 */
export function useSelectedEntities(): number[] {
  const { selectedEntities } = useSelection();
  return selectedEntities;
}

/**
 * Hook to get the selected body part path
 */
export function useSelectedPartPath(): number[] | null {
  const { selectedPartPath } = useSelection();
  return selectedPartPath ?? null;
}
