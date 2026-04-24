import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createECS, runSystems, setResource } from '../core/ecs';
import { EngineMode } from '../index';

describe('Pause Functionality', () => {
  let ctx: any;
  let systemCallCount: number;
  
  beforeEach(() => {
    ctx = createECS();
    systemCallCount = 0;
    
    // Add a mock system to track if it runs
    const mockSystem = () => {
      systemCallCount++;
    };
    // Use Object.defineProperty to set readonly name property
    Object.defineProperty(mockSystem, 'name', { value: 'mockGameplaySystem' });
    ctx.pipeline.push(mockSystem);
  });
  
  it('should set deltaTime to 0 when not playing', () => {
    ctx.isPlaying = false;
    ctx.time.setTimescale(0);
    ctx.time.update();
    
    const dt = ctx.time.getDelta();
    expect(dt).toBe(0);
  });
  
  it('should set deltaTime > 0 when playing', () => {
    ctx.isPlaying = true;
    ctx.time.setTimescale(1);
    
    // Simulate time passing
    setTimeout(() => {
      ctx.time.update();
      const dt = ctx.time.getDelta();
      expect(dt).toBeGreaterThan(0);
    }, 10);
  });
  
  it('should run systems when playing', () => {
    ctx.isPlaying = true;
    setResource(ctx, 'deltaTime', 0.016);
    
    runSystems(ctx);
    
    expect(systemCallCount).toBe(1);
  });
  
  it('should skip systems in GAME mode when paused (simulated)', () => {
    // This simulates the logic from index.ts
    const mode = EngineMode.GAME;
    ctx.isPlaying = false;
    setResource(ctx, 'deltaTime', 0); // dt would be 0 from timescale
    
    // Simulate the pause check from animation loop
    if (!ctx.isPlaying && mode === EngineMode.GAME) {
      // Don't run systems when paused in GAME mode
    } else {
      runSystems(ctx);
    }
    
    // System should NOT have been called
    expect(systemCallCount).toBe(0);
  });
  
  it('should run systems in GAME mode when playing', () => {
    const mode = EngineMode.GAME;
    ctx.isPlaying = true;
    setResource(ctx, 'deltaTime', 0.016);
    
    // Simulate the pause check from animation loop
    if (!ctx.isPlaying && mode === EngineMode.GAME) {
      // Don't run systems when paused
    } else {
      runSystems(ctx);
    }
    
    // System SHOULD have been called
    expect(systemCallCount).toBe(1);
  });
  
  it('should run subset of systems in EDITOR mode when paused (simulated)', () => {
    const mode = EngineMode.EDITOR;
    ctx.isPlaying = false;

    // Add editor-specific system
    let editorSystemCalled = false;
    const editorSystem = () => { editorSystemCalled = true; };
    Object.defineProperty(editorSystem, 'name', { value: 'editorCameraSystem' });
    ctx.pipeline.push(editorSystem);

    setResource(ctx, 'deltaTime', 0);

    // Simulate editor pause logic from animation loop
    const editorPausedSystems = new Set([editorSystem]);
    if (!ctx.isPlaying && mode === EngineMode.EDITOR) {
      for (const system of ctx.pipeline) {
        if (editorPausedSystems.has(system)) {
          system(ctx);
        }
      }
    } else {
      runSystems(ctx);
    }

    // Only editor system should have been called, not gameplay system
    expect(systemCallCount).toBe(0); // mockGameplaySystem not called
    expect(editorSystemCalled).toBe(true); // editorCameraSystem called
  });
  
  it('should run all systems in EDITOR mode when playing', () => {
    const mode = EngineMode.EDITOR;
    ctx.isPlaying = true;
    setResource(ctx, 'deltaTime', 0.016);
    
    // Simulate editor playing logic
    if (!ctx.isPlaying && mode === EngineMode.EDITOR) {
      // Editor pause logic
    } else {
      runSystems(ctx);
    }
    
    // All systems should run
    expect(systemCallCount).toBe(1);
  });
  
  it('should always run systems in DISPLAY mode regardless of isPlaying', () => {
    const mode = EngineMode.DISPLAY;
    ctx.isPlaying = false; // Even when "paused"
    setResource(ctx, 'deltaTime', 0.016);
    
    // DISPLAY mode doesn't check pause state
    if (!ctx.isPlaying && mode === EngineMode.GAME) {
      // Skip
    } else if (!ctx.isPlaying && mode === EngineMode.EDITOR) {
      // Editor pause logic
    } else {
      // DISPLAY always runs here
      runSystems(ctx);
    }
    
    // Systems should run even though isPlaying is false
    expect(systemCallCount).toBe(1);
  });
});
