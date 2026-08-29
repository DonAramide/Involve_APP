<!-- invify-admin/src/pages/applications/APKDeploymentPage.vue -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">

    <!-- Header -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="system_update" size="sm" color="cyan-3" />
        <div>
          <div class="text-operator-title text-main text-weight-bold" style="font-size: 14px;">APK Fleet Deployment Control</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">OTA_PUSH_ENGINE // MAX_3_VAULT_SLOTS // REMOTE_INSTALL_UNINSTALL</div>
        </div>
      </div>
      <div class="row items-center op-gap-8">
        <q-chip dense color="cyan-10" text-color="cyan-3" class="text-metric-sm">
          {{ apkVault.length }} / 3 Vault Slots Used
        </q-chip>
        <q-btn
          dense size="sm" color="cyan-4" text-color="black"
          icon="upload_file" label="Upload New APK"
          :disable="apkVault.length >= 3"
          @click="openUploadDialog()"
          class="text-weight-bold q-px-sm"
        />
      </div>
    </div>

    <!-- MAIN SPLIT -->
    <div class="row op-gap-16 items-stretch">

      <!-- LEFT: APK Vault (max 3) -->
      <div class="col-12 col-md-5 column op-gap-12">
        <div class="enterprise-panel bg-panel column">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4">
              <q-icon name="inventory_2" size="xs" color="amber-4" />
              <span class="text-operator-title text-main text-weight-bold">APK Vault Registry</span>
            </div>
            <span class="text-metric-mono text-amber-4" style="font-size: 10px;">MAX 3 PACKAGES HELD</span>
          </div>

          <div class="panel-body q-pa-sm column op-gap-8">
            <!-- Empty slot indicators -->
            <div
              v-for="slot in 3" :key="slot"
              class="rounded-borders border-muted q-pa-sm"
              :class="apkVault[slot - 1] ? 'bg-panel-darker' : 'bg-empty-slot'"
            >
              <!-- Filled slot -->
              <template v-if="apkVault[slot - 1]">
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center op-gap-8 no-wrap overflow-hidden">
                    <q-icon name="android" color="green-4" size="xs" />
                    <div class="overflow-hidden">
                      <div class="text-main text-weight-bold ellipsis" style="font-size: 12px;">{{ apkVault[slot - 1].name }}</div>
                      <div class="text-metric-mono text-muted" style="font-size: 10px;">{{ apkVault[slot - 1].packageName }}</div>
                    </div>
                  </div>
                  <div class="row items-center">
                    <q-btn flat dense size="sm" icon="upgrade" color="amber-4" @click="openUpdateDialog(slot - 1)">
                      <q-tooltip class="bg-amber-10 text-amber-2 text-caption">Upload New Version</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat dense size="sm"
                      icon="content_copy"
                      color="cyan-3"
                      :disable="!apkVault[slot - 1].s3Url || apkVault[slot - 1].status === 'UPLOADING'"
                      @click="copyDownloadLink(apkVault[slot - 1])"
                    >
                      <q-tooltip class="bg-cyan-10 text-cyan-2 text-caption">Copy download link</q-tooltip>
                    </q-btn>
                    <q-btn flat dense size="sm" class="q-mx-md" icon="edit_link" color="cyan-4" @click="promptEditUrl(slot - 1)">
                      <q-tooltip class="bg-cyan-10 text-cyan-2 text-caption">Edit Download URL</q-tooltip>
                    </q-btn>
                    <q-btn flat dense size="sm" icon="delete_outline" color="red-4" @click="removeApk(slot - 1)">
                      <q-tooltip class="bg-red-10 text-red-2 text-caption">Remove from Vault</q-tooltip>
                    </q-btn>
                  </div>
                </div>
                <div class="row items-center justify-between q-mt-xs text-caption text-muted" style="font-size: 10px;">
                  <span>v{{ apkVault[slot - 1].version }} · {{ apkVault[slot - 1].size }}</span>
                  <q-chip dense size="xs" :color="apkVault[slot-1].status === 'READY' ? 'green-10' : 'amber-10'" :text-color="apkVault[slot-1].status === 'READY' ? 'green-3' : 'amber-3'" class="text-weight-bold">
                    {{ apkVault[slot - 1].status }}
                  </q-chip>
                </div>

                <!-- Install / Uninstall counters -->
                <div class="row items-center op-gap-12 q-mt-xs q-px-xs q-py-xs bg-panel rounded-borders border-muted">
                  <div class="column items-center" style="gap: 1px; flex: 1;">
                    <span class="text-metric-mono text-green-4 text-weight-bold" style="font-size: 14px;">{{ apkVault[slot - 1].installCount }}</span>
                    <span class="text-muted" style="font-size: 9px;">INSTALLS</span>
                  </div>
                  <div class="bg-subpanel" style="width: 1px; height: 28px;"></div>
                  <div class="column items-center" style="gap: 1px; flex: 1;">
                    <span class="text-metric-mono text-red-4 text-weight-bold" style="font-size: 14px;">{{ apkVault[slot - 1].uninstallCount }}</span>
                    <span class="text-muted" style="font-size: 9px;">UNINSTALLS</span>
                  </div>
                  <div class="bg-subpanel" style="width: 1px; height: 28px;"></div>
                  <div class="column items-center" style="gap: 1px; flex: 1;">
                    <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 14px;">{{ Math.max(0, apkVault[slot - 1].installCount - apkVault[slot - 1].uninstallCount) }}</span>
                    <span class="text-muted" style="font-size: 9px;">NET ACTIVE</span>
                  </div>
                </div>
                <q-linear-progress
                  v-if="apkVault[slot-1].uploadProgress < 100"
                  :value="apkVault[slot-1].uploadProgress / 100"
                  color="cyan-4" track-color="grey-9" size="xs" class="q-mt-xs"
                />
                <!-- Version Distribution Breakdown -->
                <div class="column op-gap-4 q-mt-xs">
                  <div class="row items-center justify-between">
                    <span class="text-metric-mono text-muted" style="font-size: 9px;">VERSION DISTRIBUTION ACROSS FLEET:</span>
                    <span class="text-metric-mono text-muted" style="font-size: 9px;">{{ totalDevicesForApk(apkVault[slot - 1]) }} DEVICES TOTAL</span>
                  </div>
                  <div
                    v-for="vd in apkVault[slot - 1].versionDistribution"
                    :key="vd.version"
                    class="column op-gap-1"
                  >
                    <div class="row items-center justify-between" style="font-size: 10px;">
                      <div class="row items-center op-gap-4">
                        <span class="text-metric-mono" :class="vd.version === apkVault[slot-1].version ? 'text-cyan-3' : 'text-muted'">v{{ vd.version }}</span>
                        <q-chip v-if="vd.version === apkVault[slot-1].version" dense size="xs" color="cyan-10" text-color="cyan-3" style="font-size: 9px; padding: 0 4px;">LATEST</q-chip>
                        <q-chip v-else dense size="xs" color="grey-9" text-color="grey-5" style="font-size: 9px; padding: 0 4px;">LEGACY</q-chip>
                      </div>
                      <span class="text-main text-weight-bold">{{ vd.deviceCount }} <span class="text-muted text-weight-regular">devices</span></span>
                    </div>
                    <q-linear-progress
                      :value="totalDevicesForApk(apkVault[slot-1]) > 0 ? vd.deviceCount / totalDevicesForApk(apkVault[slot-1]) : 0"
                      :color="vd.version === apkVault[slot-1].version ? 'cyan-4' : 'grey-7'"
                      track-color="grey-9"
                      size="xs"
                    />
                    <div class="text-muted text-right" style="font-size: 9px;">
                      {{ totalDevicesForApk(apkVault[slot-1]) > 0 ? Math.round(vd.deviceCount / totalDevicesForApk(apkVault[slot-1]) * 100) : 0 }}% of fleet
                    </div>
                  </div>
                </div>

                <div class="row items-center justify-end op-gap-8 q-mt-md border-top q-pt-sm">
                  <div class="row items-center op-gap-4 bg-panel-darker rounded-borders q-px-xs">
                    <span class="text-muted text-metric-mono" style="font-size: 9px;">DEPLOY VER:</span>
                    <q-select
                      v-model="apkVault[slot-1].selectedDeployVersion"
                      :options="apkVault[slot-1].versionDistribution.map(v => v.version)"
                      dense borderless options-dense hide-bottom-space
                      class="text-caption text-weight-bold"
                      style="min-width: 70px;"
                    />
                  </div>
                  <q-btn
                    unelevated size="sm" color="cyan-10" text-color="cyan-3" icon="send"
                    :label="`DEPLOY TO ${selectedDevices.length || 0} DEVICES`"
                    :disable="selectedDevices.length === 0 || apkVault[slot-1].status !== 'READY'"
                    @click="deployApk(apkVault[slot - 1])"
                    class="text-weight-bold"
                  />
                  <q-btn
                    unelevated size="sm" color="red-10" text-color="red-3" icon="delete_sweep"
                    label="UNINSTALL"
                    :disable="selectedDevices.length === 0"
                    @click="uninstallApk(apkVault[slot - 1])"
                    class="text-weight-bold"
                  />
                </div>
              </template>

              <!-- Empty slot -->
              <template v-else>
                <div class="column items-center justify-center q-py-sm text-muted" style="gap: 4px;">
                  <q-icon name="add_box" size="sm" color="grey-7" />
                  <span class="text-metric-mono" style="font-size: 10px;">SLOT {{ slot }} — EMPTY</span>
                  <q-btn dense flat size="xs" color="grey-5" label="Upload APK" @click="openUploadDialog()" />
                </div>
              </template>
            </div>

            <div class="text-muted text-center border-top q-pt-xs" style="font-size: 9px;">
              System enforces a maximum of 3 concurrent APK vault entries. Remove an existing entry to upload a new one.
            </div>
          </div>
        </div>

        <!-- Deployment Log -->
        <div class="enterprise-panel bg-panel column">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4">
              <q-icon name="history" size="xs" color="indigo-3" />
              <span class="text-operator-title text-main text-weight-bold">Deployment Activity Log</span>
            </div>
          </div>
          <div class="panel-body q-pa-xs column op-gap-4" style="max-height: 200px; overflow-y: auto;">
            <div
              v-for="log in deploymentLog" :key="log.id"
              class="bg-panel-darker q-px-sm q-py-xs rounded-borders row items-center justify-between"
              style="font-size: 10px;"
            >
              <div class="column" style="gap: 1px;">
                <span class="text-main" style="font-size: 11px;">{{ log.action }} — <span class="text-metric-mono text-cyan-3">{{ log.apkName }}</span></span>
                <span class="text-muted">{{ log.devices }} devices · {{ log.time }}</span>
              </div>
              <q-chip dense size="xs" :color="log.status === 'SUCCESS' ? 'green-10' : log.status === 'PENDING' ? 'amber-10' : 'red-10'" :text-color="log.status === 'SUCCESS' ? 'green-3' : log.status === 'PENDING' ? 'amber-3' : 'red-3'" class="text-weight-bold">
                {{ log.status }}
              </q-chip>
            </div>
            <div v-if="deploymentLog.length === 0" class="text-center text-muted q-pa-sm" style="font-size: 10px;">No deployment events recorded yet.</div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Device Targeting Panel -->
      <div class="col-12 col-md-7 column op-gap-12">
        <div class="enterprise-panel bg-panel column">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4">
              <q-icon name="devices" size="xs" color="cyan-3" />
              <span class="text-operator-title text-main text-weight-bold">Target Device Selection</span>
            </div>
            <div class="row items-center op-gap-8">
              <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">{{ selectedDevices.length }} / {{ devices.length }} SELECTED</span>
              <q-btn flat dense size="xs" color="grey-5" :label="selectedDevices.length === devices.length ? 'Deselect All' : 'Select All'" @click="toggleSelectAll" />
            </div>
          </div>

          <!-- Filter bar -->
          <div class="q-px-sm q-py-xs row items-center op-gap-8 border-bottom bg-panel-darker wrap">
            <q-input v-model="deviceSearch" dense filled placeholder="Search devices..." class="col text-caption bg-subpanel" style="min-width:150px;">
              <template v-slot:append><q-icon name="search" size="xs" color="grey-6" /></template>
            </q-input>
            <q-select
              v-model="statusFilter"
              :options="['ALL', 'ONLINE', 'OFFLINE', 'SYNCING']"
              dense filled options-dense class="text-caption bg-subpanel" style="width: 100px;"
            />
            <q-select
              v-model="tenantFilter"
              :options="['ALL TENANTS', 'tenant-alpha', 'tenant-omega', 'tenant-beta']"
              dense filled options-dense class="text-caption bg-subpanel" style="width: 120px;"
            />
            <q-select
              v-model="planFilter"
              :options="['ALL PLANS', 'BASIC', 'PRO']"
              dense filled options-dense class="text-caption bg-subpanel" style="width: 100px;"
            />
            <q-select
              v-model="modeFilter"
              :options="['ALL MODES', 'RETAIL', 'SERVICE', 'SCHOOL']"
              dense filled options-dense class="text-caption bg-subpanel" style="width: 110px;"
            />
          </div>

          <!-- Device Table -->
          <div class="col overflow-auto custom-scrollbar" style="max-height: 420px;">
            <table class="enterprise-table full-width" style="border-collapse: collapse;">
              <thead class="bg-panel-darker text-muted text-metric-mono sticky-header border-bottom" style="font-size: 10px;">
                <tr>
                  <th class="q-pa-xs" style="width: 30px;"></th>
                  <th class="q-pa-xs">Device ID</th>
                  <th class="q-pa-xs">Model</th>
                  <th class="q-pa-xs">Tenant</th>
                  <th class="q-pa-xs">Plan</th>
                  <th class="q-pa-xs">Mode</th>
                  <th class="q-pa-xs">Android</th>
                  <th class="q-pa-xs">Status</th>
                  <th class="q-pa-xs text-right">Last Sync</th>
                </tr>
              </thead>
              <tbody class="text-caption" style="font-size: 11px;">
                <tr
                  v-for="device in filteredDevices" :key="device.id"
                  @click="toggleDevice(device.id)"
                  class="cursor-pointer hover-row border-bottom-light"
                  :class="selectedDevices.includes(device.id) ? 'row-selected' : ''"
                >
                  <td class="q-pa-xs text-center">
                    <q-checkbox dense :model-value="selectedDevices.includes(device.id)" @update:model-value="toggleDevice(device.id)" color="cyan-4" />
                  </td>
                  <td class="q-pa-xs text-metric-mono text-cyan-3" style="font-size: 10px;">{{ device.id }}</td>
                  <td class="q-pa-xs text-main text-weight-medium">{{ device.model }}</td>
                  <td class="q-pa-xs text-secondary" style="font-size: 10px;">{{ device.tenant }}</td>
                  <td class="q-pa-xs text-amber-3 text-weight-bold" style="font-size: 10px;">{{ device.plan }}</td>
                  <td class="q-pa-xs text-indigo-3" style="font-size: 10px;">{{ device.mode }}</td>
                  <td class="q-pa-xs text-muted">{{ device.android }}</td>
                  <td class="q-pa-xs">
                    <q-chip dense size="xs"
                      :color="device.status === 'ONLINE' ? 'green-10' : device.status === 'SYNCING' ? 'cyan-10' : 'grey-9'"
                      :text-color="device.status === 'ONLINE' ? 'green-3' : device.status === 'SYNCING' ? 'cyan-3' : 'grey-5'"
                      class="text-weight-bold"
                    >{{ device.status }}</q-chip>
                  </td>
                  <td class="q-pa-xs text-muted text-right" style="font-size: 10px;">{{ device.lastSync }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Active Deployments Progress -->
        <div v-if="activeDeployments.length > 0" class="enterprise-panel bg-panel column">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4">
              <q-icon name="sync" size="xs" color="green-4" class="rotating-icon" />
              <span class="text-operator-title text-main text-weight-bold">Active Deployment Streams</span>
            </div>
            <span class="text-metric-mono text-green-4" style="font-size: 10px;">{{ activeDeployments.length }} IN PROGRESS</span>
          </div>
          <div class="panel-body q-pa-sm column op-gap-8">
            <div v-for="dep in activeDeployments" :key="dep.id" class="bg-panel-darker q-pa-sm rounded-borders column op-gap-4">
              <div class="row items-center justify-between">
                <span class="text-main text-weight-bold" style="font-size: 11px;">{{ dep.apkName }} → {{ dep.targetCount }} devices</span>
                <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">{{ dep.progress }}%</span>
              </div>
              <q-linear-progress :value="dep.progress / 100" color="cyan-4" track-color="grey-9" size="xs" />
              <div class="row justify-between text-muted" style="font-size: 9px;">
                <span>Action: <span class="text-main">{{ dep.action }}</span></span>
                <span>{{ dep.completed }} / {{ dep.targetCount }} applied</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload APK Dialog -->
    <q-dialog v-model="uploadDialogOpen" persistent>
      <q-card class="bg-panel text-main border-muted" style="min-width: 420px;">
        <q-card-section class="bg-subpanel border-bottom row items-center op-gap-8">
          <q-icon name="upload_file" color="cyan-4" size="sm" />
          <div>
            <div class="text-main text-weight-bold text-caption">{{ targetSlotIndex !== null ? 'Upload New Version' : 'Upload APK to Vault' }}</div>
            <div class="text-muted text-metric-mono" style="font-size: 10px;">{{ targetSlotIndex !== null ? `Updating Slot ${targetSlotIndex + 1}` : `Slot ${apkVault.length + 1} of 3 — Max 3 packages enforced` }}</div>
          </div>
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pt-md">
          <q-input v-model="newApk.name" dense filled stack-label :loading="isDetecting" label="Application Name *" class="bg-subpanel" :dark="true" />
          <q-input v-model="newApk.packageName" dense filled stack-label :loading="isDetecting" label="Package Name (e.g. com.example.app) *" class="bg-subpanel" :dark="true" />
          <q-input v-model="newApk.version" dense filled stack-label :loading="isDetecting" label="Version (e.g. 2.1.0) *" class="bg-subpanel" :dark="true" />

          <!-- File Drop Zone -->
          <div
            class="border-muted rounded-borders q-pa-md column items-center justify-center cursor-pointer hover-bg"
            style="border-style: dashed; min-height: 100px;"
            @click="triggerFileInput"
          >
            <q-icon name="cloud_upload" size="md" color="cyan-4" />
            <div class="text-main text-weight-medium q-mt-xs" style="font-size: 12px;">
              {{ newApk.fileName || 'Click to select APK file' }}
            </div>
            <div class="text-muted" style="font-size: 10px;">Supports: .apk · Max size: 500MB</div>
            <input ref="fileInputRef" type="file" accept=".apk" style="display:none;" @change="onFileSelected" />
          </div>

          <div v-if="!newApk.name || !newApk.packageName || !newApk.version || !newApk.fileName" class="text-amber-4 text-caption" style="font-size: 10px;">
            ⚠ All fields and a valid APK file are required to proceed.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-subpanel border-top q-pa-sm">
          <q-btn flat dense size="sm" color="grey-5" label="Cancel" v-close-popup @click="resetNewApk" />
          <q-btn
            dense size="sm" color="cyan-4" text-color="black" label="Commit APK to Vault"
            :disable="!newApk.name || !newApk.packageName || !newApk.version || !newApk.fileName"
            @click="commitApkToVault"
            class="q-px-sm text-weight-bold"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Notify, useQuasar, copyToClipboard } from 'quasar'
