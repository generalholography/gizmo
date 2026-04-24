import { addComponent, addEntity } from 'bitecs';
import { afterEach, describe, expect, it } from 'vitest';
import { createECS, setResource } from '../../ecs';
import { StableID, Transform } from '../../components';
import { findAssetPrimaryEntity, resolveEditorSessionConfig } from '../sessionConfig';

describe('editor session config', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('prefers the configured primary stable id in asset scope', () => {
    const ctx = createECS();
    const first = addEntity(ctx);
    addComponent(ctx, Transform, first);
    addComponent(ctx, StableID, first);
    StableID.id[first] = 10;

    const second = addEntity(ctx);
    addComponent(ctx, Transform, second);
    addComponent(ctx, StableID, second);
    StableID.id[second] = 24;

    setResource(
      ctx,
      'editorSessionConfig',
      resolveEditorSessionConfig({
        scope: 'asset',
        primaryEntityStableId: 24,
      }),
    );

    expect(findAssetPrimaryEntity(ctx)).toBe(second);
  });
});
