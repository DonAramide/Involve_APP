<template>
  <q-page padding class="q-pa-lg text-main">
    <div class="row items-center q-mb-xl justify-between">
      <div>
        <h4 class="text-h4 text-weight-bold q-my-none">Platform Configuration</h4>
        <div class="text-subtitle1 text-grey-7">Manage Global Platform Settings & Policies</div>
      </div>
      <div>
        <q-btn unelevated color="blue-6" icon="save" label="Save All Changes" @click="saveAllSettings" />
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey-5 q-mb-md"
      active-color="cyan-3"
      indicator-color="cyan-3"
      align="left"
      narrow-indicator
    >
      <q-tab name="general" icon="settings" label="General" />
      <q-tab name="quasar" icon="account_balance" label="Quasar Switch" />
      <q-tab name="localization" icon="language" label="Localization & Currency" />
      <q-tab name="security" icon="security" label="Security Policies" />
      <q-tab name="branding" icon="palette" label="Branding & Whitelabel" />
      <q-tab name="payout" icon="schedule" label="Payout Settings" />
    </q-tabs>

    <q-separator dark class="q-mb-md opacity-20" />

    <q-tab-panels v-model="activeTab" animated class="bg-transparent">
      
      <!-- GENERAL TAB -->
      <q-tab-panel name="general" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">System Defaults</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input outlined dense dark v-model="mockSettings.platformName" label="Platform Name" class="q-mb-md" />
                <q-input outlined dense dark v-model="mockSettings.supportEmail" label="Global Support Email" class="q-mb-md" />
                <q-select outlined dense dark v-model="mockSettings.timezone" :options="['UTC', 'GMT', 'EST', 'WAT', 'PST']" label="System Timezone" />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-subpanel text-muted border-main">
                  <template v-slot:avatar>
                    <q-icon name="info" color="blue-4" />
                  </template>
                  General settings affect all core modules unless overridden at the tenant level. Ensure compliance with operating guidelines before changing system timezones.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat class="enterprise-panel bg-panel border-main q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main text-red-4">Maintenance Mode Controls</div>
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-6 column op-gap-16">
                <q-toggle 
                  v-model="mockSettings.isMaintenanceLocked" 
                  color="red-6" 
                  label="Enforce Maintenance Mode Global Lockout" 
                  dark 
                />
                <q-input 
                  v-model="mockSettings.maintenanceMessage" 
                  outlined dense dark type="textarea" rows="2"
                  label="Maintenance Message to Show Users" 
                  placeholder="System is currently under maintenance. Please try again later."
                />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-red-10 text-red-2 border-critical">
                  <template v-slot:avatar>
                    <q-icon name="report_problem" color="red-4" />
                  </template>
                  Activating Maintenance Mode will immediately prevent logins for all normal tenant operator and agent accounts globally. Only Super Admins will be permitted to access.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- QUASAR SWITCH TAB -->
      <q-tab-panel name="quasar" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-sm text-main">Quasar Card Switch Base URL</div>
            <div class="text-caption text-muted q-mb-md">
              Invify backend calls Quasar with this base (Bearer <code>sk_…</code>). Flutter still posts to Invify
              <code>/api/pos/transaction</code>; Invify then hits Quasar
              <code>/pos/card-transaction</code>.
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-8">
                <q-input
                  outlined dense dark
                  v-model="mockSettings.quasarBaseUrl"
                  label="Quasar API Base URL"
                  hint="Must end with /api/v1 — use the configured Quasar environment URL"
                  placeholder="https://quasar.example.invalid/api/v1"
                  class="q-mb-md"
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="link" />
                  </template>
                </q-input>
                <q-banner rounded class="bg-subpanel text-main border-main q-mb-md">
                  <div class="text-caption text-muted q-mb-xs">Resolved endpoints</div>
                  <div class="font-mono text-cyan-3 text-caption q-mb-xs">
                    Card TX: {{ quasarCardTransactionPreview }}
                  </div>
                  <div class="font-mono text-cyan-3 text-caption q-mb-xs">
                    ICC data: {{ quasarIccDataPreview }}
                  </div>
                  <div class="font-mono text-grey-5 text-caption q-mb-sm">
                    MPOS backup: {{ quasarMposBackupPreview }}
                  </div>
                  <div class="row items-center q-gutter-sm">
                    <q-btn
                      dense
                      unelevated
                      color="cyan-7"
                      icon="network_check"
                      label="Ping Quasar"
                      :loading="pingingQuasar"
                      no-caps
                      @click="pingQuasarSwitch"
                    />
                    <q-chip
                      v-if="quasarPingResult"
                      dense
                      :color="quasarPingResult.ok ? 'positive' : 'negative'"
                      text-color="white"
                      :icon="quasarPingResult.ok ? 'check_circle' : 'error'"
                    >
                      {{ quasarPingResult.label }}
                    </q-chip>
                  </div>
                  <div v-if="quasarPingResult?.detail" class="text-caption text-grey-5 q-mt-xs">
                    {{ quasarPingResult.detail }}
                  </div>
                </q-banner>
                <div class="text-caption text-grey-6">
                  Leave blank to fall back to <code>QUASAR_BASE_URL</code> env, then production
                  <code>https://api-quasar.invify.org/api/v1</code>.
                  Pasting a full <code>…/pos/card-transaction</code> URL is OK — it will be normalized to the base.
                </div>
              </div>
              <div class="col-12 col-md-4">
                <q-banner rounded class="bg-subpanel text-muted border-main">
                  <template v-slot:avatar>
                    <q-icon name="info" color="cyan-4" />
                  </template>
                  Presets
                  <div class="q-mt-sm column q-gutter-xs">
                    <q-btn
                      dense outline color="cyan-4" size="sm" no-caps
                      label="Production"
                      @click="mockSettings.quasarBaseUrl = 'https://api-quasar.invify.org/api/v1'"
                    />
                  </div>
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat class="enterprise-panel bg-panel border-main q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-sm text-main">Global POS Encryption Key (ICC)</div>
            <div class="text-caption text-muted q-mb-md">
              Platform-wide Invify key used for Quasar <code>/pos/icc-data</code> when a tenant
              has no vault key. Quasar still issues keys per Quasar tenant — rotate once for your
              linked Quasar tenant, then store it here as the <strong>global</strong> Invify default.
            </div>

            <div class="row q-col-gutter-md items-start">
              <div class="col-12 col-md-7">
                <q-banner rounded class="bg-subpanel border-main text-main q-mb-md">
                  <div class="text-caption text-muted q-mb-xs">Global key status</div>
                  <q-chip
                    dense
                    :color="globalPosKeyConfigured ? 'positive' : 'negative'"
                    text-color="white"
                    :label="globalPosKeyConfigured ? 'GLOBAL KEY SET' : 'GLOBAL KEY MISSING'"
                  />
                  <div class="text-caption q-mt-sm font-mono">
                    Settings: {{ posKeyStatus?.sources?.globalSettings ? 'yes' : 'no' }} ·
                    Env: {{ posKeyStatus?.sources?.runtimeEnv ? 'yes' : 'no' }}
                  </div>
                </q-banner>

                <q-select
                  outlined dense dark
                  v-model="posKeyForm.selectedIntegration"
                  :options="quasarIntegrationOptions"
                  label="Quasar-linked tenant (optional for paste)"
                  emit-value
                  map-options
                  clearable
                  class="q-mb-md"
                  :loading="loadingQuasarIntegrations"
                  hint="Used to resolve Quasar tenant UUID for Generate/Rotate"
                />
                <q-input
                  outlined dense dark
                  v-model="posKeyForm.quasarTenantId"
                  label="Quasar Tenant UUID"
                  class="q-mb-md"
                  hint="Required to Generate/Rotate on Quasar. Auto-filled from the mapping above when available."
                  clearable
                />
                <q-input
                  outlined dense dark
                  v-model="posKeyForm.adminJwt"
                  label="Quasar Admin JWT (optional)"
                  type="password"
                  class="q-mb-md"
                  clearable
                  hint="Leave blank — vault Quasar Admin Login is preferred. Clear this if it was auto-filled with an Invify token (that caused the 401)."
                />
                <q-toggle
                  v-model="posKeyForm.applyAsPlatformDefault"
                  color="cyan-4"
                  dark
                  label="Store as global platform key (recommended)"
                  class="q-mb-sm"
                />
                <div class="text-caption text-grey-6 q-mb-md">
                  When on, the key is written to <code>global_settings.json</code> and runtime env so every tenant can use it.
                </div>
                <div class="row q-gutter-sm">
                  <q-btn
                    unelevated color="cyan-8" icon="vpn_key"
                    label="Generate Global POS Key"
                    :loading="rotatingPosKey"
                    :disable="!canRotatePosKey"
                    @click="confirmRotatePosKey"
                  />
                  <q-btn
                    outline color="cyan-4" icon="content_paste"
                    label="Paste as Global Key"
                    @click="openPasteGlobalPosKey"
                  />
                </div>
              </div>
              <div class="col-12 col-md-5">
                <q-banner rounded class="bg-subpanel border-main text-main">
                  <div class="text-caption text-muted q-mb-xs">Selected tenant vault</div>
                  <q-chip
                    dense
                    :color="posKeyStatus?.sources?.tenantVault ? 'positive' : 'grey-8'"
                    text-color="white"
                    :label="posKeyStatus?.sources?.tenantVault ? 'TENANT VAULT SET' : 'NO TENANT VAULT'"
                  />
                  <div v-if="posKeyForm.quasarTenantId" class="text-caption text-grey-5 q-mt-sm font-mono">
                    Quasar tenant: {{ posKeyForm.quasarTenantId }}
                  </div>
                  <q-btn
                    flat dense color="cyan-4" icon="refresh" label="Refresh status"
                    class="q-mt-sm" @click="refreshPosKeyStatus" :loading="loadingPosKeyStatus"
                  />
                </q-banner>
                <q-banner rounded class="bg-orange-10 text-orange-2 q-mt-md border-main">
                  <template v-slot:avatar>
                    <q-icon name="warning" color="orange-4" />
                  </template>
                  Rotating on Quasar invalidates the previous key for that Quasar tenant. Invify stores the new value as the global default when the toggle is on.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-dialog v-model="showPosKeyRevealDialog" persistent>
          <q-card class="bg-panel text-main" style="min-width: 480px">
            <q-card-section>
              <div class="text-h6">POS Key Generated</div>
              <div class="text-caption text-muted">
                Shown once. Already stored on Invify. Copy if you need an offline backup.
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-caption">Fingerprint: {{ lastPosKeyResult?.fingerprint }}</div>
              <div class="text-caption q-mb-sm">Key version: {{ lastPosKeyResult?.keyVersion ?? 'n/a' }}</div>
              <div class="text-caption q-mb-sm text-cyan-3" v-if="lastPosKeyResult?.stored?.globalSettings">
                Stored as global platform key
              </div>
              <q-input
                outlined dense dark readonly
                :model-value="lastPosKeyResult?.encryptionKeyBase64 || ''"
                type="textarea"
                autogrow
              />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Copy key" color="cyan-4" @click="copyPosKey" />
              <q-btn unelevated color="cyan-8" label="Done" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <q-dialog v-model="showPastePosKeyDialog">
          <q-card class="bg-panel text-main" style="min-width: 480px">
            <q-card-section>
              <div class="text-h6">Paste as Global POS Key</div>
              <div class="text-caption text-muted">
                Paste <code>encryption_key_base64</code> from Quasar rotate. No tenant mapping required.
              </div>
            </q-card-section>
            <q-card-section>
              <q-input
                outlined dense dark
                v-model="pastePosKeyValue"
                type="textarea"
                autogrow
                label="encryption_key_base64"
              />
              <q-toggle
                class="q-mt-md"
                v-model="posKeyForm.applyAsPlatformDefault"
                color="cyan-4"
                dark
                label="Store as global platform key"
              />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancel" v-close-popup color="grey-5" />
              <q-btn unelevated color="cyan-8" label="Store Global Key" :loading="storingPosKey" @click="storePastedPosKey" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <q-card flat class="enterprise-panel bg-panel border-main q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-sm text-main">Tenant Quasar API Key (card rails)</div>
            <div class="text-caption text-muted q-mb-md">
              <code>/pos/icc-data</code> and <code>/pos/card-transaction</code> require
              <code>sk_live_*</code>. Activation currently stores <code>sk_test_*</code> (sandbox only).
            </div>
            <div class="row q-col-gutter-md items-start">
              <div class="col-12 col-md-7">
                <q-select
                  outlined dense dark
                  v-model="posKeyForm.selectedIntegration"
                  :options="quasarIntegrationOptions"
                  label="Quasar-linked tenant"
                  emit-value
                  map-options
                  class="q-mb-md"
                  clearable
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    unelevated color="amber-9" icon="vpn_key"
                    label="Issue Live API Key"
                    :loading="issuingLiveApiKey"
                    :disable="!posKeyForm.selectedIntegration"
                    @click="confirmIssueLiveApiKey"
                  />
                  <q-btn
                    outline color="cyan-4" icon="refresh"
                    label="Refresh key status"
                    :loading="loadingApiKeyStatus"
                    :disable="!posKeyForm.selectedIntegration"
                    @click="refreshApiKeyStatus"
                  />
                </div>
              </div>
              <div class="col-12 col-md-5">
                <q-banner rounded class="bg-subpanel border-main text-main">
                  <div class="text-caption text-muted q-mb-xs">Tenant API key</div>
                  <q-chip
                    dense
                    :color="apiKeyStatus?.keyPrefix === 'sk_live_*' ? 'positive' : (apiKeyStatus?.keyPrefix === 'sk_test_*' ? 'orange-9' : 'grey-8')"
                    text-color="white"
                    :label="apiKeyStatus?.keyPrefix || 'UNKNOWN'"
                  />
                  <q-chip
                    dense
                    class="q-ml-sm"
                    :color="apiKeyStatus?.environment === 'live' ? 'positive' : 'grey-8'"
                    text-color="white"
                    :label="(apiKeyStatus?.environment || 'n/a').toUpperCase()"
                  />
                  <div class="text-caption text-grey-5 q-mt-sm" v-if="apiKeyStatus?.quasarTenantId">
                    Quasar tenant: {{ apiKeyStatus.quasarTenantId }}
                  </div>
                  <div class="text-caption text-orange-3 q-mt-sm" v-if="apiKeyStatus?.keyPrefix === 'sk_test_*'">
                    Card POS will fail with 403 until you issue sk_live_*.
                  </div>
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat class="enterprise-panel bg-panel border-main q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">Quasar Partner Credentials (optional)</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input outlined dense dark v-model="mockSettings.quasarClientId" label="Quasar Client ID" class="q-mb-md" />
                <q-input
                  outlined dense dark
                  v-model="mockSettings.quasarClientSecret"
                  label="Quasar Client Secret"
                  type="password"
                  class="q-mb-md"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-subpanel text-muted border-main">
                  Tenant card execution still uses per-tenant <code>sk_live_*</code> /
                  <code>sk_test_*</code> from the Integration Vault (or <code>QUASAR_API_KEY</code>).
                  These client credentials are for platform partner APIs, not Flutter.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- LOCALIZATION TAB (Contains existing currency logic) -->
      <q-tab-panel name="localization" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">Currency & Market</div>
            <q-banner rounded class="bg-subpanel text-main q-mb-md border-main row items-center">
              <q-icon name="payments" color="green-4" size="sm" class="q-mr-sm" />
              Active Platform Currency: <strong class="text-cyan-3 q-mx-xs">{{ currentCurrency.name }} ({{ currentCurrency.symbol }})</strong> - {{ currentCurrency.code }}
            </q-banner>

            <q-table
              :rows="currencyList"
              :columns="currencyColumns"
              row-key="code"
              flat
              dark
              class="bg-subpanel border-main"
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.row.code === currentCurrency.code ? 'blue-8' : 'blue-grey-9'"
                    text-color="white"
                    dense
                    size="sm"
                  >
                    {{ props.row.code === currentCurrency.code ? 'ACTIVE' : 'INACTIVE' }}
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn
                    v-if="props.row.code !== currentCurrency.code"
                    outline
                    dense
                    color="cyan-3"
                    label="Set Active"
                    size="sm"
                    @click="activateCurrency(props.row)"
                  />
                  <q-btn
                    flat
                    round
                    color="grey-4"
                    icon="edit"
                    size="sm"
                    class="q-ml-sm hover-text-cyan"
                    @click="editCurrency(props.row)"
                  />
                </q-td>
              </template>
            </q-table>
            
            <div class="row justify-end q-mt-md">
              <q-btn outline color="cyan-3" icon="add" label="Add Custom Currency" size="sm" @click="showAddCurrencyDialog = true" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- SECURITY TAB -->
      <q-tab-panel name="security" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">Session & Access Control</div>
            <div class="row q-col-gutter-lg items-center">
              <div class="col-12 col-md-6 column op-gap-16">
                <q-toggle v-model="mockSettings.requireMFA" color="red-5" label="Enforce MFA for all Tenant Admins" dark />
                <q-toggle v-model="mockSettings.strictIPBinding" color="blue-5" label="Strict Session IP Binding" dark />
                <q-toggle v-model="mockSettings.enforceDeviceControl" color="red-5" label="Enforce Strict Device Fingerprint on Login" dark />
                <q-input outlined dense dark type="number" v-model="mockSettings.sessionTimeout" label="Idle Session Timeout (Minutes)" />
                <q-input outlined dense dark type="number" v-model="mockSettings.auditArchiveHours" label="Audit Trail Retention Limit (Hours)" />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-red-10 text-red-2 border-critical">
                  <template v-slot:avatar>
                    <q-icon name="warning" color="red-4" />
                  </template>
                  Disabling IP Binding or MFA enforcement will trigger a compliance drift alert in the Governance Center.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- BRANDING TAB -->
      <q-tab-panel name="branding" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">White-Label Customization</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6 column op-gap-16">
                <q-input outlined dense dark v-model="mockSettings.primaryColor" label="Primary Theme Color (Hex)" />
                <q-input outlined dense dark v-model="mockSettings.logoUrl" label="Enterprise Logo URL" />
                <q-toggle v-model="mockSettings.hideInvifyWatermark" color="purple-4" label="Hide 'Powered by Invify' Watermark" dark />
              </div>
              <div class="col-12 col-md-6 row items-center justify-center">
                <div class="column items-center bg-subpanel q-pa-xl rounded-borders border-main" style="width: 100%;">
                  <q-icon name="dashboard" size="xl" :style="{ color: mockSettings.primaryColor }" />
                  <div class="q-mt-sm text-weight-bold" style="letter-spacing: 2px;">{{ mockSettings.platformName.toUpperCase() }}</div>
                  <div class="text-caption text-muted q-mt-md" v-if="!mockSettings.hideInvifyWatermark">Powered by Invify OPS Core</div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- PAYOUT SETTINGS TAB -->
      <q-tab-panel name="payout" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="row items-center op-gap-10 q-mb-md">
              <q-icon name="schedule" color="green-4" size="sm" />
              <div>
                <div class="text-h6 text-main">Automated Daily Payout Time</div>
                <div class="text-caption text-muted">Set the global time at which the platform will trigger automated daily payout sweeps for all tenants.</div>
              </div>
            </div>

            <div class="row q-col-gutter-lg items-start">
              <div class="col-12 col-md-5">
                <q-banner rounded class="bg-subpanel border-main q-mb-md">
                  <template v-slot:avatar><q-icon name="info" color="cyan-4" /></template>
                  <span class="text-caption text-main">This time will appear on the tenant's Payout Orchestrator as the configured daily sweep time. Tenants cannot override this value.</span>
                </q-banner>

                <div class="enterprise-subpanel q-pa-md rounded-borders border-main q-mb-md">
                  <div class="text-caption text-muted font-mono q-mb-sm">DAILY PAYOUT TRIGGER TIME (WAT)</div>
                  <div class="row items-center op-gap-12">
                    <q-input
                      id="daily-payout-time-input"
                      v-model="payoutStore.dailyPayoutTime"
                      outlined dense dark
                      type="time"
                      label="Payout Time (HH:MM)"
                      style="width: 180px;"
                      class="font-mono text-weight-bold"
                    />
                    <div class="column">
                      <div class="text-caption text-muted">Current setting</div>
                      <div class="text-weight-bold text-green-4 font-mono text-subtitle1">{{ payoutStore.dailyPayoutTime || '23:59' }} WAT</div>
                    </div>
                  </div>
                </div>

                <div class="enterprise-subpanel q-pa-md rounded-borders border-main">
                  <div class="text-caption text-muted font-mono q-mb-sm">ON-DEMAND (MANUAL) DISPATCH FEE</div>
                  <div class="text-caption text-grey-5 q-mb-sm">Fee charged to tenants who choose to manually dispatch a payout outside the automated schedule.</div>
                  <div class="row items-center op-gap-12">
                    <q-input
                      id="manual-dispatch-fee-input"
                      v-model.number="payoutStore.manualDispatchFee"
                      outlined dense dark
                      type="number"
                      label="Fee Amount"
                      style="width: 140px;"
                      class="font-mono"
                    />
                    <q-select
                      id="manual-dispatch-fee-type-select"
                      v-model="payoutStore.manualDispatchFeeType"
                      outlined dense dark
                      :options="['Fixed Amount', 'Percentage (%)']" 
                      label="Fee Type"
                      style="width: 180px;"
                    />
                  </div>
                </div>
              </div>

              <div class="col-12 col-md-7">
                <q-card flat class="bg-subpanel border-main q-pa-md">
                  <div class="text-caption text-muted font-mono q-mb-md border-bottom q-pb-xs">PAYOUT SCHEDULE PREVIEW</div>
                  <div class="column q-gutter-y-sm">
                    <div class="row items-center op-gap-12 q-pa-sm rounded-borders" style="background: rgba(81,207,102,0.07); border: 1px solid rgba(81,207,102,0.2);">
                      <q-icon name="today" color="green-4" size="sm" />
                      <div class="col">
                        <div class="text-caption text-weight-bold text-white">Automated Daily Sweep</div>
                        <div class="text-caption text-grey-5 font-mono">Triggers every day at <span class="text-green-4">{{ payoutSettings.dailyPayoutTime || '23:59' }} WAT</span></div>
                      </div>
                      <q-badge color="green-10" text-color="green-3">ACTIVE</q-badge>
                    </div>
                    <div class="row items-center op-gap-12 q-pa-sm rounded-borders" style="background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);">
                      <q-icon name="date_range" color="indigo-4" size="sm" />
                      <div class="col">
                        <div class="text-caption text-weight-bold text-white">Automated Weekly Sweep</div>
                        <div class="text-caption text-grey-5 font-mono">Tenant selects preferred day & time — <span class="text-indigo-4">admin notified on setup</span></div>
                      </div>
                      <q-badge color="indigo-10" text-color="indigo-3">TENANT-CONFIGURED</q-badge>
                    </div>
                    <div class="row items-center op-gap-12 q-pa-sm rounded-borders" style="background: rgba(252,100,25,0.07); border: 1px solid rgba(252,100,25,0.2);">
                      <q-icon name="touch_app" color="orange-4" size="sm" />
                      <div class="col">
                        <div class="text-caption text-weight-bold text-white">Manual On-Demand Dispatch</div>
                        <div class="text-caption text-grey-5 font-mono">Extra fee applies: <span class="text-orange-4">{{ payoutSettings.manualDispatchFeeType === 'Percentage (%)' ? payoutSettings.manualDispatchFee + '%' : (currentCurrency.symbol + (payoutSettings.manualDispatchFee || 0).toLocaleString()) }}</span></div>
                      </div>
                      <q-badge color="orange-10" text-color="orange-3">FEE APPLIES</q-badge>
                    </div>
                  </div>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Add/Edit Currency Dialog -->
    <q-dialog v-model="showAddCurrencyDialog">
      <q-card style="width: 400px; max-width: 90vw;" class="enterprise-panel bg-panel text-main border-main">
        <q-card-section class="row items-center q-pb-none border-bottom q-py-sm">
          <div class="text-subtitle2 text-weight-bold">{{ isEditing ? 'Edit Currency' : 'Add Currency' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input outlined dense dark v-model="form.name" label="Currency Name (e.g. Naira)" class="q-mb-md" />
          <q-input outlined dense dark v-model="form.code" label="Currency Code (e.g. NGN)" class="q-mb-md" />
          <q-input outlined dense dark v-model="form.symbol" :label="`Currency Symbol (e.g. ${currentCurrency.symbol})`" class="q-mb-md" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md border-top">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated color="cyan-6" label="Save Config" @click="saveCurrency" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Debug section at the bottom -->
    <div class="q-mt-xl q-pa-sm bg-dark text-grey-5 rounded-borders font-mono text-caption text-center border-main">
      [LOCALSTORAGE DEBUG] Active Key: platform_payout_settings | Raw Value: {{ localStorageDebug }}
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useCurrency } from '../../composables/useCurrency';
import { adminApi } from '../../api';
import { usePlatformPayoutSettingsStore } from '../../stores/platformPayoutSettings.store';

const $q = useQuasar();
const { currentCurrency, setCurrency } = useCurrency();
const payoutStore = usePlatformPayoutSettingsStore();

const activeTab = ref('general');
const mockSettings = ref({
  platformName: 'INVIFY ENTERPRISE CORE',
  supportEmail: 'soc-support@invify.com',
  timezone: 'UTC',
  requireMFA: true,
  strictIPBinding: true,
    sessionTimeout: 6,
  primaryColor: '#26A69A',
  logoUrl: 'https://cdn.invify.com/enterprise-logo.png',
  hideInvifyWatermark: false,
  auditArchiveHours: 72,
  enforceDeviceControl: false,
  isMaintenanceLocked: false,
  maintenanceMessage: 'System is currently under maintenance. Please try again later.',
  metaAccessToken: '',
  whatsappPhoneNumberId: '',
  whatsappBusinessAccountId: '',
  quasarClientId: '',
  quasarClientSecret: '',
  quasarBaseUrl: '',
  lessonAiApiKey: ''
});

const quasarBaseNormalized = computed(() => {
  let u = String(mockSettings.value.quasarBaseUrl || '').trim();
  if (!u) return 'https://api-quasar.invify.org/api/v1';
  u = u.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const suffixes = ['/pos/card-transaction', '/pos/icc-data', '/pos/transactionFromMpos', '/pos/icc'];
  for (const s of suffixes) {
    if (u.toLowerCase().endsWith(s)) {
      u = u.slice(0, -s.length).replace(/\/+$/, '');
      break
    }
  }
  return u || 'https://api-quasar.invify.org/api/v1';
});
const quasarCardTransactionPreview = computed(() => `${quasarBaseNormalized.value}/pos/card-transaction`);
const quasarIccDataPreview = computed(() => `${quasarBaseNormalized.value}/pos/icc-data`);
const quasarMposBackupPreview = computed(() => `${quasarBaseNormalized.value}/pos/transactionFromMpos`);

const pingingQuasar = ref(false);
const quasarPingResult = ref(null);

async function pingQuasarSwitch() {
  pingingQuasar.value = true;
  quasarPingResult.value = null;
  const started = Date.now();
  try {
    // Prefer live probe; fall back to full health report for richer errors
    let liveOk = false;
    let liveMsg = '';
    try {
      const live = await adminApi.pingQuasar();
      liveOk = live?.data?.data?.alive === true || live?.status === 200;
      liveMsg = live?.data?.responseMessage || 'reachable';
    } catch (e) {
      liveOk = false;
      liveMsg = e?.response?.data?.responseMessage || e?.message || 'unreachable';
    }

    let detail = liveMsg;
    try {
      const full = await adminApi.getQuasarHealth();
      const report = full?.data?.data || full?.data;
      if (report) {
        detail = [
          `status=${report.overallStatus || (liveOk ? 'healthy' : 'unreachable')}`,
          report.apiLatencyMs != null ? `latency=${report.apiLatencyMs}ms` : `rtt=${Date.now() - started}ms`,
          report.apiReachable != null ? `apiReachable=${report.apiReachable}` : null,
          Array.isArray(report.alerts) && report.alerts.length ? `alerts=${report.alerts.length}` : null,
        ].filter(Boolean).join(' · ');
        if (report.apiReachable === false) liveOk = false;
        if (report.apiReachable === true) liveOk = true;
      }
    } catch (_) {
      detail = `${liveMsg} · rtt=${Date.now() - started}ms · base=${quasarBaseNormalized.value}`;
    }

    quasarPingResult.value = {
      ok: liveOk,
      label: liveOk ? 'Quasar UP' : 'Quasar DOWN',
      detail: `${detail} · ${quasarBaseNormalized.value}`,
    };
    $q.notify({
      type: liveOk ? 'positive' : 'negative',
      message: liveOk ? 'Quasar is reachable' : 'Quasar did not respond',
      caption: detail,
    });
  } catch (e) {
    quasarPingResult.value = {
      ok: false,
      label: 'Quasar DOWN',
      detail: e?.message || 'Ping failed',
    };
    $q.notify({ type: 'negative', message: 'Quasar ping failed: ' + (e?.message || e) });
  } finally {
    pingingQuasar.value = false;
  }
}

// POS encryption key (Quasar rotate)
const quasarIntegrations = ref([]);
const loadingQuasarIntegrations = ref(false);
const posKeyStatus = ref(null);
const loadingPosKeyStatus = ref(false);
const rotatingPosKey = ref(false);
const storingPosKey = ref(false);
const showPosKeyRevealDialog = ref(false);
const showPastePosKeyDialog = ref(false);
const pastePosKeyValue = ref('');
const lastPosKeyResult = ref(null);
const apiKeyStatus = ref(null);
const loadingApiKeyStatus = ref(false);
const issuingLiveApiKey = ref(false);
const posKeyForm = ref({
  selectedIntegration: null,
  quasarTenantId: '',
  adminJwt: '',
  applyAsPlatformDefault: true,
});

const quasarIntegrationOptions = computed(() =>
  (quasarIntegrations.value || []).map((row) => ({
    label: `${row.invifyTenantId?.slice(0, 8)}… → ${row.quasarTenantId?.slice(0, 8)}… (${row.vertical || 'n/a'} / ${row.status})`,
    value: row.invifyTenantId,
    quasarTenantId: row.quasarTenantId,
  })),
);

const globalPosKeyConfigured = computed(
  () =>
    Boolean(posKeyStatus.value?.globalConfigured) ||
    Boolean(posKeyStatus.value?.sources?.globalSettings) ||
    Boolean(posKeyStatus.value?.sources?.runtimeEnv),
);

const canRotatePosKey = computed(() => Boolean(String(posKeyForm.value.quasarTenantId || '').trim()));

async function loadQuasarIntegrations() {
  loadingQuasarIntegrations.value = true;
  try {
    const res = await adminApi.listQuasarIntegrations();
    quasarIntegrations.value = res.data?.data || res.data || [];
    if (!posKeyForm.value.selectedIntegration && quasarIntegrations.value.length === 1) {
      posKeyForm.value.selectedIntegration = quasarIntegrations.value[0].invifyTenantId;
      posKeyForm.value.quasarTenantId = quasarIntegrations.value[0].quasarTenantId || '';
    }
  } catch (e) {
    console.warn('Failed to load Quasar integrations', e);
  } finally {
    loadingQuasarIntegrations.value = false;
  }
}

async function refreshPosKeyStatus() {
  loadingPosKeyStatus.value = true;
  try {
    const res = await adminApi.getQuasarPosEncryptionKeyStatus({
      invifyTenantId: posKeyForm.value.selectedIntegration || undefined,
    });
    posKeyStatus.value = res.data;
    if (!posKeyForm.value.quasarTenantId && res.data?.quasarTenantId) {
      posKeyForm.value.quasarTenantId = res.data.quasarTenantId;
    }
  } catch (e) {
    console.warn('Failed to load POS key status', e);
  } finally {
    loadingPosKeyStatus.value = false;
  }
}

async function refreshApiKeyStatus() {
  if (!posKeyForm.value.selectedIntegration) {
    apiKeyStatus.value = null;
    return;
  }
  loadingApiKeyStatus.value = true;
  try {
    const res = await adminApi.getQuasarApiKeyStatus({
      invifyTenantId: posKeyForm.value.selectedIntegration,
    });
    apiKeyStatus.value = res.data;
  } catch (e) {
    console.warn('Failed to load Quasar API key status', e);
    apiKeyStatus.value = null;
  } finally {
    loadingApiKeyStatus.value = false;
  }
}

function confirmIssueLiveApiKey() {
  if (!posKeyForm.value.selectedIntegration) return;
  $q.dialog({
    title: 'Issue Quasar sk_live_*?',
    message:
      'Creates a live tenant API key on Quasar (required for /pos/icc-data and card-transaction), then stores it in Invify vault + quasar_integrations. Replaces the current sk_test_* for this tenant.',
    cancel: true,
    persistent: true,
    ok: { label: 'Issue Live Key', color: 'amber-9' },
  }).onOk(() => issueLiveApiKey());
}

async function issueLiveApiKey() {
  issuingLiveApiKey.value = true;
  try {
    const res = await adminApi.issueQuasarLiveApiKey({
      invifyTenantId: posKeyForm.value.selectedIntegration,
    });
    $q.notify({
      type: 'positive',
      message: `Live key issued (${res.data?.fingerprint || res.data?.keyPrefix || 'sk_live_*'})`,
      timeout: 6000,
    });
    await refreshApiKeyStatus();
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.error || e.message || 'Failed to issue live API key',
      timeout: 8000,
    });
  } finally {
    issuingLiveApiKey.value = false;
  }
}

