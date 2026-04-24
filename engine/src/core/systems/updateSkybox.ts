import { ECSContext, getResource, setResource, } from "../ecs";
import { SkyboxObjects } from "../..";
import * as THREE from 'three';
import { timeToSunDirection } from "../../utils/math";

export const updateSkyboxSystem = (ctx: ECSContext) => {
    const objs = getResource<SkyboxObjects>(ctx, 'skybox');
    const camera = ctx.three.camera;
    const timeOfDay = getResource<number>(ctx, 'timeOfDay', true);

    if (!objs || !camera) return;

    // Update skybox position to follow camera
    objs.skybox.position.copy(camera.position);
    objs.skybox.updateMatrixWorld();

    // Update skybox shader uniforms
    if (objs.skybox.material instanceof THREE.ShaderMaterial && timeOfDay !== undefined) {
        // uniforms: {
        //     topColor: { value: skyColor },
        //     bottomColor: { value: skyColor.clone().multiplyScalar(0.6) },
        //     offset: { value: 0.0 }, // small vertical shift
        //     exponent: { value: 0.6 },
        //     sunDirection: { value: new THREE.Vector3() },
        //     sunColor: { value: new THREE.Color(0xffffff) },
        //     sunIntensity: { value: 0 },
        //     cloudsColor: { value: new THREE.Color(0xffffff) },
        //     cloudsCoverage: { value: 0.25 },
        //     starsIntensity: { value: 0 }
        // }
        objs.skybox.material.uniforms.sunDirection.value = timeToSunDirection(timeOfDay);
    }

    // Update directional light and target if they exist
    if (objs.directionalLight && objs.lightTarget && timeOfDay !== undefined) {
        // Calculate sun direction based on time of day first
        const timeAngle = (-Math.PI / 2) + (timeOfDay / 2400) * Math.PI * 2;
        const sunHeight = Math.sin(timeAngle);
        const sunDirection = new THREE.Vector3(
            Math.cos(timeAngle),
            sunHeight,
            0
        ).normalize();

        // Temporarily position the light to establish shadow camera orientation
        const frustumDepth = objs.directionalLight.shadow.camera.far - objs.directionalLight.shadow.camera.near;
        const lightDistance = frustumDepth / 2;

        const tempLightPosition = camera.position.clone().add(
            sunDirection.clone().multiplyScalar(lightDistance)
        );

        objs.directionalLight.position.copy(tempLightPosition);
        objs.directionalLight.target.position.copy(camera.position);
        objs.directionalLight.updateMatrixWorld();

        // Update shadow camera matrices to get correct view matrix
        const shadowCamera = objs.directionalLight.shadow.camera;
        shadowCamera.updateMatrixWorld();
        shadowCamera.updateProjectionMatrix();

        // Calculate texel size in shadow camera space
        const shadowMapSize = objs.directionalLight.shadow.mapSize.width;
        const shadowCameraWidth = shadowCamera.right - shadowCamera.left;
        const shadowCameraHeight = shadowCamera.top - shadowCamera.bottom;
        const texelSizeX = shadowCameraWidth / shadowMapSize;
        const texelSizeY = shadowCameraHeight / shadowMapSize;

        // Transform camera position to shadow camera space
        const shadowViewMatrix = new THREE.Matrix4();
        shadowViewMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse);

        const cameraInShadowSpace = camera.position.clone();
        cameraInShadowSpace.applyMatrix4(shadowCamera.matrixWorldInverse);

        // Snap to texel boundaries in shadow camera space
        const snappedShadowPos = new THREE.Vector3(
            Math.round(cameraInShadowSpace.x / texelSizeX) * texelSizeX,
            Math.round(cameraInShadowSpace.y / texelSizeY) * texelSizeY,
            cameraInShadowSpace.z // Don't snap Z as it doesn't affect shadow map texels
        );

        // Transform back to world space
        const snappedWorldPos = snappedShadowPos.clone();
        snappedWorldPos.applyMatrix4(shadowCamera.matrixWorld);

        // Position target at snapped world position
        objs.lightTarget.position.copy(snappedWorldPos);

        // Reposition directional light relative to snapped target
        const finalLightPosition = objs.lightTarget.position.clone().add(
            sunDirection.clone().multiplyScalar(lightDistance)
        );

        objs.directionalLight.position.copy(finalLightPosition);
        objs.directionalLight.updateMatrixWorld();
    }
}