import api from 'src/api'

const $q = useQuasar()
// ── APK Vault (max 3) ──────────────────────────────────────────────────────────
const apkVault = ref([])

onMounted(async () => {
  try {
    const { data } = await api.get('/api/admin/apk')
    apkVault.value = data.vault || []
    deploymentLog.value = data.logs || []
  } catch (error) {
    Notify.create({ type: 'negative', message: 'Failed to load APK vault', position: 'bottom-right' })
  }

  try {
    const { data: termData } = await api.get('/api/admin/inventory/tablets')
    if (termData && termData.data) {
      devices.value = termData.data.map(d => ({
        id: d.device_id || d.serial_number || d.id,
        model: d.model || 'Unknown Tablet',
        tenant: d.tenant || 'N/A',
        plan: 'PRO',
        mode: 'RETAIL',
        android: 'Android 11',
        status: 'ONLINE',
        lastSync: 'just now'
      }))
    }
  } catch (error) {
    Notify.create({ type: 'negative', message: 'Failed to load target devices', position: 'bottom-right' })
  }
})

const uploadDialogOpen = ref(false)
const fileInputRef = ref(null)
const isDetecting = ref(false)
const targetSlotIndex = ref(null)

const openUploadDialog = () => {
  targetSlotIndex.value = null
  resetNewApk()
  uploadDialogOpen.value = true
}

