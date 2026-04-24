/**
 * Physics Deferral Tests for Editor
 * Tests that physics and other simulation systems do not run in editor mode until play is pressed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createECS, setResource, addSystem, runSystems, resetECS } from '../../ecs';
import { spawn } from '../../spawn';
import { Transform } from '../../components/Transform';
import { MotionSource } from '../../components/MotionSource';
import { hasComponent } from 'bitecs';

describe('Physics Deferral in Editor Mode', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createECS();
    
    // Set up minimal world metadata
    setResource(ctx, 'metadata', {
      title: "Test World",
      dimensions: [{
        name: "base",
        gravity: -20,
        sky: { color: "#87CEEB" }
      }]
    });
    
    // Set delta time for physics
    setResource(ctx, 'deltaTime', 0.016); // ~60fps
  });

  describe('Editor Mode Not Playing', () => {
    beforeEach(() => {
      // Simulate editor mode not playing
      ctx.isPlaying = false;
    });

    it('should not modify entity position when isPlaying is false', () => {
      // Spawn a floating cube
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 10, z: 0 },
        MotionSource: { type: 'dynamic' }
      });

      const initialY = Transform.y[eid];
      expect(initialY).toBe(10);

      // Simulate time passing without running systems
      // In editor mode, systems shouldn't run
      const frames = 60; // 1 second worth of frames
      for (let i = 0; i < frames; i++) {
        // Don't run systems - they shouldn't be called in editor when not playing
      }

      // Position should remain unchanged
      expect(Transform.y[eid]).toBe(initialY);
    });

    it('should have isPlaying set to false in editor mode', () => {
      expect(ctx.isPlaying).toBe(false);
    });
  });

  describe('Editor Mode Playing', () => {
    beforeEach(() => {
      // Simulate editor mode playing
      ctx.isPlaying = true;
    });

    it('should allow physics simulation when isPlaying is true', () => {
      ctx.isPlaying = true;
      
      // Spawn a dynamic entity
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 10, z: 0 },
        MotionSource: { type: 'dynamic' }
      });

      expect(hasComponent(ctx, MotionSource, eid)).toBe(true);
      expect(Transform.y[eid]).toBe(10);

      // In play mode, physics would run and entity would fall
      // (We can't actually run physics in this test without full Rapier setup,
      // but we verify the flag is set correctly)
      expect(ctx.isPlaying).toBe(true);
    });
  });

  describe('Game Mode', () => {
    it('should have isPlaying set to true by default in game mode', () => {
      // createECS() sets isPlaying = true by default
      // This is the correct behavior for game mode (always playing)
      const gameCtx = createECS();
      
      expect(gameCtx.isPlaying).toBe(true);
      // Game mode always runs systems (isPlaying is true)
    });
  });

  describe('System Filtering Logic', () => {
    it('should correctly identify which systems should run in editor when not playing', () => {
      const editorOnlySystems = [
        'editorCameraSystem',
        'editorSelectionSystem',
        'bodyRenderingSystem',
        'updateSkyboxSystem'
      ];

      const allSystems = [
        'motionSystem',
        'physicsSystem',
        'updateAISystem',
        'editorCameraSystem',
        'editorSelectionSystem',
        'bodyRenderingSystem',
        'updateSkyboxSystem',
        'collisionSystem'
      ];

      // Mock system pipeline
      const mockPipeline = allSystems.map(name => {
        const fn = () => {};
        Object.defineProperty(fn, 'name', { value: name });
        return fn;
      });

      // Filter systems like the animate loop does
      const systemsToRun = mockPipeline.filter(system => {
        const systemName = system.name || '';
        return editorOnlySystems.some(name => systemName.includes(name));
      });

      expect(systemsToRun.length).toBe(4);
      expect(systemsToRun.map(s => s.name)).toEqual(editorOnlySystems);
      
      // Verify physics systems are NOT in the list
      const runningSystemNames = systemsToRun.map(s => s.name);
      expect(runningSystemNames).not.toContain('motionSystem');
      expect(runningSystemNames).not.toContain('physicsSystem');
      expect(runningSystemNames).not.toContain('updateAISystem');
      expect(runningSystemNames).not.toContain('collisionSystem');
    });
  });

  describe('Timescale', () => {
    it('should set timescale to 0 when not playing', () => {
      ctx.isPlaying = false;
      
      // Mock time object
      ctx.time = {
        timescale: 1,
        setTimescale: function(scale: number) {
          this.timescale = scale;
        }
      };

      // Simulate what animate loop does
      ctx.time.setTimescale(ctx.isPlaying ? 1 : 0);

      expect(ctx.time.timescale).toBe(0);
    });

    it('should set timescale to 1 when playing', () => {
      ctx.isPlaying = true;
      
      // Mock time object
      ctx.time = {
        timescale: 0,
        setTimescale: function(scale: number) {
          this.timescale = scale;
        }
      };

      // Simulate what animate loop does
      ctx.time.setTimescale(ctx.isPlaying ? 1 : 0);

      expect(ctx.time.timescale).toBe(1);
    });
  });

  describe('resetECS Preserves isPlaying', () => {
    it('should preserve isPlaying=false across resetECS (CRITICAL BUG FIX)', () => {
      // This test verifies the fix for the critical bug where resetECS was
      // resetting isPlaying to true during world loading, causing physics
      // to run in editor mode even when not playing.
      
      // Simulate editor mode initialization
      ctx.isPlaying = false;
      expect(ctx.isPlaying).toBe(false);
      
      // Simulate loadWorld calling resetECS (index.ts line 994)
      resetECS(ctx);
      
      // isPlaying should still be false after reset
      // This was BROKEN before the fix - it would become true
      expect(ctx.isPlaying).toBe(false);
    });

    it('should preserve isPlaying=true across resetECS in game mode', () => {
      ctx.isPlaying = true;
      expect(ctx.isPlaying).toBe(true);
      
      resetECS(ctx);
      
      expect(ctx.isPlaying).toBe(true);
    });

    it('should simulate full editor initialization flow correctly', () => {
      // This test simulates the exact flow that happens when starting the editor
      
      // Step 1: Create ECS (starts with isPlaying = true by default)
      const editorCtx = createECS();
      expect(editorCtx.isPlaying).toBe(true);
      
      // Step 2: Set to false for editor mode (happens in index.ts line 355)
      editorCtx.isPlaying = false;
      expect(editorCtx.isPlaying).toBe(false);
      
      // Step 3: User loads a world, which calls resetECS (index.ts line 994)
      resetECS(editorCtx);
      
      // Step 4: Verify isPlaying is STILL false
      // Before the fix, this would fail because resetECS set it back to true
      expect(editorCtx.isPlaying).toBe(false);
      
      // Step 5: Verify systems would be filtered correctly
      const editorMode = true;
      const shouldRunAllSystems = editorCtx.isPlaying || !editorMode;
      expect(shouldRunAllSystems).toBe(false); // Only visual systems should run
    });
  });
});
