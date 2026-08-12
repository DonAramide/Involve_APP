<!-- invify-admin/src/pages/OnboardingFlow.vue -->
<template>
  <q-layout view="lHh Lpr lFf" style="background: #05070d; min-height: 100vh; position: relative; overflow: hidden;">
    <q-page-container>
      <q-page class="flex flex-center q-pa-xl" style="position: relative;">
        
        <!-- Watermarked Invify Logo Background -->
        <img :src="logoImg" class="onboarding-bg-logo" />
    
    <!-- Stripe Atlas-Grade Setup Main Container -->
    <q-card style="width: 850px; max-width: 95vw; background: #0b0f19; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; overflow: hidden; z-index: 1;" class="shadow-24 text-white">
      
      <!-- Linear Progress Telemetry Indicator -->
      <q-linear-progress :value="progress" color="indigo-5" class="q-mt-none" style="height: 4px;" />

      <!-- Top Branding Strip -->
      <q-card-section class="q-px-xl q-pt-xl q-pb-none">
        <div class="row items-center justify-between">
          <div class="row items-center op-gap-8 no-wrap bg-indigo-10 border-indigo q-px-md q-py-xs rounded-borders" style="border: 1px solid rgba(99, 102, 241, 0.25);">
            <q-icon name="rocket_launch" color="indigo-4" size="sm" />
            <div>
              <span class="text-metric-mono text-white text-weight-bolder text-uppercase tracking-wider" style="font-size: 13px; letter-spacing: 1px;">INVIFY</span>
              <span class="text-metric-mono text-indigo-4 q-ml-xs" style="font-size: 10px;">ATLAS PROVISIONING</span>
            </div>
          </div>
          
          <div class="row items-center op-gap-8 bg-indigo-10 border-indigo q-px-sm q-py-xs rounded-borders">
            <span class="live-indicator-dot bg-green-5 animate-pulse"></span>
            <span class="text-metric-mono text-indigo-3 text-weight-bold" style="font-size: 9px; letter-spacing: 1px;">ISOLATION ACTIVE</span>
          </div>
        </div>

        <!-- Custom Horizontal Wizard Steps Tracker -->
        <div class="row items-center justify-between q-mt-lg q-pb-md border-bottom no-wrap overflow-hidden" style="border-color: rgba(255,255,255,0.06);">
          <div 
            v-for="s in [1, 2, 3, 4, 5, 6]" 
            :key="s" 
            class="row items-center op-gap-6 cursor-pointer transition-3"
            :class="step === s ? 'text-indigo-4 text-weight-bold' : (step > s ? 'text-green-4' : 'text-grey-6')"
            style="font-size: 11.5px;"
          >
            <q-icon :name="step > s ? 'check_circle' : 'circle'" size="xs" :color="step > s ? 'green-4' : (step === s ? 'indigo-4' : 'grey-8')" />
            <span class="v-hide-sm">{{ getStepLabel(s) }}</span>
          </div>
        </div>
      </q-card-section>

      <!-- Main Step Render Area -->
      <q-card-section class="q-px-xl q-py-lg">
        
        <q-stepper
          v-model="step"
          ref="stepper"
          color="indigo-5"
          animated
          dark
          flat
          class="bg-transparent q-pa-none"
        >
          
          <!-- STEP 1: Enterprise Profile & Industry Selection -->
          <q-step :name="1" title="Profile" icon="corporate_fare" :done="step > 1">
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Enterprise Profile & Industry Sector</div>
            <div class="text-caption text-grey-5 q-mb-lg">Provision your immutable corporate identity on the Invify SaaS array.</div>
            
            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="form.businessName" 
                  label="Legal Business / School Name" 
                  dark filled dense 
                  class="font-mono"
                  label-color="indigo-3"
                  :rules="[val => !!val || 'Business name is mandatory']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="form.phone" 
                  label="WhatsApp Contact Number (Telemetry alerts)" 
                  dark filled dense 
                  class="font-mono"
                  label-color="indigo-3"
                  mask="+#############"
                  :rules="[val => !!val || 'WhatsApp contact number required']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="form.email" 
                  label="Primary Administrator Email" 
                  type="email"
                  dark filled dense 
                  class="font-mono"
                  label-color="indigo-3"
                  :rules="[val => !!val || 'Admin email is mandatory']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="form.password" 
                  label="Create Admin Password" 
                  :type="showPassword ? 'text' : 'password'" 
                  dark filled dense 
                  class="font-mono"
                  label-color="indigo-3"
                  :rules="[val => !!val || 'Password required', val => val.length >= 6 || 'Min 6 characters']"
                >
                  <template v-slot:append>
                    <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPassword = !showPassword" />
                  </template>
                </q-input>
              </div>
            </div>

            <!-- Interactive Industry Selector Grid (Shopify Style) -->
            <div class="text-caption text-indigo-4 text-weight-bold q-mb-sm text-uppercase font-mono">Select Core Operating Industry Mode</div>
            <div class="row q-col-gutter-md">
              <div v-for="mode in industries" :key="mode.id" class="col-12 col-sm-4">
                <q-card 
                  @click="form.industry = mode.id" 
                  class="cursor-pointer transition-3 q-pa-md h-full column justify-between"
                  :class="form.industry === mode.id ? 'card-active' : 'card-dark'"
                  style="border-radius: 8px;"
                >
                  <div>
                    <div class="row items-center justify-between q-mb-sm">
                      <q-icon :name="mode.icon" :color="form.industry === mode.id ? 'white' : 'indigo-4'" size="md" />
                      <q-radio v-model="form.industry" :val="mode.id" dark color="indigo-4" size="xs" />
                    </div>
                    <div class="text-subtitle2 text-weight-bold text-white">{{ mode.label }}</div>
                    <div class="text-grey-5 q-mt-xs" style="font-size: 11px; line-height: 1.3;">{{ mode.desc }}</div>
                  </div>
                </q-card>
              </div>
            </div>
          </q-step>

          <!-- STEP 2: Capability Matrix & Quota Tuning -->
          <q-step :name="2" title="Capabilities" icon="tune" :done="step > 2">
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Dynamic Capabilities & Resource Quotas</div>
            <div class="text-caption text-grey-5 q-mb-lg">Configure system module parameters and hardware quotas for your instance.</div>

            <!-- Enabled Modules Checkbox Grid -->
            <div class="text-caption text-indigo-4 text-weight-bold q-mb-sm text-uppercase font-mono">Provision Operational Sub-Modules</div>
            <div class="row q-col-gutter-md q-mb-lg">
              <div v-for="mod in modulePresets" :key="mod.id" class="col-12 col-sm-6">
                <q-card class="card-dark q-pa-md rounded-borders">
                  <div class="row items-center no-wrap">
                    <q-checkbox v-model="form.modules" :val="mod.id" dark color="indigo-4" />
                    <div class="q-ml-sm">
                      <div class="text-subtitle2 text-weight-bold text-white">{{ mod.label }}</div>
                      <div class="text-grey-5" style="font-size: 11px;">{{ mod.desc }}</div>
                    </div>
                  </div>
                </q-card>
              </div>
            </div>

            <!-- Sliders for Quotas -->
            <div class="text-caption text-indigo-4 text-weight-bold q-mb-sm text-uppercase font-mono">Adjust Provisioned Limits</div>
            <div class="card-dark q-pa-lg rounded-borders">
              <div class="row q-col-gutter-lg">
                <div class="col-12 col-sm-6">
                  <div class="row items-center justify-between text-caption font-mono text-grey-4">
                    <span>Provisioned Terminals:</span>
                    <strong class="text-indigo-4">{{ form.quota.terminals }} Devices</strong>
                  </div>
                  <q-slider v-model="form.quota.terminals" :min="1" :max="30" label color="indigo-5" dark class="q-mt-xs" />
                </div>
                <div class="col-12 col-sm-6">
                  <div class="row items-center justify-between text-caption font-mono text-grey-4">
                    <span>Daily Max Transactions:</span>
                    <strong class="text-indigo-4">{{ form.quota.dailyTx }} Tx</strong>
                  </div>
                  <q-slider v-model="form.quota.dailyTx" :min="100" :max="5000" :step="100" label color="indigo-5" dark class="q-mt-xs" />
                </div>
                <div class="col-12 col-sm-6">
                  <div class="row items-center justify-between text-caption font-mono text-grey-4">
                    <span>Operator Seats Capacity:</span>
                    <strong class="text-indigo-4">{{ form.quota.operators }} Seats</strong>
                  </div>
                  <q-slider v-model="form.quota.operators" :min="5" :max="100" label color="indigo-5" dark class="q-mt-xs" />
                </div>
              </div>
            </div>
          </q-step>

          <!-- STEP 3: Brand Identity & Custom Receipts -->
          <q-step :name="3" title="Branding" icon="palette" :done="step > 3">
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Receipt Branding & Custom Theme</div>
            <div class="text-caption text-grey-5 q-mb-lg">Customize checkouts, invoice templates, and receipts for your customers.</div>

            <div class="row q-col-gutter-lg">
              
              <!-- Left side inputs -->
              <div class="col-12 col-sm-6 column q-gutter-y-md">
                <q-input 
                  v-model="form.branding.tagline" 
                  label="Corporate Tagline" 
                  dark filled dense 
                  class="font-mono"
                  label-color="indigo-3"
                  placeholder="e.g. Pioneering elite educational solutions."
                />
                
                <q-input 
                  v-model="form.branding.footnote" 
                  label="Receipt Footnote / Thank You text" 
                  dark filled dense 
                  class="font-mono"
                  label-color="indigo-3"
                  placeholder="e.g. Thank you for transacting with Invify Pro."
                />

                <div>
                  <div class="text-caption text-grey-4 font-mono q-mb-sm">Primary Brand Theme Hex:</div>
                  <div class="row items-center q-gutter-sm">
                    <q-input 
                      v-model="form.branding.primaryColor" 
                      dark filled dense 
                      class="font-mono col"
                      placeholder="#6366f1"
                    >
                      <template v-slot:append>
                        <span class="color-preview-block" :style="`background-color: ${form.branding.primaryColor};`"></span>
                      </template>
                    </q-input>
                  </div>
                </div>

                <!-- Custom branding swatch presets -->
                <div class="row q-gutter-sm">
                  <span 
                    v-for="color in ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']" 
                    :key="color"
                    @click="form.branding.primaryColor = color"
                    class="swatch-bubble cursor-pointer"
                    :style="`background: ${color}; border: ${form.branding.primaryColor === color ? '2px solid white' : 'none'};`"
                  ></span>
                </div>
              </div>

              <!-- Right side receipt preview (premium details!) -->
              <div class="col-12 col-sm-6">
                <div class="text-caption text-indigo-4 text-weight-bold q-mb-sm text-uppercase font-mono">Invoice Telemetry Preview</div>
                <div class="receipt-preview-box q-pa-md text-grey-4 font-mono text-caption">
                  <div class="text-center text-weight-bold text-white border-bottom q-pb-sm" style="border-color: rgba(255,255,255,0.06);">
                    {{ form.businessName || 'YOUR BUSINESS NAME' }}
                  </div>
                  
                  <div class="column q-mt-md q-gutter-y-xs" style="font-size: 11px;">
                    <div class="row justify-between"><span>DATE:</span><span>2026-05-17</span></div>
                    <div class="row justify-between"><span>TERMINAL:</span><span>SN-INV-MOCK</span></div>
                    <div class="row justify-between"><span>OPERATOR:</span><span>SYSTEM ADMIN</span></div>
                    <div class="row justify-between text-white text-weight-bold q-mt-xs border-top q-pt-xs" style="border-color: rgba(255,255,255,0.04);">
                      <span>TOTAL DUE:</span>
                      <span>{{ currentCurrency.symbol }}50,000.00</span>
                    </div>
                  </div>

                  <div class="text-center q-mt-lg text-grey-5 border-top q-pt-sm" style="border-color: rgba(255,255,255,0.06); font-size: 10px;">
                    <div>"{{ form.branding.tagline || 'Pioneering absolute retail & tuition intelligence.' }}"</div>
                    <div class="q-mt-xs text-indigo-3">{{ form.branding.footnote || 'Thank you for transacting with Invify Pro.' }}</div>
                  </div>
                </div>
              </div>

            </div>
          </q-step>

          <!-- STEP 4: Subscription Plan & Billing Gateways -->
          <q-step :name="4" title="Billing" icon="credit_card" :done="step > 4">
            <div class="text-h6 text-weight-bold text-white q-mb-xs">SaaS Subscription & Billing Method</div>
            <div class="text-caption text-grey-5 q-mb-lg">Select a plan and configure payment channels (Stripe / Paystack / Flutterwave).</div>

            <!-- Tier Cards -->
            <div class="row q-col-gutter-md q-mb-lg">
              <div v-for="tier in plans" :key="tier.id" class="col-12 col-sm-4">
                <q-card 
                  @click="form.plan = tier.id" 
                  class="cursor-pointer transition-3 q-pa-md h-full column justify-between"
                  :class="form.plan === tier.id ? 'card-active' : 'card-dark'"
                  style="border-radius: 8px;"
                >
                  <div>
                    <div class="row items-center justify-between q-mb-sm">
                      <span class="text-caption text-weight-bold text-white font-mono text-uppercase">{{ tier.id }}</span>
                      <q-radio v-model="form.plan" :val="tier.id" dark color="indigo-4" size="xs" />
                    </div>
                    <div class="text-h5 text-weight-bold text-white text-metric-mono">{{ tier.price }}</div>
                    <div class="text-caption text-grey-6 font-mono">{{ tier.interval }}</div>
                    <div class="text-grey-5 q-mt-sm" style="font-size: 11px; line-height: 1.3;">{{ tier.desc }}</div>
                  </div>
                </q-card>
              </div>
            </div>

            <!-- Gateways -->
            <div class="text-caption text-indigo-4 text-weight-bold q-mb-sm text-uppercase font-mono">Select Integration Gateway</div>
            <div class="row q-col-gutter-md q-mb-md">
              <div v-for="gw in gateways" :key="gw.id" class="col-12 col-sm-4">
                <q-card 
                  @click="form.paymentMethod = gw.id" 
                  class="cursor-pointer transition-3 q-pa-md h-full row items-center justify-between"
                  :class="form.paymentMethod === gw.id ? 'card-active' : 'card-dark'"
                  style="border-radius: 8px;"
                >
                  <div class="row items-center op-gap-8">
                    <q-icon :name="gw.icon" size="sm" :color="form.paymentMethod === gw.id ? 'white' : 'indigo-4'" />
                    <span class="text-subtitle2 text-weight-bold">{{ gw.label }}</span>
                  </div>
                  <q-radio v-model="form.paymentMethod" :val="gw.id" dark color="indigo-4" size="xs" />
                </q-card>
              </div>
            </div>

            <!-- Live Card Simulator -->
            <div class="bg-indigo-10 border-indigo q-pa-md rounded-borders row items-center justify-between no-wrap">
              <div class="row items-center op-gap-12">
                <q-icon name="shield" color="indigo-3" size="md" />
                <div>
                  <div class="text-caption text-weight-bold text-white">Encrypted Vault Channel</div>
                  <div class="text-grey-5" style="font-size: 11px;">Payment processing is fully tokenized and PCI-DSS compliant.</div>
                </div>
              </div>
              <q-btn flat dense label="Simulate Visa Setup" color="amber-4" icon="bolt" class="text-weight-bold text-caption font-mono" />
            </div>
          </q-step>

          <!-- STEP 5: Cloud Provisioning Logs (STRIPE ATLAS STYLED MOCK TELEMETRY TIMER) -->
          <q-step :name="5" title="Provision" icon="cloud_sync" :done="step > 5">
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Assembling Enterprise Cloud Node</div>
            <div class="text-caption text-grey-5 q-mb-lg">Executing backend authoritative provisioning algorithms in real-time.</div>

            <!-- Provisioning terminal screen -->
            <div class="terminal-screen q-pa-lg rounded-borders font-mono">
              <div class="row items-center justify-between q-mb-md border-bottom q-pb-sm" style="border-color: rgba(255,255,255,0.06);">
                <div class="row items-center op-gap-6">
                  <span class="terminal-action-dot bg-red-5"></span>
                  <span class="terminal-action-dot bg-amber-5"></span>
                  <span class="terminal-action-dot bg-green-5"></span>
                  <span class="text-grey-5 q-ml-xs text-caption font-bold">atlas-provisioning-cli</span>
                </div>
                <span class="text-indigo-4 text-caption text-weight-bold pulse-opacity">EXECUTING ENGINE</span>
              </div>

              <!-- Terminal Lines Log -->
              <div class="terminal-lines-box">
                <div v-for="(log, idx) in provisioningLogs" :key="idx" class="terminal-line text-caption q-my-xs transition-3">
                  <span class="text-grey-6">[{{ log.time }}]</span>
                  <span :class="log.color" class="q-ml-sm">{{ log.text }}</span>
                </div>
              </div>
            </div>

            <q-banner v-if="provisioningError" class="bg-red-10 text-white q-mt-md rounded-borders">
              <template v-slot:avatar>
                <q-icon name="error" color="white" />
              </template>
              <div class="text-weight-bold">Provisioning Aborted</div>
              <div>{{ provisioningError }}</div>
              <template v-slot:action>
                <q-btn flat color="white" label="Report to Admin" @click="reportIssueToAdmin" :loading="reportingIssue" />
              </template>
            </q-banner>
          </q-step>

          <!-- STEP 6: Launch Completed Console -->
          <q-step :name="6" title="Finish" icon="celebration">
            <div class="text-center q-pa-md">
              <q-icon name="check_circle" color="green-4" size="4em" class="q-mb-md animate-bounce" />
              <div class="text-h5 text-weight-bold text-white">Enterprise Node Provisioned!</div>
              <div class="text-body2 text-grey-5 q-mt-xs">
                Your new Invify Tenant Profile is fully configured and ready for production operations.
              </div>

              <!-- Credentials Card -->
              <q-card class="card-dark q-mt-lg q-pa-lg text-left shadow-4" style="background: #101625 !important; border: 1px solid rgba(255,255,255,0.06) !important; color: #ffffff !important;">
                <div class="row items-center justify-between q-mb-md border-bottom q-pb-sm" style="border-color: rgba(255,255,255,0.06);">
                  <span class="text-weight-bold text-indigo-4 text-uppercase tracking-wider font-mono" style="font-size: 11px;">Tenant Access Credentials</span>
                  <q-chip size="xs" color="indigo-10" text-color="white" dense class="text-metric-mono">
                    {{ form.industry.toUpperCase() }} MODE
                  </q-chip>
                </div>

                <div class="column op-gap-8 text-caption font-mono" style="color: #ffffff !important;">
                  <div>
                    <span style="color: #9ca3af !important;">Organization Name:</span>
                    <strong class="text-white q-ml-xs" style="color: #ffffff !important;">{{ form.businessName }}</strong>
                  </div>
                  <div>
                    <span style="color: #9ca3af !important;">Identity Email:</span>
                    <strong class="text-white q-ml-xs" style="color: #ffffff !important;">{{ form.email }}</strong>
                  </div>
                  <div>
                    <span style="color: #9ca3af !important;">Initial Passphrase:</span>
                    <span class="q-ml-xs text-amber-5 text-weight-bold" style="color: #f59e0b !important;">{{ form.password }}</span>
                  </div>
                  <div class="row items-center justify-between q-mt-sm q-pa-sm rounded-borders" style="background: #05070d !important; border: 1px solid rgba(255,255,255,0.06) !important;">
                    <span style="color: #9ca3af !important;" class="text-caption">Initial Balance:</span>
                    <strong class="text-green-4 text-metric-mono font-mono text-weight-bolder" style="color: #34d399 !important;">{{ currentCurrency.symbol }}{{ (form.plan === 'enterprise' ? 100000 : 50000).toLocaleString() }}</strong>
                  </div>
                </div>

                <div class="row q-gutter-sm q-mt-md justify-end">
                  <q-btn 
                    flat 
                    size="sm" 
                    color="indigo-4" 
                    icon="content_copy" 
                    label="Copy Credentials" 
                    @click="copyUserCredentials" 
                    class="bg-[#05070d] border-grey-9 rounded-borders" 
                  />
                  <q-btn 
                    flat 
                    size="sm" 
                    color="green-5" 
                    icon="share" 
                    label="Share on WhatsApp" 
                    @click="shareViaWhatsApp" 
                    class="bg-[#05070d] border-grey-9 rounded-borders" 
                  />
                </div>
              </q-card>
              
              <!-- Action Commands -->
              <div class="row q-col-gutter-md q-mt-xl justify-center">
                 <div class="col-12 col-sm-6">
                   <q-btn 
                     unelevated 
                     label="Launch Tenants Matrix" 
                     color="indigo-7" 
                     icon="corporate_fare"
                     class="full-width q-py-sm font-mono text-weight-bold" 
                     @click="goToTenantsMatrix" 
                   >
                     <q-tooltip>Returns to Super Admin view of onboarded networks</q-tooltip>
                   </q-btn>
                 </div>
                 <div class="col-12 col-sm-6">
                   <q-btn 
                     outline 
                     label="Test Tenant Console Login" 
                     color="amber-4" 
                     icon="login"
                     class="full-width q-py-sm font-mono text-weight-bold" 
                     @click="testNewTenantLogin" 
                   >
                     <q-tooltip>Log out as Super Admin and test logging in with the new credentials</q-tooltip>
                   </q-btn>
                 </div>
              </div>
            </div>
          </q-step>

          <!-- Navigation Footer -->
          <template v-slot:navigation>
            <q-stepper-navigation class="row q-gutter-sm q-mt-md border-top q-pt-md" style="border-color: rgba(255,255,255,0.06);" v-if="step < 5">
              <q-btn v-if="step === 4" color="green-7" label="Confirm & Begin Provisioning" @click="handleProvisioningStart" :loading="loading" class="font-mono text-weight-bold" />
              <q-btn v-else color="indigo-7" label="Continue Wizard" @click="$refs.stepper.next()" class="font-mono text-weight-bold" />
              
              <q-btn v-if="step > 1" flat color="grey-6" label="Back" @click="$refs.stepper.previous()" class="q-ml-sm font-mono" />
              
              <q-space />
              <q-btn v-if="step < 5" flat label="Skip to Dashboard" color="grey-6" size="sm" @click="skipOnboarding" class="font-mono" />
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-page>
  </q-page-container>
  </q-layout>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar, copyToClipboard } from 'quasar'
