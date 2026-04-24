import React, { useEffect, useState, useRef } from "react";
import { ECSContext, getResource } from "../ecs";
import { TriggerInputKey } from "../triggerInput";
import { useAPI } from "./App";
import InventoryUI from "./Inventory";
import PauseMenu from "./PauseMenu";
import HUD from "./HUD/HUD";
import DeathScreen from "./DeathScreen";
import TextModal from "./TextModal";
import Console from "./Console";
import { EngineMode, PlayerDeathEvent } from "../..";

enum UIState {
    HUD,
    Inventory,
    PauseMenu,
    DeathScreen,
    TextModal,
    Console,
}

const MainUI: React.FC = () => {
    const api = useAPI();
    const ctx = api.ecsWorld as ECSContext;
    const triggerInput = api.triggerInput;
    const isMobile = getResource<boolean>(ctx, 'isMobile') || false;

    const config = api.getConfig();
    const engineMode = config.mode || (config.display ? EngineMode.DISPLAY : EngineMode.GAME);
    const hudVisible = config.hudVisible ?? true;

    const startPaused = !isMobile && hudVisible && engineMode === EngineMode.GAME;
    const [uiState, setUiState] = useState<UIState>(
        startPaused ? UIState.PauseMenu : UIState.HUD,
    );
    const [deathEvent, setDeathEvent] = useState<PlayerDeathEvent | null>(null);
    const [textModalText, setTextModalText] = useState<string>("");

    // Get console commands from config
    const customCommands = config.consoleCommands || {};

    // Build console commands with default /help
    const consoleCommands = {
        help: () => {
            const cmdList = Object.keys({ help: true, ...customCommands }).join(', ');
            return `Available commands: ${cmdList.split(', ').map(c => '/' + c).join(', ')}`;
        },
        ...customCommands,
    };

    /*
        This is some jank to get around the browser immediately unlocking the cursor
        when the user relocks it too fast after pressing escape, causing another event to fire.
    */
    const lastCursorUnlockTime = useRef<number>(0);

    useEffect(() => {
        const paused = uiState !== UIState.HUD && uiState !== UIState.TextModal && uiState !== UIState.Console;
        window.dispatchEvent(new CustomEvent('engine-pausechange', { detail: { paused } }));
        if (uiState === UIState.DeathScreen) {
            // Unlock cursor when death screen appears
            document.exitPointerLock();
        }
    }, [uiState]);

    useEffect(() => {
        if (startPaused) {
            ctx.isPlaying = false;
        }
    }, [ctx, startPaused]);

    const gotoHUD = () => {
        ctx.isPlaying = true;
        setUiState(UIState.HUD);
    }; // Pointer lock handled directly by the UI interactions that resume gameplay.

    const showTextModal = (text: string) => {
        setTextModalText(text);
        setUiState(UIState.TextModal);
        document.exitPointerLock();
    };

    // Expose showTextModal function to the engine API
    useEffect(() => {
        if (api && api.ecsWorld) {
            // Store the function in the ECS context so effects can access it
            (api.ecsWorld as any).showTextModal = showTextModal;
        }
    }, [api]);

    // Listen for player death events
    useEffect(() => {
        const deathListener = (data: PlayerDeathEvent) => {
            setDeathEvent(data);
            setUiState(UIState.DeathScreen);
        };

        api.lifecycleEvents.on('player_death', deathListener);
        return () => {
            api.lifecycleEvents.off('player_death', deathListener);
        };
    }, [api.lifecycleEvents, ctx]);

    useEffect(() => {
        const cursorUnlockListener = () => {
            const now = Date.now();
            if (now - lastCursorUnlockTime.current < 2000) {
                return; // Cooldown active, ignore the trigger
            }

            if (uiState === UIState.HUD) {
                lastCursorUnlockTime.current = now;
                setUiState(UIState.PauseMenu);
                ctx.isPlaying = false; // Pause the game
            }
        }
        const menuListener = () => {
            if (uiState === UIState.HUD) {
                setUiState(UIState.PauseMenu);
                ctx.isPlaying = false; // Pause the game
            }
            else {
                if (uiState === UIState.PauseMenu) {
                    gotoHUD();
                }
                else if (uiState === UIState.Inventory) {
                    setUiState(UIState.HUD);
                }
                else if (uiState === UIState.TextModal) {
                    setUiState(UIState.HUD);
                }
                else if (uiState === UIState.Console) {
                    setUiState(UIState.HUD);
                }
                ctx.isPlaying = true; // Resume the game
            }
            // Don't handle menu key when in death screen
        };
        const inventoryListener = () => {
            if (uiState === UIState.HUD) {
                document.exitPointerLock();
                setUiState(UIState.Inventory);
            }
            else if (uiState === UIState.Inventory) {
                gotoHUD();
            }
            // Don't handle inventory key when in death screen
        }
        const consoleListener = () => {
            if (uiState === UIState.HUD) {
                document.exitPointerLock();
                ctx.isPlaying = false;
                setUiState(UIState.Console);
            }
            else if (uiState === UIState.Console) {
                gotoHUD();
            }
        };
        triggerInput.on(TriggerInputKey.CURSOR_UNLOCK, cursorUnlockListener);
        triggerInput.on(TriggerInputKey.MENU, menuListener);
        triggerInput.on(TriggerInputKey.INVENTORY, inventoryListener);
        triggerInput.on(TriggerInputKey.CONSOLE, consoleListener);

        return () => {
            triggerInput.off(TriggerInputKey.CURSOR_UNLOCK, cursorUnlockListener);
            triggerInput.off(TriggerInputKey.MENU, menuListener);
            triggerInput.off(TriggerInputKey.INVENTORY, inventoryListener);
            triggerInput.off(TriggerInputKey.CONSOLE, consoleListener);
        };
    }, [uiState, triggerInput, ctx]);

    return (
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
            <style>
                {`
                #engine-ui-root .ant-notification,
                #engine-ui-root .ant-notification-notice {
                    pointer-events: auto !important;
                }
                `}
            </style>
            {uiState === UIState.HUD && (
                <div id="hud-root" style={{ pointerEvents: 'none' }}>
                    <HUD />
                </div>
            )}
            {uiState === UIState.PauseMenu && (
                <PauseMenu
                    isMobile={isMobile}
                    onResume={() => {
                        gotoHUD();
                    }}
                />
            )}
            {uiState === UIState.DeathScreen && deathEvent && (
                <DeathScreen
                    deathEvent={deathEvent}
                    onClose={() => {
                        setUiState(UIState.HUD);
                        setDeathEvent(null);
                        ctx.isPlaying = true;
                    }}
                />
            )}
            {uiState === UIState.Inventory && (<>
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: 'calc(var(--vh, 1vh) * 100)',
                        background: 'rgba(0,0,0,0)',
                        zIndex: 200,
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <InventoryUI onClose={gotoHUD} />
                </div>
            </>)}
            {uiState === UIState.TextModal && (
                <TextModal
                    text={textModalText}
                    onClose={() => {
                        setUiState(UIState.HUD);
                    }}
                />
            )}
            {uiState === UIState.Console && (
                <Console
                    commands={consoleCommands}
                    isOpen={true}
                    onClose={() => {
                        setUiState(UIState.HUD);
                    }}
                />
            )}
        </div>
    );
};

export default MainUI;
