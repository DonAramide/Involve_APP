<template>
  <q-page class="q-pa-md bg-grey-1">
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" color="primary" to="/sandbox" class="q-mr-sm" />
      <div>
        <h1 class="text-h4 text-weight-bold q-my-none text-primary">QFS Developer Portal</h1>
        <p class="text-subtitle1 text-grey-7 q-mt-sm">Interactive integration guide and cURL examples for the Quasar Financial Sandbox</p>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Sidebar / Navigation -->
      <div class="col-12 col-md-3">
        <q-card flat bordered class="rounded-borders sticky-top">
          <q-list padding class="text-grey-9">
            <q-item-label header class="text-weight-bold text-uppercase">Getting Started</q-item-label>
            <q-item clickable v-ripple @click="scrollTo('auth')">
              <q-item-section avatar><q-icon name="vpn_key" color="primary" /></q-item-section>
              <q-item-section>Authentication</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="scrollTo('bootstrap')">
              <q-item-section avatar><q-icon name="rocket_launch" color="primary" /></q-item-section>
              <q-item-section>Bootstrap & Webhooks</q-item-section>
            </q-item>
            
            <q-separator class="q-my-md" />
            
            <q-item-label header class="text-weight-bold text-uppercase">Core API</q-item-label>
            <q-item clickable v-ripple @click="scrollTo('accounts')">
              <q-item-section avatar><q-icon name="account_balance" color="secondary" /></q-item-section>
              <q-item-section>Virtual Accounts</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="scrollTo('credit-debit')">
              <q-item-section avatar><q-icon name="swap_vert" color="secondary" /></q-item-section>
              <q-item-section>Credit / Debit</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="scrollTo('transfers')">
              <q-item-section avatar><q-icon name="send" color="secondary" /></q-item-section>
              <q-item-section>Transfers</q-item-section>
            </q-item>
            
            <q-separator class="q-my-md" />
            
            <q-item-label header class="text-weight-bold text-uppercase">PSP Simulators</q-item-label>
            <q-item clickable v-ripple @click="scrollTo('simulators')">
              <q-item-section avatar><q-icon name="science" color="accent" /></q-item-section>
              <q-item-section>Simulate Provider</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Main Content -->
      <div class="col-12 col-md-9">
        
        <!-- Authentication -->
        <q-card id="auth" flat bordered class="rounded-borders q-mb-md">
          <q-card-section>
            <div class="text-h5 text-weight-bold text-dark q-mb-sm">Authentication</div>
            <p class="text-body1">
              All sandbox endpoints require a <strong>Sandbox API Key</strong> (<code>sk_test_*</code>). 
              Live keys (<code>sk_live_*</code>) will be rejected. 
              Calls are proxied to <strong>Quasar Financial Sandbox</strong> (set <code>QFS_USE_QUASAR=false</code> for the local stub only).
              Generated VAs appear in Quasar admin → Virtual Accounts.
              You can generate a test key in the <router-link to="/sandbox/keys">API Keys</router-link> page.
            </p>
            
            <q-banner rounded class="bg-blue-1 text-primary q-mb-md">
              <template v-slot:avatar>
                <q-icon name="info" color="primary" />
              </template>
              Base URL: <code>{{ baseUrl }}/api/v1/sandbox</code> <br/>
              Auth Header: <code>Authorization: Bearer sk_test_...</code>
            </q-banner>

            <div class="text-subtitle2 text-grey-8 q-mb-xs">Verify your key (Who am I?)</div>
            <CodeBlock :code="`curl -s &quot;${baseUrl}/api/v1/sandbox&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot;`" language="bash" />
          </q-card-section>
        </q-card>

        <!-- Bootstrap -->
        <q-card id="bootstrap" flat bordered class="rounded-borders q-mb-md">
          <q-card-section>
            <div class="text-h5 text-weight-bold text-dark q-mb-sm">Bootstrap (Webhooks)</div>
            <p class="text-body1">
              Before running transactions, bootstrap your sandbox environment to configure your webhook endpoint and receive your HMAC signing secret.
            </p>
            
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Configure Webhook URL</div>
            <CodeBlock :code="`curl -s -X POST &quot;${baseUrl}/api/v1/sandbox/bootstrap&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot; \\\n  -H &quot;Content-Type: application/json&quot; \\\n  -d '{\n    &quot;sandboxWebhookUrl&quot;: &quot;http://localhost:3001/webhooks/quasar&quot;\n  }'`" language="bash" />
            
            <q-banner rounded class="bg-warning text-dark q-mt-sm">
              <template v-slot:avatar>
                <q-icon name="warning" color="dark" />
              </template>
              The response contains <code>sandboxSecretKey</code>. This is your HMAC signing secret (often stored as <code>QUASAR_WEBHOOK_SECRET</code> in your <code>.env</code> file). It is returned <strong>only once</strong>.
            </q-banner>
          </q-card-section>
        </q-card>

        <!-- Virtual Accounts -->
        <q-card id="accounts" flat bordered class="rounded-borders q-mb-md">
          <q-card-section>
            <div class="text-h5 text-weight-bold text-dark q-mb-sm">Virtual Accounts</div>
            <p class="text-body1">
              Create and manage 900-prefix virtual accounts for your sandbox testing.
            </p>
            
            <div class="text-subtitle2 text-grey-8 q-mb-xs">List bank providers (pick before generate)</div>
            <CodeBlock :code="`curl -s &quot;${baseUrl}/api/v1/sandbox/bank-providers&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot;`" language="bash" />
            <p class="text-caption text-grey-7 q-mb-md">
              Returns each provider (Paystack, Flutterwave, Quasar Bank, …) with its banks.
              Use <code>bankCode</code> from a bank in the list when generating.
            </p>

            <div class="text-subtitle2 text-grey-8 q-mb-xs">Generate Account</div>
            <CodeBlock :code="`curl -s -X POST &quot;${baseUrl}/api/v1/sandbox/accounts/generate&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot; \\\n  -H &quot;Content-Type: application/json&quot; \\\n  -d '{\n    &quot;accountName&quot;: &quot;Test VA&quot;,\n    &quot;bankCode&quot;: &quot;058&quot;\n  }'`" language="bash" />
            <p class="text-caption text-grey-7 q-mb-md">
              Tenant + Quasar key come from the Bearer token. Bridge sets
              <code>serviceSlug</code> from the tenant vertical
              (<code>invify_school</code> | <code>invify_retail</code> | <code>invify_services</code>).
              Response includes <code>quasarPayload</code> showing the exact Quasar body.
            </p>
            
            <div class="text-subtitle2 text-grey-8 q-mb-xs q-mt-md">List Accounts</div>
            <CodeBlock :code="`curl -s &quot;${baseUrl}/api/v1/sandbox/accounts&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot;`" language="bash" />
          </q-card-section>
        </q-card>
        
        <!-- Credit / Debit -->
        <q-card id="credit-debit" flat bordered class="rounded-borders q-mb-md">
          <q-card-section>
            <div class="text-h5 text-weight-bold text-dark q-mb-sm">Manual Credit / Debit</div>
            <p class="text-body1">
              Adjust balances directly for testing. Amounts are always in the lowest denomination (e.g., kobo for NGN). 
              <code>₦100,000 = 10000000 kobo</code>
            </p>
            
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Credit Account</div>
            <CodeBlock :code="`curl -s -X POST &quot;${baseUrl}/api/v1/sandbox/accounts/{accountId}/credit&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot; \\\n  -H &quot;Content-Type: application/json&quot; \\\n  -d '{\n    &quot;amount&quot;: 10000000,\n    &quot;reason&quot;: &quot;Initial Funding&quot;\n  }'`" language="bash" />
          </q-card-section>
        </q-card>

        <!-- PSP Simulators -->
        <q-card id="simulators" flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-h5 text-weight-bold text-dark q-mb-sm">PSP Simulators</div>
            <p class="text-body1">
              Simulate webhook deliveries from 3rd party providers (Paystack, Flutterwave, Monnify, etc.) with correct HMAC signatures generated automatically using your sandbox secret.
            </p>
            
            <div class="text-subtitle2 text-grey-8 q-mb-xs">List Providers</div>
            <CodeBlock :code="`curl -s &quot;${baseUrl}/api/v1/sandbox/providers&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot;`" language="bash" />
            
            <div class="text-subtitle2 text-grey-8 q-mb-xs q-mt-md">Simulate Paystack Success</div>
            <CodeBlock :code="`curl -s -X POST &quot;${baseUrl}/api/v1/sandbox/providers/PAYSTACK/simulate&quot; \\\n  -H &quot;Authorization: Bearer sk_test_your_key_here&quot; \\\n  -H &quot;Content-Type: application/json&quot; \\\n  -d '{\n    &quot;amount&quot;: 50000,\n    &quot;narration&quot;: &quot;Ticket sale test&quot;,\n    &quot;outcome&quot;: &quot;success&quot;\n  }'`" language="bash" />
          </q-card-section>
        </q-card>
        
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref, h } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'

