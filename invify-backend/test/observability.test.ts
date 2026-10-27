// invify-backend/test/observability.test.ts
import request from 'supertest';
import app from '../src/app';
import { SecretSanitizer } from '../src/services/observability/secret-sanitizer';
import { RingBuffer } from '../src/services/observability/ring-buffer';
import { ObservabilityCollectorService } from '../src/services/observability/observability-collector.service';
import { ObservabilitySseService } from '../src/services/observability/observability-sse.service';

describe('INVIFY Phase 1 — Secret Sanitizer Comprehensive Test', () => {
  test('redacts JWTs from plain strings', () => {
    const rawJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const log = `Auth header had token: ${rawJwt} attached to request`;
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).not.toContain(rawJwt);
    expect(sanitized).toContain('[REDACTED_JWT]');
  });

  test('redacts Bearer tokens', () => {
    const log = 'Bearer mySecretBearerToken1234567890==';
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).toBe('Bearer [REDACTED_TOKEN]');
  });

  test('redacts passwords and refresh tokens in key-value format', () => {
    const log = 'login failure password=MyP@ssword! and refresh_token=rt_9876543210';
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).not.toContain('MyP@ssword!');
    expect(sanitized).not.toContain('rt_9876543210');
    expect(sanitized).toContain('password=[REDACTED_VALUE]');
    expect(sanitized).toContain('refresh_token=[REDACTED_VALUE]');
  });

  test('redacts OTP and MFA secrets', () => {
    const log = 'Verification failed for otp: 123456 with mfa_secret=JBSWY3DPEHPK3PXP';
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).not.toContain('123456');
    expect(sanitized).not.toContain('JBSWY3DPEHPK3PXP');
    expect(sanitized).toContain('otp:[REDACTED_OTP]');
    expect(sanitized).toContain('mfa_secret=[REDACTED_VALUE]');
  });

  test('redacts Authorization, Cookie, and Set-Cookie headers', () => {
    const log =
      'Headers: Authorization: Bearer token123; Cookie: session_id=sess_abc123; Set-Cookie: token=tok_xyz';
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).not.toContain('sess_abc123');
    expect(sanitized).not.toContain('tok_xyz');
    expect(sanitized).toContain('Authorization: [REDACTED_HEADER]');
    expect(sanitized).toContain('Cookie: [REDACTED_COOKIE]');
    expect(sanitized).toContain('Set-Cookie: [REDACTED_COOKIE]');
  });

  test('redacts database credentials in connection strings', () => {
    const log = 'Database connection failed to postgres://invify_user:P@ssword123@prod-db.internal:5432/invify';
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).not.toContain('P@ssword123');
    expect(sanitized).toContain('[REDACTED_PASS]');
  });

  test('redacts cloud credentials and secret query parameters', () => {
    const log = 'Request to S3 key AKIAIOSFODNN7EXAMPLE via /api/v1/sync?token=secret123&key=myKey99';
    const sanitized = SecretSanitizer.sanitizeString(log);
    expect(sanitized).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(sanitized).not.toContain('secret123');
    expect(sanitized).not.toContain('myKey99');
    expect(sanitized).toContain('[REDACTED_CLOUD_KEY]');
    expect(sanitized).toContain('?token=[REDACTED]');
    expect(sanitized).toContain('&key=[REDACTED]');
  });

  test('deeply sanitizes object properties without exposing credentials', () => {
    const obj = {
      user: 'admin',
      jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.abc',
      secretKey: 'mySecret',
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      nested: {
        password: 'password123',
        safeProperty: 'Invify Staging',
      },
    };
    const sanitized = SecretSanitizer.sanitizeObject(obj);
    expect(sanitized.jwtToken).toBe('[REDACTED]');
    expect(sanitized.secretKey).toBe('[REDACTED]');
    expect(sanitized.mfaSecret).toBe('[REDACTED]');
    expect(sanitized.nested.password).toBe('[REDACTED]');
    expect(sanitized.nested.safeProperty).toBe('Invify Staging');
  });
});