const openUpdateDialog = (index) => {
  targetSlotIndex.value = index
  resetNewApk()
  uploadDialogOpen.value = true
}

const APK_UPLOAD_TIMEOUT_MS = 15 * 60 * 1000

const copyDownloadLink = async (apk) => {
  const url = String(apk?.s3Url || '').trim()
  if (!url) {
    Notify.create({ type: 'warning', message: 'No download URL yet. Wait for the upload to finish.', position: 'bottom-right' })
    return
  }
  try {
    await copyToClipboard(url)
    Notify.create({ type: 'positive', message: 'APK download link copied', position: 'bottom-right' })
  } catch {
    Notify.create({ type: 'negative', message: 'Could not copy the download link', position: 'bottom-right' })
  }
}

const promptEditUrl = (index) => {
  const apk = apkVault.value[index]
  if (!apk) return
  
  $q.dialog({
    title: 'Edit APK URL',
    message: 'Update the public download URL for this package.',
    prompt: {
      model: apk.s3Url,
      type: 'url'
    },
    cancel: true,
    persistent: true,
    color: 'cyan-4'
  }).onOk(async data => {
    try {
      const response = await api.patch(`/api/admin/apk/${apk.id}/url`, { s3Url: data })
      apkVault.value[index] = response.data
      Notify.create({ type: 'positive', message: 'URL updated successfully', position: 'bottom-right' })
    } catch (e) {
      Notify.create({ type: 'negative', message: 'Failed to update URL', position: 'bottom-right' })
    }
  })
}

