import { describe, it, expect, beforeAll } from 'vitest';
import { profileCycles, MemoryProfiler } from '../utils/memoryProfiler';
import { createECS, clearECS } from '../core/ecs';

/**
 * Automated memory leak detection tests
 * 
 * These tests profile memory usage during typical operations
 * and detect leaks without requiring manual browser testing.
 */

describe('Memory Leak Detection', () => {
  beforeAll(() => {
    // Note: These tests work best with --expose-gc flag
    // Run with: vitest --run memory-leak-detection.test.ts --no-coverage
    if (!global.gc) {
      console.warn('⚠️  global.gc() not available. Run Node with --expose-gc for accurate results.');
    }
  });

  it('should not leak memory when creating and clearing ECS context repeatedly', async () => {
    const { isLeaking, averageGrowthPerCycle, totalGrowth } = await profileCycles(async () => {
      const ctx = createECS();
      
      // Simulate some work
      for (let i = 0; i < 100; i++) {
        ctx.modules.set(`module${i}`, {} as any);
      }
      
      clearECS(ctx);
    }, 10, 'ECS Create/Clear');

    const growthMB = totalGrowth / 1024 / 1024;
    const avgGrowthMB = averageGrowthPerCycle / 1024 / 1024;

    console.log(`Growth: ${growthMB.toFixed(2)} MB, Avg: ${avgGrowthMB.toFixed(2)} MB/cycle`);

    // Should not grow more than 20 MB over 10 cycles
    expect(growthMB).toBeLessThan(20);
    expect(isLeaking).toBe(false);
  }, 30000); // 30 second timeout

  it('should detect memory growth patterns (browser only)', async () => {
    // Skip in Node.js environment (no performance.memory API)
    if (!('memory' in performance)) {
      console.log('⏭️  Skipping browser-only test in Node.js');
      return;
    }
    
    const profiler = new MemoryProfiler();
    
    // Simulate a leak
    const leak: any[] = [];
    
    profiler.start(50);
    
    // Intentionally leak memory
    for (let i = 0; i < 100; i++) {
      leak.push(new Array(10000).fill(i));
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const snapshot = profiler.stop();
    
    const growthMB = snapshot.totalGrowth / 1024 / 1024;
    console.log(`Intentional leak growth: ${growthMB.toFixed(2)} MB`);
    
    // Should detect the intentional leak
    expect(MemoryProfiler.isLeaking(snapshot, 5)).toBe(true);
    expect(growthMB).toBeGreaterThan(5);
  }, 15000);

  it('should format memory snapshots correctly', () => {
    const snapshot = {
      samples: [
        { timestamp: 1000, heapUsed: 100 * 1024 * 1024, heapTotal: 200 * 1024 * 1024, external: 0, arrayBuffers: 0 },
        { timestamp: 2000, heapUsed: 150 * 1024 * 1024, heapTotal: 200 * 1024 * 1024, external: 0, arrayBuffers: 0 },
      ],
      startTime: 1000,
      endTime: 2000,
      totalGrowth: 50 * 1024 * 1024,
      averageGrowthPerSample: 50 * 1024 * 1024,
      peakHeap: 150 * 1024 * 1024,
      baselineHeap: 100 * 1024 * 1024,
    };

    const formatted = MemoryProfiler.formatSnapshot(snapshot);
    
    expect(formatted).toContain('Memory Snapshot');
    expect(formatted).toContain('Duration: 1.00s');
    expect(formatted).toContain('Samples: 2');
    expect(formatted).toContain('Baseline: 100.00 MB');
    expect(formatted).toContain('Growth: 50.00 MB');
  });

  it('should compare snapshots correctly', () => {
    const before = {
      samples: [
        { timestamp: 1000, heapUsed: 100 * 1024 * 1024, heapTotal: 200 * 1024 * 1024, external: 0, arrayBuffers: 0 },
      ],
      startTime: 1000,
      endTime: 2000,
      totalGrowth: 0,
      averageGrowthPerSample: 0,
      peakHeap: 100 * 1024 * 1024,
      baselineHeap: 100 * 1024 * 1024,
    };

    const after = {
      samples: [
        { timestamp: 3000, heapUsed: 200 * 1024 * 1024, heapTotal: 300 * 1024 * 1024, external: 0, arrayBuffers: 0 },
      ],
      startTime: 3000,
      endTime: 4000,
      totalGrowth: 0,
      averageGrowthPerSample: 0,
      peakHeap: 200 * 1024 * 1024,
      baselineHeap: 200 * 1024 * 1024,
    };

    const comparison = MemoryProfiler.compareSnapshots(before, after);
    
    expect(comparison.growth).toBe(100 * 1024 * 1024);
    expect(comparison.growthPercent).toBe(100);
    expect(comparison.isLeaking).toBe(true); // > 50 MB
  });
});