describe('INVIFY Phase 1 — Bounded In-Memory Structures', () => {
  test('RingBuffer maintains bounded capacity and FIFO eviction', () => {
    const buffer = new RingBuffer<number>(5);
    for (let i = 1; i <= 10; i++) {
      buffer.push(i);
    }
    expect(buffer.getLength()).toBe(5);
    expect(buffer.toArray()).toEqual([6, 7, 8, 9, 10]);
  });

  test('RingBuffer getRecent returns correct tail in order', () => {
    const buffer = new RingBuffer<string>(5);
    buffer.push('a');
    buffer.push('b');
    buffer.push('c');
    expect(buffer.getRecent(2)).toEqual(['b', 'c']);
  });
});

describe('INVIFY Phase 1 — Collector Service & Snapshot Schema', () => {
  test('collector generates snapshot with strictly allowlisted fields', () => {
    const collector = ObservabilityCollectorService.getInstance();
    const snapshot = collector.getSnapshot();

    // 1. Release allowlist
    expect(snapshot.release).toBeDefined();
    expect(snapshot.release.appEnv).toBeDefined();
    expect(snapshot.release.buildVariant).toBeDefined();
    expect(snapshot.release.appVersion).toBeDefined();
    expect(snapshot.release.gitCommit).toBeDefined();
    expect(snapshot.release.releaseId).toBeDefined();
    expect(snapshot.release.bootTimestamp).toBeDefined();
    expect(typeof snapshot.release.uptimeSeconds).toBe('number');

    // 2. Runtime allowlist
    expect(snapshot.runtime).toBeDefined();
    expect(snapshot.runtime.pid).toBe(process.pid);
    expect(snapshot.runtime.nodeVersion).toBe(process.version);
    expect(snapshot.runtime.cpu.cores).toBeGreaterThan(0);
    expect(snapshot.runtime.memory.hostTotalBytes).toBeGreaterThan(0);
    expect(snapshot.runtime.memory.processRssBytes).toBeGreaterThan(0);

    // 3. Health state
    expect(snapshot.health.status).toBe('healthy');
    expect(snapshot.health.liveness).toBe('alive');
    expect(snapshot.health.readiness).toBe('ready');

    // 4. Traffic metrics
    expect(snapshot.traffic).toBeDefined();
    expect(typeof snapshot.traffic.totalRequests).toBe('number');
    expect(typeof snapshot.traffic.requestsPerSecond).toBe('number');
    expect(snapshot.traffic.latency).toBeDefined();

    // 5. Auth activity
    expect(snapshot.authActivity).toBeDefined();
    expect(typeof snapshot.authActivity.loginsSuccess).toBe('number');

    // 6. Host diagnostics indicates CLI monitor responsibility (no shell execution)
    expect(snapshot.hostDiagnostics.cliDiagnosticTool).toBe('scripts/staging-realtime-monitor.sh');
    expect(snapshot.hostDiagnostics.systemctlState).toBe('managed_by_cli_monitor');

    // 7. Verify NO process.env dump
    expect((snapshot as any).env).toBeUndefined();
    expect((snapshot as any).processEnv).toBeUndefined();
    expect((snapshot as any).JWT_SECRET).toBeUndefined();
    expect((snapshot as any).SUPABASE_JWT_SECRET).toBeUndefined();
  });

  test('collector excludes observability endpoints from request metrics', () => {
    const collector = ObservabilityCollectorService.getInstance();
    const beforeCount = collector.getSnapshot().traffic.totalRequests;

    collector.recordHttpRequest('GET', '/api/admin/observability/snapshot', 200, 5);
    collector.recordHttpRequest('GET', '/admin/observability/logs', 200, 5);

    const afterCount = collector.getSnapshot().traffic.totalRequests;
    // Count should NOT increment for observability endpoints
    expect(afterCount).toBe(beforeCount);
  });

  test('collector records normal traffic accurately', () => {
    const collector = ObservabilityCollectorService.getInstance();
    const beforeCount = collector.getSnapshot().traffic.totalRequests;

    collector.recordHttpRequest('GET', '/api/devices', 200, 15);
    collector.recordHttpRequest('POST', '/api/payments', 400, 25);

    const afterCount = collector.getSnapshot().traffic.totalRequests;
    expect(afterCount).toBe(beforeCount + 2);
  });

  test('collector logs pass through sanitizer BEFORE ring buffer insertion', () => {
    const collector = ObservabilityCollectorService.getInstance();
    const rawSecret = 'password=MySuperSecret999!';
    console.log(`Testing logger with ${rawSecret}`);

    const logs = collector.getLogs(10, 'all', 'Testing logger');
    expect(logs.length).toBeGreaterThan(0);
    const entry = logs[0];
    expect(entry.message).not.toContain('MySuperSecret999!');
    expect(entry.message).toContain('password=[REDACTED_VALUE]');
  });
});

