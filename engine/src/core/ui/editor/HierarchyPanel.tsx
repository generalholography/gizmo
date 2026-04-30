/**
 * Hierarchy Panel
 * Displays tree view of all entities in the scene with virtualization for large entity counts
 * Uses EDITOR_* design tokens for consistent styling
 */

import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import { Tree, Typography, Button, Input, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { SearchOutlined } from '@ant-design/icons';
import { useEditor } from './EditorContext';
import { useAPI } from '../App';
import { defineQuery, hasComponent } from 'bitecs';
import { Transform } from '../../components/Transform';
import { Info } from '../../components/Info';
import { decode } from '../../../utils/strings';
import { getModule, getResource } from '../../ecs';
import { Body as BodyComponent } from '../../components/Body';
import { Body as BodyDefinition, Node as BodyNode } from '../../schema';
import { WorldMetadata } from '../../schema';
import { ArchetypeBrowser } from './ArchetypeBrowser';
import { AssetsBrowser } from './AssetsBrowser';
import { PanelTabs } from './components/PanelTabs';
import { TasksPanel } from './TasksPanel';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY, EDITOR_RADIUS } from './styles/tokens';
import { WorldMetadataModal } from './WorldMetadataModal';
import { resolveBodyPartDisplayName } from '../../editor/utils/bodyParts';
import { PaneTitle } from './components/PaneTitle';

const { Text } = Typography;

// Debounce delay for hierarchy updates (ms)
const HIERARCHY_UPDATE_DEBOUNCE_MS = 100;
const EMPTY_TASK_SNAPSHOT = {
  tasks: [],
  selectedTaskId: null,
  selectedTask: null,
  focusTaskId: null,
};
const PANE_INSET = EDITOR_SPACING.lg;
const paneContentStyle: React.CSSProperties = {
  padding: `0 ${PANE_INSET}px ${PANE_INSET}px`,
  boxSizing: 'border-box',
};
const fallbackSubscribe = () => () => undefined;
const hierarchyTreeStyle = `
  .hierarchy-tree,
  .hierarchy-tree .ant-tree-list,
  .hierarchy-tree .ant-tree-list-holder,
  .hierarchy-tree .ant-tree-list-holder-inner {
    background: transparent !important;
  }
`;

interface HierarchyNode extends DataNode {
  key: string;
  title: React.ReactNode;
  children?: HierarchyNode[];
  data: { type: 'entity' | 'part'; eid?: number; partPath?: number[] };
}

function resolvePartLabel(part: BodyNode): string {
  return resolveBodyPartDisplayName(part);
}

function buildPartNodes(eid: number, parts: BodyNode[] = [], parentPath: number[] = []): HierarchyNode[] {
  return parts.map((part, index) => {
    const path = [...parentPath, index];
    const key = `entity-${eid}-part-${path.join('-')}`;

    const children = part.children ? buildPartNodes(eid, part.children, path) : undefined;

    return {
      key,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: EDITOR_SPACING.sm }}>
          <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }}>{resolvePartLabel(part)}</Text>
        </span>
      ),
      children,
      data: { type: 'part', eid, partPath: path },
    };
  });
}

