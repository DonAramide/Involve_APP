<!-- invify-admin/src/components/commands/CommandExecutionMonitor.vue -->
<template>
  <div class="enterprise-panel full-width bg-panel">
    <!-- Command Interface Header Bar -->
    <div class="enterprise-subpanel q-pa-sm row items-center justify-between no-wrap border-bottom">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="terminal" color="indigo-4" size="xs" />
        <div class="text-operator-title text-main text-weight-bold">Stateful Command Execution Monitor</div>
        <q-badge color="blue-grey-9" text-color="grey-4" class="text-metric-sm">
          Active Pipeline: <span class="text-cyan-3 q-ml-xs">{{ activeCommands.length }}</span>
        </q-badge>
      </div>

      <!-- Quick Dispatch Commands Dropdown -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn-dropdown 
          dense 
          flat 
          size="sm" 
          color="cyan-4" 
          icon="add_circle" 
          label="DISPATCH ACTION" 
          class="text-caption text-weight-bold"
        >
          <q-list class="bg-subpanel text-main text-caption border-main" style="min-width: 220px;">
            <q-item-label header class="text-operator-title text-muted q-py-xs">OTA & Fleet Targets</q-item-label>
            <q-item clickable v-close-popup @click="dispatchCommand('OTA Deployment Trigger', 'fleet')">
              <q-item-section avatar><q-icon name="system_update_alt" size="xs" color="cyan-3" /></q-item-section>
              <q-item-section><q-item-label class="text-metric-sm text-main">OTA Package Rollout</q-item-label></q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="dispatchCommand('Remote Device Action', 'device')">
              <q-item-section avatar><q-icon name="power_settings_new" size="xs" color="amber-4" /></q-item-section>
              <q-item-section><q-item-label class="text-metric-sm text-main">Remote Fleet Restart</q-item-label></q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="dispatchCommand('Quarantine Action', 'security')">
              <q-item-section avatar><q-icon name="gpp_bad" size="xs" color="red-4" /></q-item-section>
              <q-item-section><q-item-label class="text-metric-sm text-main">Quarantine Target Endpoint</q-item-label></q-item-section>
            </q-item>
            <q-separator class="bg-main" />
            <q-item-label header class="text-operator-title text-muted q-py-xs">Governance & Policies</q-item-label>
            <q-item clickable v-close-popup @click="dispatchCommand('Policy Push Operation', 'governance')">
              <q-item-section avatar><q-icon name="policy" size="xs" color="indigo-3" /></q-item-section>
              <q-item-section><q-item-label class="text-metric-sm text-main">Push Auth Security Drift Patch</q-item-label></q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="dispatchCommand('Rollout Approval', 'governance')">
              <q-item-section avatar><q-icon name="fact_check" size="xs" color="green-4" /></q-item-section>
              <q-item-section><q-item-label class="text-metric-sm text-main">Approve Pending VA Batch</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn 
          flat 
          dense 
          size="xs" 
          color="grey-5" 
          label="Clear Audits" 
          @click="clearCompleted" 
          v-if="commands.length > 0"
        />
      </div>
    </div>

    <!-- Active Execution & Audit Timeline Logs -->
    <div class="q-pa-sm" style="max-height: 320px; overflow-y: auto;">
      <div v-if="commands.length === 0" class="text-center q-pa-lg text-muted text-caption italic">
        No stateful operations actively dispatched. Trigger actions via the command dispatch menu above.
      </div>

      <div class="q-gutter-y-xs">
        <div 
          v-for="cmd in commands" 
          :key="cmd.id" 
          class="enterprise-subpanel q-pa-xs q-px-sm row items-center justify-between no-wrap"
          :class="getCommandBorderClass(cmd.state)"
        >
          <!-- Left Columns: Target Context, Timestamp, Attribution -->
          <div class="row items-center op-gap-12 no-wrap col-grow overflow-hidden">
            <!-- Deterministic Status State Indicator Badge -->
            <div style="width: 105px;" class="no-wrap">
              <q-chip 
                dense 
                size="xs" 
                class="full-width q-ma-none no-wrap justify-start"
                :color="getStateChipColor(cmd.state)" 
                text-color="white"
              >
                <q-spinner-tail size="xs" class="q-mr-xs" v-if="cmd.state === 'executing' || cmd.state === 'retrying'" />
                <span class="live-indicator-dot q-mr-xs" :class="getStateDotPulse(cmd.state)" v-else></span>
                <span class="text-metric-sm text-weight-bold">{{ cmd.state.toUpperCase() }}</span>
              </q-chip>
            </div>

            <!-- Command Identifier & Operator Trace string -->
            <div class="col-auto no-wrap overflow-hidden ellipsis">
              <div class="text-main text-weight-medium text-caption no-wrap ellipsis">{{ cmd.action }}</div>
              <div class="row items-center op-gap-8 text-muted" style="font-size: 10px;">
                <span class="text-metric-mono">{{ cmd.targetId }}</span>
                <span>•</span>
                <span class="text-cyan-5">Attribution: {{ cmd.operator }}</span>
              </div>
            </div>
          </div>

          <!-- Right Columns: Execution Latency strings & Action Re-Triggers -->
          <div class="row items-center op-gap-8 no-wrap col-auto q-pl-sm">
            <div class="text-right v-hide-xs">
              <div class="text-metric-mono text-secondary" style="font-size: 11px;">{{ cmd.latency }}ms</div>
              <div class="text-muted" style="font-size: 9px;">{{ new Date(cmd.timestamp).toLocaleTimeString() }}</div>
            </div>

            <!-- Manual Operator Retry Trigger if execution enters 'failed' -->
            <q-btn 
              v-if="cmd.state === 'failed'" 
              dense 
              flat 
              size="xs" 
              color="amber" 
              icon="refresh" 
              label="RETRY" 
              @click="retryCommand(cmd)" 
              class="text-caption text-weight-bold"
            />
            
            <q-icon 
              name="check_circle" 
              color="green-5" 
              size="xs" 
              v-else-if="cmd.state === 'succeeded'" 
            />
            
            <q-icon 
              name="hourglass_empty" 
              color="grey-6" 
              size="xs" 
              v-else 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Deterministic Stateful Timeline States: 'queued' -> 'acknowledged' -> 'executing' -> 'succeeded' | 'failed' -> 'retrying'