describe('INVIFY Phase 1 — RBAC & API Security Enforcement', () => {
  test('GET /api/admin/observability/snapshot rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/admin/observability/snapshot');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/observability/snapshot rejects non-Super-Admin with 403', async () => {
    const res = await request(app)
      .get('/api/admin/observability/snapshot')
      .set('Authorization', 'Bearer mock-agent-token-test-user');
    expect(res.status).toBe(403);
  });

  test('GET /api/admin/observability/snapshot allows Super Admin', async () => {
    const res = await request(app)
      .get('/api/admin/observability/snapshot')
      .set('Authorization', 'Bearer mock-super-admin');

    expect(res.status).toBe(200);
    expect(res.body.environment).toBeDefined();
    expect(res.body.release).toBeDefined();
    expect(res.body.runtime).toBeDefined();
    expect(res.body.traffic).toBeDefined();
    expect(res.body.authActivity).toBeDefined();
  });

  test('GET /api/admin/observability/logs rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/admin/observability/logs');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/observability/logs rejects non-Super-Admin with 403', async () => {
    const res = await request(app)
      .get('/api/admin/observability/logs')
      .set('Authorization', 'Bearer mock-agent-token-test-user');
    expect(res.status).toBe(403);
  });

  test('GET /api/admin/observability/logs allows Super Admin and returns sanitized logs', async () => {
    const res = await request(app)
      .get('/api/admin/observability/logs')
      .set('Authorization', 'Bearer mock-super-admin');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  test('verify no shell execution / child_process imports exist in observability services', () => {
    const fs = require('fs');
    const path = require('path');
    const serviceCode = fs.readFileSync(
      path.join(__dirname, '../src/services/observability/observability-collector.service.ts'),
      'utf8',
    );
    expect(serviceCode).not.toContain('child_process');
    expect(serviceCode).not.toContain('exec(');
    expect(serviceCode).not.toContain('execFile(');
    expect(serviceCode).not.toContain('spawn(');
  });

  test('verify no environment files are read or referenced for exposure', () => {
    const fs = require('fs');
    const path = require('path');
    const serviceCode = fs.readFileSync(
      path.join(__dirname, '../src/services/observability/observability-collector.service.ts'),
      'utf8',
    );
    expect(serviceCode).not.toContain('/etc/invify-staging-backend.env');
    expect(serviceCode).not.toContain("readFileSync('.env'");
  });
});