import axios from 'axios'
import logoImg from '../assets/logo_transparent.png'

const router = useRouter()
const $q = useQuasar()
const step = ref(1)
const loading = ref(false)
const provisioningError = ref(null)
const reportingIssue = ref(false)
const showPassword = ref(false)

const form = ref({
  businessName: '',
  phone: '+2348102393330',
  email: '',
  password: '123456',
  industry: 'school',
  modules: ['realtime_streams', 'wallet_payouts', 'analytics_hub'],
  plan: 'premium',
  quota: {
    terminals: 6,
    dailyTx: 500,
    operators: 20
  },
  branding: {
    tagline: 'Pioneering absolute retail & tuition intelligence.',
    footnote: 'Thank you for transacting with Invify Pro.',
    primaryColor: '#6366f1'
  },
  paymentMethod: 'quasar'
})

const industries = ref([
  { id: 'school', label: 'School & Academy', icon: 'school', desc: 'Tuition structures, curriculums, lesson notes database, class logs.' },
  { id: 'retail', label: 'Retail & POS Stock', icon: 'shopping_cart', desc: 'Point of sale checkout speeds, inventory, depletion alerts.' },
  { id: 'hospitality', label: 'Service Provider', icon: 'dry_cleaning', desc: 'Dry cleaners, tailors, salons, and all professionals rendering specialized services.' }
])

