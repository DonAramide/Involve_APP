<!-- invify-admin/src/pages/ReferralPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Growth & Referrals</h1>
        <div class="text-grey-6">Invite other schools to Invify and earn bonus AI generation credits.</div>
      </div>
    </div>

    <div class="row q-col-gutter-lg">
       <!-- 1. Stats and Link -->
       <div class="col-12 col-md-4">
          <!-- Reward Card -->
          <q-card class="bg-indigo-10 shadow-5 q-pa-lg q-mb-lg border-indigo-accent">
             <div class="text-subtitle2 text-indigo-3 uppercase text-weight-bold">BONUS UNLOCKED</div>
             <div class="row items-center q-mt-sm">
                <div class="text-h2 text-weight-bolder">+{{ stats?.bonusQuota || 0 }}</div>
                <div class="text-subtitle1 text-grey-4 q-ml-sm">Units / mo</div>
             </div>
             <div class="text-caption text-grey-5 q-mt-md">Earned by helping other schools digitize their curriculum.</div>
          </q-card>

          <!-- Sharing Card -->
          <q-card class="bg-blue-grey-10 shadow-5 q-pa-lg">
             <div class="text-subtitle1 text-weight-bold q-mb-md">Your Referral Link</div>
             <div class="row no-wrap items-center bg-dark q-pa-sm rounded-borders border-grey">
                <div class="text-caption text-grey-5 ellipsis col">{{ referralLink }}</div>
                <q-btn flat icon="content_copy" color="indigo-4" @click="copyLink">
                   <q-tooltip>Copy to clipboard</q-tooltip>
                </q-btn>
             </div>
             <div class="text-center q-mt-lg">
                <div class="text-caption text-grey-6 q-mb-sm">Share on Social Media</div>
                <div class="row justify-center q-gutter-sm">
                   <q-btn round color="blue-8" icon="facebook" size="sm" />
                   <q-btn round color="light-blue-4" icon="chat" size="sm" /> 
                   <q-btn round color="green-6" icon="message" size="sm" />
                </div>
             </div>
          </q-card>
       </div>

       <!-- 2. Invite Form and Stats -->
       <div class="col-12 col-md-8">
          <q-card class="bg-blue-grey-10 shadow-5 q-pa-lg q-mb-lg border-indigo">
             <div class="text-h6 text-weight-bold q-mb-sm">Invite a School Admin</div>
             <div class="text-caption text-grey-6 q-mb-lg">We'll send a professional invitation to their school on your behalf.</div>
             
             <div class="row q-col-gutter-sm items-center">
                <div class="col"><q-input v-model="inviteEmail" label="School Admin Email" dark filled dense /></div>
                <div class="col-auto">
                   <q-btn color="indigo-7" label="Send Invite" class="q-px-xl glossy" :loading="sending" @click="sendInvite" />
                </div>
             </div>
          </q-card>

          <!-- Funnel/Stats -->
          <div class="row q-col-gutter-md">
             <div class="col-4 text-center">
                <q-card class="bg-blue-grey-10 q-pa-md border-grey">
                   <div class="text-h4 text-weight-bolder">{{ stats?.totalInvited }}</div>
                   <div class="text-caption text-grey-6">INVITES SENT</div>
                </q-card>
             </div>
             <div class="col-4 text-center">
                <q-card class="bg-blue-grey-10 q-pa-md border-grey">
                   <div class="text-h4 text-weight-bolder text-green-4">{{ stats?.totalJoined }}</div>
                   <div class="text-caption text-grey-6">SCHOOLS JOINED</div>
                </q-card>
             </div>
             <div class="col-4 text-center">
                <q-card class="bg-blue-grey-10 q-pa-md border-grey">
                   <div class="text-h4 text-weight-bolder text-indigo-4">{{ stats?.totalRewarded }}</div>
                   <div class="text-caption text-grey-6">REWARDS APPLIED</div>
                </q-card>
             </div>
          </div>

          <!-- History List -->
          <div class="text-subtitle1 text-weight-bold q-mt-xl q-mb-md">Referral History</div>
          <q-list dark separator class="bg-blue-grey-10 rounded-borders">
             <q-item v-for="item in stats?.history" :key="item.id">
                <q-item-section>
                   <q-item-label class="text-weight-bold">{{ item.invited_email }}</q-item-label>
                   <q-item-label caption class="text-grey-6">Invited on {{ new Date(item.created_at).toLocaleDateString() }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                   <q-chip :color="item.status === 'joined' ? 'green-10' : 'blue-grey-9'" text-color="white" size="sm">
                      {{ item.status?.toUpperCase() }}
                   </q-chip>
                </q-item-section>
                <q-item-section side v-if="item.reward_applied">
                   <q-icon name="stars" color="indigo-4">
                      <q-tooltip>+50 AI Quota Granted</q-tooltip>
                   </q-icon>
                </q-item-section>
             </q-item>
             <div v-if="!stats?.history?.length" class="text-center q-pa-xl text-grey-8">Your referral history will appear here.</div>
          </q-list>
       </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { referralApi } from '../api'
import { copyToClipboard, Notify } from 'quasar'

const loading = ref(true)
const sending = ref(false)
const inviteEmail = ref('')
const stats = ref(null)

const referralLink = computed(() => {
  const code = stats.value?.code || '...'
  const host = window.location.origin
  return `${host}/#/onboarding?ref=${code}`
})

const fetchStats = async () => {
  loading.value = true
  try {
    const { data } = await referralApi.getStats()
    stats.value = data
  } finally {
    loading.value = false
  }
}

const sendInvite = async () => {
  if (!inviteEmail.value) return
  sending.value = true
  try {
    await referralApi.sendInvite({ email: inviteEmail.value })
    Notify.create({ type: 'positive', message: 'Invitation sent!' })
    inviteEmail.value = ''
    fetchStats()
  } finally {
    sending.value = false
  }
}

const copyLink = () => {
  copyToClipboard(referralLink.value)
    .then(() => Notify.create({ type: 'positive', message: 'Link copied to clipboard' }))
}

onMounted(fetchStats)
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-indigo-10 { background: #1a237e; }
.border-indigo { border-left: 5px solid #3f51b5; }
.border-indigo-accent { border-left: 8px solid #3f51b5; }
.border-grey { border: 1px solid #1e293b; }
</style>
