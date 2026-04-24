/**
 * Selection Module
 * 
 * Follows Module pattern for:
 * - Serialization support
 * - Maintainability
 * - Usability
 * - Runtime extensibility
 * 
 * Core Principles Followed:
 * 1. ✅ Extends Module<SelectionDefinition, SelectionResolved>
 * 2. ✅ Uses {type, params} structure
 * 3. ✅ Uses registerType() for selection strategies
 * 4. ✅ register() returns SelectionResolved
 * 5. ✅ Calls addDefinition() for all registrations
 * 6. ✅ Built-in selections registered in constructor
 */

import { Position, WeightedEntity, SelectionDefinition, EntityRef } from './types';
import { ECSContext } from "../../core/ecs";
import { Module } from "../Module";
import { evaluateConditionWithTrace } from "../condition";

// ============================================================================
// Selection Resolved Type
// ============================================================================

/**
 * Resolved selection - a function that selects an entity based on context
 */
export interface SelectionResolved {
  select: (index: number, position: Position, ctx?: ECSContext) => string;
}

// ============================================================================
// Selection Module Class
// ============================================================================

export class SelectionModule extends Module<SelectionDefinition, SelectionResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {});
    
    // Register all built-in selection types
    this.registerType('single', (params: any) => ({
      select: () => params.entity
    }));
    
    this.registerType('random', (params: any) => ({
      select: () => {
        if (params.entities.length === 0) {
          throw new Error('Random selection requires at least one entity');
        }
        return params.entities[Math.floor(Math.random() * params.entities.length)];
      }
    }));
    
    this.registerType('weighted', (params: any) => ({
      select: () => {
        if (params.options.length === 0) {
          throw new Error('Weighted selection requires at least one option');
        }
        
        const totalWeight = params.options.reduce((sum: number, o: WeightedEntity) => sum + o.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const option of params.options) {
          random -= option.weight;
          if (random <= 0) return option.entity;
        }
        
        return params.options[params.options.length - 1].entity;
      }
    }));
    
    this.registerType('sequence', (params: any) => ({
      select: (index: number) => {
        if (params.entities.length === 0) {
          throw new Error('Sequence selection requires at least one entity');
        }
        
        if (params.loop !== false) {
          return params.entities[index % params.entities.length];
        }
        return params.entities[Math.min(index, params.entities.length - 1)];
      }
    }));
    
    this.registerType('conditional', (params: any) => ({
      select: (index: number, position: Position, ctx?: ECSContext) => {
        if (!ctx) {
          // No context, return first condition's entity or fallback
          return params.conditions[0]?.entity ?? params.conditions[0]?.fallback ?? '';
        }

        const defaultSubject = params.defaultSubject ?? 0;
        const baseQueryContext = typeof params.queryContext === "object" && params.queryContext !== null
          ? params.queryContext
          : {};

        for (const rule of params.conditions) {
          const conditionResult = evaluateConditionWithTrace(
            ctx,
            rule.condition,
            {
              defaultSubject,
              context: { self: defaultSubject },
              queryContext: {
                ...baseQueryContext,
                position,
                index,
              },
            },
            {
              source: { system: "spawner" },
            },
          );

          if (conditionResult.passed) {
            return rule.entity;
          }
        }

        // Return first rule fallback, then explicit params fallback, then first rule entity.
        for (const rule of params.conditions) {
          if (rule.fallback) return rule.fallback;
        }

        if (params.fallback) return params.fallback;
        return params.conditions[0]?.entity ?? '';
      }
    }));
  }
  
  /**
   * Select an entity using a selection definition
   */
  select(
    selection: SelectionDefinition,
    index: number,
    position: Position,
    ctx?: ECSContext
  ): string {
    const id = this.resolve(selection);
    const resolved = this.get(id);
    return resolved.select(index, position, ctx);
  }
}

// ============================================================================
// Helper for EntityRef selection (backward compatibility)
// ============================================================================

/** Select an entity from EntityRef (string, array, or weighted array) */
export function selectEntityFromRef(ref: EntityRef, index?: number): string {
  if (typeof ref === 'string') return ref;
  
  if (Array.isArray(ref)) {
    if (ref.length === 0) throw new Error('Empty entity array');
    
    // Check if it's weighted entities
    if (typeof ref[0] === 'object' && 'weight' in ref[0]) {
      const weighted = ref as WeightedEntity[];
      const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
      let random = Math.random() * totalWeight;
      for (const w of weighted) {
        random -= w.weight;
        if (random <= 0) return w.entity;
      }
      return weighted[weighted.length - 1].entity;
    }
    
    // Regular array - random selection or by index
    const entities = ref as string[];
    if (index !== undefined) {
      return entities[index % entities.length];
    }
    return entities[Math.floor(Math.random() * entities.length)];
  }
  
  throw new Error('Invalid entity reference');
}

// ============================================================================
// Module Factory
// ============================================================================

export const selectionModule = (ctx: ECSContext) => new SelectionModule(ctx);
