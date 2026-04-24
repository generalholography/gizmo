import * as THREE from 'three';

const DEBUG_TRANSFORM_LINE_LENGTH = 0.5; // configurable length for axis lines

export function computeDebugTransforms(root: THREE.Object3D, drawAllRendererPartTransforms = false): { vertices: number[], colors: number[] } {
    const vertices: number[] = [];
    const colors: number[] = [];
    const traverse = (obj: THREE.Object3D, depth: number) => {
        // Only show for visible objects
        if (!obj.visible) return;
        const pos = new THREE.Vector3();
        obj.getWorldPosition(pos);
        const mat = obj.matrixWorld;
        // Local axes in world space
        const xAxis = new THREE.Vector3(1, 0, 0).applyMatrix4(mat).sub(pos).normalize().multiplyScalar(DEBUG_TRANSFORM_LINE_LENGTH).add(pos);
        const yAxis = new THREE.Vector3(0, 1, 0).applyMatrix4(mat).sub(pos).normalize().multiplyScalar(DEBUG_TRANSFORM_LINE_LENGTH).add(pos);
        const zAxis = new THREE.Vector3(0, 0, 1).applyMatrix4(mat).sub(pos).normalize().multiplyScalar(DEBUG_TRANSFORM_LINE_LENGTH).add(pos);

        // X axis (red)
        vertices.push(pos.x, pos.y, pos.z, xAxis.x, xAxis.y, xAxis.z);
        colors.push(0.25, 0, 0, 1, 0, 0);
        // Y axis (green)
        vertices.push(pos.x, pos.y, pos.z, yAxis.x, yAxis.y, yAxis.z);
        colors.push(0, 0.25, 0, 0, 1, 0);
        // Z axis (blue)
        vertices.push(pos.x, pos.y, pos.z, zAxis.x, zAxis.y, zAxis.z);
        colors.push(0, 0, 0.25, 0, 0, 1);

        if (!drawAllRendererPartTransforms && depth > 0) return;

        for (const child of obj.children) traverse(child, depth + 1);
    };
    traverse(root, 0);
    return { vertices, colors };
}