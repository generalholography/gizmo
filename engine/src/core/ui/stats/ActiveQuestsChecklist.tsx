import React from "react";
import { List, theme, Typography } from "antd";
import { CheckSquareFilled, RightSquareOutlined } from "@ant-design/icons";
import useEventListener from "../hooks/useEventListener";
import { getResource } from "../../ecs";
import { AchievementsResource, UnlockedAchievements } from "../../achievements";
import { Metrics } from "../../metrics";
import { useAPI } from "../App";
import type { ConditionDefinition, ValueExpression } from "../../../modules/condition";

function readMetricProgressFromExpression(
    expression: ValueExpression | undefined,
    metrics: Metrics,
): number | undefined {
    if (!expression) return undefined;
    if (expression.type === "metric") {
        const subject = expression.params.subject;
        const metric = expression.params.metric;
        const subtype = expression.params.subtype;
        const scope = typeof subject === "string" ? subject : "Player";
        const value = subtype ? metrics.get(scope, metric, subtype) : metrics.get(scope, metric);
        return typeof value === "number" ? value : undefined;
    }
    if (expression.type === "sum") {
        let sum = 0;
        for (const entry of expression.params.values) {
            const value = readMetricProgressFromExpression(entry, metrics);
            sum += typeof value === "number" ? value : 0;
        }
        return sum;
    }
    return undefined;
}

function extractConditionProgress(condition: ConditionDefinition, metrics: Metrics): { current?: number; target?: number } {
    if (condition.type !== "compare") return {};
    const right = condition.params.right;
    const target = right.type === "literal" && typeof right.params.value === "number"
        ? right.params.value
        : undefined;
    const current = readMetricProgressFromExpression(condition.params.left, metrics);
    return { current, target };
}

export const ActiveQuestsChecklist: React.FC = () => {
    // Detect touch devices for different display limits
    const isTouch = typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    
    const api = useAPI();
    const ctx = api.ecsWorld;

    const playerAchievements = getResource<UnlockedAchievements>(ctx, "unlockedAchievements").get("Player");
    const allAchievements = getResource<AchievementsResource>(ctx, "achievements");
    const metrics = getResource<Metrics>(ctx, "metrics");

    // Listen for new achievement unlocks and metric updates on player TODO: make generic
    useEventListener(playerAchievements, "add");
    useEventListener(allAchievements, "set");
    useEventListener(metrics, "Player");

    // Helper function to calculate completion percentage
    const getCompletionPercentage = (currentValue: any, targetValue: any): number => {
        if (typeof currentValue === "number" && typeof targetValue === "number" && targetValue > 0) {
            return Math.min(currentValue / targetValue, 1) * 100;
        }
        return 0; // Treat non-numeric as 0% complete
    };

    //TODO: memoize
    const achievementsList = Array.from(allAchievements.entries())
        .map(([name, { description, condition }]) => {
            // Try to extract current/target values from condition for display
            let currentValue: any = undefined;
            let targetValue: any = undefined;
            
            const progress = extractConditionProgress(condition as ConditionDefinition, metrics);
            currentValue = progress.current;
            targetValue = progress.target;
            // For nested/reference/other condition types, we can't easily extract values
            
            return {
                name,
                description,
                currentValue,
                targetValue,
                unlocked: playerAchievements.has(name),
            };
        })
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
        })
        // Limit display: 4 on desktop, 1 on mobile
        .slice(0, isTouch ? 1 : 4);

    // Calculate achievement counts for the progress display
    const totalAchievements = allAchievements.size;
    const completedAchievements = playerAchievements.size;

    return (
        (achievementsList.length > 0) && <div>
            <List
                size="small"
                style={isTouch ? undefined : { width: 260 }} // fixed width
                header={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Achievements</span>
                        {totalAchievements > 0 && (
                            <span style={{ fontSize: 12, color: "#aaa" }}>
                                {completedAchievements} / {totalAchievements}
                            </span>
                        )}
                    </div>
                }
                dataSource={achievementsList}
                renderItem={item => (
                    <List.Item style={{ display: "flex", alignItems: "flex-start", background: "transparent" }}>
                        {item.unlocked ? (
                            <CheckSquareFilled style={{ fontSize: 18, marginRight: 10, marginTop: 2, color: "#52c41a" }} />
                        ) : (
                            <RightSquareOutlined style={{ fontSize: 18, color: "#aaa", marginRight: 10, marginTop: 2 }} />
                        )}
                        <div style={{ flex: 1, textAlign: "left" }}>
                            <Typography.Text strong style={{ display: "block", textAlign: "left" }}>{item.name}</Typography.Text>
                            <div style={{ fontSize: 12, color: "#aaa", textAlign: "left" }}>{item.description}</div>
                            {typeof item.currentValue === "number" && typeof item.targetValue === "number" && (
                                <div style={{ fontSize: 12, color: "#aaa", textAlign: "left" }}>
                                    {Math.min(item.currentValue, item.targetValue)} / {item.targetValue}
                                </div>
                            )}
                        </div>
                    </List.Item>
                )}
            />
        </div>
    );
};
