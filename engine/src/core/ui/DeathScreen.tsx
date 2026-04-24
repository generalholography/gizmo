import React, { useEffect, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { MetricsTable } from "./stats/MetricsTable";
import { AchievementsList } from "./stats/AchievementsList";
import { useAPI } from "./App";
import { getResource } from "../ecs";
import { DeathScreenButton, PlayerDeathEvent } from "../..";

type DeathScreenProps = {
    deathEvent: PlayerDeathEvent;
    onClose: () => void;
};

const DeathScreen: React.FC<DeathScreenProps> = ({ deathEvent, onClose }) => {
    const api = useAPI();
    const [buttons, setButtons] = useState<DeathScreenButton[]>([]);
    const [statsOpen, setStatsOpen] = useState(false);
    const [achievementsOpen, setAchievementsOpen] = useState(false);

    useEffect(() => {
        // Get the buttons from the resource
        const deathButtons = getResource<DeathScreenButton[]>(api.ecsWorld, 'deathScreenButtons');
        setButtons(deathButtons || []);
    }, [api.ecsWorld]);

    const killerText = deathEvent.killerName 
        ? `You were killed by ${deathEvent.killerName}`
        : "You have died";

    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "calc(var(--vh, 1vh) * 100)", zIndex: 100 }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: 'calc(var(--vh, 1vh) * 100)',
                    background: 'rgba(0,0,0,0.5)',
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 0,
                }}
            />
            <div
                style={{
                    pointerEvents: 'auto',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                    <div style={{ pointerEvents: 'none', userSelect: 'none', textAlign: 'center', color: '#fff' }}>
                        <Typography.Title level={1} style={{ color: '#ff4444', margin: 0 }}>
                            You Died
                        </Typography.Title>
                        <Typography.Text style={{ color: '#ffffff', fontSize: '16px' }}>
                            {killerText}
                        </Typography.Text>
                    </div>
                    <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Button block size="large" onClick={() => setStatsOpen(true)}>
                            Statistics
                        </Button>
                        <Button block size="large" onClick={() => setAchievementsOpen(true)}>
                            Achievements
                        </Button>
                        {buttons.length > 0 ? buttons.map((button, index) => (
                            <Button 
                                key={index}
                                type={index === 0 ? "primary" : "default"}
                                block 
                                size="large" 
                                onClick={() => {
                                    button.callback();
                                    onClose();
                                }}
                            >
                                {button.text}
                            </Button>
                        )) : (
                            <Button 
                                type="primary"
                                block 
                                size="large" 
                                onClick={onClose}
                            >
                                Continue
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <Modal
                open={statsOpen}
                onCancel={() => setStatsOpen(false)}
                footer={null}
                title="Stats for Player"
                width={480}
                transitionName=""
                maskTransitionName=""
            >
                <MetricsTable />
            </Modal>
            <Modal
                open={achievementsOpen}
                onCancel={() => setAchievementsOpen(false)}
                footer={null}
                title="Achievements"
                width={480}
                transitionName=""
                maskTransitionName=""
            >
                <AchievementsList />
            </Modal>
        </div>
    );
};

export default DeathScreen;