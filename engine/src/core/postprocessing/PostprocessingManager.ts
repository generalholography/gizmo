import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { N8AOPass } from 'n8ao';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getSSAOQuality, getBryceMode, SSAOQuality, getAntialias, getRenderScale } from '../../core/settings';
import { ECSContext } from '../ecs';

const SSAO_BASE_RADIUS = 1.0;
const SSAO_BASE_DISTANCE_FALLOFF = 1.0;
const SSAO_BASE_INTENSITY = 4.0;

// Bryce mode shader for 8x8 ordered Bayer dithering with color quantization
const BryceShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        varying vec2 vUv;
        
        // 8x8 ordered Bayer matrix
        float bayer8x8(vec2 pos) {
            int x = int(mod(pos.x, 8.0));
            int y = int(mod(pos.y, 8.0));
            
            float matrix[64] = float[64](
                0.0/64.0, 32.0/64.0, 8.0/64.0, 40.0/64.0, 2.0/64.0, 34.0/64.0, 10.0/64.0, 42.0/64.0,
                48.0/64.0, 16.0/64.0, 56.0/64.0, 24.0/64.0, 50.0/64.0, 18.0/64.0, 58.0/64.0, 26.0/64.0,
                12.0/64.0, 44.0/64.0, 4.0/64.0, 36.0/64.0, 14.0/64.0, 46.0/64.0, 6.0/64.0, 38.0/64.0,
                60.0/64.0, 28.0/64.0, 52.0/64.0, 20.0/64.0, 62.0/64.0, 30.0/64.0, 54.0/64.0, 22.0/64.0,
                3.0/64.0, 35.0/64.0, 11.0/64.0, 43.0/64.0, 1.0/64.0, 33.0/64.0, 9.0/64.0, 41.0/64.0,
                51.0/64.0, 19.0/64.0, 59.0/64.0, 27.0/64.0, 49.0/64.0, 17.0/64.0, 57.0/64.0, 25.0/64.0,
                15.0/64.0, 47.0/64.0, 7.0/64.0, 39.0/64.0, 13.0/64.0, 45.0/64.0, 5.0/64.0, 37.0/64.0,
                63.0/64.0, 31.0/64.0, 55.0/64.0, 23.0/64.0, 61.0/64.0, 29.0/64.0, 53.0/64.0, 21.0/64.0
            );
            
            return matrix[y * 8 + x];
        }
        
        vec3 colorQuantize(vec3 color, float levels) {
            return round(color * levels) / levels;
        }
        
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 color = texel.rgb;
            
            // Color quantization (reduce to fewer colors like 90s software)
            color = colorQuantize(color, 16.0);
            
            // Dithering
            vec2 pixelPos = vUv * resolution;
            float threshold = bayer8x8(pixelPos);
            
            // Apply dithering to each color channel
            color.r = color.r + (threshold - 0.5) * 0.1;
            color.g = color.g + (threshold - 0.5) * 0.1;
            color.b = color.b + (threshold - 0.5) * 0.1;
            
            // Final quantization after dithering
            color = colorQuantize(color, 8.0);
            
            gl_FragColor = vec4(color, texel.a);
        }
    `,
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() }
    }
};

export class PostprocessingManager {
    private ctx: ECSContext;
    private composer: EffectComposer;
    private renderPass: RenderPass;
    private ssaoPass: N8AOPass;
    private antialiasPass: ShaderPass;
    private brycePass: ShaderPass;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private currentSSAOQuality: SSAOQuality = 'off';
    private currentAntialias: boolean = false;
    private currentBryceMode: boolean = false;
    private currentRenderScale: number = 1.0;

    constructor(ctx: ECSContext, scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
        this.ctx = ctx;
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Create composer and match device pixel ratio (otherwise it defaults to 1)
        this.composer = new EffectComposer(renderer);
        this.composer.setPixelRatio(renderer.getPixelRatio());

        const w = renderer.domElement.width || 1;
        const h = renderer.domElement.height || 1;

        // Base scene render
        this.renderPass = new RenderPass(scene, camera);

        // Create all effect passes once (stable order: SSAO -> FXAA -> Bryce)
        this.ssaoPass = new N8AOPass(scene, camera, w, h);
        // Reasonable defaults; will be overridden by settings
        this.ssaoPass.enabled = false; // start disabled until settings applied
        this.updateSSAOResolution();

        this.antialiasPass = new ShaderPass(FXAAShader);
    // Initialize FXAA resolution
    this.updateAntialiasResolution();
        this.antialiasPass.enabled = false;

        this.brycePass = new ShaderPass(BryceShader);
        this.brycePass.uniforms.resolution.value.set(w, h);
        this.brycePass.enabled = false;

        // Add passes in stable order
        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.ssaoPass);
        this.composer.addPass(this.antialiasPass);
        this.composer.addPass(this.brycePass);
        this.composer.addPass(new OutputPass());

        // Apply initial settings (also sets renderToScreen)
        this.updateSettings(ctx);
    }

    public updateSettings(ctx: ECSContext): void {
        const ssaoQuality = getSSAOQuality(ctx);
        const antialias = getAntialias(ctx);
        const bryceMode = getBryceMode(ctx);
        const renderScale = getRenderScale(ctx);

        if (ssaoQuality !== this.currentSSAOQuality) {
            this.applySSAOQuality(ssaoQuality);
            this.currentSSAOQuality = ssaoQuality;
        }
        if (antialias !== this.currentAntialias) {
            this.applyAntialias(antialias);
            this.currentAntialias = antialias;
        }
        if (bryceMode !== this.currentBryceMode) {
            this.applyBryceMode(bryceMode);
            this.currentBryceMode = bryceMode;
        }
        if (renderScale !== this.currentRenderScale) {
            this.applyRenderScale(renderScale);
            this.currentRenderScale = renderScale;
        }
        this.updateFinalPass();
    }

    private applySSAOQuality(quality: SSAOQuality): void {
        if (!this.ssaoPass) return; // safety
        if (quality === 'off') {
            this.ssaoPass.enabled = false;
            return;
        }
        this.ssaoPass.enabled = true;
        this.ssaoPass.configuration.halfRes = true;
        switch (quality) {
            case 'low':
                this.ssaoPass.setQualityMode('Performance');
                break;
            case 'med':
                this.ssaoPass.setQualityMode('Medium');
                break;
            case 'high':
                this.ssaoPass.setQualityMode('High');
                break;
            case 'ultra':
                this.ssaoPass.setQualityMode('Ultra');
        }
        // Consistent tuning
        this.ssaoPass.configuration.color = new THREE.Color(0, 0, 0);
        this.ssaoPass.configuration.gammaCorrection = false;
        this.updateSSAOResolution();
    }

    private updateSSAOResolution(): void {
        if (!this.ssaoPass) return;
        this.ssaoPass.configuration.intensity = SSAO_BASE_INTENSITY// / getRenderScale(this.ctx) * 2;
        this.ssaoPass.configuration.aoRadius = SSAO_BASE_RADIUS// * getRenderScale(this.ctx);
        this.ssaoPass.configuration.distanceFalloff = SSAO_BASE_DISTANCE_FALLOFF// * getRenderScale(this.ctx);
    }

    private updateAntialiasResolution(): void {
        if (!this.antialiasPass) return;
        const pr = this.renderer.getPixelRatio();
        const w = this.renderer.domElement.width || 1;
        const h = this.renderer.domElement.height || 1;
        this.antialiasPass.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
    }

    private applyAntialias(enabled: boolean): void {
        if (!this.antialiasPass) return;
        this.antialiasPass.enabled = enabled;
        if (enabled) {
            this.updateAntialiasResolution();
        }
    }

    private applyBryceMode(enabled: boolean): void {
        if (!this.brycePass) return;
        this.brycePass.enabled = enabled;
        if (enabled) {
            this.brycePass.uniforms.resolution.value.set(
                this.renderer.domElement.width,
                this.renderer.domElement.height
            );
        }
    }

    private applyRenderScale(scale: number): void {
        // Clamp scale to a sane range
        const clamped = Math.max(0.1, Math.min(scale, 4.0));
        // Combine with physical device pixel ratio for final internal pixel ratio
        const baseDPR = window.devicePixelRatio || 1;
        const effectivePR = Math.min(baseDPR * clamped, 3); // soft cap to avoid huge RTs
        this.renderer.setPixelRatio(effectivePR);
        this.composer.setPixelRatio(effectivePR);

        this.updateSSAOResolution();

        // Update FXAA inverse resolution (if enabled)
        if (this.antialiasPass) {
            this.updateAntialiasResolution();
        }
        // Update any passes that cache size-related uniforms
        this.brycePass.uniforms.resolution.value.set(
            this.renderer.domElement.width,
            this.renderer.domElement.height
        );
    }

    // Ensure only the last enabled pass renders to screen.
    private updateFinalPass(): void {
        // Clear all flags
        for (const p of this.composer.passes) {
            (p as any).renderToScreen = false;
        }
        // Find last enabled pass
        for (let i = this.composer.passes.length - 1; i >= 0; i--) {
            const p: any = this.composer.passes[i];
            if (p.enabled !== false) { // treat undefined as enabled
                p.renderToScreen = true;
                break;
            }
        }
    }

    public onResize(width: number, height: number): void {
        // Resize composer & passes; retain current render scale
        this.composer.setSize(width, height);
        this.ssaoPass.setSize(width, height);
        // Re-apply current render scale to refresh pixel ratios & uniforms
        this.applyRenderScale(this.currentRenderScale);
        this.updateFinalPass();
    }

    public render(overrideCamera?: THREE.Camera): void {
        if (overrideCamera) {
            // When rendering for WebXR, bypass postprocessing to ensure stereo output
            // uses the XR camera provided by the renderer.
            this.renderer.render(this.scene, overrideCamera);
            return;
        }

        this.composer.render();
    }

    public dispose(): void {
        this.composer.dispose();
        this.ssaoPass.dispose();
        this.antialiasPass.dispose();
        this.brycePass.dispose();
    }
}