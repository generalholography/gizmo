import { ReactiveSet, ReactiveMap } from "../utils/reactiveTypes";
import { LazyMap } from "../utils/lazyMap";
import { ECSContext, getResource } from "./ecs";
import { MetricsKey } from "./metrics";
import { ConditionDefinition, evaluateConditionWithTrace } from "../modules/condition";

export type Achievement = {
    description: string;
    condition: ConditionDefinition;
};

function isGoalCompleteFor(name: string, achievement: Achievement, eid: MetricsKey, ctx: ECSContext): boolean {
    if (!achievement.condition) {
        console.error('Achievement missing condition field:', achievement);
        return false;
    }

    try {
        return evaluateConditionWithTrace(ctx, achievement.condition, {
            defaultSubject: eid,
            context: { self: eid },
        }, {
            source: { system: "achievement", name, owner: eid },
        }).passed;
    } catch (error) {
        console.error('Error evaluating achievement condition:', error, achievement);
        return false;
    }
}

// Use ReactiveMap for achievements to allow event emitter compatibility
export type AchievementsResource = ReactiveMap<Achievement>;
export type UnlockedAchievements = LazyMap<MetricsKey, ReactiveSet<string>>;

export const checkAchievementsFor = (ctx: ECSContext, id: MetricsKey): void => {
    const achievements: AchievementsResource = getResource<AchievementsResource>(ctx, 'achievements');
    const unlocked: UnlockedAchievements = getResource<UnlockedAchievements>(ctx, 'unlockedAchievements');

    const entityAchievements = unlocked.get(id);

    for (const [name, achievement] of achievements.entries()) {
        if (!entityAchievements.has(name) && isGoalCompleteFor(name, achievement, id, ctx)) {
            entityAchievements.add(name);
        }
    }
}
