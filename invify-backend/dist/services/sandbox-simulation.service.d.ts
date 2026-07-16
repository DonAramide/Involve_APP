export declare class SandboxBankingSimulationService {
    private static forcedStatus;
    private static latencies;
    private static circuitTripped;
    static setForcedStatus(provider: string, status: string): void;
    static getForcedStatus(provider: string): string;
    static setLatency(provider: string, latencyMs: number): void;
    static getLatency(provider: string): number;
    static setCircuitTripped(provider: string, tripped: boolean): void;
    static isCircuitTripped(provider: string): boolean;
    static clear(): void;
}
