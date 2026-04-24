/**
 * Trigger Module - Generic timing and event system
 * 
 * Phase 6.1: Generic trigger module for time-based, event-based, and proximity-based activation.
 * Designed to be reusable across the engine, not just for spawners.
 * 
 * Architecture:
 * - Follows Module base class pattern
 * - Supports multiple trigger types (time, interval, event, proximity)
 * - Serializable state for save/load
 * - Callback-based execution for flexibility
 * - Independent of spawner module for reusability
 */

import { Module } from "./Module";
import { ECSContext } from "../core/ecs";
import { ConditionDefinition, ConditionEvaluationTrace, evaluateConditionWithTrace } from "./condition";
import { MetricsKey } from "../core/metrics";

// ============================================================================
// Type Definitions
// ============================================================================

/** Position for proximity triggers */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Trigger definition types
 * - immediate: Fire immediately on registration
 * - time: Fire after a delay (one-shot)
 * - interval: Fire repeatedly at intervals
 * - event: Fire when a named event occurs
 * - proximity: Fire when position is near trigger point (TODO: Phase 8)
 */
export type TriggerDefinition =
  | {
      type: "immediate";
      params: {
      };
    }
  | {
      type: "time";
      params: {
        /** Delay in seconds before firing */
        delay: number;
      };
    }
  | {
      type: "interval";
      params: {
        /** Interval in seconds between firings */
        interval: number;
        /** Optional: maximum number of times to fire (undefined = infinite) */
        maxCount?: number;
        /** Optional: initial delay before first firing */
        initialDelay?: number;
      };
    }
  | {
      type: "event";
      params: {
        /** Event name to listen for */
        event: string;
        /** Optional: only fire once */
        once?: boolean;
      };
    }
  | {
      type: "proximity";
      params: {
        /** Position to check proximity to */
        position: Position;
        /** Radius for proximity check */
        radius: number;
        /** Optional: only fire once */
        once?: boolean;
      };
    }
  | {
      type: "condition";
      params: {
        /** Subject entity ID to evaluate condition against */
        subject: MetricsKey;
        /** Condition to evaluate */
        condition: ConditionDefinition;
        /** Check interval in seconds (how often to evaluate the condition) */
        checkInterval?: number;
        /** Optional: only fire once */
        once?: boolean;
      };
    };

/**
 * @deprecated Triggers no longer use callbacks. Systems should check hasFired flag.
 * This type is kept for backward compatibility but should not be used.
 */
export type TriggerCallback = (ctx: ECSContext, triggerName: string, data?: any) => void;

/**
 * Runtime trigger state
 * Tracks execution state and timing
 * 
 * NO CALLBACKS: Systems should check hasFired and react accordingly.
 * This follows ECS pattern and ensures full serializability.
 */
export interface TriggerState {
  /** Trigger definition */
  definition: TriggerDefinition;
  /** Whether trigger is active (can fire) */
  isActive: boolean;
  /** Whether trigger has completed (for one-shot triggers) */
  isComplete: boolean;
  /** Time since trigger was registered (seconds) */
  timeSinceStart: number;
  /** Time since last firing (seconds) - for interval triggers */
  timeSinceLastFire: number;
  /** Number of times trigger has fired */
  fireCount: number;
  /** Whether trigger has fired this frame (reset each frame) */
  hasFired: boolean;
  /** Most recent condition evaluation trace (condition triggers only) */
  lastConditionTrace?: ConditionEvaluationTrace;
}

/**
 * Serializable trigger state for save/load
 */
export interface SerializedTriggerState {
  isActive: boolean;
  isComplete: boolean;
  timeSinceStart: number;
  timeSinceLastFire: number;
  fireCount: number;
}

// ============================================================================
// Trigger Module Class
// ============================================================================

