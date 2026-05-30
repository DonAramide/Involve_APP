<!-- invify-admin/src/pages/agent/AgentDashboardPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Breadcrumbs & Header -->
    <div class="q-mb-md">
      <q-breadcrumbs class="text-grey-6" gutter="sm">
        <q-breadcrumbs-el label="Dashboards" icon="dashboard" />
        <q-breadcrumbs-el label="Agent Workspace" icon="badge" />
      </q-breadcrumbs>
    </div>

    <div class="row items-center q-mb-xl">
      <q-avatar size="72px" font-size="36px" color="blue-10" text-color="blue-3" icon="support_agent" class="q-mr-md shadow-2" />
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-ma-none">Agent Operations Portal</h1>
        <div class="text-grey-5">Manage your profile, commissions, and field tasks</div>
      </div>
      <div class="col-auto">
        <q-btn outline color="cyan-4" icon="account_balance_wallet" label="Withdraw Funds" @click="showWithdrawModal = true" class="q-mr-sm" />
      </div>
    </div>

    <!-- Main Content Tabs -->
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
        <q-tab name="overview" label="Overview & Wallet" icon="account_balance" />
        <q-tab name="tasks" label="Field Tasks" icon="assignment" />
        <q-tab name="profile" label="Profile & Security" icon="manage_accounts" />
      </q-tabs>

      <q-separator dark />

      <q-tab-panels v-model="tab" animated class="bg-blue-grey-10 text-white min-height-400">
        <!-- Overview & Wallet Panel -->
        <q-tab-panel name="overview">
          <div class="row q-col-gutter-lg">
            <!-- Wallet Card -->
            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 border-indigo" style="height: 100%;">
                <q-card-section>
                  <div class="row justify-between items-center q-mb-md">
                    <div class="text-subtitle1 text-indigo-3">Commission Wallet</div>
                    <q-icon name="payments" color="indigo-3" size="md" />
                  </div>
                  <div class="text-h3 text-weight-bold text-cyan-4 q-mb-sm">{{ currentCurrency.symbol }}{{ walletBalance.toLocaleString() }}</div>
                  <div class="text-caption text-grey-5">Available for immediate withdrawal</div>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn flat color="cyan-4" label="Withdraw History" @click="$q.notify('Opening withdrawal history...')" />
                  <q-btn unelevated color="cyan-5" text-color="black" label="Withdraw Now" @click="showWithdrawModal = true" />
                </q-card-actions>
              </q-card>
            </div>
            
            <!-- Quick Stats -->
            <div class="col-12 col-md-6">
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <q-card flat class="bg-blue-grey-9 q-pa-md text-center">
                    <q-icon name="storefront" size="lg" color="green-4" />
                    <div class="text-h5 text-weight-bold q-mt-sm">12</div>
                    <div class="text-caption text-grey-5">Merchants Onboarded</div>
                  </q-card>
                </div>
                <div class="col-6">
                  <q-card flat class="bg-blue-grey-9 q-pa-md text-center">
                    <q-icon name="point_of_sale" size="lg" color="amber-4" />
                    <div class="text-h5 text-weight-bold q-mt-sm">4</div>
                    <div class="text-caption text-grey-5">Terminals Deployed</div>
                  </q-card>
                </div>
                <div class="col-12">
                  <q-card flat bordered class="bg-blue-grey-9 border-cyan q-pa-sm text-center row items-center justify-between">
                    <div class="text-subtitle2 text-cyan-3">Performance Status</div>
                    <q-chip color="green-10" text-color="white" size="sm" icon="trending_up">Excellent</q-chip>
                  </q-card>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Tasks Panel -->
        <q-tab-panel name="tasks">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-blue-grey-9 border-cyan cursor-pointer transition-all hover-lift" @click="$q.notify('Opening terminal request form...')">
                <q-card-section class="text-center">
                  <q-icon name="add_shopping_cart" size="xl" color="cyan-4" />
                  <div class="text-h6 text-white q-mt-md">Request Terminal</div>
                  <div class="text-caption text-grey-5 q-mt-xs">Order new POS hardware for merchants</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-blue-grey-9 border-amber cursor-pointer transition-all hover-lift" @click="$q.notify('Opening Tenant Onboarding form (Retail, Service, School)...')">
                <q-card-section class="text-center">
                  <q-icon name="business" size="xl" color="amber-4" />
                  <div class="text-h6 text-white q-mt-md">Onboard Tenant</div>
                  <div class="text-caption text-grey-5 q-mt-xs">Register Retail, Service, or School business</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-blue-grey-9 border-indigo cursor-pointer transition-all hover-lift" @click="$q.notify('Opening dispute resolution...')">
                <q-card-section class="text-center">
                  <q-icon name="report_problem" size="xl" color="indigo-4" />
                  <div class="text-h6 text-white q-mt-md">Log Support Ticket</div>
                  <div class="text-caption text-grey-5 q-mt-xs">Report hardware or transaction issues</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Profile & Security Panel -->
        <q-tab-panel name="profile">
          <div class="row q-col-gutter-lg">
            <!-- Bank Details -->
            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 border-indigo">
                <q-card-section>
                  <div class="text-h6 text-white q-mb-md">Bank Account Settings</div>
                  <div class="text-caption text-grey-5 q-mb-md">Where your commissions will be disbursed</div>
                  
                  <q-form @submit.prevent="saveBankDetails" class="q-gutter-md">
                    <q-input
                      v-model="bankForm.bankName"
                      dark
                      filled
                      label="Bank Name"
                      color="cyan"
                    />
                    <q-input
                      v-model="bankForm.accountNumber"
                      dark
                      filled
                      label="Account Number"
                      color="cyan"
                    />
                    <q-input
                      v-model="bankForm.accountName"
                      dark
                      filled
                      label="Account Name"
                      color="cyan"
                      hint="Must match your registered agent identity"
                    />
                    <div class="row justify-end">
                      <q-btn type="submit" color="cyan-5" text-color="black" label="Save Bank Details" unelevated />
                    </div>
                  </q-form>
                </q-card-section>
              </q-card>
            </div>

            <!-- Security/Password -->
            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 border-amber">
                <q-card-section>
                  <div class="text-h6 text-white q-mb-md">Security Settings</div>
                  <div class="text-caption text-grey-5 q-mb-md">Change your secure passphrase</div>
                  
                  <q-form @submit.prevent="changePassword" class="q-gutter-md">
                    <q-input
                      v-model="passwordForm.current"
                      dark
                      filled
                      type="password"
                      label="Current Password"
                      color="amber"
                    />
                    <q-input
                      v-model="passwordForm.new"
                      dark
                      filled
                      type="password"
                      label="New Password"
                      color="amber"
                    />
                    <q-input
                      v-model="passwordForm.confirm"
                      dark
                      filled
                      type="password"
                      label="Confirm New Password"
                      color="amber"
                      :rules="[val => val === passwordForm.new || 'Passwords must match']"
                    />
                    <div class="row justify-end">
                      <q-btn type="submit" color="amber-5" text-color="black" label="Update Password" unelevated />
                    </div>
                  </q-form>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Withdrawal Modal -->
    <q-dialog v-model="showWithdrawModal" persistent>
      <q-card class="bg-blue-grey-10 text-white shadow-2 border-cyan" style="min-width: 350px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Withdraw Commission</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-5 q-mb-sm">Available Balance: {{ currentCurrency.symbol }}{{ walletBalance.toLocaleString() }}</div>
          <q-input
            v-model.number="withdrawAmount"
            dark
            filled
            type="number"
            label="Amount to Withdraw"
            color="cyan"
            :prefix="currentCurrency.symbol"
            :rules="[
              val => val > 0 || 'Amount must be greater than zero',
              val => val <= walletBalance || 'Insufficient funds'
            ]"
          />
          <div class="text-caption text-grey-6 q-mt-sm" v-if="bankForm.accountNumber">
            Funds will be sent to: <strong>{{ bankForm.bankName }} ({{ bankForm.accountNumber }})</strong>
          </div>
          <div class="text-caption text-red-4 q-mt-sm" v-else>
            Please set up your bank details in the Profile tab first.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated label="Confirm Withdrawal" color="cyan-5" text-color="black" @click="executeWithdrawal" :disable="!bankForm.accountNumber || withdrawAmount <= 0 || withdrawAmount > walletBalance" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const tab = ref('overview')

