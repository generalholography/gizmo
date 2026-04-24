import * as THREE from 'three';
import { ECSContext, setResource } from './core/ecs';

export type WebXRAnimationLoopMode = 'raf' | 'xr';

export interface WebXRConfig {
        renderer: THREE.WebGLRenderer;
        xrEnabled: boolean;
        xrSessionMode: XRSessionMode;
        xrSessionInit: XRSessionInit;
        ctx: ECSContext;
        animate: () => void;
        getFrameId: () => number;
        setFrameId: (id: number) => void;
}

export interface WebXRHelpers {
        xrSupportPromise: Promise<boolean>;
        useXRAnimationLoop: () => void;
        useRAFAnimationLoop: () => void;
        ensureXRSessionSupport: (mode: XRSessionMode) => Promise<void>;
        enterXR: (mode?: XRSessionMode, sessionInit?: XRSessionInit) => Promise<XRSession | null>;
        exitXR: () => Promise<void>;
        getXRSession: () => XRSession | null;
        getAnimationLoopMode: () => WebXRAnimationLoopMode;
}

export function createWebXRHelpers(config: WebXRConfig): WebXRHelpers {
        let xrSession: XRSession | null = null;
        let animationLoopMode: WebXRAnimationLoopMode = 'raf';

        const xrSupportPromise: Promise<boolean> = (async () => {
                if (!config.xrEnabled || typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
                        return false;
                }
                try {
                        return await navigator.xr.isSessionSupported(config.xrSessionMode);
                } catch {
                        return false;
                }
        })();

        function useXRAnimationLoop() {
                if (animationLoopMode === 'xr') return;
                cancelAnimationFrame(config.getFrameId());
                config.renderer.setAnimationLoop(config.animate);
                animationLoopMode = 'xr';
        }

        function useRAFAnimationLoop() {
                if (animationLoopMode === 'raf') return;
                config.renderer.setAnimationLoop(null as any);
                animationLoopMode = 'raf';
                config.setFrameId(requestAnimationFrame(config.animate));
        }

        async function ensureXRSessionSupport(mode: XRSessionMode) {
                if (!config.xrEnabled) throw new Error('XR disabled in engine config');
                const supported = await xrSupportPromise;
                if (!supported) {
                        throw new Error(`WebXR ${mode} sessions are not supported in this environment`);
                }
        }

        async function enterXR(mode: XRSessionMode = config.xrSessionMode, sessionInit: XRSessionInit = config.xrSessionInit) {
                await ensureXRSessionSupport(mode);
                if (xrSession) return xrSession;

                const mergedInit: XRSessionInit = { ...config.xrSessionInit, ...sessionInit };
                const session = await navigator.xr!.requestSession(mode, mergedInit);

                xrSession = session;
                config.renderer.xr.enabled = true;
                await config.renderer.xr.setSession(session);
                setResource(config.ctx, 'xrSessionActive', true);
                useXRAnimationLoop();

                const handleEnd = () => {
                        xrSession = null;
                        setResource(config.ctx, 'xrSessionActive', false);
                        config.renderer.xr.enabled = config.xrEnabled;
                        useRAFAnimationLoop();
                };
                session.addEventListener('end', handleEnd, { once: true });

                return session;
        }

        async function exitXR() {
                if (!xrSession) return;
                const session = xrSession;
                xrSession = null;
                setResource(config.ctx, 'xrSessionActive', false);
                try {
                        await session.end();
                } catch (err) {
                        console.warn('Failed to end XR session', err);
                }
                config.renderer.xr.enabled = config.xrEnabled;
                useRAFAnimationLoop();
        }

        function getXRSession() {
                return xrSession;
        }

        function getAnimationLoopMode() {
                return animationLoopMode;
        }

        return {
                xrSupportPromise,
                useXRAnimationLoop,
                useRAFAnimationLoop,
                ensureXRSessionSupport,
                enterXR,
                exitXR,
                getXRSession,
                getAnimationLoopMode,
        };
}
