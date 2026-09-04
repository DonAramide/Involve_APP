<template>
  <q-page class="q-pa-lg bg-main text-main font-mono command-center-page" style="min-height: 100vh;">
    <!-- HEADER -->
    <div class="row items-center justify-between q-mb-lg border-main q-pa-md rounded-borders bg-panel shadow-sm">
      <div class="column">
        <h1 class="text-h4 text-weight-bolder text-main q-ma-none font-sans">
          WebSocket Gateway Health
        </h1>
        <div class="text-caption text-secondary q-mt-xs">
          InvifyRealtimeGateway V1 WebSockets Stream Telemetry
        </div>
      </div>
      
      <div class="row items-center q-gutter-md">
        <div class="column items-end text-right">
          <q-badge color="green-9" text-color="green-2" label="GATEWAY CONNECTED" class="text-weight-bold" />
          <div class="text-caption text-secondary q-mt-xs" style="font-size: 11px;">
            Port: <span :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'" class="text-weight-bold">3004 / WS</span>
          </div>
        </div>
      </div>
    </div>

    <!-- METRICS GRID -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- 1. Gateway Status -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'">
            <q-icon name="router" /> Gateway Status
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Server URL:</span>
            <span class="text-weight-bold text-main">Configured runtime endpoint</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Uptime:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-green-4' : 'text-positive'">99.98%</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">SSL Status:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-green-4' : 'text-positive'">ENABLED</span>
          </div>
        </q-card>
      </div>

      <!-- 2. Socket Connection Info -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">
            <q-icon name="link" /> Connections & Streams
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Active Connections:</span>
            <span class="text-weight-bold text-main">42</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Subscribed Rooms:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-teal-3' : 'text-teal-8'">12</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Ping/Pong Interval:</span>
            <span class="text-weight-bold text-main">30s</span>
          </div>
        </q-card>
      </div>

      <!-- 3. Network Latency -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">
            <q-icon name="flash_on" /> Latency Profiler
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">P50 Latency:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-green-4' : 'text-positive'">8 ms</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">P99 Latency:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">42 ms</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Packet Loss Rate:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-green-4' : 'text-positive'">0.00%</span>
          </div>
        </q-card>
      </div>
    </div>

    <!-- TIMELINE AND ACTIONS -->
    <div class="row q-col-gutter-md">
      <!-- LIVE CHANNEL SUBSCRIPTIONS -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column shadow-sm" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-md font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'">
            <q-icon name="rss_feed" /> Active Channels Registry
          </div>
          <q-list class="bg-subpanel rounded-borders q-pa-sm border-main" dense :dark="prefs.isDarkMode">
            <q-item>
              <q-item-section>
                <span class="text-weight-medium" :class="prefs.isDarkMode ? 'text-green-3' : 'text-green-9'">channel:realtime:events</span>
              </q-item-section>
              <q-item-section side>
                <q-badge color="teal-9" text-color="white">ACTIVE</q-badge>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <span class="text-weight-medium" :class="prefs.isDarkMode ? 'text-green-3' : 'text-green-9'">channel:onboarding:telemetry</span>
              </q-item-section>
              <q-item-section side>
                <q-badge color="teal-9" text-color="white">ACTIVE</q-badge>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <span class="text-weight-medium" :class="prefs.isDarkMode ? 'text-green-3' : 'text-green-9'">channel:pos:routing</span>
              </q-item-section>
              <q-item-section side>
                <q-badge color="teal-9" text-color="white">ACTIVE</q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- WS TERMINAL TIMELINE -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column shadow-sm" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-md font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">
            <q-icon name="list_alt" /> Live WebSocket Timeline
          </div>
          <q-scroll-area class="col bg-subpanel rounded-borders q-pa-sm border-main" :dark="prefs.isDarkMode" style="height: 250px;">
            <div class="text-caption q-mb-xs">
              <span class="text-secondary">[12:15:01]</span> <span :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'">ws_conn_init: Client handshaking initialized</span>
            </div>
            <div class="text-caption q-mb-xs">
              <span class="text-secondary">[12:15:02]</span> <span :class="prefs.isDarkMode ? 'text-green-4' : 'text-positive'">ws_conn_established: Handshake complete, connection ID glc_ws_84f93</span>
            </div>
            <div class="text-caption q-mb-xs">
              <span class="text-secondary">[12:15:32]</span> <span class="text-muted">ws_ping_pong: RTT = 12ms</span>
            </div>
          </q-scroll-area>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useOperatorPreferences } from '../../composables/useOperatorPreferences';

const { prefs } = useOperatorPreferences();
</script>

<style scoped>
.hover-lift:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease-in-out;
}
</style>