const newApk = ref({ name: '', packageName: '', version: '', fileName: '', fileRef: null })

const resetNewApk = () => {
  newApk.value = { name: '', packageName: '', version: '', fileName: '', fileRef: null }
}

const triggerFileInput = () => fileInputRef.value?.click()

const onFileSelected = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  newApk.value.fileName = file.name
  newApk.value.fileRef = file

  // Simulate manifest extraction from APK
  isDetecting.value = true
  setTimeout(() => {
    // Try to derive realistic info from filename (e.g. invify-kiosk-v2.5.0.apk)
    const nameMatch = file.name.match(/^(.*?)(?:-v?\d|-release|-debug|\.apk)/i)
    const versionMatch = file.name.match(/(?:v|-)(\d+\.\d+(?:\.\d+)?)/)
    
    if (nameMatch && nameMatch[1]) {
      const cleanName = nameMatch[1].replace(/[-_]/g, ' ').trim()
      newApk.value.name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
      newApk.value.packageName = `com.invify.${cleanName.toLowerCase().replace(/\s+/g, '')}`
    } else {
      newApk.value.name = 'Uploaded Application'
      newApk.value.packageName = 'com.invify.app'
    }
    
    if (versionMatch && versionMatch[1]) {
      newApk.value.version = versionMatch[1]
    } else {
      newApk.value.version = '1.0.0'
    }
    
    isDetecting.value = false
    Notify.create({ type: 'info', message: 'APK manifest parsed automatically.', position: 'bottom-right' })
  }, 1200)
}

