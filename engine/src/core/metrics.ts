import { hasComponent } from "bitecs";
import { ECSContext } from "./ecs";
import { Player, StableID } from "./components";
import { checkAchievementsFor } from "./achievements";
import EventEmitter from "../utils/eventEmitter";
import { KILL_PLANE_EID, KILL_PLANE_NAME } from "./systems/killPlane";
import { getStore, MetricsStore, type MetricData } from "../modules/entityStore";

import { eidToStableId } from "../utils/stableId";

export type MetricsKey = string | number;
export type MetricsRecord = Record<string, number>;

export class Metrics extends EventEmitter<null> {
    private data: Record<string, Record<string, Record<string, number>>> = {};

    private toStableIdIfNumber(entity: MetricsKey): MetricsKey {
        if (typeof entity === "number") {
            // special case for -99, which is often used as a sentinel value
            // this is used for the kill plane system to indicate no actor
            if (entity === KILL_PLANE_EID) return KILL_PLANE_NAME; 
            
            const sid = StableID.id[entity];
            if (sid === undefined) {
                console.error(`Entity ${entity} does not have a StableID component!`);
            }
            return sid;
        }
        // if it is a string, that should already be stable
        return entity;
    }

    private ensure(entity: MetricsKey, metric: string) {
        if (!this.data[entity]) this.data[entity] = {};
        if (!this.data[entity][metric]) this.data[entity][metric] = { __value: 0 };
    }

    private getOrchestratorKey(entityID: MetricsKey): MetricsKey | null {
        if (hasComponent(this.ctx, Player, Number(entityID))) {
            return `Player`;
        }
        return null;
    }

    private deduped = new Set<string>(); // only works bc js is single-threaded
    private fireEvents(entity: MetricsKey, metric: string, type?: string) {
        try {
            this.deduped.add(this.getListenerKey(entity));
            this.deduped.add(this.getListenerKey(entity, metric));
            this.deduped.add(this.getListenerKey(entity, metric, type));
            this.deduped.forEach(key => this.emit(key, null));
        } finally {
            this.deduped.clear();
        }
    }

    /**
     * Sync metrics from this resource to MetricsStore for an entity.
     * This ensures metrics are persisted during serialization.
     * @param eid Entity ID to sync metrics for
     */
    private syncToStore(eid: number): void {
        const stableId = eidToStableId(this.ctx, eid);
        if (stableId === undefined) return;
        
        const metricsStore = getStore<MetricsStore>(this.ctx, 'metrics');
        const entityMetrics = this.data[String(stableId)];
        
        if (entityMetrics && Object.keys(entityMetrics).length > 0) {
            // Deep copy the metrics data
            const metricData: MetricData = {};
            for (const [metric, data] of Object.entries(entityMetrics)) {
                metricData[metric] = { ...data } as { __value: number; [type: string]: number };
            }
            metricsStore.set(eid, metricData);
        }
    }

    constructor(private ctx: ECSContext) {
        super();
    }

    public getListenerKey(entity: MetricsKey, metric?: string, type?: string): string {
        return `${String(entity)}${metric ? `.${metric}` : ""}${type ? `.${type}` : ""}`;
    }

    get(entity: MetricsKey, metric: string, type?: string): number {
        entity = this.toStableIdIfNumber(entity);
        const e = String(entity);
        const m = String(metric);
        this.ensure(e, m);
        if (type === undefined) {
            return this.data[e][m].__value ?? 0;
        }
        const t = String(type);
        return this.data[e][m][t] ?? 0;
    }

    set(entity: MetricsKey, metric: string, value: number): void;
    set(entity: MetricsKey, metric: string, type: string, value: number): void;
    set(entity: MetricsKey, metric: string, a: any, b?: any): void {
        const entityStableId = this.toStableIdIfNumber(entity);
        const e = String(entityStableId);
        const m = String(metric);
        this.ensure(e, m);

        // We need to check using the original entity ID, not the stable ID
        // since we are actually querying for components
        const o = this.getOrchestratorKey(entity);
        o && this.ensure(o, m);

        if (b === undefined) {
            const delta = Number(a) - this.data[e][m].__value;
            this.data[e][m].__value = Number(a);

            if (o) {
                (this.data[o][m].__value += delta);
            }
        } else {
            const t = String(a);
            const delta = Number(b) - (this.data[e][m][t] ?? 0);
            this.data[e][m][t] = Number(b);
            this.data[e][m].__value += delta;

            // Update orchestrator proxy if it exists
            if (o) {
                (this.data[o][m][t] = (this.data[o][m][t] ?? 0) + delta);
                (this.data[o][m].__value += delta);
            }
        }

        this.fireEvents(e, m, a);
        if (o) {
            this.fireEvents(o, m, a);
            checkAchievementsFor(this.ctx, o);
        }
        
        // Sync to MetricsStore for persistence
        if (typeof entity === 'number') {
            this.syncToStore(entity);
        }
    }

    increment(entity: MetricsKey, metric: string): void;
    increment(entity: MetricsKey, metric: string, delta?: number): void;
    increment(entity: MetricsKey, metric: string, type: string, delta?: number): void;
    increment(entity: MetricsKey, metric: string, a?: any, b?: any): void {
        const entityStableId = this.toStableIdIfNumber(entity);
        const e = String(entityStableId);
        const m = String(metric);
        this.ensure(e, m);

        // Also increment orchestrator proxy if it exists
        // We need to check using the original entity ID, not the stable ID
        // since we are actually querying for components
        const o = this.getOrchestratorKey(entity);
        if (o) {
            this.ensure(o, m);
            this.increment(o, m, a, b);
            checkAchievementsFor(this.ctx, o);
        }

        if (a === undefined) {
            if (b === undefined) {
                //(entity, metric) => increment by 1
                this.data[e][m].__value += 1;
            } else {
                //(entity, metric, delta) => increment by delta. this is a failsafe
                this.data[e][m].__value += Number(b);
            }
        }
        else if (b === undefined) {
            if (typeof a === "number") {
                //(entity, metric, delta) => increment by delta
                this.data[e][m].__value += a;
            }
            else {
                //(entity, metric, type) => increment by 1 for type
                const t = String(a);
                this.data[e][m][t] = (this.data[e][m][t] ?? 0) + 1;
                this.data[e][m].__value += 1;
            }
        } else {
            //(entity, metric, type, delta) => increment by delta for type
            const t = String(a);
            this.data[e][m][t] = (this.data[e][m][t] ?? 0) + Number(b);
            this.data[e][m].__value += Number(b);
        }

        this.fireEvents(e, m, a);
        
        // Sync to MetricsStore for persistence
        if (typeof entity === 'number') {
            this.syncToStore(entity);
        }
    }

    keys(entity: string): string[] {
        return Object.keys(this.data[entity] ?? {});
    }

    types(entity: string, metric: string): string[] {
        const obj = this.data[entity]?.[metric];
        if (!obj) return [];
        return Object.keys(obj).filter(k => k !== "__value");
    }
}