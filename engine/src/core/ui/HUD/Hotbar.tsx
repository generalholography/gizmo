import React, { useEffect, useRef, useState } from 'react';
import { useAPI } from '../App';
import { EngineAPI } from '../../..';
import { Inventory } from '../../inventory';
import { MAX_HOTBAR_SIZE } from '../../components/Inventory';
import InventorySlot from '../components/InventorySlot';

const slotSize = 48; // Size of each hotbar slot in pixels
const emptyDiv = <div style={{height: slotSize, gap: 4}}/>


const Hotbar = () => {
  const api = useAPI();
  const [inventory, setInventory] = useState(api.getPlayerInventory());
  const [hasInventory, setHasInventory] = useState(!!(inventory && inventory.slots));
  const prevHasInventory = useRef(hasInventory);

  useEffect(() => {
    const setInventoryCallback = (newInventory: Inventory) => {
      setInventory({ ...newInventory });
    };
    const unsubscribe = api.onPlayerInventoryChange(setInventoryCallback);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api]);

  useEffect(() => {
    let running = true;
    let frame: number;

    function checkInventory() {
      if (!running) return;
      const inv = api.getPlayerInventory();
      const hasInv = !!(inv && inv.slots);
      if (hasInv !== prevHasInventory.current) {
        setHasInventory(hasInv);
        prevHasInventory.current = hasInv;
      }
      frame = requestAnimationFrame(checkInventory);
    }
    checkInventory();
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [api]);

  if (!hasInventory) return emptyDiv;
  if (!inventory || !inventory.slots) return emptyDiv;

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        pointerEvents: 'auto',
        zIndex: 20,
      }}
    >
      {inventory.slots
        .slice(0, Math.min(inventory.size, MAX_HOTBAR_SIZE))
        .map((slot, i) => (
          <InventorySlot
            key={i}
            index={i}
            item={slot}
            active={inventory.selected === i}
            api={api}
            size={slotSize}
            showCooldown
            onSelect={() => api.selectHotbarSlot(i)}
          />
        ))}
    </div>
  );
};

export default Hotbar;
