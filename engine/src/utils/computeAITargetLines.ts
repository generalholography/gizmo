import { ECSContext } from '../core/ecs';
import { defineQuery } from 'bitecs';
import { AI, Transform } from '../core/components';

const AIQuery = defineQuery([AI, Transform]);

export function computeAITargetLines(ctx: ECSContext): { vertices: number[], colors: number[] } {
    const vertices: number[] = [];
    const colors: number[] = [];
    
    const eids = AIQuery(ctx);
    
    for (const eid of eids) {
        // Get entity's current position
        const entityPos = {
            x: Transform.x[eid] || 0,
            y: Transform.y[eid] || 0,
            z: Transform.z[eid] || 0
        };
        
        // Get target position
        const targetPos = {
            x: AI._target[eid][0] || entityPos.x,
            y: AI._target[eid][1] || entityPos.y,
            z: AI._target[eid][2] || entityPos.z
        };
        
        // Only draw line if target is different from current position
        const distance = Math.sqrt(
            Math.pow(targetPos.x - entityPos.x, 2) +
            Math.pow(targetPos.y - entityPos.y, 2) + 
            Math.pow(targetPos.z - entityPos.z, 2)
        );
        
        if (distance > 0.01) { // Only draw if target is meaningfully different
            // Add line from entity to target (red color)
            vertices.push(entityPos.x, entityPos.y, entityPos.z, targetPos.x, targetPos.y, targetPos.z);
            colors.push(1, 0, 0, 1, 0, 0); // Red color for both ends of the line
        }
    }
    
    return { vertices, colors };
}