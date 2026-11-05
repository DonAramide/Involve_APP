import { Request, Response } from 'express';
import { SanitizedLogEntry } from './observability-collector.service';
export declare class ObservabilitySseService {
    private static instance;
    private static readonly MAX_CLIENTS;
    private static readonly SNAPSHOT_INTERVAL_MS;
    private static readonly HEARTBEAT_INTERVAL_MS;
    private readonly clients;
    private snapshotTimer;
    private heartbeatTimer;
    private constructor();
    static getInstance(): ObservabilitySseService;
    /**
     * Registers a new SSE client.
     * Enforces max client limits, sets required SSE headers, sends initial snapshot immediately,
     * and attaches disconnection/cleanup hooks.
     */
    registerClient(req: Request, res: Response): boolean;
    /**
     * Safely removes a disconnected client and cleans up timers if no clients remain.
     */
    removeClient(clientId: string): void;
    /**
     * Broadcasts the current allowlisted snapshot to all connected clients.
     */
    broadcastSnapshot(): void;
    /**
     * Broadcasts a sanitized log entry to all connected clients.
     */
    broadcastLog(logEntry: SanitizedLogEntry): void;
    /**
     * Sends an SSE comment heartbeat to keep idle TCP connections alive through reverse proxies.
     */
    broadcastHeartbeat(): void;
    /**
     * Formats and writes an SSE event to a specific client with backpressure protection.
     */
    private sendToClient;
    private ensureTimersStarted;
    private stopTimers;
    getActiveClientCount(): number;
    getMaxClients(): number;
    closeAll(): void;
}
