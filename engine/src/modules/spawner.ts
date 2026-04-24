/**
 * Spawner Module
 * Provides declarative spawning patterns for entity placement
 * 
 * Implements the Hybrid Approach (Option C) with improvements:
 * - Phase 1: Standard { type, params } structure alignment
 * - Phase 2: Extension system (registerType, registerPlacement, etc.)
 * - Phase 3: Cluster, path, Poisson, post-spawn hooks
 * 
 * This file re-exports from the split module for backward compatibility.
 */

// Re-export everything from the split module structure
export * from './spawner/index';