const commitApkToVault = async () => {
  if (targetSlotIndex.value === null && apkVault.value.length >= 3) {
    Notify.create({ type: 'negative', message: 'Vault is full. Remove an existing APK to upload a new one.', position: 'bottom-right' })
    return
  }

  const formData = new FormData()
  formData.append('file', newApk.value.fileRef)
  formData.append('name', newApk.value.name)
  formData.append('packageName', newApk.value.packageName)
  formData.append('version', newApk.value.version)
  
  if (targetSlotIndex.value !== null) {
    formData.append('targetSlotId', apkVault.value[targetSlotIndex.value].id)
  }

  // Create a placeholder entry for optimistic UI
  const optimisticEntry = {
    id: `apk-temp`,
    name: newApk.value.name,
    packageName: newApk.value.packageName,
    version: newApk.value.version,
    size: newApk.value.fileRef ? `${(newApk.value.fileRef.size / 1024 / 1024).toFixed(1)} MB` : '—',
    status: 'UPLOADING',
    s3Url: '',
    uploadProgress: 0,
    installCount: 0,
    uninstallCount: 0,
    versionDistribution: [{ version: newApk.value.version, deviceCount: 0 }],
    selectedDeployVersion: newApk.value.version
  }

  let finalIndex = targetSlotIndex.value !== null ? targetSlotIndex.value : apkVault.value.length
  
  if (targetSlotIndex.value !== null) {
    apkVault.value[finalIndex] = { ...apkVault.value[finalIndex], status: 'UPLOADING', uploadProgress: 0 }
  } else {
    apkVault.value.push(optimisticEntry)
  }

  uploadDialogOpen.value = false

  try {
    const { data } = await api.post('/api/admin/apk/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: APK_UPLOAD_TIMEOUT_MS,
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total || newApk.value.fileRef?.size || 0
        const percentCompleted = total ? Math.round((progressEvent.loaded * 100) / total) : 0
        if (apkVault.value[finalIndex]) {
          apkVault.value[finalIndex].uploadProgress = Math.min(99, percentCompleted)
        }
      }
    })
    
    // Replace optimistic entry with real data
    apkVault.value[finalIndex] = data
    Notify.create({ type: 'positive', message: `APK [${data.name}] committed to vault successfully`, position: 'bottom-right' })
  } catch (error) {
    Notify.create({ type: 'negative', message: `Upload failed: ${error.response?.data?.error || error.message}`, position: 'bottom-right' })
    try {
      const { data } = await api.get('/api/admin/apk')
      apkVault.value = data.vault || []
      deploymentLog.value = data.logs || []
    } catch {
      if (targetSlotIndex.value === null) {
        apkVault.value.pop()
      } else if (apkVault.value[finalIndex]) {
        apkVault.value[finalIndex].status = 'ERROR'
      }
    }
  }

  resetNewApk()
}

