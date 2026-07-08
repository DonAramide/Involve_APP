export class ObservabilityMetrics {
  private static counters: Map<string, number> = new Map();
  private static gauges: Map<string, number> = new Map();

  static clearMetrics() {
    this.counters.clear();
    this.gauges.clear();
  }

  /** Returns the number of distinct gauge keys currently tracked. */
  static getGaugeCount(): number {
    return this.gauges.size;
  }

  /** Returns the number of distinct counter keys currently tracked. */
  static getCounterCount(): number {
    return this.counters.size;
  }


  static incrementCounter(name: string, labels: Record<string, string> = {}) {
    const key = this.formatKey(name, labels);
    const val = this.counters.get(key) || 0;
    this.counters.set(key, val + 1);
  }

  static setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.formatKey(name, labels);
    this.gauges.set(key, value);
  }

  static getGauge(name: string, labels: Record<string, string> = {}): number {
    const key = this.formatKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  private static formatKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * Generates standard Prometheus exposition text format.
   */
  static exportPrometheus(): string {
    let output = '';
    
    // Export counters
    for (const [key, val] of this.counters.entries()) {
      output += `${key} ${val}\n`;
    }
    // Export gauges
    for (const [key, val] of this.gauges.entries()) {
      output += `${key} ${val}\n`;
    }
    return output;
  }
}