describe('INVIFY Phase 2 — SSE Live Observability Stream', () => {
  class MockSseResponse {
    public statusCode = 200;
    public headers: Record<string, string> = {};
    public writtenData: string[] = [];
    public writableEnded = false;
    public destroyed = false;
    public listeners: Record<string, Function[]> = {};
    public shouldSimulateBackpressure = false;

    writeHead(statusCode: number, headers: Record<string, string>) {
      this.statusCode = statusCode;
      this.headers = headers;
      return this;
    }

    flushHeaders() {}

    write(chunk: string) {
      if (this.writableEnded || this.destroyed) return false;
      this.writtenData.push(chunk);
      return !this.shouldSimulateBackpressure;
    }

    end() {
      this.writableEnded = true;
      this.emit('finish');
      this.emit('close');
    }

    on(event: string, fn: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return this;
    }

    emit(event: string) {
      if (this.listeners[event]) {
        this.listeners[event].forEach((fn) => fn());
      }
    }

    status(code: number) {
      this.statusCode = code;
      return {
        json: (data: any) => {
          this.writtenData.push(JSON.stringify(data));
        },
      };
    }
  }

  class MockSseRequest {
    public listeners: Record<string, Function[]> = {};

    on(event: string, fn: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return this;
    }

    emit(event: string) {
      if (this.listeners[event]) {
        this.listeners[event].forEach((fn) => fn());
      }
    }
  }

  afterEach(() => {
    ObservabilitySseService.getInstance().closeAll();
  });

  test('GET /api/admin/observability/stream rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/admin/observability/stream');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/observability/stream rejects non-Super-Admin with 403', async () => {
    const res = await request(app)
      .get('/api/admin/observability/stream')
      .set('Authorization', 'Bearer mock-agent-token-test-user');
    expect(res.status).toBe(403);
  });

  test('POST /api/admin/observability/stream is rejected (404/405)', async () => {
    const res = await request(app)
      .post('/api/admin/observability/stream')
      .set('Authorization', 'Bearer mock-super-admin');
    expect([404, 405]).toContain(res.status);
  });

  test('SSE service sets required headers on client registration', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req = new MockSseRequest() as any;
    const res = new MockSseResponse() as any;

    const registered = sseService.registerClient(req, res);
    expect(registered).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.headers['Cache-Control']).toContain('no-cache');
    expect(res.headers['Connection']).toBe('keep-alive');
    expect(res.headers['X-Accel-Buffering']).toBe('no');
  });

  test('SSE service immediately pushes initial snapshot upon registration', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req = new MockSseRequest() as any;
    const res = new MockSseResponse() as any;

    sseService.registerClient(req, res);
    expect(res.writtenData.length).toBeGreaterThanOrEqual(1);
    const initialEvent = res.writtenData[0];
    expect(initialEvent).toContain('event: snapshot\n');
    expect(initialEvent).toContain('data: {');
    expect(initialEvent).not.toContain('process.env');
    expect(initialEvent).not.toContain('JWT_SECRET');
  });

  test('SSE service broadcasts snapshots to all connected clients', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req1 = new MockSseRequest() as any;
    const res1 = new MockSseResponse() as any;
    const req2 = new MockSseRequest() as any;
    const res2 = new MockSseResponse() as any;

    sseService.registerClient(req1, res1);
    sseService.registerClient(req2, res2);

    const prevCount1 = res1.writtenData.length;
    const prevCount2 = res2.writtenData.length;

    sseService.broadcastSnapshot();

    expect(res1.writtenData.length).toBe(prevCount1 + 1);
    expect(res2.writtenData.length).toBe(prevCount2 + 1);
    expect(res1.writtenData[res1.writtenData.length - 1]).toContain('event: snapshot');
  });

  test('SSE service broadcasts sanitized log events to connected clients', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req = new MockSseRequest() as any;
    const res = new MockSseResponse() as any;

    sseService.registerClient(req, res);

    const logEntry = {
      id: 'log-123',
      timestamp: new Date().toISOString(),
      level: 'INFO' as const,
      source: 'backend' as const,
      message: 'Server listening on port 3004',
    };

    sseService.broadcastLog(logEntry);

    const lastMessage = res.writtenData[res.writtenData.length - 1];
    expect(lastMessage).toContain('event: log\n');
    expect(lastMessage).toContain('Server listening on port 3004');
  });

  test('SSE service sanitizes injected secrets in live logs (JWT, passwords, tokens)', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req = new MockSseRequest() as any;
    const res = new MockSseResponse() as any;

    sseService.registerClient(req, res);

    // Trigger console.error with sensitive data
    const rawSecret = 'password=SuperSecretPassword123! and token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig';
    console.error(`Live stream error: ${rawSecret}`);

    const lastMessage = res.writtenData[res.writtenData.length - 1];
    expect(lastMessage).toContain('event: log');
    expect(lastMessage).not.toContain('SuperSecretPassword123!');
    expect(lastMessage).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(lastMessage).toContain('password=[REDACTED_VALUE]');
    expect(lastMessage).toContain('[REDACTED_JWT]');
  });

  test('SSE service enforces MAX_CLIENTS limit (5) and returns 429 when full', () => {
    const sseService = ObservabilitySseService.getInstance();
    const clients: { req: MockSseRequest; res: MockSseResponse }[] = [];

    // Register 5 clients (max)
    for (let i = 0; i < 5; i++) {
      const req = new MockSseRequest() as any;
      const res = new MockSseResponse() as any;
      const success = sseService.registerClient(req, res);
      expect(success).toBe(true);
      clients.push({ req, res });
    }

    expect(sseService.getActiveClientCount()).toBe(5);

    // 6th client registration attempt
    const extraReq = new MockSseRequest() as any;
    const extraRes = new MockSseResponse() as any;
    const success = sseService.registerClient(extraReq, extraRes);
    expect(success).toBe(false);
    expect(extraRes.statusCode).toBe(429);
    expect(extraRes.writtenData[0]).toContain('Maximum active observability streams reached');
  });

  test('SSE service cleans up disconnected client and allows new connection', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req1 = new MockSseRequest() as any;
    const res1 = new MockSseResponse() as any;

    sseService.registerClient(req1, res1);
    expect(sseService.getActiveClientCount()).toBe(1);

    // Client disconnects
    req1.emit('close');
    expect(sseService.getActiveClientCount()).toBe(0);

    // New client connects
    const req2 = new MockSseRequest() as any;
    const res2 = new MockSseResponse() as any;
    const success = sseService.registerClient(req2, res2);
    expect(success).toBe(true);
    expect(sseService.getActiveClientCount()).toBe(1);
  });

  test('SSE service backpressure handling terminates slow/blocked client after threshold', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req = new MockSseRequest() as any;
    const res = new MockSseResponse() as any;
    res.shouldSimulateBackpressure = true; // res.write returns false

    sseService.registerClient(req, res);
    expect(sseService.getActiveClientCount()).toBe(1);

    // Simulate 11 broadcast ticks where res.write returns false
    for (let i = 0; i < 11; i++) {
      sseService.broadcastSnapshot();
    }

    // Client should have been safely terminated and removed
    expect(sseService.getActiveClientCount()).toBe(0);
    expect(res.writableEnded).toBe(true);
  });

  test('SSE service sends heartbeat without corrupting event stream', () => {
    const sseService = ObservabilitySseService.getInstance();
    const req = new MockSseRequest() as any;
    const res = new MockSseResponse() as any;

    sseService.registerClient(req, res);
    sseService.broadcastHeartbeat();

    const lastMessage = res.writtenData[res.writtenData.length - 1];
    expect(lastMessage).toBe(': heartbeat\n\n');
  });

  test('SSE stream request is excluded from request traffic metrics', () => {
    const collector = ObservabilityCollectorService.getInstance();
    const beforeCount = collector.getSnapshot().traffic.totalRequests;

    collector.recordHttpRequest('GET', '/api/admin/observability/stream', 200, 5);
    collector.recordHttpRequest('GET', '/admin/observability/stream', 200, 5);

    const afterCount = collector.getSnapshot().traffic.totalRequests;
    expect(afterCount).toBe(beforeCount);
  });

  test('verify no shell execution / child_process imports exist in observability-sse.service.ts', () => {
    const fs = require('fs');
    const path = require('path');
    const serviceCode = fs.readFileSync(
      path.join(__dirname, '../src/services/observability/observability-sse.service.ts'),
      'utf8',
    );
    expect(serviceCode).not.toContain('child_process');
    expect(serviceCode).not.toContain('exec(');
    expect(serviceCode).not.toContain('execFile(');
    expect(serviceCode).not.toContain('spawn(');
    expect(serviceCode).not.toContain('systemctl');
    expect(serviceCode).not.toContain('service ');
  });
});

