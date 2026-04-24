import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveMap } from '../../../../utils/reactiveTypes';
import { ReactiveSet } from '../../../../utils/reactiveTypes';
import { LazyMap } from '../../../../utils/lazyMap';

// Mock the types and data structures we need
interface MockGoal {
    description: string;
    currentValue: (eid: string) => any;
    targetValue: any;
}

describe('ActiveQuestsChecklist sorting and limiting logic', () => {
    let allAchievements: ReactiveMap<MockGoal>;
    let unlockedAchievements: ReactiveSet<string>;

    beforeEach(() => {
        allAchievements = new ReactiveMap<MockGoal>();
        unlockedAchievements = new ReactiveSet<string>();
    });

    // Helper function to calculate completion percentage
    const getCompletionPercentage = (currentValue: any, targetValue: any): number => {
        if (typeof currentValue === "number" && typeof targetValue === "number" && targetValue > 0) {
            return Math.min(currentValue / targetValue, 1) * 100;
        }
        return 0; // Treat non-numeric as 0% complete
    };

    const createAchievementsList = (achievements: ReactiveMap<MockGoal>, unlocked: ReactiveSet<string>) => {
        return Array.from(achievements.entries())
            .map(([name, { description, currentValue, targetValue }]) => ({
                name,
                description,
                currentValue: currentValue("Player"),
                targetValue,
                unlocked: unlocked.has(name),
            }))
            // Sort by incomplete first (by completion % desc), then complete by name
            .sort((a, b) => {
                if (a.unlocked !== b.unlocked) {
                    return a.unlocked ? 1 : -1; // incomplete (false) first
                }
                // For incomplete achievements, sort by completion percentage (highest first)
                if (!a.unlocked && !b.unlocked) {
                    const percentA = getCompletionPercentage(a.currentValue, a.targetValue);
                    const percentB = getCompletionPercentage(b.currentValue, b.targetValue);
                    if (percentA !== percentB) {
                        return percentB - percentA; // Higher percentage first
                    }
                }
                // Fall back to alphabetical sorting
                return a.name.localeCompare(b.name);
            });
    };

    it('sorts incomplete achievements first by completion percentage, then alphabetically', () => {
        // Set up test data with different completion percentages
        allAchievements.set('Achievement A', { 
            description: 'First achievement', 
            currentValue: () => 5, 
            targetValue: 10  // 50% complete
        });
        allAchievements.set('Achievement B', { 
            description: 'Second achievement', 
            currentValue: () => 10, 
            targetValue: 10  // 100% complete (will be unlocked)
        });
        allAchievements.set('Achievement C', { 
            description: 'Third achievement', 
            currentValue: () => 3, 
            targetValue: 10  // 30% complete
        });

        // Mark Achievement B as unlocked
        unlockedAchievements.add('Achievement B');

        const result = createAchievementsList(allAchievements, unlockedAchievements);

        // Should have incomplete achievements first, sorted by completion percentage
        expect(result[0].unlocked).toBe(false);
        expect(result[1].unlocked).toBe(false);
        expect(result[2].unlocked).toBe(true);
        
        // Achievement A (50%) should come before Achievement C (30%)
        expect(result[0].name).toBe('Achievement A'); // 50% complete
        expect(result[1].name).toBe('Achievement C'); // 30% complete
        expect(result[2].name).toBe('Achievement B'); // completed
    });

    it('limits results to 4 on desktop and 1 on mobile', () => {
        // Set up more test data than the limits
        const achievementNames = ['A', 'B', 'C', 'D', 'E', 'F'];
        achievementNames.forEach(name => {
            allAchievements.set(`Achievement ${name}`, { 
                description: `Achievement ${name}`, 
                currentValue: () => 5, 
                targetValue: 10 
            });
        });

        const fullList = createAchievementsList(allAchievements, unlockedAchievements);

        // Test desktop limit (4)
        const desktopList = fullList.slice(0, 4);
        expect(desktopList).toHaveLength(4);

        // Test mobile limit (1)
        const mobileList = fullList.slice(0, 1);
        expect(mobileList).toHaveLength(1);
    });

    it('handles empty achievements list', () => {
        const result = createAchievementsList(allAchievements, unlockedAchievements);
        expect(result).toHaveLength(0);
    });

    it('maintains consistent ordering with mixed unlocked status', () => {
        // Set up achievements with mixed unlocked status
        allAchievements.set('Z Achievement', { 
            description: 'Last alphabetically', 
            currentValue: () => 5, 
            targetValue: 10  // 50% complete
        });
        allAchievements.set('A Achievement', { 
            description: 'First alphabetically', 
            currentValue: () => 10, 
            targetValue: 10  // 100% complete (will be unlocked)
        });
        allAchievements.set('M Achievement', { 
            description: 'Middle alphabetically', 
            currentValue: () => 3, 
            targetValue: 10  // 30% complete
        });

        // Mark A Achievement as unlocked
        unlockedAchievements.add('A Achievement');

        const result = createAchievementsList(allAchievements, unlockedAchievements);

        // Incomplete first, sorted by completion percentage: Z (50%) before M (30%)
        expect(result[0].name).toBe('Z Achievement');
        expect(result[0].unlocked).toBe(false);
        expect(result[1].name).toBe('M Achievement');
        expect(result[1].unlocked).toBe(false);
        
        // Then complete: A (alphabetical)
        expect(result[2].name).toBe('A Achievement');
        expect(result[2].unlocked).toBe(true);
    });

    it('sorts incomplete achievements by completion percentage (highest first)', () => {
        // Set up achievements with different completion percentages
        allAchievements.set('Low Progress', { 
            description: 'Low progress achievement', 
            currentValue: () => 1, 
            targetValue: 10  // 10% complete
        });
        allAchievements.set('High Progress', { 
            description: 'High progress achievement', 
            currentValue: () => 8, 
            targetValue: 10  // 80% complete
        });
        allAchievements.set('Medium Progress', { 
            description: 'Medium progress achievement', 
            currentValue: () => 5, 
            targetValue: 10  // 50% complete
        });

        const result = createAchievementsList(allAchievements, unlockedAchievements);

        // Should be sorted by completion percentage: highest first
        expect(result[0].name).toBe('High Progress');   // 80%
        expect(result[1].name).toBe('Medium Progress'); // 50%
        expect(result[2].name).toBe('Low Progress');    // 10%
    });

    it('treats non-numeric achievements as 0% complete for sorting', () => {
        // Set up mixed numeric and non-numeric achievements
        allAchievements.set('String Achievement', { 
            description: 'String-based achievement', 
            currentValue: () => 'partial', 
            targetValue: 'complete'  // Non-numeric
        });
        allAchievements.set('Numeric Achievement', { 
            description: 'Numeric achievement', 
            currentValue: () => 3, 
            targetValue: 10  // 30% complete
        });
        allAchievements.set('Boolean Achievement', { 
            description: 'Boolean achievement', 
            currentValue: () => false, 
            targetValue: true  // Non-numeric
        });

        const result = createAchievementsList(allAchievements, unlockedAchievements);

        // Numeric achievement (30%) should come first, then non-numeric sorted alphabetically
        expect(result[0].name).toBe('Numeric Achievement');    // 30% > 0%
        expect(result[1].name).toBe('Boolean Achievement');    // 0% (alphabetically first)
        expect(result[2].name).toBe('String Achievement');     // 0% (alphabetically second)
    });
});