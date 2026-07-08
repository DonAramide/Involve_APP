export interface SubsystemTiming {
  name: string;
  durationMs: number;
}

export interface TimingMetrics {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  subsystems: SubsystemTiming[];
}

export class RuntimeTimingProfiler {
  private static durations: Map<string, number[]> = new Map();

  static recordDuration(metricName: string, durationMs: number) {
    const list = this.durations.get(metricName) || [];
    list.push(durationMs);
    this.durations.set(metricName, list);
  }

  static getMetrics(metricName: string, startedAt: string, finishedAt: string, subsystems: SubsystemTiming[]): TimingMetrics {
    const list = this.durations.get(metricName) || [0.001];
    const totalMs = list.reduce((a, b) => a + b, 0);
    const minMs = Math.min(...list);
    const maxMs = Math.max(...list);
    const avgMs = totalMs / list.length;

    return {
      startedAt,
      finishedAt,
      durationMs: totalMs,
      minMs,
      maxMs,
      avgMs,
      subsystems
    };
  }

  static clearDurations() {
    this.durations.clear();
  }
}