export function HierarchyPanel() {
  const api = useAPI();
  const { selectedEntities, selectedPartPaths, selectEntity, selectBodyPart, selectMultiple, taskStore, sessionConfig } = useEditor();
  const [treeData, setTreeData] = useState<HierarchyNode[]>([]);
  const [worldName, setWorldName] = useState('Untitled world');
  const [isLoadingWorld, setIsLoadingWorld] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const showTasksTab = sessionConfig.capabilities.showTasksTab && Boolean(taskStore);
  const visibleTabs = useMemo(() => {
    const tabs = [];
    if (sessionConfig.capabilities.showHierarchyTab) {
      tabs.push('world');
    }
    if (sessionConfig.capabilities.showPrefabsTab) {
      tabs.push('prefabs');
    }
    if (sessionConfig.capabilities.showAssetsTab) {
      tabs.push('assets');
    }
    if (showTasksTab) {
      tabs.push('tasks');
    }
    return tabs;
  }, [sessionConfig.capabilities, showTasksTab]);
  const [activeTabKey, setActiveTabKey] = useState(visibleTabs[0] ?? 'world');
  const [treeViewportHeight, setTreeViewportHeight] = useState(0);
  const [treeViewportNode, setTreeViewportNode] = useState<HTMLDivElement | null>(null);

  const taskSnapshot = useSyncExternalStore(
    taskStore?.subscribe ?? fallbackSubscribe,
    taskStore?.getSnapshot ?? (() => EMPTY_TASK_SNAPSHOT),
    taskStore?.getSnapshot ?? (() => EMPTY_TASK_SNAPSHOT),
  );

  // Store entity names for filtering
  const [entityNameMap, setEntityNameMap] = useState<Map<number, string>>(new Map());
  
  // Ref for debouncing updates
  const lastUpdateRef = useRef<number>(0);

  // Debounced hierarchy update effect
  useEffect(() => {
    const ctx = api.ecsWorld;
    let frameId: number;
    let isActive = true;

    const entityQuery = defineQuery([Transform]);

    const updateHierarchy = () => {
      if (!isActive) return;
      
      const now = performance.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Only update if enough time has passed (debounce)
      if (timeSinceLastUpdate >= HIERARCHY_UPDATE_DEBOUNCE_MS) {
        const metadata = getResource<WorldMetadata>(ctx, 'metadata', true);
        const nextWorldName = metadata?.title?.trim() || 'Untitled world';
        setWorldName(nextWorldName);

        const eids = entityQuery(ctx);
        const bodyMod = getModule(ctx, 'body');

        const entityNodes: HierarchyNode[] = [];
        const nameMap = new Map<number, string>();

        for (let i = 0; i < eids.length; i++) {
          const eid = eids[i];

          let name = `Entity #${eid}`;
          if (hasComponent(ctx, Info, eid)) {
            name = decode(Info.name[eid]);
          }

          nameMap.set(eid, name);

          let partChildren: HierarchyNode[] | undefined;
          if (hasComponent(ctx, BodyComponent, eid) && bodyMod) {
            const def = bodyMod.getDefinition(BodyComponent.bodyId[eid]) as BodyDefinition | undefined;
            if (def?.type === 'composite') {
              partChildren = buildPartNodes(eid, def.params?.parts || []);
            }
          }

          entityNodes.push({
            key: `entity-${eid}`,
            title: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: EDITOR_SPACING.sm }}>
                <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeLg }}>{name}</Text>
              </span>
            ),
            children: partChildren,
            data: { type: 'entity', eid },
          });
        }

        entityNodes.sort((a, b) => {
          const aName = (a.title as any)?.props?.children?.[0]?.props?.children || '';
          const bName = (b.title as any)?.props?.children?.[0]?.props?.children || '';
          return String(aName).localeCompare(String(bName));
        });

        setEntityNameMap(nameMap);
        setTreeData(entityNodes);
        
        lastUpdateRef.current = now;
      }

      frameId = requestAnimationFrame(updateHierarchy);
    };

    updateHierarchy();

    return () => {
      isActive = false;
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [api]);

  // Filter tree data based on search term
  const filteredTreeData = useMemo(() => {
    if (!searchTerm.trim() || treeData.length === 0) {
      return treeData;
    }

    const searchLower = searchTerm.toLowerCase();

    // Filter entities that match the search term (case-insensitive for both name and ID)
    const filteredEntities = treeData.filter((entity) => {
      const eid = entity.data.eid;
      if (eid === undefined) return false;
      
      const name = entityNameMap.get(eid) || '';
      // Match by name or entity ID (both case-insensitive)
      return name.toLowerCase().includes(searchLower) || 
             String(eid).toLowerCase().includes(searchLower);
    });

    return filteredEntities;
  }, [treeData, searchTerm, entityNameMap]);

  useEffect(() => {
    const eid = selectedEntities[0];
    if (eid === undefined || eid === null) {
      setExpandedKeys([]);
      return;
    }

    const newKeys = new Set<string>([`entity-${eid}`]);
    // Expand all selected part paths
    if (selectedPartPaths && selectedPartPaths.length > 0) {
      selectedPartPaths.forEach(partPath => {
        partPath.forEach((_, idx) => {
          const partial = partPath.slice(0, idx + 1);
          newKeys.add(`entity-${eid}-part-${partial.join('-')}`);
        });
      });
    }
    setExpandedKeys(Array.from(newKeys));
  }, [selectedEntities, selectedPartPaths]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTabKey)) {
      setActiveTabKey(visibleTabs[0] ?? 'world');
    }
  }, [activeTabKey, visibleTabs]);

  useEffect(() => {
    if (!taskStore || !taskSnapshot.focusTaskId) return;
    if (!showTasksTab) return;
    setActiveTabKey('tasks');
    taskStore.selectTask(taskSnapshot.focusTaskId);
    taskStore.acknowledgeFocus();
  }, [showTasksTab, taskSnapshot.focusTaskId, taskStore]);

  const handleLoadWorld = () => {
    setIsLoadingWorld(true);
    try {
      api.loadWorldFromFile(
        async (worldScript) => {
          try {
            await api.loadWorld(worldScript);
            message.success('World loaded');
          } catch (error) {
            console.error('Failed to load world:', error);
            message.error('Failed to load world');
          } finally {
            setIsLoadingWorld(false);
          }
        },
        (error) => {
          console.error('Failed to load world:', error);
          message.error('Failed to load world');
          setIsLoadingWorld(false);
        }
      );
    } catch (error) {
      console.error('Failed to trigger world load:', error);
      message.error('Failed to start load');
      setIsLoadingWorld(false);
    }
  };

  const selectedKeys = useMemo(() => {
    // If no entities selected, clear tree selection
    if (selectedEntities.length === 0) return [];
    
    // If body parts are selected, show all selected parts
    if (selectedPartPaths && selectedPartPaths.length > 0) {
      const eid = selectedEntities[0];
      return selectedPartPaths.map(partPath => `entity-${eid}-part-${partPath.join('-')}`);
    }
    
    // Show all selected entities
    return selectedEntities.map(eid => `entity-${eid}`);
  }, [selectedEntities, selectedPartPaths]);

  // Track last selected entity for range selection
  const lastSelectedEntityRef = useRef<number | null>(null);

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const node = info.node as HierarchyNode;
    const data = node.data;
    const nativeEvent = info.nativeEvent as MouseEvent;
    
    // Check for modifier keys
    const ctrlHeld = nativeEvent.ctrlKey || nativeEvent.metaKey;
    const shiftHeld = nativeEvent.shiftKey;
    
    if (data.type === 'entity' && data.eid !== undefined) {
      // Handle multi-select manually based on modifier keys
      if (ctrlHeld && !shiftHeld) {
        // Ctrl/Cmd+click: Toggle this entity in selection
        selectEntity(data.eid, true); // true = toggle mode
        lastSelectedEntityRef.current = data.eid;
      } else if (shiftHeld && !ctrlHeld && lastSelectedEntityRef.current !== null) {
        // Shift+click: Range selection
        const entities = treeData.map(n => n.data.eid).filter((eid): eid is number => eid !== undefined);
        const startIdx = entities.indexOf(lastSelectedEntityRef.current);
        const endIdx = entities.indexOf(data.eid);
        
        if (startIdx !== -1 && endIdx !== -1) {
          const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const rangeEids = entities.slice(minIdx, maxIdx + 1);
          selectMultiple(rangeEids);
        }
      } else {
        // Normal click: Single selection
        selectEntity(data.eid);
        lastSelectedEntityRef.current = data.eid;
      }
      return;
    }
    
    if (data.type === 'part' && data.eid !== undefined && data.partPath) {
      // Check if Cmd/Ctrl is held for multi-part selection
      if (ctrlHeld && !shiftHeld) {
        // Cmd+click on part: Toggle part in selection (multi-part)
        selectBodyPart(data.eid, data.partPath, true);
      } else {
        // Normal click on part: Single part selection
        selectBodyPart(data.eid, data.partPath, false);
      }
      lastSelectedEntityRef.current = null;
    }
  };

  const treeViewportRef = useCallback((node: HTMLDivElement | null) => {
    setTreeViewportNode(node);
  }, []);

  useLayoutEffect(() => {
    const node = treeViewportNode;
    if (!node || activeTabKey !== 'world') {
      setTreeViewportHeight(0);
      return;
    }

    const updateHeight = () => {
      setTreeViewportHeight(node.clientHeight);
    };

    updateHeight();
    const rafId = requestAnimationFrame(updateHeight);

    const handleResize = () => updateHeight();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(node);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [activeTabKey, treeViewportNode]);

  const handleSearchBlur = useCallback(() => {
    if (searchTerm.trim().length === 0) {
      setIsSearchOpen(false);
    }
  }, [searchTerm]);

  const hierarchyContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: EDITOR_SPACING.md, height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {!isSearchOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: EDITOR_SPACING.sm }}>
          <Text style={{ color: EDITOR_COLORS.textPrimary, fontSize: EDITOR_TYPOGRAPHY.fontSizeLg, fontWeight: EDITOR_TYPOGRAPHY.fontWeightBold }}>
            Objects
          </Text>
          <Button
            type="text"
            size="small"
            icon={<SearchOutlined />}
            aria-label="Open object search"
            onClick={() => setIsSearchOpen(true)}
          />
        </div>
      ) : (
        <Input
          autoFocus
          size="small"
          allowClear
          placeholder="Search entities..."
          prefix={<SearchOutlined style={{ color: EDITOR_COLORS.textMuted }} />}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onBlur={handleSearchBlur}
          style={{
            background: EDITOR_COLORS.field,
            borderColor: EDITOR_COLORS.border,
          }}
        />
      )}

      <div ref={treeViewportRef} style={{ overflow: 'hidden', flex: 1, minHeight: 0 }}>
        <style>{hierarchyTreeStyle}</style>
        <Tree
          showLine={false}
          multiple
          treeData={filteredTreeData}
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys.map(String))}
          onSelect={handleSelect}
          height={treeViewportHeight > 0 ? treeViewportHeight : undefined}
          virtual
          rootClassName="hierarchy-tree"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      width: 360,
      height: 'calc(100vh - 40px)',
      maxHeight: 'calc(100vh - 40px)',
      background: EDITOR_COLORS.panel,
      borderRadius: EDITOR_RADIUS.lg,
      boxSizing: 'border-box',
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: EDITOR_SPACING.md,
      overflow: 'hidden',
      minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.md, padding: `${PANE_INSET}px ${PANE_INSET}px 0` }}>
        <PaneTitle
          title={worldName}
          onMetadataClick={() => setIsMetadataModalOpen(true)}
          metadataAriaLabel="World options"
          size="lg"
        />
        {sessionConfig.capabilities.showLoadButton ? (
          <Button
            type="default"
            size="small"
            onClick={handleLoadWorld}
            loading={isLoadingWorld}
            style={{ minWidth: 64, marginLeft: 'auto' }}
          >
            Load
          </Button>
        ) : null}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelTabs
          activeKey={activeTabKey}
          onChange={(key) => setActiveTabKey(key)}
          style={{ height: '100%' }}
          inset={PANE_INSET}
          items={[
            sessionConfig.capabilities.showHierarchyTab ? {
              key: 'world',
              label: sessionConfig.scope === 'asset' ? 'Hierarchy' : 'World',
              children: (
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ ...paneContentStyle, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {hierarchyContent}
                  </div>
                </div>
              ),
            } : null,
            sessionConfig.capabilities.showPrefabsTab ? {
              key: 'prefabs',
              label: 'Prefabs',
              children: (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div style={paneContentStyle}>
                    <ArchetypeBrowser />
                  </div>
                </div>
              ),
            } : null,
            sessionConfig.capabilities.showAssetsTab ? {
              key: 'assets',
              label: 'Assets',
              children: (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div style={paneContentStyle}>
                    <AssetsBrowser />
                  </div>
                </div>
              ),
            } : null,
            showTasksTab ? {
              key: 'tasks',
              label: 'Tasks',
              children: (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'hidden' }}>
                  <div style={paneContentStyle}>
                    <TasksPanel />
                  </div>
                </div>
              ),
            } : null,
          ].filter(Boolean) as any}
        />
      </div>
      <WorldMetadataModal open={isMetadataModalOpen} onClose={() => setIsMetadataModalOpen(false)} />
    </div>
  );
}
