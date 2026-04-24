import { describe, expect, it } from 'vitest';
import { ECSContext } from '../../core/ecs';
import { groupOperationModule } from '../groupOperation';

function createMockContext(): ECSContext {
  return {
    modules: new Map(),
    resources: new Map(),
  } as unknown as ECSContext;
}

describe('GroupOperationModule', () => {
  it('resolves undefined operation to none', () => {
    const module = groupOperationModule(createMockContext());
    const operation = module.resolveOperation(undefined);

    expect(operation).toEqual({ type: 'none', params: {} });
  });

  it('normalizes taper and mirror params with defaults', () => {
    const module = groupOperationModule(createMockContext());

    const taper = module.resolveOperation({ type: 'taper', params: {} } as any);
    const mirror = module.resolveOperation({ type: 'mirror', params: {} } as any);

    expect(taper).toEqual({ type: 'taper', params: { axis: 'y', factor: 0 } });
    expect(mirror).toEqual({ type: 'mirror', params: { axis: 'x', planeOffset: 0, sourceSide: 'both' } });
  });

  it('normalizes place operation defaults and exposes type guards', () => {
    const module = groupOperationModule(createMockContext());
    const place = module.resolveOperation({ type: 'place', params: {} } as any);

    expect(place.type).toBe('place');
    expect(place.params.orientation).toBe('none');
    expect(place.params.placement.type).toBe('points');
    expect(module.isPlacementOperation(place)).toBe(true);
    expect(module.isCsgOperation(place)).toBe(false);
    expect(module.isMeshOperation(place)).toBe(false);
  });

  it('preserves explicit place orientation settings', () => {
    const module = groupOperationModule(createMockContext());
    const place = module.resolveOperation({ type: 'place', params: { orientation: 'fixed', fixedYaw: Math.PI / 2 } } as any);

    expect(place.params.orientation).toBe('fixed');
    expect(place.params.fixedYaw).toBeCloseTo(Math.PI / 2, 5);
  });
});