function openPasteGlobalPosKey() {
  posKeyForm.value.applyAsPlatformDefault = true;
  showPastePosKeyDialog.value = true;
}

function confirmRotatePosKey() {
  $q.dialog({
    title: 'Generate global POS encryption key?',
    message:
      'This rotates the key on Quasar for the Quasar tenant UUID below, then stores it as Invify’s global platform key (when the toggle is on).',
    cancel: true,
    persistent: true,
    ok: { label: 'Generate & Store Global', color: 'cyan-8' },
  }).onOk(() => rotatePosKey());
}

async function rotatePosKey() {
  rotatingPosKey.value = true;
  try {
    const res = await adminApi.rotateQuasarPosEncryptionKey({
      invifyTenantId: posKeyForm.value.selectedIntegration || undefined,
      quasarTenantId: String(posKeyForm.value.quasarTenantId || '').trim(),
      adminJwt: posKeyForm.value.adminJwt || undefined,
      applyAsPlatformDefault: posKeyForm.value.applyAsPlatformDefault !== false,
    });
    lastPosKeyResult.value = res.data;
    showPosKeyRevealDialog.value = true;
    posKeyForm.value.adminJwt = '';
    $q.notify({ type: 'positive', message: 'Global POS encryption key generated and stored' });
    await refreshPosKeyStatus();
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.error || e.message || 'Rotate failed',
      timeout: 8000,
    });
    // Stale Invify/expired JWT in the field often causes 401 — clear so next try uses vault login
    if (String(e.response?.data?.error || e.message || '').includes('401')) {
      posKeyForm.value.adminJwt = '';
    }
  } finally {
    rotatingPosKey.value = false;
  }
}

