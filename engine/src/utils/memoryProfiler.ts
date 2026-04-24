/**
 * Memory profiling utilities for automated memory leak detection
 * 
 * This utility can be used during development to detect memory leaks
 * without requiring manual browser testing.
 */

export interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MemorySnapshot {
  samples: MemorySample[];
  startTime: number;
  endTime: number;
  totalGrowth: number;
  averageGrowthPerSample: number;
  peakHeap: number;
  baselineHeap: number;
}

export class MemoryProfiler {
  private samples: MemorySample[] = [];
  private startTime: number = 0;
  private isRunning: boolean = false;
  private intervalId: number | null = null;

  /**
   * Start collecting memory samples at the specified interval
   */
  start(intervalMs: number = 100): void {
    if (this.isRunning) {
      console.warn('[MemoryProfiler] Already running');
      return;
    }

    this.samples = [];
    this.startTime = Date.now();
    this.isRunning = true;

    // Take initial sample
    this.takeSample();

    // Set up interval for periodic sampling
    this.intervalId = window.setInterval(() => {
      this.takeSample();
    }, intervalMs) as any;

    console.log('[MemoryProfiler] Started (interval: ' + intervalMs + 'ms)');
  }

  /**
   * Stop collecting samples and return snapshot
   */
  stop(): MemorySnapshot {
    if (!this.isRunning) {
      console.warn('[MemoryProfiler] Not running');
      return this.createSnapshot();
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    // Take final sample
    this.takeSample();

    const snapshot = this.createSnapshot();
    console.log('[MemoryProfiler] Stopped. Total growth: ' + (snapshot.totalGrowth / 1024 / 1024).toFixed(2) + ' MB');

    return snapshot;
  }

  /**
   * Take a memory sample
   */
  private takeSample(): void {
    const memory = this.getMemoryInfo();
    if (memory) {
      this.samples.push(memory);
    }
  }

  /**
   * Get current memory info from browser
   */
  private getMemoryInfo(): MemorySample | null {
    // Check if performance.memory is available (Chrome/Edge)
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        timestamp: Date.now(),
        heapUsed: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        external: mem.jsHeapSizeLimit,
        arrayBuffers: 0, // Not available in this API
      };
    }

    // Fallback: no memory info available
    return null;
  }

  /**
   * Create snapshot from collected samples
   */
  private createSnapshot(): MemorySnapshot {
    const endTime = Date.now();

    if (this.samples.length === 0) {
      return {
        samples: [],
        startTime: this.startTime,
        endTime,
        totalGrowth: 0,
        averageGrowthPerSample: 0,
        peakHeap: 0,
        baselineHeap: 0,
      };
    }

    const baselineHeap = this.samples[0].heapUsed;
    const finalHeap = this.samples[this.samples.length - 1].heapUsed;
    const totalGrowth = finalHeap - baselineHeap;
    const averageGrowthPerSample = totalGrowth / (this.samples.length - 1);
    const peakHeap = Math.max(...this.samples.map(s => s.heapUsed));

    return {
      samples: [...this.samples],
      startTime: this.startTime,
      endTime,
      totalGrowth,
      averageGrowthPerSample,
      peakHeap,
      baselineHeap,
    };
  }

  /**
   * Get current statistics without stopping
   */
  getStats(): MemorySnapshot {
    return this.createSnapshot();
  }

  /**
   * Clear all collected samples
   */
  clear(): void {
    this.samples = [];
    this.startTime = Date.now();
  }

  /**
   * Format snapshot for logging
   */
  static formatSnapshot(snapshot: MemorySnapshot): string {
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

    return `
Memory Snapshot:
  Duration: ${((snapshot.endTime - snapshot.startTime) / 1000).toFixed(2)}s
  Samples: ${snapshot.samples.length}
  Baseline: ${mb(snapshot.baselineHeap)} MB
  Peak: ${mb(snapshot.peakHeap)} MB
  Final: ${mb(snapshot.samples[snapshot.samples.length - 1]?.heapUsed || 0)} MB
  Growth: ${mb(snapshot.totalGrowth)} MB
  Avg Growth/Sample: ${mb(snapshot.averageGrowthPerSample)} MB
    `.trim();
  }

  /**
   * Check if memory growth exceeds threshold
   */
  static isLeaking(snapshot: MemorySnapshot, thresholdMB: number = 50): boolean {
    const growthMB = snapshot.totalGrowth / 1024 / 1024;
    return growthMB > thresholdMB;
  }

  /**
   * Detect memory leak by comparing snapshots
   */
  static compareSnapshots(before: MemorySnapshot, after: MemorySnapshot): {
    growth: number;
    growthPercent: number;
    isLeaking: boolean;
  } {
    const beforeFinal = before.samples[before.samples.length - 1]?.heapUsed || 0;
    const afterFinal = after.samples[after.samples.length - 1]?.heapUsed || 0;
    const growth = afterFinal - beforeFinal;
    const growthPercent = (growth / beforeFinal) * 100;

    return {
      growth,
      growthPercent,
      isLeaking: growth > 50 * 1024 * 1024, // 50 MB threshold
    };
  }
}

/**
 * Helper function to profile a specific operation
 */
export async function profileOperation<T>(
  operation: () => Promise<T>,
  label: string = 'Operation'
): Promise<{ result: T; snapshot: MemorySnapshot }> {
  const profiler = new MemoryProfiler();

  // Force GC if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  profiler.start(50); // Sample every 50ms

  const result = await operation();

  // Wait a bit for async cleanup
  await new Promise(resolve => setTimeout(resolve, 100));

  const snapshot = profiler.stop();

  console.log(`[${label}] ${MemoryProfiler.formatSnapshot(snapshot)}`);

  if (MemoryProfiler.isLeaking(snapshot)) {
    console.warn(`[${label}] ⚠️  Potential memory leak detected!`);
  }

  return { result, snapshot };
}

/**
 * Helper to profile multiple cycles of an operation
 */
export async function profileCycles(
  operation: () => Promise<void>,
  cycles: number = 5,
  label: string = 'Cycle'
): Promise<{
  snapshots: MemorySnapshot[];
  totalGrowth: number;
  averageGrowthPerCycle: number;
  isLeaking: boolean;
}> {
  const snapshots: MemorySnapshot[] = [];

  // Force GC before starting
  if (global.gc) {
    global.gc();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  for (let i = 0; i < cycles; i++) {
    const { snapshot } = await profileOperation(operation, `${label} ${i + 1}/${cycles}`);
    snapshots.push(snapshot);

    // Force GC between cycles
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const baselineHeap = snapshots[0].samples[0]?.heapUsed || 0;
  const finalHeap = snapshots[cycles - 1].samples[snapshots[cycles - 1].samples.length - 1]?.heapUsed || 0;
  const totalGrowth = finalHeap - baselineHeap;
  const averageGrowthPerCycle = totalGrowth / cycles;

  const isLeaking = totalGrowth > 100 * 1024 * 1024; // 100 MB threshold for multiple cycles

  console.log(`
[Profile Cycles Summary]
  Cycles: ${cycles}
  Total Growth: ${(totalGrowth / 1024 / 1024).toFixed(2)} MB
  Avg Growth/Cycle: ${(averageGrowthPerCycle / 1024 / 1024).toFixed(2)} MB
  Status: ${isLeaking ? '⚠️  LEAKING' : '✅ OK'}
  `.trim());

  return {
    snapshots,
    totalGrowth,
    averageGrowthPerCycle,
    isLeaking,
  };
}
