/**
 * Component Editor Registry
 * Extensible registry for custom component editors in the inspector
 */

import React from 'react';

export interface ComponentEditorProps {
  eid: number;
}

export type ComponentEditorComponent = React.ComponentType<ComponentEditorProps>;

export class ComponentEditorRegistry {
  private editors = new Map<string, ComponentEditorComponent>();

  /**
   * Register a custom editor for a component
   */
  register(componentName: string, editor: ComponentEditorComponent): void {
    this.editors.set(componentName, editor);
  }

  /**
   * Get the editor for a component, if one exists
   */
  get(componentName: string): ComponentEditorComponent | null {
    return this.editors.get(componentName) ?? null;
  }

  /**
   * Check if a custom editor is registered for a component
   */
  has(componentName: string): boolean {
    return this.editors.has(componentName);
  }

  /**
   * Get all registered component names
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.editors.keys());
  }

  /**
   * Unregister a component editor
   */
  unregister(componentName: string): boolean {
    return this.editors.delete(componentName);
  }

  /**
   * Clear all registered editors
   */
  clear(): void {
    this.editors.clear();
  }
}

// Global registry instance
export const componentEditorRegistry = new ComponentEditorRegistry();