async function storePastedPosKey() {
  storingPosKey.value = true;
  try {
    const res = await adminApi.storeQuasarPosEncryptionKey({
      encryption_key_base64: pastePosKeyValue.value,
      invifyTenantId: posKeyForm.value.selectedIntegration || undefined,
      applyAsPlatformDefault: true,
    });
    lastPosKeyResult.value = res.data;
    showPastePosKeyDialog.value = false;
    pastePosKeyValue.value = '';
    showPosKeyRevealDialog.value = true;
    $q.notify({ type: 'positive', message: 'Global POS key stored on Invify' });
    await refreshPosKeyStatus();
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.error || e.message || 'Store failed',
    });
  } finally {
    storingPosKey.value = false;
  }
}

async function copyPosKey() {
  const key = lastPosKeyResult.value?.encryptionKeyBase64;
  if (!key) return;
  try {
    await navigator.clipboard.writeText(key);
    $q.notify({ type: 'positive', message: 'Key copied' });
  } catch {
    $q.notify({ type: 'warning', message: 'Could not copy — select and copy manually' });
  }
}

watch(
  () => posKeyForm.value.selectedIntegration,
  (invifyId) => {
    const selected = quasarIntegrationOptions.value.find((o) => o.value === invifyId);
    if (selected?.quasarTenantId) {
      posKeyForm.value.quasarTenantId = selected.quasarTenantId;
    }
    refreshPosKeyStatus();
    refreshApiKeyStatus();
  },
);

