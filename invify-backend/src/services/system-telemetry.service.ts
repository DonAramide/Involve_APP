import os from 'os';

export class SystemTelemetryService {
  private static lastCpuTime: { idle: number; total: number } | null = null;
  
  /**
   * Returns current real CPU usage percentage by comparing active/idle ticks over time
   */
  static getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = this.getAverageCpu();
      
      // We must measure over a slight interval (e.g., 200ms) to get the true load
      setTimeout(() => {
        const endMeasure = this.getAverageCpu();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        
        let percentageCPU = 0;
        if (totalDifference > 0) {
          percentageCPU = 100 - Math.floor((100 * idleDifference) / totalDifference);
        }
        resolve(percentageCPU);
      }, 200);
    });
  }

  /**
   * Helper to aggregate CPU ticks across all cores
   */
  private static getAverageCpu() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type];
      }
      idle += cpu.times.idle;
    }
    
    return {
      idle: idle / cpus.length,
      total: total / cpus.length
    };
  }

  /**
   * Returns a snapshot of system resource utilization matching the frontend Dashboard interface
   */
  static async getLiveHardwareResources() {
    const cpuUsage = await this.getCpuUsage();
    
    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = Math.round((usedMem / totalMem) * 100);
    
    // Disk & Network are mocked here natively since raw node 'os' doesn't provide disk IO stats natively.
    // For a real prod app, you'd use a package or read /proc/diskstats in linux.
    const variantService = require('../config/build-variant').BuildVariantService.getInstance();
    
    let diskPercentage = 32;
    let networkPercentage = 15;

    if (variantService.isLocal()) {
      diskPercentage = Math.floor(Math.random() * 5) + 30; // Float around 30-35%
      networkPercentage = Math.floor(Math.random() * 20) + 10; // Float around 10-30%
    }

    return {
      cpu: { label: 'CPU Usage', value: cpuUsage, color: 'cyan-4' },
      memory: { label: 'Memory Usage', value: memoryPercentage, color: 'purple-4' },
      storage: { label: 'Disk Space', value: diskPercentage, color: 'teal-4' },
      network: { label: 'Network I/O', value: networkPercentage, color: 'amber-4' }
    };
  }
}
