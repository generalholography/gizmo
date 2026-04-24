import { describe, it, expect, beforeEach } from 'vitest';
import { createECS, setResource } from '../ecs';
import { Metrics } from '../metrics';
import { checkAchievementsFor, AchievementsResource, UnlockedAchievements } from '../achievements';
import { ReactiveMap } from '../../utils/reactiveTypes';
import { LazyMap } from '../../utils/lazyMap';
import { ReactiveSet } from '../../utils/reactiveTypes';
import { getConditionModule } from '../../modules/condition';

describe('achievements with conditions', () => {
  let ctx: any;
  let metrics: Metrics;
  let achievements: AchievementsResource;
  let unlocked: UnlockedAchievements;

  beforeEach(() => {
    ctx = createECS();
    metrics = new Metrics(ctx);
    achievements = new ReactiveMap<any>();
    unlocked = new LazyMap<any, ReactiveSet<string>>(() => new ReactiveSet<string>());
    
    setResource(ctx, 'metrics', metrics);
    setResource(ctx, 'achievements', achievements);
    setResource(ctx, 'unlockedAchievements', unlocked);
  });

  it('should unlock achievement when condition is satisfied', () => {
    achievements.set('First Item', {
      description: 'Pick up your first item',
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'items picked up',
          targetValue: 1
        }
      }
    });

    // Set metric value to satisfy achievement
    metrics.set('Player', 'items picked up', 1);

    // Check achievements
    checkAchievementsFor(ctx, 'Player');

    // Verify achievement was unlocked
    expect(unlocked.get('Player').has('First Item')).toBe(true);
  });

  it('should not unlock achievement when condition is not satisfied', () => {
    achievements.set('Five Items', {
      description: 'Pick up 5 items',
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'items picked up',
          targetValue: 5
        }
      }
    });

    // Set metric value that doesn't satisfy achievement
    metrics.set('Player', 'items picked up', 3);

    // Check achievements
    checkAchievementsFor(ctx, 'Player');

    // Verify achievement was not unlocked
    expect(unlocked.get('Player').has('Five Items')).toBe(false);
  });

  it('should work with subtype metrics', () => {
    achievements.set('Pizza Delivery', {
      description: 'Pick up a pizza box',
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'items picked up',
          subtype: 'Pizza Box',
          targetValue: 1
        }
      }
    });

    // Set metric value
    metrics.set('Player', 'items picked up', 'Pizza Box', 1);

    // Check achievements
    checkAchievementsFor(ctx, 'Player');

    // Verify achievement was unlocked
    expect(unlocked.get('Player').has('Pizza Delivery')).toBe(true);
  });

  it('should work with sum conditions', () => {
    achievements.set('Building Explorer', {
      description: 'Visit 5 different buildings',
      condition: {
        type: 'sum',
        params: {
          metrics: [
            { metric: 'discoveries', subtype: 'Building A' },
            { metric: 'discoveries', subtype: 'Building B' },
            { metric: 'discoveries', subtype: 'Building C' }
          ],
          targetValue: 5
        }
      }
    });

    // Set metric values
    metrics.set('Player', 'discoveries', 'Building A', 2);
    metrics.set('Player', 'discoveries', 'Building B', 2);
    metrics.set('Player', 'discoveries', 'Building C', 1);

    // Check achievements
    checkAchievementsFor(ctx, 'Player');

    // Verify achievement was unlocked
    expect(unlocked.get('Player').has('Building Explorer')).toBe(true);
  });

  it('should only unlock achievement once', () => {
    achievements.set('First Item', {
      description: 'Pick up your first item',
      condition: {
        type: 'greaterThanOrEqual',
        params: {
          metric: 'items picked up',
          targetValue: 1
        }
      }
    });

    // Set metric value
    metrics.set('Player', 'items picked up', 1);

    // Check achievements first time
    checkAchievementsFor(ctx, 'Player');
    expect(unlocked.get('Player').has('First Item')).toBe(true);
    expect(unlocked.get('Player').size).toBe(1);

    // Increase metric value
    metrics.set('Player', 'items picked up', 5);

    // Check achievements again
    checkAchievementsFor(ctx, 'Player');

    // Verify achievement is still only unlocked once
    expect(unlocked.get('Player').size).toBe(1);
  });

  it('should work with reusable referenced conditions', () => {
    const conditionLibrary = getConditionModule(ctx);
    conditionLibrary.register('score_at_least', {
      type: 'compare',
      params: {
        operator: 'gte',
        left: { type: 'metric', params: { metric: 'score' } },
        right: { type: 'parameter', params: { name: 'minScore', defaultValue: 0 } },
      },
    });

    achievements.set('High Score', {
      description: 'Reach 100 points',
      condition: {
        type: 'reference',
        params: {
          name: 'score_at_least',
          args: {
            minScore: { type: 'literal', params: { value: 100 } },
          },
        },
      },
    });

    // Set metric value
    metrics.set('Player', 'score', 150);

    // Check achievements
    checkAchievementsFor(ctx, 'Player');

    // Verify achievement was unlocked
    expect(unlocked.get('Player').has('High Score')).toBe(true);
  });

  it('emits canonical condition traces for achievement checks', () => {
    const conditionTraces: any[] = [];
    setResource(ctx, 'conditionTraceBuffer', conditionTraces);

    achievements.set('Traceable Achievement', {
      description: 'Unlock with trace',
      condition: {
        type: 'compare',
        params: {
          operator: 'gte',
          left: { type: 'metric', params: { metric: 'xp' } },
          right: { type: 'literal', params: { value: 1 } },
        },
      },
    });

    metrics.set('Player', 'xp', 1);
    checkAchievementsFor(ctx, 'Player');

    expect(unlocked.get('Player').has('Traceable Achievement')).toBe(true);
    expect(conditionTraces).toHaveLength(1);
    expect(conditionTraces[0].source?.system).toBe('achievement');
    expect(conditionTraces[0].source?.name).toBe('Traceable Achievement');
  });
});
