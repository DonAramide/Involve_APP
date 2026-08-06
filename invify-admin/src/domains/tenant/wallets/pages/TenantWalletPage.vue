<!-- invify-admin/src/pages/tenant/TenantWalletPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Top Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="account_balance_wallet" color="green-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Wallet & Treasury</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage treasury nodes, withdrawals, settlement accounts, and payout schedules.
        </div>
      </div>
    </div>

    <!-- 1. Stripe-Grade Balance & Payout Grid -->
    <div class="row q-col-gutter-lg q-mb-lg">
      
      <!-- Premium Digital Card Card Mockup -->
      <div class="col-12 col-md-5">
        <q-card class="digital-card q-pa-lg column justify-between relative-position overflow-hidden transition-3">
          <div class="watermark-bg" style="opacity: 0.15; filter: hue-rotate(150deg);" />
          
          <div class="row items-center justify-between">
            <span class="text-metric-mono text-weight-bolder text-uppercase letter-spacing-3" style="font-size: 11px;">QUASAR TREASURY</span>
            <q-icon name="wifi_tethering" color="white" size="sm" />
          </div>

          <div class="q-my-lg">
            <div class="text-caption text-grey-4 text-weight-medium">AVAILABLE FOR IMMEDIATE SETTLEMENT</div>
            <div class="text-h3 text-weight-bold text-white text-metric-mono q-mt-xs">{{ currentCurrency.symbol }}{{ availableBalance.toLocaleString() }}</div>
          </div>

          <div class="row items-center justify-between">
            <div>
              <div class="text-metric-mono text-grey-4" style="font-size: 9px;">ACTIVE TREASURY NODE ID</div>
              <div class="text-metric-mono font-mono text-white text-weight-bold" style="font-size: 11px;">node-quasar-8239x-inv</div>
            </div>
            <q-badge color="green-10" text-color="green-3" class="text-metric-sm text-weight-bold">SECURED BY Q-Ledger</q-badge>
          </div>
        </q-card>
      </div>

      <!-- Instant Settlement & Withdrawal Desk -->
      <div class="col-12 col-md-7">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit column justify-between">
          <div>
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Instant Settlement Dispatch</div>
            <div class="text-caption text-grey-5 q-mb-md">Withdraw funds securely to your verified corporate settlement account.</div>
            
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-sm-8">
                <q-input v-model.number="withdrawalAmount" type="number" dark outlined dense :prefix="currentCurrency.symbol" placeholder="Enter transfer amount..." class="font-mono text-caption" />
              </div>
              <div class="col-12 col-sm-4">
                <q-btn unelevated color="green-10" label="Initiate Payout" :loading="withdrawing" @click="dispatchPayout" class="full-width text-weight-bold letter-spacing-1 h-full" style="min-height: 40px;" />
              </div>
            </div>

            <!-- Settlement Destination -->
            <div class="row items-center justify-between q-pa-md rounded-borders border-grey-9 bg-black-transparent q-mb-md">
              <div class="row items-center op-gap-10 col">
                <q-icon name="account_balance" :color="hasBankConfigured ? 'indigo-4' : 'amber-5'" size="sm" />
                <div v-if="hasBankConfigured" class="col">
                  <div class="text-caption text-weight-bold text-white">{{ bankDetails.bank_name || 'Verified Bank' }}</div>
                  <div class="text-caption text-grey-5 font-mono">
                    {{ bankDetails.account_name }} — {{ maskedAccountNumber }}
                  </div>
                </div>
                <div v-else class="col">
                  <div class="text-caption text-weight-bold text-amber-5">No Bank Account Configured</div>
                  <div class="text-caption text-grey-5" style="font-size: 11px;">Configure your bank account to enable withdrawals.</div>
                </div>
              </div>
              <div class="row items-center op-gap-8">
                <q-badge v-if="hasBankConfigured" color="indigo-10" text-color="indigo-3" class="text-metric-sm text-weight-bold">PRIMARY</q-badge>
                <q-btn
                  id="configure-bank-btn"
                  flat dense round
                  :color="hasBankConfigured ? 'grey-5' : 'amber-5'"
                  icon="edit"
                  size="sm"
                  @click="showBankSetupDialog = true"
                >
                  <q-tooltip>{{ hasBankConfigured ? 'Edit Bank Account' : 'Setup Bank Account' }}</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <div class="text-caption text-grey-6 font-mono row items-center op-gap-6 q-mt-sm">
            <q-icon name="security" size="xs" />
            <span>Withdrawals are processed under replay-safe sequence checks (SLA-Standard: 2m).</span>
          </div>
        </q-card>
      </div>

    </div>

      <!-- 2. Payout Scheduling & Treasury Parameters -->
    <div class="row q-col-gutter-lg">
      
      <!-- Payout Scheduler -->
      <div class="col-12 col-md-6">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="row items-center justify-between q-mb-xs">
            <div class="text-h6 text-weight-bold text-white">Payout Orchestrator</div>
            <q-badge color="green-10" text-color="green-3" class="text-metric-sm">{{ activeScheduleLabel }}</q-badge>
          </div>
          <div class="text-caption text-grey-5 q-mb-md">Configure automated settlement sweep parameters.</div>

          <div class="column q-gutter-y-md">

            <!-- DAILY SCHEDULE -->
            <div 
              class="q-pa-md rounded-borders border-grey-9 cursor-pointer transition-3 row items-center justify-between"
              :class="activeSchedule === 'daily' ? 'active-schedule' : 'bg-black-transparent'"
              @click="activeSchedule = 'daily'"
            >
              <div class="row items-center op-gap-12">
                <q-icon name="today" :color="activeSchedule === 'daily' ? 'green-4' : 'grey-5'" size="sm" />
                <div>
                  <div class="text-caption text-weight-bold text-white">Automated Daily Sweep</div>
                  <div class="text-caption text-grey-5" style="font-size: 11px;">
                    Admin-configured: triggers every day at
                    <span class="text-green-4 font-mono text-weight-bold">{{ adminDailyPayoutTime }} WAT</span>
                  </div>
                  <div v-if="activeSchedule === 'daily'" class="q-mt-xs">
                    <q-badge color="blue-10" text-color="blue-3" icon="lock" class="text-metric-sm">Time set by platform admin</q-badge>
                  </div>
                </div>
              </div>
              <q-radio v-model="activeSchedule" val="daily" dark color="green-4" />
            </div>

            <!-- WEEKLY SCHEDULE -->
            <div 
              class="rounded-borders border-grey-9 cursor-pointer transition-3 overflow-hidden"
              :class="activeSchedule === 'weekly' ? 'active-schedule' : 'bg-black-transparent'"
            >
              <div class="q-pa-md row items-center justify-between" @click="activeSchedule = 'weekly'">
                <div class="row items-center op-gap-12">
                  <q-icon name="date_range" :color="activeSchedule === 'weekly' ? 'indigo-4' : 'grey-5'" size="sm" />
                  <div>
                    <div class="text-caption text-weight-bold text-white">Automated Weekly Sweep</div>
                    <div class="text-caption text-grey-5" style="font-size: 11px;">
                      <span v-if="activeSchedule === 'weekly' && weeklySentToAdmin">
                        Scheduled: <span class="text-indigo-4 font-mono">{{ weeklySchedule.day }} at {{ weeklySchedule.time }} WAT</span>
                        <q-icon name="check_circle" color="green-4" size="xs" class="q-ml-xs" />
                      </span>
                      <span v-else>Select your preferred day & time. Notifies admin on save.</span>
                    </div>
                  </div>
                </div>
                <q-radio v-model="activeSchedule" val="weekly" dark color="indigo-4" />
              </div>

              <!-- Expanded Picker (only when weekly is active) -->
              <transition name="expand">
                <div v-if="activeSchedule === 'weekly'" class="q-px-md q-pb-md border-top-subtle">
                  <div class="text-caption text-muted font-mono q-mb-sm q-pt-sm">CHOOSE YOUR WEEKLY SWEEP SCHEDULE</div>
                  <div class="row q-col-gutter-sm q-mb-sm">
                    <div class="col-12 col-sm-6">
                      <q-select
                        id="weekly-day-select"
                        v-model="weeklySchedule.day"
                        :options="weekDays"
                        outlined dense dark
                        label="Day of Week"
                        class="font-mono"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input
                        id="weekly-time-input"
                        v-model="weeklySchedule.time"
                        type="time"
                        outlined dense dark
                        label="Time (HH:MM)"
                        class="font-mono"
                      />
                    </div>
                  </div>
                  <q-btn
                    id="weekly-send-admin-btn"
                    unelevated color="indigo-7" icon="send" label="Confirm & Notify Admin"
                    size="sm" class="text-weight-bold full-width"
                    :loading="sendingWeekly"
                    :disable="!weeklySchedule.day || !weeklySchedule.time"
                    @click="confirmWeeklySchedule"
                  />
                </div>
              </transition>
            </div>

            <!-- MANUAL DISPATCH -->
            <div 
              class="q-pa-md rounded-borders border-grey-9 cursor-pointer transition-3 row items-center justify-between"
              :class="activeSchedule === 'manual' ? 'active-schedule-orange' : 'bg-black-transparent'"
              @click="activeSchedule = 'manual'"
            >
              <div class="row items-center op-gap-12">
                <q-icon name="touch_app" :color="activeSchedule === 'manual' ? 'orange-4' : 'grey-5'" size="sm" />
                <div>
                  <div class="text-caption text-weight-bold text-white">Manual Dispatch On-Demand</div>
                  <div class="text-caption text-grey-5" style="font-size: 11px;">Hold treasury balances. Withdraw manually whenever needed.</div>
                  <div v-if="activeSchedule === 'manual'" class="q-mt-xs">
                    <q-badge color="orange-10" text-color="orange-3" icon="warning" class="text-metric-sm">
                      Extra fee applies: {{ manualDispatchFeeLabel }}
                    </q-badge>
                  </div>
                </div>
              </div>
              <q-radio v-model="activeSchedule" val="manual" dark color="orange-4" />
            </div>

          </div>
        </q-card>
      </div>

      <!-- Treasury Ledger Flow Lineage -->
      <div class="col-12 col-md-6">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Ledger Lineage Tracking</div>
          <div class="text-caption text-grey-5 q-mb-md">Immutable cryptographic logs from Quasar Treasury node.</div>

          <div class="column q-gutter-y-sm">
            <div class="q-pa-md rounded-borders border-grey-9 bg-black-transparent row items-center justify-between" v-for="log in ledgerLogs" :key="log.id">
              <div class="col">
                <div class="row items-center op-gap-6 text-metric-mono font-mono text-weight-bold" style="font-size: 11px;">
                  <span class="text-uppercase" :class="log.type === 'sweep' ? 'text-green-4' : 'text-indigo-4'">{{ log.type }}</span>
                  <span class="text-grey-6">|</span>
                  <span class="text-grey-4">{{ log.ref }}</span>
                </div>
                <div class="text-caption text-grey-5 q-mt-xs">{{ log.desc }}</div>
              </div>
              
              <div class="text-right">
                <div class="text-metric-mono font-mono text-weight-bold text-white">{{ currentCurrency.symbol }}{{ log.amount.toLocaleString() }}</div>
                <div class="text-metric-sm text-grey-6 font-mono q-mt-xs">{{ log.time }}</div>
              </div>
            </div>
          </div>
        </q-card>
      </div>

    </div>

    <!-- ===== MANUAL DISPATCH FEE WARNING DIALOG ===== -->
    <q-dialog v-model="showManualFeeDialog" persistent>
      <q-card style="width: 460px; max-width: 95vw; border: 1px solid rgba(251,146,60,0.3); border-radius: 16px;" class="bg-card-dark text-white">
        <q-card-section class="row items-center q-pb-none q-pt-lg q-px-lg">
          <div class="row items-center op-gap-12 full-width">
            <div class="fee-warning-icon">
              <q-icon name="warning" color="orange-4" size="lg" />
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold text-white">Manual Dispatch Notice</div>
              <div class="text-caption text-grey-5">Extra charges apply for on-demand payouts</div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-px-lg q-pt-md">
          <q-banner rounded class="q-mb-md" style="background: rgba(251,146,60,0.08); border: 1px solid rgba(251,146,60,0.25);">
            <template v-slot:avatar>
              <q-icon name="info" color="orange-4" />
            </template>
            <div class="text-caption text-white">
              Choosing <strong>Manual Dispatch On-Demand</strong> means your payout will be processed immediately outside of the standard automated schedule.
              An additional fee is charged for this service.
            </div>
          </q-banner>

          <div class="rounded-borders q-pa-md q-mb-md" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06);">
            <div class="row justify-between q-mb-xs font-mono">
              <span class="text-grey-5 text-caption">Withdrawal Amount:</span>
              <span class="text-white text-weight-bold">{{ currentCurrency.symbol }}{{ (withdrawalAmount || 0).toLocaleString() }}</span>
            </div>
            <div class="row justify-between q-mb-xs font-mono">
              <span class="text-grey-5 text-caption">On-Demand Dispatch Fee:</span>
              <span class="text-orange-4 text-weight-bold">+ {{ manualDispatchFeeLabel }}</span>
            </div>
            <div class="row justify-between border-top-subtle q-pt-xs font-mono">
              <span class="text-grey-5 text-caption">Total Deducted:</span>
              <span class="text-green-4 text-weight-bold">{{ currentCurrency.symbol }}{{ computedManualTotal.toLocaleString() }}</span>
            </div>
          </div>

          <div class="text-caption text-grey-6 text-center">By proceeding, you agree to the extra dispatch fee. This action cannot be reversed.</div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-lg q-pt-none row op-gap-8">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup class="text-weight-bold" />
          <q-btn
            id="confirm-manual-dispatch-btn"
            unelevated color="orange-7" label="Proceed with Manual Dispatch"
            icon="bolt" class="text-weight-bold"
            :loading="withdrawing"
            @click="confirmManualDispatch"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== WEEKLY SCHEDULE SENT CONFIRMATION DIALOG ===== -->
    <q-dialog v-model="showWeeklyConfirmDialog">
      <q-card style="width: 400px; max-width: 95vw; border: 1px solid rgba(99,102,241,0.3); border-radius: 16px;" class="bg-card-dark text-white">
        <q-card-section class="flex flex-center column q-pa-xl">
          <q-icon name="check_circle" color="green-4" size="64px" class="q-mb-md" />
          <div class="text-h6 text-weight-bold text-white text-center q-mb-xs">Schedule Request Sent!</div>
          <div class="text-caption text-grey-5 text-center q-mb-md">Your weekly payout preference has been submitted to the platform admin.</div>
          <div class="rounded-borders q-pa-md full-width" style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);">
            <div class="row justify-between font-mono q-mb-xs">
              <span class="text-grey-5 text-caption">Day:</span>
              <span class="text-indigo-4 text-weight-bold">{{ weeklySchedule.day }}</span>
            </div>
            <div class="row justify-between font-mono">
              <span class="text-grey-5 text-caption">Time:</span>
              <span class="text-indigo-4 text-weight-bold">{{ weeklySchedule.time }} WAT</span>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn unelevated color="indigo-7" label="Done" v-close-popup class="text-weight-bold q-px-xl" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== TENANT BANK SETUP DIALOG ===== -->
    <q-dialog v-model="showBankSetupDialog" persistent>
      <q-card style="width: 460px; max-width: 95vw; border: 1px solid rgba(99,102,241,0.3); border-radius: 16px;" class="bg-card-dark text-white">
        <q-card-section class="row items-center q-pb-none q-pt-lg q-px-lg">
          <div class="row items-center op-gap-12 full-width">
            <div class="fee-warning-icon" style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);">
              <q-icon name="account_balance" color="indigo-4" size="md" />
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold text-white">Settlement Destination</div>
              <div class="text-caption text-grey-5">Configure the corporate bank details for dispatches</div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-px-lg q-pt-md">
          <div class="column q-gutter-y-md">
            <q-select
              id="bank-select"
              v-model="selectedBankOption"
              outlined dense dark
              :options="filteredBankOptions"
              use-input
              input-debounce="300"
              @filter="filterBanks"
              label="Select Payout Bank"
              :loading="loadingBanks"
              class="font-sans"
              popup-content-class="bg-card-dark text-white border-grey-9"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey-5">
                    No matching banks found
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-input
              id="account-number-input"
              v-model="bankForm.account_number"
              outlined dense dark
              label="Account Number"
              mask="##########"
              class="font-mono"
              placeholder="10-digit NUBAN"
            />

            <q-input
              id="account-name-input"
              v-model="bankForm.account_name"
              outlined dense dark
              label="Account Name"
              :loading="resolvingAccount"
              placeholder="Enter account name"
              hint="If lookup fails or is rate-limited, you can enter the account name manually."
              :error="resolutionError"
              :error-message="resolutionErrorMessage"
            >
              <template v-slot:append v-if="bankForm.account_name && !resolvingAccount && !resolutionError">
                <q-icon name="verified" color="green-4" />
              </template>
            </q-input>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-lg q-pt-none row op-gap-8">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup class="text-weight-bold" />
          <q-btn
            id="save-bank-btn"
            unelevated color="indigo-7" label="Save Bank Details"
            icon="save" class="text-weight-bold"
            :loading="savingBank"
            :disable="!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name"
            @click="saveBankDetails"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 3. Virtual Accounts Management & Sweeps -->
    <div class="row q-col-gutter-lg q-mt-lg">
      <div class="col-12">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-h6 text-weight-bold text-white">Virtual Account Reconciliation</div>
              <div class="text-caption text-grey-5">
                Monitor and sweep funds accumulated on customer and staff virtual accounts directly into the business's main wallet.
              </div>
            </div>
            <q-btn outline color="green-4" icon="refresh" label="Refresh Accounts" @click="fetchVirtualAccounts" :loading="loadingVAs" />
          </div>

          <!-- Virtual Accounts Table -->
          <q-table
            dark
            flat
            bordered
            :rows="virtualAccounts"
            :columns="vaColumns"
            row-key="accountNumber"
            :loading="loadingVAs"
            class="bg-black-transparent border-grey-9 text-white"
            :pagination="{ rowsPerPage: 10 }"
          >
            <!-- Type badge -->
            <template v-slot:body-cell-holderType="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'Staff' ? 'purple-10' : 'indigo-10'" :text-color="props.value === 'Staff' ? 'purple-3' : 'indigo-3'" class="text-weight-bold q-px-sm">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>

            <!-- Balance formatted with NGN symbol and exactly 2 decimals -->
            <template v-slot:body-cell-balance="props">
              <q-td :props="props" class="font-mono text-weight-bold text-green-4">
                ₦{{ props.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </q-td>
            </template>

            <!-- Actions (Sweep / History) -->
            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-right q-gutter-x-sm">
                <q-btn
                  flat dense color="indigo-4" icon="history" label="History" size="sm"
                  @click="viewVAHistory(props.row)"
                />
                <q-btn
                  unelevated color="green-10" text-color="green-3" icon="currency_exchange" label="Sweep Funds" size="sm"
                  :disable="props.row.balance <= 0"
                  @click="promptSweep(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

    <!-- 4. Quasar Transactions Daily Report -->
    <div class="row q-col-gutter-lg q-mt-lg">
      <div class="col-12">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-h6 text-weight-bold text-white">Quasar Transaction Ledger (Daily Report)</div>
              <div class="text-caption text-grey-5">
                View all electronic channel transactions (Card/POS, Inward Transfers to Virtual Accounts, and Payout Withdrawals) for any day.
              </div>
            </div>
            <div class="row items-center op-gap-8">
              <q-input
                v-model="reportDate"
                type="date"
                dark
                outlined
                dense
                label="Select Report Date"
                class="bg-black-transparent font-mono text-caption"
                style="min-width: 180px;"
                @update:model-value="fetchQuasarTransactions"
              />
              <q-btn outline color="green-4" icon="refresh" label="Refresh Ledger" @click="fetchQuasarTransactions" :loading="loadingQuasarTransactions" />
            </div>
          </div>

          <!-- Quasar Ledger Table -->
          <q-table
            dark
            flat
            bordered
            :rows="quasarTransactions"
            :columns="quasarColumns"
            row-key="id"
            :loading="loadingQuasarTransactions"
            class="bg-black-transparent border-grey-9 text-white"
            :pagination="{ rowsPerPage: 10 }"
          >
            <!-- Date Column -->
            <template v-slot:body-cell-createdAt="props">
              <q-td :props="props">
                {{ formatDate(props.value) }}
              </q-td>
            </template>

            <!-- Type Column -->
            <template v-slot:body-cell-type="props">
              <q-td :props="props">
                <q-badge
                  :color="props.row.type === 'payout' ? 'deep-orange-10' : (['card', 'pos'].includes((props.row.metadata?.payment_method || '').toLowerCase()) ? 'teal-10' : 'indigo-10')"
                  :text-color="props.row.type === 'payout' ? 'deep-orange-3' : (['card', 'pos'].includes((props.row.metadata?.payment_method || '').toLowerCase()) ? 'teal-3' : 'indigo-3')"
                  class="text-weight-bold q-px-sm"
                >
                  {{ getQuasarTransactionType(props.row) }}
                </q-badge>
              </q-td>
            </template>

            <!-- Amount formatted with NGN symbol and color code -->
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="font-mono text-weight-bold" :class="props.row.type === 'payout' ? 'text-deep-orange-4' : 'text-green-4'">
                {{ props.row.type === 'payout' ? '-' : '+' }}₦{{ Number(props.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </q-td>
            </template>

            <!-- Status Column -->
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="props.value === 'SUCCESS' ? 'green-10' : (props.value === 'PENDING' ? 'amber-10' : 'red-10')"
                  :text-color="props.value === 'SUCCESS' ? 'green-3' : (props.value === 'PENDING' ? 'amber-3' : 'red-3')"
                  class="text-weight-bold q-px-sm"
                >
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

    <!-- Virtual Account Transactions Dialog -->
    <q-dialog v-model="showHistoryDialog" backdrop-filter="blur(4px)">
      <q-card class="bg-card-dark text-white border-grey-9 q-pa-md" style="min-width: 450px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">
            <q-icon name="history" color="indigo-4" class="q-mr-sm" />
            Transaction History
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="text-caption text-grey-5 q-mb-md">
            Showing transactions for <strong>{{ selectedVA?.accountName }}</strong> ({{ selectedVA?.accountNumber }})
          </div>

          <div v-if="loadingHistory" class="row justify-center q-my-md">
            <q-spinner color="indigo-4" size="md" />
          </div>

          <div v-else-if="!vaTransactions.length" class="text-center text-grey-6 q-pa-lg">
            No recent inbound credits found for this account.
          </div>

          <q-list v-else separator class="border-grey-9 rounded-borders bg-black-transparent">
            <q-item v-for="tx in vaTransactions" :key="tx.id" class="q-py-md">
              <q-item-section>
                <q-item-label class="text-weight-bold text-white">{{ tx.channel }}</q-item-label>
                <q-item-label caption class="text-grey-5 font-mono text-caption">{{ tx.reference }}</q-item-label>
                <q-item-label caption class="text-grey-6 text-metric-sm">{{ formatDate(tx.createdAt) }}</q-item-label>
              </q-item-section>
              <q-item-section side class="text-right">
                <div class="text-weight-bold text-green-4 font-mono">
                  +₦{{ tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
                <q-badge color="green-10" text-color="green-3" class="q-mt-xs font-mono text-caption" dense>
                  {{ tx.status }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Sweep Confirmation Dialog -->
    <q-dialog v-model="showSweepDialog" backdrop-filter="blur(4px)">
      <q-card class="bg-card-dark text-white border-grey-9 q-pa-md" style="min-width: 400px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">
            <q-icon name="currency_exchange" color="green-4" class="q-mr-sm" />
            Sweep Virtual Account Funds
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-subtitle1 text-grey-4">
            Are you sure you want to sweep <strong>₦{{ selectedVA?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong> from <strong>{{ selectedVA?.accountName }}</strong>'s virtual account to the business internal wallet?
          </div>
          <div class="text-caption text-grey-5 q-mt-sm">
            This will instantly update your available balance to <strong>₦{{ (availableBalance + (selectedVA?.balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pt-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated label="Confirm Sweep" color="green-10" text-color="green-3" :loading="sweeping" @click="executeSweep" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Debug section at the absolute bottom -->
    <div class="q-mt-xl q-pa-sm bg-dark text-grey-5 rounded-borders font-mono text-caption text-center border-grey-9">
      [LOCALSTORAGE DEBUG] Active Key: platform_payout_settings | Raw Value: {{ localStorageDebug }}
    </div>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../../../composables/useCurrency';
import { useTenantWalletStore } from '../stores/tenantWalletStore';
import { usePlatformPayoutSettingsStore } from '../../../../stores/platformPayoutSettings.store';
import { adminApi } from '../../../../api';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';

const { currentCurrency } = useCurrency();
const $q = useQuasar();
const store = useTenantWalletStore();
const payoutCfg = usePlatformPayoutSettingsStore();
// Hydrate from localStorage in case this is the first load
payoutCfg.hydrate();

// --- Virtual Accounts Management State ---
const loadingVAs = ref(false)
const virtualAccounts = ref([])
const vaColumns = [
  { name: 'name', label: 'Account Holder', field: 'name', align: 'left', sortable: true },
  { name: 'holderType', label: 'Type', field: 'holderType', align: 'left', sortable: true },
  { name: 'bankName', label: 'Bank Name', field: 'bankName', align: 'left' },
  { name: 'accountNumber', label: 'Account Number', field: 'accountNumber', align: 'left', classes: 'font-mono' },
  { name: 'balance', label: 'Pending Balance', field: 'balance', align: 'right', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' }
]

const showSweepDialog = ref(false)
const showHistoryDialog = ref(false)
const selectedVA = ref(null)
const sweeping = ref(false)
const loadingHistory = ref(false)
const vaTransactions = ref([])

const quasarTransactions = ref([])
const loadingQuasarTransactions = ref(false)
const reportDate = ref(new Date().toISOString().split('T')[0])
const quasarColumns = [
  { name: 'createdAt', label: 'Timestamp', field: 'created_at', align: 'left', sortable: true },
  { name: 'reference', label: 'Reference', field: 'reference', align: 'left', classes: 'font-mono' },
  { name: 'type', label: 'Type', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
]

async function fetchQuasarTransactions() {
  loadingQuasarTransactions.value = true
  try {
    const res = await adminApi.getQuasarTransactions({ date: reportDate.value })
    if (res && res.data && res.data.data) {
      quasarTransactions.value = res.data.data
    }
  } catch (err) {
    console.error('[TenantWalletPage] Failed to fetch Quasar transactions:', err)
  } finally {
    loadingQuasarTransactions.value = false
  }
}

function getQuasarTransactionType(row) {
  if (row.type === 'payout') return 'Outward Transfer (Withdrawal)';
  const metadata = row.metadata || {};
  const method = (metadata.payment_method || row.type || 'transfer').toLowerCase();
  if (method === 'card' || method === 'pos') return 'Card Payment';
  return 'Inward Transfer (Virtual Account)';
}

async function fetchVirtualAccounts() {
  loadingVAs.value = true
  try {
    const res = await adminApi.getVirtualAccounts()
    if (res && res.data) {
      virtualAccounts.value = res.data
    }
  } catch (err) {
    console.error('[TenantWalletPage] Failed to fetch virtual accounts:', err)
  } finally {
    loadingVAs.value = false
  }
}

function promptSweep(row) {
  selectedVA.value = row
  showSweepDialog.value = true
}

async function executeSweep() {
  if (!selectedVA.value) return
  sweeping.value = true
  try {
    const res = await adminApi.sweepVirtualAccount(selectedVA.value.accountNumber, {
      amount: selectedVA.value.balance
    })
    if (res && res.data && res.data.success) {
      $q.notify({
        type: 'positive',
        message: res.data.message || 'Funds swept successfully!',
        icon: 'check_circle'
      })
      // Refresh wallet balance
      await store.loadWalletDetails()
      // Refresh virtual accounts list
      await fetchVirtualAccounts()
      showSweepDialog.value = false
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to sweep funds. Please try again.',
      icon: 'error'
    })
  } finally {
    sweeping.value = false
  }
}

async function viewVAHistory(row) {
  selectedVA.value = row
  showHistoryDialog.value = true
  loadingHistory.value = true
  try {
    const res = await adminApi.getVirtualAccountTransactions(row.accountNumber)
    if (res && res.data) {
      vaTransactions.value = res.data
    }
  } catch (err) {
    console.error('[TenantWalletPage] Failed to fetch VA history:', err)
  } finally {
    loadingHistory.value = false
  }
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString()
}

const { withdrawalAmount, withdrawing, activeSchedule, schedules, availableBalance, ledgerLogs } = storeToRefs(store);

// ─── Tenant Bank Details (Settlement Destination) ───
const showBankSetupDialog = ref(false)
const savingBank = ref(false)
const bankDetails = ref({
  bank_name: '',
  bank_code: '',
  account_number: '',
  account_name: ''
})
const bankForm = ref({
  bank_name: '',
  bank_code: '',
  account_number: '',
  account_name: ''
})

// Bank list and name enquiry states
const loadingBanks = ref(false)
const banksList = ref([]) // loaded from Quasar
const selectedBankOption = ref(null)
const filteredBankOptions = ref([])

const resolvingAccount = ref(false)
const resolutionError = ref(false)
const resolutionErrorMessage = ref('')

const hasBankConfigured = computed(() => {
  return !!bankDetails.value.account_number
})

const maskedAccountNumber = computed(() => {
  const num = bankDetails.value.account_number
  if (!num) return ''
  if (num.length <= 4) return num
  return `**** ${num.slice(-4)}`
})

async function loadTenantBankDetails() {
  try {
    const res = await adminApi.getTenantPayoutSettings()
    if (res && res.data && res.data.account_number) {
      bankDetails.value = {
        bank_name: res.data.bank_name || '',
        bank_code: res.data.bank_code || '',
        account_number: res.data.account_number || '',
        account_name: res.data.account_name || ''
      }
      // Populate form backup
      bankForm.value = { ...bankDetails.value }
      
      // Load bank list to match dropdown option
      loadBanksList()
    } else {
      // Load bank list immediately if they don't have settings so options are ready
      loadBanksList()
    }
  } catch (err) {
    console.warn('[TenantWalletPage] Failed to load tenant bank details:', err)
  }
}

// Fetch supported payout destination banks from Quasar via backend API
async function loadBanksList() {
  loadingBanks.value = true
  try {
    const res = await adminApi.getPayoutBanks({ country: 'nigeria' })
    if (res && res.data && res.data.data) {
      banksList.value = res.data.data.map(b => ({
        label: b.name,
        value: b.code
      }))
      filteredBankOptions.value = [...banksList.value]
      
      // Auto-select if we already have a saved bank_code
      if (bankForm.value.bank_code) {
        const found = banksList.value.find(b => b.value === bankForm.value.bank_code)
        if (found) {
          selectedBankOption.value = found
        }
      }
    }
  } catch (err) {
    console.error('Failed to load banks from Quasar:', err)
  } finally {
    loadingBanks.value = false
  }
}

// Filter bank options in select dropdown
function filterBanks(val, update) {
  if (val === '') {
    update(() => {
      filteredBankOptions.value = banksList.value
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    filteredBankOptions.value = banksList.value.filter(
      v => v.label.toLowerCase().indexOf(needle) > -1
    )
  })
}

// Watch selected bank option to update code/name and trigger account resolution
watch(selectedBankOption, (newVal) => {
  if (newVal) {
    bankForm.value.bank_code = newVal.value
    bankForm.value.bank_name = newVal.label
    triggerAccountResolution()
  } else {
    bankForm.value.bank_code = ''
    bankForm.value.bank_name = ''
    bankForm.value.account_name = ''
  }
})

// Watch account number changes to trigger account resolution
watch(() => bankForm.value.account_number, (newVal) => {
  triggerAccountResolution()
})

// Auto-trigger resolution if conditions are met
function triggerAccountResolution() {
  const accountNum = bankForm.value.account_number
  const bankCode = bankForm.value.bank_code
  
  if (accountNum && accountNum.length >= 10 && bankCode) {
    resolveAccountName(accountNum, bankCode)
  } else {
    bankForm.value.account_name = ''
    resolutionError.value = false
    resolutionErrorMessage.value = ''
  }
}

// Call account resolution API
async function resolveAccountName(accountNumber, bankCode) {
  resolvingAccount.value = true
  resolutionError.value = false
  resolutionErrorMessage.value = ''
  
  try {
    const res = await adminApi.resolvePayoutAccount({
      account_number: accountNumber,
      bank_code: bankCode
    })
    if (res && res.data && res.data.data) {
      bankForm.value.account_name = res.data.data.account_name
    }
  } catch (err) {
    resolutionError.value = true
    resolutionErrorMessage.value = err.response?.data?.error || 'Could not resolve account name. Verify bank and account number.'
    // Keep account_name intact so the user can edit or type it manually
  } finally {
    resolvingAccount.value = false
  }
}

async function saveBankDetails() {
  savingBank.value = true
  try {
    const res = await adminApi.saveTenantPayoutSettings(bankForm.value)
    if (res && res.data) {
      bankDetails.value = { ...bankForm.value }
      showBankSetupDialog.value = false
      $q.notify({
        type: 'positive',
        message: 'Settlement bank account details updated successfully.'
      })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save bank details: ' + (err.response?.data?.error || err.message)
    })
  } finally {
    savingBank.value = false
  }
}

// ─── Admin-configured payout settings ───
// Reactive refs initialized to safe defaults, synchronized in real-time.
const adminDailyPayoutTime = ref('23:59')
const adminManualFee = ref(500)
const adminManualFeeType = ref('Fixed Amount')

const localStorageDebug = ref('NOT_LOADED')

async function loadAdminPayoutSettings() {
  try {
    const res = await adminApi.getPlatformPayoutSettings();
    if (res && res.data) {
      const settings = res.data;
      adminDailyPayoutTime.value = settings.dailyPayoutTime || '23:59';
      adminManualFee.value = settings.manualDispatchFee ?? 500;
      adminManualFeeType.value = settings.manualDispatchFeeType || 'Fixed Amount';
      localStorageDebug.value = JSON.stringify(settings);
    }
  } catch (e) {
    console.warn('[TenantWalletPage] Failed to fetch platform payout settings from API:', e);
    // Fallback to localStorage just in case
    try {
      const raw = localStorage.getItem('platform_payout_settings');
      localStorageDebug.value = (raw || 'NOT_FOUND') + ' (API Fallback)';
      if (raw) {
        const settings = JSON.parse(raw);
        adminDailyPayoutTime.value = settings.dailyPayoutTime || '23:59';
        adminManualFee.value = settings.manualDispatchFee ?? 500;
        adminManualFeeType.value = settings.manualDispatchFeeType || 'Fixed Amount';
      }
    } catch (err) {
      console.warn('[TenantWalletPage] Failed to parse platform_payout_settings fallback:', err);
    }
  }
}

const manualDispatchFeeLabel = computed(() => {
  if (adminManualFeeType.value === 'Percentage (%)') {
    return adminManualFee.value + '%'
  }
  return currentCurrency.value.symbol + adminManualFee.value.toLocaleString()
})

const activeScheduleLabel = computed(() => {
  const map = { daily: 'Daily Sweep', weekly: 'Weekly Sweep', manual: 'On-Demand' }
  return map[activeSchedule.value] || 'Active'
})

// ─── Weekly Schedule Picker ───
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weeklySchedule = ref({ day: 'Sunday', time: '23:59' })
const sendingWeekly = ref(false)
const weeklySentToAdmin = ref(false)
const showWeeklyConfirmDialog = ref(false)

function confirmWeeklySchedule() {
  sendingWeekly.value = true
  // Persist the weekly preference locally (simulating API call to admin)
  setTimeout(() => {
    localStorage.setItem('tenant_weekly_schedule', JSON.stringify(weeklySchedule.value))
    sendingWeekly.value = false
    weeklySentToAdmin.value = true
    showWeeklyConfirmDialog.value = true
    $q.notify({ type: 'positive', message: 'Weekly sweep schedule sent to admin for confirmation.' })
  }, 1200)
}

// ─── Manual Dispatch Fee Dialog ───
const showManualFeeDialog = ref(false)

const computedManualTotal = computed(() => {
  const amount = withdrawalAmount.value || 0
  if (adminManualFeeType.value === 'Percentage (%)') {
    return amount + (amount * adminManualFee.value / 100)
  }
  return amount + adminManualFee.value
})

function dispatchPayout() {
  if (activeSchedule.value === 'manual') {
    // Show the fee warning dialog first
    showManualFeeDialog.value = true
    return
  }
  executePayout()
}

function confirmManualDispatch() {
  showManualFeeDialog.value = false
  executePayout()
}

function executePayout() {
  store.dispatchPayout()
    .then((msg) => {
      $q.notify({ type: 'positive', message: msg })
    })
    .catch((err) => {
      $q.notify({ type: 'negative', message: err })
    })
}

let syncInterval = null;

onMounted(() => {
  store.loadTreasuryData()
  
  // Load settings initially
  loadAdminPayoutSettings()
  loadTenantBankDetails()
  fetchVirtualAccounts()
  fetchQuasarTransactions()

  // 1. Storage Event Listener — for instant cross-tab/window updates
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === 'platform_payout_settings') {
        loadAdminPayoutSettings()
      }
    })
  }

  // 2. Polling Fallback — check every 2 seconds in case storage events are throttled/blocked
  syncInterval = setInterval(loadAdminPayoutSettings, 2000)

  // Restore saved weekly preference
  const saved = localStorage.getItem('tenant_weekly_schedule')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      weeklySchedule.value = parsed
      weeklySentToAdmin.value = true
    } catch (e) {
      console.warn('Failed to parse tenant_weekly_schedule:', e)
    }
  }
})

onUnmounted(() => {
  if (syncInterval) {
    clearInterval(syncInterval)
  }
})
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.25) !important; }

.digital-card {
  background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 24px;
  height: 240px;
  box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.2);
}

.digital-card:hover {
  transform: translateY(-2px);
  border-color: rgba(165, 180, 252, 0.4);
}

.active-schedule {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(255,255,255,0.01) 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
}

.active-schedule-orange {
  background: linear-gradient(135deg, rgba(234, 88, 12, 0.12) 0%, rgba(255,255,255,0.01) 100%) !important;
  border: 1px solid rgba(251, 146, 60, 0.3) !important;
}

.border-top-subtle {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.fee-warning-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(251, 146, 60, 0.12);
  border: 1px solid rgba(251, 146, 60, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Weekly picker expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 200px;
  opacity: 1;
}

.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-3 { letter-spacing: 3px; }
.transition-3 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