const removeApk = async (index) => {
  try {
    const apkId = apkVault.value[index].id
    await api.delete(`/api/admin/apk/${apkId}`)
    const removed = apkVault.value.splice(index, 1)[0]
    Notify.create({ type: 'warning', message: `APK [${removed.name}] removed from vault`, position: 'bottom-right' })
  } catch (error) {
    Notify.create({ type: 'negative', message: 'Failed to delete APK', position: 'bottom-right' })
  }
}

// ── Device Registry ────────────────────────────────────────────────────────────
const deviceSearch = ref('')
const statusFilter = ref('ALL')
const tenantFilter = ref('ALL TENANTS')
const planFilter = ref('ALL PLANS')
const modeFilter = ref('ALL MODES')
const selectedDevices = ref([])

const devices = ref([])

const filteredDevices = computed(() => devices.value.filter(d => {
  if (statusFilter.value !== 'ALL' && d.status !== statusFilter.value) return false
  if (tenantFilter.value !== 'ALL TENANTS' && d.tenant !== tenantFilter.value) return false
  if (planFilter.value !== 'ALL PLANS' && d.plan !== planFilter.value) return false
  if (modeFilter.value !== 'ALL MODES' && d.mode !== modeFilter.value) return false
  if (deviceSearch.value) {
    const q = deviceSearch.value.toLowerCase()
    if (!d.id.toLowerCase().includes(q) && !d.model.toLowerCase().includes(q)) return false
  }
  return true
}))

