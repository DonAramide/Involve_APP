<template>
  <q-page class="q-pa-lg bg-main text-main font-mono command-center-page" style="min-height: 100vh;">
    <!-- ========================================== -->
    <!-- 1. HEADER & GLOBAL TELEMETRY BAR           -->
    <!-- ========================================== -->
    <div class="row items-center justify-between q-mb-md border-main q-pa-md rounded-borders bg-panel shadow-sm">
      <div class="column">
        <div class="row items-center q-gutter-sm">
          <q-icon name="monitor_heart" size="32px" color="teal-4" />
          <div>
            <h1 class="text-h5 text-weight-bolder text-main q-ma-none font-sans">
              STAGING SYSTEM HEALTH
            </h1>
            <div class="text-caption text-secondary q-mt-xs font-mono">
              Infrastructure Operations Cockpit • Authoritative In-Process Telemetry
            </div>
          </div>
        </div>
      </div>

      <div class="row items-center q-gutter-md">
        <!-- Telemetry Status Pills -->
        <div class="row items-center q-gutter-sm">
          <!-- Connection State Badge -->
          <q-badge
            :color="connectionBadgeColor"
            :text-color="connectionTextColor"
            class="q-px-sm q-py-xs font-mono text-weight-bold"
            style="font-size: 11px;"
          >
            <q-spinner-dots v-if="connectionState === 'RECONNECTING'" size="12px" class="q-mr-xs" />
            <q-icon v-else :name="connectionState === 'LIVE' ? 'wifi' : 'wifi_off'" size="12px" class="q-mr-xs" />
            STREAM: {{ connectionState }}
          </q-badge>

          <!-- Backend Health Badge -->
          <q-badge
            :color="backendBadgeColor"
            :text-color="backendTextColor"
            class="q-px-sm q-py-xs font-mono text-weight-bold"
            style="font-size: 11px;"
          >
            <q-icon name="dns" size="12px" class="q-mr-xs" />
            BACKEND: {{ backendState }}
          </q-badge>

          <!-- Node PID & Port Badge -->
          <q-badge
            color="grey-9"
            text-color="grey-3"
            class="q-px-sm q-py-xs font-mono"
            style="font-size: 11px;"
          >
            PID: {{ snapshot?.runtime?.pid || '—' }} | PORT: 3004
          </q-badge>

          <!-- Uptime Badge -->
          <q-badge
            color="grey-9"
            text-color="cyan-3"
            class="q-px-sm q-py-xs font-mono"
            style="font-size: 11px;"
          >
            UP: {{ formatUptime(snapshot?.release?.uptimeSeconds) }}
          </q-badge>
        </div>

        <!-- Cockpit Controls (Read-Only UI Display Gates) -->
        <div class="row items-center q-gutter-xs">
          <q-btn
            v-if="!isPaused"
            flat
            dense
            color="amber-4"
            icon="pause"
            label="Pause"
            class="font-mono text-caption"
            @click="pause"
          >
            <q-tooltip>Pause live UI updates (does not affect server)</q-tooltip>
          </q-btn>
          <q-btn
            v-else
            flat
            dense
            color="positive"
            icon="play_arrow"
            label="Resume"
            class="font-mono text-caption"
            @click="resume"
          >
            <q-tooltip>Resume live telemetry stream</q-tooltip>
          </q-btn>

          <q-btn
            flat
            dense
            color="primary"
            icon="refresh"
            :loading="isLoading"
            label="Refresh"
            class="font-mono text-caption"
            @click="refresh"
          >
            <q-tooltip>Manually refresh snapshot and logs via REST</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- PAUSED BANNER -->
    <q-banner
      v-if="isPaused"
      dense
      inline-actions
      class="bg-amber-10 text-amber-2 q-mb-md rounded-borders font-mono text-caption border-main"
    >
      <q-icon name="pause_circle" size="18px" class="q-mr-xs" />
      UI DISPLAY PAUSED — Live event ingestion buffered. Server continues operating normally.
      <template v-slot:action>
        <q-btn flat dense color="amber-2" label="Resume Updates" @click="resume" />
      </template>
    </q-banner>

    <!-- ERROR BANNER -->
    <q-banner
      v-if="errorMessage"
      dense
      class="bg-negative text-white q-mb-md rounded-borders font-mono text-caption"
    >
      <q-icon name="error_outline" size="18px" class="q-mr-xs" />
      {{ errorMessage }}
    </q-banner>

    <!-- ========================================== -->
    <!-- 2. HEALTH PROBES ROW                       -->
    <!-- ========================================== -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main q-pa-sm" flat>
          <div class="row items-center justify-between">
            <div class="row items-center q-gutter-xs">
              <q-badge color="positive" rounded class="q-mr-xs" />
              <span class="text-caption font-mono text-weight-bold">/api/livez</span>
            </div>
            <div class="row items-center q-gutter-sm">
              <span class="text-caption font-mono text-secondary">HTTP 200</span>
              <q-badge color="green-9" text-color="green-2" class="font-mono text-weight-bold">
                {{ snapshot?.health?.liveness?.toUpperCase() || 'ALIVE' }}
              </q-badge>
            </div>
          </div>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main q-pa-sm" flat>
          <div class="row items-center justify-between">
            <div class="row items-center q-gutter-xs">
              <q-badge color="positive" rounded class="q-mr-xs" />
              <span class="text-caption font-mono text-weight-bold">/api/readyz</span>
            </div>
            <div class="row items-center q-gutter-sm">
              <span class="text-caption font-mono text-secondary">HTTP 200</span>
              <q-badge color="green-9" text-color="green-2" class="font-mono text-weight-bold">
                {{ snapshot?.health?.readiness?.toUpperCase() || 'READY' }}
              </q-badge>
            </div>
          </div>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main q-pa-sm" flat>
          <div class="row items-center justify-between">
            <div class="row items-center q-gutter-xs">
              <q-badge
                :color="snapshot?.health?.status === 'degraded' ? 'amber-5' : 'positive'"
                rounded
                class="q-mr-xs"
              />
              <span class="text-caption font-mono text-weight-bold">/api/health</span>
            </div>
            <div class="row items-center q-gutter-sm">
              <span class="text-caption font-mono text-secondary">In-Process</span>
              <q-badge
                :color="snapshot?.health?.status === 'degraded' ? 'amber-9' : 'green-9'"
                :text-color="snapshot?.health?.status === 'degraded' ? 'amber-2' : 'green-2'"
                class="font-mono text-weight-bold"
              >
                {{ snapshot?.health?.status?.toUpperCase() || 'HEALTHY' }}
              </q-badge>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 3. INFRASTRUCTURE VITALS GRID              -->
    <!-- ========================================== -->
    <div class="row q-col-gutter-md q-mb-md">
      <!-- CPU Vitals Card -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="bg-panel border-main fit q-pa-md" flat>
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 font-sans text-weight-bold text-teal-4">
              <q-icon name="memory" class="q-mr-xs" /> CPU & LOAD
            </div>
            <q-badge color="teal-10" text-color="teal-2" class="font-mono text-caption">
              {{ snapshot?.runtime?.cpu?.cores || 1 }} CORES
            </q-badge>
          </div>

          <div class="row items-baseline q-my-sm">
            <span class="text-h4 text-weight-bolder text-main font-mono">
              {{ snapshot?.runtime?.cpu?.processCpuPercent ?? 0 }}%
            </span>
            <span class="text-caption text-secondary q-ml-xs font-mono">process CPU</span>
          </div>

          <q-linear-progress
            :value="(snapshot?.runtime?.cpu?.processCpuPercent || 0) / 100"
            color="teal-4"
            track-color="grey-9"
            class="q-mb-sm rounded-borders"
            style="height: 6px;"
          />

          <div class="text-caption text-secondary font-mono q-mt-xs">
            <div class="row justify-between">
              <span>Load 1m:</span>
              <span class="text-main font-mono text-weight-bold">{{ snapshot?.runtime?.cpu?.loadAvg1m ?? 0 }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Load 5m / 15m:</span>
              <span class="text-main font-mono">
                {{ snapshot?.runtime?.cpu?.loadAvg5m ?? 0 }} / {{ snapshot?.runtime?.cpu?.loadAvg15m ?? 0 }}
              </span>
            </div>
            <div class="text-muted ellipsis q-mt-xs" style="font-size: 10px;">
              {{ snapshot?.runtime?.cpu?.model || 'Generic Processor' }}
            </div>
          </div>
        </q-card>
      </div>

      <!-- Memory Vitals Card -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="bg-panel border-main fit q-pa-md" flat>
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 font-sans text-weight-bold text-cyan-4">
              <q-icon name="speed" class="q-mr-xs" /> MEMORY UTILIZATION
            </div>
            <q-badge color="cyan-10" text-color="cyan-2" class="font-mono text-caption">
              RSS: {{ formatBytes(snapshot?.runtime?.memory?.processRssBytes) }}
            </q-badge>
          </div>

          <div class="row items-baseline q-my-sm">
            <span class="text-h4 text-weight-bolder text-main font-mono">
              {{ formatBytes(snapshot?.runtime?.memory?.heapUsedBytes) }}
            </span>
            <span class="text-caption text-secondary q-ml-xs font-mono">
              / {{ formatBytes(snapshot?.runtime?.memory?.heapTotalBytes) }} heap
            </span>
          </div>

          <q-linear-progress
            :value="memoryProgress"
            color="cyan-4"
            track-color="grey-9"
            class="q-mb-sm rounded-borders"
            style="height: 6px;"
          />

          <div class="text-caption text-secondary font-mono q-mt-xs">
            <div class="row justify-between">
              <span>Host Used:</span>
              <span class="text-main text-weight-bold">{{ formatBytes(snapshot?.runtime?.memory?.hostUsedBytes) }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Host Total:</span>
              <span class="text-main">{{ formatBytes(snapshot?.runtime?.memory?.hostTotalBytes) }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Host Free:</span>
              <span class="text-positive">{{ formatBytes(snapshot?.runtime?.memory?.hostFreeBytes) }}</span>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Storage / Disk Card -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="bg-panel border-main fit q-pa-md" flat>
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 font-sans text-weight-bold text-amber-4">
              <q-icon name="storage" class="q-mr-xs" /> DISK STORAGE
            </div>
            <q-badge
              :color="snapshot?.runtime?.disk?.status === 'available' ? 'amber-10' : 'grey-8'"
              :text-color="snapshot?.runtime?.disk?.status === 'available' ? 'amber-2' : 'grey-4'"
              class="font-mono text-caption"
            >
              {{ (snapshot?.runtime?.disk?.status || 'available').toUpperCase() }}
            </q-badge>
          </div>

          <div class="row items-baseline q-my-sm">
            <span class="text-h4 text-weight-bolder text-main font-mono">
              {{ snapshot?.runtime?.disk?.usedPercentage ?? 0 }}%
            </span>
            <span class="text-caption text-secondary q-ml-xs font-mono">utilized</span>
          </div>

          <q-linear-progress
            :value="(snapshot?.runtime?.disk?.usedPercentage || 0) / 100"
            color="amber-4"
            track-color="grey-9"
            class="q-mb-sm rounded-borders"
            style="height: 6px;"
          />

          <div class="text-caption text-secondary font-mono q-mt-xs">
            <div class="row justify-between">
              <span>Total Volume:</span>
              <span class="text-main font-mono">{{ formatBytes(snapshot?.runtime?.disk?.totalBytes) }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Used Space:</span>
              <span class="text-main font-mono text-weight-bold">{{ formatBytes(snapshot?.runtime?.disk?.usedBytes) }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Free Space:</span>
              <span class="text-positive font-mono">{{ formatBytes(snapshot?.runtime?.disk?.freeBytes) }}</span>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Runtime Platform Card -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="bg-panel border-main fit q-pa-md" flat>
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 font-sans text-weight-bold text-purple-4">
              <q-icon name="terminal" class="q-mr-xs" /> NODE RUNTIME
            </div>
            <q-badge color="purple-10" text-color="purple-2" class="font-mono text-caption">
              {{ snapshot?.runtime?.nodeVersion || 'Node.js' }}
            </q-badge>
          </div>

          <div class="row items-baseline q-my-sm">
            <span class="text-h4 text-weight-bolder text-main font-mono">
              PID {{ snapshot?.runtime?.pid || '—' }}
            </span>
            <span class="text-caption text-secondary q-ml-xs font-mono">active process</span>
          </div>

          <div class="text-caption text-secondary font-mono q-mt-md">
            <div class="row justify-between">
              <span>Target Env:</span>
              <span class="text-weight-bold text-positive font-mono">{{ snapshot?.environment || 'STAGING' }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Systemd Unit:</span>
              <span class="text-main ellipsis" style="max-width: 150px;">{{ snapshot?.hostDiagnostics?.systemdService || 'invify-staging-backend' }}</span>
            </div>
            <div class="row justify-between q-mt-xs">
              <span>Boot Timestamp:</span>
              <span class="text-main font-mono" style="font-size: 10px;">{{ formatIsoShort(snapshot?.release?.bootTimestamp) }}</span>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 4. TRAFFIC & AUTHENTICATION ROW            -->
    <!-- ========================================== -->
    <div class="row q-col-gutter-md q-mb-md">
      <!-- Traffic Telemetry Card -->
      <div class="col-12 col-lg-6">
        <q-card class="bg-panel border-main fit q-pa-md" flat>
          <div class="row justify-between items-center q-mb-md">
            <div class="text-subtitle2 font-sans text-weight-bold text-indigo-4">
              <q-icon name="traffic" class="q-mr-xs" /> HTTP TRAFFIC TELEMETRY
            </div>
            <q-badge color="indigo-10" text-color="indigo-2" class="font-mono text-caption">
              LAST {{ snapshot?.traffic?.windowMinutes || 15 }} MINS WINDOW
            </q-badge>
          </div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6 col-sm-3">
              <div class="text-caption text-secondary font-mono">Total Requests</div>
              <div class="text-h5 text-weight-bold text-main font-mono">{{ snapshot?.traffic?.totalRequests ?? 0 }}</div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="text-caption text-secondary font-mono">Throughput</div>
              <div class="text-h5 text-weight-bold text-teal-4 font-mono">{{ snapshot?.traffic?.requestsPerSecond ?? 0 }} req/s</div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="text-caption text-secondary font-mono">p50 Latency</div>
              <div class="text-h5 text-weight-bold text-positive font-mono">{{ snapshot?.traffic?.latency?.p50Ms ?? 0 }} ms</div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="text-caption text-secondary font-mono">p99 Latency</div>
              <div class="text-h5 text-weight-bold text-amber-4 font-mono">{{ snapshot?.traffic?.latency?.p99Ms ?? 0 }} ms</div>
            </div>
          </div>

          <!-- HTTP Status Distribution Bars -->
          <div class="text-caption text-secondary font-mono q-mb-xs">Status Distribution:</div>
          <div class="row q-col-gutter-sm text-caption font-mono">
            <div class="col-3">
              <div class="bg-dark q-pa-xs rounded-borders text-center border-main">
                <span class="text-positive text-weight-bold">2xx:</span> {{ snapshot?.traffic?.statusDistribution?.['2xx'] ?? 0 }}
              </div>
            </div>
            <div class="col-3">
              <div class="bg-dark q-pa-xs rounded-borders text-center border-main">
                <span class="text-cyan-4 text-weight-bold">3xx:</span> {{ snapshot?.traffic?.statusDistribution?.['3xx'] ?? 0 }}
              </div>
            </div>
            <div class="col-3">
              <div class="bg-dark q-pa-xs rounded-borders text-center border-main">
                <span class="text-amber-4 text-weight-bold">4xx:</span> {{ snapshot?.traffic?.statusDistribution?.['4xx'] ?? 0 }}
              </div>
            </div>
            <div class="col-3">
              <div class="bg-dark q-pa-xs rounded-borders text-center border-main">
                <span class="text-negative text-weight-bold">5xx:</span> {{ snapshot?.traffic?.statusDistribution?.['5xx'] ?? 0 }}
              </div>
            </div>
          </div>

          <!-- Recent HTTP Errors Table (Sanitized) -->
          <div v-if="snapshot?.traffic?.recentHttpErrors?.length > 0" class="q-mt-md">
            <div class="text-caption text-negative font-mono q-mb-xs">Recent 4xx / 5xx Errors:</div>
            <div class="bg-dark rounded-borders q-pa-xs border-main" style="max-height: 100px; overflow-y: auto;">
              <div
                v-for="(err, idx) in snapshot.traffic.recentHttpErrors.slice(0, 5)"
                :key="idx"
                class="row justify-between text-caption font-mono q-py-xs border-bottom-subtle"
                style="font-size: 10px;"
              >
                <span class="text-negative text-weight-bold">{{ err.method }} {{ err.path }}</span>
                <span class="text-secondary">{{ err.statusCode }} ({{ err.latencyMs }}ms)</span>
              </div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Authentication Activity Card -->
      <div class="col-12 col-lg-6">
        <q-card class="bg-panel border-main fit q-pa-md" flat>
          <div class="row justify-between items-center q-mb-md">
            <div class="text-subtitle2 font-sans text-weight-bold text-amber-4">
              <q-icon name="security" class="q-mr-xs" /> AUTHENTICATION & SESSION METRICS
            </div>
            <q-badge color="grey-9" text-color="grey-4" class="font-mono text-caption">
              IN-PROCESS TELEMETRY
            </q-badge>
          </div>

          <div class="row q-col-gutter-sm text-caption font-mono">
            <div class="col-6 col-sm-4">
              <div class="bg-dark q-pa-sm rounded-borders border-main">
                <div class="text-secondary">Logins Success</div>
                <div class="text-h6 text-weight-bold text-positive font-mono">
                  {{ snapshot?.authActivity?.loginsSuccess ?? 0 }}
                </div>
              </div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="bg-dark q-pa-sm rounded-borders border-main">
                <div class="text-secondary">Logins Failed</div>
                <div class="text-h6 text-weight-bold text-negative font-mono">
                  {{ snapshot?.authActivity?.loginsFailed ?? 0 }}
                </div>
              </div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="bg-dark q-pa-sm rounded-borders border-main">
                <div class="text-secondary">MFA Challenges</div>
                <div class="text-h6 text-weight-bold text-cyan-4 font-mono">
                  {{ snapshot?.authActivity?.mfaChallengesIssued ?? 0 }}
                </div>
              </div>
            </div>
            <div class="col-6 col-sm-4 q-mt-sm">
              <div class="bg-dark q-pa-sm rounded-borders border-main">
                <div class="text-secondary">MFA Passed</div>
                <div class="text-h6 text-weight-bold text-positive font-mono">
                  {{ snapshot?.authActivity?.mfaChallengesPassed ?? 0 }}
                </div>
              </div>
            </div>
            <div class="col-6 col-sm-4 q-mt-sm">
              <div class="bg-dark q-pa-sm rounded-borders border-main">
                <div class="text-secondary">MFA Failed</div>
                <div class="text-h6 text-weight-bold text-negative font-mono">
                  {{ snapshot?.authActivity?.mfaChallengesFailed ?? 0 }}
                </div>
              </div>
            </div>
            <div class="col-6 col-sm-4 q-mt-sm">
              <div class="bg-dark q-pa-sm rounded-borders border-main">
                <div class="text-secondary">Token Refreshes</div>
                <div class="text-h6 text-weight-bold text-main font-mono">
                  {{ snapshot?.authActivity?.tokenRefreshes ?? 0 }}
                </div>
              </div>
            </div>
          </div>

          <div class="text-muted font-mono text-caption q-mt-md" style="font-size: 10px;">
            <q-icon name="lock" size="12px" class="q-mr-xs text-positive" />
            Zero credential storage: User emails, passwords, JWT secrets, and MFA codes are never retained in memory.
          </div>
        </q-card>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 5. RELEASE & DEPLOYMENT METADATA           -->
    <!-- ========================================== -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12">
        <q-card class="bg-panel border-main q-pa-md" flat>
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 font-sans text-weight-bold text-main">
              <q-icon name="info" class="q-mr-xs text-primary" /> RELEASE & DEPLOYMENT IDENTIFIERS (READ-ONLY)
            </div>
            <q-badge color="grey-9" text-color="grey-4" class="font-mono text-caption">
              DIAGNOSTIC TOOL: {{ snapshot?.hostDiagnostics?.cliDiagnosticTool || 'scripts/staging-realtime-monitor.sh' }}
            </q-badge>
          </div>

          <div class="row q-col-gutter-md font-mono text-caption text-secondary">
            <div class="col-12 col-sm-6 col-md-3">
              <div>Environment: <span class="text-main text-weight-bold">{{ snapshot?.release?.appEnv || 'staging' }}</span></div>
              <div class="q-mt-xs">Build Variant: <span class="text-main">{{ snapshot?.release?.buildVariant || 'STANDALONE_HYBRID' }}</span></div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div>App Version: <span class="text-main text-weight-bold">v{{ snapshot?.release?.appVersion || '1.0.0' }}</span></div>
              <div class="q-mt-xs">Git Commit: <span class="text-cyan-3">{{ snapshot?.release?.gitCommit || 'staging-head' }}</span></div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div>Release ID: <span class="text-main">{{ snapshot?.release?.releaseId || '—' }}</span></div>
              <div class="q-mt-xs">Host Service: <span class="text-positive">{{ snapshot?.hostDiagnostics?.systemdService || 'invify-staging-backend.service' }}</span></div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div>Service State: <span class="text-main">{{ snapshot?.hostDiagnostics?.systemctlState || 'managed_by_cli_monitor' }}</span></div>
              <div class="q-mt-xs">Nginx State: <span class="text-main">{{ snapshot?.hostDiagnostics?.nginxService || 'managed_by_cli_monitor' }}</span></div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 6. LIVE SANITIZED LOG CONSOLE              -->
    <!-- ========================================== -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="bg-black border-main q-pa-md shadow-lg" flat style="border-radius: 8px;">
          <!-- Console Toolbar -->
          <div class="row justify-between items-center q-mb-sm border-bottom-subtle q-pb-sm">
            <div class="row items-center q-gutter-sm">
              <q-icon name="receipt_long" size="20px" color="cyan-4" />
              <span class="text-subtitle2 font-mono text-weight-bold text-white">
                LIVE APPLICATION LOGS
              </span>
              <q-badge color="grey-9" text-color="cyan-3" class="font-mono text-caption">
                {{ filteredLogs.length }} / {{ logs.length }} ENTRIES
              </q-badge>
              <q-badge v-if="isPaused" color="amber-10" text-color="amber-2" class="font-mono text-caption">
                PAUSED
              </q-badge>
            </div>

            <!-- Severity Filter Tabs & Search -->
            <div class="row items-center q-gutter-sm">
              <!-- Severity Filter Buttons -->
              <q-btn-toggle
                v-model="selectedSeverity"
                dense
                rounded
                unelevated
                toggle-color="primary"
                color="grey-9"
                text-color="grey-4"
                class="font-mono text-caption"
                :options="[
                  { label: 'ALL', value: 'ALL' },
                  { label: 'INFO', value: 'INFO' },
                  { label: 'WARN', value: 'WARN' },
                  { label: 'ERROR', value: 'ERROR' }
                ]"
              />

              <!-- Log Search Field -->
              <q-input
                v-model="searchQuery"
                dense
                outlined
                dark
                placeholder="Search logs..."
                class="font-mono"
                style="width: 220px; font-size: 11px;"
              >
                <template v-slot:append>
                  <q-icon
                    v-if="searchQuery"
                    name="close"
                    class="cursor-pointer"
                    size="14px"
                    @click="clearSearch"
                  />
                  <q-icon v-else name="search" size="14px" />
                </template>
              </q-input>

              <!-- Copy All Filtered Logs Button -->
              <q-btn
                flat
                dense
                round
                color="grey-4"
                icon="content_copy"
                size="sm"
                @click="copyAllFilteredLogs"
              >
                <q-tooltip>Copy all displayed logs to clipboard</q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- Log Content Area -->
          <div
            ref="logContainerRef"
            class="font-mono q-pa-sm"
            style="height: 380px; overflow-y: auto; background-color: #0d1117; border-radius: 4px;"
            @scroll="onUserScroll"
          >
            <!-- Empty State -->
            <div v-if="filteredLogs.length === 0" class="column items-center justify-center full-height text-grey-6 q-pa-lg">
              <q-icon name="playlist_remove" size="36px" />
              <div class="q-mt-xs text-caption">No log records matching filter parameters.</div>
            </div>

            <!-- Log Entries List -->
            <div
              v-for="log in filteredLogs"
              :key="log.id"
              class="row items-start no-wrap q-py-xs log-line hover-highlight"
            >
              <!-- Timestamp -->
              <span class="text-grey-6 q-mr-sm text-no-wrap" style="font-size: 11px;">
                {{ formatLogTimestamp(log.timestamp) }}
              </span>

              <!-- Level Badge -->
              <q-badge
                :color="logBadgeColor(log.level)"
                text-color="black"
                class="text-weight-bolder text-no-wrap q-mr-sm"
                style="font-size: 9px; padding: 1px 4px;"
              >
                {{ log.level }}
              </q-badge>

              <!-- Source Tag -->
              <span class="text-purple-4 q-mr-sm text-no-wrap" style="font-size: 10px;">
                [{{ log.source }}]
              </span>

              <!-- Sanitized Message Body -->
              <span
                class="col text-break text-grey-3"
                :class="{
                  'text-negative': log.level === 'ERROR',
                  'text-amber-3': log.level === 'WARN',
                  'text-grey-3': log.level === 'INFO',
                }"
                style="font-size: 11px; word-break: break-all;"
              >
                {{ log.message }}
              </span>

              <!-- Copy single row button -->
              <q-btn
                flat
                dense
                round
                color="grey-6"
                icon="copy_all"
                size="xs"
                class="log-copy-btn q-ml-xs"
                @click.stop="copySingleLog(log.message)"
              >
                <q-tooltip>Copy line</q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- Console Footer -->
          <div class="row justify-between items-center text-caption font-mono text-grey-6 q-mt-xs" style="font-size: 10px;">
            <span>Server-side Sanitization: Active (JWT, passwords, tokens redacted prior to memory store)</span>
            <span v-if="autoScrollEnabled" class="text-teal-4">● Auto-scroll: LOCKED TO LATEST</span>
            <span v-else class="text-amber-4 cursor-pointer" @click="scrollToTop">▲ Scroll unpinned (click to jump to newest)</span>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useObservability } from '../../composables/useObservability';

const $q = useQuasar();

const {
  snapshot,
  logs,
  filteredLogs,
  connectionState,
  backendState,
  isPaused,
  lastTelemetryUpdate,
  isLoading,
  errorMessage,
  selectedSeverity,
  searchQuery,
  pause,
  resume,
  refresh,
  clearSearch,
  copyText,
} = useObservability();

const logContainerRef = ref(null);
const autoScrollEnabled = ref(true);

// Memory progress percentage calculation
const memoryProgress = computed(() => {
  const mem = snapshot.value?.runtime?.memory;
  if (!mem || !mem.heapTotalBytes) return 0;
  return Math.min(1, mem.heapUsedBytes / mem.heapTotalBytes);
});

// Connection state styling
const connectionBadgeColor = computed(() => {
  switch (connectionState.value) {
    case 'LIVE':
      return 'green-10';
    case 'RECONNECTING':
      return 'amber-10';
    default:
      return 'red-10';
  }
});

const connectionTextColor = computed(() => {
  switch (connectionState.value) {
    case 'LIVE':
      return 'green-2';
    case 'RECONNECTING':
      return 'amber-2';
    default:
      return 'red-2';
  }
});

// Backend state styling
const backendBadgeColor = computed(() => {
  switch (backendState.value) {
    case 'ACTIVE':
      return 'green-10';
    case 'DEGRADED':
      return 'amber-10';
    default:
      return 'red-10';
  }
});

const backendTextColor = computed(() => {
  switch (backendState.value) {
    case 'ACTIVE':
      return 'green-2';
    case 'DEGRADED':
      return 'amber-2';
    default:
      return 'red-2';
  }
});

function logBadgeColor(level) {
  switch (String(level || '').toUpperCase()) {
    case 'ERROR':
      return 'red-5';
    case 'WARN':
      return 'amber-5';
    case 'INFO':
    default:
      return 'cyan-4';
  }
}

function formatBytes(bytes) {
  const num = Number(bytes);
  if (!num || isNaN(num) || num <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  return `${(num / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  const sec = Number(seconds);
  if (!sec || isNaN(sec) || sec <= 0) return '0s';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatIsoShort(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString();
  } catch {
    return '—';
  }
}

function formatLogTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toISOString().slice(11, 23);
  } catch {
    return String(isoString).slice(0, 12);
  }
}

function onUserScroll(e) {
  const target = e.target;
  if (!target) return;
  // If user scrolls away from top (where newest items are prepended)
  autoScrollEnabled.value = target.scrollTop <= 30;
}

function scrollToTop() {
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = 0;
    autoScrollEnabled.value = true;
  }
}

// Auto-scroll when new logs arrive if auto-scroll is enabled
watch(
  () => logs.value.length,
  () => {
    if (autoScrollEnabled.value && !isPaused.value) {
      nextTick(() => {
        if (logContainerRef.value) {
          logContainerRef.value.scrollTop = 0;
        }
      });
    }
  }
);

async function copySingleLog(text) {
  const success = await copyText(text);
  if (success) {
    $q.notify({
      type: 'positive',
      message: 'Sanitized log copied to clipboard',
      timeout: 1500,
    });
  }
}

async function copyAllFilteredLogs() {
  const text = filteredLogs.value
    .map((l) => `[${formatLogTimestamp(l.timestamp)}] [${l.level}] [${l.source}] ${l.message}`)
    .join('\n');
  const success = await copyText(text);
  if (success) {
    $q.notify({
      type: 'positive',
      message: `${filteredLogs.value.length} sanitized log lines copied`,
      timeout: 2000,
    });
  }
}
</script>

<style scoped>
.command-center-page {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.border-main {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.border-bottom-subtle {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.log-line {
  line-height: 1.4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.hover-highlight:hover {
  background-color: rgba(255, 255, 255, 0.04);
}
.log-copy-btn {
  opacity: 0;
  transition: opacity 0.2s;
}
.hover-highlight:hover .log-copy-btn {
  opacity: 1;
}
</style>
