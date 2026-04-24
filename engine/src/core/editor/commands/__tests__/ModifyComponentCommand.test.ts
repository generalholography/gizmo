import { beforeEach, describe, expect, it } from 'vitest';
import { defineQuery } from 'bitecs';
import { createECS, getResource, setResource } from '../../../ecs';
import { applyBundle, spawn } from '../../../spawn';
import { ModifyComponentCommand } from '../ModifyComponentCommand';
import { StableID, Info } from '../../../components';
import { decode } from '../../../../utils/strings';
import { getEntityBundle } from '../../../despawn';
import { Transform } from '../../../components/Transform';

describe('ModifyComponentCommand', () => {
  let ctx: ReturnType<typeof createECS>;

  beforeEach(() => {
    ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
  });

  it('does not duplicate entities when undoing multiple structural edits', () => {
    const eid = spawn(ctx, { Info: { name: 'Original' } });

    const firstEdit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Info',
      { name: 'Second' },
      true
    );

    firstEdit.execute();
    const eidAfterFirst = firstEdit.getCurrentEntityId();

    const secondEdit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eidAfterFirst,
      'Info',
      { name: 'Third' },
      true
    );

    secondEdit.execute();

    // Undo twice and ensure we end up with a single entity with the original data
    secondEdit.undo();
    firstEdit.undo();

    const stableQuery = defineQuery([StableID]);
    const entities = stableQuery(ctx);

    expect(entities.length).toBe(1);

    const finalEid = entities[0];
    expect(StableID.id[finalEid]).toBe(StableID.id[eid]);
    expect(decode(Info.name[finalEid])).toBe('Original');
  });

  it('merges component data for non-structural edits', () => {
    const eid = spawn(ctx, { Info: { name: 'Original', description: 'First' } });

    const edit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Info',
      { name: 'UpdatedName' },
      false
    );

    edit.execute();

    expect(decode(Info.name[eid])).toBe('UpdatedName');
    expect(decode(Info.description[eid])).toBe('First');
  });

  it('merges component data for structural edits', () => {
    const eid = spawn(ctx, { Info: { name: 'Original', description: 'First' } });
    setResource(ctx, 'selectedEntity', eid);
    setResource(ctx, 'selectedEntities', [eid]);

    const edit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Info',
      { name: 'UpdatedName' },
      true
    );

    edit.execute();

    const currentEid = edit.getCurrentEntityId();
    expect(decode(Info.name[currentEid])).toBe('UpdatedName');
    expect(decode(Info.description[currentEid])).toBe('First');
    expect(getResource(ctx, 'selectedEntity')).toBe(currentEid);
    expect(getResource(ctx, 'selectedEntities')).toEqual([currentEid]);
  });

  it('replaces array-based component payloads instead of object-merging arrays', () => {
    const initialRules = [{ trigger: { type: 'event', params: { event: 'a' } } }];
    const nextRules = [{ trigger: { type: 'event', params: { event: 'b' } } }];
    const eid = spawn(ctx, { Rules: initialRules });

    const edit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Rules',
      nextRules,
      false
    );

    edit.execute();
    const afterExecute = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(Array.isArray(afterExecute.Rules)).toBe(true);
    expect(afterExecute.Rules[0]?.trigger?.params?.event).toBe('b');

    edit.undo();
    const afterUndo = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(Array.isArray(afterUndo.Rules)).toBe(true);
    expect(afterUndo.Rules[0]?.trigger?.params?.event).toBe('a');
  });

  it('restores undo state for live-applied non-structural edits when previous snapshot is provided', () => {
    const eid = spawn(ctx, {
      Transform: { x: 0, y: 0, z: 0 },
    });

    const beforeLiveApply = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    }).Transform;

    // Simulate inspector live preview before command commit.
    applyBundle(ctx, eid, { Transform: { x: 12 } });
    expect(Transform.x[eid]).toBe(12);

    const edit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Transform',
      { x: 12 },
      false,
      { previousComponentData: beforeLiveApply }
    );

    edit.execute();
    edit.undo();
    expect(Transform.x[eid]).toBe(0);

    edit.redo();
    expect(Transform.x[eid]).toBe(12);
  });

  it('restores structural undo state for live-applied edits when previous bundle snapshot is provided', () => {
    const eid = spawn(ctx, { Info: { name: 'Origina1' } });
    const previousBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    // Simulate inspector preview before commit.
    applyBundle(ctx, eid, { Info: { name: 'Preview1' } });

    const edit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Info',
      { name: 'Preview1' },
      true,
      {
        previousBundle,
        previousComponentData: previousBundle.Info,
      }
    );

    edit.execute();
    edit.undo();

    const restoredEid = edit.getCurrentEntityId();
    expect(decode(Info.name[restoredEid])).toBe('Origina1');
  });

  it('preserves part name/tag undo-redo for structural Body edits with preview snapshots', () => {
    const eid = spawn(ctx, {
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              type: 'primitive',
              name: 'Arm',
              tag: 'arm',
              geometry: { type: 'box', params: { lengthX: 1, lengthY: 1, lengthZ: 1 } },
            },
          ],
        },
      },
    });

    const previousBundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    const previewBody = JSON.parse(JSON.stringify(previousBundle.Body));
    previewBody.params.parts[0].name = 'Upper Arm';
    previewBody.params.parts[0].tag = 'upperArm';
    applyBundle(ctx, eid, { Body: previewBody });

    const edit = new ModifyComponentCommand(
      ctx,
      {} as any,
      eid,
      'Body',
      previewBody,
      true,
      {
        previousBundle,
        previousComponentData: previousBundle.Body,
      },
    );

    edit.execute();
    const afterExecuteEid = edit.getCurrentEntityId();
    const afterExecuteBundle = getEntityBundle(ctx, afterExecuteEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(afterExecuteBundle.Body?.params?.parts?.[0]?.name).toBe('Upper Arm');
    expect(afterExecuteBundle.Body?.params?.parts?.[0]?.tag).toBe('upperArm');

    edit.undo();
    const afterUndoEid = edit.getCurrentEntityId();
    const afterUndoBundle = getEntityBundle(ctx, afterUndoEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(afterUndoBundle.Body?.params?.parts?.[0]?.name).toBe('Arm');
    expect(afterUndoBundle.Body?.params?.parts?.[0]?.tag).toBe('arm');

    edit.redo();
    const afterRedoEid = edit.getCurrentEntityId();
    const afterRedoBundle = getEntityBundle(ctx, afterRedoEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    expect(afterRedoBundle.Body?.params?.parts?.[0]?.name).toBe('Upper Arm');
    expect(afterRedoBundle.Body?.params?.parts?.[0]?.tag).toBe('upperArm');
  });
});
