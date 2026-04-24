/**
 * Generic Component Editor
 * Auto-generates UI for any component based on its schema
 * Supports compact field rows for Figma-like dense UI layouts
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Typography, message } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { getEntityBundle } from '../../despawn';
import { applyBundle } from '../../spawn';
import { componentSchemaRegistry } from '../../editor/schema/ComponentSchemaRegistry';
import { ModifyComponentCommand } from '../../editor/commands/ModifyComponentCommand';
import { EDITOR_COLORS, EDITOR_SPACING } from './styles/tokens';
import * as THREE from 'three';
import { SchemaSurfaceEditor } from './components/SchemaSurfaceEditor';

const { Text } = Typography;

// Standard options for getting entity bundles in the editor
const EDITOR_BUNDLE_OPTIONS = {
  includeRuntime: false,
  includeRuntimeComponents: false
};

interface GenericComponentEditorProps {
  eid: number;
  componentName: string;
}

function normalizeVector3(input: any, fallback: { x: number; y: number; z: number }) {
  if (Array.isArray(input)) {
    return {
      x: input[0] ?? fallback.x,
      y: input[1] ?? fallback.y,
      z: input[2] ?? fallback.z,
    };
  }

  if (input && typeof input === 'object') {
    return {
      x: input.x ?? fallback.x,
      y: input.y ?? fallback.y,
      z: input.z ?? fallback.z,
    };
  }

  return fallback;
}

function normalizePayload(componentName: string, data: any) {
  if (componentName !== 'Transform') return data;

  const position = normalizeVector3(
    data.position ?? { x: data.x, y: data.y, z: data.z },
    { x: data.x ?? 0, y: data.y ?? 0, z: data.z ?? 0 },
  );

  const rotation = normalizeVector3(
    data.rotation ?? { x: data.rx, y: data.ry, z: data.rz },
    { x: data.rx ?? 0, y: data.ry ?? 0, z: data.rz ?? 0 },
  );

  const scale = normalizeVector3(
    data.scale ?? { x: data.sx, y: data.sy, z: data.sz },
    { x: data.sx ?? 1, y: data.sy ?? 1, z: data.sz ?? 1 },
  );

  const hasEulerRotation =
    data.rotation !== undefined ||
    data.rx !== undefined ||
    data.ry !== undefined ||
    data.rz !== undefined;

  const next = {
    ...data,
    x: position.x ?? 0,
    y: position.y ?? 0,
    z: position.z ?? 0,
    rx: rotation.x ?? 0,
    ry: rotation.y ?? 0,
    rz: rotation.z ?? 0,
    sx: scale.x ?? 1,
    sy: scale.y ?? 1,
    sz: scale.z ?? 1,
  };

  // If the inspector provided euler values, drop any stale quaternion so it gets recalculated
  if (hasEulerRotation) {
    delete (next as any).qx;
    delete (next as any).qy;
    delete (next as any).qz;
    delete (next as any).qw;
  }

  delete (next as any).position;
  delete (next as any).rotation;
  delete (next as any).scale;

  return next;
}

function toViewData(componentName: string, data: any) {
  if (componentName !== 'Transform') return data;

  const position = normalizeVector3(
    data.position ?? { x: data.x, y: data.y, z: data.z },
    { x: data.x ?? 0, y: data.y ?? 0, z: data.z ?? 0 },
  );

  const rotationFromEuler = (data.rx !== undefined || data.ry !== undefined || data.rz !== undefined)
    ? { x: data.rx ?? 0, y: data.ry ?? 0, z: data.rz ?? 0 }
    : null;

  const hasQuaternion = [data.qx, data.qy, data.qz, data.qw].every((v) => v !== undefined);
  let rotation = rotationFromEuler;
  if (!rotation && hasQuaternion) {
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(data.qx, data.qy, data.qz, data.qw),
      'XYZ'
    );
    rotation = { x: euler.x, y: euler.y, z: euler.z };
  }
  rotation = normalizeVector3(data.rotation ?? rotation ?? { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });

  const scale = normalizeVector3(
    data.scale ?? { x: data.sx, y: data.sy, z: data.sz },
    { x: data.sx ?? 1, y: data.sy ?? 1, z: data.sz ?? 1 },
  );

  return {
    ...data,
    position,
    rotation,
    scale,
  };
}

function applyFieldChange(componentName: string, fieldName: string, value: any, prev: any) {
  if (componentName !== 'Transform') {
    return {
      ...prev,
      [fieldName]: value,
    };
  }

  if (fieldName === 'position') {
    const pos = normalizeVector3(value, { x: prev.x ?? 0, y: prev.y ?? 0, z: prev.z ?? 0 });
    const next = { ...prev, x: pos.x, y: pos.y, z: pos.z };
    delete (next as any).position;
    return next;
  }

  if (fieldName === 'rotation') {
    const rot = normalizeVector3(value, { x: prev.rx ?? 0, y: prev.ry ?? 0, z: prev.rz ?? 0 });
    const next: any = { ...prev, rx: rot.x, ry: rot.y, rz: rot.z };
    delete next.qx;
    delete next.qy;
    delete next.qz;
    delete next.qw;
    delete next.rotation;
    return next;
  }

  if (fieldName === 'scale') {
    const scl = normalizeVector3(value, { x: prev.sx ?? 1, y: prev.sy ?? 1, z: prev.sz ?? 1 });
    const next = { ...prev, sx: scl.x, sy: scl.y, sz: scl.z };
    delete (next as any).scale;
    return next;
  }

  return {
    ...prev,
    [fieldName]: value,
  };
}

export function GenericComponentEditor({ eid, componentName }: GenericComponentEditorProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand } = useEditor();
  const committedComponentRef = useRef<any>({});
  const latestComponentDataRef = useRef<any>({});
  const dirtyRef = useRef(false);
  
  // Get schema for this component
  const schema = componentSchemaRegistry.get(componentName);

  const [componentData, setComponentData] = useState<any>({});
  
  // Load current component data
  useEffect(() => {
    try {
      const bundle = getEntityBundle(ctx, eid, EDITOR_BUNDLE_OPTIONS);
      const loaded = bundle[componentName] || {};
      committedComponentRef.current = loaded;
      latestComponentDataRef.current = loaded;
      dirtyRef.current = false;
      setComponentData(loaded);
    } catch (error) {
      console.error(`Failed to load ${componentName} data:`, error);
    }
  }, [eid, componentName, ctx]);
  
  if (!schema) {
    return (
      <Text style={{ color: '#999', fontSize: '12px' }}>
        No schema registered for {componentName}
      </Text>
    );
  }
  
  const handleFieldChange = (fieldName: string, value: any) => {
    setComponentData((prev: any) => {
      const next = applyFieldChange(componentName, fieldName, value, prev);
      latestComponentDataRef.current = next;
      dirtyRef.current = true;

      // Live-sync non-structural components (like Transform) while editing
      if (!schema.isStructural) {
        try {
          const payload = normalizePayload(componentName, next);
          applyBundle(ctx, eid, { [componentName]: payload });
        } catch (error) {
          console.warn(`Failed to live-apply ${componentName}:`, error);
        }
      }

      return next;
    });
  };

  const handleApply = (data?: any, previousComponentData?: any) => {
    try {
      const payload = normalizePayload(componentName, data ?? componentData);
      console.log(`[GenericComponentEditor] Applying ${componentName} with data:`, JSON.stringify(payload, null, 2));

      const command = new ModifyComponentCommand(
        ctx,
        api,
        eid,
        componentName,
        payload,
        schema.isStructural,
        { previousComponentData: previousComponentData ?? committedComponentRef.current }
      );

      executeCommand(command);
      committedComponentRef.current = payload;
      latestComponentDataRef.current = payload;
      dirtyRef.current = false;
      message.success(`${schema.displayName} updated`);
    } catch (error) {
      console.error(`Failed to update ${componentName}:`, error);
      message.error(`Failed to update ${schema.displayName}`);
    }
  };

  const handleFieldCommit = (fieldName: string, value: any) => {
    const previousComponentData = committedComponentRef.current;
    const nextData = applyFieldChange(componentName, fieldName, value, componentData);
    setComponentData(nextData);
    handleApply(nextData, previousComponentData);
  };

  const viewData = useMemo(() => toViewData(componentName, componentData), [componentName, componentData]);
  latestComponentDataRef.current = componentData;

  useEffect(() => {
    return () => {
      if (!schema || !dirtyRef.current) return;

      try {
        const payload = normalizePayload(componentName, latestComponentDataRef.current);
        const command = new ModifyComponentCommand(
          ctx,
          api,
          eid,
          componentName,
          payload,
          schema.isStructural,
          { previousComponentData: committedComponentRef.current }
        );
        executeCommand(command);
        committedComponentRef.current = payload;
        dirtyRef.current = false;
      } catch (error) {
        console.error(`Failed to commit ${componentName} on unmount:`, error);
      }
    };
  }, [api, componentName, ctx, eid, executeCommand, schema]);
  
  return (
    <div>
      <SchemaSurfaceEditor
        fields={schema.fields}
        groups={schema.groups}
        value={viewData}
        onFieldChange={handleFieldChange}
        onFieldCommit={handleFieldCommit}
      />
      {schema.isStructural && (
        <Text style={{ color: EDITOR_COLORS.warning, fontSize: '11px', display: 'block', marginTop: EDITOR_SPACING.sm }}>
          ⚠️ Changes require entity respawn
        </Text>
      )}
    </div>
  );
}