/**
 * TriggerModule - Manages time-based, event-based, and proximity-based triggers
 * 
 * Follows Module base class pattern for consistency with engine architecture.
 * Can be used by any system that needs timing/event functionality.
 * 
 * Features:
 * - Multiple trigger types (immediate, time, interval, event, proximity)
 * - Callback-based execution
 * - Active/paused state management
 * - Serialization support for save/load
 * - Event emission and subscription
 * 
 * Usage:
 * ```typescript
 * // Get the trigger module (automatically initialized)
 * const trigger = getModule(ctx, 'trigger');
 * 
 * // Register a time-based trigger using standard module pattern
 * trigger.register('spawn_wave', {
 *   type: 'time',
 *   params: { delay: 30 }
 * }, (ctx, name) => {
 *   console.log('Wave triggered!');
 * });
 * 
 * // Trigger updates automatically via updateTriggerSystem
 * // Or manually call: trigger.update(deltaTime);
 * ```
 */
export class TriggerModule extends Module<TriggerDefinition, TriggerState> {
  private eventListeners: Map<string, Set<string>> = new Map();
  
  constructor(ctx: ECSContext) {
    // Initialize with type factories for each trigger type
    super(ctx, {});
    
    // Register all built-in trigger types
    this.registerType("immediate", (params: any) => this.createTriggerState("immediate", params));
    this.registerType("time", (params: any) => this.createTriggerState("time", params));
    this.registerType("interval", (params: any) => this.createTriggerState("interval", params));
    this.registerType("event", (params: any) => this.createTriggerState("event", params));
    this.registerType("proximity", (params: any) => this.createTriggerState("proximity", params));
    this.registerType("condition", (params: any) => this.createTriggerState("condition", params));
  }
  
  /**
   * Create initial trigger state for a given type
   */
  private createTriggerState(type: string, params: any): TriggerState {
    return {
      definition: { type, params } as TriggerDefinition,
      isActive: true,
      isComplete: false,
      timeSinceStart: 0,
      timeSinceLastFire: 0,
      fireCount: 0,
      hasFired: false,
      lastConditionTrace: undefined,
    };
  }
  
  /**
   * Get trigger state by name (from base Module registry)
   */
  private getTriggerState(name: string): TriggerState | undefined {
    const def = this.definitionsByName[name];
    if (!def) return undefined;
    const id = this.resolve(name);
    return this.get(id);
  }
  
  /**
   * Get all registered trigger names
   */
  private getAllTriggerNames(): string[] {
    return Object.keys(this.definitionsByName);
  }
  