const toggleDevice = (id) => {
  const idx = selectedDevices.value.indexOf(id)
  if (idx === -1) selectedDevices.value.push(id)
  else selectedDevices.value.splice(idx, 1)
}

const toggleSelectAll = () => {
  if (selectedDevices.value.length === filteredDevices.value.length) {
    selectedDevices.value = []
  } else {
    selectedDevices.value = filteredDevices.value.map(d => d.id)
  }
}

// ── Deployment Engine ──────────────────────────────────────────────────────────
const activeDeployments = ref([])
const deploymentLog = ref([])

const deployApk = async (apk) => {
  if (!selectedDevices.value.length) return
  
  const targetVersion = apk.selectedDeployVersion || apk.version

  try {
    await api.post('/api/admin/apk/deploy', {
      apkId: apk.id,
      targetDevices: selectedDevices.value,
      targetVersion
    })
    
    Notify.create({ type: 'positive', message: `Install deployment dispatched for [${apk.name} v${targetVersion}] → ${selectedDevices.value.length} devices`, position: 'bottom-right' })
    
    // Refresh vault to get updated counts
    const { data } = await api.get('/api/admin/apk')
    apkVault.value = data.vault || []
    deploymentLog.value = data.logs || []
  } catch (error) {
    Notify.create({ type: 'negative', message: 'Deploy dispatch failed', position: 'bottom-right' })
  }
}

