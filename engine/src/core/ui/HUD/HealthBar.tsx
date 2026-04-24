import React, { useEffect, useRef } from "react";
import { Health, Player } from "../../components";
import { defineQuery } from "bitecs";
import { useAPI } from "../App";
import { getStore, StockStore } from "../../../modules/entityStore";


const playerQuery = defineQuery([Player]);

export function getPlayerHealthValues(ctx: any, playerEid: number | undefined): { value: number; maxValue: number } {
    if (playerEid === undefined) return { value: 0, maxValue: 0 };

    const healthStocks = getStore<StockStore>(ctx, 'health');
    const stock = healthStocks.has(playerEid)
        ? healthStocks.get(playerEid)
        : undefined;

    return {
        value: stock?.current ?? Health.value[playerEid] ?? 0,
        maxValue: stock?.max ?? Health.maxValue[playerEid] ?? 0,
    };
}

const HealthBar = () => {
    const api = useAPI();

    const barRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame: number;
        let running = true;

        function update() {
            if (!running) return;

            const eids = playerQuery(api.ecsWorld);

            const playerEid = eids[0];
            const { value, maxValue } = getPlayerHealthValues(api.ecsWorld, playerEid);
            const missingHealthComp = (value === 0 && maxValue === 0);

            const healthPercentage = missingHealthComp
                ? 0
                : Math.max(0, Math.min(100, (value / maxValue) * 100));

            if (barRef.current) {
                barRef.current.style.width = `${healthPercentage}%`;
                barRef.current.style.backgroundColor =
                    healthPercentage > 50
                        ? "#4CAF50"
                        : healthPercentage > 25
                            ? "#FF9800"
                            : "#F44336";
            }
            if (labelRef.current) {
                labelRef.current.textContent = missingHealthComp
                    ? '- / -'
                    : `${Math.ceil(value)} / ${maxValue}`;
            }

            frame = requestAnimationFrame(update);
        }
        update();
        return () => {
            running = false;
            cancelAnimationFrame(frame);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initial values for SSR/hydration
    const value = 0;
    const maxValue = 0;
    const healthPercentage = 100;

    return (
        <div style={{
            position: 'relative',
            width: 200,
            height: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            pointerEvents: 'none'
        }}>
            <div
                ref={barRef}
                style={{
                    width: `${healthPercentage}%`,
                    height: '100%',
                    backgroundColor: healthPercentage > 50 ? '#4CAF50' : healthPercentage > 25 ? '#FF9800' : '#F44336',
                    borderRadius: 1,
                    transition: 'width 0.3s ease, background-color 0.3s ease'
                }}
            />
            <div
                ref={labelRef}
                style={{
                    position: 'absolute',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'white',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    pointerEvents: 'none'
                }}
            >
                {Math.ceil(value)} / {maxValue}
            </div>
        </div>
    );
};

export default HealthBar;
