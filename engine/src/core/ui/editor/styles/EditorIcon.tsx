/**
 * Editor Icon System
 * String-based icon lookup for consistent icon usage across the editor
 * Uses Tabler icons for better 3D editor options with fallback to Ant Design
 */

import React from 'react';
import {
  // Tools - using Tabler for better 3D editor icons
  IconPointer,
  IconArrowsMove,
  IconRotate,
  IconResize,
  // Playback
  IconPlayerPlay,
  IconPlayerPause,
  IconArrowBackUp,
  IconArrowForwardUp,
  // Transform
  IconWorld,
  IconFocus,
  IconGrid4x4,
  // Bodies
  IconPackages,
  IconFile3d,
  IconMan,
  // Primitives - 3D shapes
  IconBox,
  IconSphere,
  IconCylinder,
  IconCone,
  IconPyramid,
  IconCube,
  Icon3dCubeSphere,
  IconHemisphere,
  // Materials
  IconRipple,
  IconGrain,
  IconWood,
  // Material Params
  IconBackground,
  IconFrustum,
  IconInnerShadowTopRight,
  IconBoom,
  IconArrowDownDashed,
  // Light
  IconConeFilled,
  IconBrightnessUp,
  // Actions
  IconPlus,
  IconTrash,
  IconCopy,
  IconEdit,
  // Visibility
  IconEye,
  IconEyeOff,
  IconLock,
  IconLockOpen,
  // Settings
  IconSettings,
  IconAdjustments,
  // Components
  IconBolt,
  IconFlask,
  IconHeart,
  IconShield,
  IconTool,
  // Motion
  IconRun,
  // Scene
  IconCamera,
  IconBulb,
  // Animation
  IconMovie,
  IconTimeline,
  // Tree
  IconChevronRight,
  IconChevronDown,
  IconDots,
  // Status
  IconX,
  IconCheck,
  IconInfoCircle,
  IconAlertTriangle,
  IconRefresh,
  // Entity
  IconUser,
  IconUsers,
  // Files
  IconDeviceFloppy,
  IconFileExport,
  IconFileImport,
  IconFolder,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  // Navigation
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';
import type { CSSProperties } from 'react';

/**
 * All available editor icon names
 */
export type EditorIconName =
  // Tools
  | 'select' | 'translate' | 'rotate' | 'scale'
  // Playback
  | 'play' | 'pause' | 'undo' | 'redo'
  // Transform
  | 'world' | 'local' | 'snap'
  // Bodies
  | 'composite' | 'gltf' | 'humanoid'
  // Primitives - 3D shapes
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'cube' | 'primitive' | 'hemisphere'
  // Materials
  | 'liquid' | 'marble' | 'wood'
  // Material Params
  | 'metalness' | 'roughness' | 'opacity' | 'depthScale'
  // Light
  | 'point' | 'spot'
  // Actions
  | 'add' | 'delete' | 'duplicate' | 'edit'
  // Visibility
  | 'visible' | 'hidden' | 'locked' | 'unlocked'
  // Settings
  | 'settings' | 'adjustments'
  // Components
  | 'effect' | 'experiment' | 'health' | 'shield' | 'tool'
  // Motion
  | 'motion'
  // Scene
  | 'camera' | 'light'
  // Animation
  | 'animation' | 'timeline'
  // Tree
  | 'expand' | 'collapse' | 'more'
  // Status
  | 'close' | 'confirm' | 'info' | 'warning' | 'refresh'
  // Entity
  | 'user' | 'users'
  // Shapes (deprecated, use 3D primitives)
  | 'shape' | 'radius'
  // Files
  | 'save' | 'export' | 'import' | 'folder'
  // Layout
  | 'sidebarLeftCollapse' | 'sidebarLeftExpand'
  // Navigation
  | 'arrowUp' | 'arrowDown' | 'arrowLeft' | 'arrowRight';

/** Default icon size for consistency */
const DEFAULT_ICON_SIZE = 18;

/**
 * Map icon names to Tabler icon components
 * Note: Tabler icons accept size as string | number, so we use a looser type
 */
const editorIconMap: Record<EditorIconName, React.ComponentType<{ size?: number | string; style?: CSSProperties; className?: string }>> = {
  // Tools
  select: IconPointer,
  translate: IconArrowsMove,
  rotate: IconRotate,
  scale: IconResize,
  // Playback
  play: IconPlayerPlay,
  pause: IconPlayerPause,
  undo: IconArrowBackUp,
  redo: IconArrowForwardUp,
  // Transform
  world: IconWorld,
  local: IconFocus,
  snap: IconGrid4x4,
  // Bodies
  composite: IconPackages,
  gltf: IconFile3d,
  humanoid: IconMan,
  // Primitives - 3D shapes
  box: IconBox,
  sphere: IconSphere,
  cylinder: IconCylinder,
  cone: IconCone,
  pyramid: IconPyramid,
  cube: IconCube,
  primitive: Icon3dCubeSphere,
  hemisphere: IconHemisphere,
  // Materials
  liquid: IconRipple,
  marble: IconGrain,
  wood: IconWood,
  // Material Params
  metalness: IconFrustum,
  roughness: IconBoom,
  opacity: IconBackground,
  depthScale: IconArrowDownDashed,
  // Light
  point: IconBrightnessUp,
  spot: IconConeFilled,
  // Actions
  add: IconPlus,
  delete: IconTrash,
  duplicate: IconCopy,
  edit: IconEdit,
  // Visibility
  visible: IconEye,
  hidden: IconEyeOff,
  locked: IconLock,
  unlocked: IconLockOpen,
  // Settings
  settings: IconSettings,
  adjustments: IconAdjustments,
  // Components
  effect: IconBolt,
  experiment: IconFlask,
  health: IconHeart,
  shield: IconShield,
  tool: IconTool,
  // Motion
  motion: IconRun,
  // Scene
  camera: IconCamera,
  light: IconBulb,
  // Animation
  animation: IconMovie,
  timeline: IconTimeline,
  // Tree
  expand: IconChevronRight,
  collapse: IconChevronDown,
  more: IconDots,
  // Status
  close: IconX,
  confirm: IconCheck,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  refresh: IconRefresh,
  // Entity
  user: IconUser,
  users: IconUsers,
  // Shapes (deprecated, map to primitives)
  shape: IconCylinder,
  radius: IconSphere,
  // Files
  save: IconDeviceFloppy,
  export: IconFileExport,
  import: IconFileImport,
  folder: IconFolder,
  // Layout
  sidebarLeftCollapse: IconLayoutSidebarLeftCollapse,
  sidebarLeftExpand: IconLayoutSidebarLeftExpand,
  // Navigation
  arrowUp: IconArrowUp,
  arrowDown: IconArrowDown,
  arrowLeft: IconArrowLeft,
  arrowRight: IconArrowRight,
};

export interface EditorIconProps {
  /** Name of the icon to render */
  name: EditorIconName;
  /** Icon size (default 18px) */
  size?: number;
  /** Custom styles */
  style?: CSSProperties;
  /** Custom class name */
  className?: string;
}

/**
 * EditorIcon component for rendering icons by name
 * Uses Tabler icons for better 3D editor support
 * Memoized to prevent unnecessary re-renders
 */
export const EditorIcon = React.memo(function EditorIcon({ name, size = DEFAULT_ICON_SIZE, style, className }: EditorIconProps) {
  const Icon = editorIconMap[name];
  if (!Icon) {
    console.warn(`Unknown editor icon: ${name}`);
    return null;
  }
  return <Icon size={size} style={style} className={className} />;
});

/**
 * Get the icon component directly for use in Ant Design components
 * @param name Icon name
 * @returns The icon component or undefined
 */
export function getEditorIcon(name: EditorIconName): React.ComponentType<{ size?: number | string; style?: CSSProperties; className?: string }> | undefined {
  return editorIconMap[name];
}

/**
 * Check if an icon name is valid
 * @param name Icon name to check
 * @returns true if valid
 */
export function isValidEditorIcon(name: string): name is EditorIconName {
  return name in editorIconMap;
}
