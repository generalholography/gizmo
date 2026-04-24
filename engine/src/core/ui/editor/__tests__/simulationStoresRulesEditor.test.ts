import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NEW_STORE_TYPE,
  getConditionValidationErrors,
  getAvailableStoreNames,
  RULE_TRIGGER_TYPES,
  buildStoreDefinitions,
  getRuleTargetValidationErrors,
  storesToBundle,
} from '../SimulationStoresRulesEditor';

describe('SimulationStoresRulesEditor', () => {
  it('exposes all supported rule trigger types for editing', () => {
    expect(RULE_TRIGGER_TYPES).toEqual([
      'immediate',
      'event',
      'interact',
      'collisionEnter',
      'entityInRange',
      'timeElapsed',
      'die',
      'primaryAction',
      'secondaryAction',
      'time',
      'interval',
      'proximity',
    ]);
  });

  it('defaults newly added stores to stock type', () => {
    expect(DEFAULT_NEW_STORE_TYPE).toBe('stock');
  });

  it('only offers unselected registered stores in the add-store dropdown', () => {
    const available = getAvailableStoreNames(
      ['inventory', 'health', 'pickedUpBy', 'discoveredBy'],
      [
        { store: 'inventory', value: { size: 1, selectedItemIndex: 0, items: [] } },
        { store: 'health', value: { current: 5, max: 10, min: 0 } },
      ],
    );

    expect(available).toEqual(['pickedUpBy', 'discoveredBy']);
  });

  it('returns no available stores when all registered stores are already present', () => {
    const available = getAvailableStoreNames(
      ['inventory', 'health'],
      [
        { store: 'inventory', value: { size: 1, selectedItemIndex: 0, items: [] } },
        { store: 'health', value: { current: 5, max: 10, min: 0 } },
      ],
    );

    expect(available).toEqual([]);
  });

  it('prefers authoritative Stores when present', () => {
    const stores = buildStoreDefinitions({
      Stores: [{ store: 'inventory', value: { size: 2, selectedItemIndex: 1, items: [] } }],
      Inventory: { size: 9, selectedItemIndex: 0, items: ['legacy'] },
    });

    expect(stores).toEqual([
      { store: 'inventory', value: { size: 2, selectedItemIndex: 1, items: [] } },
    ]);
  });

  it('normalizes legacy stock maps to named stock stores and round-trips correctly', () => {
    const components = {
      Inventory: { size: 3, selectedItemIndex: 1, items: ['crate'] },
      Stock: {
        health: { current: 5, max: 10, min: 0 },
        energy: { current: 2, max: 6, min: 0 },
      },
      DiscoveredBy: [1001, 1002],
    };

    const stores = buildStoreDefinitions(components);
    expect(stores).toEqual([
      { store: 'inventory', value: { size: 3, selectedItemIndex: 1, items: ['crate'] } },
      { store: 'health', value: { current: 5, max: 10, min: 0 } },
      { store: 'energy', value: { current: 2, max: 6, min: 0 } },
      { store: 'discoveredBy', value: [1001, 1002] },
    ]);

    expect(storesToBundle(stores, {
      inventory: 'inventory',
      health: 'stock',
      energy: 'stock',
      discoveredBy: 'stableIdSet',
    })).toEqual({
      Stores: stores,
      Inventory: { size: 3, selectedItemIndex: 1, items: ['crate'] },
      Stock: {
        health: { current: 5, max: 10, min: 0 },
        energy: { current: 2, max: 6, min: 0 },
      },
      DiscoveredBy: [1001, 1002],
      PickedUpBy: [],
    });
  });

  it('flags unavailable trigger context targets in rules editor validation', () => {
    const errors = getRuleTargetValidationErrors({
      trigger: { type: 'collisionEnter' },
      actions: { type: 'damage', target: 'user', params: { amount: 1 } },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("cannot resolve target 'user'");
  });

  it('accepts user targets on action triggers in rules editor validation', () => {
    const errors = getRuleTargetValidationErrors({
      trigger: { type: 'primaryAction' },
      actions: { type: 'heal', target: 'user', params: { amount: 1 } },
    });

    expect(errors).toEqual([]);
  });

  it('preserves optional rule priority through stores/rules editor round-trips', () => {
    const rule = {
      trigger: { type: 'interact' },
      priority: 7,
      actions: { type: 'emitEvent', target: 'self', params: { name: 'x' } },
    };

    const errors = getRuleTargetValidationErrors(rule);
    expect(errors).toEqual([]);
    expect(rule.priority).toBe(7);
  });

  it('validates malformed condition definitions in rules', () => {
    const errors = getRuleTargetValidationErrors({
      trigger: { type: 'interact' },
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: { type: 'metric', params: { metric: 'xp' } },
        },
      },
      actions: { type: 'emitEvent', target: 'self', params: { name: 'ok' } },
    });

    expect(errors.some((entry) => entry.includes('condition.params.right'))).toBe(true);
  });

  it('does not emit generic params-object errors for transient condition type switches', () => {
    const errors = getConditionValidationErrors({
      type: 'compare',
      params: undefined,
    });

    expect(errors.some((entry) => entry.includes('params must be an object'))).toBe(false);
    expect(errors.some((entry) => entry.includes('condition.params.operator'))).toBe(true);
  });

  it('accepts reusable reference conditions with parameterized value expressions', () => {
    const errors = getConditionValidationErrors({
      type: 'reference',
      params: {
        name: 'score_at_least',
        args: {
          minScore: { type: 'literal', params: { value: 5 } },
        },
      },
    });

    expect(errors).toEqual([]);
  });

  it('validates top-level rule condition payloads with canonical compare expressions', () => {
    const errors = getRuleTargetValidationErrors({
      trigger: { type: 'interval', params: { interval: 1 } },
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: { type: 'query', params: { query: 'positionAxis', params: { axis: 'y' } } },
          right: { type: 'literal', params: { value: 1 } },
        },
      },
      actions: { type: 'emitEvent', target: 'self', params: { name: 'fire' } },
    });

    expect(errors).toEqual([]);
  });

  it('rejects deprecated custom condition type in editor validation', () => {
    const errors = getConditionValidationErrors({
      type: 'custom',
      params: {},
    });

    expect(errors[0]).toContain('is not a supported condition type');
  });
});