// Mock Data
const walletBalance = ref(145500.00)
const showWithdrawModal = ref(false)
const withdrawAmount = ref(0)

const bankForm = ref({
  bankName: '',
  accountNumber: '',
  accountName: ''
})

const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
})

const saveBankDetails = () => {
  $q.notify({
    message: 'Bank details saved successfully.',
    color: 'positive',
    icon: 'check_circle'
  })
}

const changePassword = () => {
  if (passwordForm.value.new !== passwordForm.value.confirm) return
  
  $q.notify({
    message: 'Security passphrase updated successfully.',
    color: 'positive',
    icon: 'check_circle'
  })
  passwordForm.value = { current: '', new: '', confirm: '' }
}

const executeWithdrawal = () => {
  $q.notify({
    message: `Processing withdrawal of {{ currentCurrency.symbol }}${withdrawAmount.value.toLocaleString()}...`,
    color: 'info',
    icon: 'hourglass_empty'
  })
  
  setTimeout(() => {
    walletBalance.value -= withdrawAmount.value
    showWithdrawModal.value = false
    withdrawAmount.value = 0
    
    $q.notify({
      message: 'Withdrawal successful. Funds are en route.',
      color: 'positive',
      icon: 'check_circle'
    })
  }, 1500)
}
</script>

<style scoped>
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
}
.border-indigo {
  border: 1px solid rgba(63, 81, 181, 0.4);
}
.border-cyan {
  border: 1px solid rgba(0, 188, 212, 0.4);
}
.border-amber {
  border: 1px solid rgba(255, 193, 7, 0.4);
}
</style>
