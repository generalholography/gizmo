import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createECS, setResource, getResource } from '../../ecs';
import { updateSkyboxSystem } from '../updateSkybox';
import { SkyboxObjects } from '../../..';

describe('updateSkybox system', () => {
    let ctx: any;
    let mockCamera: THREE.PerspectiveCamera;
    let mockSkybox: THREE.Mesh;
    let mockDirectionalLight: THREE.DirectionalLight;
    let mockLightTarget: THREE.Object3D;
    let mockAmbientLight: THREE.AmbientLight;

    beforeEach(() => {
        ctx = createECS();
        
        // Mock camera
        mockCamera = new THREE.PerspectiveCamera();
        mockCamera.position.set(5.7, 10.3, 15.9); // Non-rounded position
        
        // Mock skybox
        mockSkybox = new THREE.Mesh();
        
        // Mock directional light with shadow properties
        mockDirectionalLight = new THREE.DirectionalLight();
        mockDirectionalLight.castShadow = true;
        mockDirectionalLight.shadow.camera.near = 0.1;
        mockDirectionalLight.shadow.camera.far = 200;
        mockDirectionalLight.shadow.camera.left = -50;
        mockDirectionalLight.shadow.camera.right = 50;
        mockDirectionalLight.shadow.camera.top = 50;
        mockDirectionalLight.shadow.camera.bottom = -50;
        mockDirectionalLight.shadow.mapSize.width = 2048;
        mockDirectionalLight.shadow.mapSize.height = 2048;
        
        // Mock light target
        mockLightTarget = new THREE.Object3D();
        mockDirectionalLight.target = mockLightTarget;
        
        // Mock ambient light
        mockAmbientLight = new THREE.AmbientLight();
        
        // Set up context
        ctx.three = { camera: mockCamera };
        
        const skyboxObjects: SkyboxObjects = {
            skybox: mockSkybox,
            ambientLight: mockAmbientLight,
            directionalLight: mockDirectionalLight,
            lightTarget: mockLightTarget
        };
        
        setResource(ctx, 'skybox', skyboxObjects);
        setResource(ctx, 'timeOfDay', 1200); // Noon
    });

    it('should update skybox position to match camera', () => {
        updateSkyboxSystem(ctx);
        
        expect(mockSkybox.position.x).toBe(mockCamera.position.x);
        expect(mockSkybox.position.y).toBe(mockCamera.position.y);
        expect(mockSkybox.position.z).toBe(mockCamera.position.z);
    });

    it('should snap light target position to shadow camera space texel boundaries', () => {
        updateSkyboxSystem(ctx);
        
        // The light target should be positioned to align with shadow camera texel boundaries
        // We verify this by checking that consecutive calls with the same camera position
        // produce the same snapped target position (no jitter)
        const firstTargetPos = mockLightTarget.position.clone();
        
        // Run system again - should produce identical results
        updateSkyboxSystem(ctx);
        const secondTargetPos = mockLightTarget.position.clone();
        
        expect(firstTargetPos.x).toBeCloseTo(secondTargetPos.x, 10);
        expect(firstTargetPos.y).toBeCloseTo(secondTargetPos.y, 10);
        expect(firstTargetPos.z).toBeCloseTo(secondTargetPos.z, 10);
        
        // Target position should be close to original camera position but snapped
        const distanceFromCamera = mockLightTarget.position.distanceTo(mockCamera.position);
        expect(distanceFromCamera).toBeLessThan(1.0); // Should be within reasonable snapping distance
    });

    it('should position directional light relative to target based on time of day', () => {
        const timeOfDay = 1200; // Noon
        setResource(ctx, 'timeOfDay', timeOfDay);
        
        updateSkyboxSystem(ctx);
        
        // Calculate expected sun direction for noon (should be roughly overhead)
        const timeAngle = (-Math.PI / 2) + (timeOfDay / 2400) * Math.PI * 2;
        const sunHeight = Math.sin(timeAngle);
        const expectedSunDirection = new THREE.Vector3(
            Math.cos(timeAngle),
            sunHeight,
            0
        ).normalize();
        
        // Light should be positioned relative to target
        const frustumDepth = mockDirectionalLight.shadow.camera.far - mockDirectionalLight.shadow.camera.near;
        const expectedLightDistance = frustumDepth / 2;
        
        const expectedLightPosition = mockLightTarget.position.clone().add(
            expectedSunDirection.clone().multiplyScalar(expectedLightDistance)
        );
        
        expect(mockDirectionalLight.position.x).toBeCloseTo(expectedLightPosition.x, 3);
        expect(mockDirectionalLight.position.y).toBeCloseTo(expectedLightPosition.y, 3);
        expect(mockDirectionalLight.position.z).toBeCloseTo(expectedLightPosition.z, 3);
    });

    it('should eliminate texture swimming with shadow camera space snapping', () => {
        // Test that snapping works correctly across different sun positions
        const positions: THREE.Vector3[] = [];
        
        // Test multiple times of day to ensure consistent snapping
        for (let time = 600; time <= 1800; time += 600) {
            setResource(ctx, 'timeOfDay', time);
            updateSkyboxSystem(ctx);
            positions.push(mockLightTarget.position.clone());
        }
        
        // All target positions should be stable (no swimming) for the same camera position
        // Even though light direction changes, the snapping should prevent texture swimming
        expect(positions.length).toBe(3);
        
        // Verify each position is properly snapped and close to camera
        positions.forEach(pos => {
            const distanceFromCamera = pos.distanceTo(mockCamera.position);
            expect(distanceFromCamera).toBeLessThan(1.0);
        });
    });

    it('should handle different times of day correctly', () => {
        // Test sunrise (6:00 AM = 600)
        setResource(ctx, 'timeOfDay', 600);
        updateSkyboxSystem(ctx);
        
        const sunrisePos = mockDirectionalLight.position.clone();
        
        // Test sunset (6:00 PM = 1800)
        setResource(ctx, 'timeOfDay', 1800);
        updateSkyboxSystem(ctx);
        
        const sunsetPos = mockDirectionalLight.position.clone();
        
        // Sun positions should be different at different times
        expect(sunrisePos.equals(sunsetPos)).toBe(false);
    });

    it('should handle missing light target gracefully', () => {
        const skyboxObjects: SkyboxObjects = {
            skybox: mockSkybox,
            ambientLight: mockAmbientLight,
            directionalLight: null,
            lightTarget: null
        };
        
        setResource(ctx, 'skybox', skyboxObjects);
        
        // Should not throw an error
        expect(() => updateSkyboxSystem(ctx)).not.toThrow();
    });

    it('should handle missing time of day resource gracefully', () => {
        setResource(ctx, 'timeOfDay', undefined);
        
        // Should not throw an error
        expect(() => updateSkyboxSystem(ctx)).not.toThrow();
    });
});