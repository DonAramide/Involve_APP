export class SandboxBankingSimulationService {
  private static forcedStatus: Record<string, string> = {};
  private static latencies: Record<string, number> = {};
  private static circuitTripped: Record<string, boolean> = {};

  static setForcedStatus(provider: string, status: string) {
    this.forcedStatus[provider.toUpperCase()] = status;
  }

  static getForcedStatus(provider: string): string {
    return this.forcedStatus[provider.toUpperCase()] || 'SUCCESS';
  }

  static setLatency(provider: string, latencyMs: number) {
    this.latencies[provider.toUpperCase()] = latencyMs;
  }

  static getLatency(provider: string): number {
    return this.latencies[provider.toUpperCase()] ?? 50;
  }

  static setCircuitTripped(provider: string, tripped: boolean) {
    this.circuitTripped[provider.toUpperCase()] = tripped;
  }

  static isCircuitTripped(provider: string): boolean {
    return !!this.circuitTripped[provider.toUpperCase()];
  }

  static clear() {
    this.forcedStatus = {};
    this.latencies = {};
    this.circuitTripped = {};
  }
}
