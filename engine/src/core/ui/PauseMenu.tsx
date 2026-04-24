import React, { useState } from "react";
import { Button, Modal, Tag, Typography } from "antd";
import { MetricsTable } from "./stats/MetricsTable";
import { AchievementsList } from "./stats/AchievementsList";
import SettingsModal from "./settings/SettingsModal";
import pkg from "../../../package.json";
import { useAPI } from "./App";
import { getResource } from "../ecs";
import { LifecycleEvent } from "../..";

type PauseMenuProps = {
    onResume: () => void;
    isMobile?: boolean;
};

const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, isMobile = false }) => {
    const api = useAPI();
    const [statsOpen, setStatsOpen] = useState(false);
    const [achievementsOpen, setAchievementsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const metadata = getResource<{ title?: string; description?: string }>(api.ecsWorld, 'metadata') || { title: 'Untitled World', description: '' };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "calc(var(--vh, 1vh) * 100)", zIndex: 100 }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: 'calc(var(--vh, 1vh) * 100)',
                    background: 'rgba(0,0,0,0.25)',
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 0,
                }}
            />
            <div style={{
                position: "absolute",
                right: 24,
                bottom: 16,
                color: "#aaa",
                fontSize: 12,
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 2,
            }}>
                <Tag style={{
                    background: "rgba(255,255,255,0.85)",
                    color: "#222",
                    fontWeight: 500,
                    fontSize: 12,
                    border: "none",
                    padding: "2px 10px"
                }}>
                    Vibeworlds v{pkg.version}
                </Tag>
            </div>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ pointerEvents: 'none', userSelect: 'none', textAlign: 'center', color: '#fff' }}>
                        <Typography.Title level={2}>{metadata.title || 'Untitled World'}</Typography.Title>
                        {metadata.description && <Typography.Text type="secondary">{metadata.description}</Typography.Text>}
                    </div>
                    <div style={{ width: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Button
                            type="primary"
                            block
                            size="large"
                            onClick={() => {
                                if (!isMobile) {
                                    const canvas = api.canvas;
                                    if (canvas && document.pointerLockElement !== canvas) {
                                        canvas.requestPointerLock();
                                    }
                                }
                                onResume();
                            }}
                        >
                            Resume Game
                        </Button>
                        <Button block size="large" disabled={isMobile} onClick={() => setSettingsOpen(true)}>
                            Settings
                        </Button>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button block size="large" onClick={() => setStatsOpen(true)}>
                                Statistics
                            </Button>
                            <Button block size="large" onClick={() => setAchievementsOpen(true)}>
                                Achievements
                            </Button>
                        </div>
                        <Button danger block size="large" onClick={() => api.lifecycleEvents.emit(LifecycleEvent.QUIT)}>
                            Quit
                        </Button>
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
            <SettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </div>
    );
};

export default PauseMenu;
