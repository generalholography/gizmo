import React, { useEffect, useRef, useState } from "react";
import { useAPI } from "../App";
import { Inventory } from "../../inventory";
import { Tag } from "antd";

const FADE_DURATION = 400; // ms
const SHOW_DURATION = 1200; // ms

const HeldItemName: React.FC = () => {
    const api = useAPI();
    const [visible, setVisible] = useState(false);
    const [itemName, setItemName] = useState<string>("");
    const fadeTimeout = useRef<number | null>(null);
    const hideTimeout = useRef<number | null>(null);

    useEffect(() => {
        function handleInventoryChange(newInventory: Inventory) {
            const slot = newInventory.slots?.[newInventory.selected];
            let name = "";
            if (slot) {
                if (slot.type === "entity") {
                    name = typeof slot.definition === 'string' 
                        ? slot.definition 
                        : (slot.definition?.Info?.name || "Item");
                } else if (slot.type === "material") {
                    name = slot.type || "Material";
                }
            }
            setItemName(name);
            setVisible(false);
            // Clear previous timers
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
            if (hideTimeout.current) clearTimeout(hideTimeout.current);

            // Show, then fade, then hide
            setVisible(true);
            fadeTimeout.current = window.setTimeout(() => {
                setVisible(false);
            }, SHOW_DURATION);
        }

        const unsubscribe = api.onPlayerInventoryChange(handleInventoryChange);
        return () => {
            if (unsubscribe) unsubscribe();
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
        };
    }, [api]);

    // Don't render if no name or not visible
    if (!itemName) return null;

    return (
        <div
            style={{
                zIndex: 11,
                pointerEvents: "none",
                width: 120,
                minWidth: 120,
                maxWidth: 300,
                textAlign: "center",
                wordBreak: "break-word",
                fontSize: 14,
                fontWeight: "bold",
                color: "#fff",
                textShadow: "0 2px 8px #000, 0 0px 2px #000",
                opacity: visible ? 1 : 0,
                transition: `opacity ${FADE_DURATION}ms ease`,
                background: "rgba(0,0,0,0.4)",
                borderRadius: 4,
                padding: "4px 16px",
                userSelect: "none",
            }}
        >
            {itemName}
        </div>
    );
};

export default HeldItemName;
