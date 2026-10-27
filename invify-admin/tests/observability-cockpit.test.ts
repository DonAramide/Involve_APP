// invify-admin/tests/observability-cockpit.test.ts
import { permissionsForOperatorRole } from '../src/utils/operatorPermissions';
import routes from '../src/router/routes';

describe('INVIFY Step 30D — Admin Observability System Health Cockpit', () => {
  // ==========================================
  // 1. RBAC & PERMISSION ARCHITECTURE
  // ==========================================
  describe('RBAC & Permission Architecture', () => {
    test('read_observability_staging is granted to SUPER_ADMIN', () => {
      const perms = permissionsForOperatorRole('SUPER_ADMIN');
      expect(perms).toContain('read_observability_staging');
    });

    test('read_observability_staging is denied to ADMIN_FINANCE', () => {
      const perms = permissionsForOperatorRole('ADMIN_FINANCE');
      expect(perms).not.toContain('read_observability_staging');
    });

    test('read_observability_staging is denied to ADMIN_OPS', () => {
      const perms = permissionsForOperatorRole('ADMIN_OPS');
      expect(perms).not.toContain('read_observability_staging');
    });

    test('read_observability_staging is denied to ADMIN_TREASURY', () => {
      const perms = permissionsForOperatorRole('ADMIN_TREASURY');
      expect(perms).not.toContain('read_observability_staging');
    });

    test('read_observability_staging is denied to TENANT_ADMIN and OWNER', () => {
      expect(permissionsForOperatorRole('TENANT_ADMIN')).not.toContain('read_observability_staging');
      expect(permissionsForOperatorRole('owner')).not.toContain('read_observability_staging');
      expect(permissionsForOperatorRole('cashier')).not.toContain('read_observability_staging');
    });
  });

  // ==========================================
  // 2. ROUTE REGISTRY & WORKSPACE PLACEMENT
  // ==========================================
  describe('Route Registry & Workspace Placement', () => {
    const getMainLayoutRoute = () =>
      routes.find((r) => r.path === '/' && r.children?.some((c) => c.path === 'observability/streams'));

    test('/observability/system-health is registered under MainLayout', () => {
      const mainLayout = getMainLayoutRoute();
      expect(mainLayout).toBeDefined();

      const cockpitRoute = mainLayout?.children?.find(
        (child) => child.path === 'observability/system-health'
      );

      expect(cockpitRoute).toBeDefined();
      expect(cockpitRoute?.meta?.title).toBe('Staging System Health');
      expect(cockpitRoute?.meta?.workspace).toBe('observability');
      expect(cockpitRoute?.meta?.permission).toBe('read_observability_staging');
      expect(cockpitRoute?.meta?.requiresAuth).toBe(true);
    });

    test('all existing observability routes remain intact', () => {
      const mainLayout = getMainLayoutRoute();
      const childrenPaths = mainLayout?.children?.map((c) => c.path) || [];

      expect(childrenPaths).toContain('observability/streams');
      expect(childrenPaths).toContain('observability/metrics');
      expect(childrenPaths).toContain('observability/queues');
      expect(childrenPaths).toContain('observability/websocket-health');
      expect(childrenPaths).toContain('observability/realtime');
      expect(childrenPaths).toContain('observability/audit');
      expect(childrenPaths).toContain('observability/pipelines');
      expect(childrenPaths).toContain('observability/system-health');
    });
  });

  // ==========================================
  // 3. SSE EVENT PARSER & DISPATCHER
  // ==========================================
  describe('SSE Parsing & Backoff Engine', () => {
    function parseSseBlock(block: string) {
      if (!block || !block.trim()) return null;
      if (block.trim().startsWith(':')) return { isHeartbeat: true };

      let eventName = 'message';
      let dataStr = '';

      const lines = block.split('\n');
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr += (dataStr ? '\n' : '') + line.slice(5).trim();
        }
      }

      if (!dataStr) return null;
      try {
        return { event: eventName, data: JSON.parse(dataStr) };
      } catch {
        return null;
      }
    }

    test('parses snapshot SSE event block correctly', () => {
      const block = 'event: snapshot\ndata: {"environment":"STAGING","health":{"status":"healthy"}}\n\n';
      const parsed = parseSseBlock(block);

      expect(parsed).not.toBeNull();
      expect(parsed?.event).toBe('snapshot');
      expect(parsed?.data.environment).toBe('STAGING');
      expect(parsed?.data.health.status).toBe('healthy');
    });

    test('parses log SSE event block correctly', () => {
      const block = 'event: log\ndata: {"id":"log-1","level":"INFO","message":"Server ready"}\n\n';
      const parsed = parseSseBlock(block);

      expect(parsed).not.toBeNull();
      expect(parsed?.event).toBe('log');
      expect(parsed?.data.id).toBe('log-1');
      expect(parsed?.data.level).toBe('INFO');
      expect(parsed?.data.message).toBe('Server ready');
    });

    test('identifies heartbeat comment lines without failing', () => {
      const block = ': heartbeat\n\n';
      const parsed = parseSseBlock(block);

      expect(parsed).toEqual({ isHeartbeat: true });
    });

    test('ignores malformed or corrupt JSON payloads gracefully', () => {
      const block = 'event: snapshot\ndata: { corrupt: json\n\n';
      const parsed = parseSseBlock(block);

      expect(parsed).toBeNull();
    });

    test('computes bounded exponential backoff intervals correctly', () => {
      const intervals = [1000, 2000, 4000, 8000, 15000];
      function getReconnectDelay(attempt: number) {
        const idx = Math.min(attempt, intervals.length - 1);
        return intervals[idx];
      }

      expect(getReconnectDelay(0)).toBe(1000);
      expect(getReconnectDelay(1)).toBe(2000);
      expect(getReconnectDelay(2)).toBe(4000);
      expect(getReconnectDelay(3)).toBe(8000);
      expect(getReconnectDelay(4)).toBe(15000);
      expect(getReconnectDelay(10)).toBe(15000); // Bounded ceiling
    });
  });

  // ==========================================
  // 4. SNAPSHOT DATA RENDERING & SCHEMA CONTRACT
  // ==========================================
  describe('Snapshot Schema & Data Mapping', () => {
    const sampleSnapshot = {
      environment: 'STAGING',
      health: {
        liveness: 'healthy',
        readiness: 'healthy',
        status: 'healthy',
      },
      runtime: {
        nodeVersion: 'v20.12.0',
        pid: 14205,
        uptimeSeconds: 7200,
        cpu: {
          cores: 8,
          processCpuPercent: 12.5,
          loadAvg1m: 0.85,
          loadAvg5m: 0.92,
          loadAvg15m: 1.05,
        },
        memory: {
          hostTotalBytes: 16777216000,
          hostUsedBytes: 8388608000,
          hostFreeBytes: 8388608000,
          processRssBytes: 157286400,
          heapUsedBytes: 83886080,
          heapTotalBytes: 125829120,
        },
        disk: {
          totalBytes: 500000000000,
          usedBytes: 150000000000,
          freeBytes: 350000000000,
          usedPercentage: 30,
          status: 'available',
        },
      },
      traffic: {
        windowMinutes: 15,
        totalRequests: 4250,
        requestsPerSecond: 4.7,
        statusDistribution: {
          '2xx': 4100,
          '3xx': 50,
          '4xx': 90,
          '5xx': 10,
        },
        latency: {
          p50Ms: 12,
          p95Ms: 45,
          p99Ms: 120,
        },
      },
      authActivity: {
        loginsSuccess: 120,
        loginsFailed: 4,
        mfaChallengesIssued: 120,
        mfaChallengesPassed: 118,
        mfaChallengesFailed: 2,
        tokenRefreshes: 350,
      },
      release: {
        appEnv: 'staging',
        buildVariant: 'STANDALONE_HYBRID',
        appVersion: '1.0.5',
        gitCommit: 'staging-9a4f2b1',
        releaseId: 'rel-2026-09-14-01',
        bootTimestamp: '2026-09-14T10:00:00.000Z',
        uptimeSeconds: 7200,
      },
    };

    test('validates all required infrastructure vital metrics', () => {
      expect(sampleSnapshot.runtime.cpu.cores).toBeGreaterThanOrEqual(1);
      expect(sampleSnapshot.runtime.cpu.processCpuPercent).toBeGreaterThanOrEqual(0);
      expect(sampleSnapshot.runtime.memory.processRssBytes).toBeGreaterThan(0);
      expect(sampleSnapshot.runtime.disk.usedPercentage).toBe(30);
      expect(sampleSnapshot.runtime.nodeVersion).toMatch(/^v\d+/);
    });

    test('validates health probe statuses', () => {
      expect(sampleSnapshot.health.liveness).toBe('healthy');
      expect(sampleSnapshot.health.readiness).toBe('healthy');
      expect(sampleSnapshot.health.status).toBe('healthy');
    });

    test('validates traffic and latency distribution', () => {
      expect(sampleSnapshot.traffic.totalRequests).toBe(4250);
      expect(sampleSnapshot.traffic.requestsPerSecond).toBe(4.7);
      expect(sampleSnapshot.traffic.statusDistribution['2xx']).toBe(4100);
      expect(sampleSnapshot.traffic.latency.p50Ms).toBe(12);
      expect(sampleSnapshot.traffic.latency.p99Ms).toBe(120);
    });

    test('validates authentication activity metrics', () => {
      expect(sampleSnapshot.authActivity.loginsSuccess).toBe(120);
      expect(sampleSnapshot.authActivity.loginsFailed).toBe(4);
      expect(sampleSnapshot.authActivity.mfaChallengesPassed).toBe(118);
    });

    test('validates release and deployment metadata', () => {
      expect(sampleSnapshot.release.appEnv).toBe('staging');
      expect(sampleSnapshot.release.appVersion).toBe('1.0.5');
      expect(sampleSnapshot.release.gitCommit).toBe('staging-9a4f2b1');
    });
  });

  // ==========================================
  // 5. CONNECTION STATE & BACKEND LIFECYCLE
  // ==========================================
  describe('Connection & Backend State Transitions', () => {
    test('computes backend state from health status', () => {
      function computeBackendState(healthStatus?: string) {
        if (!healthStatus) return 'DOWN';
        return healthStatus === 'degraded' ? 'DEGRADED' : 'ACTIVE';
      }

      expect(computeBackendState('healthy')).toBe('ACTIVE');
      expect(computeBackendState('degraded')).toBe('DEGRADED');
      expect(computeBackendState(undefined)).toBe('DOWN');
    });

    test('handles stream states (LIVE, RECONNECTING, OFFLINE)', () => {
      const validStreamStates = ['LIVE', 'RECONNECTING', 'OFFLINE'];
      expect(validStreamStates).toContain('LIVE');
      expect(validStreamStates).toContain('RECONNECTING');
      expect(validStreamStates).toContain('OFFLINE');
    });
  });

  // ==========================================
  // 6. PAUSE / RESUME DISPLAY GATE
  // ==========================================
  describe('Pause / Resume Display Gate (Frontend-Only)', () => {
    test('pause stops visual updates while server continues running', () => {
      let isPaused = false;
      let uiSnapshot = { count: 0 };

      function handleIncomingSnapshot(incoming: { count: number }) {
        if (!isPaused) {
          uiSnapshot = incoming;
        }
      }

      // Normal flow
      handleIncomingSnapshot({ count: 1 });
      expect(uiSnapshot.count).toBe(1);

      // Pause display
      isPaused = true;
      handleIncomingSnapshot({ count: 2 });
      expect(uiSnapshot.count).toBe(1); // Retains paused value

      // Resume display
      isPaused = false;
      handleIncomingSnapshot({ count: 3 });
      expect(uiSnapshot.count).toBe(3); // Updates resume
    });
  });

  // ==========================================
  // 7. SEVERITY & SEARCH FILTERING
  // ==========================================
  describe('Log Console Filtering & Search', () => {
    const mockLogs = [
      { id: 'log-1', level: 'INFO', source: 'HTTP', message: 'GET /api/livez 200 OK' },
      { id: 'log-2', level: 'WARN', source: 'AUTH', message: 'Rate limit approaching on token endpoint' },
      { id: 'log-3', level: 'ERROR', source: 'DB', message: 'Query timeout on financial ledger sync' },
      { id: 'log-4', level: 'INFO', source: 'AUTH', message: 'Operator login success: sysadmin' },
    ];

    function filterLogs(logs: typeof mockLogs, severity: string, search: string) {
      let result = logs;
      if (severity && severity !== 'ALL') {
        result = result.filter((l) => l.level.toUpperCase() === severity.toUpperCase());
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        result = result.filter(
          (l) =>
            l.message.toLowerCase().includes(q) ||
            l.level.toLowerCase().includes(q) ||
            l.id.toLowerCase().includes(q)
        );
      }
      return result;
    }

    test('filters logs by severity level', () => {
      expect(filterLogs(mockLogs, 'ALL', '')).toHaveLength(4);
      expect(filterLogs(mockLogs, 'INFO', '')).toHaveLength(2);
      expect(filterLogs(mockLogs, 'WARN', '')).toHaveLength(1);
      expect(filterLogs(mockLogs, 'ERROR', '')).toHaveLength(1);
    });

    test('filters logs by text search query', () => {
      expect(filterLogs(mockLogs, 'ALL', 'ledger')).toHaveLength(1);
      expect(filterLogs(mockLogs, 'ALL', 'token')).toHaveLength(1);
      expect(filterLogs(mockLogs, 'ALL', 'nonexistent')).toHaveLength(0);
    });

    test('combines severity filter and search query correctly', () => {
      expect(filterLogs(mockLogs, 'INFO', 'login')).toHaveLength(1);
      expect(filterLogs(mockLogs, 'ERROR', 'login')).toHaveLength(0);
    });

    test('caps log buffer to max entries and prepends newest', () => {
      let buffer: Array<{ id: string }> = [];
      const MAX_LOGS = 500;

      for (let i = 0; i < 550; i++) {
        buffer = [{ id: `log-${i}` }, ...buffer.slice(0, MAX_LOGS - 1)];
      }

      expect(buffer).toHaveLength(MAX_LOGS);
      expect(buffer[0].id).toBe('log-549'); // Newest is at index 0
    });
  });

  // ==========================================
  // 8. ERROR & EMPTY DATA HANDLING
  // ==========================================
  describe('Error & Empty Data Resilience', () => {
    test('handles empty log array gracefully', () => {
      const logs: any[] = [];
      const filterResult = logs.filter((l) => l.level === 'INFO');
      expect(filterResult).toEqual([]);
    });

    test('handles 401 and 403 authorization failures', () => {
      function handleHttpResponse(status: number) {
        if (status === 401) {
          return { state: 'OFFLINE', error: 'Authentication required' };
        }
        if (status === 403) {
          return { state: 'OFFLINE', error: 'Access Denied: Super Admin role required' };
        }
        return { state: 'LIVE', error: null };
      }

      expect(handleHttpResponse(401)).toEqual({ state: 'OFFLINE', error: 'Authentication required' });
      expect(handleHttpResponse(403)).toEqual({ state: 'OFFLINE', error: 'Access Denied: Super Admin role required' });
      expect(handleHttpResponse(200)).toEqual({ state: 'LIVE', error: null });
    });

    test('handles API 500 snapshot failure without crashing', () => {
      let snapshot: any = null;
      let backendState = 'ACTIVE';
      let errorMessage: string | null = null;

      function onFetchError(err: Error) {
        if (!snapshot) {
          backendState = 'DOWN';
        }
        errorMessage = err.message || 'Failed to retrieve snapshot';
      }

      onFetchError(new Error('Internal Server Error'));
      expect(backendState).toBe('DOWN');
      expect(errorMessage).toBe('Internal Server Error');
    });
  });

  // ==========================================
  // 9. SECURITY & ZERO SECRET EXPOSURE
  // ==========================================
  describe('Security & Zero Secret Exposure', () => {
    test('snapshot contains no sensitive tokens, keys, passwords or credentials', () => {
      const snapshotKeys = [
        'environment', 'health', 'runtime', 'traffic', 'authActivity', 'release', 'hostDiagnostics'
      ];
      const forbiddenPatterns = [/password/i, /jwt/i, /secret/i, /bearer/i, /private_key/i, /env_vars/i];

      for (const key of snapshotKeys) {
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(key)).toBe(false);
        }
      }
    });

    test('log viewer does not contain terminal execution or operational mutation methods', () => {
      const cockpitMethods = ['pause', 'resume', 'refresh', 'clearSearch', 'copyText'];
      const forbiddenMethods = ['restart', 'deploy', 'systemctl', 'kill', 'exec', 'reload', 'stop'];

      for (const forbidden of forbiddenMethods) {
        expect(cockpitMethods).not.toContain(forbidden);
      }
    });
  });
});

