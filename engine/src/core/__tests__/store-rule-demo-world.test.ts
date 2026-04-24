import { describe, expect, it } from 'vitest';
import world from '../../worlds/store-rule-demo-world.js';

function collectSpawns() {
  const spawns: any[] = [];
  const api = {
    initialize: () => {},
    getModule: () => null,
    registerArchetype: () => {},
    spawn: (bundle: any) => {
      spawns.push(bundle);
      return spawns.length;
    },
  };

  world.setupScene(api as any);
  return spawns;
}

describe('store-rule demo world', () => {
  it('defines a functional Range Sensor entityInRange rule with colliders enabled', () => {
    const spawns = collectSpawns();

    const rangeSensor = spawns.find((entry) => entry?.Info?.name === 'Range Sensor');
    expect(rangeSensor).toBeDefined();

    const firstPart = rangeSensor.Body?.params?.parts?.[0];
    expect(firstPart).toBeDefined();
    expect(firstPart.ignoreCollisions).toBe(true);

    const rangeRule = rangeSensor.Rules?.find((rule: any) => rule?.trigger?.type === 'entityInRange');
    expect(rangeRule).toBeDefined();
    expect(rangeRule.trigger?.params?.range).toBe(0.9);
    expect(rangeRule.actions.some((effect: any) => effect?.type === 'damage')).toBe(true);
    expect(rangeRule.actions.some((effect: any) => effect?.type === 'emitParticles')).toBe(true);
  });

  it('includes lane-1 inventory and stock stations using dedicated store effects', () => {
    const spawns = collectSpawns();

    const giver = spawns.find((entry) => entry?.Info?.name === 'Inventory Giver');
    expect(giver).toBeDefined();
    expect(giver?.Rules?.[0]?.actions?.[0]).toMatchObject({
      type: 'addToInventory',
      target: 'other',
      params: { item: 'healthPotion', count: 2 },
    });

    const remover = spawns.find((entry) => entry?.Info?.name === 'Inventory Remover');
    expect(remover).toBeDefined();
    expect(remover?.Rules?.[0]?.actions?.[0]).toMatchObject({
      type: 'removeFromInventory',
      target: 'other',
      params: { archetype: 'healthPotion', count: 2 },
    });

    const stockDial = spawns.find((entry) => entry?.Info?.name === 'Stock Dial');
    expect(stockDial).toBeDefined();
    expect(stockDial?.Rules?.[0]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'incrementStock',
        target: 'other',
        params: { stock: 'health', delta: -4 },
      }),
      expect.objectContaining({
        type: 'incrementStock',
        target: 'other',
        params: { stock: 'energy', delta: 2 },
      }),
    ]));
  });

  it('includes lane-1 metric stations using setMetric and incrementMetric', () => {
    const spawns = collectSpawns();
    const metricsTerminal = spawns.find((entry) => entry?.Info?.name === 'Metrics Terminal');
    expect(metricsTerminal).toBeDefined();

    expect(metricsTerminal?.Rules?.[0]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'setMetric',
        target: 'other',
        params: { metric: 'lab score', value: 10, subpath: 'lane1' },
      }),
      expect.objectContaining({
        type: 'incrementMetric',
        target: 'other',
        params: { metric: 'lab score', delta: 3, subtype: 'lane1' },
      }),
    ]));
  });
});