const modulePresets = ref([
  { id: 'realtime_streams', label: 'Realtime Event Streaming', desc: 'Isolated live sale stream and telemetry websocket pipelines.' },
  { id: 'wallet_payouts', label: 'Wallet Transfers & Payouts', desc: 'Payout settlement replay logs and immutable wallets.' },
  { id: 'analytics_hub', label: 'Advanced AI Analytics Hub', desc: 'Predictive churn intelligence and autonomous suggestions.' },
  { id: 'discrepancy_reconcile', label: 'Ledger Reconciliation Center', desc: 'Audit-traceable transaction validation against Quasar.' }
])

const plans = ref([
  { id: 'starter', price: 'Free', interval: 'Starter account limits', desc: 'Standard business ledger features, 1 terminal seat, basic telemetry.' },
  { id: 'premium', price: '₦75,000', interval: 'Per month billed', desc: 'Our standard high-capacity premium suite, up to 10 terminals.' },
  { id: 'enterprise', price: 'Custom', interval: 'Corporate quote', desc: 'Dedicated cluster, infinite terminals, bespoke SLA, isolated DB logs.' }
])

const gateways = ref([
  { id: 'quasar', label: 'Quasar', icon: 'account_balance_wallet' }
])

const loadLookupData = async () => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    const res = await axios.get(`${API_BASE}/public/lookup`)
    if (res.data) {
      if (res.data.gateways && res.data.gateways.length > 0) {
        // gateways.value = res.data.gateways // Hardcoded to Quasar
      }
      if (res.data.industries && res.data.industries.length > 0) {
        industries.value = res.data.industries
      }
    }
  } catch (err) {
    console.error('Failed to load system lookup data from backend:', err)
  }
}
loadLookupData()