// Payout settings — thin alias to the shared Pinia store.
// The store auto-hydrates from localStorage and is reactive:
// tenant page reacts instantly when admin saves.
const payoutSettings = {
  get dailyPayoutTime()      { return payoutStore.dailyPayoutTime },
  get manualDispatchFee()    { return payoutStore.manualDispatchFee },
  get manualDispatchFeeType(){ return payoutStore.manualDispatchFeeType },
};

const currencyColumns = [
  { name: 'name', label: 'Currency Name', align: 'left', field: 'name', sortable: true },
  { name: 'code', label: 'Code', align: 'left', field: 'code', sortable: true },
  { name: 'symbol', label: 'Symbol', align: 'center', field: 'symbol' },
  { name: 'status', label: 'Status', align: 'center' },
  { name: 'actions', label: 'Actions', align: 'right' },
];

const defaultCurrencies = [
  { name: 'Naira', code: 'NGN', symbol: currentCurrency.symbol },
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'British Pound', code: 'GBP', symbol: '£' },
];

const currencyList = ref([]);

const localStorageDebug = ref('NOT_LOADED');

function updateDebug() {
  localStorageDebug.value = localStorage.getItem('platform_payout_settings') || 'NOT_FOUND';
}

onMounted(async () => {
  updateDebug();
  setInterval(updateDebug, 1000);
  await fetchSettings();
  await loadQuasarIntegrations();
  await refreshPosKeyStatus();
  await refreshApiKeyStatus();
  const savedList = localStorage.getItem('platform_currencies_list');
  if (savedList) {
    currencyList.value = JSON.parse(savedList);
  } else {
    currencyList.value = [...defaultCurrencies];
    localStorage.setItem('platform_currencies_list', JSON.stringify(currencyList.value));
  }
});

