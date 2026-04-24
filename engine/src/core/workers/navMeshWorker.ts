import { type RecastConfig, exportNavMesh, exportTileCache, init } from '@recast-navigation/core';
import { generateTileCache } from '@recast-navigation/generators';

self.onmessage = async (event: {
    data: {
        positions: Float32Array;
        indices: Uint32Array;
        config: Partial<RecastConfig>;
    };
}) => {
    await init();
    console.log('Nav mesh worker initialized');

    const { positions, indices, config } = event.data;

    const res = generateTileCache(positions, indices, config);

    if (!res.success) return;

    const navMeshExport = exportNavMesh(res.navMesh);
    const tileCacheExport = exportTileCache(res.navMesh, res.tileCache);

    self.postMessage(navMeshExport, { transfer: [navMeshExport.buffer] });

    res.navMesh.destroy();
    res.tileCache.destroy();
};