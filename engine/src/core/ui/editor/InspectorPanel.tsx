/**
 * Inspector Panel
 * Shows and edits properties of the selected entity
 * Uses EDITOR_* design tokens for consistent styling
 */

import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Dropdown, message, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useEditor } from './EditorContext';
import { ComponentInspector } from './ComponentInspector';
import { WorldInspector } from './WorldInspector';
import { useAPI } from '../App';
import { loadWorldFromJSON, serializeWorldToJSON } from '../../worldPersistence';
import { serializeWorld } from '../../serializeWorld';
import { downloadBlob, exportModel, type ModelExportFormat } from '../../render/modelExport';
import { PanelTabs } from './components/PanelTabs';
import { PartInspector } from './PartInspector';
import { RenderInspector } from './RenderInspector';
import { InspectorMetadataModal } from './InspectorMetadataModal';
import { getEntityBundle } from '../../despawn';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY, EDITOR_RADIUS } from './styles/tokens';
import type { InspectorTab } from '../../editor/schema/FieldMetadata';
import { getPartAtPath, resolveBodyPartDisplayName } from '../../editor/utils/bodyParts';
import { PaneTitle } from './components/PaneTitle';
import { InspectorComponentSection } from './components/InspectorComponentSection';
import { VirtualizedInspectorList } from './components/VirtualizedInspectorList';

const { Text } = Typography;

// Debounce delay for inspector updates (ms)
const INSPECTOR_UPDATE_DEBOUNCE_MS = 100;
const PANE_INSET = EDITOR_SPACING.lg;