async function fetchSettings() {
  try {
    const res = await adminApi.getGlobalSettings();
    if (res.data) {
      const data = res.data;
      mockSettings.value.platformName = data.platform_name || data.platformName || mockSettings.value.platformName;
      mockSettings.value.supportEmail = data.support_email || data.supportEmail || mockSettings.value.supportEmail;
      mockSettings.value.timezone = data.timezone || mockSettings.value.timezone;
      mockSettings.value.requireMFA = data.require_mfa !== undefined ? data.require_mfa : (data.requireMFA !== undefined ? data.requireMFA : mockSettings.value.requireMFA);
      mockSettings.value.strictIPBinding = data.strict_ip_binding !== undefined ? data.strict_ip_binding : (data.strictIPBinding !== undefined ? data.strictIPBinding : mockSettings.value.strictIPBinding);
      mockSettings.value.sessionTimeout = data.session_timeout !== undefined ? data.session_timeout : (data.sessionTimeout !== undefined ? data.sessionTimeout : mockSettings.value.sessionTimeout);
      mockSettings.value.primaryColor = data.primary_color || data.primaryColor || mockSettings.value.primaryColor;
      mockSettings.value.logoUrl = data.logo_url || data.logoUrl || mockSettings.value.logoUrl;
      mockSettings.value.hideInvifyWatermark = data.hide_invify_watermark !== undefined ? data.hide_invify_watermark : (data.hideInvifyWatermark !== undefined ? data.hideInvifyWatermark : mockSettings.value.hideInvifyWatermark);
      mockSettings.value.auditArchiveHours = data.audit_retention_hours !== undefined ? data.audit_retention_hours : (data.auditArchiveHours !== undefined ? data.auditArchiveHours : 72);
      mockSettings.value.enforceDeviceControl = data.enforce_device_control !== undefined ? data.enforce_device_control : (data.enforceDeviceControl !== undefined ? data.enforceDeviceControl : false);
      mockSettings.value.isMaintenanceLocked = data.is_maintenance_locked !== undefined ? data.is_maintenance_locked : false;
      mockSettings.value.maintenanceMessage = data.maintenance_message || 'System is currently under maintenance. Please try again later.';
      
      // Integrations
      mockSettings.value.metaAccessToken = data.meta_access_token || '';
      mockSettings.value.whatsappPhoneNumberId = data.whatsapp_phone_number_id || '';
      mockSettings.value.whatsappBusinessAccountId = data.whatsapp_business_account_id || '';
      mockSettings.value.quasarClientId = data.quasar_client_id || '';
      mockSettings.value.quasarClientSecret = data.quasar_client_secret || '';
      mockSettings.value.quasarBaseUrl = data.quasar_base_url || data.quasarBaseUrl || '';
      mockSettings.value.lessonAiApiKey = data.lesson_ai_api_key || '';

      // Populate Payout Settings Store
      payoutStore.dailyPayoutTime = data.daily_payout_time || data.dailyPayoutTime || payoutStore.dailyPayoutTime;
      payoutStore.manualDispatchFee = data.manual_dispatch_fee ?? data.manualDispatchFee ?? payoutStore.manualDispatchFee;
      payoutStore.manualDispatchFeeType = data.manual_dispatch_fee_type || data.manualDispatchFeeType || payoutStore.manualDispatchFeeType;
    }
  } catch (err) {
    console.error('Failed to load global platform settings:', err);
  }
}

