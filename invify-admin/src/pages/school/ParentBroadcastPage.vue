<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold text-indigo-9">Message parents</div>
        <div class="text-caption text-grey-7">
          Send one note to every parent on the school roster by email or SMS.
        </div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="refresh" label="Refresh" :loading="loading" @click="loadAudience" />
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3" v-for="card in cards" :key="card.label">
        <q-card flat bordered class="q-pa-md">
          <div class="text-caption text-grey-7">{{ card.label }}</div>
          <div class="text-h6 text-weight-bold">{{ card.value }}</div>
        </q-card>
      </div>
    </div>

    <q-banner v-if="!audience.smsConfigured" class="bg-orange-1 text-orange-10 q-mb-md" rounded>
      SMS is not configured on this server yet. Email can still be sent.
    </q-banner>
    <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>{{ error }}</q-banner>
    <q-banner v-if="result" class="bg-green-1 text-green-10 q-mb-md" rounded>{{ result }}</q-banner>

    <q-card flat bordered class="q-pa-md" style="max-width: 720px">
      <div class="text-subtitle2 q-mb-sm">Channels</div>
      <div class="row q-gutter-md q-mb-md">
        <q-checkbox v-model="email" label="Email" />
        <q-checkbox v-model="sms" label="SMS" :disable="!audience.smsConfigured" />
      </div>
      <q-input v-model="subject" outlined label="Email subject" class="q-mb-md" maxlength="120" counter />
      <q-input
        v-model="message"
        outlined
        type="textarea"
        autogrow
        label="Message"
        maxlength="1000"
        counter
        class="q-mb-md"
      />

      <div class="text-subtitle2 q-mb-sm">Send a test first</div>
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-6">
          <q-input v-model="testEmail" outlined dense label="Test email" />
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="testPhone" outlined dense label="Test phone" hint="For example 0803..." />
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn outline color="primary" label="Send test" :loading="sending" @click="send(true)" />
        <q-btn color="primary" label="Send to all parents" :loading="sending" @click="confirmSend" />
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { schoolApi } from 'src/api'

const $q = useQuasar()
const loading = ref(false)
const sending = ref(false)
const error = ref('')
const result = ref('')
const email = ref(true)
const sms = ref(false)
const subject = ref('')
const message = ref('')
const testEmail = ref('')
const testPhone = ref('')
const audience = ref({
  parents: 0,
  emailRecipients: 0,
  smsRecipients: 0,
  smsConfigured: false,
})

const cards = computed(() => [
  { label: 'Parents', value: audience.value.parents },
  { label: 'With email', value: audience.value.emailRecipients },
  { label: 'With phone', value: audience.value.smsRecipients },
  { label: 'SMS', value: audience.value.smsConfigured ? 'Ready' : 'Not set up' },
])

function channels() {
  const list = []
  if (email.value) list.push('email')
  if (sms.value) list.push('sms')
  return list
}

async function loadAudience() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await schoolApi.parentBroadcastAudience()
    audience.value = data || audience.value
  } catch (err) {
    error.value = err?.response?.data?.error || 'Could not load parents.'
  } finally {
    loading.value = false
  }
}

function describe(data) {
  const parts = []
  if (data.email) parts.push(`Email sent ${data.email.sent}, failed ${data.email.failed}`)
  if (data.sms) parts.push(`SMS sent ${data.sms.sent}, failed ${data.sms.failed}`)
  const prefix = data.test ? 'Test finished. ' : 'Broadcast finished. '
  return prefix + (parts.join('. ') || 'No messages were sent.')
}

async function send(testOnly) {
  error.value = ''
  result.value = ''
  if (!message.value.trim()) {
    error.value = 'Enter the message to send.'
    return
  }
  if (!channels().length) {
    error.value = 'Choose email, SMS, or both.'
    return
  }
  sending.value = true
  try {
    const { data } = await schoolApi.sendParentBroadcast({
      channels: channels(),
      subject: subject.value,
      message: message.value,
      testOnly,
      testEmail: testEmail.value,
      testPhone: testPhone.value,
    })
    result.value = describe(data || {})
  } catch (err) {
    error.value = err?.response?.data?.error || 'The message could not be sent.'
  } finally {
    sending.value = false
  }
}

function confirmSend() {
  $q.dialog({
    title: 'Send to all parents',
    message: 'This sends the message to every parent email and phone you selected. Send a test first if you have not checked it.',
    cancel: true,
    persistent: true,
    ok: { label: 'Send', color: 'primary' },
  }).onOk(() => send(false))
}

onMounted(loadAudience)
</script>
