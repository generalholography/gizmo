/**
 * Component Schema Registry
 * Central registry for component metadata used by the generic editor
 */

import { ComponentSchema, FieldMetadata, InspectorPlacement, InspectorTab, ValidationResult } from './FieldMetadata';

export class ComponentSchemaRegistry {
  private schemas = new Map<string, ComponentSchema>();
  
  /**
   * Register a component schema
   */
  register(schema: ComponentSchema): void {
    this.schemas.set(schema.name, schema);
  }
  
  /**
   * Register multiple schemas at once
   */
  registerAll(schemas: ComponentSchema[]): void {
    for (const schema of schemas) {
      this.register(schema);
    }
  }
  
  /**
   * Get schema for a component
   */
  get(componentName: string): ComponentSchema | undefined {
    return this.schemas.get(componentName);
  }
  
  /**
   * Check if a component has a registered schema
   */
  has(componentName: string): boolean {
    return this.schemas.has(componentName);
  }
  
  /**
   * Get all registered component names
   */
  getEditableComponents(): string[] {
    return Array.from(this.schemas.keys());
  }

  /** Get the inspector tab for a component */
  getInspectorTab(componentName: string): InspectorTab {
    const schema = this.schemas.get(componentName);
    return schema?.inspectorTab ?? 'design';
  }

  /** Get which inspector surface should render a component */
  getInspectorPlacement(componentName: string): InspectorPlacement {
    const schema = this.schemas.get(componentName);
    return schema?.inspectorPlacement ?? 'tab';
  }

  /** Get the explicit inspector order for a component (lower renders first) */
  getInspectorOrder(componentName: string): number {
    const schema = this.schemas.get(componentName);
    if (schema?.inspectorOrder !== undefined) {
      return schema.inspectorOrder;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  /** Whether a component can be added from inspector UI */
  isAddable(componentName: string): boolean {
    const schema = this.schemas.get(componentName);
    if (!schema) return false;
    return schema.addable ?? this.getInspectorPlacement(componentName) !== 'hidden';
  }

  /** Whether a component can be removed from inspector UI */
  isRemovable(componentName: string): boolean {
    const schema = this.schemas.get(componentName);
    if (!schema) return false;
    return schema.removable ?? true;
  }

  /** Get registered components for a tab or metadata surface */
  getComponentsForPlacement(placement: Exclude<InspectorPlacement, 'hidden'>, tab?: InspectorTab): string[] {
    return Array.from(this.schemas.entries())
      .filter(([name]) => this.getInspectorPlacement(name) === placement)
      .filter(([name]) => placement !== 'tab' || this.getInspectorTab(name) === tab)
      .map(([name]) => name)
      .sort((a, b) => {
        const orderA = this.getInspectorOrder(a);
        const orderB = this.getInspectorOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });
  }
  
  /**
   * Check if a component is structural (requires respawn)
   */
  isStructural(componentName: string): boolean {
    const schema = this.schemas.get(componentName);
    return schema?.isStructural ?? false;
  }
  
  /**
   * Get components by group
   */
  getComponentsByGroup(): Record<string, string[]> {
    const groups: Record<string, string[]> = {
      core: [],
      physics: [],
      visual: [],
      gameplay: [],
      other: []
    };
    
    for (const [name, schema] of this.schemas.entries()) {
      // Categorize components
      if (['Transform', 'Info'].includes(name)) {
        groups.core.push(name);
      } else if (['Body', 'MotionSource', 'Health'].includes(name)) {
        groups.physics.push(name);
      } else if (['Animation', 'Material'].includes(name)) {
        groups.visual.push(name);
      } else if (['Inventory', 'AI', 'Faction'].includes(name)) {
        groups.gameplay.push(name);
      } else {
        groups.other.push(name);
      }
    }
    
    return groups;
  }
  
  /**
   * Validate component data against schema
   */
  validate(componentName: string, data: any): ValidationResult {
    const schema = this.schemas.get(componentName);
    if (!schema) {
      return {
        valid: false,
        errors: [{ field: componentName, message: 'No schema found for component' }]
      };
    }
    
    const errors: Array<{ field: string; message: string }> = [];
    
    // Check required fields
    if (schema.requiredFields) {
      for (const fieldName of schema.requiredFields) {
        if (data[fieldName] === undefined || data[fieldName] === null) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' is required`
          });
        }
      }
    }
    
    // Validate each field
    for (const [fieldName, fieldMeta] of Object.entries(schema.fields)) {
      const value = data[fieldName];
      
      // Skip validation for undefined optional fields
      if (value === undefined && !fieldMeta.required) {
        continue;
      }
      
      // Type-specific validation
      if (fieldMeta.type === 'number') {
        if (typeof value !== 'number') {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be a number`
          });
        } else {
          if (fieldMeta.min !== undefined && value < fieldMeta.min) {
            errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be >= ${fieldMeta.min}`
            });
          }
          if (fieldMeta.max !== undefined && value > fieldMeta.max) {
            errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be <= ${fieldMeta.max}`
            });
          }
        }
      } else if (fieldMeta.type === 'enum') {
        const allowedValues = fieldMeta.enumOptions?.map(option => option.value) ?? fieldMeta.enumValues;
        if (allowedValues && !allowedValues.includes(value)) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be one of: ${allowedValues.join(', ')}`
          });
        }
      }
      // Add more type-specific validation as needed
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Clear all registered schemas (for testing)
   */
  clear(): void {
    this.schemas.clear();
  }
  
  /**
   * Get schema count
   */
  count(): number {
    return this.schemas.size;
  }
}

// Global registry instance
export const componentSchemaRegistry = new ComponentSchemaRegistry();
