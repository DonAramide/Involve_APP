<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <div v-if="tenant">
      <!-- Breadcrumbs & Header -->
      <div class="q-mb-md">
        <q-breadcrumbs class="text-grey-6" gutter="sm">
          <q-breadcrumbs-el label="Dashboards" icon="dashboard" to="/" />
          <q-breadcrumbs-el label="Tenants" icon="business" to="/tenants" />
          <q-breadcrumbs-el :label="tenant.name" />
        </q-breadcrumbs>
      </div>

      <div class="row items-center q-mb-xl">
        <q-avatar size="72px" font-size="36px" color="indigo-10" text-color="indigo-3" icon="business" class="q-mr-md shadow-2" />
        <div class="col">
          <div class="row items-center q-gutter-sm">
            <h1 class="text-h4 text-weight-bold q-ma-none">{{ tenant.name }}</h1>
            <q-chip :color="tenant.status === 'active' ? 'green-10' : 'red-10'" text-color="white" size="md">
              {{ tenant.status?.toUpperCase() }}
            </q-chip>
          </div>
          <div class="text-grey-5">{{ tenant.type?.toUpperCase() }} • Plan: {{ tenant.plan?.toUpperCase() }} • ID: {{ tenant.id }}</div>
        </div>
        <div class="col-auto">
          <q-btn 
          color="amber-8" 
          text-color="black"
          icon="vpn_key" 
          label="Generate Activation Code" 
          @click="openActivationShortcut" 
          class="q-mr-sm text-weight-bold animate-pulse-amber" 
        >
          <q-tooltip>Instantly generate and certify a secure terminal activation code for this tenant</q-tooltip>
        </q-btn>
        <q-btn outline color="indigo-4" icon="edit" label="Edit" @click="openEditModal" class="q-mr-sm" />
        <q-btn 
          outline 
          :color="tenant.status === 'active' ? 'orange-8' : 'green-6'" 
          :icon="tenant.status === 'active' ? 'block' : 'check_circle'" 
          :label="tenant.status === 'active' ? 'Suspend' : 'Activate'" 
          @click="toggleStatus" 
          class="q-mr-sm text-weight-bold" 
        />
        <q-btn outline color="red-5" icon="lock_reset" label="Reset Password" @click="resetPassword" class="q-mr-sm text-weight-bold" />
        <q-btn 
          color="red-10" 
          icon="lock" 
          label="Emergency Lock" 
          @click="triggerEmergencyLock" 
          class="q-mr-sm text-weight-bold animate-pulse-amber" 
        />
        <q-btn flat color="grey-6" icon="refresh" @click="fetchDetails" />
        <div v-if="tenant?.is_emergency_locked" class="q-ml-sm q-px-sm q-py-xs bg-red-1 text-red-10 rounded-borders text-caption text-weight-bold row items-center">
          <q-icon name="lock" size="xs" class="q-mr-xs" />
          CODE: {{ tenant.emergency_lock_code }}
        </div>
      </div>
    </div>

    <!-- Tabbed Content -->
    <q-card class="bg-blue-grey-10 shadow-2 overflow-hidden">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey-5 bg-blue-grey-10 shadow-2"
        active-color="cyan-4"
        indicator-color="cyan-4"
        align="left"
        narrow-indicator
      >
        <q-tab name="overview" label="Overview" icon="analytics" />
        <q-tab name="financial" label="Financial Platform" icon="account_balance" />
        <q-tab name="kyc" label="KYC & Compliance" icon="verified_user" />
        <q-tab name="users" label="Users" icon="person" />
        <q-tab name="wallet" label="Wallet & Transactions" icon="wallet" />
        <q-tab name="usage" label="AI Usage" icon="psychology" />
        <q-tab name="certificates" label="Licenses" icon="workspace_premium" />
        <q-tab name="records" label="Audit Records" icon="history" />
      </q-tabs>

      <q-separator dark />

      <q-tab-panels v-model="tab" keep-alive class="bg-blue-grey-10 text-white min-height-400">
        <!-- Overview Panel -->
        <q-tab-panel name="overview">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <div class="text-subtitle1 text-indigo-3 q-mb-md">Organization Details</div>
              <q-list bordered separator dark class="rounded-borders">
                <q-item>
                  <q-item-section class="text-grey-5">Type</q-item-section>
                  <q-item-section side class="text-white">{{ tenant.type }}</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-grey-5">Registered</q-item-section>
                  <q-item-section side class="text-white">{{ new Date(tenant.created_at).toLocaleString() }}</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-grey-5">Plan Expiry</q-item-section>
                  <q-item-section side>
                    <q-chip :color="!tenant.plan_expires_at ? 'grey-9' : (new Date(tenant.plan_expires_at) < new Date() ? 'red-10' : 'indigo-9')" 
                            text-color="white" dense size="sm">
                      {{ tenant.plan_expires_at ? new Date(tenant.plan_expires_at).toLocaleDateString() : 'PERMANENT' }}
                    </q-chip>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-grey-5">API Key Status</q-item-section>
                  <q-item-section side>
                    <q-chip :icon="tenant.quasar_api_key ? 'verified' : 'warning'" 
                            :color="tenant.quasar_api_key ? 'green-9' : 'orange-9'" 
                            dense size="xs" text-color="white">
                      {{ tenant.quasar_api_key ? 'CONFIGURED' : 'NOT SET' }}
                    </q-chip>
                  </q-item-section>
                </q-item>
              </q-list>

              <!-- Registered Devices Section -->
              <div class="q-mt-lg" v-if="registeredDevices.length > 0">
                <div class="text-subtitle1 text-indigo-3 q-mb-sm row items-center">
                  <q-icon name="devices" class="q-mr-sm" size="sm" />
                  Registered Devices
                  <q-badge :label="`${registeredDevices.length} Device${registeredDevices.length > 1 ? 's' : ''}`"
                    :color="registeredDevices.length > 1 ? 'deep-purple-7' : 'grey-7'"
                    class="q-ml-sm text-weight-bold" />
                </div>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="dev in registeredDevices"
                    :key="dev.deviceId"
                    class="col-12"
                  >
                    <q-card class="bg-blue-grey-9 q-pa-sm rounded-borders" flat bordered>
                      <div class="row items-center no-wrap q-gutter-sm">
                        <q-avatar size="36px" color="indigo-9" text-color="indigo-3" icon="phone_android" />
                        <div class="col">
                          <div class="row items-center q-gutter-x-md">
                            <div>
                              <div class="text-caption text-grey-5">Device ID</div>
                              <div class="text-weight-bold text-white" style="font-family: monospace; font-size: 12px;">
                                {{ dev.deviceId || 'UNASSIGNED' }}
                              </div>
                            </div>
                            <div>
                              <div class="text-caption text-grey-5">Agent Code</div>
                              <q-chip dense size="sm" color="indigo-9" text-color="indigo-3" icon="badge" class="text-weight-bold">
                                {{ dev.agentCode || 'AAA000' }}
                              </q-chip>
                            </div>
                            <div v-if="dev.location">
                              <div class="text-caption text-grey-5">Location</div>
                              <div class="text-white text-caption">{{ dev.location }}</div>
                            </div>
                            <q-space />
                            <div class="text-right">
                              <div class="text-caption text-grey-5">Device #{{ dev.deviceNumber }}</div>
                              <div class="text-caption text-grey-6">{{ dev.ownerName }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </q-card>
                  </div>
                </div>
              </div>

              <!-- No devices registered yet (fallback) -->
              <div class="q-mt-lg" v-else>
                <div class="text-subtitle1 text-indigo-3 q-mb-sm row items-center">
                  <q-icon name="devices" class="q-mr-sm" size="sm" />
                  Registered Devices
                </div>
                <div class="text-grey-6 text-caption q-pa-md bg-blue-grey-9 rounded-borders text-center">
                  <q-icon name="device_unknown" size="sm" class="q-mr-xs" />
                  No device registrations found. Devices are registered when the mobile app activates.
                </div>
              </div>

              <!-- Location Map -->
              <div class="q-mt-lg" v-if="parsedLocation">
                <div class="text-subtitle2 text-indigo-3 q-mb-sm row items-center cursor-pointer" @click="openGoogleMaps(parsedLocation.query)">
                  <q-icon name="place" class="q-mr-sm" size="xs" /> Registered Location Map (Click to View)
                </div>
                <div style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); height: 250px;">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    scrolling="no" 
                    marginheight="0" 
                    marginwidth="0" 
                    :src="`https://maps.google.com/maps?q=${parsedLocation.query}&z=15&output=embed`">
                  </iframe>
                </div>
              </div>

            </div>
            <div class="col-12 col-md-6 text-center flex flex-center">
              <div v-if="wallet">
                <div class="text-overline text-grey-5">Current Wallet Balance</div>
                <div class="text-h2 text-weight-bolder text-cyan-4">{{ currentCurrency.symbol }}{{ (wallet.balance || 0).toLocaleString() }}</div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  {{ wallet.updated_at ? `Last updated ${new Date(wallet.updated_at).toLocaleTimeString()}` : 'No balance history yet' }}
                </div>
              </div>
            </div>
            <!-- Virtual Account Details Card -->
            <div class="col-12 q-mt-lg" v-if="tenant.virtual_account_number">
              <q-card class="bg-white text-black shadow-4 rounded-borders q-pa-md" style="max-width: 600px; margin: 0 auto; border-radius: 12px;">
                <q-card-section class="text-center">
                  <q-avatar size="60px" color="deep-purple-5" text-color="white" class="q-mb-md relative-position">
                    <span class="text-h5 text-weight-bold">{{ tenant.name.charAt(0).toUpperCase() }}</span>
                    <q-badge floating color="white" text-color="black" rounded style="bottom: 0; right: 0; top: auto;">
                      <q-icon name="security" size="xs" />
                    </q-badge>
                  </q-avatar>
                  <div class="text-h6 text-weight-bolder letter-spacing-1">{{ tenant.name.toUpperCase() }}</div>
                  <div class="text-subtitle2 text-grey-7">{{ tenant.virtual_account_bank }}</div>
                  
                  <div class="q-mt-md">
                    <q-chip color="deep-purple-1" text-color="deep-purple-9" class="text-weight-bold" size="lg">
                      {{ tenant.virtual_account_number }}
                    </q-chip>
                  </div>
                </q-card-section>

                <q-card-section>
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                      <div class="bg-blue-1 q-pa-md rounded-borders" style="height: 100%; border-radius: 8px;">
                        <div class="text-subtitle2 text-blue-9 q-mb-md row items-center">
                          <q-icon name="account_balance" class="q-mr-sm" size="sm" />
                          Bank Information
                        </div>
                        
                        <div class="q-mb-sm">
                          <div class="text-caption text-blue-5">Bank Name</div>
                          <div class="text-weight-bold">{{ tenant.virtual_account_bank }}</div>
                        </div>
                        <div class="q-mb-sm">
                          <div class="text-caption text-blue-5">Bank Code</div>
                          <div class="text-weight-bold">{{ tenant.virtual_account_bank_code || 'N/A' }}</div>
                        </div>
                        <div>
                          <div class="text-caption text-blue-5">Account Type</div>
                          <div class="text-weight-bold">Virtual Account</div>
                        </div>
                      </div>
                    </div>

                    <div class="col-12 col-sm-6">
                      <div class="bg-purple-1 q-pa-md rounded-borders" style="height: 100%; border-radius: 8px;">
                        <div class="text-subtitle2 text-purple-9 q-mb-md row items-center">
                          <q-icon name="payments" class="q-mr-sm" size="sm" />
                          Account Status
                        </div>
                        
                        <div class="q-mb-sm">
                          <div class="text-caption text-purple-5">Operating Account</div>
                          <div class="text-weight-bold">{{ tenant.virtual_account_number }}</div>
                        </div>
                        <div class="q-mb-sm">
                          <div class="text-caption text-purple-5">Status</div>
                          <div>
                            <q-chip color="green-2" text-color="green-9" dense size="sm" class="text-weight-bold q-ma-none">
                              {{ tenant.virtual_account_status || 'ACTIVE' }}
                            </q-chip>
                          </div>
                        </div>
                        <div>
                          <div class="text-caption text-purple-5">Date Created</div>
                          <div class="text-weight-bold">{{ new Date(tenant.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </q-card-section>
                
                <q-card-section class="text-center text-grey-5 text-caption q-pt-none">
                  Virtual account details • {{ new Date().getFullYear() }}
                </q-card-section>
              </q-card>
            </div>
            
            <!-- Missing Virtual Account Prompt -->
            <div class="col-12 q-mt-lg text-center" v-else>
              <q-btn 
                color="deep-purple-5" 
                icon="account_balance" 
                label="Request Virtual Account" 
                @click="requestVirtualAccount" 
                :loading="isRequestingVA" 
                rounded
                unelevated
                size="md"
              />
              <div class="text-caption text-grey-6 q-mt-sm">No virtual account has been provisioned via Quasar SDK yet.</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Financial Platform Panel -->
        <q-tab-panel name="financial">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-4">
              <!-- Status & Actions Card -->
              <q-card class="bg-blue-grey-9 border-cyan flat bordered rounded-borders q-pa-md text-center" style="height: 100%">
                <q-avatar size="80px" color="indigo-10" text-color="cyan-3" icon="account_balance" class="q-mb-md" />
                <div class="text-h6 text-white text-weight-bold q-mb-sm">Financial Platform State</div>
                <div class="q-mb-lg">
                  <q-chip 
                    :color="financialHealth?.platformStatus === 'ACTIVE' ? 'green-9' : (financialHealth?.platformStatus === 'DEGRADED' ? 'orange-9' : 'red-9')" 
                    text-color="white" 
                    size="md" 
                    class="text-weight-bold">
                    {{ financialHealth?.platformStatus || 'UNPROVISIONED' }}
                  </q-chip>
                  <div class="text-caption text-grey-5 q-mt-xs">
                    {{ financialHealth?.environment || 'Environment: Unknown' }}
                  </div>
                </div>

                <div class="row q-gutter-sm justify-center">
                  <q-btn 
                    v-if="!financialHealth || financialHealth?.platformStatus === 'UNPROVISIONED'"
                    color="cyan-6" 
                    text-color="black"
                    icon="flash_on" 
                    label="Activate Platform" 
                    @click="activateFinancialPlatform" 
                    :loading="activatingPlatform"
                    class="text-weight-bold" 
                  />
                  <q-btn 
                    v-if="financialHealth?.platformStatus === 'ACTIVE' || financialHealth?.platformStatus === 'DEGRADED'"
                    outline 
                    color="amber-8" 
                    icon="sync" 
                    label="Rotate Credentials" 
                    @click="rotateFinancialPlatform" 
                    :loading="rotatingPlatform"
                    class="text-weight-bold" 
                  />
                  <q-btn
                    outline
                    color="deep-purple-4"
                    icon="swap_horiz"
                    label="Change Vertical"
                    @click="openChangeVerticalDialog"
                    :loading="changingVertical"
                    class="text-weight-bold"
                  />
                </div>
              </q-card>
            </div>

            <div class="col-12 col-md-8">
              <!-- Diagnostics Panel -->
              <q-card class="bg-blue-grey-9 flat bordered rounded-borders q-pa-md border-indigo" style="height: 100%">
                <div class="text-subtitle1 text-indigo-3 q-mb-md row items-center">
                  <q-icon name="health_and_safety" class="q-mr-sm" size="sm" />
                  Platform Diagnostics & Health
                  <q-space />
                  <q-chip outline color="cyan-4" size="sm" class="text-weight-bold">
                    API: {{ financialHealth?.apiVersion || 'v1' }}
                  </q-chip>
                </div>
                
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-list dark separator class="rounded-borders">
                      <q-item>
                        <q-item-section>
                          <q-item-label class="text-grey-5">Quasar Provider Status</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon 
                            :name="financialHealth?.quasarStatus === 'up' ? 'check_circle' : 'error'" 
                            :color="financialHealth?.quasarStatus === 'up' ? 'green-4' : 'red-4'" 
                            size="sm"
                          />
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>
                          <q-item-label class="text-grey-5">Vault Secure Storage</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon 
                            :name="financialHealth?.vaultStatus === 'up' ? 'check_circle' : 'error'" 
                            :color="financialHealth?.vaultStatus === 'up' ? 'green-4' : 'red-4'" 
                            size="sm"
                          />
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>
                          <q-item-label class="text-grey-5">Credential Validity</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <div class="text-white text-caption text-weight-bold">
                            {{ financialHealth?.credentialValidity ? 'VALID' : 'INVALID/NONE' }}
                          </div>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>

                  <div class="col-12 col-sm-6">
                    <q-list dark separator class="rounded-borders">
                      <q-item>
                        <q-item-section>
                          <q-item-label class="text-grey-5">Circuit Breaker</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip :color="financialHealth?.circuitBreakerStatus === 'closed' ? 'green-9' : 'red-9'" size="sm" text-color="white">
                            {{ financialHealth?.circuitBreakerStatus?.toUpperCase() || 'UNKNOWN' }}
                          </q-chip>
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>
                          <q-item-label class="text-grey-5">API Latency</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <div class="text-white text-caption font-mono">
                            {{ financialHealth?.apiLatencyMs ? financialHealth.apiLatencyMs + 'ms' : '--' }}
                          </div>
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>
                          <q-item-label class="text-grey-5">Last Health Check</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <div class="text-white text-caption">
                            {{ financialHealth?.lastHealthCheck ? new Date(financialHealth.lastHealthCheck).toLocaleTimeString() : '--' }}
                          </div>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>
                </div>
              </q-card>
            </div>

            <!-- Audit Timeline -->
            <div class="col-12 q-mt-lg">
              <div class="text-subtitle1 text-indigo-3 q-mb-md row items-center">
                <q-icon name="timeline" class="q-mr-sm" size="sm" />
                Operational History & Audit Timeline
              </div>
              <q-card class="bg-blue-grey-10 flat border-cyan q-pa-md">
                <div v-if="financialAudit.length > 0">
                  <q-timeline color="cyan-4" dark>
                    <q-timeline-entry
                      v-for="(event, idx) in financialAudit"
                      :key="idx"
                      :title="event.action"
                      :subtitle="new Date(event.timestamp).toLocaleString()"
                      :color="event.status === 'success' ? 'green-4' : 'red-4'"
                      :icon="event.status === 'success' ? 'check' : 'warning'"
                    >
                      <div class="text-caption text-grey-4">Operator: {{ event.operatorId }}</div>
                      <div class="text-caption font-mono text-grey-6 q-mt-xs" style="font-size: 11px;">Audit ID: {{ event.auditId }}</div>
                    </q-timeline-entry>
                  </q-timeline>
                </div>
                <div v-else class="text-center q-pa-xl text-grey-6">
                  <q-icon size="2em" name="history" class="q-mb-sm block mx-auto" />
                  No financial operational history found.
                </div>
              </q-card>
            </div>

          </div>
        </q-tab-panel>

        <!-- Users Panel -->
        <q-tab-panel name="users" class="q-pa-none">
          <q-table
            :rows="users"
            :columns="[
              { name: 'name', label: 'NAME', field: 'name', align: 'left', sortable: true },
              { name: 'email', label: 'EMAIL', field: 'email', align: 'left', sortable: true },
              { name: 'phone', label: 'PHONE', field: 'phone', align: 'left' },
              { name: 'role', label: 'ROLE', field: 'role', align: 'center', format: val => val?.toUpperCase() },
              { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
            ]"
            row-key="id"
            flat
            dark
            class="bg-blue-grey-10"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip :color="props.value === 'active' ? 'green-9' : 'grey-8'" text-color="white" size="xs" dense>
                  {{ props.value?.toUpperCase() || 'OFFLINE' }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Wallet Panel -->
        <q-tab-panel name="wallet">
          <div class="row q-col-gutter-md">
            <!-- Parent Account Info -->
            <div class="col-12 col-md-4">
              <q-card bordered flat class="bg-blue-grey-9 border-indigo">
                <q-card-section>
                  <div class="text-overline text-indigo-3">Parent Account (Master)</div>
                  <div v-if="wallet.subAccount">
                    <!-- Standard Subaccount info if available -->
                    <div v-if="wallet.subAccount.bank_name || wallet.subAccount.account_number">
                      <div class="text-h6">{{ wallet.subAccount.bank_name }}</div>
                      <div class="text-h4 text-weight-bold letter-spacing-1 q-my-sm text-cyan-4">{{ wallet.subAccount.account_number }}</div>
                      <div class="text-caption text-grey-5">Account Name: {{ wallet.subAccount.account_name }}</div>
                    </div>
                    <!-- Quasar SDK Wallet Object info fallback -->
                    <div v-else>
                      <div class="text-h6 text-indigo-2">{{ wallet.subAccount.walletType?.toUpperCase() || 'SCHOOL_WALLET' }}</div>
                      <div class="text-h4 text-weight-bold letter-spacing-1 q-my-sm text-cyan-4">{{ currentCurrency.symbol }}{{ (wallet.subAccount.balance || 0).toLocaleString() }}</div>
                      <div class="text-caption text-grey-5">Wallet ID: <span class="text-grey-4">{{ wallet.subAccount.id }}</span></div>
                      <div class="text-caption text-grey-6">Owner Type: {{ wallet.subAccount.ownerType?.toUpperCase() || 'SCHOOL' }}</div>
                    </div>
                  </div>
                  <div v-else class="text-grey-6 q-pa-md">No parent sub-account configured via Quasar SDK.</div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Virtual Accounts Inventory -->
            <div class="col-12 col-md-8">
              <div class="text-subtitle2 text-grey-5 q-mb-sm">Generated Virtual Accounts (Static Dedicated NUBAN)</div>
              <div class="row q-col-gutter-sm">
                <div v-for="acc in wallet.virtualAccounts" :key="acc.account_number" class="col-12 col-sm-6">
                  <q-card flat bordered class="bg-blue-grey-10 border-cyan">
                    <q-card-section class="q-pa-sm">
                      <div class="row items-center no-wrap">
                        <q-avatar icon="account_balance" color="cyan-10" text-color="cyan-3" size="32px" />
                        <div class="q-ml-sm overflow-hidden full-width">
                          <div class="text-weight-bold text-white no-wrap ellipsis">{{ acc.account_number }}</div>
                          <div class="text-caption text-grey-5 no-wrap ellipsis">{{ acc.bank_name }} • {{ acc.type || 'STATIC' }}</div>
                          <div class="text-caption text-indigo-3 no-wrap ellipsis">{{ acc.account_name }}</div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
                <div v-if="!wallet.virtualAccounts?.length" class="col-12 text-grey-7 q-pa-lg text-center border-dashed rounded-borders">
                  No virtual accounts generated for this tenant.
                </div>
              </div>
            </div>

            <!-- All Tenant Wallets Inventory -->
            <div class="col-12 q-mt-md" v-if="wallet.allWallets && wallet.allWallets.length">
              <div class="text-subtitle2 text-grey-5 q-mb-sm">All Quasar Tenant Wallets</div>
              <div class="row q-col-gutter-sm">
                <div v-for="w in wallet.allWallets" :key="w.id" class="col-12 col-sm-6 col-md-3">
                  <q-card flat bordered class="bg-blue-grey-9 border-indigo">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-indigo-3 text-weight-bold">{{ w.walletType?.toUpperCase() || 'WALLET' }}</div>
                      <div class="text-h6 text-white q-my-xs">{{ currentCurrency.symbol }}{{ (w.balance || 0).toLocaleString() }}</div>
                      <div class="text-caption text-grey-5 ellipsis">Owner: {{ w.ownerType?.toUpperCase() }}</div>
                      <div class="text-caption text-grey-6 ellipsis" style="font-size: 10px;">{{ w.id }}</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>

            <!-- Transactions Table -->
            <div class="col-12 q-mt-lg">
              <div class="text-subtitle1 text-indigo-3 q-mb-md">Consolidated Transaction Ledger</div>
              <q-table
                :rows="wallet.transactions"
                :columns="[
                  { name: 'date', label: 'DATE', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString() },
                  { name: 'type', label: 'TYPE', field: 'type', align: 'center' },
                  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right' },
                  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left' }
                ]"
                row-key="id"
                flat
                dark
                dense
                class="bg-blue-grey-10"
              >
                <template v-slot:body-cell-amount="props">
                  <q-td :props="props" :class="props.row.amount >= 0 ? 'text-green-4' : 'text-red-4'">
                    {{ props.row.amount >= 0 ? '+' : '' }}{{ currentCurrency.symbol }}{{ Math.abs(props.row.amount).toLocaleString() }}
                  </q-td>
                </template>
                <template v-slot:body-cell-type="props">
                  <q-td :props="props">
                    <q-chip outline :color="props.row.amount >= 0 ? 'green-4' : 'red-4'" size="xs" dense>
                      {{ props.row.amount >= 0 ? 'CREDIT' : 'DEBIT' }}
                    </q-chip>
                  </q-td>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- AI Usage Panel -->
        <q-tab-panel name="usage">
          <div class="text-subtitle1 text-indigo-3 q-mb-md">Recent AI Activity</div>
          <div v-if="recentUsage?.length">
            <q-list dark separator>
              <q-item v-for="log in recentUsage" :key="log.id">
                <q-item-section avatar><q-icon name="psychology" color="purple-4" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ log.request_type }}</q-item-label>
                  <q-item-label caption class="text-grey-6">{{ new Date(log.created_at).toLocaleString() }}</q-item-label>
                </q-item-section>
                <q-item-section side class="text-white">{{ log.tokens_used }} tokens</q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-else class="text-center q-pa-xl text-grey-6">No AI usage recorded for this tenant yet.</div>
        </q-tab-panel>

        <!-- Certificates Panel -->
        <q-tab-panel name="certificates" class="q-pa-none">
          <q-table
            :rows="certificates"
            :columns="[
              { name: 'code', label: 'ACTIVATION KEY', field: 'code', align: 'left', style: 'font-family: monospace; letter-spacing: 1px;' },
              { name: 'deviceId', label: 'DEVICE ID', field: 'deviceId', align: 'left' },
              { name: 'plan', label: 'PLAN', field: 'plan', align: 'center' },
              { name: 'duration', label: 'DURATION', field: 'duration', align: 'center' },
              { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
              { name: 'expiry', label: 'EXPIRY DATE', field: 'expiry', align: 'right' },
              { name: 'actions', label: '', field: 'actions', align: 'right' }
            ]"
            row-key="code"
            flat
            dark
            class="bg-blue-grey-10"
          >
            <template v-slot:body-cell-deviceId="props">
              <q-td :props="props">
                <div v-if="props.row.deviceId" class="row items-center no-wrap q-gutter-x-xs">
                  <q-icon name="phone_android" color="indigo-3" size="xs" />
                  <span style="font-family: monospace; font-size: 11px; letter-spacing: 0.5px;" class="text-cyan-3">
                    {{ props.row.deviceId }}
                  </span>
                  <q-btn flat dense round icon="content_copy" size="xs" color="grey-5"
                    @click.stop="navigator.clipboard.writeText(props.row.deviceId).then(() => $q.notify({ type: 'positive', message: 'Device ID copied!' }))">
                    <q-tooltip>Copy Device ID</q-tooltip>
                  </q-btn>
                </div>
                <q-chip v-else icon="hourglass_empty" color="blue-grey-8" text-color="amber-4" size="xs" dense>
                  Awaiting Activation
                  <q-tooltip>This activation key has not yet been claimed by a device</q-tooltip>
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip :color="props.row.status === 'ACTIVE' ? 'green-9' : 'red-9'" text-color="white" size="xs" dense>
                  {{ props.row.status }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-code="props">
              <q-td :props="props" class="text-amber-3 text-weight-bold" style="font-family: monospace;">
                {{ props.row.code }}
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn flat dense round icon="visibility" color="cyan-4" @click="reviewCertificate(props.row)" size="sm">
                  <q-tooltip>Review Certificate</q-tooltip>
                </q-btn>
                <q-btn v-if="isSuperAdmin && props.row.status === 'USED'" flat dense round icon="restore" color="orange-4" @click="resetActivationKey(props.row)" size="sm" class="q-ml-xs">
                  <q-tooltip>Reset Activation Key (Reuse)</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>
        <!-- KYC Panel -->
        <q-tab-panel name="kyc">
          <div class="text-subtitle1 text-indigo-3 q-mb-md">KYC & Compliance Verification</div>
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-card flat bordered class="bg-blue-grey-9 border-amber">
                <q-card-section>
                  <div class="text-overline text-amber-3">Owner Contact & Business Profile</div>
                  <q-list dark separator class="q-mt-sm">
                    <q-item>
                      <q-item-section>Owner Name</q-item-section>
                      <q-item-section side class="text-white">{{ ownerDisplayName }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>Email</q-item-section>
                      <q-item-section side class="text-white">{{ ownerProfile.email || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>Phone</q-item-section>
                      <q-item-section side class="text-white">{{ ownerProfile.phone || tenant.phone || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>Business / Trade Name</q-item-section>
                      <q-item-section side class="text-white">{{ ownerProfile.businessName || tenant.name || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item v-if="ownerProfile.city || ownerProfile.country">
                      <q-item-section>Profile Location</q-item-section>
                      <q-item-section side class="text-white">
                        {{ [ownerProfile.city, ownerProfile.country].filter(Boolean).join(', ') || 'Not Provided' }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 border-indigo">
                <q-card-section>
                  <div class="text-overline text-indigo-3">Business Information</div>
                  <q-list dark separator class="q-mt-sm">
                    <q-item>
                      <q-item-section>Registration Number</q-item-section>
                      <q-item-section side class="text-white">{{ tenant.kyc_data?.rc_number || tenant.settings?.cacNumber || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>Tax ID (TIN)</q-item-section>
                      <q-item-section side class="text-white">{{ tenant.kyc_data?.tax_id || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>Overall KYC Status</q-item-section>
                      <q-item-section side>
                        <q-chip :color="tenant.kyc_status === 'APPROVED' ? 'green-9' : (tenant.kyc_status === 'PENDING' ? 'orange-9' : 'grey-9')" text-color="white" size="sm">
                          {{ tenant.kyc_status || 'NOT UPLOADED' }}
                        </q-chip>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 border-cyan">
                <q-card-section>
                  <div class="text-overline text-cyan-3">Verification Documents</div>
                  <q-list dark separator class="q-mt-sm">
                    <q-item v-for="doc in kycDocuments" :key="doc.id">
                      <q-item-section>
                        <q-item-label class="text-weight-bold">{{ doc.document_type.replace('_', ' ') }}</q-item-label>
                        <q-item-label caption class="text-grey-5">{{ new Date(doc.created_at).toLocaleDateString() }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <div class="row items-center no-wrap">
                          <q-btn flat dense icon="launch" label="View" type="a" target="_blank" :href="doc.document_url" color="cyan-4" size="sm" class="q-mr-sm" />
                          <q-chip :color="doc.status === 'VERIFIED' ? 'green-9' : 'orange-9'" text-color="white" size="sm" icon="check_circle">
                            {{ doc.status }}
                          </q-chip>
                        </div>
                      </q-item-section>
                    </q-item>
                    <div v-if="kycDocuments.length === 0" class="text-center q-pa-md text-grey-5">
                      No documents uploaded yet.
                    </div>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
            
            <div class="col-12 q-mt-md">
              <q-card flat bordered class="bg-blue-grey-9 border-teal">
                <q-card-section>
                  <div class="text-overline text-teal-3">Address Information</div>
                  <q-list dark separator class="q-mt-sm">
                    <q-item>
                      <q-item-section>Street Address</q-item-section>
                      <q-item-section side class="text-white">{{ tenant.kyc_data?.streetAddress || tenant.street_address || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>City / LGA</q-item-section>
                      <q-item-section side class="text-white">{{ tenant.kyc_data?.lga || tenant.lga || ownerProfile.city || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>State / Region</q-item-section>
                      <q-item-section side class="text-white">{{ tenant.kyc_data?.state || tenant.state || 'Not Provided' }}</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>Country</q-item-section>
                      <q-item-section side class="text-white">{{ tenant.kyc_data?.country || tenant.country || ownerProfile.country || 'Not Provided' }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Audit Records Panel -->
        <q-tab-panel name="records" class="q-pa-none">
          <q-table
            :rows="auditRecords"
            :columns="[
              { name: 'timestamp', label: 'DATE', field: 'timestamp', align: 'left', format: val => new Date(val).toLocaleString(), sortable: true },
              { name: 'module', label: 'MODULE', field: 'module', align: 'left' },
              { name: 'action', label: 'ACTION', field: 'action', align: 'left' },
              { name: 'operator', label: 'OPERATOR', field: 'user_name', align: 'left' },
              { name: 'target', label: 'TARGET', field: 'target', align: 'left' },
              { name: 'ip_address', label: 'IP ADDRESS', field: 'ip_address', align: 'center' },
              { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
            ]"
            row-key="id"
            flat
            dark
            class="bg-blue-grey-10"
            :pagination="{ rowsPerPage: 25 }"
            :rows-per-page-options="[25, 50, 100]"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip :color="props.value === 'success' ? 'green-9' : 'red-9'" text-color="white" size="xs" dense>
                  {{ props.value?.toUpperCase() }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-action="props">
              <q-td :props="props">
                <span :class="(props.row.action || '').includes('CREATE') ? 'text-green-3' : ((props.row.action || '').includes('SUSPEND') || (props.row.action || '').includes('DELETE') || (props.row.action || '').includes('EMERGENCY') ? 'text-red-3' : 'text-blue-3')">
                  {{ props.row.action }}
                </span>
              </q-td>
            </template>
            <template v-slot:no-data>
              <div class="full-width row flex-center q-pa-xl text-grey-6">
                <q-icon size="2em" name="history" />
                <span class="q-ml-sm">No audit records found for this tenant.</span>
              </div>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- SHORTCUT ACTIVATION CONFIG DIALOG -->
    <q-dialog v-model="showShortcutDialog" persistent>
      <q-card style="min-width: 420px" class="bg-grey-9 text-white border-gold rounded-borders shadow-24">
        <q-card-section class="bg-indigo-10 text-white q-py-md">
          <div class="text-h6 text-weight-bold row items-center op-gap-8 no-wrap">
            <q-icon name="vpn_key" color="amber-8" />
            <span>Generate Terminal Activation</span>
          </div>
          <div class="text-caption text-indigo-3 q-mt-xs">Instantly authorize a new POS/mobile terminal for {{ tenant.name }}</div>
        </q-card-section>

        <q-card-section class="q-pt-lg q-px-lg">
          <q-select
            v-model="shortcutConfig.duration"
            :options="durationOptions"
            label="License Duration"
            dark filled 
            emit-value map-options
            class="q-mb-md font-mono"
            label-color="indigo-3"
          />

          <q-select
            v-model="shortcutConfig.planIndex"
            :options="planOptions"
            label="Service Plan Level"
            dark filled 
            emit-value map-options
            class="q-mb-md font-mono"
            label-color="indigo-3"
          />

          <q-select
            v-model="shortcutConfig.deviceSuffix"
            :options="deviceOptions"
            label="Select Device ID / Suffix"
            dark filled
            emit-value map-options
            use-input
            new-value-mode="add-unique"
            hint="Select a registered device or type a new suffix manually"
            class="font-mono q-mb-md"
            label-color="indigo-3"
          />
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-10 q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" class="text-weight-bold" v-close-popup />
          <q-btn color="amber-8" text-color="black" label="Generate License Key" class="text-weight-bold" @click="generateShortcutCode" :loading="generating" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- LUXURY LICENSE CERTIFICATE DIALOG -->
    <q-dialog v-model="showSuccessDialog" persistent transition-show="scale" transition-hide="scale">
      <q-card class="certificate-card relative-position overflow-hidden shadow-24" style="min-width: 650px; max-height: 90vh; display: flex; flex-direction: column;">
        
        <!-- Watermark Background -->
        <div class="absolute-center full-width text-center no-pointer-events" style="opacity: 0.03; font-size: 10rem; transform: translate(-50%, -50%) rotate(-30deg); font-weight: 900; color: white;">INVIFY</div>

        <!-- Scrollable Content -->
        <q-card-section class="q-pa-xl text-center scroll" id="printable-certificate" style="flex: 1;">
          <div class="column items-center q-mb-xl">
             <div class="q-mb-sm">
                <img :src="logo" style="height: 120px; width: auto; object-fit: contain;" />
             </div>
             <div class="text-overline text-amber-2 letter-spacing-10 q-mt-none opacity-8">LICENSED TERMINAL</div>
          </div>
          
          <div class="q-my-xl">
             <div class="text-caption text-amber-2 text-weight-medium uppercase letter-spacing-3 q-mb-sm">CERTIFIED FOR OPERATION</div>
             <div class="text-h2 text-weight-bold text-white q-my-md text-shadow-glow" style="font-size: 2.2rem; margin-bottom: 4px;">{{ certificateData.businessName }}</div>
             <div class="q-my-md q-py-sm" style="background: rgba(251, 191, 36, 0.1); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3);">
                <span class="text-overline text-grey-4 q-mr-sm">DEVICE ID:</span> 
                <span class="text-amber-5 text-weight-bolder font-mono text-h6" style="letter-spacing: 2px;">{{ certificateData.deviceId || 'AWAITING-PROVISION' }}</span>
             </div>
             <div class="row justify-center items-center q-gutter-sm no-wrap">
                <div class="text-subtitle1 text-grey-4">Licensed Mode:</div>
                <div class="text-subtitle1 text-amber-5 text-weight-bolder uppercase">{{ certificateData.mode }}</div>
             </div>
          </div>

          <!-- Info Grid -->
          <div class="row q-col-gutter-xl q-my-xl justify-center">
            <div class="col-4 border-right-grey">
              <div class="text-caption text-amber-2 text-weight-bold">PLAN LEVEL</div>
              <div class="text-h6 text-white text-weight-medium">{{ certificateData.plan }}</div>
            </div>
            <div class="col-4 border-right-grey">
              <div class="text-caption text-amber-2 text-weight-bold">VALIDITY</div>
              <div class="text-h6 text-white text-weight-medium">{{ certificateData.duration }}</div>
            </div>
            <div class="col-4">
              <div class="text-caption text-amber-2 text-weight-bold">EXPIRATION</div>
              <div class="text-h6 text-white text-weight-medium">{{ certificateData.expiry }}</div>
            </div>
          </div>

          <!-- Secure Code Area -->
          <div class="code-container q-pa-lg q-mt-md">
             <div class="text-overline text-amber-3 letter-spacing-5 q-mb-md">SECURE ACTIVATION KEY</div>
             <div class="text-h2 text-weight-bolder text-amber-5 font-mono code-glow" style="font-size: 2.5rem;">{{ lastGeneratedCode }}</div>
             <div class="q-mt-lg flex flex-center">
               <div style="padding: 10px; background: white; border-radius: 8px; display: inline-block;">
                 <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&amp;data=' + lastGeneratedCode" style="width: 150px; height: 150px; margin: 0; display: block;" />
               </div>
             </div>
          </div>

          <div class="text-caption text-grey-5 q-mt-lg italic opacity-6">
            Authorized by Invify Global Licensing Authority. This document is encrypted and non-transferable.
          </div>
          
          <div class="q-mt-xl text-caption text-weight-bold text-amber-2 letter-spacing-3 opacity-8">
            Powered by www.invify.iips.app
          </div>
        </q-card-section>

        <!-- Fixed Actions Bottom -->
        <q-card-actions align="between" class="q-pa-lg bg-black-transparent backdrop-blur" style="border-top: 1px solid rgba(255,255,255,0.05)">
          <q-btn flat color="grey-5" label="Dismiss" v-close-popup class="text-weight-bold" />
          <div class="row q-gutter-md">
            <q-btn unelevated color="indigo-10" icon="content_copy" label="Copy Key" @click="copyShortcutCode" class="q-px-lg text-weight-bold" />
            <q-btn unelevated color="amber-9" icon="print" label="Download PDF / Print" @click="printShortcutCertificate" class="q-px-lg text-weight-bold text-black" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- RESET PASSWORD DIALOG -->
    <q-dialog v-model="showPasswordDialog">
      <q-card class="bg-grey-9 text-white border-gold" style="min-width: 400px">
        <q-card-section class="bg-indigo-10">
          <div class="text-h6 row items-center no-wrap">
            <q-icon name="lock_reset" class="q-mr-sm" color="amber-5" />
            Temporary Password Generated
          </div>
        </q-card-section>
        <q-card-section class="q-pa-lg text-center">
          <div class="text-caption text-grey-4 q-mb-md">
            The password for the primary tenant owner has been reset. Please provide them with this temporary password securely. They will be required to change it upon next login.
          </div>
          <div class="q-pa-md bg-dark rounded-borders border-cyan text-h4 font-mono text-cyan-3" style="letter-spacing: 3px;">
            {{ tempPassword }}
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md bg-grey-10">
          <q-btn flat label="Close" color="grey-5" v-close-popup />
          <q-btn color="cyan-6" text-color="black" icon="content_copy" label="Copy Password" @click="copyTempPassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- RESET ACTIVATION KEY SECURITY CONFIRM DIALOG -->
    <q-dialog v-model="showResetDialog" persistent>
      <q-card class="bg-grey-9 text-white border-gold" style="min-width: 400px">
        <q-card-section class="bg-indigo-10 q-py-md">
          <div class="text-h6 row items-center no-wrap">
            <q-icon name="security" class="q-mr-sm" color="amber-5" />
            <span>Security Verification Required</span>
          </div>
          <div class="text-caption text-indigo-3 q-mt-xs">Please confirm your identity to reset activation key <strong>{{ resetDialogKey }}</strong></div>
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <q-input
            v-model="resetPasswordInput"
            type="password"
            label="Super Admin Password"
            dark filled
            class="q-mb-md"
            label-color="indigo-3"
          />
          <q-input
            v-if="mfaEnabledForAdmin"
            v-model="resetMfaInput"
            type="text"
            label="2FA / Google Authenticator Code"
            dark filled
            mask="######"
            class="q-mb-md"
            label-color="indigo-3"
            hint="Enter the 6-digit verification code from your authenticator app"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-10">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :disable="resettingKey" />
          <q-btn color="orange-9" label="Verify & Reset" @click="submitResetKey" :loading="resettingKey" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- CHANGE VERTICAL DIALOG -->
    <q-dialog v-model="showChangeVerticalDialog" persistent>
      <q-card class="bg-grey-9 text-white" style="min-width: 440px; max-width: 520px">
        <q-card-section class="bg-deep-purple-10 q-py-md">
          <div class="text-h6 row items-center no-wrap">
            <q-icon name="swap_horiz" class="q-mr-sm" color="deep-purple-3" />
            <span>Change Vertical</span>
          </div>
          <div class="text-caption text-deep-purple-2 q-mt-xs">
            Moves {{ tenant?.name || 'this tenant' }} from
            <strong>{{ (tenant?.type || 'retail').toUpperCase() }}</strong>
            to a new Invify type and re-provisions Quasar under the matching partner.
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg q-gutter-md">
          <q-banner dense class="bg-amber-10 text-amber-2 rounded-borders">
            This unlinks the current Quasar tenant locally and creates a new one under the target vertical.
            The old Quasar tenant is not deleted remotely — clean it up in Quasar if needed.
          </q-banner>

          <q-select
            v-model="changeVerticalForm.type"
            :options="verticalTypeOptions"
            label="New tenant type / vertical"
            dark
            filled
            emit-value
            map-options
            label-color="deep-purple-3"
          />

          <q-input
            v-model="changeVerticalForm.reason"
            label="Reason (optional)"
            dark
            filled
            type="textarea"
            autogrow
            label-color="deep-purple-3"
          />

          <q-input
            v-model="changeVerticalForm.confirmPhrase"
            label='Type CHANGE VERTICAL to confirm'
            dark
            filled
            label-color="deep-purple-3"
            :error="changeVerticalForm.confirmPhrase.length > 0 && changeVerticalForm.confirmPhrase.toUpperCase() !== 'CHANGE VERTICAL'"
            error-message="Must match CHANGE VERTICAL exactly"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-10">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :disable="changingVertical" />
          <q-btn
            color="deep-purple-6"
            label="Change Vertical"
            :loading="changingVertical"
            :disable="!canSubmitChangeVertical"
            @click="submitChangeVertical"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    </div>
    <q-inner-loading :showing="loading || loadingResetSetup" dark color="indigo-4" />
  </q-page>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, copyToClipboard } from 'quasar'
import { adminApi, deviceApi } from '../api'
import logo from '../assets/logo_transparent.png'

const $q = useQuasar()
const $route = useRoute()

const tab = ref('overview')
const loading = ref(true)
const tenant = ref(null)
const users = ref([])
const wallet = ref({ 
  balance: 0, 
  subAccount: null, 
  virtualAccounts: [], 
  transactions: [],
  allWallets: []
})
const recentUsage = ref([])
const certificates = ref([])
const registeredDevices = ref([])
const auditRecords = ref([])
const kycDocuments = ref([])

const showResetDialog = ref(false)
const resetDialogKey = ref('')
const resetPasswordInput = ref('')
const resetMfaInput = ref('')
const mfaEnabledForAdmin = ref(false)
const loadingResetSetup = ref(false)
const resettingKey = ref(false)

const ownerUser = computed(() => {
  const list = users.value || []
  return list.find(u => String(u.role || '').toLowerCase() === 'owner')
    || list.find(u => String(u.role || '').toLowerCase().includes('admin'))
    || list[0]
    || null
})

const ownerProfile = computed(() => {
  const fromSettings = tenant.value?.settings?.owner_profile || {}
  const owner = ownerUser.value
  return {
    firstName: fromSettings.firstName || '',
    lastName: fromSettings.lastName || '',
    email: fromSettings.email || owner?.email || '',
    phone: fromSettings.phone || tenant.value?.phone || owner?.phone || '',
    businessName: fromSettings.businessName || tenant.value?.name || '',
    city: fromSettings.city || tenant.value?.lga || '',
    country: fromSettings.country || tenant.value?.country || '',
    name: owner?.name || '',
  }
})

const ownerDisplayName = computed(() => {
  const p = ownerProfile.value
  const composed = [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
  return composed || p.name || 'Not Provided'
})

const isSuperAdmin = computed(() => {
  const role = localStorage.getItem('operator_role') || 'SUPER_ADMIN'
  return role.toUpperCase().includes('SUPER_ADMIN')
})

// Financial Platform Refs
const financialHealth = ref(null)
const financialAudit = ref([])
const activatingPlatform = ref(false)
const rotatingPlatform = ref(false)
const changingVertical = ref(false)
const showChangeVerticalDialog = ref(false)
const changeVerticalForm = ref({
  type: 'school',
  reason: '',
  confirmPhrase: '',
})
const verticalTypeOptions = [
  { label: 'School → invify_school', value: 'school' },
  { label: 'Retail → invify_retail', value: 'retail' },
  { label: 'Services → invify_services', value: 'services' },
]
const canSubmitChangeVertical = computed(() => {
  const type = changeVerticalForm.value.type
  const current = String(tenant.value?.type || '').toLowerCase()
  return (
    !!type &&
    type !== current &&
    changeVerticalForm.value.confirmPhrase.trim().toUpperCase() === 'CHANGE VERTICAL'
  )
})

const showPasswordDialog = ref(false)
const tempPassword = ref('')

const showShortcutDialog = ref(false)
const showSuccessDialog = ref(false)
const generating = ref(false)
const lastGeneratedCode = ref('')
const certificateData = ref({
  businessName: '',
  mode: '',
  plan: '',
  duration: '',
  expiry: '',
  deviceId: ''
})

const shortcutConfig = ref({
  duration: 30,
  planIndex: 1,
  deviceSuffix: '8841'
})

const durationOptions = [
  { label: '1 Month', value: 30 },
  { label: '2 Months', value: 60 },
  { label: '3 Months', value: 90 },
  { label: '6 Months', value: 180 },
  { label: '1 Year', value: 365 },
  { label: '2 Years', value: 730 },
  { label: 'Lifetime', value: 36500 }
]

const planOptions = [
  { label: 'BASIC', value: 0 },
  { label: 'STANDARD', value: 1 },
  { label: 'PREMIUM', value: 2 },
  { label: 'ENTERPRISE', value: 3 }
]

const deviceOptions = computed(() => {
  return registeredDevices.value
    .filter(dev => dev && dev.deviceId)
    .map(dev => {
      const last6 = dev.deviceId.length > 6 
        ? dev.deviceId.slice(-6)
        : dev.deviceId;
      return {
        label: last6,
        value: last6
      }
    })
})

const reviewCertificate = (cert) => {
  if (!tenant.value) return
  certificateData.value = {
    businessName: tenant.value.name,
    mode: tenant.value.type ? tenant.value.type.toUpperCase() : 'RETAIL',
    plan: cert.plan,
    duration: cert.duration,
    expiry: cert.expiry,
    deviceId: cert.deviceId
  }
  lastGeneratedCode.value = cert.code
  showSuccessDialog.value = true
}

const resetActivationKey = async (cert) => {
  loadingResetSetup.value = true
  try {
    const { data: profile } = await adminApi.getProfile()
    mfaEnabledForAdmin.value = !!profile?.mfa_enabled
    resetDialogKey.value = cert.code
    resetPasswordInput.value = ''
    resetMfaInput.value = ''
    showResetDialog.value = true
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to retrieve admin security setup.' })
  } finally {
    loadingResetSetup.value = false
  }
}

const submitResetKey = async () => {
  if (!resetPasswordInput.value) {
    $q.notify({ type: 'negative', message: 'Admin password is required.' })
    return
  }
  if (mfaEnabledForAdmin.value && !resetMfaInput.value) {
    $q.notify({ type: 'negative', message: 'MFA verification code is required.' })
    return
  }

  resettingKey.value = true
  try {
    await deviceApi.resetActivation(resetDialogKey.value, {
      password: resetPasswordInput.value,
      mfaToken: resetMfaInput.value
    })
    $q.notify({ type: 'positive', message: 'Activation key has been successfully reset!' })
    showResetDialog.value = false
    await fetchDetails()
  } catch (e) {
    console.error(e)
    const errMessage = e.response?.data?.error || 'Failed to reset activation key.'
    $q.notify({ type: 'negative', message: errMessage })
  } finally {
    resettingKey.value = false
  }
}

const openActivationShortcut = () => {
  if (!tenant.value) return
  shortcutConfig.value.planIndex = getPlanIndex(tenant.value.plan)
  shortcutConfig.value.deviceSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  showShortcutDialog.value = true
}

const triggerEmergencyLock = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let passcode = ''
  for (let i = 0; i < 6; i++) {
    passcode += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  $q.dialog({
    title: 'Emergency Lock',
    message: `Are you sure you want to trigger an emergency lock for ${tenant.value.name}?<br><br>The new unlock passcode will be: <strong class="text-h6">${passcode}</strong>.<br><br>Please save this code before proceeding!`,
    html: true,
    cancel: true,
    persistent: true,
    color: 'red-9'
  }).onOk(async () => {
    try {
      await adminApi.emergencyLock({
        tenant_id: tenant.value.id,
        passcode: passcode
      })
      if (tenant.value) {
        tenant.value.is_emergency_locked = true
        tenant.value.emergency_lock_code = passcode
      }
      $q.notify({ type: 'positive', message: 'Emergency lock broadcasted successfully to all devices.' })
      await fetchDetails()
    } catch (e) {
      console.error(e)
      $q.notify({ type: 'negative', message: 'Failed to broadcast emergency lock.' })
    }
  })
}

const getPlanIndex = (planName) => {
  const name = (planName || 'standard').toLowerCase()
  if (name.includes('starter') || name.includes('basic') || name.includes('free')) return 0
  if (name.includes('premium')) return 2
  if (name.includes('enterprise') || name.includes('custom')) return 3
  return 1
}

const generateShortcutCode = async () => {
  if (!tenant.value) return
  generating.value = true
  try {
    const { data } = await deviceApi.createActivation({
      tenantId: tenant.value.id,
      durationDays: shortcutConfig.value.duration,
      planIndex: shortcutConfig.value.planIndex,
      deviceSuffix: shortcutConfig.value.deviceSuffix
    })

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + shortcutConfig.value.duration)

    certificateData.value = {
      businessName: tenant.value.name,
      mode: tenant.value.type ? tenant.value.type.toUpperCase() : 'RETAIL',
      plan: planOptions.find(p => p.value === shortcutConfig.value.planIndex)?.label || 'STANDARD',
      duration: durationOptions.find(d => d.value === shortcutConfig.value.duration)?.label || '30 Days',
      expiry: expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      deviceId: (() => {
        if (data.device_id) return data.device_id;
        const matchedDevice = registeredDevices.value.find(d => d.deviceId && d.deviceId.endsWith(shortcutConfig.value.deviceSuffix));
        return matchedDevice ? matchedDevice.deviceId : `TERM-${shortcutConfig.value.deviceSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
      })()
    }

    lastGeneratedCode.value = data.activation_code

    certificates.value.unshift({
      code: data.activation_code,
      deviceId: certificateData.value.deviceId,
      plan: certificateData.value.plan,
      duration: certificateData.value.duration,
      expiry: certificateData.value.expiry,
      status: 'ACTIVE'
    })

    showShortcutDialog.value = false
    showSuccessDialog.value = true
    
    fetchDetails()
  } catch (err) {
    console.error('Shortcut activation generation failed:', err)
    $q.notify({ type: 'negative', message: 'Failed to generate code.' })
  } finally {
    generating.value = false
  }
}

const copyShortcutCode = () => {
  copyToClipboard(lastGeneratedCode.value)
    .then(() => {
      $q.notify({ type: 'positive', message: 'Activation code copied to clipboard!' })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: 'Failed to copy activation code.' })
    })
}

const printShortcutCertificate = () => {
  const printWindow = window.open('', '_blank')
  const content = document.getElementById('printable-certificate').innerHTML
  
  printWindow.document.write(`
    <html>
      <head>
        <base href="${window.location.origin}">
        <title>Invify License Certificate - ${certificateData.value.businessName}</title>
        <style>
          @page { margin: 0; size: A4; }
          body { 
            margin: 0; 
            padding: 0; 
            background: #0f172a; 
            color: white; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 210mm;
            height: 297mm;
            overflow: hidden;
          }
          .certificate-print-container {
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            position: relative;
            overflow: hidden;
          }
          .text-h2 { font-size: 2.5rem; font-weight: bold; margin: 15px 0; }
          .text-h3 { font-size: 2.2rem; font-weight: 900; color: #fbbf24; margin: 0; letter-spacing: 2px; }
          .text-subtitle1 { font-size: 1.2rem; }
          .text-amber-5 { color: #fbbf24; }
          .text-amber-2 { color: #fde68a; }
          .text-grey-4 { color: #bdbdbd; }
          .text-grey-5 { color: #9e9e9e; }
          .code-container { 
            background: #1e293b; 
            border: 1px solid rgba(251, 191, 36, 0.4); 
            padding: 30px; 
            margin-top: 20px; 
            border-radius: 16px; 
            width: 100%;
          }
          .font-mono { font-family: 'Courier New', Courier, monospace; font-size: 2.5rem; letter-spacing: 6px; color: #fbbf24; }
          .row { display: flex !important; flex-direction: row !important; width: 100%; justify-content: center; gap: 20px; margin: 20px 0; align-items: center; }
          .no-wrap { flex-wrap: nowrap; }
          .col-4 { flex: 1; border-right: 1px solid rgba(255,255,255,0.1); }
          .col-4:last-child { border-right: none; }
          img { height: 100px; margin-bottom: 15px; }
          .uppercase { text-transform: uppercase; }
          .letter-spacing-10 { letter-spacing: 10px; }
          .letter-spacing-3 { letter-spacing: 3px; }
          .opacity-6 { opacity: 0.6; }
          .opacity-8 { opacity: 0.8; }
          .italic { font-style: italic; }
          .q-mt-xl { margin-top: 40px; }
          .q-mt-md { margin-top: 20px; }
          .q-mt-lg { margin-top: 30px; }
          .q-mb-sm { margin-bottom: 8px; }
          .q-mb-md { margin-bottom: 16px; }
          .q-mb-none { margin-bottom: 0; }
        </style>
      </head>
      <body>
        <div class="certificate-print-container">
          ${content}
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

const isRequestingVA = ref(false)

const requestVirtualAccount = async () => {
  try {
    isRequestingVA.value = true
    const { data } = await adminApi.provisionVirtualAccount($route.params.id)
    if (data.success) {
      $q.notify({
        color: 'positive',
        message: 'Virtual Account Provisioned successfully',
        icon: 'check_circle'
      })
      await fetchDetails()
    }
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.error || 'Failed to provision Virtual Account',
      icon: 'warning'
    })
  } finally {
    isRequestingVA.value = false
  }
}

const parsedLocation = computed(() => {
  if (!tenant.value?.location || tenant.value.location === 'N/A') return null;
  // expects "Lat: 6.6257, Lng: 3.4782"
  const match = tenant.value.location.match(/Lat:\s*([-\d.]+),\s*Lng:\s*([-\d.]+)/i);
  if (match) {
    return { query: `${match[1]},${match[2]}` };
  }
  return { query: encodeURIComponent(tenant.value.location) };
});

const openGoogleMaps = (query) => {
  window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
};

const toggleStatus = async () => {
  if (!tenant.value) return;
  const newStatus = tenant.value.status === 'active' ? 'suspended' : 'active';
  try {
    await adminApi.updateTenant(tenant.value.id, { status: newStatus });
    $q.notify({ type: 'positive', message: `Tenant ${newStatus}` });
    await fetchDetails();
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to update status' });
  }
};

const openEditModal = () => {
  $q.notify({ type: 'info', message: 'Edit tenant is not fully implemented yet.' });
};

const resetPassword = () => {
  // Generate random 10 char alphanumeric password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
  let pass = '';
  for(let i=0; i<10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  tempPassword.value = pass;
  
  // Here we would call an API like adminApi.resetTenantPassword(tenant.value.id, tempPassword.value)
  // For now, just show the generated modal
  showPasswordDialog.value = true;
};

const copyTempPassword = () => {
  copyToClipboard(tempPassword.value).then(() => {
    $q.notify({ type: 'positive', message: 'Password copied to clipboard!' });
  });
};

const fetchDetails = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getTenantDetails($route.params.id)
    tenant.value = data.tenant
    users.value = data.users || []
    wallet.value = {
      balance: 0,
      subAccount: null,
      virtualAccounts: [],
      transactions: [],
      allWallets: [],
      ...(data.wallet || {})
    }
    recentUsage.value = data.recentUsage || []
    certificates.value = data.certificates || []
    registeredDevices.value = data.registeredDevices || []
    
    // Fetch related audit logs for this tenant (full multi-source ledger)
    try {
      const ledger = await adminApi.getAuditLedger({ tenantId: tenant.value.id, limit: 100 })
      const payload = ledger.data || {}
      auditRecords.value = payload.data || []
    } catch (e) {
      console.warn('Failed to fetch tenant audit ledger:', e)
      auditRecords.value = []
    }

    try {
      const kycRes = await adminApi.getTenantKyc(tenant.value.id)
      kycDocuments.value = kycRes.data?.data || []
    } catch (e) {
      console.error('Failed to fetch KYC documents:', e)
    }

    // Fetch Financial Platform Status
    try {
      const healthRes = await adminApi.getFinancialPlatformHealth(tenant.value.id)
      financialHealth.value = healthRes.data || null
    } catch (e) {
      console.warn('Failed to fetch financial platform health (may not be provisioned):', e)
      financialHealth.value = null
    }

    // Fetch Financial Platform Audit
    try {
      const auditRes = await adminApi.getFinancialPlatformAudit(tenant.value.id)
      financialAudit.value = auditRes.data?.data || auditRes.data || []
    } catch (e) {
      console.warn('Failed to fetch financial platform audit:', e)
      financialAudit.value = []
    }

  } finally {
    loading.value = false
  }
}

const activateFinancialPlatform = async () => {
  if (!tenant.value) return
  $q.dialog({
    title: 'Activate Financial Platform',
    message: `Are you sure you want to provision Quasar financial capabilities for ${tenant.value.name}? This will allocate real-world ledger accounts.`,
    cancel: true,
    persistent: true,
    dark: true,
    color: 'cyan-6'
  }).onOk(async () => {
    activatingPlatform.value = true
    try {
      await adminApi.activateFinancialPlatform(tenant.value.id)
      $q.notify({ type: 'positive', message: 'Financial Platform Activated Successfully' })
      await fetchDetails()
    } catch (err) {
      console.error('Activation failed:', err)
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Failed to activate financial platform' })
    } finally {
      activatingPlatform.value = false
    }
  })
}

const rotateFinancialPlatform = async () => {
  if (!tenant.value) return
  $q.dialog({
    title: 'Rotate Credentials',
    message: `WARNING: Rotating credentials will temporarily suspend API requests while the keys are rotated. Do you want to proceed for ${tenant.value.name}?`,
    cancel: true,
    persistent: true,
    dark: true,
    color: 'amber-8'
  }).onOk(async () => {
    rotatingPlatform.value = true
    try {
      await adminApi.rotateFinancialPlatformCredentials(tenant.value.id)
      $q.notify({ type: 'positive', message: 'Credentials Rotated Successfully' })
      await fetchDetails()
    } catch (err) {
      console.error('Rotation failed:', err)
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Failed to rotate credentials' })
    } finally {
      rotatingPlatform.value = false
    }
  })
}

const openChangeVerticalDialog = () => {
  const current = String(tenant.value?.type || 'retail').toLowerCase()
  const preferred = verticalTypeOptions.find((o) => o.value !== current)?.value || 'school'
  changeVerticalForm.value = {
    type: preferred,
    reason: '',
    confirmPhrase: '',
  }
  showChangeVerticalDialog.value = true
}

const submitChangeVertical = async () => {
  if (!tenant.value || !canSubmitChangeVertical.value) return
  changingVertical.value = true
  try {
    const res = await adminApi.changeFinancialPlatformVertical(tenant.value.id, {
      type: changeVerticalForm.value.type,
      confirmPhrase: changeVerticalForm.value.confirmPhrase.trim().toUpperCase(),
      reason: changeVerticalForm.value.reason || undefined,
    })
    const data = res?.data || res
    showChangeVerticalDialog.value = false
    $q.notify({
      type: 'positive',
      message: data?.message || `Vertical changed to ${changeVerticalForm.value.type}`,
      timeout: 6000,
    })
    if (data?.warning) {
      $q.notify({ type: 'warning', message: data.warning, timeout: 10000 })
    }
    await fetchDetails()
  } catch (err) {
    console.error('Change vertical failed:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || err.response?.data?.details || 'Failed to change vertical',
      timeout: 8000,
    })
  } finally {
    changingVertical.value = false
  }
}

onMounted(fetchDetails)

// ── Re-fetch when navigating between different tenant detail pages ──
// Vue Router reuses the same component instance when only params change,
// so onMounted alone will NOT fire again. This watcher guarantees data
// always reloads for the correct tenant without requiring a manual refresh.
watch(
  () => $route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      // Reset state before fetching new tenant
      tenant.value = null
      users.value = []
      wallet.value = { balance: 0, subAccount: null, virtualAccounts: [], transactions: [], allWallets: [] }
      recentUsage.value = []
      certificates.value = []
      registeredDevices.value = []
      auditRecords.value = []
      kycDocuments.value = []
      financialHealth.value = null
      financialAudit.value = []
      tab.value = 'overview'
      fetchDetails()
    }
  }
)
</script>

<style scoped>
.min-height-400 {
  min-height: 400px;
}

.certificate-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 2px solid #fbbf24 !important;
  border-radius: 24px;
}

.text-shadow-glow {
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.code-container {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 16px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

.code-glow {
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
  letter-spacing: 8px;
}

.border-right-grey {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.letter-spacing-10 { letter-spacing: 10px; }
.letter-spacing-3 { letter-spacing: 3px; }
.backdrop-blur { backdrop-filter: blur(8px); }
.bg-black-transparent { background: rgba(0, 0, 0, 0.4); }

.border-gold { border: 2px solid #fbbf24 !important; }
.font-mono { font-family: 'Courier New', Courier, monospace; }

@keyframes pulse-amber {
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
}

.animate-pulse-amber {
  animation: pulse-amber 2s infinite;
}
</style>
