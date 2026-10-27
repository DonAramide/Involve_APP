// invify-backend/src/services/observability/observability-sse.service.ts
import { Request, Response } from 'express';
import {
  ObservabilityCollectorService,
  ObservabilitySnapshot,
  SanitizedLogEntry,
} from './observability-collector.service';

interface SseClient {
  id: string;
  req: Request;
  res: Response;
  connectedAt: Date;
  backpressureCount: number;
}

export class ObservabilitySseService {
  private static instance: ObservabilitySseService;

  // Hard limit on concurrent Super Admin SSE connections to prevent resource exhaustion
  private static readonly MAX_CLIENTS = 5;

  // Snapshot broadcast interval (3 seconds)
  private static readonly SNAPSHOT_INTERVAL_MS = 3000;

  // Keep-alive heartbeat interval (15 seconds)
  private static readonly HEARTBEAT_INTERVAL_MS = 15000;

  private readonly clients = new Map<string, SseClient>();
  private snapshotTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Subscribe to new sanitized logs emitted by the collector
    ObservabilityCollectorService.getInstance().on('log', (logEntry: SanitizedLogEntry) => {
      this.broadcastLog(logEntry);
    });
  }

  public static getInstance(): ObservabilitySseService {
    if (!ObservabilitySseService.instance) {
      ObservabilitySseService.instance = new ObservabilitySseService();
    }
    return ObservabilitySseService.instance;
  }

  /**
   * Registers a new SSE client.
   * Enforces max client limits, sets required SSE headers, sends initial snapshot immediately,
   * and attaches disconnection/cleanup hooks.
   */
  public registerClient(req: Request, res: Response): boolean {
    if (this.clients.size >= ObservabilitySseService.MAX_CLIENTS) {
      res.status(429).json({
        error: 'Maximum active observability streams reached. Please close an existing stream.',
      });
      return false;
    }

    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Set mandatory SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Instructs Nginx not to buffer event stream
    });

    // Flush headers if supported by compression/proxy middleware
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const client: SseClient = {
      id: clientId,
      req,
      res,
      connectedAt: new Date(),
      backpressureCount: 0,
    };

    this.clients.set(clientId, client);

    // Attach cleanup handlers for all disconnection scenarios
    const cleanup = () => {
      this.removeClient(clientId);
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);

    // Immediately push the current snapshot so client does not wait for next tick
    const collector = ObservabilityCollectorService.getInstance();
    this.sendToClient(client, 'snapshot', collector.getSnapshot());

    // Ensure background intervals are active
    this.ensureTimersStarted();

    return true;
  }

  /**
   * Safely removes a disconnected client and cleans up timers if no clients remain.
   */
  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);

    if (!client.res.writableEnded && !client.res.destroyed) {
      try {
        client.res.end();
      } catch {
        // Ignore errors during stream termination
      }
    }

    // Stop background timers if no active clients remain to conserve resources
    if (this.clients.size === 0) {
      this.stopTimers();
    }
  }

  /**
   * Broadcasts the current allowlisted snapshot to all connected clients.
   */
  public broadcastSnapshot(): void {
    if (this.clients.size === 0) return;

    const collector = ObservabilityCollectorService.getInstance();
    const snapshot = collector.getSnapshot();

    for (const client of Array.from(this.clients.values())) {
      this.sendToClient(client, 'snapshot', snapshot);
    }
  }

  /**
   * Broadcasts a sanitized log entry to all connected clients.
   */
  public broadcastLog(logEntry: SanitizedLogEntry): void {
    if (this.clients.size === 0) return;

    // Explicit allowlist payload matching SanitizedLogEntry
    const safePayload = {
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      source: logEntry.source,
      message: logEntry.message,
    };

    for (const client of Array.from(this.clients.values())) {
      this.sendToClient(client, 'log', safePayload);
    }
  }

  /**
   * Sends an SSE comment heartbeat to keep idle TCP connections alive through reverse proxies.
   */
  public broadcastHeartbeat(): void {
    if (this.clients.size === 0) return;

    for (const client of Array.from(this.clients.values())) {
      if (client.res.writableEnded || client.res.destroyed) {
        this.removeClient(client.id);
        continue;
      }
      try {
        client.res.write(': heartbeat\n\n');
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  /**
   * Formats and writes an SSE event to a specific client with backpressure protection.
   */
  private sendToClient(client: SseClient, event: 'snapshot' | 'log', data: any): void {
    if (client.res.writableEnded || client.res.destroyed) {
      this.removeClient(client.id);
      return;
    }

    try {
      const formattedData = typeof data === 'string' ? data : JSON.stringify(data);
      const message = `event: ${event}\ndata: ${formattedData}\n\n`;

      // Backpressure check: res.write returns false if stream buffer is saturated
      const bufferAvailable = client.res.write(message);

      if (!bufferAvailable) {
        client.backpressureCount++;
        // If client cannot consume after 10 consecutive ticks, safely disconnect to protect backend
        if (client.backpressureCount > 10) {
          try {
            client.res.end();
          } catch {}
          this.removeClient(client.id);
        }
      } else {
        client.backpressureCount = 0;
      }
    } catch {
      this.removeClient(client.id);
    }
  }

  private ensureTimersStarted(): void {
    if (!this.snapshotTimer) {
      this.snapshotTimer = setInterval(() => {
        this.broadcastSnapshot();
      }, ObservabilitySseService.SNAPSHOT_INTERVAL_MS);

      if (typeof this.snapshotTimer.unref === 'function') {
        this.snapshotTimer.unref();
      }
    }

    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        this.broadcastHeartbeat();
      }, ObservabilitySseService.HEARTBEAT_INTERVAL_MS);

      if (typeof this.heartbeatTimer.unref === 'function') {
        this.heartbeatTimer.unref();
      }
    }
  }

  private stopTimers(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public getActiveClientCount(): number {
    return this.clients.size;
  }

  public getMaxClients(): number {
    return ObservabilitySseService.MAX_CLIENTS;
  }

  public closeAll(): void {
    for (const clientId of Array.from(this.clients.keys())) {
      this.removeClient(clientId);
    }
    this.stopTimers();
  }
}