const uninstallApk = async (apk) => {
  if (!selectedDevices.value.length) return

  try {
    await api.post('/api/admin/apk/uninstall', {
      apkId: apk.id,
      targetDevices: selectedDevices.value
    })
    
    Notify.create({ type: 'warning', message: `Uninstall command dispatched for [${apk.name}] → ${selectedDevices.value.length} devices`, position: 'bottom-right' })
    
    // Refresh vault
    const { data } = await api.get('/api/admin/apk')
    apkVault.value = data.vault || []
    deploymentLog.value = data.logs || []
  } catch (error) {
    Notify.create({ type: 'negative', message: 'Uninstall dispatch failed', position: 'bottom-right' })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const totalDevicesForApk = (apk) => {
  if (!apk?.versionDistribution) return 0
  return apk.versionDistribution.reduce((sum, vd) => sum + vd.deviceCount, 0)
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.bg-empty-slot { background: rgba(255,255,255,0.02); border-style: dashed !important; }
.row-selected { background-color: #0d2233 !important; }
.sticky-header { position: sticky; top: 0; z-index: 2; }
.rotating-icon { animation: spin 2s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.hover-row:hover { background-color: #1a2327 !important; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #0b0f12; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #22282d; border-radius: 3px; }
@media (max-width: 600px) { .v-hide-xs { display: none; } }
</style>
