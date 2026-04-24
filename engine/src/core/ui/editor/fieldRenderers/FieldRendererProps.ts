/**
 * Field Renderer Props
 * Common interface for all field renderers
 */

import type React from 'react';
import { FieldMetadata } from '../../../editor/schema/FieldMetadata';

export interface FieldRendererProps {
  /** Metadata describing this field */
  metadata: FieldMetadata;

  /** Current field value */
  value: any;

  /** Callback when value changes */
  onChange: (value: any) => void;

  /** Callback when the user finishes editing (on blur or enter) */
  onCommit?: (value: any) => void;
  
  /** Field path for nested structures (e.g., "params.parts[0].geometry.radius") */
  path: string;
  
  /** Whether field is disabled */
  disabled?: boolean;
  
  /** Optional: The parent object value (for checking sibling discriminators in unions) */
  parentValue?: any;
}

export type FieldRenderer = React.ComponentType<FieldRendererProps>;