// Provisioning cli terminal screen simulated console logs
const provisioningLogs = ref([])
const progress = computed(() => (step.value - 1) / 5)

const getStepLabel = (s) => {
  const labels = {
    1: 'Enterprise Profile',
    2: 'Capabilities',
    3: 'Receipt Branding',
    4: 'SaaS Subscription',
    5: 'Cloud Provisioning',
    6: 'Success Gateway'
  }
  return labels[s]
}

const addLog = (text, color = 'text-white', delay = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${(now.getMilliseconds() / 10).toFixed(0).padStart(2, '0')}`
      provisioningLogs.value.push({ time: timeStr, text, color })
      resolve()
    }, delay)
  })
}

const handleProvisioningStart = async () => {
  step.value = 5
  
  await addLog('⚡ Initializing Invify Atlas Provisioning CLI engine...', 'text-cyan-4', 100)
  await addLog('🔍 Attesting enterprise parameters and JWT claim keys...', 'text-grey-5', 600)
  await addLog('🛰️ Connecting to remote Supabase Cloud partitions...', 'text-grey-5', 600)
  await addLog('🧬 Provisioning [ORGANIZATION] DB schemas and isolated tables...', 'text-indigo-4', 700)
  
  try {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    const res = await axios.post(`${API_BASE}/public/onboarding/provision`, {
      email: form.value.email,
      password: form.value.password,
      businessName: form.value.businessName,
      industry: form.value.industry,
      modules: form.value.modules,
      plan: form.value.plan,
      quota: form.value.quota,
      branding: form.value.branding,
      paymentMethod: form.value.paymentMethod
    })

    await addLog(`🛡️ Database organization provisioned. Tenant ID: ${res.data.tenantId}`, 'text-green-4', 600)
    await addLog('🔑 Creating administrator credentials and force-reset parameters...', 'text-grey-5', 600)
    await addLog(`👤 User ID registered successfully: ${res.data.userId}`, 'text-green-4', 500)
    await addLog('💼 Provisioning isolated digital Quasar wallets...', 'text-indigo-4', 600)
    await addLog(`💰 Wallet balance initialized: {{ currentCurrency.symbol }}${res.data.walletBalance.toLocaleString()}`, 'text-green-4', 500)
    await addLog('📅 Validating sub-ledger billing contracts...', 'text-grey-5', 600)
    await addLog('🚀 Synchronizing telemetry webhooks with mobile gateways...', 'text-cyan-4', 500)
    await addLog('🎉 ENTERPRISE PROVISIONING COMPLETED SUCCESSFULLY. NODE ONLINE!', 'text-green-5 text-weight-bold', 600)

    setTimeout(() => {
      step.value = 6
    }, 1500)

  } catch (err) {
    provisioningError.value = err.response?.data?.error || err.message
    await addLog(`❌ PROVISIONING FAILED: ${provisioningError.value}`, 'text-red-4 text-weight-bold', 400)
    $q.notify({
      type: 'negative',
      message: `Provisioning aborted: ${provisioningError.value}`
    })
  }
}

const reportIssueToAdmin = async () => {
  reportingIssue.value = true
  try {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    await axios.post(`${API_BASE}/public/onboarding/report-issue`, {
      tenantName: form.value.businessName,
      email: form.value.email,
      phone: form.value.phone,
      errorMessage: provisioningError.value,
      rawPayload: form.value
    })
    $q.notify({
      type: 'positive',
      message: 'Issue reported to Invify Engineering successfully.'
    })
    provisioningError.value = null // Hide banner after reporting
  } catch (err) {
    console.error('Failed to report issue', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to report issue. Please contact support manually.'
    })
  } finally {
    reportingIssue.value = false
  }
}

const copyUserCredentials = () => {
  const creds = `Invify Portal Credentials\n-----------------\nEmail: ${form.value.email}\nPassword: ${form.value.password}\nPlan: ${form.value.plan.toUpperCase()}\n\nNote: Forced password override enabled on first login.`
  copyToClipboard(creds)
    .then(() => {
      $q.notify({ type: 'positive', message: 'Credentials copied to clipboard!' })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: 'Failed to copy credentials' })
    })
}

const shareViaWhatsApp = () => {
  const text = encodeURIComponent(
    `Hello! Your new Invify Enterprise Profile is ready.\n\nEmail: ${form.value.email}\nPassword: ${form.value.password}\n\nPlease access the console at ${window.location.origin}/admin/login\n\nSecurity Notice: You must override this temporary password upon your first login.`
  )
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

const skipOnboarding = () => {
  router.push('/tenant/dashboard')
}

const goToTenantsMatrix = () => {
  // Safe routing back to admin page
  localStorage.setItem('operator_role', 'SUPER_ADMIN')
  router.push('/admin/tenants')
}

const testNewTenantLogin = () => {
  localStorage.clear()
  sessionStorage.clear()
  window.location.href = '/tenant/login'
}
</script>

<style scoped>
.font-mono { font-family: 'Courier New', Courier, monospace; }
.border-indigo { border: 1px solid #4f46e5; }
.border-indigo-4 { border: 1px solid #818cf8 !important; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-indigo-10 { background: #0b0f19; }
.card-dark {
  background: #101625 !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  color: #ffffff !important;
}
.card-active {
  background: #0b0f19 !important;
  border: 1px solid #818cf8 !important;
  color: #ffffff !important;
}

.swatch-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.color-preview-block {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: inline-block;
}

.receipt-preview-box {
  background: #101625;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 8px;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
  min-height: 200px;
}

.terminal-screen {
  background: #05070d;
  border: 1px solid rgba(99, 102, 241, 0.2);
  min-height: 260px;
  border-radius: 8px;
  box-shadow: inset 0 2px 12px rgba(0,0,0,0.8);
}

.terminal-action-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.terminal-lines-box {
  max-height: 200px;
  overflow-y: auto;
}

.pulse-opacity {
  animation: pulse-opacity 1.5s infinite ease-in-out;
}

@keyframes pulse-opacity {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

.transition-3 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

.onboarding-bg-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: auto;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
}
</style>
