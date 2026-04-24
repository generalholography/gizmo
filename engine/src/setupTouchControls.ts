import { startEngine } from ".";
import nipplejs from 'nipplejs';
import { lerp } from './utils/math';
import { TriggerInputKey } from './core/triggerInput';

export function setupTouchControls(engine: ReturnType<typeof startEngine>, canvas: HTMLCanvasElement) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '15';
    container.style.touchAction = 'none';
    canvas.parentElement?.appendChild(container);

    const joyContainer = document.createElement('div');
    joyContainer.style.position = 'absolute';
    joyContainer.style.bottom = '160px';
    joyContainer.style.transform = 'translateY(50%)';
    joyContainer.style.left = '16px';
    joyContainer.style.width = '120px';
    joyContainer.style.height = '120px';
    container.appendChild(joyContainer);

    const JUMP_SIZE = 65;
    const ACTION_SIZE = 40;
    const ACTION_RADIUS = 70;

    const jumpButton = document.createElement('button');
    jumpButton.style.position = 'absolute';
    jumpButton.style.right = '16px';
    jumpButton.style.bottom = '160px';
    jumpButton.style.transform = 'translateY(50%)';
    jumpButton.style.width = `${JUMP_SIZE}px`;
    jumpButton.style.height = `${JUMP_SIZE}px`;
    jumpButton.style.borderRadius = `${JUMP_SIZE / 2}px`;
    jumpButton.style.border = 'none';
    jumpButton.style.background = 'rgba(255,255,255,0.5)';
    jumpButton.style.touchAction = 'none';
    container.appendChild(jumpButton);

    const createActionButton = (text: string) => {
        const btn = document.createElement('button');
        btn.style.position = 'absolute';
        btn.style.width = `${ACTION_SIZE}px`;
        btn.style.height = `${ACTION_SIZE}px`;
        btn.style.borderRadius = `${ACTION_SIZE / 2}px`;
        btn.style.border = 'none';
        btn.style.background = 'rgba(255,255,255,0.5)';
        btn.style.touchAction = 'none';
        btn.textContent = text;
        container.appendChild(btn);
        return btn;
    };

    const primaryButton = createActionButton("1");
    const secondaryButton = createActionButton("2");
    const interactButton = createActionButton("E");

    const placeActionButton = (btn: HTMLButtonElement, angleDeg: number) => {
        const angle = angleDeg * Math.PI / 180;
        const centerRight = 16 + JUMP_SIZE / 2 - Math.cos(angle) * ACTION_RADIUS;
        const centerBottom = 160 + Math.sin(angle) * ACTION_RADIUS;
        btn.style.right = `${centerRight}px`;
        btn.style.bottom = `${centerBottom}px`;
        btn.style.transform = 'translate(50%, 50%)';
    };

    placeActionButton(primaryButton, 180);
    placeActionButton(secondaryButton, 135);
    placeActionButton(interactButton, 90);

    const pauseButton = document.createElement('button');
    pauseButton.style.position = 'absolute';
    pauseButton.style.left = '16px';
    pauseButton.style.top = '16px';
    pauseButton.style.width = '30px';
    pauseButton.style.height = '30px';
    pauseButton.style.borderRadius = '15px';
    pauseButton.style.border = 'none';
    pauseButton.style.background = 'rgba(255,255,255,0.5)';
    pauseButton.style.touchAction = 'none';
    pauseButton.textContent = 'II';
    container.appendChild(pauseButton);

    const joystick = nipplejs.create({
        zone: joyContainer,
        mode: 'static',
        position: { left: '60px', top: '60px' },
        color: 'white',
        size: 100,
    });

    let targetMove = { x: 0, z: 0 };
    let currentMove = { x: 0, z: 0 };
    const moveLerpSpeed = 0.2;
    let moveRAF = 0;

    function updateMovement() {
        currentMove.x = lerp(currentMove.x, targetMove.x, moveLerpSpeed);
        currentMove.z = lerp(currentMove.z, targetMove.z, moveLerpSpeed);
        engine.updateInput({ moveX: currentMove.x, moveZ: currentMove.z });
        moveRAF = requestAnimationFrame(updateMovement);
    }
    moveRAF = requestAnimationFrame(updateMovement);

    joystick.on('move', (_evt, data) => {
        targetMove.x = data.vector.x;
        targetMove.z = -data.vector.y;
    });
    joystick.on('end', () => {
        targetMove.x = 0;
        targetMove.z = 0;
    });

    let yaw = 0;
    let pitch = 0;
    const lookSpeed = 0.002;
    let lastTouch: { x: number; y: number } | null = null;
    let lookTouchId: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
        if (
            e.target === jumpButton ||
            e.target === pauseButton ||
            e.target === primaryButton ||
            e.target === secondaryButton ||
            e.target === interactButton ||
            joyContainer.contains(e.target as Node)
        )
            return;
        if (lookTouchId === null) {
            const t = e.changedTouches[0];
            lookTouchId = t.identifier;
            lastTouch = { x: t.clientX, y: t.clientY };
        }
    };
    const onTouchMove = (e: TouchEvent) => {
        if (lookTouchId === null || !lastTouch) return;
        const t = Array.from(e.touches).find(t => t.identifier === lookTouchId);
        if (!t) return;
        const dx = t.clientX - lastTouch.x;
        const dy = t.clientY - lastTouch.y;
        yaw -= dx * lookSpeed;
        pitch -= dy * lookSpeed;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        engine.updateInput({ yaw, pitch });
        lastTouch = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
        if (lookTouchId !== null) {
            const ended = Array.from(e.changedTouches).some(t => t.identifier === lookTouchId);
            if (ended) {
                lookTouchId = null;
                lastTouch = null;
            }
        }
    };

    container.addEventListener('touchstart', onTouchStart);
    container.addEventListener('touchmove', onTouchMove);
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    const jumpStart = () => {
        engine.updateInput({ moveY: 1 });
    };
    const jumpEnd = () => {
        engine.updateInput({ moveY: 0 });
    };
    jumpButton.addEventListener('touchstart', jumpStart);
    jumpButton.addEventListener('touchend', jumpEnd);
    jumpButton.addEventListener('touchcancel', jumpEnd);

    // ---- Action Buttons ----
    let primaryStart = -1;
    let primaryRAF = 0;
    const primaryStartHandler = () => {
        primaryStart = performance.now();
        engine.updateInput({ primary: 0 });
        const update = () => {
            if (primaryStart < 0) return;
            const dur = (performance.now() - primaryStart) / 1000;
            engine.updateInput({ primary: dur });
            primaryRAF = requestAnimationFrame(update);
        };
        primaryRAF = requestAnimationFrame(update);
    };
    const primaryEndHandler = () => {
        primaryStart = -1;
        cancelAnimationFrame(primaryRAF);
        engine.updateInput({ primary: 0 });
    };
    primaryButton.addEventListener('touchstart', primaryStartHandler);
    primaryButton.addEventListener('touchend', primaryEndHandler);
    primaryButton.addEventListener('touchcancel', primaryEndHandler);

    let secondaryStart = -1;
    let secondaryRAF = 0;
    const secondaryStartHandler = () => {
        secondaryStart = performance.now();
        engine.updateInput({ secondary: 0 });
        const update = () => {
            if (secondaryStart < 0) return;
            const dur = (performance.now() - secondaryStart) / 1000;
            engine.updateInput({ secondary: dur });
            secondaryRAF = requestAnimationFrame(update);
        };
        secondaryRAF = requestAnimationFrame(update);
    };
    const secondaryEndHandler = () => {
        secondaryStart = -1;
        cancelAnimationFrame(secondaryRAF);
        engine.updateInput({ secondary: 0 });
    };
    secondaryButton.addEventListener('touchstart', secondaryStartHandler);
    secondaryButton.addEventListener('touchend', secondaryEndHandler);
    secondaryButton.addEventListener('touchcancel', secondaryEndHandler);

    let interactStart = -1;
    let interactRAF = 0;
    const interactStartHandler = () => {
        interactStart = performance.now();
        engine.updateInput({ interact: 0 });
        const update = () => {
            if (interactStart < 0) return;
            const dur = (performance.now() - interactStart) / 1000;
            engine.updateInput({ interact: dur });
            interactRAF = requestAnimationFrame(update);
        };
        interactRAF = requestAnimationFrame(update);
    };
    const interactEndHandler = () => {
        interactStart = -1;
        cancelAnimationFrame(interactRAF);
        engine.updateInput({ interact: 0 });
    };
    interactButton.addEventListener('touchstart', interactStartHandler);
    interactButton.addEventListener('touchend', interactEndHandler);
    interactButton.addEventListener('touchcancel', interactEndHandler);

    const pause = () => {
        engine.setTriggerInput(TriggerInputKey.MENU);
    };
    pauseButton.addEventListener('touchstart', pause);
    pauseButton.addEventListener('click', pause);

    const handlePauseChange = (e: any) => {
        container.style.display = e.detail.paused ? 'none' : 'block';
    };
    window.addEventListener('engine-pausechange', handlePauseChange);

    return () => {
        joystick.destroy();
        cancelAnimationFrame(moveRAF);
        cancelAnimationFrame(primaryRAF);
        cancelAnimationFrame(secondaryRAF);
        cancelAnimationFrame(interactRAF);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
        jumpButton.removeEventListener('touchstart', jumpStart);
        jumpButton.removeEventListener('touchend', jumpEnd);
        jumpButton.removeEventListener('touchcancel', jumpEnd);
        primaryButton.removeEventListener('touchstart', primaryStartHandler);
        primaryButton.removeEventListener('touchend', primaryEndHandler);
        primaryButton.removeEventListener('touchcancel', primaryEndHandler);
        secondaryButton.removeEventListener('touchstart', secondaryStartHandler);
        secondaryButton.removeEventListener('touchend', secondaryEndHandler);
        secondaryButton.removeEventListener('touchcancel', secondaryEndHandler);
        interactButton.removeEventListener('touchstart', interactStartHandler);
        interactButton.removeEventListener('touchend', interactEndHandler);
        interactButton.removeEventListener('touchcancel', interactEndHandler);
        pauseButton.removeEventListener('touchstart', pause);
        pauseButton.removeEventListener('click', pause);
        window.removeEventListener('engine-pausechange', handlePauseChange);
        container.parentElement?.removeChild(container);
    };
}
