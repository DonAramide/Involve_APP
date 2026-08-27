<template>
  <q-page class="q-pa-lg bg-dark text-white font-mono command-center-page" style="min-height: 100vh;">
    <!-- HEADER -->
    <div class="row items-center justify-between q-mb-lg border-main q-pa-md rounded-borders bg-panel">
      <div class="column">
        <h1 class="text-h4 text-weight-bolder text-white q-ma-none font-sans">
          WebSocket Gateway Health
        </h1>
        <div class="text-caption text-grey-5 q-mt-xs">
          InvifyRealtimeGateway V1 WebSockets Stream Telemetry
        </div>
      </div>
      
      <div class="row items-center q-gutter-md">
        <div class="column items-end text-right">
          <q-badge color="green-9" text-color="green-2" label="GATEWAY CONNECTED" class="text-weight-bold" />
          <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 11px;">
            Port: <span class="text-cyan-3">3004 / WS</span>
          </div>
        </div>
      </div>
    </div>

    <!-- METRICS GRID -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- 1. Gateway Status -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-cyan-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="router" /> Gateway Status
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Server URL:</span>
            <span class="text-weight-bold text-white">Configured runtime endpoint</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Uptime:</span>
            <span class="text-weight-bold text-green-4">99.98%</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>SSL Status:</span>
            <span class="text-weight-bold text-green-4">ENABLED</span>
          </div>
        </q-card>
      </div>

      <!-- 2. Socket Connection Info -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-purple-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="link" /> Connections & Streams
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Active Connections:</span>
            <span class="text-weight-bold text-white">42</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Subscribed Rooms:</span>
            <span class="text-weight-bold text-teal-3">12</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Ping/Pong Interval:</span>
            <span class="text-weight-bold text-white">30s</span>
          </div>
        </q-card>
      </div>

      <!-- 3. Network Latency -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-amber-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="flash_on" /> Latency Profiler
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>P50 Latency:</span>
            <span class="text-weight-bold text-green-4">8 ms</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>P99 Latency:</span>
            <span class="text-weight-bold text-amber-4">42 ms</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Packet Loss Rate:</span>
            <span class="text-weight-bold text-green-4">0.00%</span>
          </div>
        </q-card>
      </div>
    </div>

    <!-- TIMELINE AND ACTIONS -->
    <div class="row q-col-gutter-md">
      <!-- LIVE CHANNEL SUBSCRIPTIONS -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column">
          <div class="text-subtitle2 text-cyan-3 q-mb-md font-sans">
            <q-icon name="rss_feed" /> Active Channels Registry
          </div>
          <q-list class="bg-subpanel rounded-borders q-pa-sm" dense>
            <q-item>
              <q-item-section>
                <span class="text-green-3">channel:realtime:events</span>
              </q-item-section>
              <q-item-section side>
                <q-badge color="teal-9">ACTIVE</q-badge>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <span class="text-green-3">channel:onboarding:telemetry</span>
              </q-item-section>
              <q-item-section side>
                <q-badge color="teal-9">ACTIVE</q-badge>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <span class="text-green-3">channel:pos:routing</span>
              </q-item-section>
              <q-item-section side>
                <q-badge color="teal-9">ACTIVE</q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- WS TERMINAL TIMELINE -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column">
          <div class="text-subtitle2 text-amber-3 q-mb-md font-sans">
            <q-icon name="list_alt" /> Live WebSocket Timeline
          </div>
          <q-scroll-area class="col bg-subpanel rounded-borders q-pa-sm" style="height: 250px;">
            <div class="text-caption q-mb-xs">
              <span class="text-grey-5">[12:15:01]</span> <span class="text-cyan-3">ws_conn_init: Client handshaking initialized</span>
            </div>
            <div class="text-caption q-mb-xs">
              <span class="text-grey-5">[12:15:02]</span> <span class="text-green-4">ws_conn_established: Handshake complete, connection ID glc_ws_84f93</span>
            </div>
            <div class="text-caption q-mb-xs">
              <span class="text-grey-5">[12:15:32]</span> <span class="text-grey-4">ws_ping_pong: RTT = 12ms</span>
            </div>
          </q-scroll-area>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
</script>

<style scoped>
.border-main {
  border: 1px solid rgba(99, 102, 241, 0.25);
}
.bg-panel {
  background-color: #0b0f19;
}
.bg-subpanel {
  background-color: #05070d;
}
.hover-lift:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease-in-out;
}
</style>
