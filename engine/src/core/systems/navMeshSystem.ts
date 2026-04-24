import { initializeNavMesh, NavMeshData, NavMeshDataJob, NavMeshDataKey, NavMeshGenerationState } from "../../modules/navMesh";
import { ECSContext, getResource } from "../ecs";


export const navMeshSystem = (ctx: ECSContext) => {
    const navMeshData = getResource(ctx, 'navMeshData') as Map<NavMeshDataKey, NavMeshDataJob>;
    // Generate nav mesh after scene setup
    if (!navMeshData.has(0)) {  // temp key for now
        navMeshData.set(0, { state: NavMeshGenerationState.UNINITIALIZED, data: null });
    }
    const job = navMeshData.get(0)!;
    if (job.state === NavMeshGenerationState.UNINITIALIZED) {
        console.log("Starting nav mesh generation");
        job.state = NavMeshGenerationState.GENERATING;
        initializeNavMesh(ctx, ctx.three.scene);
    }
}