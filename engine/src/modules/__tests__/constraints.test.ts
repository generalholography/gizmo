import { addComponent, addEntity, createWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { ECSContext } from '../../core/ecs';
import { Info } from '../../core/components/Info';
import { Transform } from '../../core/components/Transform';
import { constraintsModule } from '../spawner/constraints';
import { encode } from '../../utils/strings';

function createMockContext(): ECSContext {
  const ctx = createWorld() as ECSContext;
  (ctx as any).modules = new Map();
  (ctx as any).resources = new Map();
  return ctx;
}

function addTransformEntity(ctx: ECSContext, x: number, z: number, name?: string): number {
  const eid = addEntity(ctx);
  addComponent(ctx, Transform, eid);
  Transform.x[eid] = x;
  Transform.y[eid] = 0;
  Transform.z[eid] = z;

  if (name) {
    addComponent(ctx, Info, eid);
    Info.name[eid] = encode(name);
  }

  return eid;
}

describe('ConstraintsModule', () => {
  it('enforces entityDistance min/max against nearest entity', () => {
    const ctx = createMockContext();
    addTransformEntity(ctx, 0, 0);

    const constraints = constraintsModule(ctx);

    expect(
      constraints.passesAll([{ type: 'entityDistance', min: 3 } as any], { x: 1, y: 0, z: 1 }, ctx),
    ).toBe(false);

    expect(
      constraints.passesAll([{ type: 'entityDistance', min: 3, max: 10 } as any], { x: 6, y: 0, z: 0 }, ctx),
    ).toBe(true);

    expect(
      constraints.passesAll([{ type: 'entityDistance', max: 4 } as any], { x: 10, y: 0, z: 0 }, ctx),
    ).toBe(false);
  });

  it('filters entityDistance by entityType when provided', () => {
    const ctx = createMockContext();
    addTransformEntity(ctx, 0, 0, 'tree');
    addTransformEntity(ctx, 20, 0, 'rock');

    const constraints = constraintsModule(ctx);

    expect(
      constraints.passesAll(
        [{ type: 'entityDistance', entityType: 'tree', min: 5 } as any],
        { x: 3, y: 0, z: 0 },
        ctx,
      ),
    ).toBe(false);

    expect(
      constraints.passesAll(
        [{ type: 'entityDistance', entityType: 'rock', min: 5 } as any],
        { x: 3, y: 0, z: 0 },
        ctx,
      ),
    ).toBe(true);
  });

  it('enforces density limits per cell', () => {
    const ctx = createMockContext();
    addTransformEntity(ctx, 1, 1);
    addTransformEntity(ctx, 2, 2);

    const constraints = constraintsModule(ctx);

    expect(
      constraints.passesAll([{ type: 'density', maxPerUnit: 2, unitSize: 10 } as any], { x: 5, y: 0, z: 5 }, ctx),
    ).toBe(false);

    expect(
      constraints.passesAll([{ type: 'density', maxPerUnit: 2, unitSize: 10 } as any], { x: 25, y: 0, z: 25 }, ctx),
    ).toBe(true);
  });
});
