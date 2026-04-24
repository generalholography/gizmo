/**
 * Editor HUD
 * Main editor interface with toolbar, hierarchy, inspector, and additional panels
 */

import React, { useEffect } from "react";
import { useAPI } from "./App";
import { EditorProvider } from "./editor/EditorContext";
import { Toolbar } from "./editor/Toolbar";
import { HierarchyPanel } from "./editor/HierarchyPanel";
import { InspectorPanel } from "./editor/InspectorPanel";
import { BottomBar } from "./editor/BottomBar";
import {
  componentSchemaRegistry,
  TransformSchema,
  BodySchema,
  MotionSourceSchema,
  HealthSchema,
  InfoSchema,
  AnimationSchema,
  InventorySchema,
  worldSchemaRegistry,
  WorldDimensionsSchema,
  WorldMetadataSchema,
  WorldRuntimeSchema,
  AISchema,
  FactionSchema,
  PlayerSchema,
  StableIDSchema,
  VelocitySchema,
  HeldSchema,
  OwnerSchema,
  MountingSchema,
  MountedBySchema,
  StaticCameraSchema,
  DamageFlashSchema,
  SpawnedAtSchema,
} from "../editor/schema";

type EditorHUDProps = {
  onRequestComposer?: () => void;
  onSaveWorld?: (worldId: string) => Promise<void>;
  onOpenPlayMode?: (mode: 'game' | 'display') => void;
};

export default function EditorHUD({ onRequestComposer, onSaveWorld, onOpenPlayMode }: EditorHUDProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;

  // Register component schemas on mount
  useEffect(() => {
    // Register schemas for generic editor
    componentSchemaRegistry.register(TransformSchema);
    componentSchemaRegistry.register(BodySchema);
    componentSchemaRegistry.register(MotionSourceSchema);
    componentSchemaRegistry.register(HealthSchema);
    componentSchemaRegistry.register(InfoSchema);
    componentSchemaRegistry.register(AISchema);
    componentSchemaRegistry.register(AnimationSchema);
    componentSchemaRegistry.register(InventorySchema);
    componentSchemaRegistry.register(FactionSchema);
    componentSchemaRegistry.register(PlayerSchema);
    componentSchemaRegistry.register(StableIDSchema);
    componentSchemaRegistry.register(VelocitySchema);
    componentSchemaRegistry.register(HeldSchema);
    componentSchemaRegistry.register(OwnerSchema);
    componentSchemaRegistry.register(MountingSchema);
    componentSchemaRegistry.register(MountedBySchema);
    componentSchemaRegistry.register(StaticCameraSchema);
    componentSchemaRegistry.register(DamageFlashSchema);
    componentSchemaRegistry.register(SpawnedAtSchema);

    worldSchemaRegistry.register(WorldMetadataSchema);
    worldSchemaRegistry.register(WorldDimensionsSchema);
    worldSchemaRegistry.register(WorldRuntimeSchema);

    return () => {
      // Clean up on unmount
      componentSchemaRegistry.clear();
      worldSchemaRegistry.clear();
    };
  }, []);

  return (
    <EditorProvider
      engine={api}
      ctx={ctx}
      onRequestComposer={onRequestComposer}
      onSaveWorld={onSaveWorld}
      onOpenPlayMode={onOpenPlayMode}
      children={
        <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <Toolbar />
          <HierarchyPanel />
          <InspectorPanel />
          <BottomBar />
        </div>
      }
    />
  );
}
