import { describe, it, expect } from "vitest";
import { createECS } from "../../core/ecs";
import { meshModule } from "../mesh";
import { colliderModule } from "../collider";
import * as THREE from "three";
import { Primitive } from "../../core/schema";

describe("none geometry support", () => {
  it("should create empty mesh for none geometry", () => {
    const ctx = createECS();
    const mesh = meshModule(ctx);

    // Test with none geometry from schema
    const noneGeometry: Primitive["geometry"] = { type: "none" };
    const meshId = mesh.resolve(noneGeometry);
    const geometry = mesh.get(meshId);

    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.getAttribute("position")).toBeUndefined();
  });

  it("should create no colliders for none geometry", () => {
    const ctx = createECS();
    const collider = colliderModule(ctx);

    const colliderDef = {
      type: "fromPrimitive" as const,
      params: {
        geometry: { type: "none" as const },
        scale: { x: 1, y: 1, z: 1 }
      }
    };

    const colliderId = collider.resolve(colliderDef);
    const colliderResolved = collider.get(colliderId);
    const descriptors = colliderResolved.getDesc();

    expect(descriptors).toEqual([]);
  });

  it("should handle none geometry with optional params", () => {
    const ctx = createECS();
    const mesh = meshModule(ctx);

    // Test with params (should be ignored)
    const noneGeometryWithParams: Primitive["geometry"] = { 
      type: "none",
      params: { someProp: 123 }
    };
    
    const meshId = mesh.resolve(noneGeometryWithParams);
    const geometry = mesh.get(meshId);

    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.getAttribute("position")).toBeUndefined();
  });

  it("should accept none geometry in schema type", () => {
    // This test verifies TypeScript compilation - if "none" wasn't in the union,
    // this would fail at compile time
    const noneGeometry: Primitive["geometry"] = { type: "none" };
    const noneWithParams: Primitive["geometry"] = { type: "none", params: {} };
    
    expect(noneGeometry.type).toBe("none");
    expect(noneWithParams.type).toBe("none");
  });
});