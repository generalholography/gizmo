import React, { useMemo, useRef } from 'react';
import { Button, Dropdown, message, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { applyBundle } from '../../spawn';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { ItemList, ItemListItem } from './components/ItemList';
import { InspectorComponentSection } from './components/InspectorComponentSection';
import { GenericFieldRenderer } from './fieldRenderers/GenericFieldRenderer';
import { EDITOR_COLORS } from './styles/tokens';
import { EditorIcon } from './styles/EditorIcon';
import { ActionDefinitionField } from '../../editor/schema/schemas/ActionSchemas';
import { ConditionDefinitionField } from '../../editor/schema/schemas/ConditionSchemas';
import { EntityStoreModule } from '../../../modules/entityStore';
import { getModule } from '../../ecs';
import { RULE_TRIGGER_CONTEXT_CONTRACTS, RULE_TRIGGER_TYPE_OPTIONS, RuleTriggerType } from '../../../modules/ruleContextContracts';
import { validateActionTargetsForTrigger } from '../../../modules/action';
import {
  CONDITION_COMPARE_OPERATOR_OPTIONS,
  CONDITION_TYPE_OPTIONS,
  VALUE_EXPRESSION_TYPE_OPTIONS,
} from '../../../modules/condition';
import { ModifyComponentCommand } from '../../editor/commands/ModifyComponentCommand';

type RuleItem = ItemListItem & { index: number; value: any };
export type StoreType = 'inventory' | 'stock' | 'stableIdSet';
export type StoreDefinition = { store: string; value: any };
type StoreItem = ItemListItem & { index: number; value: StoreDefinition };

export const DEFAULT_NEW_STORE_TYPE: StoreType = 'stock';
export const RULE_TRIGGER_TYPES = [...RULE_TRIGGER_TYPE_OPTIONS] as const;
const CONDITION_TYPES = [...CONDITION_TYPE_OPTIONS];
const VALUE_EXPRESSION_TYPES = [...VALUE_EXPRESSION_TYPE_OPTIONS];
const COMPARE_OPERATORS = [...CONDITION_COMPARE_OPERATOR_OPTIONS];

const defaultRule = {
  trigger: { type: 'event', params: { event: 'my_global_event' } },
  priority: 0,
  enabled: true,
  actions: {
    type: 'sequence',
    params: { actions: [] },
  },
};

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

const valueSchemaByStoreType: Record<StoreType, any> = {
  inventory: {
    name: 'value',
    type: 'object',
    required: true,
    fields: {
      size: { name: 'size', type: 'number', required: true, defaultValue: 0, min: 0, step: 1 },
      selectedItemIndex: { name: 'selectedItemIndex', type: 'number', required: false, defaultValue: 0, min: 0, step: 1 },
      items: { name: 'items', type: 'array', required: false, itemType: { name: 'item', type: 'moduleReference', required: false, moduleName: 'inventoryItem' } },
    },
  },
  stock: {
    name: 'value',
    type: 'object',
    required: true,
    fields: {
      current: { name: 'current', type: 'number', required: true, defaultValue: 0 },
      max: { name: 'max', type: 'number', required: true, defaultValue: 1 },
      min: { name: 'min', type: 'number', required: false, defaultValue: 0 },
    },
  },
  stableIdSet: {
    name: 'value',
    type: 'array',
    required: false,
    itemType: { name: 'stableId', type: 'number', required: true, step: 1 },
  },
};

function defaultValueForStoreType(type: StoreType): any {
  if (type === 'inventory') return { size: 0, selectedItemIndex: 0, items: [] };
  if (type === 'stock') return { current: 0, max: 1, min: 0 };
  return [];
}

function normalizeStoreValue(type: StoreType, value: any): any {
  if (type === 'inventory') {
    return {
      size: value?.size ?? 0,
      selectedItemIndex: value?.selectedItemIndex ?? 0,
      items: Array.isArray(value?.items) ? value.items : [],
    };
  }
  if (type === 'stock') {
    return {
      current: value?.current ?? 0,
      max: value?.max ?? 1,
      min: value?.min ?? 0,
    };
  }
  return Array.isArray(value) ? value : [];
}

export function getAvailableStoreNames(registeredStoreNames: string[], selectedStores: StoreDefinition[]): string[] {
  const selectedNames = new Set(selectedStores.map((store) => store.store));
  return registeredStoreNames.filter((name) => !selectedNames.has(name));
}

export function buildStoreDefinitions(components: Record<string, any>): StoreDefinition[] {
  if (Array.isArray(components.Stores)) {
    return components.Stores
      .map((store: any) => {
        const storeName = store?.store ?? store?.id;
        const value = store?.value ?? store?.params;
        if (!storeName) return null;
        if (Array.isArray(value?.stableIds)) return { store: storeName, value: value.stableIds };
        if (value?.current !== undefined || value?.max !== undefined) {
          return {
            store: storeName,
            value: {
              current: value?.current ?? 0,
              max: value?.max ?? 1,
              min: value?.min ?? 0,
            },
          };
        }
        return { store: storeName, value };
      })
      .filter((store): store is StoreDefinition => Boolean(store));
  }

  const stores: StoreDefinition[] = [];

  if (components.Inventory) {
    stores.push({
      store: 'inventory',
      value: {
        size: components.Inventory.size ?? 0,
        selectedItemIndex: components.Inventory.selectedItemIndex ?? 0,
        items: Array.isArray(components.Inventory.items) ? components.Inventory.items : [],
      },
    });
  }

  if (components.Stock && typeof components.Stock === 'object') {
    for (const [stockName, stockValue] of Object.entries(components.Stock)) {
      stores.push({
        store: stockName,
        value: {
          current: (stockValue as any)?.current ?? 0,
          max: (stockValue as any)?.max ?? 1,
          min: (stockValue as any)?.min ?? 0,
        },
      });
    }
  }

  if (Array.isArray(components.DiscoveredBy)) {
    stores.push({ store: 'discoveredBy', value: components.DiscoveredBy });
  }

  if (Array.isArray(components.PickedUpBy)) {
    stores.push({ store: 'pickedUpBy', value: components.PickedUpBy });
  }

  return stores;
}

export function storesToBundle(stores: StoreDefinition[], storeTypeByName: Record<string, StoreType>): Record<string, any> {
  const normalizedStores = stores.map((store) => {
    const type = storeTypeByName[store.store];
    if (!type) return store;
    return { store: store.store, value: normalizeStoreValue(type, store.value) };
  });

  const bundle: Record<string, any> = {
    Stores: normalizedStores,
    Inventory: undefined,
    Stock: {},
    DiscoveredBy: [],
    PickedUpBy: [],
  };

  for (const store of normalizedStores) {
    const type = storeTypeByName[store.store];
    if (!type) continue;
    if (store.store === 'inventory' && type === 'inventory') {
      bundle.Inventory = store.value;
      continue;
    }
    if (store.store === 'discoveredBy' && type === 'stableIdSet') {
      bundle.DiscoveredBy = Array.isArray(store.value) ? store.value : [];
      continue;
    }
    if (store.store === 'pickedUpBy' && type === 'stableIdSet') {
      bundle.PickedUpBy = Array.isArray(store.value) ? store.value : [];
      continue;
    }
    if (type === 'stock') {
      bundle.Stock[store.store] = normalizeStoreValue('stock', store.value);
    }
  }

  return bundle;
}

const ruleSchema: any = {
  name: 'rule',
  type: 'object',
  required: true,
  fields: {
    trigger: {
      name: 'trigger',
      type: 'object',
      required: true,
      fields: {
        type: {
          name: 'type',
          type: 'enum',
          required: true,
          enumValues: [...RULE_TRIGGER_TYPES],
          defaultValue: 'event',
        },
        params: {
          name: 'params',
          type: 'union',
          required: false,
          discriminator: 'type',
          unionTypes: {
            immediate: [],
            event: [{ name: 'event', type: 'string', required: true, defaultValue: 'my_global_event' }],
            interact: [],
            collisionEnter: [],
            entityInRange: [
              { name: 'range', type: 'number', required: false, defaultValue: 2, min: 0.1, step: 0.1 },
            ],
            timeElapsed: [
              { name: 'delay', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1 },
              { name: 'repeat', type: 'boolean', required: false, defaultValue: false },
            ],
            die: [],
            primaryAction: [
              { name: 'range', type: 'number', required: false, defaultValue: 2, min: 0.1, step: 0.1 },
            ],
            secondaryAction: [
              { name: 'range', type: 'number', required: false, defaultValue: 2, min: 0.1, step: 0.1 },
            ],
            time: [
              { name: 'delay', type: 'number', required: true, defaultValue: 1, min: 0, step: 0.1 },
              { name: 'repeat', type: 'boolean', required: false, defaultValue: false },
            ],
            interval: [
              { name: 'interval', type: 'number', required: true, defaultValue: 1, min: 0.01, step: 0.1 },
              { name: 'initialDelay', type: 'number', required: false, defaultValue: 0, min: 0, step: 0.1 },
              { name: 'maxCount', type: 'number', required: false, min: 1, step: 1 },
            ],
            proximity: [
              { name: 'position', type: 'vector3', required: true, label: 'Position' },
              { name: 'radius', type: 'number', required: true, defaultValue: 2, min: 0.1, step: 0.1 },
              { name: 'once', type: 'boolean', required: false, defaultValue: false },
            ],
          },
        },
      },
    },
    condition: {
      ...ConditionDefinitionField,
      name: 'condition',
      required: false,
      defaultValue: { type: 'always', params: {} },
    },
    priority: { name: 'priority', type: 'number', required: false, defaultValue: 0, step: 1 },
    cooldown: { name: 'cooldown', type: 'number', required: false, defaultValue: 0, min: 0, step: 0.1 },
    enabled: { name: 'enabled', type: 'boolean', required: false, defaultValue: true },
    actions: { ...ActionDefinitionField, name: 'actions', label: 'Actions', required: true },
  },
};

function isRecord(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function validateValueExpression(expression: any, path: string, errors: string[]): void {
  if (!isRecord(expression)) {
    errors.push(`${path} must be an object value expression.`);
    return;
  }

  const type = expression.type;
  if (!VALUE_EXPRESSION_TYPES.includes(type)) {
    errors.push(`${path}.type '${String(type)}' is not a supported value expression type.`);
    return;
  }

  const params = expression.params;
  if (!isRecord(params)) {
    errors.push(`${path}.params must be an object.`);
    return;
  }

  if (type === 'parameter') {
    if (typeof params.name !== 'string' || params.name.trim().length === 0) {
      errors.push(`${path}.params.name is required for parameter expressions.`);
    }
    return;
  }

  if (type === 'metric') {
    if (typeof params.metric !== 'string' || params.metric.trim().length === 0) {
      errors.push(`${path}.params.metric is required for metric expressions.`);
    }
    return;
  }

  if (type === 'store') {
    if (typeof params.store !== 'string' || params.store.trim().length === 0) {
      errors.push(`${path}.params.store is required for store expressions.`);
    }
    return;
  }

  if (type === 'component') {
    if (typeof params.component !== 'string' || params.component.trim().length === 0) {
      errors.push(`${path}.params.component is required for component expressions.`);
    }
    return;
  }

  if (type === 'query') {
    if (typeof params.query !== 'string' || params.query.trim().length === 0) {
      errors.push(`${path}.params.query is required for query expressions.`);
    }
    if (isRecord(params.params)) {
      for (const [argName, argValue] of Object.entries(params.params)) {
        if (isRecord(argValue) && typeof (argValue as any).type === 'string' && isRecord((argValue as any).params)) {
          validateValueExpression(argValue, `${path}.params.params.${argName}`, errors);
        }
      }
    }
    return;
  }

  if (type === 'sum') {
    if (!Array.isArray(params.values)) {
      errors.push(`${path}.params.values must be an array for sum expressions.`);
      return;
    }
    params.values.forEach((entry: any, index: number) => {
      validateValueExpression(entry, `${path}.params.values[${index}]`, errors);
    });
  }
}

export function getConditionValidationErrors(condition: any, path = 'condition'): string[] {
  if (condition === undefined || condition === null) return [];
  const errors: string[] = [];

  if (!isRecord(condition)) {
    return [`${path} must be an object.`];
  }

  const type = condition.type;
  if (!CONDITION_TYPES.includes(type)) {
    return [`${path}.type '${String(type)}' is not a supported condition type.`];
  }

  const params = isRecord(condition.params) ? condition.params : {};

  if (type === 'compare') {
    if (!COMPARE_OPERATORS.includes(params.operator)) {
      errors.push(`${path}.params.operator must be one of: ${COMPARE_OPERATORS.join(', ')}.`);
    }
    validateValueExpression(params.left, `${path}.params.left`, errors);
    validateValueExpression(params.right, `${path}.params.right`, errors);
    return errors;
  }

  if (type === 'reference') {
    if (typeof params.name !== 'string' || params.name.trim().length === 0) {
      errors.push(`${path}.params.name is required for reference conditions.`);
    }
    if (isRecord(params.args)) {
      for (const [argName, argValue] of Object.entries(params.args)) {
        if (isRecord(argValue) && typeof (argValue as any).type === 'string' && isRecord((argValue as any).params)) {
          validateValueExpression(argValue, `${path}.params.args.${argName}`, errors);
        }
      }
    }
    return errors;
  }

  if (type === 'not') {
    errors.push(...getConditionValidationErrors(params.condition, `${path}.params.condition`));
    return errors;
  }

  if (type === 'all' || type === 'any') {
    if (!Array.isArray(params.conditions)) {
      errors.push(`${path}.params.conditions must be an array for ${type} conditions.`);
      return errors;
    }
    params.conditions.forEach((child: any, index: number) => {
      errors.push(...getConditionValidationErrors(child, `${path}.params.conditions[${index}]`));
    });
    return errors;
  }

  return errors;
}

export function getRuleTargetValidationErrors(rule: any): string[] {
  const triggerType = rule?.trigger?.type;
  const errors: string[] = [];

  if (typeof triggerType === 'string' && (triggerType in RULE_TRIGGER_CONTEXT_CONTRACTS)) {
    const typedTrigger = triggerType as RuleTriggerType;
    if (rule?.actions !== undefined) {
      const actionIssues = validateActionTargetsForTrigger(
        typedTrigger,
        rule.actions,
        'actions',
      );
      errors.push(...actionIssues.map((issue) => issue.message));
    } else {
      errors.push('actions is required.');
    }
  }

  errors.push(...getConditionValidationErrors(rule?.condition, 'condition'));

  return errors;
}

export function SimulationStoresRulesEditor({ eid, components }: { eid: number; components: Record<string, any> }) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand } = useEditor();
  const pendingStoreBaselineRef = useRef<Map<number, StoreDefinition>>(new Map());
  const pendingRuleBaselineRef = useRef<Map<number, any>>(new Map());

  const entityStore = getModule<EntityStoreModule>(ctx, 'entityStore')!;
  const storeInstances = entityStore.listStoreInstances().filter((entry) => !['rules', 'heldItems', 'aiMemory', 'inventoryCooldowns', 'archetypeRef', 'unlockedAchievements', 'metrics'].includes(entry.name));
  const storeNames = storeInstances.map((entry) => entry.name);
  const storeTypeByName = Object.fromEntries(storeInstances.map((entry) => [entry.name, entry.type])) as Record<string, StoreType>;

  const storeSchema = useMemo<any>(() => ({
    name: 'store',
    type: 'object',
    required: true,
    fields: {
      store: {
        name: 'store',
        type: 'enum',
        required: true,
        enumValues: storeNames,
        defaultValue: storeNames[0],
      },
      value: {
        name: 'value',
        type: 'union',
        required: true,
        discriminator: 'store',
        unionTypes: Object.fromEntries(storeNames.map((name) => {
          const type = storeTypeByName[name];
          const schema = valueSchemaByStoreType[type];
          if (schema.type === 'array') {
            return [name, [{ ...schema.itemType, name: 'stableId' }]];
          }
          return [name, Object.values(schema.fields)];
        })),
      },
    },
  }), [storeNames, storeTypeByName]);

  const stores = useMemo<StoreDefinition[]>(() => buildStoreDefinitions(components), [components]);
  const rules = Array.isArray(components.Rules) ? components.Rules : [];

  const storeItems = useMemo<StoreItem[]>(() => stores.map((value, index) => ({
    key: `store-${index}`,
    label: value.store,
    icon: 'settings',
    index,
    value,
  })), [stores]);
  const availableStoreNames = useMemo(
    () => getAvailableStoreNames(storeNames, stores),
    [storeNames, stores]
  );
  const addStoreMenuItems = useMemo<MenuProps['items']>(
    () => availableStoreNames.map((name) => ({ key: name, label: name })),
    [availableStoreNames]
  );

  const ruleItems = useMemo<RuleItem[]>(() => rules.map((value: any, index: number) => ({
    key: `rule-${index}`,
    label: `${value?.trigger?.type ?? 'rule'} #${index + 1}`,
    icon: 'effect',
    index,
    value,
  })), [rules]);

  const applyStores = (nextStores: StoreDefinition[]) => {
    applyBundle(ctx, eid, storesToBundle(nextStores, storeTypeByName));
  };

  const applyStoreLive = (index: number, value: StoreDefinition) => {
    if (!pendingStoreBaselineRef.current.has(index) && stores[index] !== undefined) {
      pendingStoreBaselineRef.current.set(index, cloneValue(stores[index]));
    }
    const nextStores = [...stores];
    nextStores[index] = value;
    applyStores(nextStores);
  };

  const commitStore = (index: number, value: StoreDefinition) => {
    const previousStores = [...stores];
    const baseline = pendingStoreBaselineRef.current.get(index);
    previousStores[index] = cloneValue(baseline ?? stores[index]);
    pendingStoreBaselineRef.current.delete(index);

    const nextStores = [...stores];
    nextStores[index] = value;

    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Stores',
      nextStores,
      false,
      { previousComponentData: previousStores }
    );
    executeCommand(command);
  };

  const applyRuleLive = (index: number, value: any, showValidationError = false) => {
    const validationErrors = getRuleTargetValidationErrors(value);
    if (showValidationError && validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }
    if (!showValidationError && validationErrors.length > 0) {
      // Allow transient invalid states while users switch discriminators and fill params.
      // Validation is enforced on commit.
      const nextRules = [...rules];
      nextRules[index] = value;
      applyBundle(ctx, eid, { Rules: nextRules });
      return;
    }

    const nextRules = [...rules];
    nextRules[index] = value;
    applyBundle(ctx, eid, { Rules: nextRules });
  };

  const commitRule = (index: number, value: any) => {
    const validationErrors = getRuleTargetValidationErrors(value);
    if (validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }

    const previousRules = [...rules];
    const baseline = pendingRuleBaselineRef.current.get(index);
    previousRules[index] = cloneValue(baseline ?? rules[index]);
    pendingRuleBaselineRef.current.delete(index);

    const nextRules = [...rules];
    nextRules[index] = value;

    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Rules',
      nextRules,
      false,
      { previousComponentData: previousRules }
    );
    executeCommand(command);
  };

  const addStore = (storeName: string) => {
    const nextType = storeTypeByName[storeName];
    if (!nextType) return;
    const nextStores = [...stores, { store: storeName, value: defaultValueForStoreType(nextType) }];
    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Stores',
      nextStores,
      false,
      { previousComponentData: stores }
    );
    executeCommand(command);
  };

  const addRule = () => {
    const nextRules = [...rules, defaultRule];
    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Rules',
      nextRules,
      false,
      { previousComponentData: rules }
    );
    executeCommand(command);
  };

  const removeStore = (index: number) => {
    const nextStores = stores.filter((_, storeIndex) => storeIndex !== index);
    pendingStoreBaselineRef.current.clear();
    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Stores',
      nextStores,
      false,
      { previousComponentData: stores }
    );
    executeCommand(command);
  };

  const removeRule = (index: number) => {
    const nextRules = rules.filter((_, ruleIndex) => ruleIndex !== index);
    pendingRuleBaselineRef.current.clear();
    const command = new ModifyComponentCommand(
      ctx,
      api,
      eid,
      'Rules',
      nextRules,
      false,
      { previousComponentData: rules }
    );
    executeCommand(command);
  };

  return (
    <div>
      <InspectorComponentSection
        title="Stores"
        action={(
          <Dropdown
            menu={{
              items: addStoreMenuItems,
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                addStore(String(key));
              },
            }}
            trigger={['click']}
            disabled={availableStoreNames.length === 0}
          >
            <span>
              <Tooltip title={availableStoreNames.length === 0 ? 'All registered stores already added' : 'Add store'}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditorIcon name="add" />}
                  disabled={availableStoreNames.length === 0}
                  style={{ color: EDITOR_COLORS.textSecondary }}
                />
              </Tooltip>
            </span>
          </Dropdown>
        )}
      >
        <ItemList
          title="Stores"
          showTitle={false}
          items={storeItems}
          emptyText="No stores"
          onItemClick={() => undefined}
          onRemove={(item) => removeStore(item.index)}
          removeTooltip="Delete store"
          renderPopout={(item) => (
            <GenericFieldRenderer
              metadata={storeSchema}
              value={item.value}
              onChange={(value) => applyStoreLive(item.index, value)}
              onCommit={(value) => commitStore(item.index, value)}
              path={`Stores.${item.index}`}
              parentValue={stores}
            />
          )}
        />
      </InspectorComponentSection>

      <InspectorComponentSection
        title="Rules"
        action={(
          <Tooltip title="Add rule">
            <Button
              type="text"
              size="small"
              icon={<EditorIcon name="add" />}
              style={{ color: EDITOR_COLORS.textSecondary }}
              onClick={(event) => {
                event.stopPropagation();
                addRule();
              }}
            />
          </Tooltip>
        )}
      >
        <ItemList
          title="Rules"
          showTitle={false}
          items={ruleItems}
          emptyText="No rules"
          onItemClick={() => undefined}
          onRemove={(item) => removeRule(item.index)}
          removeTooltip="Delete rule"
          renderPopout={(item) => (
            <GenericFieldRenderer
              metadata={ruleSchema}
              value={item.value}
              onChange={(value) => {
                if (!pendingRuleBaselineRef.current.has(item.index) && rules[item.index] !== undefined) {
                  pendingRuleBaselineRef.current.set(item.index, cloneValue(rules[item.index]));
                }
                applyRuleLive(item.index, value, false);
              }}
              onCommit={(value) => commitRule(item.index, value)}
              path={`Rules.${item.index}`}
              parentValue={rules}
            />
          )}
        />
      </InspectorComponentSection>
    </div>
  );
}
