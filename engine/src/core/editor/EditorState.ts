/**
 * Editor State Management
 * Defines the core state and types for editor functionality
 */

export type EditorTool = 'select' | 'translate' | 'rotate' | 'scale';
export type EditorMode = 'design' | 'simulate';

/** Spawn tool for placing entities on click */
export type SpawnTool = 
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid'
  | 'light' | 'player' | 'npc' | 'camera'
  | 'prefab' | 'asset'
  | null;

export interface EditorState {
  /** Currently selected entity IDs (supports multi-select) */
  selectedEntities: number[];

  /** Currently selected body part paths within the primary entity (supports multi-part select) */
  selectedPartPaths?: number[][] | null;
  
  /** Current transform tool */
  tool: EditorTool;
  
  /** Editor mode: design (edit) or simulate (play) */
  mode: EditorMode;
  
  /** Whether we're currently in play mode */
  isPlaying: boolean;
  
  /** Transform controls space (world or local) */
  transformSpace: 'world' | 'local';
  
  /** Snapping enabled */
  snapping: boolean;
  
  /** Current spawn tool (if any) - clicking in viewport spawns this entity type */
  spawnTool: SpawnTool;
}

export const defaultEditorState: EditorState = {
  selectedEntities: [],
  selectedPartPaths: null,
  tool: 'translate',
  mode: 'design',
  isPlaying: false,
  transformSpace: 'world',
  snapping: false,
  spawnTool: null,
};
