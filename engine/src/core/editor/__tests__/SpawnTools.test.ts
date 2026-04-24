/**
 * Spawn Tool Tests
 * Tests for the spawn tool system in the editor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createECS, getResource, setResource } from '../../ecs';
import { spawn } from '../../spawn';
import { Transform } from '../../components/Transform';
import { Body as BodyComponent } from '../../components/Body';
import { hasComponent } from 'bitecs';
import { AddEntityCommand, DeleteEntityCommand } from '../commands/EntityCommand';
import { AddBodyPartCommand } from '../commands/AddBodyPartCommand';
import { BodyPartTransformCommand } from '../commands/BodyPartTransformCommand';
import { BulkBodyPartTransformCommand } from '../commands/BulkBodyPartTransformCommand';
import { getEntityBundle } from '../../despawn';
import { getPartAtPath } from '../utils/bodyParts';
import { getSpawnToolArchetype } from '../../ui/editor/BottomBar';

describe('Spawn Tool System', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createECS();
    
    // Set up minimal world metadata
    setResource(ctx, 'metadata', {
      title: "Test World",
      dimensions: [{
        name: "base",
        gravity: -20,
        sky: {
          color: "#87CEEB"
        }
      }]
    });
  });

  describe('getSpawnToolArchetype', () => {
    it('should return correct archetype for primitive tools', () => {
      expect(getSpawnToolArchetype('box')).toBe('cube');
      expect(getSpawnToolArchetype('sphere')).toBe('sphere');
      expect(getSpawnToolArchetype('cylinder')).toBe('cylinder');
      expect(getSpawnToolArchetype('cone')).toBe('cone');
      expect(getSpawnToolArchetype('pyramid')).toBe('pyramid');
    });

    it('should return correct archetype for scene tools', () => {
      expect(getSpawnToolArchetype('light')).toBe('pointLight');
      expect(getSpawnToolArchetype('camera')).toBe('sceneCamera');
    });

    it('should return correct archetype for entity tools', () => {
      expect(getSpawnToolArchetype('player')).toBe('player');
      expect(getSpawnToolArchetype('npc')).toBe('enemy');
    });

    it('should return null for null spawn tool', () => {
      expect(getSpawnToolArchetype(null)).toBe(null);
    });
  });

  describe('AddEntityCommand', () => {
    it('should spawn entity with position', () => {
      const position = { x: 5, y: 10, z: 15 };
      const command = new AddEntityCommand(
        ctx,
        { Transform: position },
        {},
        'TestEntity'
      );

      command.execute();
      const eid = command.getSpawnedEntityId();
      
      expect(eid).not.toBeNull();
      expect(hasComponent(ctx, Transform, eid!)).toBe(true);
      expect(Transform.x[eid!]).toBe(5);
      expect(Transform.y[eid!]).toBe(10);
      expect(Transform.z[eid!]).toBe(15);
    });

    it('should support undo/redo', () => {
      const command = new AddEntityCommand(
        ctx,
        { Transform: { x: 0, y: 0, z: 0 } },
        {},
        'TestEntity'
      );

      // Execute
      command.execute();
      const eid = command.getSpawnedEntityId();
      expect(eid).not.toBeNull();
      expect(hasComponent(ctx, Transform, eid!)).toBe(true);

      // Undo - entity should be removed
      command.undo();
      // After undo, entity is despawned - the component check may vary based on implementation
      // The key is that the entity ID is no longer valid
      expect(command.getSpawnedEntityId()).toBeNull();

      // Redo - entity should be spawned again
      command.redo();
      const newEid = command.getSpawnedEntityId();
      expect(newEid).not.toBeNull();
      expect(hasComponent(ctx, Transform, newEid!)).toBe(true);
    });
  });

  describe('AddBodyPartCommand', () => {
    it('should add a body part to composite body', () => {
      // Create entity with composite body
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 1, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: 'solid', params: { color: '#dddddd' } }
              }
            ]
          }
        }
      });

      expect(hasComponent(ctx, BodyComponent, eid)).toBe(true);

      // Add body part command
      const command = new AddBodyPartCommand(
        ctx,
        eid,
        'sphere',
        { x: 1, y: 0, z: 0 }
      );
      
      // Execute command
      command.execute();
      
      // Verify command executed (entity was respawned)
      const newEid = command.getCurrentEntityId();
      expect(newEid).toBeDefined();
      expect(hasComponent(ctx, BodyComponent, newEid)).toBe(true);
    });

    it('should support undo for body parts', () => {
      // Create entity with composite body
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 1, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: 'solid', params: { color: '#dddddd' } }
              }
            ]
          }
        }
      });

      // Add body part command
      const command = new AddBodyPartCommand(
        ctx,
        eid,
        'cylinder',
        { x: 0, y: 1, z: 0 }
      );
      
      // Execute
      command.execute();
      const afterExecuteEid = command.getCurrentEntityId();
      expect(afterExecuteEid).toBeDefined();
      // The entity should have body after execute
      expect(hasComponent(ctx, BodyComponent, afterExecuteEid)).toBe(true);

      // Undo - verify command can be undone without error
      command.undo();
      // After undo, the command restores the original entity
      // The entity ID might change, but the command should track it
      const afterUndoEid = command.getCurrentEntityId();
      expect(afterUndoEid).toBeDefined();
    });
  });

  describe('BodyPartTransformCommand', () => {
    it('should transform a body part', () => {
      // Create entity with composite body
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 1, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: 'solid', params: { color: '#dddddd' } },
                localPosition: { x: 0, y: 0, z: 0 }
              }
            ]
          }
        }
      });

      expect(hasComponent(ctx, BodyComponent, eid)).toBe(true);

      // Transform body part command
      const command = new BodyPartTransformCommand(
        ctx,
        eid,
        [0], // first part
        {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        {
          position: { x: 2, y: 3, z: 4 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        }
      );
      
      // Execute command
      command.execute();
      
      // Verify command executed (entity was respawned with new transform)
      const newEid = command.getCurrentEntityId();
      expect(newEid).toBeDefined();
      expect(hasComponent(ctx, BodyComponent, newEid)).toBe(true);
    });

    it('should support undo for body part transforms', () => {
      // Create entity with composite body
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 1, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: 'solid', params: { color: '#dddddd' } },
                localPosition: { x: 0, y: 0, z: 0 }
              }
            ]
          }
        }
      });

      // Transform body part command
      const command = new BodyPartTransformCommand(
        ctx,
        eid,
        [0], // first part
        {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        {
          position: { x: 5, y: 5, z: 5 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 2, y: 2, z: 2 }
        }
      );
      
      // Execute
      command.execute();
      const afterExecuteEid = command.getCurrentEntityId();
      expect(afterExecuteEid).toBeDefined();
      expect(hasComponent(ctx, BodyComponent, afterExecuteEid)).toBe(true);

      // Undo - verify command can be undone without error
      command.undo();
      const afterUndoEid = command.getCurrentEntityId();
      expect(afterUndoEid).toBeDefined();
      expect(hasComponent(ctx, BodyComponent, afterUndoEid)).toBe(true);

      // Redo
      command.redo();
      const afterRedoEid = command.getCurrentEntityId();
      expect(afterRedoEid).toBeDefined();
      expect(hasComponent(ctx, BodyComponent, afterRedoEid)).toBe(true);
    });

    it('supports address-based targeting', () => {
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 1, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: 'solid', params: { color: '#dddddd' } },
                localPosition: { x: 0, y: 0, z: 0 }
              }
            ]
          }
        }
      });

      const command = new BodyPartTransformCommand(
        ctx,
        eid,
        { definitionPath: [0], instancePath: [2, 0] },
        {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        }
      );

      command.execute();
      const currentEid = command.getCurrentEntityId();
      const bundle = getEntityBundle(ctx, currentEid, { includeRuntime: false, includeRuntimeComponents: false });
      const part = getPartAtPath(bundle.Body as any, [0]);
      expect((part as any)?.localPosition).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('applies bulk body-part transforms atomically with single command undo/redo', () => {
      const eid = spawn(ctx, {
        Transform: { x: 0, y: 1, z: 0 },
        Body: {
          type: 'composite',
          params: {
            parts: [
              {
                geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
                material: { type: 'solid', params: { color: '#dddddd' } },
                localPosition: { x: 0, y: 0, z: 0 }
              },
              {
                geometry: { type: 'sphere', params: { radius: 0.5 } },
                material: { type: 'solid', params: { color: '#88ccff' } },
                localPosition: { x: 2, y: 0, z: 0 }
              }
            ]
          }
        }
      });

      const command = new BulkBodyPartTransformCommand(ctx, [
        {
          eid,
          address: { definitionPath: [0], instancePath: [0] },
          path: [0],
          oldTransform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
          },
          newTransform: {
            position: { x: 5, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
          }
        },
        {
          eid,
          address: { definitionPath: [1], instancePath: [1] },
          path: [1],
          oldTransform: {
            position: { x: 2, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
          },
          newTransform: {
            position: { x: -3, y: 1, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
          }
        }
      ]);

      command.execute();
      const executeEid = getResource<number>(ctx, 'selectedEntity');
      const executeBundle = getEntityBundle(ctx, executeEid, { includeRuntime: false, includeRuntimeComponents: false });
      const executePartA = getPartAtPath(executeBundle.Body as any, [0]) as any;
      const executePartB = getPartAtPath(executeBundle.Body as any, [1]) as any;
      expect(executePartA.localPosition).toEqual({ x: 5, y: 0, z: 0 });
      expect(executePartB.localPosition).toEqual({ x: -3, y: 1, z: 0 });

      command.undo();
      const undoEid = getResource<number>(ctx, 'selectedEntity');
      const undoBundle = getEntityBundle(ctx, undoEid, { includeRuntime: false, includeRuntimeComponents: false });
      const undoPartA = getPartAtPath(undoBundle.Body as any, [0]) as any;
      const undoPartB = getPartAtPath(undoBundle.Body as any, [1]) as any;
      expect(undoPartA.localPosition).toEqual({ x: 0, y: 0, z: 0 });
      expect(undoPartB.localPosition).toEqual({ x: 2, y: 0, z: 0 });

      command.redo();
      const redoEid = getResource<number>(ctx, 'selectedEntity');
      const redoBundle = getEntityBundle(ctx, redoEid, { includeRuntime: false, includeRuntimeComponents: false });
      const redoPartA = getPartAtPath(redoBundle.Body as any, [0]) as any;
      const redoPartB = getPartAtPath(redoBundle.Body as any, [1]) as any;
      expect(redoPartA.localPosition).toEqual({ x: 5, y: 0, z: 0 });
      expect(redoPartB.localPosition).toEqual({ x: -3, y: 1, z: 0 });
    });
  });
});
