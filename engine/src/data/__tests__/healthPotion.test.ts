import { describe, expect, it } from 'vitest';
import healthPotion from '../healthPotion';

describe('healthPotion data', () => {
  it('uses self-use primaryAction range so consume is not aim-dependent', () => {
    const primaryRule = healthPotion.Rules.find((rule: any) => rule?.trigger?.type === 'primaryAction');
    expect(primaryRule).toBeDefined();
    expect(primaryRule?.trigger?.params?.range).toBe(0);
    expect(primaryRule?.actions?.[0]?.type).toBe('heal');
    expect(primaryRule?.actions?.[0]?.target).toBe('other');
  });
});