async function saveAllSettings() {
  // Step 1: Always persist payout settings locally first (store → localStorage).
  // These fields are not yet in the backend schema — saving them client-side is safe and instant.
  payoutStore.persist();

  // Step 2: Send only the known platform config fields to the backend.
  try {
    const payload = {
      platform_name: mockSettings.value.platformName,
      support_email: mockSettings.value.supportEmail,
      timezone: mockSettings.value.timezone,
      require_mfa: mockSettings.value.requireMFA,
      strict_ip_binding: mockSettings.value.strictIPBinding,
      session_timeout: Number(mockSettings.value.sessionTimeout),
      primary_color: mockSettings.value.primaryColor,
      logo_url: mockSettings.value.logoUrl,
      hide_invify_watermark: mockSettings.value.hideInvifyWatermark,
      audit_retention_hours: Number(mockSettings.value.auditArchiveHours),
      enforce_device_control: mockSettings.value.enforceDeviceControl,
      is_maintenance_locked: mockSettings.value.isMaintenanceLocked,
      maintenance_message: mockSettings.value.maintenanceMessage,
      meta_access_token: mockSettings.value.metaAccessToken,
      whatsapp_phone_number_id: mockSettings.value.whatsappPhoneNumberId,
      whatsapp_business_account_id: mockSettings.value.whatsappBusinessAccountId,
      quasar_client_id: mockSettings.value.quasarClientId,
      quasar_client_secret: mockSettings.value.quasarClientSecret,
      quasar_base_url: String(mockSettings.value.quasarBaseUrl || '').trim(),
      lesson_ai_api_key: mockSettings.value.lessonAiApiKey,
      // Payout settings keys — written to global_settings.json on the server
      daily_payout_time: payoutStore.dailyPayoutTime,
      manual_dispatch_fee: payoutStore.manualDispatchFee,
      manual_dispatch_fee_type: payoutStore.manualDispatchFeeType
    };
    await adminApi.updateGlobalSettings(payload);
    $q.notify({
      type: 'positive',
      message: 'Platform configuration saved successfully. Payout settings applied.'
    });
  } catch (err) {
    $q.notify({
      type: 'warning',
      icon: 'cloud_off',
      message: 'Payout settings applied locally! (Server settings failed to sync: ' + (err.response?.data?.error || err.message) + ')'
    });
  }
}

