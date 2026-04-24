import React from "react";
import { List, Typography, Badge } from "antd";
import useEventListener from "../hooks/useEventListener";
import { getResource } from "../../ecs";
import { AchievementsResource, UnlockedAchievements } from "../../achievements";
import { useAPI } from "../App";

export const AchievementsList: React.FC = () => {
    const api = useAPI();

    const playerAchievements = getResource<UnlockedAchievements>(api.ecsWorld, "unlockedAchievements").get("Player");
    const allAchievements = getResource<AchievementsResource>(api.ecsWorld, "achievements");

    // Listen for new achievement unlocks
    useEventListener(playerAchievements, "add");
    useEventListener(allAchievements, "set");

    const achievementsList = Array.from(allAchievements.entries()).map(([name, { description }]) => ({
        name,
        description,
        unlocked: playerAchievements.has(name),
    }));

    return <>
        <List
            size="small"
            bordered
            dataSource={achievementsList}
            locale={{ emptyText: "No achievements registered." }}
            renderItem={item => (
                <List.Item style={{ display: "flex", alignItems: "flex-start" }}>
                    <Badge
                        status={item.unlocked ? "success" : "error"}
                        style={{ marginRight: 12, marginTop: 4 }}
                    />
                    <div style={{ flex: 1, textAlign: "left" }}>
                        <Typography.Text strong style={{ display: "block", textAlign: "left" }}>{item.name}</Typography.Text>
                        <div style={{ fontSize: 12, color: "#aaa", textAlign: "left" }}>{item.description}</div>
                    </div>
                </List.Item>
            )}
        />
    </>
};
