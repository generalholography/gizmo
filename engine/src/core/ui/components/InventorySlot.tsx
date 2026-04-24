import React from 'react';
import { EngineAPI } from '../../..';
import { InventoryItem } from '../../inventory';
import useEventListener from '../hooks/useEventListener';
import { ReactiveMap } from '../../../utils/reactiveTypes';
import { getModule, getResource } from '../../ecs';

/**
 * Reusable inventory/hotbar slot component.
 * Handles optional cooldown overlay, active styling and click/select events.
 */
export interface InventorySlotProps {
  index?: number; // optional because hotbar might not need cooldown per index or can still pass it
  item: InventoryItem | null;
  api: EngineAPI;
  size: number; // pixel size
  active?: boolean;
  showCooldown?: boolean; // whether to render cooldown overlay
  onSelect?: (index?: number) => void;
}

const InventorySlot: React.FC<InventorySlotProps> = ({
  index,
  item,
  api,
  size,
  active = false,
  showCooldown = false,
  onSelect,
}) => {
  // Cooldown overlay (used currently by inventory modal)
  let cooldownPct: number | null = null;
  if (showCooldown && typeof index === 'number') {
    const playerCooldownCallbacks = getResource<ReactiveMap<number>>(api.ecsWorld, 'playerInventoryCooldownCallbacks');
    cooldownPct = useEventListener(playerCooldownCallbacks, String(index));
    if (typeof cooldownPct === 'number') {
      cooldownPct = Math.min(1, Math.max(0, cooldownPct ?? 0));
    }
  }

  let img = null;
  if (item && item.type === 'entity') {
    const archetype = getModule(api.ecsWorld, 'archetype');

    const def =
      typeof item.definition === "string"
        ? archetype.get(archetype.resolve(item.definition))
        : item.definition;

    img = api.getPreview(def);
  }

  return (
    <div
      onClick={() => onSelect?.(index)}
      onTouchStart={() => onSelect?.(index)}
      style={{
        width: size,
        height: size,
        border: active ? '2px solid yellow' : '1px solid #555',
        boxSizing: 'border-box',
        background: '#222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        cursor: onSelect ? 'pointer' : 'default',
      }}
    >
      {typeof cooldownPct === 'number' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${(cooldownPct ?? 0) * 100}%`,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            pointerEvents: 'none',
          }}
        />
      )}
      {img && <img src={img} style={{ maxWidth: '100%', maxHeight: '100%' }} />}
      {!img && item && item.type === 'material' && (
        <div style={{ color: 'white', fontSize: 12 }}>{item.amount}</div>
      )}
    </div>
  );
};

export default InventorySlot;
