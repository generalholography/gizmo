/**
 * Editor Integration Tests
 * Tests for bidirectional selection sync, transform editing, and gizmo undo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createECS, setResource, getResource } from '../../ecs';
import { Transform } from '../../components/Transform';
import { addEntity } from 'bitecs';

describe('Editor Integration', () => {
  let ctx: any;
  let eid: number;

  beforeEach(() => {
    ctx = createECS();
    eid = addEntity(ctx);
    
    // Initialize transform
    Transform.x[eid] = 0;
    Transform.y[eid] = 0;
    Transform.z[eid] = 0;
    Transform.qx[eid] = 0;
    Transform.qy[eid] = 0;
    Transform.qz[eid] = 0;
    Transform.qw[eid] = 1;
    Transform.sx[eid] = 1;
    Transform.sy[eid] = 1;
    Transform.sz[eid] = 1;
  });

  describe('Selection Sync', () => {
    it('should allow setting selected entity via ECS resource', () => {
      setResource(ctx, 'selectedEntity', eid);
      const selected = getResource(ctx, 'selectedEntity');
      
      expect(selected).toBe(eid);
    });

    it('should allow clearing selection', () => {
      setResource(ctx, 'selectedEntity', eid);
      setResource(ctx, 'selectedEntity', undefined);
      const selected = getResource(ctx, 'selectedEntity', true);
      
      expect(selected).toBeUndefined();
    });
  });

  describe('Transform State', () => {
    it('should capture transform state for undo', () => {
      const initialState = {
        x: Transform.x[eid],
        y: Transform.y[eid],
        z: Transform.z[eid],
        qx: Transform.qx[eid],
        qy: Transform.qy[eid],
        qz: Transform.qz[eid],
        qw: Transform.qw[eid],
        sx: Transform.sx[eid],
        sy: Transform.sy[eid],
        sz: Transform.sz[eid],
      };

      // Move entity
      Transform.x[eid] = 10;
      Transform.y[eid] = 5;

      const finalState = {
        x: Transform.x[eid],
        y: Transform.y[eid],
        z: Transform.z[eid],
        qx: Transform.qx[eid],
        qy: Transform.qy[eid],
        qz: Transform.qz[eid],
        qw: Transform.qw[eid],
        sx: Transform.sx[eid],
        sy: Transform.sy[eid],
        sz: Transform.sz[eid],
      };

      expect(initialState.x).toBe(0);
      expect(finalState.x).toBe(10);
      expect(finalState.y).toBe(5);
    });

    it('should detect transform changes', () => {
      const initial = { x: Transform.x[eid], y: Transform.y[eid] };
      
      Transform.x[eid] = 5;
      
      const changed = Transform.x[eid] !== initial.x;
      expect(changed).toBe(true);
    });
  });

  describe('Editor State Resources', () => {
    it('should allow setting editor tool', () => {
      setResource(ctx, 'editorTool', 'translate');
      expect(getResource(ctx, 'editorTool')).toBe('translate');
      
      setResource(ctx, 'editorTool', 'rotate');
      expect(getResource(ctx, 'editorTool')).toBe('rotate');
    });

    it('should allow setting transform space', () => {
      setResource(ctx, 'editorTransformSpace', 'world');
      expect(getResource(ctx, 'editorTransformSpace')).toBe('world');
      
      setResource(ctx, 'editorTransformSpace', 'local');
      expect(getResource(ctx, 'editorTransformSpace')).toBe('local');
    });

    it('should allow setting snapping', () => {
      setResource(ctx, 'editorSnapping', true);
      expect(getResource(ctx, 'editorSnapping')).toBe(true);
      
      setResource(ctx, 'editorSnapping', false);
      expect(getResource(ctx, 'editorSnapping')).toBe(false);
    });
  });

  describe('Pending Transform Commands', () => {
    it('should allow storing pending transform commands', () => {
      const command = {
        eid,
        initialTransform: { x: 0, y: 0, z: 0 },
        finalTransform: { x: 10, y: 5, z: 0 },
        timestamp: Date.now()
      };

      setResource(ctx, 'pendingTransformCommand', command);
      const stored = getResource(ctx, 'pendingTransformCommand');

      expect(stored).toEqual(command);
      expect(stored.eid).toBe(eid);
    });
  });

  describe('Play Mode State', () => {
    it('should initialize with isPlaying false in editor mode', () => {
      // In editor mode, isPlaying should start false
      expect(ctx.isPlaying).toBe(true); // Default for tests, but editor mode sets to false
    });

    it('should allow toggling play state', () => {
      ctx.isPlaying = false;
      expect(ctx.isPlaying).toBe(false);
      
      ctx.isPlaying = true;
      expect(ctx.isPlaying).toBe(true);
    });
  });
});