const commands = ref([
  {
    id: 'cmd-init-1',
    action: 'OTA Deployment Trigger',
    targetId: 'target-fleet-us-east',
    state: 'succeeded',
    operator: 'sysadmin@invify.org',
    timestamp: Date.now() - 45000,
    latency: 340
  },
  {
    id: 'cmd-init-2',
    action: 'Policy Push Operation',
    targetId: 'tenant-anchor-global',
    state: 'succeeded',
    operator: 'operator-1@invify.org',
    timestamp: Date.now() - 120000,
    latency: 185
  }
])

const activeCommands = computed(() => {
  return commands.value.filter(c => c.state === 'queued' || c.state === 'acknowledged' || c.state === 'executing' || c.state === 'retrying')
})

// Dispatch new operational commands executing step progression cycles
const dispatchCommand = (action, domain) => {
  const newCmd = {
    id: `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: action,
    targetId: `${domain}-target-${Math.floor(Math.random() * 8999 + 1000)}`,
    state: 'queued',
    operator: 'active_session@invify.org',
    timestamp: Date.now(),
    latency: 0
  }
  
  // Add to top of stack
  commands.value.unshift(newCmd)
  
  // Simulate explicit server-side state confirmation events
  simulateTimelineProgression(newCmd)
}

const simulateTimelineProgression = (cmd) => {
  // Step 1: queued -> acknowledged
  setTimeout(() => {
    if (cmd.state !== 'queued') return
    cmd.state = 'acknowledged'
    cmd.latency += 45
    
    // Step 2: acknowledged -> executing
    setTimeout(() => {
      if (cmd.state !== 'acknowledged') return
      cmd.state = 'executing'
      cmd.latency += 120
      
      // Step 3: executing -> succeeded / failed deterministic logic
      setTimeout(() => {
        if (cmd.state !== 'executing') return
        // 85% success probability simulation
        const success = Math.random() > 0.15
        cmd.state = success ? 'succeeded' : 'failed'
        cmd.latency += Math.floor(Math.random() * 400 + 200)
      }, 2000)
    }, 800)
  }, 600)
}

const retryCommand = (cmd) => {
  cmd.state = 'retrying'
  cmd.latency = 0
  cmd.timestamp = Date.now()
  
  // Step: retrying -> executing -> succeeded
  setTimeout(() => {
    cmd.state = 'executing'
    cmd.latency += 90
    setTimeout(() => {
      cmd.state = 'succeeded'
      cmd.latency += 310
    }, 1500)
  }, 800)
}

const clearCompleted = () => {
  commands.value = commands.value.filter(c => c.state !== 'succeeded' && c.state !== 'failed')
}

// Visual layout status tokens mappings
const getStateChipColor = (state) => {
  if (state === 'queued') return 'blue-grey-9'
  if (state === 'acknowledged') return 'cyan-10'
  if (state === 'executing') return 'indigo-9'
  if (state === 'succeeded') return 'green-10'
  if (state === 'failed') return 'red-10'
  if (state === 'retrying') return 'amber-10'
  return 'grey-9'
}

const getStateDotPulse = (state) => {
  if (state === 'succeeded') return 'pulse-healthy'
  if (state === 'failed') return 'pulse-critical'
  return ''
}

const getCommandBorderClass = (state) => {
  if (state === 'executing' || state === 'retrying') return 'border-indigo'
  if (state === 'failed') return 'border-red'
  return ''
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-indigo { border-left: 2px solid #7048e8 !important; }
.border-red { border-left: 2px solid #c92a2a !important; }
@media (max-width: 400px) {
  .v-hide-xs { display: none; }
}
</style>
