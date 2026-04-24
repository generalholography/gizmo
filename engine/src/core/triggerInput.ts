import IEventEmitter from "../utils/eventEmitter";

/*
    TODO: CURSOR_UNLOCK is a special case of MENU
    that is fired when the cursor is unlocked. Kind of annoying
    but this is a workaround for how browser pointer unlock eats
    the escape key event. 

    If we want controller support we most likely need to just use MENU
    for everything and then in the engine have a flag that we
    are using ctlr
*/
export enum TriggerInputKey {
    MENU = "menu",
    CURSOR_UNLOCK = "cursor_unlock",
    INVENTORY = "inventory",
    DEBUG = "debug",
    HUD = "hud",
    DROP_ITEM = "drop_item",
    CREATIVE = "creative",
    CONSOLE = "console",
}

export default class TriggerInput extends IEventEmitter<null> {

    constructor() {
        super();
    }

    /**
     * Fires the event for the given key.
     * @param key The event key (e.g., TriggerInput.MENU)
     */
    set(key: TriggerInputKey): void {
        this.emit(key, null);
    }
}
