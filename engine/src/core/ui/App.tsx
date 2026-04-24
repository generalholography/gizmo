import { ECSContext, getResource } from "../ecs";
import React, { createContext, useContext } from "react";
import { ConfigProvider, notification, theme } from 'antd'
import useEventListener from "./hooks/useEventListener";
import { AchievementsResource, UnlockedAchievements } from "../achievements";
import TriggerInput from "../triggerInput";
import MainUI from "./MainUI";
import EditorHUD from "./EditorHUD";
import { EngineAPI, EngineMode } from "../..";

export type AppProps = {
    api: EngineAPI;
}

// Provide EngineAPI via React context
const APIReactContext = createContext<EngineAPI | undefined>(undefined);

export const useAPI = () => {
    const api = useContext(APIReactContext);
    if (!api) throw new Error("useAPI must be used within APIProvider");
    return api;
};

export const APIProvider: React.FC<{ api: EngineAPI, children: React.ReactNode }> = ({ api, children }) => (
    <APIReactContext.Provider value={api}>
        {children}
    </APIReactContext.Provider>
);

// Notification context for this app instance
export const NotificationContext = createContext<ReturnType<typeof notification.useNotification>[0] | null>(null);
export const useNotification = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotification must be used within NotificationContext.Provider");
    return ctx;
};

export default (props: AppProps) => {
    const [notificationAPI, contextHolder] = notification.useNotification({
        getContainer: () => document.getElementById("engine-ui-root"), // Render notifications in the body
    });

    const api = props.api;
    const ctx = api.ecsWorld;

    // Get engine mode
    const config = api.getConfig();
    const mode = config.mode || (config.display ? EngineMode.DISPLAY : EngineMode.GAME);

    // Hide engine UI if in display mode
    if (mode === EngineMode.DISPLAY) {
        return <></>
    }

    // Show editor HUD in editor mode
    if (mode === EngineMode.EDITOR) {
        return (
            <ConfigProvider
                theme={{
                    algorithm: theme.darkAlgorithm,
                    token: {
                        colorText: '#D9D9D9FF',
                    },
                }}
            >
                <APIProvider api={api}>
                    <EditorHUD 
                        onRequestComposer={config.onRequestComposer}
                        onSaveWorld={config.onSaveWorld}
                        onOpenPlayMode={config.onOpenPlayMode}
                    />
                </APIProvider>
            </ConfigProvider>
        );
    }

    const achievements = getResource<AchievementsResource>(ctx, 'achievements');
    const unlockedAchievements = getResource<UnlockedAchievements>(ctx, 'unlockedAchievements');
    const unlockKey = useEventListener(unlockedAchievements.get("Player"), "add");

    if (unlockKey) {
        // Show a notification when an achievement is unlocked
        notificationAPI.success({
            message: 'Achievement Unlocked',
            description: achievements.get(unlockKey).description || 'You have unlocked an achievement!',
            placement: 'topRight',
        });
    }

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorText: '#D9D9D9FF',
                },
            }}
        >
            <APIProvider api={api}>
                <NotificationContext.Provider value={notificationAPI}>
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            pointerEvents: 'none',
                        }}
                    >
                        {/* Notification context holder renders notifications in this subtree */}
                        <style>
                            {`
                            #engine-ui-root .ant-notification,
                            #engine-ui-root .ant-notification-notice {
                                pointer-events: auto !important;
                            }
                            `}
                        </style>
                        {contextHolder}
                        <MainUI />
                    </div>
                </NotificationContext.Provider>
            </APIProvider>
        </ConfigProvider >
    );
}
