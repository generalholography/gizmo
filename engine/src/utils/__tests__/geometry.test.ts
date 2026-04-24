import * as THREE from "three";
import { Transform } from "../geometry";
import { describe, it, expect, vi } from 'vitest';

describe("Transform", () => {
    const epsilon = 1e-6;

    function vectorsAreApproxEqual(v1: THREE.Vector3, v2: THREE.Vector3): boolean {
        return v1.distanceTo(v2) < epsilon;
    }

    function quaternionsAreApproxEqual(q1: THREE.Quaternion, q2: THREE.Quaternion): boolean {
        return Math.abs(q1.x - q2.x) < epsilon &&
               Math.abs(q1.y - q2.y) < epsilon &&
               Math.abs(q1.z - q2.z) < epsilon &&
               Math.abs(q1.w - q2.w) < epsilon;
    }

    it("should initialize with default values", () => {
        const transform = new Transform();
        expect(vectorsAreApproxEqual(transform.position, new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(quaternionsAreApproxEqual(transform.rotation, new THREE.Quaternion())).toBe(true);
        expect(vectorsAreApproxEqual(transform.scale, new THREE.Vector3(1, 1, 1))).toBe(true);
        expect(vectorsAreApproxEqual(transform.xAxis, new THREE.Vector3(1, 0, 0))).toBe(true);
        expect(vectorsAreApproxEqual(transform.yAxis, new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(vectorsAreApproxEqual(transform.zAxis, new THREE.Vector3(0, 0, -1))).toBe(true);
    });

    it("should initialize with custom values", () => {
        const position = new THREE.Vector3(1, 2, 3);
        const rotation = new THREE.Euler(Math.PI / 2, 0, 0);
        const scale = new THREE.Vector3(2, 2, 2);
        const transform = new Transform(position, rotation, scale);

        expect(vectorsAreApproxEqual(transform.position, position)).toBe(true);
        expect(quaternionsAreApproxEqual(transform.rotation, new THREE.Quaternion().setFromEuler(rotation))).toBe(true);
        expect(vectorsAreApproxEqual(transform.scale, scale)).toBe(true);
    });

    it("should set rotation from Euler angles", () => {
        const transform = new Transform();
        const euler = new THREE.Euler(Math.PI / 4, Math.PI / 4, Math.PI / 4);
        transform.setRotationFromEuler(euler);

        expect(quaternionsAreApproxEqual(transform.rotation, new THREE.Quaternion().setFromEuler(euler))).toBe(true);
    });

    it("should return correct x, y, and z axes", () => {
        const transform = new Transform();
        const euler = new THREE.Euler(0, Math.PI / 2, 0);
        transform.setRotationFromEuler(euler);

        expect(vectorsAreApproxEqual(transform.xAxis, new THREE.Vector3(0, 0, -1))).toBe(true);
        expect(vectorsAreApproxEqual(transform.yAxis, new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(vectorsAreApproxEqual(transform.zAxis, new THREE.Vector3(-1, 0, 0))).toBe(true);
    });
});
