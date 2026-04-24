import React, { useEffect, useState } from "react";
import useEventListener from "../hooks/useEventListener";
import { Table } from "antd";
import { getResource } from "../../ecs";
import { Metrics } from "../../metrics";
import { useAPI } from "../App";

export const MetricsTable = () => {
    const api = useAPI();
    const oid = "Player";
    const metrics = getResource<Metrics>(api.ecsWorld, 'metrics');

    // Listen for updates - only rly important if game isnt paused
    useEventListener(metrics, oid);

    // Prepare dataSource with children for subrows
    const dataSource = metrics.keys(oid).map((metricName, i) => {
        const subItems = metrics.types(oid, metricName).map((typeName, j) => ({
            key: `${i}-${j}`,
            metric: typeName,
            value: metrics.get(oid, metricName, typeName),
            isSubItem: true,
        }));
        return {
            key: i,
            metric: metricName,
            value: metrics.get(oid, metricName),
            children: subItems.length > 0 ? subItems : undefined,
        };
    });

    // Get all parent row keys to expand by default
    const defaultExpandedRowKeys = dataSource.map(row => row.key);

    const columns = [
        {
            title: "Metric",
            dataIndex: "metric",
            key: "metric",
            render: (text: string, record: any) =>
                record.isSubItem ? <span style={{ paddingLeft: 24 }}>{text}</span> : <b>{text}</b>,
        },
        {
            title: "Value",
            dataIndex: "value",
            key: "value",
            width: "30%",
        },
    ];

    return (
        <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            size="small"
            locale={{ emptyText: '' }}
            showHeader={false}
            style={{ width: '100%' }}
            defaultExpandedRowKeys={defaultExpandedRowKeys}
        />
    );
};
