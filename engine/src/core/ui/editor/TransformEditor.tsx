/**
 * Transform Editor
 * Editable transform properties (position, rotation, scale)
 */

import React, { useState, useEffect } from 'react';
import { Typography, Divider, Button } from 'antd';
import { Vector3Input } from './components/Vector3Input';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { Transform } from '../../components/Transform';
import { hasComponent } from 'bitecs';
import * as THREE from 'three';
import { TransformCommand } from '../../editor/commands/TransformCommand';
import { MotionSource } from '../../components/MotionSource';
import { syncObject3DTransformFromECS } from '../../systems/bodyRendering';
import type { ECSContext } from '../../ecs';

const { Text } = Typography;

export function syncTransformTargets(ctx: ECSContext, eid: number) {
  syncObject3DTransformFromECS(ctx, eid);

  if (!hasComponent(ctx, MotionSource, eid)) return;

  const handle = MotionSource.bodyHandle[eid];
  if (handle === undefined) return;

  if (!ctx.rapier?.world) return;

  const rb = ctx.rapier.world.getRigidBody(handle);
  if (!rb) return;

  const translation = { x: Transform.x[eid], y: Transform.y[eid], z: Transform.z[eid] };
  const rotation = {
    x: Transform.qx[eid],
    y: Transform.qy[eid],
    z: Transform.qz[eid],
    w: Transform.qw[eid]
  };

  if (rb.isKinematic()) {
    rb.setNextKinematicTranslation(translation);
    rb.setNextKinematicRotation(rotation as any);
  } else {
    rb.setTranslation(translation, true);
    rb.setRotation(rotation as any, true);
  }
}

export function TransformEditor({ eid }: { eid: number }) {
  const api = useAPI();
  const { executeCommand } = useEditor();
  const ctx = api.ecsWorld;
  
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const [isEditing, setIsEditing] = useState(false);
  const [capturedTransform, setCapturedTransform] = useState<any>(null);
  
  // Read transform from entity (but only when not actively editing)
  useEffect(() => {
    if (!hasComponent(ctx, Transform, eid)) return;
    
    let frameId: number;
    
    const update = () => {
      // Skip updates while user is actively editing to prevent value reset
      if (!isEditing) {
        // Position
        setPosition({
          x: parseFloat(Transform.x[eid].toFixed(2)),
          y: parseFloat(Transform.y[eid].toFixed(2)),
          z: parseFloat(Transform.z[eid].toFixed(2)),
        });
        
        // Rotation (quaternion to euler)
        const quat = new THREE.Quaternion(
          Transform.qx[eid],
          Transform.qy[eid],
          Transform.qz[eid],
          Transform.qw[eid]
        );
        const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
        setRotation({
          x: parseFloat((euler.x * 180 / Math.PI).toFixed(1)),
          y: parseFloat((euler.y * 180 / Math.PI).toFixed(1)),
          z: parseFloat((euler.z * 180 / Math.PI).toFixed(1)),
        });
        
        // Scale
        setScale({
          x: parseFloat(Transform.sx[eid].toFixed(2)),
          y: parseFloat(Transform.sy[eid].toFixed(2)),
          z: parseFloat(Transform.sz[eid].toFixed(2)),
        });
      }
      
      frameId = requestAnimationFrame(update);
    };
    
    update();
    
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [eid, ctx, isEditing]);
  
  // Capture initial transform when starting to edit
  const handleChangeStart = () => {
    if (!isEditing) {
      setCapturedTransform(TransformCommand.captureTransform(ctx, eid));
      setIsEditing(true);
    }
  };
  
  // Apply changes and create undo command when done editing
  const handleChangeEnd = () => {
    if (isEditing && capturedTransform) {
      const newTransform = TransformCommand.captureTransform(ctx, eid);
      const command = new TransformCommand(ctx, eid, capturedTransform, newTransform);
      executeCommand(command);
      
      setIsEditing(false);
      setCapturedTransform(null);
    }
  };
  
  // Update position
  const updatePosition = (pos: { x: number; y: number; z: number }) => {
    if (!hasComponent(ctx, Transform, eid)) return;
    
    Transform.x[eid] = pos.x;
    Transform.y[eid] = pos.y;
    Transform.z[eid] = pos.z;

    syncTransformTargets(ctx, eid);
  };
  
  // Update rotation
  const updateRotation = (rot: { x: number; y: number; z: number }) => {
    if (!hasComponent(ctx, Transform, eid)) return;
    
    // Convert degrees to radians
    const euler = new THREE.Euler(
      rot.x * Math.PI / 180,
      rot.y * Math.PI / 180,
      rot.z * Math.PI / 180,
      'XYZ'
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);
    
    Transform.qx[eid] = quat.x;
    Transform.qy[eid] = quat.y;
    Transform.qz[eid] = quat.z;
    Transform.qw[eid] = quat.w;

    syncTransformTargets(ctx, eid);
  };
  
  // Update scale
  const updateScale = (scl: { x: number; y: number; z: number }) => {
    if (!hasComponent(ctx, Transform, eid)) return;
    
    Transform.sx[eid] = scl.x;
    Transform.sy[eid] = scl.y;
    Transform.sz[eid] = scl.z;

    syncTransformTargets(ctx, eid);
  };
  
  if (!hasComponent(ctx, Transform, eid)) {
    return (
      <Text style={{ color: '#999' }}>No Transform component</Text>
    );
  }
  
  return (
    <div>
      <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
        Transform
      </Text>
      <Divider style={{ margin: '8px 0', background: '#444' }} />
      
      <div>
        <Vector3Input
          label="Position"
          value={position}
          onChange={(pos) => {
            setPosition(pos);
            updatePosition(pos);
          }}
          step={0.1}
          onFocus={handleChangeStart}
          onBlur={handleChangeEnd}
        />
        
        <Vector3Input
          label="Rotation (degrees)"
          value={rotation}
          onChange={(rot) => {
            setRotation(rot);
            updateRotation(rot);
          }}
          step={1}
          precision={1}
          onFocus={handleChangeStart}
          onBlur={handleChangeEnd}
        />
        
        <Vector3Input
          label="Scale"
          value={scale}
          onChange={(scl) => {
            setScale(scl);
            updateScale(scl);
          }}
          step={0.1}
          onFocus={handleChangeStart}
          onBlur={handleChangeEnd}
        />
      </div>
      
      <Button
        size="small"
        onClick={() => {
          const before = TransformCommand.captureTransform(ctx, eid);
          Transform.x[eid] = 0;
          Transform.y[eid] = 0;
          Transform.z[eid] = 0;
          const after = TransformCommand.captureTransform(ctx, eid);
          executeCommand(new TransformCommand(ctx, eid, before, after));
        }}
        style={{ marginTop: '8px' }}
      >
        Reset Position
      </Button>
    </div>
  );
}
