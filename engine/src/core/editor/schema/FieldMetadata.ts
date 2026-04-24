/**
 * Field Metadata Types
 * Describes the structure of component fields for auto-generated UI
 */

import type React from 'react';

/**
 * Field type categories for UI generation
 */
export type FieldType = 
  | 'number'
  | 'string'
  | 'boolean'
  | 'vector3'
  | 'quaternion'
  | 'color'
  | 'enum'
  | 'union'
  | 'array'
  | 'object'
  | 'moduleReference';

/**
 * Metadata for a single field
 * Describes how to render and edit a field in the UI
 */
export interface FieldMetadata {
  /** Field name (property key) */
  name: string;
  
  /** Field type determines which renderer to use */
  type: FieldType;
  
  /** Whether field is required (vs optional) */
  required: boolean;
  
  /** Default value if not specified */
  defaultValue?: any;
  
  // Number-specific
  /** Minimum value for numbers */
  min?: number;
  
  /** Maximum value for numbers */
  max?: number;
  
  /** Step increment for number inputs */
  step?: number;
  
  // Enum-specific
  /** Possible values for enum fields */
  enumValues?: string[];

  /** Optional enum options with labels and icons for richer rendering */
  enumOptions?: Array<{ value: string; label?: string; icon?: string }>;
  
  // Union-specific (discriminated unions)
  /** Union types keyed by discriminator value */
  unionTypes?: Record<string, FieldMetadata[]>;
  
  /** Discriminator field name (usually 'type') */
  discriminator?: string;
  
  // Array-specific
  /** Metadata for array items */
  itemType?: FieldMetadata;
  
  // Object-specific
  /** Nested fields for object types */
  fields?: Record<string, FieldMetadata>;
  
  // Module reference-specific
  /** Name of the module (e.g., 'body', 'material', 'motionSource') */
  moduleName?: string;
  
  // UI hints
  /** Display label (defaults to name if not provided) */
  label?: string;
  
  /** Help text / description */
  description?: string;
  
  /** Group name for organizing fields into sections */
  group?: string;

  /** Optional section title for renderer-level section shells */
  section?: string;

  /** Optional section shell style for fields/modules that should render like inspector components */
  sectionStyle?: 'inspector';

  /** Optional inspector tab placement for schema-driven surfaces */
  inspectorTab?: InspectorTab;
  
  /** Hide this field from UI (computed or internal) */
  hidden?: boolean;
  
  // Layout hints (for Figma-like dense UI)
  /** Icon name for field label (uses EditorIcon system) */
  icon?: string;
  
  /** If true, show only icon with tooltip instead of text label */
  iconOnly?: boolean;
  
  /** Render mode: 'compact' for denser display */
  displayMode?: 'normal' | 'compact' | 'inline';
  
  /** Width hint for grid layouts */
  width?: 'auto' | 'full' | '1/2' | '1/3' | '1/4';
  
  /** Short label for condensed views */
  condensedLabel?: string;
  
  /**
   * Compact row grouping (for Figma-like dense layouts)
   * Fields with the same compactRow value are rendered together on a single row.
   * This is a display-only hint and does not affect the output format.
   */
  compactRow?: string;

  /**
   * Compact label mode for row renderers.
   * - addon: render compact prefix icon/label before input (default)
   * - none: omit compact prefix and let the control render full-width
   */
  compactLabelMode?: 'addon' | 'none';
}

/**
 * Component schema definition
 * Complete metadata for a component including all its fields
 */
export type InspectorTab = 'design' | 'animation' | 'simulate' | 'render';
export type InspectorPlacement = 'tab' | 'metadata' | 'hidden';

export interface ComponentSchema {
  /** Component name (e.g., 'Transform', 'Body') */
  name: string;
  
  /** Human-readable display name */
  displayName: string;
  
  /** Component description */
  description?: string;
  
  /** Fields of this component */
  fields: Record<string, FieldMetadata>;
  
  /** 
   * Whether this component is structural (requires entity respawn)
   * - Structural: Body, Animation, MotionSource (change geometry/behavior)
   * - Non-structural: Transform, Health, Info (hot-swappable properties)
   */
  isStructural: boolean;
  
  /**
   * Optional custom UI override
   * If provided, this component will use custom UI instead of generic editor
   */
  uiOverride?: React.ComponentType<{ eid: number }>;
  
  /**
   * Fields that are required for this component to be valid
   * Used for validation before applying changes
   */
  requiredFields?: string[];
  
  /**
   * Group definitions for organizing fields
   * Fields with matching 'group' will be rendered together
   */
  groups?: Array<{
    name: string;
    label: string;
    collapsed?: boolean;
  }>;

  /** Which inspector tab this component should appear under */
  inspectorTab?: InspectorTab;

  /** Which inspector surface this component should render in */
  inspectorPlacement?: InspectorPlacement;

  /** Optional ordering hint for rendering components within a tab */
  inspectorOrder?: number;

  /** Whether users can add this component from the inspector */
  addable?: boolean;

  /** Whether users can remove this component from the inspector */
  removable?: boolean;
  
  // Figma-like condensed view support
  /** Icon name for component header (uses EditorIcon system) */
  icon?: string;
  
  /** Display mode: 'full' always shows all fields, 'condensed' shows summary with popout */
  displayMode?: 'full' | 'condensed' | 'both';
  
  /** Fields to show in condensed mode */
  condensedFields?: string[];
  
  /** Header actions (excluding add) */
  headerActions?: Array<{
    icon: string;
    tooltip: string;
    action: 'delete' | 'duplicate' | 'reset' | string;
  }>;
}

/**
 * Validation result for field values
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}
