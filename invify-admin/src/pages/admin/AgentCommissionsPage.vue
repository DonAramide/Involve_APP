<template>
  <q-page class="q-pa-lg bg-main text-main command-center-page" style="min-height: 100vh;">
    
    <!-- EXECUTIVE HEADER -->
    <div class="row items-center justify-between q-mb-lg header-panel bg-panel border-main q-pa-md rounded-borders">
      <div class="column col-12 col-md-8">
        <div class="text-caption text-grey-5 font-mono">
          System Configuration > <span class="text-cyan-4 text-weight-bold">Incentive Command Center</span>
        </div>
        <h1 class="text-h4 text-weight-bolder text-white q-ma-none font-sans" style="letter-spacing: -0.5px;">
          Incentive Management Command Center
        </h1>
        <div class="text-caption text-grey-5 q-mt-xs">
          Comprehensive M7 incentive orchestration, commission plans, audit trails, and campaign spend limits.
        </div>
      </div>
      
      <div class="col-12 col-md-4 text-right justify-end flex items-center q-gap-16 mt-mobile-md">
        <div class="column items-end font-mono hide-on-mobile q-mr-sm">
          <div class="text-caption">
            Status: <q-badge color="green-9" text-color="green-2" label="ACTIVE" class="text-weight-bold" />
          </div>
          <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 11px;">
            Engine: <span class="text-cyan-3">M7-Incentive-V1.0</span>
          </div>
        </div>
        <q-btn color="indigo-7" icon="refresh" label="Sync Center" @click="syncAllData" :loading="loadingData" unelevated class="font-mono text-weight-bold" />
      </div>
    </div>

    <!-- DEGRADED CONNECTIVITY WARNING BANNER -->
    <q-banner v-if="degradedMode" rounded class="bg-red-10 text-white q-mb-lg border-critical shadow-12">
      <template v-slot:avatar>
        <q-icon name="wifi_off" color="amber-5" size="md" class="animate-pulse" />
      </template>
      <div class="text-weight-bold text-h6 font-mono">Read-Only Degraded Operational Mode</div>
      <div class="text-caption text-grey-3 font-mono q-mt-xs">
        Database connection is unavailable (Sandbox Bypass Active). Displaying cached/simulated metrics. 
        <strong>Approvals, payouts, campaign creations, and live simulator executions are disabled.</strong>
        Dry-run calculations remain functional in local browser memory.
      </div>
    </q-banner>

    <!-- NAVIGATION TABS -->
    <q-tabs
      v-model="tab"
      dense
      align="left"
      class="text-grey-5 q-mb-lg font-mono border-bottom text-weight-bold"
      active-color="cyan-4"
      indicator-color="cyan-4"
      dark
    >
      <q-tab name="defaults" label="Global Defaults" icon="settings">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Global Defaults & Overrides:</strong> Preserves the original administrative page intact. Handles default onboarding payouts, revenue share percentages, and agent-specific override lookup forms.
        </q-tooltip>
      </q-tab>
      <q-tab name="approvals" label="Approval Queue" icon="grading">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Approval Queue:</strong> Central console to review and audit pending commission payouts (onboarding rewards, transaction shares). Features real-time actions to Approve (releases funds), Reject (with reason dialogs), or trigger Reversals.
        </q-tooltip>
      </q-tab>
      <q-tab name="audit" label="Audit & History" icon="history">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Audit & History:</strong> Immutable lifecycle events log showing state transitions (PENDING -> APPROVED -> PAID), detailed transactional revenue share ledger, and historical clawback summaries.
        </q-tooltip>
      </q-tab>
      <q-tab name="progress" label="Agent Progress" icon="trending_up">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Agent Progress:</strong> Live tracker showing agent performance metrics (tenants onboarded, terminals deployed, total revenue generated, current tier, active program version, and campaign completion status).
        </q-tooltip>
      </q-tab>
      <q-tab name="plans" label="Plans & Targets" icon="assignment">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Plans & Targets:</strong> Details current commission rules, category exceptions, milestone targets (merchant thresholds vs cash bonuses), and monthly terminal placement limits.
        </q-tooltip>
      </q-tab>
      <q-tab name="budgets" label="Campaigns & Budgets" icon="campaign">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Campaigns & Budgets:</strong> Visualizes spent vs limit progress bars for active budgets, flags critical alerts (&gt;90% utilization), and lists running geo-targeted campaign incentives.
        </q-tooltip>
      </q-tab>
      <q-tab name="simulator" label="Simulator" icon="psychology">
        <q-tooltip class="bg-cyan-10 text-cyan-2 border-main text-caption q-pa-sm" style="font-family: sans-serif; max-width: 300px;">
          <strong>Simulator:</strong> Multi-factor scenario tool. Defaults to dryRun = true (calculating onboarding bounties, activation bonuses, and revenue splits in-memory without database writes). Provides an explicit "Execute Real Event" action for super admins.
        </q-tooltip>
      </q-tab>
    </q-tabs>

    <!-- TAB PANEL WORKSPACES -->
    <q-tab-panels v-model="tab" animated class="bg-transparent text-white" keep-alive>
      
      <!-- TAB 1: GLOBAL DEFAULTS & OVERRIDES -->
      <q-tab-panel name="defaults" class="q-pa-none">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-6">
            <q-card dark bordered class="bg-panel border-main fit column justify-between">
              <div>
                <q-card-section class="border-bottom q-py-md">
                  <div class="text-subtitle1 text-weight-bold text-cyan-4 flex items-center">
                    <q-icon name="settings" class="q-mr-sm" size="sm" />
                    Global Default Commission Rates
                  </div>
                  <div class="text-caption text-grey-5">Platform-wide standard settings for onboarding and profit split.</div>
                </q-card-section>
                
                <q-card-section class="q-pa-lg">
                  <div v-if="isLoadingGlobal" class="q-pa-xl flex flex-center">
                    <q-spinner-dots color="cyan" size="50px" />
                  </div>
                  <div v-else class="column q-gap-16">
                    <div class="q-mb-md">
                      <div class="text-caption text-grey-4 q-mb-xs font-mono">Default Onboarding Fee (NGN)</div>
                      <q-input 
                        v-model.number="globalSettings.globalDefaultOnboardingFee" 
                        type="number"
                        dark outlined 
                        bg-color="subpanel"
                        :prefix="currentCurrency.symbol"
                        class="font-mono text-cyan-3 custom-input"
                        dense
                        :disabled="degradedMode"
                      />
                      <div class="text-caption text-grey-6 q-mt-xs">Flat fee paid to the agent per tenant successfully onboarded.</div>
                    </div>

                    <div class="q-mb-md">
                      <div class="text-caption text-grey-4 q-mb-xs font-mono">Default RevShare Percentage (%)</div>
                      <q-input 
                        v-model.number="globalSettings.globalDefaultRevSharePercentage" 
                        type="number"
                        dark outlined 
                        bg-color="subpanel"
                        suffix="%"
                        class="font-mono text-cyan-3 custom-input"
                        dense
                        :disabled="degradedMode"
                      />
                      <div class="text-caption text-grey-6 q-mt-xs">Percentage of the platform's profit paid to the agent.</div>
                    </div>
                  </div>
                </q-card-section>
              </div>

              <q-card-actions align="right" class="border-top q-pa-md bg-dark-panel">
                <q-btn 
                  color="cyan-8" 
                  icon="save" 
                  label="Save Global Defaults" 
                  @click="saveGlobalSettings" 
                  :loading="isSavingGlobal"
                  :disabled="degradedMode"
                  class="hover-glow-btn text-weight-bold font-mono"
                  unelevated
                />
              </q-card-actions>
            </q-card>
          </div>

          <div class="col-12 col-md-6">
            <q-card dark bordered class="bg-panel border-main fit column justify-between">
              <div>
                <q-card-section class="border-bottom q-py-md">
                  <div class="text-subtitle1 text-weight-bold text-purple-4 flex items-center">
                    <q-icon name="manage_accounts" class="q-mr-sm" size="sm" />
                    Specific Agent Overrides
                  </div>
                  <div class="text-caption text-grey-5">Lookup an agent and configure custom override rates.</div>
                </q-card-section>
                
                <q-card-section class="q-pa-lg">
                  <div class="row items-center q-mb-lg">
                    <div class="col-12">
                      <div class="text-caption text-grey-4 q-mb-xs font-mono">Select or Search Agent</div>
                      <q-select
                        v-model="selectedAgentOption"
                        :options="filteredAgentOptions"
                        use-input
                        fill-input
                        hide-selected
                        input-debounce="300"
                        placeholder="Type agent code or name..."
                        dark
                        outlined
                        bg-color="subpanel"
                        option-value="id"
                        option-label="label"
                        @filter="filterAgents"
                        @update:model-value="onAgentSelected"
                        dense
                        class="font-mono text-purple-3 custom-input"
                      >
                        <template v-slot:prepend>
                          <q-icon name="search" color="purple-4" />
                        </template>
                      </q-select>
                    </div>
                  </div>

                  <div v-if="selectedAgent" class="column q-gap-16">
                    <div class="agent-info-banner q-pa-sm q-mb-md rounded-borders border-main bg-subpanel">
                      <div class="row justify-between items-center no-wrap">
                        <div>
                          <div class="text-weight-bold text-white font-mono">{{ selectedAgentName }}</div>
                          <div class="text-caption text-purple-3 font-mono" style="font-size: 11px;">Agent ID: {{ selectedAgentCode }}</div>
                        </div>
                        <q-badge color="purple-9" text-color="purple-2" class="text-weight-bold font-mono">OVERRIDE ACTIVE</q-badge>
                      </div>
                    </div>

                    <div class="q-mb-md">
                      <div class="text-caption text-grey-4 q-mb-xs font-mono">Custom Onboarding Fee (NGN)</div>
                      <q-input 
                        v-model.number="agentSettings.onboardingFee" 
                        type="number"
                        dark outlined 
                        bg-color="subpanel"
                        :prefix="currentCurrency.symbol"
                        clearable
                        class="font-mono text-purple-3 custom-input"
                        dense
                        :disabled="degradedMode"
                      />
                    </div>

                    <div class="q-mb-md">
                      <div class="text-caption text-grey-4 q-mb-xs font-mono">Custom RevShare Percentage (%)</div>
                      <q-input 
                        v-model.number="agentSettings.revSharePercentage" 
                        type="number"
                        dark outlined 
                        bg-color="subpanel"
                        suffix="%"
                        clearable
                        class="font-mono text-purple-3 custom-input"
                        dense
                        :disabled="degradedMode"
                      />
                    </div>
                  </div>
                  
                  <div v-else class="column items-center justify-center text-center q-pa-xl text-grey-6 border-dashed rounded-borders q-mt-md" style="min-height: 180px;">
                    <q-icon name="account_box" size="3rem" class="opacity-30 q-mb-sm" />
                    <div class="text-weight-bold text-grey-5 font-mono">No Agent Selected</div>
                    <div class="text-caption text-grey-6 max-width-250 q-mt-xs">
                      Choose an agent to configure custom exception rates.
                    </div>
                  </div>
                </q-card-section>
              </div>

              <q-card-actions align="right" class="border-top q-pa-md bg-dark-panel">
                <q-btn 
                  color="purple-8" 
                  icon="save" 
                  label="Save Agent Override" 
                  @click="saveAgentSettings" 
                  :loading="isSavingAgent"
                  :disabled="!selectedAgent || degradedMode"
                  class="hover-glow-btn text-weight-bold font-mono"
                  unelevated
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- TAB 2: APPROVAL QUEUE -->
      <q-tab-panel name="approvals" class="q-pa-none">
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main q-pa-sm text-center">
              <div class="text-caption text-grey-5 font-mono">Pending Tickets</div>
              <div class="text-h4 text-weight-bolder text-amber-4 font-mono">{{ approvals.filter(a => a.status === 'PENDING').length }}</div>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main q-pa-sm text-center">
              <div class="text-caption text-grey-5 font-mono">Pending Payout Amount</div>
              <div class="text-h4 text-weight-bolder text-green-4 font-mono">
                {{ currentCurrency.symbol }}{{ approvals.filter(a => a.status === 'PENDING').reduce((acc, a) => acc + a.amount, 0).toLocaleString() }}
              </div>
            </q-card>
          </div>
          <div class="col-12 col-md-4 text-right self-center">
            <q-btn color="orange-9" icon="undo" label="Trigger Clawback" @click="openClawbackDialog" :disabled="degradedMode" unelevated class="font-mono text-weight-bold q-px-lg" />
          </div>
        </div>

        <q-card dark bordered class="bg-panel border-main">
          <q-card-section class="q-pa-none">
            <q-table
              :rows="approvals"
              :columns="approvalColumns"
              row-key="id"
              flat
              dark
              class="bg-transparent"
              :loading="loadingData"
            >
              <template v-slot:body-cell-agent="props">
                <q-td :props="props">
                  <div class="text-weight-bold text-white">{{ props.row.agents ? `${props.row.agents.first_name} ${props.row.agents.last_name}` : 'N/A' }}</div>
                  <div class="text-caption text-indigo-3 font-mono">{{ props.row.agents ? props.row.agents.agent_code : 'N/A' }}</div>
                </q-td>
              </template>
              <template v-slot:body-cell-amount="props">
                <q-td :props="props" class="text-weight-bold text-green-4 font-mono">
                  {{ currentCurrency.symbol }}{{ props.row.amount.toLocaleString() }}
                </q-td>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props" class="text-center">
                  <q-chip :color="getStatusColor(props.row.status)" text-color="white" size="sm" dense class="text-weight-bold font-mono">
                    {{ props.row.status }}
                  </q-chip>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <div class="row justify-end q-gutter-xs" v-if="props.row.status === 'PENDING'">
                    <q-btn flat round dense icon="check_circle" color="green-4" @click="approveTicket(props.row.id)" :disabled="degradedMode">
                      <q-tooltip>Approve Payout</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense icon="cancel" color="red-4" @click="promptRejection(props.row.id)" :disabled="degradedMode">
                      <q-tooltip>Reject Ticket</q-tooltip>
                    </q-btn>
                  </div>
                  <div v-else class="text-caption text-grey-6 italic font-mono">LOCKED</div>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- TAB 3: AUDIT & HISTORY -->
      <q-tab-panel name="audit" class="q-pa-none">
        <div class="row q-col-gutter-lg">
          <!-- Main Audit Logs -->
          <div class="col-12 col-md-8">
            <q-card dark bordered class="bg-panel border-main">
              <q-card-section class="border-bottom q-py-sm row items-center justify-between">
                <div class="text-subtitle1 text-weight-bold text-indigo-3">Commission Lifecycle Events Log</div>
                <q-badge color="indigo-10" text-color="indigo-3" class="text-weight-bold">IMMUTABLE</q-badge>
              </q-card-section>
              <q-card-section class="q-pa-none">
                <q-table :rows="auditHistory.events" :columns="auditColumns.events" row-key="id" flat dark class="bg-transparent" dense>
                  <template v-slot:body-cell-agent="props">
                    <q-td :props="props">
                      {{ props.row.agents ? `${props.row.agents.first_name} ${props.row.agents.last_name}` : 'System' }}
                    </q-td>
                  </template>
                  <template v-slot:body-cell-amount="props">
                    <q-td :props="props" class="font-mono text-green-3">
                      {{ props.row.amount ? `${currentCurrency.symbol}${props.row.amount.toLocaleString()}` : '-' }}
                    </q-td>
                  </template>
                  <template v-slot:body-cell-states="props">
                    <q-td :props="props" class="font-mono" style="font-size: 11px;">
                      <span class="text-grey-6">{{ props.row.previous_state || 'NONE' }}</span>
                      <q-icon name="arrow_forward" size="xs" class="q-mx-xs text-grey-5" />
                      <span class="text-cyan-3 text-weight-bold">{{ props.row.new_state || 'PENDING' }}</span>
                    </q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>
          </div>

          <!-- Revenue splits & clawbacks detail -->
          <div class="col-12 col-md-4">
            <!-- RevShare Split Summary -->
            <q-card dark bordered class="bg-panel border-main q-mb-lg">
              <q-card-section class="border-bottom q-py-sm">
                <div class="text-subtitle2 text-weight-bold text-green-4">Transactional RevShare Ledger</div>
              </q-card-section>
              <q-card-section class="q-pa-none">
                <q-list dark separator class="bg-transparent" dense>
                  <q-item v-for="ld in auditHistory.revenueShareLedger" :key="ld.id">
                    <q-item-section>
                      <q-item-label class="font-mono text-white" style="font-size: 12px;">{{ ld.transaction_id }}</q-item-label>
                      <q-item-label caption class="text-grey-5">{{ ld.transaction_type }} • {{ ld.revenue_share_percentage }}% split</q-item-label>
                    </q-item-section>
                    <q-item-section side class="text-right">
                      <q-item-label class="text-green-4 font-mono text-weight-bold">+{{ currentCurrency.symbol }}{{ ld.calculated_commission.toLocaleString() }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="!auditHistory.revenueShareLedger?.length" class="text-center text-grey-6 q-pa-md">No revenue sharing items recorded.</q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Clawbacks -->
            <q-card dark bordered class="bg-panel border-main">
              <q-card-section class="border-bottom q-py-sm">
                <div class="text-subtitle2 text-weight-bold text-orange-4">Historical Reversals & Clawbacks</div>
              </q-card-section>
              <q-card-section class="q-pa-none">
                <q-list dark separator class="bg-transparent" dense>
                  <q-item v-for="cb in auditHistory.clawbacks" :key="cb.id">
                    <q-item-section>
                      <q-item-label class="text-weight-bold text-orange-3">{{ cb.reason }}</q-item-label>
                      <q-item-label caption class="text-grey-5">{{ cb.justification || 'No justification provided' }}</q-item-label>
                    </q-item-section>
                    <q-item-section side class="text-right">
                      <q-item-label class="text-red-4 font-mono text-weight-bold">-{{ currentCurrency.symbol }}{{ cb.amount.toLocaleString() }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="!auditHistory.clawbacks?.length" class="text-center text-grey-6 q-pa-md">No clawbacks recorded.</q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- TAB 4: AGENT PROGRESS -->
      <q-tab-panel name="progress" class="q-pa-none">
        <q-card dark bordered class="bg-panel border-main">
          <q-card-section class="q-pa-none">
            <q-table :rows="agentProgress" :columns="progressColumns" row-key="id" flat dark class="bg-transparent">
              <template v-slot:body-cell-agent="props">
                <q-td :props="props">
                  <div class="text-weight-bold text-white">{{ props.row.agent_name }}</div>
                  <div class="text-caption text-purple-3 font-mono">{{ props.row.agent_code }}</div>
                </q-td>
              </template>
              <template v-slot:body-cell-revenue="props">
                <q-td :props="props" class="font-mono">
                  {{ currentCurrency.symbol }}{{ props.row.revenue_generated.toLocaleString() }}
                </q-td>
              </template>
              <template v-slot:body-cell-campaign_progress="props">
                <q-td :props="props" style="min-width: 150px;">
                  <div class="row items-center no-wrap">
                    <q-linear-progress :value="props.row.campaign_progress / 100" color="purple-4" class="col q-mr-sm" size="8px" rounded />
                    <div class="text-caption text-grey-4 font-mono">{{ props.row.campaign_progress }}%</div>
                  </div>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- TAB 5: PLANS & TARGETS -->
      <q-tab-panel name="plans" class="q-pa-none">
        <div class="row q-col-gutter-lg q-mb-lg">
          <!-- Active Programs & Versions CRUD Card -->
          <div class="col-12 col-md-6">
            <q-card dark bordered class="bg-panel border-main">
              <q-card-section class="border-bottom q-py-sm row items-center justify-between">
                <div class="text-subtitle1 text-weight-bold text-cyan-4 flex items-center">
                  <q-icon name="assignment" class="q-mr-sm" />
                  Plan Configurations & Versioning
                </div>
                <div class="row q-gutter-xs">
                  <q-btn 
                    v-if="isSuperAdmin" 
                    color="cyan-9" 
                    icon="add" 
                    label="New Program" 
                    dense 
                    class="q-px-sm font-mono text-weight-bold" 
                    @click="openProgramDialog(null)" 
                    unelevated
                  />
                </div>
              </q-card-section>
              <q-card-section class="q-pa-md">
                <q-list dark separator>
                  <q-item v-for="prog in plansAndTargets.programs" :key="prog.id" class="q-py-md column items-stretch">
                    <div class="row items-center justify-between q-mb-sm">
                      <div class="text-weight-bold text-white text-subtitle1 row items-center">
                        {{ prog.name }}
                        <q-chip 
                          :color="prog.is_active ? 'green-10' : 'red-10'" 
                          text-color="white" 
                          size="xs" 
                          class="q-ml-sm text-weight-bold font-mono"
                        >
                          {{ prog.is_active ? 'ACTIVE' : 'INACTIVE' }}
                        </q-chip>
                      </div>
                      <div class="row q-gutter-xs" v-if="isSuperAdmin">
                        <q-btn flat round dense icon="edit" color="cyan-3" @click="openProgramDialog(prog)">
                          <q-tooltip>Edit Program</q-tooltip>
                        </q-btn>
                        <q-btn flat round dense icon="add_box" color="purple-3" @click="openVersionDialog(prog.id, null)">
                          <q-tooltip>New Version</q-tooltip>
                        </q-btn>
                        <q-btn flat round dense icon="delete" color="red-4" :disabled="degradedMode" @click="promptDeleteProgram(prog)">
                          <q-tooltip>Delete Program</q-tooltip>
                        </q-btn>
                      </div>
                    </div>
                    <div class="text-caption text-grey-5 q-mb-md">{{ prog.description || 'No description provided.' }}</div>

                    <!-- Version Timeline -->
                    <div class="column q-gap-8 bg-subpanel q-pa-sm rounded-borders border-main">
                      <div class="text-caption text-grey-4 font-mono row items-center q-mb-xs">
                        <q-icon name="history" class="q-mr-xs" /> Timeline Versions:
                      </div>
                      <div v-for="ver in prog.versions" :key="ver.id" class="q-py-sm border-bottom-dashed last-no-border">
                        <div class="row items-center justify-between">
                          <div class="text-weight-bold text-white font-mono">
                            v{{ ver.version_number }}
                            <q-chip 
                              :color="ver.status === 'ACTIVE' ? 'cyan-9' : ver.status === 'DEPRECATED' ? 'grey-9' : 'amber-10'" 
                              text-color="white" 
                              size="xs" 
                              class="text-weight-bold"
                            >
                              {{ ver.status }}
                            </q-chip>
                          </div>
                          <div class="row q-gutter-xs" v-if="isSuperAdmin">
                            <q-btn flat round dense icon="edit_note" color="cyan-3" @click="openRulesDialog(ver)">
                              <q-tooltip>Edit Rules</q-tooltip>
                            </q-btn>
                            <q-btn flat round dense icon="content_copy" color="purple-3" @click="cloneVersionPrompt(ver)">
                              <q-tooltip>Clone Version</q-tooltip>
                            </q-btn>
                            <q-btn 
                              flat 
                              round 
                              dense 
                              icon="task_alt" 
                              color="green-4" 
                              v-if="ver.status !== 'ACTIVE'"
                              :disabled="degradedMode" 
                              @click="promptActivateVersion(ver)"
                            >
                              <q-tooltip>Activate Version</q-tooltip>
                            </q-btn>
                            <q-btn flat round dense icon="delete" color="red-4" :disabled="degradedMode" @click="promptDeleteVersion(ver)">
                              <q-tooltip>Delete Version</q-tooltip>
                            </q-btn>
                          </div>
                        </div>
                        <div class="q-mt-xs row q-col-gutter-xs text-caption text-grey-4 font-mono">
                          <div class="col-6">Onboarding Bonus: <span class="text-white">{{ currentCurrency.symbol }}{{ ver.rule?.tenant_onboarding_bonus?.toLocaleString() || '0' }}</span></div>
                          <div class="col-6">Activation Bonus: <span class="text-white">{{ currentCurrency.symbol }}{{ ver.rule?.tenant_activation_bonus?.toLocaleString() || '0' }}</span></div>
                          <div class="col-6">Card split: <span class="text-white">{{ ver.rule?.card_rev_share_pct || 0 }}%</span></div>
                          <div class="col-6">Effective: <span class="text-indigo-3">{{ new Date(ver.effective_date).toLocaleDateString() }}</span></div>
                        </div>
                      </div>
                      <div v-if="!prog.versions?.length" class="text-caption text-grey-6 italic text-center q-py-xs">No versions created yet.</div>
                    </div>
                  </q-item>
                  <q-item v-if="!plansAndTargets.programs?.length" class="text-center text-grey-6 q-pa-md justify-center">No Programs configured.</q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>

          <!-- Merchant Category Overrides CRUD Card -->
          <div class="col-12 col-md-6">
            <q-card dark bordered class="bg-panel border-main fit column justify-between">
              <div>
                <q-card-section class="border-bottom q-py-sm row items-center justify-between">
                  <div class="text-subtitle1 text-weight-bold text-purple-4 flex items-center">
                    <q-icon name="storefront" class="q-mr-sm" />
                    Merchant Category Exceptions
                  </div>
                  <q-btn 
                    v-if="isSuperAdmin" 
                    color="purple-9" 
                    icon="add" 
                    label="Add Exception" 
                    dense 
                    class="q-px-sm font-mono text-weight-bold" 
                    @click="openCategoryRuleDialog(null)" 
                    unelevated
                  />
                </q-card-section>
                <q-card-section class="q-pa-none">
                  <q-table :rows="plansAndTargets.categoryRules" :columns="categoryColumnsWithActions" row-key="id" flat dark class="bg-transparent" dense>
                    <template v-slot:body-cell-category="props">
                      <q-td :props="props">
                        {{ props.row.merchant_categories ? props.row.merchant_categories.name : props.row.category_name }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-onboarding="props">
                      <q-td :props="props" class="font-mono">
                        {{ currentCurrency.symbol }}{{ props.row.tenant_onboarding_bonus?.toLocaleString() || '0' }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-activation="props">
                      <q-td :props="props" class="font-mono">
                        {{ currentCurrency.symbol }}{{ props.row.tenant_activation_bonus?.toLocaleString() || '0' }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props" class="text-right" v-if="isSuperAdmin">
                        <q-btn flat round dense icon="edit" color="purple-3" @click="openCategoryRuleDialog(props.row)" />
                        <q-btn flat round dense icon="delete" color="red-4" :disabled="degradedMode" @click="deleteCategoryRule(props.row.id)" />
                      </q-td>
                    </template>
                  </q-table>
                </q-card-section>
              </div>
            </q-card>
          </div>
        </div>

        <!-- Target Rules CRUD Card -->
        <q-card dark bordered class="bg-panel border-main">
          <q-card-section class="border-bottom q-py-sm">
            <div class="text-subtitle1 text-weight-bold text-amber-5 flex items-center">
              <q-icon name="emoji_events" class="q-mr-sm" />
              Target Rules & Milestone Thresholds
            </div>
          </q-card-section>
          <q-card-section class="row q-col-gutter-lg">
            <!-- Performance Tier Thresholds CRUD -->
            <div class="col-12 col-md-6">
              <div class="row items-center justify-between q-mb-sm">
                <div class="text-subtitle2 text-grey-4 font-mono">> Agent Performance Target Rules</div>
                <q-btn 
                  v-if="isSuperAdmin" 
                  color="amber-9" 
                  icon="add" 
                  label="Add Target" 
                  dense 
                  class="q-px-sm font-mono text-weight-bold text-dark" 
                  @click="openPerformanceRuleDialog(null)" 
                  unelevated
                />
              </div>
              <q-table :rows="plansAndTargets.performanceRules" :columns="performanceColumnsWithActions" row-key="id" flat dark class="bg-subpanel border-main" dense>
                <template v-slot:body-cell-bonus="props">
                  <q-td :props="props" class="font-mono text-green-4">
                    +{{ currentCurrency.symbol }}{{ props.row.bonus_amount?.toLocaleString() || '0' }}
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-right" v-if="isSuperAdmin">
                    <q-btn flat round dense icon="edit" color="amber-5" @click="openPerformanceRuleDialog(props.row)" />
                    <q-btn flat round dense icon="delete" color="red-4" :disabled="degradedMode" @click="deletePerformanceRule(props.row.id)" />
                  </q-td>
                </template>
              </q-table>
            </div>

            <!-- Terminal Targets CRUD -->
            <div class="col-12 col-md-6">
              <div class="row items-center justify-between q-mb-sm">
                <div class="text-subtitle2 text-grey-4 font-mono">> Terminal Placement Goals</div>
                <q-btn 
                  v-if="isSuperAdmin" 
                  color="orange-9" 
                  icon="add" 
                  label="Add Goal" 
                  dense 
                  class="q-px-sm font-mono text-weight-bold" 
                  @click="openTerminalRuleDialog(null)" 
                  unelevated
                />
              </div>
              <q-table :rows="plansAndTargets.terminalRules" :columns="terminalColumnsWithActions" row-key="id" flat dark class="bg-subpanel border-main" dense>
                <template v-slot:body-cell-reward="props">
                  <q-td :props="props" class="font-mono text-green-4">
                    +{{ currentCurrency.symbol }}{{ props.row.reward_value?.toLocaleString() || '0' }} ({{ props.row.reward_type }})
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-right" v-if="isSuperAdmin">
                    <q-btn flat round dense icon="edit" color="orange-5" @click="openTerminalRuleDialog(props.row)" />
                    <q-btn flat round dense icon="delete" color="red-4" :disabled="degradedMode" @click="deleteTerminalRule(props.row.id)" />
                  </q-td>
                </template>
              </q-table>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- TAB 6: CAMPAIGNS & BUDGETS -->
      <q-tab-panel name="budgets" class="q-pa-none">
        <!-- Budgets Section -->
        <div class="text-subtitle1 text-weight-bold text-cyan-4 q-mb-md">Active Incentive Pools & Budgets</div>
        <div class="row q-col-gutter-lg q-mb-lg">
          <div class="col-12 col-md-6" v-for="bud in budgetsAndCampaigns.budgets" :key="bud.id">
            <q-card dark bordered class="bg-panel border-main q-pa-md position-relative">
              <!-- Alarm banner for critical utilization -->
              <div v-if="bud.utilization_pct > 90" class="critical-indicator absolute-top-right q-pa-xs bg-red border-critical rounded-borders text-caption text-weight-bold font-mono">
                CRITICAL LIMIT ALERT (>90%)
              </div>

              <div class="text-weight-bold text-white text-subtitle1">{{ bud.name }}</div>
              <div class="text-caption text-grey-5 q-mb-md">Pool timeframe: {{ new Date(bud.start_date).toLocaleDateString() }} - {{ new Date(bud.end_date).toLocaleDateString() }}</div>
              
              <!-- Utilization Info -->
              <div class="row justify-between items-center font-mono text-caption text-grey-4 q-mb-xs">
                <div>Spent: {{ currentCurrency.symbol }}{{ bud.used_amount.toLocaleString() }}</div>
                <div>Limit: {{ currentCurrency.symbol }}{{ bud.total_amount.toLocaleString() }}</div>
              </div>
              <q-linear-progress :value="bud.utilization_pct / 100" :color="bud.utilization_pct > 90 ? 'red' : 'cyan'" size="12px" rounded class="q-mb-sm" />
              <div class="row justify-between text-caption text-grey-5 font-mono">
                <div>Remaining: {{ currentCurrency.symbol }}{{ bud.remaining_amount.toLocaleString() }}</div>
                <div :class="bud.utilization_pct > 90 ? 'text-red text-weight-bold' : 'text-cyan-3'">{{ bud.utilization_pct }}% Utilized</div>
              </div>
            </q-card>
          </div>
        </div>

        <!-- Active Campaigns -->
        <q-card dark bordered class="bg-panel border-main">
          <q-card-section class="border-bottom q-py-sm">
            <div class="text-subtitle1 text-weight-bold text-purple-4">Active Growth Campaigns</div>
          </q-card-section>
          <q-card-section class="q-pa-none">
            <q-table :rows="budgetsAndCampaigns.campaigns" :columns="campaignColumns" row-key="id" flat dark class="bg-transparent">
              <template v-slot:body-cell-dates="props">
                <q-td :props="props" class="font-mono text-caption text-grey-4">
                  {{ new Date(props.row.start_date).toLocaleDateString() }} - {{ new Date(props.row.end_date).toLocaleDateString() }}
                </q-td>
              </template>
              <template v-slot:body-cell-reward="props">
                <q-td :props="props" class="font-mono text-green-4 text-weight-bold">
                  +{{ currentCurrency.symbol }}{{ props.row.reward_value.toLocaleString() }}
                  <div class="text-caption text-grey-5">{{ props.row.reward_type }}</div>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- TAB 7: SIMULATOR -->
      <q-tab-panel name="simulator" class="q-pa-none">
        <div class="row q-col-gutter-lg">
          <!-- Config Panel -->
          <div class="col-12 col-md-5">
            <q-card dark bordered class="bg-panel border-main">
              <q-card-section class="border-bottom q-py-md">
                <div class="text-subtitle1 text-weight-bold text-purple-4 flex items-center">
                  <q-icon name="psychology" class="q-mr-sm" color="purple-4" size="sm" />
                  Deterministic Commission Simulator
                </div>
                <div class="text-caption text-grey-5">Simulate growth metrics and tier progression splits.</div>
              </q-card-section>
              <q-card-section class="q-pa-lg column q-gap-16">
                <!-- Select Agent -->
                <div>
                  <div class="text-caption text-grey-4 q-mb-xs font-mono">Agent (Fuzzy Lookup)</div>
                  <q-select
                    v-model="simConfig.agent"
                    :options="filteredAgentOptions"
                    use-input
                    fill-input
                    hide-selected
                    input-debounce="300"
                    placeholder="Choose agent profile..."
                    dark outlined dense
                    bg-color="subpanel"
                    option-value="id"
                    option-label="label"
                    @filter="filterAgents"
                    class="font-mono text-purple-3 custom-input"
                  />
                </div>

                <!-- Event Type -->
                <div>
                  <div class="text-caption text-grey-4 q-mb-xs font-mono">Trigger Event Type</div>
                  <q-select
                    v-model="simConfig.eventType"
                    :options="[
                      { label: 'Merchant Onboard & Activation (FULLY_ACTIVATED)', value: 'FULLY_ACTIVATED' },
                      { label: 'Customer Transaction Event (FIRST_TRANSACTION)', value: 'FIRST_TRANSACTION' }
                    ]"
                    dark outlined dense
                    bg-color="subpanel"
                    emit-value map-options
                    class="font-mono text-purple-3 custom-input"
                  />
                </div>

                <!-- Transaction Amount -->
                <div v-if="simConfig.eventType === 'FIRST_TRANSACTION'">
                  <div class="text-caption text-grey-4 q-mb-xs font-mono">Transaction Net Revenue (NGN)</div>
                  <q-input
                    v-model.number="simConfig.amount"
                    type="number"
                    dark outlined dense
                    bg-color="subpanel"
                    :prefix="currentCurrency.symbol"
                    class="font-mono text-purple-3 custom-input"
                  />
                </div>

                <!-- Merchant Category -->
                <div>
                  <div class="text-caption text-grey-4 q-mb-xs font-mono">Merchant Category Exception</div>
                  <q-select
                    v-model="simConfig.category"
                    :options="['Education / Schools', 'Retail POS Shops', 'Healthcare / Clinics', 'Standard Platform Tier']"
                    dark outlined dense
                    bg-color="subpanel"
                    class="font-mono text-purple-3 custom-input"
                  />
                </div>

                <!-- Exec Option -->
                <div class="q-py-sm">
                  <q-toggle
                    v-model="simConfig.dryRun"
                    label="Execute as Dry Run (Recommended)"
                    color="purple-4"
                    dark
                    class="font-mono text-caption"
                  />
                  <div class="text-caption text-grey-5 q-pl-lg" style="margin-top: -6px;">
                    * Dry-run calculations perform predictions in memory without writing to the live ledger databases.
                  </div>
                </div>
              </q-card-section>
              <q-card-actions class="border-top q-pa-md bg-dark-panel row q-col-gutter-sm">
                <div class="col-6">
                  <q-btn 
                    color="purple-8" 
                    icon="play_arrow" 
                    label="Simulate Dry Run" 
                    @click="runSimulation(true)" 
                    :loading="simulating"
                    class="full-width hover-glow-btn text-weight-bold font-mono"
                    unelevated
                  />
                </div>
                <div class="col-6">
                  <q-btn 
                    color="green-9" 
                    icon="flash_on" 
                    label="Execute Real Event" 
                    @click="runSimulation(false)" 
                    :loading="simulating"
                    :disabled="degradedMode"
                    class="full-width hover-glow-btn text-weight-bold font-mono"
                    unelevated
                  />
                </div>
              </q-card-actions>
            </q-card>
          </div>

          <!-- Output Panel -->
          <div class="col-12 col-md-7">
            <q-card dark bordered class="bg-panel border-main fit column justify-between" style="min-height: 480px;">
              <div>
                <q-card-section class="border-bottom q-py-md row justify-between items-center">
                  <div class="text-subtitle1 text-weight-bold text-cyan-4 flex items-center">
                    <q-icon name="analytics" class="q-mr-sm" color="cyan-4" size="sm" />
                    Estimation & Simulation Results
                  </div>
                  <q-badge :color="simResult.executed ? 'green-9' : 'purple-9'" text-color="white" class="font-mono text-weight-bold" v-if="simResult.calculated">
                    {{ simResult.executed ? 'LIVE COMMITTED' : 'DRY RUN' }}
                  </q-badge>
                </q-card-section>

                <q-card-section class="q-pa-lg" v-if="simResult.calculated">
                  <!-- Reward details -->
                  <div class="text-h6 text-grey-4 q-mb-sm font-mono">Estimated Commission Payouts:</div>
                  <div class="row q-col-gutter-sm q-mb-lg">
                    <div class="col-12 col-md-4" v-for="sp in simResult.splits" :key="sp.label">
                      <div class="bg-subpanel border-main q-pa-sm rounded-borders text-center">
                        <div class="text-caption text-grey-5 font-mono">{{ sp.label }}</div>
                        <div class="text-h6 text-green-3 font-mono text-weight-bold">+{{ currentCurrency.symbol }}{{ sp.value.toLocaleString() }}</div>
                      </div>
                    </div>
                  </div>

                  <div class="q-py-md rounded-borders bg-subpanel border-main q-px-md q-mb-lg row justify-between items-center">
                    <div class="text-subtitle1 font-mono">Total Estimated Incentive Payout:</div>
                    <div class="text-h4 text-green-4 font-mono text-weight-bold">{{ currentCurrency.symbol }}{{ simResult.totalPayout.toLocaleString() }}</div>
                  </div>

                  <!-- Tier impact -->
                  <div class="row q-col-gutter-lg">
                    <div class="col-12 col-md-6">
                      <div class="text-subtitle2 text-grey-4 q-mb-xs font-mono">> Tier Progression Matrix</div>
                      <q-list dark bordered dense class="bg-subpanel rounded-borders border-main">
                        <q-item>
                          <q-item-section>Current Performance Tier</q-item-section>
                          <q-item-section side class="text-cyan-3 font-mono text-weight-bold">Tier {{ simResult.tier.currentTier }}</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Estimated Post-Event Tier</q-item-section>
                          <q-item-section side class="text-purple-3 font-mono text-weight-bold">Tier {{ simResult.tier.estNextTier }}</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Progression Status</q-item-section>
                          <q-item-section side><q-chip color="green-9" size="xs" text-color="white" class="text-weight-bold font-mono">ELIGIBLE FOR UPGRADE</q-chip></q-item-section>
                        </q-item>
                      </q-list>
                    </div>

                    <div class="col-12 col-md-6">
                      <div class="text-subtitle2 text-grey-4 q-mb-xs font-mono">> Active Campaign ROI Tracking</div>
                      <q-list dark bordered dense class="bg-subpanel rounded-borders border-main">
                        <q-item>
                          <q-item-section>Target Metric Tracked</q-item-section>
                          <q-item-section side class="text-white font-mono">{{ simResult.campaign.targetMetric }}</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Campaign Completion</q-item-section>
                          <q-item-section side class="text-white font-mono">{{ simResult.campaign.completionPct }}%</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Special Bonus Qualified</q-item-section>
                          <q-item-section side class="text-green-4 text-weight-bold font-mono">YES (+20,000 NGN)</q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </div>
                </q-card-section>

                <div v-else class="column items-center justify-center text-center q-pa-xl text-grey-6" style="margin-top: 100px;">
                  <q-icon name="query_stats" size="5rem" class="opacity-30 q-mb-sm" />
                  <div class="text-weight-bold text-grey-5 font-mono">Awaiting Simulator Parameters</div>
                  <div class="text-caption text-grey-6 max-width-250 q-mt-xs">
                    Input an agent profile and trigger scenario parameters on the left to estimate platform commission payouts.
                  </div>
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

    </q-tab-panels>

    <!-- REJECTION DIALOG COMPONENT -->
    <q-dialog v-model="rejectDialog.show" persistent>
      <q-card style="min-width: 400px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-red-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">Reject Commission Payout Ticket</div>
        </q-card-section>
        <q-card-section class="q-pa-lg">
          <div class="text-caption text-grey-4 q-mb-md">Specify a clear operational audit justification for rejecting this payout.</div>
          <q-input v-model="rejectDialog.reason" type="textarea" label="Rejection Reason" dark filled autogrow label-color="red-3" class="font-mono text-red-3 custom-input" />
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="red-9" label="Reject Payout" @click="submitRejection" :loading="isSavingGlobal" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- CLAWBACK DIALOG COMPONENT -->
    <q-dialog v-model="clawbackDialog.show" persistent>
      <q-card style="min-width: 450px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-orange-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">Trigger Manual Clawback Reversal</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-16">
          <!-- Select Agent -->
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Agent Profile</div>
            <q-select
              v-model="clawbackDialog.agent"
              :options="filteredAgentOptions"
              use-input
              fill-input
              hide-selected
              input-debounce="300"
              placeholder="Type to search agent..."
              dark outlined dense
              bg-color="subpanel"
              option-value="id"
              option-label="label"
              @filter="filterAgents"
              class="font-mono text-purple-3 custom-input"
            />
          </div>

          <!-- Amount -->
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Clawback Amount (NGN)</div>
            <q-input v-model.number="clawbackDialog.amount" type="number" dark outlined dense bg-color="subpanel" :prefix="currentCurrency.symbol" class="font-mono custom-input" />
          </div>

          <!-- Reason -->
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Clawback Type Code</div>
            <q-select
              v-model="clawbackDialog.reason"
              :options="[
                { label: 'Fraud / Compliance Exploit (FRAUD)', value: 'FRAUD' },
                { label: 'Merchant Subscription Refund (CHARGEBACK)', value: 'CHARGEBACK' },
                { label: 'Terminal Placement Retrieval (TERMINAL_RETRIEVAL)', value: 'TERMINAL_RETRIEVAL' }
              ]"
              dark outlined dense
              bg-color="subpanel"
              emit-value map-options
              class="font-mono custom-input"
            />
          </div>

          <!-- Justification -->
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Operator Justification Comments</div>
            <q-input v-model="clawbackDialog.justification" type="textarea" dark filled autogrow class="font-mono custom-input" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="orange-9" label="Execute Clawback" @click="submitClawback" :loading="isSavingGlobal" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- PROGRAM DIALOG -->
    <q-dialog v-model="programDialog.show" persistent>
      <q-card style="min-width: 400px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-cyan-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">{{ programDialog.isEdit ? 'Edit Commission Program' : 'Create New Program' }}</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-16">
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Program Name</div>
            <q-input v-model="programDialog.form.name" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
          </div>
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Description</div>
            <q-input v-model="programDialog.form.description" type="textarea" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
          </div>
          <div class="row items-center justify-between">
            <div class="text-caption text-grey-4 font-mono">Active Status</div>
            <q-toggle v-model="programDialog.form.is_active" color="green" dark />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="cyan-9" :label="programDialog.isEdit ? 'Save Changes' : 'Create Program'" @click="submitProgram" :disabled="degradedMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- VERSION DIALOG (CREATE / CLONE) -->
    <q-dialog v-model="versionDialog.show" persistent>
      <q-card style="min-width: 450px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-purple-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">{{ versionDialog.isClone ? 'Clone Plan Version' : 'Create Plan Version' }}</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-16">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Version Number</div>
              <q-input v-model.number="versionDialog.form.version_number" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Status</div>
              <q-select v-model="versionDialog.form.status" :options="['ACTIVE', 'INACTIVE', 'DEPRECATED']" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Effective Date</div>
            <q-input v-model="versionDialog.form.effective_date" type="date" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
          </div>
          <div>
            <div class="text-caption text-grey-4 q-mb-xs font-mono">Expiry Date (Optional)</div>
            <q-input v-model="versionDialog.form.expiry_date" type="date" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
          </div>
          
          <div v-if="!versionDialog.isClone" class="column q-gap-8 bg-subpanel q-pa-sm rounded-borders border-main q-mt-sm">
            <div class="text-caption text-grey-3 font-mono border-bottom q-pb-xs">Initialize Base Rules:</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-5 font-mono">Onboarding (NGN)</div>
                <q-input v-model.number="versionDialog.form.rule.tenant_onboarding_bonus" type="number" dark outlined dense class="font-mono custom-input" />
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-5 font-mono">Activation (NGN)</div>
                <q-input v-model.number="versionDialog.form.rule.tenant_activation_bonus" type="number" dark outlined dense class="font-mono custom-input" />
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-5 font-mono">Card Share %</div>
                <q-input v-model.number="versionDialog.form.rule.card_rev_share_pct" type="number" dark outlined dense class="font-mono custom-input" />
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-5 font-mono">Transfer Share %</div>
                <q-input v-model.number="versionDialog.form.rule.transfer_rev_share_pct" type="number" dark outlined dense class="font-mono custom-input" />
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="purple-9" :label="versionDialog.isClone ? 'Clone Version' : 'Create Version'" @click="submitVersion" :disabled="degradedMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- RULES DIALOG (EDIT RULES) -->
    <q-dialog v-model="rulesDialog.show" persistent>
      <q-card style="min-width: 450px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-cyan-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">Edit Version Base Rules</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-12">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Onboarding Bonus (NGN)</div>
              <q-input v-model.number="rulesDialog.form.tenant_onboarding_bonus" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Activation Bonus (NGN)</div>
              <q-input v-model.number="rulesDialog.form.tenant_activation_bonus" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Card Share %</div>
              <q-input v-model.number="rulesDialog.form.card_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Transfer Share %</div>
              <q-input v-model.number="rulesDialog.form.transfer_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">USSD Share %</div>
              <q-input v-model.number="rulesDialog.form.ussd_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Virtual Account Share %</div>
              <q-input v-model.number="rulesDialog.form.va_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="cyan-9" label="Save Rules" @click="submitRules" :disabled="degradedMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- CATEGORY RULE DIALOG -->
    <q-dialog v-model="categoryRuleDialog.show" persistent>
      <q-card style="min-width: 450px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-purple-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">{{ categoryRuleDialog.isEdit ? 'Edit Category Override' : 'Add Category Exception' }}</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-12">
          <div v-if="!categoryRuleDialog.isEdit" class="column q-gap-12">
            <div>
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Merchant Category</div>
              <q-select 
                v-model="categoryRuleDialog.form.category_id" 
                :options="merchantCategories" 
                option-value="id"
                option-label="name"
                emit-value map-options
                dark outlined dense bg-color="subpanel" 
                class="font-mono custom-input" 
              />
            </div>
            <div>
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Link to Program Version</div>
              <q-select 
                v-model="categoryRuleDialog.form.plan_version_id" 
                :options="activeVersionOptions" 
                emit-value map-options
                dark outlined dense bg-color="subpanel" 
                class="font-mono custom-input" 
              />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Onboarding Bonus</div>
              <q-input v-model.number="categoryRuleDialog.form.tenant_onboarding_bonus" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Activation Bonus</div>
              <q-input v-model.number="categoryRuleDialog.form.tenant_activation_bonus" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Card Share %</div>
              <q-input v-model.number="categoryRuleDialog.form.card_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Transfer Share %</div>
              <q-input v-model.number="categoryRuleDialog.form.transfer_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="purple-9" :label="categoryRuleDialog.isEdit ? 'Save Exception' : 'Add Exception'" @click="submitCategoryRule" :disabled="degradedMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- PERFORMANCE TARGET RULE DIALOG -->
    <q-dialog v-model="performanceRuleDialog.show" persistent>
      <q-card style="min-width: 450px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-amber-10 q-py-md text-dark">
          <div class="text-h6 text-weight-bold">{{ performanceRuleDialog.isEdit ? 'Edit Performance Milestone' : 'Add Performance Milestone Target' }}</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-12">
          <div v-if="!performanceRuleDialog.isEdit" class="column q-gap-12">
            <div>
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Link to Program Version</div>
              <q-select 
                v-model="performanceRuleDialog.form.plan_version_id" 
                :options="activeVersionOptions" 
                emit-value map-options
                dark outlined dense bg-color="subpanel" 
                class="font-mono custom-input" 
              />
            </div>
            <div>
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Tier Level</div>
              <q-input v-model.number="performanceRuleDialog.form.tier_level" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Tenant Threshold</div>
              <q-input v-model.number="performanceRuleDialog.form.tenant_threshold" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Cash Bonus Amount</div>
              <q-input v-model.number="performanceRuleDialog.form.bonus_amount" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Card Share %</div>
              <q-input v-model.number="performanceRuleDialog.form.card_rev_share_pct" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Validity (Days)</div>
              <q-input v-model.number="performanceRuleDialog.form.validity_days" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="amber-9" text-color="dark" :label="performanceRuleDialog.isEdit ? 'Save Target' : 'Add Target'" @click="submitPerformanceRule" :disabled="degradedMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- TERMINAL TARGET RULE DIALOG -->
    <q-dialog v-model="terminalRuleDialog.show" persistent>
      <q-card style="min-width: 400px;" class="bg-grey-9 text-white border-main">
        <q-card-section class="bg-orange-10 q-py-md text-white">
          <div class="text-h6 text-weight-bold">{{ terminalRuleDialog.isEdit ? 'Edit Terminal Goal' : 'Add Terminal Placement Goal' }}</div>
        </q-card-section>
        <q-card-section class="q-pa-lg column q-gap-12">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">Frequency</div>
              <q-select v-model="terminalRuleDialog.form.frequency" :options="['WEEKLY', 'MONTHLY', 'QUARTERLY']" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-4 q-mb-xs font-mono">POS Target</div>
              <q-input v-model.number="terminalRuleDialog.form.terminal_target" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Reward Type</div>
              <q-select v-model="terminalRuleDialog.form.reward_type" :options="['CASH_BONUS', 'COMMISSION_MULTIPLIER', 'REPUTATION_POINTS']" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5 font-mono">Reward Value</div>
              <q-input v-model.number="terminalRuleDialog.form.reward_value" type="number" dark outlined dense bg-color="subpanel" class="font-mono custom-input" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="orange-9" :label="terminalRuleDialog.isEdit ? 'Save Goal' : 'Add Goal'" @click="submitTerminalRule" :disabled="degradedMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { adminApi, commissionApi } from 'src/api';

const $q = useQuasar();

// Tab State
const tab = ref('defaults');
const degradedMode = ref(false);
const loadingData = ref(false);

// Tab 1 (Global Defaults & Overrides State)
const isLoadingGlobal = ref(true);
const isSavingGlobal = ref(false);
const globalSettings = ref({
  globalDefaultOnboardingFee: 10000,
  globalDefaultRevSharePercentage: 15
});

const agentsList = ref([]);
const agentOptions = ref([]);
const filteredAgentOptions = ref([]);
const selectedAgentOption = ref(null);

const selectedAgentId = ref('');
const selectedAgentName = ref('');
const selectedAgentCode = ref('');
const selectedAgent = ref(false);
const isSavingAgent = ref(false);
const agentSettings = ref({
  onboardingFee: null,
  revSharePercentage: null
});

// Tab 2 (Approvals State)
const approvals = ref([]);

const approvalColumns = [
  { name: 'id', label: 'TICKET ID', field: 'id', align: 'left', style: 'font-family: monospace; font-size: 11px;' },
  { name: 'agent', label: 'FIELD AGENT', align: 'left' },
  { name: 'source', label: 'SOURCE SOURCE_TYPE', field: 'source_type', align: 'center', style: 'font-family: monospace; font-size: 11px;' },
  { name: 'amount', label: 'COMMISSION AMOUNT', field: 'amount', align: 'right' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'date', label: 'GENERATED DATE', field: 'created_at', align: 'right', format: val => new Date(val).toLocaleDateString() },
  { name: 'actions', label: '', align: 'right' }
];

const rejectDialog = ref({ show: false, id: null, reason: '' });
const clawbackDialog = ref({ show: false, agent: null, amount: 0, reason: 'FRAUD', justification: '' });

// Tab 3 (Audit & History State)
const auditHistory = ref({
  events: [],
  revenueShareLedger: [],
  bonusRewards: [],
  clawbacks: []
});

const auditColumns = {
  events: [
    { name: 'date', label: 'TIMESTAMP', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString(), style: 'font-family: monospace; font-size: 11px;' },
    { name: 'agent', label: 'AGENT / SENDER', align: 'left' },
    { name: 'type', label: 'EVENT TYPE', field: 'event_type', align: 'left', style: 'font-family: monospace;' },
    { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right' },
    { name: 'states', label: 'STATE TRANSITION', align: 'left' }
  ]
};

// Tab 4 (Agent Progress State)
const agentProgress = ref([]);

const progressColumns = [
  { name: 'agent', label: 'AGENT PROFILE', align: 'left' },
  { name: 'plan', label: 'ACTIVE SCHEME PLAN', field: 'plan_name', align: 'left' },
  { name: 'tier', label: 'CURRENT PERFORMANCE TIER', field: 'current_tier', align: 'center', format: val => `Tier ${val}`, style: 'font-weight: bold; color: #00F0FF;' },
  { name: 'onboarded', label: 'TENANTS ONBOARDED', field: 'tenants_onboarded_count', align: 'center' },
  { name: 'deployed', label: 'TERMINALS DEPLOYED', field: 'terminals_deployed_count', align: 'center' },
  { name: 'revenue', label: 'REVENUE GENERATED', field: 'revenue_generated', align: 'right' },
  { name: 'campaign_progress', label: 'CAMPAIGN PROGRESS', align: 'left' }
];

// Tab 5 (Plans & Targets State)
const plansAndTargets = ref({
  programs: [],
  categoryRules: [],
  performanceRules: [],
  terminalRules: []
});

const planColumns = {
  categoryRules: [
    { name: 'category', label: 'MERCHANT CATEGORY', align: 'left' },
    { name: 'onboarding', label: 'ONBOARDING REWARD', align: 'right' },
    { name: 'activation', label: 'ACTIVATION BONUS', align: 'right' },
    { name: 'revshare', label: 'CARD REVSHARE %', field: 'card_rev_share_pct', align: 'center', format: val => `${val}%` }
  ],
  performanceRules: [
    { name: 'tier', label: 'TIER TIER_LEVEL', field: 'tier_level', align: 'center', format: val => `Tier ${val}` },
    { name: 'threshold', label: 'TENANT THRESHOLD', field: 'tenant_threshold', align: 'center', format: val => `${val} Merchants` },
    { name: 'bonus', label: 'CASH REWARD BONUS', align: 'right' },
    { name: 'revshare', label: 'TIER CARD SHARE %', field: 'card_rev_share_pct', align: 'center', format: val => `${val}%` }
  ],
  terminalRules: [
    { name: 'frequency', label: 'FREQUENCY', field: 'frequency', align: 'left' },
    { name: 'target', label: 'TERMINAL PLACEMENT LIMIT', field: 'terminal_target', align: 'center', format: val => `${val} POS` },
    { name: 'reward', label: 'INCENTIVE REWARD', align: 'right' }
  ]
};

const categoryColumnsWithActions = [
  { name: 'category', label: 'MERCHANT CATEGORY', align: 'left' },
  { name: 'onboarding', label: 'ONBOARDING REWARD', align: 'right' },
  { name: 'activation', label: 'ACTIVATION BONUS', align: 'right' },
  { name: 'revshare', label: 'CARD REVSHARE %', field: 'card_rev_share_pct', align: 'center', format: val => `${val}%` },
  { name: 'actions', label: '', align: 'right' }
];

const performanceColumnsWithActions = [
  { name: 'tier', label: 'TIER TIER_LEVEL', field: 'tier_level', align: 'center', format: val => `Tier ${val}` },
  { name: 'threshold', label: 'TENANT THRESHOLD', field: 'tenant_threshold', align: 'center', format: val => `${val} Merchants` },
  { name: 'bonus', label: 'CASH REWARD BONUS', align: 'right' },
  { name: 'revshare', label: 'TIER CARD SHARE %', field: 'card_rev_share_pct', align: 'center', format: val => `${val}%` },
  { name: 'actions', label: '', align: 'right' }
];

const terminalColumnsWithActions = [
  { name: 'frequency', label: 'FREQUENCY', field: 'frequency', align: 'left' },
  { name: 'target', label: 'TERMINAL PLACEMENT LIMIT', field: 'terminal_target', align: 'center', format: val => `${val} POS` },
  { name: 'reward', label: 'INCENTIVE REWARD', align: 'right' },
  { name: 'actions', label: '', align: 'right' }
];

// Dialog Forms & Models State
import { computed } from 'vue';

const isSuperAdmin = computed(() => {
  const role = localStorage.getItem('operator_role') || 'SUPER_ADMIN';
  return role === 'SUPER_ADMIN';
});

// Dropdown Helper Lists
const merchantCategories = ref([]);
const activeVersionOptions = ref([]);

// 1. Program Dialog
const programDialog = ref({
  show: false,
  isEdit: false,
  form: { id: null, name: '', description: '', is_active: true }
});

// 2. Version Dialog
const versionDialog = ref({
  show: false,
  isClone: false,
  programId: null,
  sourceVersionId: null,
  form: { version_number: 1, effective_date: '', expiry_date: '', status: 'ACTIVE', rule: { tenant_onboarding_bonus: 5000, tenant_activation_bonus: 10000, card_rev_share_pct: 10, transfer_rev_share_pct: 10 } }
});

// 3. Rules Dialog
const rulesDialog = ref({
  show: false,
  versionId: null,
  form: { tenant_onboarding_bonus: 0, tenant_activation_bonus: 0, card_rev_share_pct: 0, transfer_rev_share_pct: 0, ussd_rev_share_pct: 0, va_rev_share_pct: 0 }
});

// 4. Category Rule Dialog
const categoryRuleDialog = ref({
  show: false,
  isEdit: false,
  form: { id: null, plan_version_id: '', category_id: '', tenant_onboarding_bonus: 0, tenant_activation_bonus: 0, card_rev_share_pct: 0, transfer_rev_share_pct: 0 }
});

// 5. Performance Target Rule Dialog
const performanceRuleDialog = ref({
  show: false,
  isEdit: false,
  form: { id: null, plan_version_id: '', tier_level: 2, tenant_threshold: 5, bonus_amount: 0, card_rev_share_pct: 0, validity_days: 30 }
});

// 6. Terminal Target Rule Dialog
const terminalRuleDialog = ref({
  show: false,
  isEdit: false,
  form: { id: null, frequency: 'MONTHLY', terminal_target: 3, reward_type: 'CASH_BONUS', reward_value: 0 }
});

// Tab 6 (Campaigns & Budgets State)
const budgetsAndCampaigns = ref({
  budgets: [],
  campaigns: []
});

const campaignColumns = [
  { name: 'name', label: 'CAMPAIGN PROJECT NAME', field: 'name', align: 'left', style: 'font-weight: bold; color: #a855f7;' },
  { name: 'region', label: 'REGION CODE', field: 'region', align: 'center' },
  { name: 'dates', label: 'CAMPAIGN TIME PERIOD', align: 'left' },
  { name: 'target', label: 'METRIC GOAL', field: 'target_type', align: 'center' },
  { name: 'reward', label: 'CAMPAIGN INCENTIVE REWARD', align: 'right' }
];

// Tab 7 (Simulator State)
const simConfig = ref({
  agent: null,
  eventType: 'FULLY_ACTIVATED',
  amount: 50000,
  category: 'Standard Platform Tier',
  dryRun: true
});

const simulating = ref(false);
const simResult = ref({
  calculated: false,
  executed: false,
  totalPayout: 0,
  splits: [],
  tier: { currentTier: 1, estNextTier: 1 },
  campaign: { targetMetric: 'MERCHANTS', completionPct: 0 }
});

// Load Global & Overrides Data
const loadGlobalSettings = async () => {
  isLoadingGlobal.value = true;
  try {
    const res = await adminApi.getGlobalCommissions();
    if (res.data?.success && res.data.commissions) {
      globalSettings.value = res.data.commissions;
    }
  } catch (error) {
    console.error('Failed to load global commission defaults');
  } finally {
    isLoadingGlobal.value = false;
  }
};

const loadAgents = async () => {
  try {
    const res = await adminApi.listAgents();
    if (res.data?.success && res.data.agents) {
      agentsList.value = res.data.agents;
      agentOptions.value = res.data.agents.map(a => ({
        id: a.id,
        agentCode: a.agent_code,
        name: `${a.first_name} ${a.last_name}`,
        label: `${a.agent_code} - ${a.first_name} ${a.last_name}`
      }));
      filteredAgentOptions.value = [...agentOptions.value];
    }
  } catch (error) {
    console.error('Failed to load agents list:', error);
  }
};

const filterAgents = (val, update) => {
  if (val === '') {
    update(() => {
      filteredAgentOptions.value = agentOptions.value;
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    filteredAgentOptions.value = agentOptions.value.filter(
      v => v.label.toLowerCase().indexOf(needle) > -1
    );
  });
};

const onAgentSelected = async (agent) => {
  if (!agent) {
    selectedAgent.value = false;
    selectedAgentId.value = '';
    selectedAgentName.value = '';
    selectedAgentCode.value = '';
    return;
  }
  
  selectedAgentId.value = agent.id;
  selectedAgentName.value = agent.name;
  selectedAgentCode.value = agent.agentCode;
  
  try {
    const res = await adminApi.getAgentCommissions(agent.id);
    if (res.data?.success) {
      selectedAgent.value = true;
      agentSettings.value = {
        onboardingFee: res.data.commissionSettings?.onboardingFee ?? null,
        revSharePercentage: res.data.commissionSettings?.revSharePercentage ?? null
      };
    }
  } catch (error) {
    console.error('Agent overrides query failed');
  }
};

// Global & Overrides Save Actions
const saveGlobalSettings = async () => {
  isSavingGlobal.value = true;
  try {
    const res = await adminApi.updateGlobalCommissions(globalSettings.value);
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: 'Global defaults saved successfully', icon: 'check_circle' });
      syncAllData();
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Failed to save global default settings' });
  } finally {
    isSavingGlobal.value = false;
  }
};

const saveAgentSettings = async () => {
  if (!selectedAgentId.value) return;
  isSavingAgent.value = true;
  try {
    const payload = {
      onboardingFee: agentSettings.value.onboardingFee,
      revSharePercentage: agentSettings.value.revSharePercentage
    };
    const res = await adminApi.updateAgentCommissions(selectedAgentId.value, payload);
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: `Overrides saved for ${selectedAgentName.value}`, icon: 'check_circle' });
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Failed to save agent overrides' });
  } finally {
    isSavingAgent.value = false;
  }
};

// Sync M7 Dashboard
const syncAllData = async () => {
  loadingData.value = true;
  try {
    // 1. Fetch approvals
    const appRes = await commissionApi.getApprovals();
    approvals.value = appRes.data?.approvals || [];
    degradedMode.value = !!appRes.data?.degradedMode;

    // 2. Fetch history
    const histRes = await commissionApi.getAuditHistory();
    auditHistory.value = {
      events: histRes.data?.events || [],
      revenueShareLedger: histRes.data?.revenueShareLedger || [],
      bonusRewards: histRes.data?.bonusRewards || [],
      clawbacks: histRes.data?.clawbacks || []
    };

    // 3. Fetch progress
    const progRes = await commissionApi.getAgentProgress();
    agentProgress.value = progRes.data?.progress || [];

    // 4. Fetch plans
    const planRes = await commissionApi.getPlansAndTargets();
    plansAndTargets.value = {
      programs: planRes.data?.programs || [],
      categoryRules: planRes.data?.categoryRules || [],
      performanceRules: planRes.data?.performanceRules || [],
      terminalRules: planRes.data?.terminalRules || []
    };

    // Hydrate categories and activeVersionOptions dropdown maps
    merchantCategories.value = planRes.data?.categories || [];
    const versionsList = [];
    for (const prog of planRes.data?.programs || []) {
      for (const ver of prog.versions || []) {
        versionsList.push({
          label: `${prog.name} (v${ver.version_number}) - ${ver.status}`,
          value: ver.id
        });
      }
    }
    activeVersionOptions.value = versionsList;

    // 5. Fetch budgets
    const budRes = await commissionApi.getCampaignsAndBudgets();
    budgetsAndCampaigns.value = {
      budgets: budRes.data?.budgets || [],
      campaigns: budRes.data?.campaigns || []
    };

    if (degradedMode.value) {
      $q.notify({ color: 'warning', message: 'Connection issue: Serving cached read-only datasets.', position: 'bottom-right' });
    }
  } catch (err) {
    degradedMode.value = true;
    $q.notify({ color: 'negative', message: 'Offline Mode: Serving local simulation data.', icon: 'wifi_off', position: 'bottom-right' });
  } finally {
    loadingData.value = false;
  }
};

// Payout Approval Actions
const approveTicket = async (ticketId) => {
  try {
    const res = await commissionApi.approveCommission(ticketId);
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: 'Commission ticket approved and balances synchronized.', icon: 'check' });
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const promptRejection = (ticketId) => {
  rejectDialog.value = { show: true, id: ticketId, reason: '' };
};

const submitRejection = async () => {
  if (!rejectDialog.value.reason) return;
  try {
    const res = await commissionApi.rejectCommission(rejectDialog.value.id, { reason: rejectDialog.value.reason });
    if (res.data?.success) {
      $q.notify({ color: 'orange-8', message: 'Commission ticket rejected successfully', icon: 'cancel' });
      rejectDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const openClawbackDialog = () => {
  clawbackDialog.value = { show: true, agent: null, amount: 0, reason: 'FRAUD', justification: '' };
};

const submitClawback = async () => {
  if (!clawbackDialog.value.agent || clawbackDialog.value.amount <= 0) return;
  try {
    const res = await commissionApi.executeClawback({
      agentId: clawbackDialog.value.agent.id,
      amount: clawbackDialog.value.amount,
      reason: clawbackDialog.value.reason,
      justification: clawbackDialog.value.justification
    });
    if (res.data?.success) {
      $q.notify({ color: 'red-9', message: 'Commission reversal transaction successfully submitted.', icon: 'undo' });
      clawbackDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

// Run Simulator Calculations
const runSimulation = async (isDryRun = true) => {
  if (!simConfig.value.agent) {
    $q.notify({ color: 'warning', message: 'Please select an agent profile to run the simulation.' });
    return;
  }
  simulating.value = true;
  try {
    const res = await commissionApi.simulate({
      agentId: simConfig.value.agent.id,
      eventType: simConfig.value.eventType,
      platformNetRevenue: simConfig.value.amount,
      merchantCategoryId: simConfig.value.category,
      dryRun: isDryRun
    });

    if (res.data?.success) {
      if (isDryRun) {
        simResult.value = {
          calculated: true,
          executed: false,
          totalPayout: res.data.totalPayout,
          splits: res.data.splits,
          tier: res.data.tierEstimation,
          campaign: res.data.campaignROI
        };
        $q.notify({ color: 'purple-8', message: 'Simulation dry-run finished. Showing projection details.', icon: 'play_arrow' });
      } else {
        $q.notify({ color: 'green-8', message: 'Simulation event committed successfully to database ledger!', icon: 'flash_on' });
        syncAllData();
      }
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Failed to simulate scenario' });
  } finally {
    simulating.value = false;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'PENDING': return 'amber-9';
    case 'APPROVED': return 'cyan-8';
    case 'PAID': return 'green-9';
    case 'REJECTED': return 'red-9';
    case 'REVERSED': return 'orange-10';
    default: return 'grey';
  }
};

// --- PLANS & TARGETS CRUD TRIGGERS ---
const openProgramDialog = (program = null) => {
  if (program) {
    programDialog.value = {
      show: true,
      isEdit: true,
      form: {
        id: program.id,
        name: program.name,
        description: program.description,
        is_active: program.is_active
      }
    };
  } else {
    programDialog.value = {
      show: true,
      isEdit: false,
      form: {
        id: null,
        name: '',
        description: '',
        is_active: true
      }
    };
  }
};

const submitProgram = async () => {
  try {
    const isEdit = programDialog.value.isEdit;
    const form = programDialog.value.form;
    let res;
    if (isEdit) {
      res = await commissionApi.updateProgram(form.id, {
        name: form.name,
        description: form.description,
        is_active: form.is_active
      });
    } else {
      res = await commissionApi.createProgram({
        name: form.name,
        description: form.description,
        is_active: form.is_active
      });
    }
    if (res.data?.success) {
      $q.notify({
        color: 'positive',
        message: isEdit ? 'Program updated successfully.' : 'Program created successfully.',
        icon: 'check'
      });
      programDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const openVersionDialog = (programId, version = null) => {
  versionDialog.value = {
    show: true,
    isClone: false,
    programId,
    sourceVersionId: null,
    form: {
      version_number: 1,
      status: 'INACTIVE',
      effective_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      rule: {
        tenant_onboarding_bonus: 5000,
        tenant_activation_bonus: 10000,
        card_rev_share_pct: 10,
        transfer_rev_share_pct: 10
      }
    }
  };
};

const cloneVersionPrompt = (version) => {
  versionDialog.value = {
    show: true,
    isClone: true,
    programId: version.program_id,
    sourceVersionId: version.id,
    form: {
      version_number: (version.version_number || 1) + 1,
      status: 'INACTIVE',
      effective_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      rule: {
        tenant_onboarding_bonus: version.rule?.tenant_onboarding_bonus || 0,
        tenant_activation_bonus: version.rule?.tenant_activation_bonus || 0,
        card_rev_share_pct: version.rule?.card_rev_share_pct || 0,
        transfer_rev_share_pct: version.rule?.transfer_rev_share_pct || 0
      }
    }
  };
};

const submitVersion = async () => {
  try {
    const isClone = versionDialog.value.isClone;
    const form = versionDialog.value.form;
    const programId = versionDialog.value.programId;
    const sourceVersionId = versionDialog.value.sourceVersionId;
    let res;
    if (isClone) {
      res = await commissionApi.cloneVersion(sourceVersionId, {
        version_number: form.version_number,
        effective_date: form.effective_date,
        expiry_date: form.expiry_date || null,
        status: form.status
      });
    } else {
      res = await commissionApi.createVersion(programId, {
        version_number: form.version_number,
        effective_date: form.effective_date,
        expiry_date: form.expiry_date || null,
        status: form.status,
        rule: {
          tenant_onboarding_bonus: form.rule.tenant_onboarding_bonus,
          tenant_activation_bonus: form.rule.tenant_activation_bonus,
          card_rev_share_pct: form.rule.card_rev_share_pct,
          transfer_rev_share_pct: form.rule.transfer_rev_share_pct
        }
      });
    }
    if (res.data?.success) {
      $q.notify({
        color: 'positive',
        message: isClone ? 'Version cloned successfully' : 'Version created successfully',
        icon: 'check'
      });
      versionDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const promptActivateVersion = (ver) => {
  $q.dialog({
    title: 'Activate Version',
    message: `Are you sure you want to activate version v${ver.version_number}? This will deprecate the currently active version for this program.`,
    color: 'green-9',
    ok: 'ACTIVATE',
    cancel: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await commissionApi.activateVersion(ver.id);
      if (res.data?.success) {
        $q.notify({ color: 'positive', message: 'Version activated' });
        syncAllData();
      }
    } catch (err) {
      $q.notify({ color: 'negative', message: 'Failed to activate version' });
    }
  });
};

const promptDeleteProgram = (prog) => {
  $q.dialog({
    title: 'Confirm Deletion',
    message: `Are you sure you want to permanently delete the program "${prog.name}" and all its versions?`,
    color: 'red',
    ok: 'DELETE',
    cancel: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await commissionApi.deleteProgram(prog.id);
      if (res.data?.success) {
        $q.notify({ color: 'positive', message: 'Program deleted successfully' });
        syncAllData();
      }
    } catch (err) {
      $q.notify({ color: 'negative', message: 'Failed to delete program' });
    }
  });
};

const promptDeleteVersion = (ver) => {
  $q.dialog({
    title: 'Confirm Deletion',
    message: `Are you sure you want to permanently delete version v${ver.version_number}?`,
    color: 'red',
    ok: 'DELETE',
    cancel: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await commissionApi.deleteVersion(ver.id);
      if (res.data?.success) {
        $q.notify({ color: 'positive', message: 'Version deleted successfully' });
        syncAllData();
      }
    } catch (err) {
      $q.notify({ color: 'negative', message: 'Failed to delete version' });
    }
  });
};

const openRulesDialog = (ver) => {
  rulesDialog.value = {
    show: true,
    versionId: ver.id,
    form: {
      tenant_onboarding_bonus: ver.rule?.tenant_onboarding_bonus || 0,
      tenant_activation_bonus: ver.rule?.tenant_activation_bonus || 0,
      card_rev_share_pct: ver.rule?.card_rev_share_pct || 0,
      transfer_rev_share_pct: ver.rule?.transfer_rev_share_pct || 0,
      ussd_rev_share_pct: ver.rule?.ussd_rev_share_pct || 0,
      va_rev_share_pct: ver.rule?.va_rev_share_pct || 0
    }
  };
};

const submitRules = async () => {
  try {
    const res = await commissionApi.updateVersionRules(rulesDialog.value.versionId, rulesDialog.value.form);
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: 'Version rules updated successfully', icon: 'check' });
      rulesDialog.value.show = false;
      syncAllData();
      loadGlobalSettings(); // reload global defaults as well to ensure synchronization
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const openCategoryRuleDialog = (row = null) => {
  if (row) {
    categoryRuleDialog.value = {
      show: true,
      isEdit: true,
      form: {
        id: row.id,
        plan_version_id: row.plan_version_id,
        category_id: row.category_id,
        tenant_onboarding_bonus: row.tenant_onboarding_bonus || 0,
        tenant_activation_bonus: row.tenant_activation_bonus || 0,
        card_rev_share_pct: row.card_rev_share_pct || 0,
        transfer_rev_share_pct: row.transfer_rev_share_pct || 0
      }
    };
  } else {
    categoryRuleDialog.value = {
      show: true,
      isEdit: false,
      form: {
        id: null,
        plan_version_id: activeVersionOptions.value[0]?.value || '',
        category_id: merchantCategories.value[0]?.id || '',
        tenant_onboarding_bonus: 0,
        tenant_activation_bonus: 0,
        card_rev_share_pct: 0,
        transfer_rev_share_pct: 0
      }
    };
  }
};

const submitCategoryRule = async () => {
  try {
    const isEdit = categoryRuleDialog.value.isEdit;
    const form = categoryRuleDialog.value.form;
    let res;
    if (isEdit) {
      res = await commissionApi.updateCategoryRule(form.id, {
        tenant_onboarding_bonus: form.tenant_onboarding_bonus,
        tenant_activation_bonus: form.tenant_activation_bonus,
        card_rev_share_pct: form.card_rev_share_pct,
        transfer_rev_share_pct: form.transfer_rev_share_pct
      });
    } else {
      res = await commissionApi.createCategoryRule(form);
    }
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: isEdit ? 'Category override updated' : 'Category override added', icon: 'check' });
      categoryRuleDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const deleteCategoryRule = (id) => {
  $q.dialog({
    title: 'Confirm Deletion',
    message: 'Are you sure you want to remove this merchant category override rule?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const res = await commissionApi.deleteCategoryRule(id);
      if (res.data?.success) {
        $q.notify({ color: 'positive', message: 'Category override deleted', icon: 'delete' });
        syncAllData();
      }
    } catch (err) {
      $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
    }
  });
};

const openPerformanceRuleDialog = (row = null) => {
  if (row) {
    performanceRuleDialog.value = {
      show: true,
      isEdit: true,
      form: {
        id: row.id,
        plan_version_id: row.plan_version_id,
        tier_level: row.tier_level,
        tenant_threshold: row.tenant_threshold,
        bonus_amount: row.bonus_amount,
        card_rev_share_pct: row.card_rev_share_pct,
        validity_days: row.validity_days || 30
      }
    };
  } else {
    performanceRuleDialog.value = {
      show: true,
      isEdit: false,
      form: {
        id: null,
        plan_version_id: activeVersionOptions.value[0]?.value || '',
        tier_level: 2,
        tenant_threshold: 5,
        bonus_amount: 0,
        card_rev_share_pct: 0,
        validity_days: 30
      }
    };
  }
};

const submitPerformanceRule = async () => {
  try {
    const isEdit = performanceRuleDialog.value.isEdit;
    const form = performanceRuleDialog.value.form;
    let res;
    if (isEdit) {
      res = await commissionApi.updatePerformanceRule(form.id, {
        tenant_threshold: form.tenant_threshold,
        bonus_amount: form.bonus_amount,
        card_rev_share_pct: form.card_rev_share_pct,
        validity_days: form.validity_days
      });
    } else {
      res = await commissionApi.createPerformanceRule(form);
    }
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: isEdit ? 'Performance target updated' : 'Performance target added', icon: 'check' });
      performanceRuleDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const deletePerformanceRule = (id) => {
  $q.dialog({
    title: 'Confirm Deletion',
    message: 'Are you sure you want to delete this performance milestone rule?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const res = await commissionApi.deletePerformanceRule(id);
      if (res.data?.success) {
        $q.notify({ color: 'positive', message: 'Performance target deleted', icon: 'delete' });
        syncAllData();
      }
    } catch (err) {
      $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
    }
  });
};

const openTerminalRuleDialog = (row = null) => {
  if (row) {
    terminalRuleDialog.value = {
      show: true,
      isEdit: true,
      form: {
        id: row.id,
        frequency: row.frequency,
        terminal_target: row.terminal_target,
        reward_type: row.reward_type,
        reward_value: row.reward_value
      }
    };
  } else {
    terminalRuleDialog.value = {
      show: true,
      isEdit: false,
      form: {
        id: null,
        frequency: 'MONTHLY',
        terminal_target: 3,
        reward_type: 'CASH_BONUS',
        reward_value: 0
      }
    };
  }
};

const submitTerminalRule = async () => {
  try {
    const isEdit = terminalRuleDialog.value.isEdit;
    const form = terminalRuleDialog.value.form;
    let res;
    if (isEdit) {
      res = await commissionApi.updateTerminalRule(form.id, {
        frequency: form.frequency,
        terminal_target: form.terminal_target,
        reward_type: form.reward_type,
        reward_value: form.reward_value
      });
    } else {
      res = await commissionApi.createTerminalRule(form);
    }
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: isEdit ? 'Terminal goal updated' : 'Terminal goal added', icon: 'check' });
      terminalRuleDialog.value.show = false;
      syncAllData();
    }
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
  }
};

const deleteTerminalRule = (id) => {
  $q.dialog({
    title: 'Confirm Deletion',
    message: 'Are you sure you want to delete this terminal placement rule?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const res = await commissionApi.deleteTerminalRule(id);
      if (res.data?.success) {
        $q.notify({ color: 'positive', message: 'Terminal goal deleted', icon: 'delete' });
        syncAllData();
      }
    } catch (err) {
      $q.notify({ color: 'negative', message: err.response?.data?.error || 'Action failed.' });
    }
  });
};

onMounted(() => {
  // Direct route switching to specific tabs via URL search parameter or hash fragment
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab') || window.location.hash.replace('#', '');
  if (['defaults', 'approvals', 'audit', 'progress', 'plans', 'budgets', 'simulator'].includes(tabParam)) {
    tab.value = tabParam;
  }
  loadGlobalSettings();
  loadAgents();
  syncAllData();
});
</script>

<style scoped>
.command-center-page {
  font-family: 'Outfit', sans-serif;
  letter-spacing: -0.2px;
}

/* Glass Panels Style */
.bg-panel {
  background: #0d1b2a;
  border-radius: 12px;
}
.bg-subpanel {
  background: #071220;
  border-radius: 8px;
}
.bg-dark-panel {
  background: #091320;
}
.border-main {
  border: 1px solid #16324a;
}
.border-critical {
  border: 1px solid #ff5252;
}
.border-bottom {
  border-bottom: 1px solid #16324a;
}
.border-top {
  border-top: 1px solid #16324a;
}

/* KPI Card config */
.kpi-card {
  min-height: 100px;
  transition: transform 0.2s ease, border-color 0.2s ease;
  border-radius: 12px;
}
.kpi-card:hover {
  border-color: #00b8ff;
}

/* Input design styling overrides */
.custom-input :deep(.q-field__control) {
  border-radius: 6px;
  border: 1px solid #16324a;
}
.custom-input :deep(.q-field__control):hover {
  border-color: #00b8ff;
}
.custom-input :deep(.q-field__control):focus-within {
  border-color: #00b8ff;
  box-shadow: 0 0 8px rgba(0, 184, 255, 0.25);
}

.agent-info-banner {
  border-left: 4px solid #a855f7;
}

.hover-glow-btn {
  transition: all 0.2s ease;
}
.hover-glow-btn:hover:not([disabled]) {
  box-shadow: 0 0 12px rgba(0, 184, 255, 0.35);
}

.hover-lift:hover {
  transform: translateY(-3px);
  transition: transform 0.2s ease;
}

.max-width-250 {
  max-width: 250px;
}
.q-gap-16 {
  gap: 16px;
}
.opacity-70 {
  opacity: 0.7;
}
.opacity-30 {
  opacity: 0.3;
}
.animate-pulse {
  animation: map-ping-pulsing 1.8s infinite ease-out;
}
@keyframes map-ping-pulsing {
  0% { opacity: 0.8; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.8; transform: scale(0.95); }
}

.critical-indicator {
  border: 1px solid #ff5252;
}

.mt-mobile-md {
  @media (max-width: 600px) {
    margin-top: 12px;
  }
}
.hide-on-mobile {
  @media (max-width: 600px) {
    display: none;
  }
}
</style>