const showAddCurrencyDialog = ref(false);
const isEditing = ref(false);
const form = ref({ name: '', code: '', symbol: '' });
let editingIndex = -1;

function activateCurrency(currency) {
  setCurrency(currency);
  $q.notify({
    type: 'positive',
    message: `Global platform currency updated to ${currency.name} (${currency.symbol})`
  });
}

function editCurrency(currency) {
  isEditing.value = true;
  form.value = { ...currency };
  editingIndex = currencyList.value.findIndex(c => c.code === currency.code);
  showAddCurrencyDialog.value = true;
}

function saveCurrency() {
  if (!form.value.name || !form.value.code || !form.value.symbol) {
    $q.notify({ type: 'negative', message: 'All fields are required.' });
    return;
  }

  if (isEditing.value && editingIndex > -1) {
    currencyList.value[editingIndex] = { ...form.value };
    // update current if active
    if (currentCurrency.value.code === form.value.code) {
      setCurrency({ ...form.value });
    }
  } else {
    currencyList.value.push({ ...form.value });
  }

  localStorage.setItem('platform_currencies_list', JSON.stringify(currencyList.value));
  showAddCurrencyDialog.value = false;
  
  $q.notify({
    type: 'positive',
    message: isEditing.value ? 'Currency updated.' : 'New currency added.'
  });
}

watch(showAddCurrencyDialog, (val) => {
  if (!val) {
    isEditing.value = false;
    form.value = { name: '', code: '', symbol: '' };
    editingIndex = -1;
  }
});
</script>
