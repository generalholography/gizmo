import { startEngine } from ".";
import { TriggerInputKey } from "./core/triggerInput";
import { lerp } from "./utils/math";
import { getMouseSensitivity } from "./core/settings";


export function setupWebControls(engine: ReturnType<typeof startEngine>, canvas: HTMLCanvasElement) {
    const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
    let lastForwardRelease = -1;
    let sprintActive = false;
    let yaw = 0, pitch = 0;
    let interactStart = -1;
    let interactRAF = 0;
    let primaryStart = -1;
    let primaryRAF = 0;
    let secondaryStart = -1;
    let secondaryRAF = 0;
    const baseLookSpeed = 0.002; // Base sensitivity

    let currentMove = { x: 0, y: 0, z: 0 };
    const moveLerpSpeed = 0.18; // 0..1, higher is snappier

    const isComposerElement = (element: Element | null): boolean => {
        if (!element || !(element instanceof HTMLElement)) return false;
        if (element.dataset?.worldComposer === "true") return true;
        return !!element.closest('[data-world-composer="true"]');
    };

    // Animation frame loop for movement update
    let moveRAF = 0;
    function updateMovement() {
        const targetMoveX = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);
        const targetMoveZ = (moveState.backward ? 1 : 0) - (moveState.forward ? 1 : 0);
        const targetMoveY = (moveState.up ? 1 : 0) - (moveState.down ? 1 : 0);

        //lerp movement
        currentMove.x = lerp(currentMove.x, targetMoveX, moveLerpSpeed);
        currentMove.y = targetMoveY;
        currentMove.z = lerp(currentMove.z, targetMoveZ, moveLerpSpeed);

        engine.updateInput({ 
            moveX: currentMove.x, 
            moveY: currentMove.y, 
            moveZ: currentMove.z, 
            sprint: sprintActive 
        });
        moveRAF = requestAnimationFrame(updateMovement);
    }
    moveRAF = requestAnimationFrame(updateMovement);

    const handleMouse = (e) => {
        if (document.pointerLockElement !== canvas) return;
        // Read mouse sensitivity from localStorage on each mouse move
        const sensitivityMultiplier = getMouseSensitivity(engine.ecsWorld);
        const lookSpeed = baseLookSpeed * sensitivityMultiplier;
        
        yaw -= e.movementX * lookSpeed;
        pitch -= e.movementY * lookSpeed;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Clamp pitch
        engine.updateInput({ yaw, pitch });
    };

    const handleMouseDown = (e) => {
        if (document.pointerLockElement !== canvas) return;
        if (e.button === 0 && primaryStart < 0) {
            primaryStart = performance.now();
            engine.updateInput({ primary: 0 });
            const update = () => {
                if (primaryStart < 0) return;
                const dur = (performance.now() - primaryStart) / 1000;
                engine.updateInput({ primary: dur });
                primaryRAF = requestAnimationFrame(update);
            };
            primaryRAF = requestAnimationFrame(update);
        }
        if (e.button === 2 && secondaryStart < 0) {
            secondaryStart = performance.now();
            engine.updateInput({ secondary: 0 });
            const update = () => {
                if (secondaryStart < 0) return;
                const dur = (performance.now() - secondaryStart) / 1000;
                engine.updateInput({ secondary: dur });
                secondaryRAF = requestAnimationFrame(update);
            };
            secondaryRAF = requestAnimationFrame(update);
        }
    };

    const handleMouseUp = (e) => {
        if (e.button === 0) {
            primaryStart = -1;
            cancelAnimationFrame(primaryRAF);
            engine.updateInput({ primary: 0 });
        }
        if (e.button === 2) {
            secondaryStart = -1;
            cancelAnimationFrame(secondaryRAF);
            engine.updateInput({ secondary: 0 });
        }
    };

    const handleKeyDown = (e) => {
        // Block all game inputs if composer textarea is focused
        const activeElement = document.activeElement;
        const targetElement = e.target as Element | null;
        const composerFocused = isComposerElement(activeElement) || isComposerElement(targetElement);

        if (composerFocused) {
            // Allow only special keys that don't affect gameplay
            if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
                return; // Block input processing
            }
        }
        
        // Handle tilde/backtick for console
        if (e.key === '`' || e.key === '~') {
            e.preventDefault();
            engine.setTriggerInput(TriggerInputKey.CONSOLE);
            return;
        }
        
        if (e.code === 'KeyW') {
            if (!moveState.forward && performance.now() - lastForwardRelease < 250) {
                sprintActive = true;
                engine.updateInput({ sprint: true });
            }
            moveState.forward = true;
        }
        if (e.code === 'KeyS') moveState.backward = true;
        if (e.code === 'KeyA') moveState.left = true;
        if (e.code === 'KeyD') moveState.right = true;
        if (e.code === 'Space') moveState.up = true;
        if (e.code === 'ShiftLeft') moveState.down = true;
        if (e.code === 'KeyE' && interactStart < 0) {
            interactStart = performance.now();
            engine.updateInput({ interact: 0 });
            const update = () => {
                if (interactStart < 0) return;
                const dur = (performance.now() - interactStart) / 1000;
                engine.updateInput({ interact: dur });
                interactRAF = requestAnimationFrame(update);
            };
            interactRAF = requestAnimationFrame(update);
        }
        if (e.code === 'KeyI') {
            engine.setTriggerInput(TriggerInputKey.INVENTORY);
        }
        if (e.code === 'Escape') {
            engine.setTriggerInput(TriggerInputKey.MENU);
        }
        if (e.code === "F1") {
            engine.setTriggerInput(TriggerInputKey.HUD);
        }
        if (e.code === "F3") {
            engine.setTriggerInput(TriggerInputKey.DEBUG);
        }
        if (e.code === "F5") {
            engine.setTriggerInput(TriggerInputKey.CREATIVE);
        }
        const digit = /^Digit([0-9])$/.exec(e.code);
        if (digit) {
            const n = parseInt(digit[1], 10);
            const slot = n === 0 ? 9 : n - 1;
            engine.selectHotbarSlot(slot);
        }
        if (e.code === 'KeyQ') {
            engine.setTriggerInput(TriggerInputKey.DROP_ITEM);
        }
    };

    const handleKeyUp = (e) => {
        const activeElement = document.activeElement;
        const targetElement = e.target as Element | null;
        if (isComposerElement(activeElement) || isComposerElement(targetElement)) {
            if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
                return;
            }
        }

        if (e.code === 'KeyW') {
            moveState.forward = false;
            lastForwardRelease = performance.now();
            if (sprintActive) {
                sprintActive = false;
                engine.updateInput({ sprint: false });
            }
        }
        if (e.code === 'KeyS') moveState.backward = false;
        if (e.code === 'KeyA') moveState.left = false;
        if (e.code === 'KeyD') moveState.right = false;
        if (e.code === 'Space') moveState.up = false;
        if (e.code === 'ShiftLeft') moveState.down = false;
        if (e.code === 'KeyE') {
            interactStart = -1;
            cancelAnimationFrame(interactRAF);
            engine.updateInput({ interact: 0 });
        }
    };

    const handlePointerLockChange = (e) => {
        if (!document.pointerLockElement) {
            engine.setTriggerInput(TriggerInputKey.CURSOR_UNLOCK);
        }
    }

    const handleContextMenu = (e) => e.preventDefault();

    canvas.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousemove', handleMouse);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Cleanup function to remove event listeners
    return () => {
        canvas.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('mousemove', handleMouse);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
        cancelAnimationFrame(moveRAF);
    }
}