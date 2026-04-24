/**
 * Component Inspector
 * Displays registered components for an entity, including addable placeholders for missing components.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Button, Tooltip } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useAPI } from '../App';
import { componentEditorRegistry } from '../../editor/ComponentEditorRegistry';
import { componentSchemaRegistry } from '../../editor/schema/ComponentSchemaRegistry';
import { GenericComponentEditor } from './GenericComponentEditor';
import { BodyComponentEditor, type BodyHeaderActions } from './BodyComponentEditor';
import { AnimationComponentEditor } from './AnimationComponentEditor';
import { AddComponentCommand } from '../../editor/commands/AddComponentCommand';
import { RemoveComponentCommand } from '../../editor/commands/RemoveComponentCommand';
import { buildComponentDefaults } from '../../editor/schema/defaults';
import { useEditor } from './EditorContext';
import { EditorIcon } from './styles/EditorIcon';
import { EDITOR_COLORS, EDITOR_RADIUS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from './styles/tokens';
import { SimulationStoresRulesEditor } from './SimulationStoresRulesEditor';
import type { InspectorPlacement, InspectorTab } from '../../editor/schema/FieldMetadata';
import { InspectorComponentSection } from './components/InspectorComponentSection';
import { VirtualizedInspectorList, type VirtualizedInspectorItem } from './components/VirtualizedInspectorList';

const { Text } = Typography;

const AUXILIARY_COMPONENT_NAMES = new Set(['Stores', 'Stock', 'Rules', 'DiscoveredBy', 'PickedUpBy']);

export interface ResolvedInspectorComponent {
  name: string;
  isPresent: boolean;
}

interface ResolveInspectorComponentsOptions {
  components: Record<string, any>;
  activeTab: InspectorTab;
  placement?: Exclude<InspectorPlacement, 'hidden'>;
}

export function resolveInspectorComponents({
  components,
  activeTab,
  placement = 'tab',
}: ResolveInspectorComponentsOptions): ResolvedInspectorComponent[] {
  const presentNames = Object.keys(components).filter((name) => {
    if (AUXILIARY_COMPONENT_NAMES.has(name)) return false;
    const schema = componentSchemaRegistry.get(name);
    if (!schema) return placement === 'tab' && componentSchemaRegistry.getInspectorTab(name) === activeTab;
    return componentSchemaRegistry.getInspectorPlacement(name) === placement &&
      (placement !== 'tab' || componentSchemaRegistry.getInspectorTab(name) === activeTab);
  });

  const registeredNames = componentSchemaRegistry.getComponentsForPlacement(
    placement,
    placement === 'tab' ? activeTab : undefined,
  );

  const orderedNames = Array.from(new Set([...registeredNames, ...presentNames]));
  orderedNames.sort((a, b) => {
    const orderA = componentSchemaRegistry.getInspectorOrder(a);
    const orderB = componentSchemaRegistry.getInspectorOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  return orderedNames.map((name) => ({
    name,
    isPresent: Object.prototype.hasOwnProperty.call(components, name),
  }));
}

export function ComponentInspector({
  eid,
  components,
  activeTab,
  placement = 'tab',
  emptyState,
  extraItems = [],
}: {
  eid: number;
  components: Record<string, any>;
  activeTab: InspectorTab;
  placement?: Exclude<InspectorPlacement, 'hidden'>;
  emptyState?: React.ReactNode;
  extraItems?: VirtualizedInspectorItem[];
}) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand } = useEditor();
  const [bodyHeaderActions, setBodyHeaderActions] = useState<BodyHeaderActions | null>(null);
  const resolvedComponents = useMemo(
    () => resolveInspectorComponents({ components, activeTab, placement }),
    [components, activeTab, placement],
  );

  useEffect(() => {
    if (!components.Body) {
      setBodyHeaderActions(null);
    }
  }, [components.Body]);

  const handleAddComponent = (compName: string) => {
    const schema = componentSchemaRegistry.get(compName);
    if (!schema || !componentSchemaRegistry.isAddable(compName)) return;

    const command = new AddComponentCommand(ctx, eid, compName, buildComponentDefaults(schema), schema.isStructural);
    executeCommand(command);
  };

  const handleRemoveComponent = (compName: string) => {
    const schema = componentSchemaRegistry.get(compName);
    if (!schema || !componentSchemaRegistry.isRemovable(compName)) return;

    const command = new RemoveComponentCommand(ctx, eid, compName, schema.isStructural);
    executeCommand(command);
  };

  const createAddAction = (compName: string, tooltip = 'Add component') => (
    <Button
      icon={<PlusOutlined />}
      size="small"
      type="text"
      style={{ color: EDITOR_COLORS.textSecondary }}
      onClick={(e) => {
        e.stopPropagation();
        handleAddComponent(compName);
      }}
      aria-label={tooltip}
    />
  );

  const createRemoveAction = (compName: string, tooltip = 'Remove component') => (
    <Button
      icon={<MinusOutlined />}
      size="small"
      type="text"
      style={{ color: EDITOR_COLORS.textSecondary }}
      onClick={(e) => {
        e.stopPropagation();
        handleRemoveComponent(compName);
      }}
      aria-label={tooltip}
    />
  );

  const items: VirtualizedInspectorItem[] = [];

  if (placement === 'tab' && activeTab === 'simulate') {
    items.push({
      key: 'simulate:stores-rules',
      node: <SimulationStoresRulesEditor eid={eid} components={components} />,
    });
  }

  for (const { name: compName, isPresent } of resolvedComponents) {
    const schema = componentSchemaRegistry.get(compName);
    const CustomEditor = schema?.uiOverride || componentEditorRegistry.get(compName);
    const hasSchema = componentSchemaRegistry.has(compName);

    if (!isPresent) {
      const addAction = componentSchemaRegistry.isAddable(compName)
        ? createAddAction(compName, `Add ${schema?.displayName || compName}`)
        : undefined;

      items.push({
        key: compName,
        node: (
          <InspectorComponentSection
            title={schema?.displayName || compName}
            description={schema?.description}
            action={addAction}
          />
        ),
      });
      continue;
    }

    if (compName === 'Body') {
      const action = bodyHeaderActions?.showAddPart ? (
        <Tooltip title={bodyHeaderActions.addPartTooltip || 'Add part'}>
          <Button
            icon={<EditorIcon name="add" />}
            size="small"
            type="text"
            style={{ color: EDITOR_COLORS.textSecondary }}
            onClick={(e) => {
              e.stopPropagation();
              bodyHeaderActions.onAddPart();
            }}
          />
        </Tooltip>
      ) : componentSchemaRegistry.isRemovable(compName) ? (
        createRemoveAction(compName, `Remove ${schema?.displayName || compName}`)
      ) : undefined;

      items.push({
        key: compName,
        node: (
          <InspectorComponentSection
            title={schema?.displayName || compName}
            description={schema?.description}
            action={action}
          >
            <BodyComponentEditor
              eid={eid}
              bodyData={components.Body}
              onHeaderActionsChange={setBodyHeaderActions}
            />
          </InspectorComponentSection>
        ),
      });
      continue;
    }

    if (compName === 'Animation') {
      const action = componentSchemaRegistry.isRemovable(compName)
        ? createRemoveAction(compName, `Remove ${schema?.displayName || compName}`)
        : undefined;

      items.push({
        key: compName,
        node: (
          <InspectorComponentSection
            title={schema?.displayName || compName}
            description={schema?.description}
            action={action}
          >
            <AnimationComponentEditor
              eid={eid}
              animationData={components.Animation}
              bodyData={components.Body}
            />
          </InspectorComponentSection>
        ),
      });
      continue;
    }

    const action = componentSchemaRegistry.isRemovable(compName)
      ? createRemoveAction(compName, `Remove ${schema?.displayName || compName}`)
      : undefined;

    items.push({
      key: compName,
      node: (
        <InspectorComponentSection
          title={schema?.displayName || compName}
          description={schema?.description}
          action={action}
        >
          {CustomEditor ? (
            <CustomEditor eid={eid} />
          ) : hasSchema ? (
            <GenericComponentEditor eid={eid} componentName={compName} />
          ) : (
            <pre
              style={{
                color: EDITOR_COLORS.textSecondary,
                fontSize: EDITOR_TYPOGRAPHY.fontSizeSm,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: EDITOR_SPACING.sm,
                background: EDITOR_COLORS.field,
                padding: EDITOR_SPACING.sm,
                borderRadius: EDITOR_RADIUS.sm,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(components[compName], null, 2)}
            </pre>
          )}
        </InspectorComponentSection>
      ),
    });
  }

  items.push(...extraItems);

  if (items.length === 0) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <Text style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }}>
        No components in this tab
      </Text>
    );
  }

  return <VirtualizedInspectorList items={items} />;
}
