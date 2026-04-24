/**
 * Body Editor
 * Edit entity body geometry and physics properties
 */

import React, { useState, useEffect } from 'react';
import { Typography, Select, InputNumber, Checkbox, Divider, Button, Space, message } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { Body as BodyComponent } from '../../components/Body';
import { hasComponent } from 'bitecs';
import { getEntityBundle } from '../../despawn';
import { spawn } from '../../spawn';
import { despawn } from '../../despawn';
import { ModifyBodyCommand } from '../../editor/commands/BodyCommand';
import type { Body } from '../../schema';

const { Text } = Typography;

interface BodyEditorProps {
  eid: number;
}

export function BodyEditor({ eid }: BodyEditorProps) {
  const api = useAPI();
  const { executeCommand } = useEditor();
  const ctx = api.ecsWorld;

  const [bodyType, setBodyType] = useState<string>('composite');
  const [geometryType, setGeometryType] = useState<string>('box');
  const [dimensions, setDimensions] = useState({ x: 1, y: 1, z: 1 });
  const [radius, setRadius] = useState(0.5);
  const [height, setHeight] = useState(1);
  const [isStatic, setIsStatic] = useState(false);
  const [mass, setMass] = useState(1);
  const [loading, setLoading] = useState(false);

  // Load current body configuration
  useEffect(() => {
    if (!hasComponent(ctx, BodyComponent, eid)) return;

    const bundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    if (bundle.Body) {
      const body: Body = bundle.Body;
      setBodyType(body.type);

      if (body.type === 'composite' && body.params?.parts?.length > 0) {
        const firstPart = body.params.parts[0] as any;
        if (firstPart.geometry) {
          const geom = firstPart.geometry;
          setGeometryType(geom.type);

          if (geom.type === 'box' && geom.params) {
            setDimensions({
              x: geom.params.lengthX ?? 1,
              y: geom.params.lengthY ?? 1,
              z: geom.params.lengthZ ?? 1,
            });
          } else if (geom.type === 'sphere' && geom.params) {
            setRadius(geom.params.radius ?? 0.5);
          } else if ((geom.type === 'cylinder' || geom.type === 'capsule') && geom.params) {
            setRadius(geom.params.radius ?? 0.5);
            setHeight(geom.params.height ?? 1);
          }
        }
      }
    }
  }, [eid, ctx]);

  const handleApply = async () => {
    setLoading(true);
    try {
      // Capture current body state
      const oldBundle = getEntityBundle(ctx, eid);

      // Create new body definition based on current selections
      let newBodyDef: Body;

      if (geometryType === 'box') {
        newBodyDef = {
          type: 'composite',
          params: {
            parts: [{
              geometry: {
                type: 'box',
                params: { 
                  lengthX: dimensions.x, 
                  lengthY: dimensions.y, 
                  lengthZ: dimensions.z 
                }
              },
              material: {
                type: 'solid',
                params: { color: '#888888' }
              }
            } as any]
          }
        };
      } else if (geometryType === 'sphere') {
        newBodyDef = {
          type: 'composite',
          params: {
            parts: [{
              geometry: {
                type: 'sphere',
                params: { radius }
              },
              material: {
                type: 'solid',
                params: { color: '#888888' }
              }
            } as any]
          }
        };
      } else if (geometryType === 'cylinder') {
        newBodyDef = {
          type: 'composite',
          params: {
            parts: [{
              geometry: {
                type: 'cylinder',
                params: { radius, height }
              },
              material: {
                type: 'solid',
                params: { color: '#888888' }
              }
            } as any]
          }
        };
      } else if (geometryType === 'capsule') {
        newBodyDef = {
          type: 'composite',
          params: {
            parts: [{
              geometry: {
                type: 'capsule',
                params: { radius, height }
              },
              material: {
                type: 'solid',
                params: { color: '#888888' }
              }
            } as any]
          }
        };
      } else {
        message.error(`Geometry type ${geometryType} not yet supported`);
        setLoading(false);
        return;
      }

      // Create and execute command
      const command = new ModifyBodyCommand(
        ctx,
        api,
        eid,
        oldBundle.Body,
        newBodyDef
      );

      executeCommand(command);
      message.success('Body updated successfully');
    } catch (error) {
      console.error('Failed to update body:', error);
      message.error('Failed to update body');
    } finally {
      setLoading(false);
    }
  };

  if (!hasComponent(ctx, BodyComponent, eid)) {
    return (
      <Text style={{ color: '#999', fontSize: '12px' }}>
        Entity has no Body component
      </Text>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>
        Body Geometry
      </Text>

      {/* Geometry Type */}
      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Geometry Type
        </Text>
        <Select
          value={geometryType}
          onChange={setGeometryType}
          style={{ width: '100%' }}
          size="small"
          options={[
            { value: 'box', label: 'Box' },
            { value: 'sphere', label: 'Sphere' },
            { value: 'cylinder', label: 'Cylinder' },
            { value: 'capsule', label: 'Capsule' },
          ]}
        />
      </div>

      {/* Dimensions based on geometry type */}
      {geometryType === 'box' && (
        <>
          <div style={{ marginBottom: '8px' }}>
            <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Width (X)
            </Text>
            <InputNumber
              value={dimensions.x}
              onChange={(val) => setDimensions({ ...dimensions, x: val ?? 1 })}
              style={{ width: '100%' }}
              size="small"
              min={0.1}
              step={0.1}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Height (Y)
            </Text>
            <InputNumber
              value={dimensions.y}
              onChange={(val) => setDimensions({ ...dimensions, y: val ?? 1 })}
              style={{ width: '100%' }}
              size="small"
              min={0.1}
              step={0.1}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Depth (Z)
            </Text>
            <InputNumber
              value={dimensions.z}
              onChange={(val) => setDimensions({ ...dimensions, z: val ?? 1 })}
              style={{ width: '100%' }}
              size="small"
              min={0.1}
              step={0.1}
            />
          </div>
        </>
      )}

      {geometryType === 'sphere' && (
        <div style={{ marginBottom: '8px' }}>
          <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Radius
          </Text>
          <InputNumber
            value={radius}
            onChange={(val) => setRadius(val ?? 0.5)}
            style={{ width: '100%' }}
            size="small"
            min={0.1}
            step={0.1}
          />
        </div>
      )}

      {(geometryType === 'cylinder' || geometryType === 'capsule') && (
        <>
          <div style={{ marginBottom: '8px' }}>
            <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Radius
            </Text>
            <InputNumber
              value={radius}
              onChange={(val) => setRadius(val ?? 0.5)}
              style={{ width: '100%' }}
              size="small"
              min={0.1}
              step={0.1}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Height
            </Text>
            <InputNumber
              value={height}
              onChange={(val) => setHeight(val ?? 1)}
              style={{ width: '100%' }}
              size="small"
              min={0.1}
              step={0.1}
            />
          </div>
        </>
      )}

      <Divider style={{ margin: '12px 0', background: '#444' }} />

      {/* Physics Properties */}
      <div style={{ marginBottom: '12px' }}>
        <Checkbox
          checked={isStatic}
          onChange={(e) => setIsStatic(e.target.checked)}
          style={{ color: '#ccc' }}
        >
          Static (No Physics)
        </Checkbox>
      </div>

      {!isStatic && (
        <div style={{ marginBottom: '12px' }}>
          <Text style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Mass
          </Text>
          <InputNumber
            value={mass}
            onChange={(val) => setMass(val ?? 1)}
            style={{ width: '100%' }}
            size="small"
            min={0.1}
            step={0.1}
          />
        </div>
      )}

      <Divider style={{ margin: '12px 0', background: '#444' }} />

      {/* Apply Button */}
      <Button
        type="primary"
        onClick={handleApply}
        loading={loading}
        block
        size="small"
      >
        Apply Changes
      </Button>

      <Text style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '8px' }}>
        Note: Applying changes will respawn the entity
      </Text>
    </div>
  );
}