// Inline CodeBlock Component
const CodeBlock = {
  props: {
    code: String,
    language: String
  },
  setup(props) {
    const $q = useQuasar()
    const copy = async () => {
      try {
        await copyToClipboard(props.code)
        $q.notify({ type: 'positive', message: 'Copied to clipboard', icon: 'content_copy', position: 'top-right' })
      } catch (e) {
        $q.notify({ type: 'negative', message: 'Failed to copy' })
      }
    }
    
    return () => h('div', { class: 'bg-dark text-white rounded-borders q-pa-sm relative-position' }, [
      h('q-btn', { 
        class: 'absolute-top-right q-ma-xs', 
        icon: 'content_copy', 
        flat: true, 
        round: true, 
        dense: true, 
        size: 'sm', 
        color: 'grey-4', 
        onClick: copy 
      }),
      h('pre', { class: 'q-ma-none text-body2', style: 'white-space: pre-wrap; word-break: break-all;' }, props.code)
    ])
  }
}

export default {
  name: 'DeveloperPortalPage',
  components: { CodeBlock },
  setup () {
    const baseUrl = ref(import.meta.env.VITE_API_URL || 'http://localhost:3004')
    
    const scrollTo = (id) => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    return {
      baseUrl,
      scrollTo
    }
  }
}
</script>

<style scoped>
.sticky-top {
  position: sticky;
  top: 80px;
}
</style>
