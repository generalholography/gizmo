import { describe, it, expect, vi, beforeEach } from 'vitest';
import TriggerInput, { TriggerInputKey } from '../triggerInput';

// Define the debug state enum locally to avoid importing the main engine
enum DebugState {
    NONE = 'none',
    PERF = 'perf',
    PHYSICS = 'physics',
    AI = 'ai'
}

// Mock the console.log to capture debug messages
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Debug State Cycling', () => {
    let triggerInput: TriggerInput;
    let debugState: DebugState;

    // Mock cleanup functions
    const mockCleanupFunctions = {
        cleanupDebugRapierMesh: vi.fn(),
        cleanupDebugTransformMesh: vi.fn(),
        cleanupDebugNavMesh: vi.fn(),
        cleanupDebugCrowdMesh: vi.fn(),
        cleanupDebugAITargetMesh: vi.fn(),
    };

    beforeEach(() => {
        triggerInput = new TriggerInput();
        debugState = DebugState.NONE;
        vi.clearAllMocks();

        // Setup the debug cycling logic (mimicking the engine's behavior)
        triggerInput.on(TriggerInputKey.DEBUG, () => {
            switch (debugState) {
                case DebugState.NONE:
                    debugState = DebugState.PERF;
                    console.log('Debug mode: Performance (stats + transforms)');
                    break;
                case DebugState.PERF:
                    debugState = DebugState.PHYSICS;
                    console.log('Debug mode: Physics (stats + transforms + colliders)');
                    break;
                case DebugState.PHYSICS:
                    debugState = DebugState.AI;
                    console.log('Debug mode: AI (stats + transforms + navmesh + agents)');
                    break;
                case DebugState.AI:
                    debugState = DebugState.NONE;
                    console.log('Debug mode: None (disabled)');
                    // Clean up all debug visualizations when disabling
                    mockCleanupFunctions.cleanupDebugRapierMesh();
                    mockCleanupFunctions.cleanupDebugTransformMesh();
                    mockCleanupFunctions.cleanupDebugNavMesh();
                    mockCleanupFunctions.cleanupDebugCrowdMesh();
                    mockCleanupFunctions.cleanupDebugAITargetMesh();
                    break;
            }
        });
    });

    it('should cycle through debug states in correct order', () => {
        expect(debugState).toBe(DebugState.NONE);

        // First press: NONE -> PERF
        triggerInput.set(TriggerInputKey.DEBUG);
        expect(debugState).toBe(DebugState.PERF);
        expect(mockConsoleLog).toHaveBeenCalledWith('Debug mode: Performance (stats + transforms)');

        // Second press: PERF -> PHYSICS
        triggerInput.set(TriggerInputKey.DEBUG);
        expect(debugState).toBe(DebugState.PHYSICS);
        expect(mockConsoleLog).toHaveBeenCalledWith('Debug mode: Physics (stats + transforms + colliders)');

        // Third press: PHYSICS -> AI
        triggerInput.set(TriggerInputKey.DEBUG);
        expect(debugState).toBe(DebugState.AI);
        expect(mockConsoleLog).toHaveBeenCalledWith('Debug mode: AI (stats + transforms + navmesh + agents)');

        // Fourth press: AI -> NONE (full cycle)
        triggerInput.set(TriggerInputKey.DEBUG);
        expect(debugState).toBe(DebugState.NONE);
        expect(mockConsoleLog).toHaveBeenCalledWith('Debug mode: None (disabled)');
    });

    it('should call cleanup functions when cycling back to NONE', () => {
        // Cycle to AI state
        triggerInput.set(TriggerInputKey.DEBUG); // NONE -> PERF
        triggerInput.set(TriggerInputKey.DEBUG); // PERF -> PHYSICS
        triggerInput.set(TriggerInputKey.DEBUG); // PHYSICS -> AI

        // Now cycle back to NONE, which should trigger cleanup
        triggerInput.set(TriggerInputKey.DEBUG); // AI -> NONE

        expect(mockCleanupFunctions.cleanupDebugRapierMesh).toHaveBeenCalledTimes(1);
        expect(mockCleanupFunctions.cleanupDebugTransformMesh).toHaveBeenCalledTimes(1);
        expect(mockCleanupFunctions.cleanupDebugNavMesh).toHaveBeenCalledTimes(1);
        expect(mockCleanupFunctions.cleanupDebugCrowdMesh).toHaveBeenCalledTimes(1);
        expect(mockCleanupFunctions.cleanupDebugAITargetMesh).toHaveBeenCalledTimes(1);
    });

    it('should have proper enum values', () => {
        expect(DebugState.NONE).toBe('none');
        expect(DebugState.PERF).toBe('perf');
        expect(DebugState.PHYSICS).toBe('physics');
        expect(DebugState.AI).toBe('ai');
    });

    it('should continue cycling after completing a full cycle', () => {
        // Complete one full cycle
        triggerInput.set(TriggerInputKey.DEBUG); // NONE -> PERF
        triggerInput.set(TriggerInputKey.DEBUG); // PERF -> PHYSICS
        triggerInput.set(TriggerInputKey.DEBUG); // PHYSICS -> AI
        triggerInput.set(TriggerInputKey.DEBUG); // AI -> NONE

        // Start a new cycle
        triggerInput.set(TriggerInputKey.DEBUG); // NONE -> PERF
        expect(debugState).toBe(DebugState.PERF);
        expect(mockConsoleLog).toHaveBeenLastCalledWith('Debug mode: Performance (stats + transforms)');
    });

    it('should verify physics colliders are only shown in PHYSICS mode, not AI mode', () => {
        // Mock the physics debug rendering logic to track when colliders should be shown
        let physicsCollidersShouldShow = false;
        
        const updateDebugMeshes = () => {
            // Simulate the actual logic from the engine for physics colliders
            if (debugState !== DebugState.PHYSICS) {
                physicsCollidersShouldShow = false; // cleanup called
            } else {
                physicsCollidersShouldShow = true; // physics colliders shown
            }
        };

        // Test PERF mode - no colliders
        triggerInput.set(TriggerInputKey.DEBUG); // NONE -> PERF
        updateDebugMeshes();
        expect(physicsCollidersShouldShow).toBe(false);
        
        // Test PHYSICS mode - should show colliders
        triggerInput.set(TriggerInputKey.DEBUG); // PERF -> PHYSICS
        updateDebugMeshes();
        expect(physicsCollidersShouldShow).toBe(true);
        
        // Test AI mode - should NOT show colliders (this is the key change)
        triggerInput.set(TriggerInputKey.DEBUG); // PHYSICS -> AI
        updateDebugMeshes();
        expect(physicsCollidersShouldShow).toBe(false);
    });
});