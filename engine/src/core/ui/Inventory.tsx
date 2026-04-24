import React, { useEffect, useState } from 'react';
import { useAPI } from './App';
import { EngineAPI } from '../..';
import { Inventory } from '../inventory';
import InventorySlot from './components/InventorySlot';

interface InventoryProps {
  inventory?: Inventory;
  onClose: () => void;
}


const InventoryUI: React.FC<InventoryProps> = ({ onClose }) => {
  const api = useAPI();
  const [inventory, setInventory] = useState(api.getPlayerInventory());

  useEffect(() => {
    const setInventoryCallback = (newInventory: Inventory) => {
      setInventory({ ...newInventory });
    };
    const unsubscribe = api.onPlayerInventoryChange(setInventoryCallback);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api]);

  const cols = Math.min(10, inventory.size);
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 8, pointerEvents: 'auto' }}>
        <button onClick={onClose} style={{ marginBottom: 8 }}>Close</button>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 64px)`, gap: 4 }}>
          {inventory.slots.map((slot, i) => (
            <InventorySlot key={i} index={i} item={slot} api={api} size={64} showCooldown />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryUI;