export function InspectorPanel() {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { selectedEntities, selectedPartPaths, sessionConfig } = useEditor();
  const selectedPartPath = selectedPartPaths?.[0];
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isModelExporting, setIsModelExporting] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<InspectorTab>('design');
  const [components, setComponents] = useState<Record<string, any>>({});
  const [dimensionName, setDimensionName] = useState('Unnamed dimension');
  const selectedEntity = selectedEntities[0];
  
  // Ref to track last update time for debouncing
  const lastUpdateRef = useRef<number>(0);
  const lastDimensionUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const exportTargetLabel = selectedEntity !== undefined && selectedEntity !== null ? 'Entity' : 'World';

  const shareMenu = useMemo<MenuProps['items']>(() => ([
    {
      key: 'export-model:gltf',
      label: `Export ${exportTargetLabel} as glTF`,
    },
    {
      key: 'export-model:glb',
      label: `Export ${exportTargetLabel} as GLB`,
    },
    {
      key: 'export-model:stl',
      label: `Export ${exportTargetLabel} as STL`,
    },
    {
      key: 'export-model:usdz',
      label: `Export ${exportTargetLabel} as USDZ`,
    },
    {
      type: 'divider',
    },
    {
      key: 'other',
      label: 'Other',
      children: [
        { key: 'save', label: 'Download World JSON' },
        { key: 'export', label: 'Export Script' },
      ],
    },
  ]), [exportTargetLabel]);

  const handleSaveWorld = () => {
    setIsSaving(true);
    try {
      api.saveWorldToFile();
      message.success('World JSON downloaded');
    } catch (error) {
      console.error('Failed to save world:', error);
      message.error('Failed to save world');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportScript = async () => {
    setIsExporting(true);
    try {
      const json = serializeWorldToJSON(ctx);
      const script = loadWorldFromJSON(json);
      const blob = new Blob([script], { type: 'application/javascript' });
      const filename = `world-script-${Date.now()}.js`;
      const exportBlob = api.getConfig().onExportBlob;
      if (exportBlob) {
        const result = await exportBlob({ blob, filename, mimeType: blob.type });
        const resultMessage = result && typeof result === 'object' ? result.message : undefined;
        const resultPath = result && typeof result === 'object' ? result.path : undefined;
        message.success(resultMessage || (resultPath ? `World script saved to ${resultPath}` : 'World script exported'));
      } else {
        downloadBlob(blob, filename);
        message.success('World script exported');
      }
    } catch (error) {
      console.error('Failed to export script:', error);
      message.error('Failed to export script');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportModel = async (format: ModelExportFormat) => {
    setIsModelExporting(true);
    try {
      const payload = await exportModel(ctx, {
        scope: selectedEntity !== undefined && selectedEntity !== null ? 'entity' : 'world',
        eid: selectedEntity ?? undefined,
        name: inspectorTitle,
      }, format);
      const exportBlob = api.getConfig().onExportBlob;
      if (exportBlob) {
        const result = await exportBlob({ blob: payload.blob, filename: payload.filename, mimeType: payload.blob.type });
        const resultMessage = result && typeof result === 'object' ? result.message : undefined;
        const resultPath = result && typeof result === 'object' ? result.path : undefined;
        message.success(resultMessage || (resultPath ? `${exportTargetLabel} ${format.toUpperCase()} saved to ${resultPath}` : `${exportTargetLabel} ${format.toUpperCase()} exported`));
      } else {
        downloadBlob(payload.blob, payload.filename);
        message.success(`${exportTargetLabel} ${format.toUpperCase()} exported`);
      }
    } catch (error) {
      console.error(`Failed to export ${format} model:`, error);
      message.error(`Failed to export ${exportTargetLabel.toLowerCase()} ${format.toUpperCase()}`);
    } finally {
      setIsModelExporting(false);
    }
  };

  useEffect(() => {
    if (selectedEntity === undefined || selectedEntity === null) {
      setActiveTab('design');
    }
  }, [selectedEntity]);

  const readEntityComponents = useCallback((eid: number) => {
    try {
      const bundle = getEntityBundle(ctx, eid, {
        includeRuntime: false,
        includeRuntimeComponents: false,
      });

      const { _meta, ...componentData } = bundle;
      return componentData;
    } catch (error) {
      console.warn('Failed to read inspector entity bundle:', error);
      return null;
    }
  }, [ctx]);

  useLayoutEffect(() => {
    if (selectedEntity === undefined || selectedEntity === null) {
      setComponents({});
      return;
    }

    const componentData = readEntityComponents(selectedEntity);
    if (componentData) {
      setComponents(componentData);
      lastUpdateRef.current = performance.now();
    }
  }, [readEntityComponents, selectedEntity]);

  // Debounced component update effect
  useEffect(() => {
    let frameId: number;
    let isActive = true;

    if (selectedEntity === undefined || selectedEntity === null) {
      return () => { isActive = false; };
    }

    const update = () => {
      if (!isActive) return;
      
      const now = performance.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Only update if enough time has passed (debounce)
      if (timeSinceLastUpdate >= INSPECTOR_UPDATE_DEBOUNCE_MS) {
        const componentData = readEntityComponents(selectedEntity);
        if (componentData) {
          setComponents(componentData);
          lastUpdateRef.current = now;
        }
      }

      frameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      isActive = false;
      if (frameId) cancelAnimationFrame(frameId);
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
  }, [readEntityComponents, selectedEntity]);

  useEffect(() => {
    let frameId: number;
    let isActive = true;

    if (selectedEntity !== undefined && selectedEntity !== null) {
      return () => { isActive = false; };
    }

    const updateDimensionName = () => {
      if (!isActive) return;

      const now = performance.now();
      const timeSinceLastUpdate = now - lastDimensionUpdateRef.current;
      if (timeSinceLastUpdate >= INSPECTOR_UPDATE_DEBOUNCE_MS) {
        const definition = serializeWorld(ctx, {
          includeEntities: false,
          includeRuntime: true,
        });
        const nextName = definition.dimensions?.[0]?.name?.trim() || 'Unnamed dimension';
        setDimensionName(nextName);
        lastDimensionUpdateRef.current = now;
      }

      frameId = requestAnimationFrame(updateDimensionName);
    };

    updateDimensionName();

    return () => {
      isActive = false;
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [ctx, selectedEntity]);

  const entityDisplayName = useMemo(() => {
    if (selectedEntity === undefined || selectedEntity === null) return '';
    const name = typeof components.Info?.name === 'string' ? components.Info.name.trim() : '';
    return name || `Entity #${selectedEntity}`;
  }, [components.Info?.name, selectedEntity]);

  const partDisplayName = useMemo(() => {
    if (selectedEntity === undefined || selectedEntity === null) return '';
    if (!selectedPartPath || selectedPartPath.length === 0) return '';
    const body = components.Body?.type === 'composite' ? components.Body : undefined;
    const part = getPartAtPath(body, selectedPartPath);
    return resolveBodyPartDisplayName(part ?? undefined);
  }, [components.Body, selectedEntity, selectedPartPath]);

  const isPartMode = selectedEntity !== undefined && selectedEntity !== null && !!selectedPartPath && selectedPartPath.length > 0;
  const inspectorTitle = isPartMode
    ? partDisplayName
    : selectedEntity !== undefined && selectedEntity !== null
      ? entityDisplayName
      : dimensionName;

  const buildSingleItemList = (key: string, node: React.ReactNode) => (
    <VirtualizedInspectorList items={[{ key, node }]} />
  );

  const inspectorItems = [
    {
      key: 'design',
      label: 'Design',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
          {selectedEntity !== undefined && selectedEntity !== null ? (
            selectedPartPath && selectedPartPath.length > 0 ? (
              <PartInspector eid={selectedEntity} partPath={selectedPartPath} activeTab="design" />
            ) : (
              <ComponentInspector eid={selectedEntity} components={components} activeTab="design" />
            )
          ) : (
            <WorldInspector />
          )}
        </div>
      ),
    },
    sessionConfig.capabilities.showAnimationTab ? {
      key: 'animation',
      label: 'Animation',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
          {selectedEntity !== undefined && selectedEntity !== null ? (
            selectedPartPath && selectedPartPath.length > 0 ? (
              <PartInspector eid={selectedEntity} partPath={selectedPartPath} activeTab="animation" />
            ) : (
              <ComponentInspector eid={selectedEntity} components={components} activeTab="animation" />
            )
          ) : (
            buildSingleItemList(
              'world-animation-placeholder',
              <InspectorComponentSection title="Animation">
                <Text style={{ color: EDITOR_COLORS.textTertiary }}>
                  Animation controls will appear here when implemented
                </Text>
              </InspectorComponentSection>
            )
          )}
        </div>
      ),
    } : null,
    sessionConfig.capabilities.showSimulationTab ? {
      key: 'simulate',
      label: 'Simulate',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
          {selectedEntity !== undefined && selectedEntity !== null ? (
            selectedPartPath && selectedPartPath.length > 0 ? (
              <PartInspector eid={selectedEntity} partPath={selectedPartPath} activeTab="simulate" />
            ) : (
              <ComponentInspector eid={selectedEntity} components={components} activeTab="simulate" />
            )
          ) : (
            buildSingleItemList(
              'world-simulate-placeholder',
              <InspectorComponentSection title="Simulation">
                <Text style={{ color: EDITOR_COLORS.textTertiary }}>
                  World simulation controls will appear here when implemented
                </Text>
              </InspectorComponentSection>
            )
          )}
        </div>
      ),
    } : null,
    sessionConfig.capabilities.showRenderTab ? {
      key: 'render',
      label: 'Render',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
          {selectedEntity !== undefined && selectedEntity !== null ? (
            <ComponentInspector
              eid={selectedEntity}
              components={components}
              activeTab="render"
              emptyState={null}
              extraItems={[
                {
                  key: 'render-tools',
                  node: (
                    <InspectorComponentSection title="Capture">
                      <RenderInspector />
                    </InspectorComponentSection>
                  ),
                },
              ]}
            />
          ) : (
            buildSingleItemList(
              'world-render-tools',
              <InspectorComponentSection title="Capture">
                <RenderInspector />
              </InspectorComponentSection>
            )
          )}
        </div>
      ),
    } : null,
  ].filter(Boolean) as any[];

  useEffect(() => {
    if (!inspectorItems.some((item) => item.key === activeTab)) {
      setActiveTab('design');
    }
  }, [activeTab, inspectorItems]);

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 320,
        height: 'calc(100vh - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        background: EDITOR_COLORS.panel,
        borderRadius: EDITOR_RADIUS.lg,
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.md, marginBottom: EDITOR_SPACING.md, padding: `${PANE_INSET}px ${PANE_INSET}px 0` }}>
        <PaneTitle
          title={inspectorTitle}
          onMetadataClick={() => setIsMetadataModalOpen(true)}
          metadataAriaLabel="Inspector metadata options"
          size="lg"
        />
        <div style={{ marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', width: 'auto' }}>
          <Dropdown.Button
            type="primary"
            menu={{
              items: shareMenu,
              onClick: ({ key }) => {
                if (key === 'export') {
                  handleExportScript();
                } else if (key === 'export-model:gltf') {
                  handleExportModel('gltf');
                } else if (key === 'export-model:glb') {
                  handleExportModel('glb');
                } else if (key === 'export-model:stl') {
                  handleExportModel('stl');
                } else if (key === 'export-model:usdz') {
                  handleExportModel('usdz');
                } else if (key === 'save') {
                  handleSaveWorld();
                }
              }
            }}
            onClick={() => handleExportModel('glb')}
            loading={isSaving || isExporting || isModelExporting}
            placement="bottomRight"
          >
            Export
          </Dropdown.Button>
        </div>
      </div>

      <PanelTabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as InspectorTab)}
        style={{ flex: 1, minHeight: 0 }}
        inset={PANE_INSET}
        items={inspectorItems}
      />

      <InspectorMetadataModal
        open={isMetadataModalOpen}
        mode={isPartMode ? 'part' : selectedEntity !== undefined && selectedEntity !== null ? 'entity' : 'dimension'}
        eid={selectedEntity}
        partPath={selectedPartPath}
        entityComponents={components}
        onClose={() => setIsMetadataModalOpen(false)}
        onDimensionNameChange={setDimensionName}
      />
      </div>
    </>
  );
}