  /**
   * Register a trigger using the standard module pattern
   * 
   * NO CALLBACKS: Systems should check hasFired flag and react.
   * This ensures full serializability and follows ECS patterns.
   */
  register(name: string, def: TriggerDefinition): TriggerState;
  register(name: string, baseName: string, overrides: Partial<TriggerDefinition>): TriggerState;
  register(
    name: string,
    defOrBase: TriggerDefinition | string,
    overrides?: Partial<TriggerDefinition>
  ): TriggerState {
    // Determine if second param is a base name (string) or definition (object)
    let definition: TriggerDefinition;
    
    if (typeof defOrBase === "string") {
      // register(name, baseName, overrides)
      // Call base Module.register() to handle base + overrides
      definition = super.register(name, defOrBase, overrides!).definition;
    } else {
      // register(name, definition)
      definition = defOrBase;
    }
    
    // Register event listener if it's an event trigger
    if (definition.type === "event") {
      const eventName = definition.params.event;
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, new Set());
      }
      this.eventListeners.get(eventName)!.add(name);
    }
    
    // If we haven't called super.register yet (definition path), call it now
    let state: TriggerState;
    if (typeof defOrBase !== "string") {
      state = super.register(name, definition);
    } else {
      // Already called super.register, just get the state
      state = this.getTriggerState(name)!;
    }
    
    // Fire immediately if it's an immediate trigger
    if (definition.type === "immediate" && state.isActive && !state.isComplete) {
      this.fireTrigger(name);
    }
    
    return state;
  }
  
  /**
   * Reset all hasFired flags at the start of each frame
   * Should be called by the trigger system before processing triggers
   */
  resetFiredFlags(): void {
    for (const name of this.getAllTriggerNames()) {
      const state = this.getTriggerState(name);
      if (state) {
        state.hasFired = false;
      }
    }
  }
  
  /**
   * Update all active triggers
   * Call this every frame from a system
   * 
   * @param deltaTime Time elapsed since last update (seconds)
   */
  update(deltaTime: number): void {
    for (const name of this.getAllTriggerNames()) {
      const state = this.getTriggerState(name);
      if (!state || !state.isActive || state.isComplete) {
        continue;
      }
      
      state.timeSinceStart += deltaTime;
      state.timeSinceLastFire += deltaTime;
      
      const def = state.definition;
      
      // Handle time-based triggers
      if (def.type === "time") {
        if (state.timeSinceStart >= def.params.delay) {
          this.fireTrigger(name);
        }
      }
      
      // Handle interval triggers
      else if (def.type === "interval") {
        const hasInitialDelay = def.params.initialDelay !== undefined;
        const initialDelay = def.params.initialDelay ?? 0;
        const timeSinceInitial = state.timeSinceStart - initialDelay;
        
        // Only fire if we've passed the initial delay
        if (timeSinceInitial >= 0) {
          // Calculate how many times trigger should have fired based on time elapsed
          // With explicit initialDelay: fire at initialDelay, then every interval
          //   shouldHaveFired = floor(timeSinceInitial / interval) + 1
          // Without initialDelay: fire at interval, 2*interval, 3*interval
          //   shouldHaveFired = floor(timeSinceStart / interval)
          
          let shouldHaveFired: number;
          if (hasInitialDelay) {
            // Fire at initialDelay boundary, then every interval after
            shouldHaveFired = Math.floor(timeSinceInitial / def.params.interval) + 1;
          } else {
            // Fire at interval boundaries only
            shouldHaveFired = Math.floor(state.timeSinceStart / def.params.interval);
          }
          
          // Fire multiple times if needed (e.g., large delta spanning multiple intervals)
          while (state.fireCount < shouldHaveFired) {
            // Check if max count reached before firing
            if (def.params.maxCount !== undefined && state.fireCount >= def.params.maxCount) {
              state.isComplete = true;
              break;
            }
            
            this.fireTrigger(name);
          }
          
          // Check max count after firing loop
          if (def.params.maxCount !== undefined && state.fireCount >= def.params.maxCount) {
            state.isComplete = true;
          }
        }
      }
      
      // Handle condition triggers
      else if (def.type === "condition") {
        const checkInterval = def.params.checkInterval ?? 1.0; // Default: check every second
        
        // Check if it's time to evaluate the condition
        if (state.timeSinceLastFire >= checkInterval) {
          try {
            const trace = evaluateConditionWithTrace(this.ctx, def.params.condition, {
              defaultSubject: def.params.subject,
              context: { self: def.params.subject },
            }, {
              source: { system: "trigger", name, owner: def.params.subject, trigger: "condition" },
            });
            state.lastConditionTrace = trace;
            const isConditionMet = trace.passed;

            // Reset timer after check regardless of result
            state.timeSinceLastFire = 0;
            
            if (isConditionMet) {
              this.fireTrigger(name);

              // Mark as complete if once flag is set
              if (def.params.once) {
                state.isComplete = true;
              }
            }
          } catch (error) {
            console.error(`Error evaluating condition for trigger '${name}':`, error);
          }
        }
      }
      
      // Proximity triggers handled separately (TODO: Phase 8)
      // Would need integration with spatial system
    }
  }
  
  /**
   * Fire a trigger manually
   * Internal use for timer-based triggers, can also be called externally
   * 
   * @param name Trigger name
   */
  /**
   * Fire a trigger - sets hasFired flag for systems to check
   * No callbacks - follows ECS pattern where systems poll state
   */
  private fireTrigger(name: string): void {
    const state = this.getTriggerState(name);
    if (!state || !state.isActive) {
      return;
    }
    
    state.fireCount++;
    state.timeSinceLastFire = 0;
    state.hasFired = true;  // Set flag for systems to check
    
    // Mark one-shot triggers as complete
    if (state.definition.type === "time" || state.definition.type === "immediate") {
      state.isComplete = true;
    } else if (state.definition.type === "event" && state.definition.params.once) {
      state.isComplete = true;
    } else if (state.definition.type === "proximity" && state.definition.params.once) {
      state.isComplete = true;
    } else if (state.definition.type === "condition" && state.definition.params.once) {
      state.isComplete = true;
    }
  }
  
  /**
   * Emit an event to fire all event-based triggers listening for it
   * 
   * @param eventName Name of the event
   */
  emit(eventName: string): void {
    const listeners = this.eventListeners.get(eventName);
    if (!listeners) {
      return;
    }
    
    for (const triggerName of listeners) {
      const state = this.getTriggerState(triggerName);
      if (!state || !state.isActive || state.isComplete) {
        continue;
      }
      
      this.fireTrigger(triggerName);
    }
  }
  
  /**
   * Manually fire a trigger by name
   * Useful for testing or manual control
   * 
   * @param name Trigger name
   */
  fire(name: string): void {
    this.fireTrigger(name);
  }
  
  /**
   * Pause a trigger (prevents it from firing)
   * 
   * @param name Trigger name
   */
  pause(name: string): void {
    const state = this.getTriggerState(name);
    if (state) {
      state.isActive = false;
    }
  }
  
  /**
   * Resume a paused trigger
   * 
   * @param name Trigger name
   */
  resume(name: string): void {
    const state = this.getTriggerState(name);
    if (state) {
      state.isActive = true;
    }
  }
  
  /**
   * Reset a trigger to initial state
   * 
   * @param name Trigger name
   */
  reset(name: string): void {
    const state = this.getTriggerState(name);
    if (state) {
      state.timeSinceStart = 0;
      state.timeSinceLastFire = 0;
      state.fireCount = 0;
      state.isComplete = false;
      state.isActive = true;
    }
  }
  
  /**
   * Remove a trigger
   * 
   * @param name Trigger name
   */
  remove(name: string): void {
    const state = this.getTriggerState(name);
    if (state) {
      // Remove from event listeners if it's an event trigger
      if (state.definition.type === "event") {
        const eventName = state.definition.params.event;
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
          listeners.delete(name);
          if (listeners.size === 0) {
            this.eventListeners.delete(eventName);
          }
        }
      }
      
      // Remove from base Module (definition)
      delete this.definitionsByName[name];
    }
  }
  
  /**
   * Get trigger state
   * 
   * @param name Trigger name
   * @returns Trigger state or undefined if not found
   */
  getState(name: string): TriggerState | undefined {
    return this.getTriggerState(name);
  }
  
  /**
   * Check if trigger is active
   * 
   * @param name Trigger name
   * @returns True if trigger is active and not complete
   */
  isActive(name: string): boolean {
    const state = this.getTriggerState(name);
    return state ? state.isActive && !state.isComplete : false;
  }
  
  /**
   * Check if trigger is complete
   * 
   * @param name Trigger name
   * @returns True if trigger has completed
   */
  isComplete(name: string): boolean {
    return this.getTriggerState(name)?.isComplete ?? false;
  }
  
  /**
   * Get all trigger names
   * 
   * @returns Array of trigger names
   */
  getTriggerNames(): string[] {
    return this.getAllTriggerNames();
  }
  
  /**
   * Serialize trigger states for save/load
   * 
   * @returns Serialized state map
   */
  serializeState(): Record<string, SerializedTriggerState> {
    const serialized: Record<string, SerializedTriggerState> = {};
    
    for (const name of this.getAllTriggerNames()) {
      const state = this.getTriggerState(name);
      if (state) {
        serialized[name] = {
          isActive: state.isActive,
          isComplete: state.isComplete,
          timeSinceStart: state.timeSinceStart,
          timeSinceLastFire: state.timeSinceLastFire,
          fireCount: state.fireCount,
        };
      }
    }
    
    return serialized;
  }
  
  /**
   * Clear all triggers
   */
  clear(): void {
    // Clear all definitions from base Module
    for (const name of this.getAllTriggerNames()) {
      delete this.definitionsByName[name];
    }
    this.eventListeners.clear();
  }
}

// ============================================================================
// Module Factory
// ============================================================================

export const triggerModule = (ctx: ECSContext) => new TriggerModule(ctx);
