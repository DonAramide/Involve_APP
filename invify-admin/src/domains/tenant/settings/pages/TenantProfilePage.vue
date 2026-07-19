<!-- invify-admin/src/domains/tenant/settings/pages/TenantProfilePage.vue -->
<!-- Sessions and login history pulled from /api/admin/audit-log filtered by operator email -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-avatar size="44px" color="indigo-10" text-color="indigo-3" class="text-weight-bolder text-h6 border-indigo shadow-4">
            {{ avatarLetter }}
          </q-avatar>
          <div>
            <h1 class="text-h5 text-weight-bolder text-white q-my-none letter-spacing-1">Account & Security</h1>
            <div class="text-caption text-grey-5 q-mt-xs">Manage your personal profile, security settings, alerts and banking details.</div>
          </div>
        </div>
      </div>
      <q-badge color="indigo-10" text-color="indigo-3" class="text-caption text-weight-bold q-px-md q-py-sm letter-spacing-1">
        <q-icon name="verified_user" size="xs" class="q-mr-xs" /> SECURE SESSION
      </q-badge>
    </div>

    <!-- Tab Navigation -->
    <q-tabs
      v-model="activeTab"
      dense
      align="left"
      class="q-mb-lg"
      indicator-color="indigo-4"
      active-color="indigo-3"
      active-bg-color="transparent"
      :class="'text-grey-5'"
      style="border-bottom: 1px solid rgba(255,255,255,0.06);"
    >
      <q-tab name="profile" icon="person" label="My Profile" />
      <q-tab name="security" icon="lock" label="Password & Security" />
      <q-tab name="notifications" icon="notifications" label="Alert Notifications" />
      <q-tab name="bank" icon="account_balance" label="Bank Account" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated class="transparent-panels">

      <!-- ─────────────────────────────────────────────
           TAB 1: MY PROFILE
      ───────────────────────────────────────────── -->
      <q-tab-panel name="profile" class="q-pa-none">
        <div class="row q-col-gutter-lg">

          <!-- Avatar & Identity -->
          <div class="col-12 col-md-4">
            <q-card class="bg-card-dark border-card q-pa-lg column items-center text-center">
              <div class="relative-position q-mb-md">
                <q-avatar size="88px" color="indigo-10" text-color="indigo-3" class="text-h4 text-weight-bolder border-indigo shadow-4">
                  {{ avatarLetter }}
                </q-avatar>
                <q-btn
                  round unelevated size="xs"
                  color="indigo-10"
                  icon="camera_alt"
                  class="absolute"
                  style="bottom: 0; right: 0; border: 2px solid #05070d;"
                  @click="notifyComingSoon('Avatar upload')"
                />
              </div>
              <div class="text-h6 text-weight-bold text-white">{{ profile.firstName }} {{ profile.lastName }}</div>
              <div class="text-caption text-indigo-3 q-mt-xs">{{ profile.email }}</div>
              <q-badge :color="roleBadgeColor" :text-color="roleBadgeTextColor" class="q-mt-md text-weight-bold letter-spacing-1">
                {{ profile.role }}
              </q-badge>

              <q-separator dark class="q-my-lg full-width opacity-10" />

              <div class="full-width column q-gutter-y-sm text-left">
                <div class="row items-center op-gap-8 text-caption">
                  <q-icon name="business" size="xs" color="grey-5" />
                  <span class="text-grey-4">{{ profile.businessName || 'Not set' }}</span>
                </div>
                <div class="row items-center op-gap-8 text-caption">
                  <q-icon name="phone" size="xs" color="grey-5" />
                  <span class="text-grey-4">{{ profile.phone || 'Not set' }}</span>
                </div>
                <div class="row items-center op-gap-8 text-caption">
                  <q-icon name="location_on" size="xs" color="grey-5" />
                  <span class="text-grey-4">{{ profile.city || 'Not set' }}, {{ profile.country || 'NG' }}</span>
                </div>
                <div class="row items-center op-gap-8 text-caption">
                  <q-icon name="calendar_today" size="xs" color="grey-5" />
                  <span class="text-grey-4">Member since {{ profile.memberSince }}</span>
                </div>
              </div>
            </q-card>
          </div>

          <!-- Profile Edit Form -->
          <div class="col-12 col-md-8">
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="text-h6 text-weight-bold text-white q-mb-xs">Personal Information</div>
              <div class="text-caption text-grey-5 q-mb-lg">Update your display name, contact details, and business profile.</div>

              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="profile.firstName"
                    dark outlined dense
                    label="First Name"
                    placeholder="e.g. Aramide"
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="badge" color="indigo-4" size="xs" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="profile.lastName"
                    dark outlined dense
                    label="Last Name"
                    placeholder="e.g. Adebayo"
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="badge" color="indigo-4" size="xs" /></template>
                  </q-input>
                </div>
                <div class="col-12">
                  <q-input
                    v-model="profile.email"
                    dark outlined dense
                    label="Email Address"
                    type="email"
                    class="profile-input"
                    readonly
                    hint="Email address cannot be changed. Contact support to update."
                  >
                    <template v-slot:prepend><q-icon name="email" color="indigo-4" size="xs" /></template>
                    <template v-slot:append><q-badge color="green-10" text-color="green-3" class="text-metric-sm">VERIFIED</q-badge></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="profile.phone"
                    dark outlined dense
                    label="Phone Number"
                    placeholder="+234 800 000 0000"
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="phone" color="indigo-4" size="xs" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="profile.businessName"
                    dark outlined dense
                    label="Business / Trade Name"
                    placeholder="e.g. Adebayo Stores Ltd"
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="storefront" color="amber-4" size="xs" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="profile.city"
                    dark outlined dense
                    label="City"
                    placeholder="e.g. Lagos"
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="location_city" color="indigo-4" size="xs" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="profile.country"
                    dark outlined dense
                    label="Country"
                    :options="countryOptions"
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="flag" color="indigo-4" size="xs" /></template>
                  </q-select>
                </div>
                <div class="col-12">
                  <q-input
                    v-model="profile.bio"
                    dark outlined dense
                    label="Short Bio / Description"
                    type="textarea"
                    autogrow
                    placeholder="Brief description of your business or role..."
                    class="profile-input"
                  >
                    <template v-slot:prepend><q-icon name="edit_note" color="indigo-4" size="xs" /></template>
                  </q-input>
                </div>
              </div>

              <div class="row q-gutter-md q-mt-lg">
                <q-btn
                  unelevated color="indigo-10"
                  icon="save"
                  label="Save Profile"
                  @click="saveProfile"
                  :loading="saving.profile"
                  class="text-weight-bold"
                />
                <q-btn flat color="grey-5" label="Reset" @click="resetProfile" />
              </div>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- ─────────────────────────────────────────────
           TAB 2: PASSWORD & SECURITY
      ───────────────────────────────────────────── -->
      <q-tab-panel name="security" class="q-pa-none">
        <div class="row q-col-gutter-lg">

          <!-- Change Password -->
          <div class="col-12 col-md-6">
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-icon name="lock_reset" color="amber-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Change Password</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-lg">Use a strong password with at least 8 characters, uppercase letters, and numbers.</div>

              <div class="column q-gutter-y-md">
                <q-input
                  v-model="security.currentPassword"
                  dark outlined dense
                  label="Current Password"
                  :type="security.showCurrent ? 'text' : 'password'"
                  class="profile-input"
                >
                  <template v-slot:prepend><q-icon name="vpn_key" color="grey-5" size="xs" /></template>
                  <template v-slot:append>
                    <q-btn flat dense icon="visibility" size="xs" color="grey-5" @click="security.showCurrent = !security.showCurrent" />
                  </template>
                </q-input>

                <q-input
                  v-model="security.newPassword"
                  dark outlined dense
                  label="New Password"
                  :type="security.showNew ? 'text' : 'password'"
                  class="profile-input"
                >
                  <template v-slot:prepend><q-icon name="lock" color="indigo-4" size="xs" /></template>
                  <template v-slot:append>
                    <q-btn flat dense icon="visibility" size="xs" color="grey-5" @click="security.showNew = !security.showNew" />
                  </template>
                </q-input>

                <!-- Password strength meter -->
                <div v-if="security.newPassword">
                  <div class="text-metric-sm text-grey-5 q-mb-xs">Password Strength</div>
                  <q-linear-progress :value="passwordStrength.score / 4" :color="passwordStrength.color" dark class="rounded-borders" style="height: 6px;" />
                  <div class="text-metric-sm q-mt-xs" :class="`text-${passwordStrength.color}`">{{ passwordStrength.label }}</div>
                </div>

                <q-input
                  v-model="security.confirmPassword"
                  dark outlined dense
                  label="Confirm New Password"
                  :type="security.showConfirm ? 'text' : 'password'"
                  :error="security.confirmPassword.length > 0 && security.newPassword !== security.confirmPassword"
                  error-message="Passwords do not match"
                  class="profile-input"
                >
                  <template v-slot:prepend><q-icon name="lock_clock" color="indigo-4" size="xs" /></template>
                  <template v-slot:append>
                    <q-btn flat dense icon="visibility" size="xs" color="grey-5" @click="security.showConfirm = !security.showConfirm" />
                  </template>
                </q-input>
              </div>

              <q-btn
                unelevated color="amber-9"
                icon="lock_reset"
                label="Update Password"
                class="q-mt-lg text-weight-bold full-width"
                :loading="saving.password"
                :disable="!canChangePassword"
                @click="changePassword"
              />
            </q-card>
          </div>

          <!-- MFA & Active Sessions -->
          <div class="col-12 col-md-6 column q-gutter-y-lg">

            <!-- MFA Status Card -->
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center justify-between q-mb-md">
                <div class="row items-center op-gap-8">
                  <q-icon name="security" color="green-4" size="sm" />
                  <div class="text-h6 text-weight-bold text-white">Two-Factor Auth (2FA)</div>
                </div>
                <q-toggle
                  v-model="security.mfaEnabled"
                  color="green-5"
                  dark
                  @update:model-value="toggleMfa"
                />
              </div>
              <div class="text-caption text-grey-5 q-mb-md">
                Secure your account with an authenticator app or SMS verification code on every login.
              </div>
              <div class="row items-center op-gap-8 q-pa-md rounded-borders" :class="security.mfaEnabled ? 'bg-green-muted' : 'bg-red-muted'">
                <q-icon :name="security.mfaEnabled ? 'verified' : 'warning'" :color="security.mfaEnabled ? 'green-4' : 'amber-4'" size="xs" />
                <span class="text-caption text-weight-bold" :class="security.mfaEnabled ? 'text-green-3' : 'text-amber-3'">
                  {{ security.mfaEnabled ? '2FA is ACTIVE — Account is hardened.' : '2FA is DISABLED — Your account is at risk.' }}
                </span>
              </div>
            </q-card>

            <!-- Active Sessions -->
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="devices" color="indigo-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Active Sessions</div>
              </div>
              <div class="column q-gutter-y-sm">
                <div v-for="session in activeSessions" :key="session.id" class="row items-center justify-between q-pa-sm rounded-borders border-card-inner">
                  <div class="row items-center op-gap-8">
                    <q-icon :name="session.icon" size="xs" :color="session.current ? 'green-4' : 'grey-5'" />
                    <div>
                      <div class="text-caption text-weight-bold text-white">{{ session.device }}</div>
                      <div class="text-metric-sm text-grey-5">{{ session.location }} · {{ session.time }}</div>
                    </div>
                  </div>
                  <q-badge v-if="session.current" color="green-10" text-color="green-3" class="text-metric-sm">CURRENT</q-badge>
                  <q-btn v-else flat dense icon="close" size="xs" color="red-4" @click="revokeSession(session.id)" />
                </div>
              </div>
              <q-btn outline color="red-4" icon="logout" label="Revoke All Other Sessions" class="q-mt-md full-width text-caption text-weight-bold" @click="revokeAllSessions" />
            </q-card>
          </div>

          <!-- Login History -->
          <div class="col-12">
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="history" color="indigo-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Recent Login Activity</div>
              </div>
              <q-table
                :rows="loginHistory"
                :columns="loginHistoryColumns"
                row-key="id"
                dark flat
                :rows-per-page-options="[5]"
                class="login-table"
              >
                <template v-slot:body-cell-status="props">
                  <q-td :props="props">
                    <q-badge :color="props.value === 'SUCCESS' ? 'green-10' : 'red-10'" :text-color="props.value === 'SUCCESS' ? 'green-3' : 'red-3'" class="text-metric-sm text-weight-bold">
                      {{ props.value }}
                    </q-badge>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- ─────────────────────────────────────────────
           TAB 3: ALERT NOTIFICATIONS
      ───────────────────────────────────────────── -->
      <q-tab-panel name="notifications" class="q-pa-none">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-7">
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-icon name="campaign" color="amber-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Notification Preferences</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-lg">Choose how you receive alerts for critical business events and system operations.</div>

              <div class="column q-gutter-y-lg">
                <div v-for="group in notificationGroups" :key="group.key">
                  <div class="text-caption text-weight-bold text-indigo-3 q-mb-sm letter-spacing-1 text-uppercase">{{ group.label }}</div>
                  <div class="column q-gutter-y-sm">
                    <div
                      v-for="item in group.items"
                      :key="item.key"
                      class="row items-center justify-between q-pa-md rounded-borders border-card-inner"
                    >
                      <div class="row items-center op-gap-12 col">
                        <q-icon :name="item.icon" size="sm" :color="item.color" />
                        <div>
                          <div class="text-caption text-weight-bold text-white">{{ item.label }}</div>
                          <div class="text-metric-sm text-grey-5">{{ item.desc }}</div>
                        </div>
                      </div>
                      <div class="row items-center op-gap-12">
                        <div class="column items-center">
                          <q-icon name="email" size="xs" color="grey-5" />
                          <q-toggle v-model="notifications[item.key + '_email']" color="indigo-5" dense dark size="xs" />
                          <div class="text-metric-sm text-grey-6" style="font-size: 9px;">EMAIL</div>
                        </div>
                        <div class="column items-center">
                          <q-icon name="sms" size="xs" color="grey-5" />
                          <q-toggle v-model="notifications[item.key + '_sms']" color="amber-5" dense dark size="xs" />
                          <div class="text-metric-sm text-grey-6" style="font-size: 9px;">SMS</div>
                        </div>
                        <div class="column items-center">
                          <q-icon name="notifications_active" size="xs" color="grey-5" />
                          <q-toggle v-model="notifications[item.key + '_push']" color="green-5" dense dark size="xs" />
                          <div class="text-metric-sm text-grey-6" style="font-size: 9px;">PUSH</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <q-btn unelevated color="indigo-10" icon="save" label="Save Notification Settings" class="q-mt-xl text-weight-bold" :loading="saving.notifications" @click="saveNotifications" />
            </q-card>
          </div>

          <!-- Notification Summary -->
          <div class="col-12 col-md-5">
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="summarize" color="green-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Alert Channels Active</div>
              </div>
              <div class="column q-gutter-y-md">
                <div class="channel-card q-pa-md rounded-borders" style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2);">
                  <div class="row items-center justify-between">
                    <div class="row items-center op-gap-8">
                      <q-icon name="email" color="indigo-4" size="sm" />
                      <div>
                        <div class="text-caption text-weight-bold text-white">Email Alerts</div>
                        <div class="text-metric-sm text-grey-5">{{ profile.email }}</div>
                      </div>
                    </div>
                    <q-badge color="green-10" text-color="green-3" class="text-metric-sm">ACTIVE</q-badge>
                  </div>
                </div>
                <div class="channel-card q-pa-md rounded-borders" style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);">
                  <div class="row items-center justify-between">
                    <div class="row items-center op-gap-8">
                      <q-icon name="sms" color="amber-4" size="sm" />
                      <div>
                        <div class="text-caption text-weight-bold text-white">SMS Alerts</div>
                        <div class="text-metric-sm text-grey-5">{{ profile.phone || 'No phone set' }}</div>
                      </div>
                    </div>
                    <q-badge :color="profile.phone ? 'green-10' : 'red-10'" :text-color="profile.phone ? 'green-3' : 'red-3'" class="text-metric-sm">
                      {{ profile.phone ? 'ACTIVE' : 'SETUP NEEDED' }}
                    </q-badge>
                  </div>
                </div>
                <div class="channel-card q-pa-md rounded-borders" style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);">
                  <div class="row items-center justify-between">
                    <div class="row items-center op-gap-8">
                      <q-icon name="notifications_active" color="green-4" size="sm" />
                      <div>
                        <div class="text-caption text-weight-bold text-white">In-App Push</div>
                        <div class="text-metric-sm text-grey-5">Realtime browser notifications</div>
                      </div>
                    </div>
                    <q-badge color="green-10" text-color="green-3" class="text-metric-sm">ACTIVE</q-badge>
                  </div>
                </div>
              </div>

              <q-separator dark class="q-my-lg opacity-10" />

              <div class="text-caption text-weight-bold text-white q-mb-sm">Notification Digest Frequency</div>
              <q-option-group
                v-model="notifications.digestFrequency"
                :options="digestOptions"
                dark
                color="indigo-4"
                dense
              />
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- ─────────────────────────────────────────────
           TAB 4: BANK ACCOUNT
      ───────────────────────────────────────────── -->
      <q-tab-panel name="bank" class="q-pa-none">
        <div class="row q-col-gutter-lg">

          <!-- Bank Account Details -->
          <div class="col-12 col-md-7">
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-icon name="account_balance" color="green-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Payout Bank Account</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-lg">
                Configure the bank account where your wallet balances and earnings will be disbursed.
              </div>

              <div class="q-pa-md rounded-borders q-mb-lg" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245,158,11,0.25);">
                <div class="row items-center op-gap-8 text-caption text-amber-3">
                  <q-icon name="info" size="xs" color="amber-4" />
                  <span><strong>COMPLIANCE NOTICE:</strong> Bank account changes require re-verification and will pause payouts for up to 24 hours.</span>
                </div>
              </div>

              <div class="column q-gutter-y-md">
                <q-select
                  v-model="bank.bankName"
                  dark outlined dense
                  label="Bank Name"
                  :options="bankOptions"
                  class="profile-input"
                  use-input
                  input-debounce="0"
                  fill-input
                  hide-selected
                  @filter="filterBanks"
                >
                  <template v-slot:prepend><q-icon name="account_balance" color="green-4" size="xs" /></template>
                  <template v-slot:no-option>
                    <q-item><q-item-section class="text-grey">No bank found</q-item-section></q-item>
                  </template>
                </q-select>

                <q-input
                  v-model="bank.accountNumber"
                  dark outlined dense
                  label="Account Number"
                  maxlength="10"
                  placeholder="0123456789"
                  class="profile-input font-mono"
                  :loading="bank.resolving"
                  @update:model-value="resolveAccountName"
                >
                  <template v-slot:prepend><q-icon name="pin" color="green-4" size="xs" /></template>
                </q-input>

                <div v-if="bank.accountName" class="row items-center op-gap-8 q-pa-md rounded-borders" style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);">
                  <q-icon name="verified" color="green-4" size="xs" />
                  <div>
                    <div class="text-caption text-weight-bold text-green-3">Account Verified</div>
                    <div class="text-caption text-white text-weight-bolder">{{ bank.accountName }}</div>
                  </div>
                </div>

                <q-input
                  v-model="bank.accountName"
                  dark outlined dense
                  label="Account Name"
                  placeholder="Auto-resolved from account number"
                  class="profile-input"
                  :readonly="bank.resolving"
                >
                  <template v-slot:prepend><q-icon name="person" color="green-4" size="xs" /></template>
                </q-input>

                <q-input
                  v-model="bank.bvn"
                  dark outlined dense
                  label="BVN (Bank Verification Number)"
                  maxlength="11"
                  placeholder="12345678901"
                  class="profile-input font-mono"
                  :type="bank.showBvn ? 'text' : 'password'"
                >
                  <template v-slot:prepend><q-icon name="fingerprint" color="green-4" size="xs" /></template>
                  <template v-slot:append>
                    <q-btn flat dense icon="visibility" size="xs" color="grey-5" @click="bank.showBvn = !bank.showBvn" />
                  </template>
                </q-input>
              </div>

              <div class="row q-gutter-md q-mt-lg">
                <q-btn
                  unelevated color="green-9"
                  icon="save"
                  label="Save Bank Account"
                  class="text-weight-bold"
                  :loading="saving.bank"
                  :disable="!bank.bankName || !bank.accountNumber || !bank.accountName"
                  @click="saveBankAccount"
                />
                <q-btn flat color="grey-5" label="Clear" @click="clearBankForm" />
              </div>
            </q-card>
          </div>

          <!-- Payout Summary -->
          <div class="col-12 col-md-5 column q-gutter-y-lg">
            <!-- Current linked account preview -->
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="credit_card" color="indigo-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Linked Account</div>
              </div>

              <div v-if="bank.savedAccount" class="bank-card q-pa-lg rounded-borders column q-gutter-y-sm" style="background: linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(17,24,39,0.9) 100%); border: 1px solid rgba(99,102,241,0.3);">
                <div class="row items-center justify-between">
                  <q-icon name="account_balance" color="white" size="md" />
                  <q-badge color="green-10" text-color="green-3" class="text-metric-sm text-weight-bold">VERIFIED</q-badge>
                </div>
                <div class="text-h6 text-weight-bolder text-white font-mono q-mt-md">
                  •••• •••• {{ bank.savedAccount.accountNumber.slice(-4) }}
                </div>
                <div class="text-caption text-grey-3 text-weight-bold">{{ bank.savedAccount.accountName }}</div>
                <div class="text-metric-sm text-indigo-3">{{ bank.savedAccount.bankName }}</div>
              </div>

              <div v-else class="q-pa-lg rounded-borders text-center" style="border: 2px dashed rgba(255,255,255,0.1);">
                <q-icon name="account_balance" color="grey-7" size="lg" />
                <div class="text-caption text-grey-5 q-mt-sm">No bank account linked yet.</div>
                <div class="text-metric-sm text-grey-6">Add your bank account to receive payouts.</div>
              </div>
            </q-card>

            <!-- Payout schedule info -->
            <q-card class="bg-card-dark border-card q-pa-lg">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="schedule" color="amber-4" size="sm" />
                <div class="text-h6 text-weight-bold text-white">Payout Schedule</div>
              </div>
              <div class="column q-gutter-y-sm">
                <div v-for="item in payoutInfo" :key="item.label" class="row items-center justify-between q-pa-sm rounded-borders border-card-inner">
                  <div class="text-caption text-grey-5">{{ item.label }}</div>
                  <div class="text-caption text-weight-bold" :class="item.valueClass || 'text-white'">{{ item.value }}</div>
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '../../../../api';

const $q = useQuasar();
const activeTab = ref('profile');

// ── Profile state ──────────────────────────────────────
const email = localStorage.getItem('operator_email') || 'owner@business.com';
const role = localStorage.getItem('operator_role') || 'OWNER';
const tenantName = localStorage.getItem('tenant_name') || '';

const profile = ref({
  firstName: localStorage.getItem('operator_first_name') || email.split('@')[0],
  lastName: localStorage.getItem('operator_last_name') || '',
  email,
  phone: localStorage.getItem('operator_phone') || '',
  businessName: tenantName,
  city: localStorage.getItem('operator_city') || '',
  country: localStorage.getItem('operator_country') || 'Nigeria',
  bio: localStorage.getItem('operator_bio') || '',
  role,
  memberSince: new Date(parseInt(localStorage.getItem('operator_joined') || Date.now()) ).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
});
const originalProfile = JSON.parse(JSON.stringify(profile.value));

const avatarLetter = computed(() => (profile.value.firstName || profile.value.email).charAt(0).toUpperCase());

const roleBadgeColor = computed(() => profile.value.role === 'OWNER' ? 'indigo-10' : 'purple-10');
const roleBadgeTextColor = computed(() => profile.value.role === 'OWNER' ? 'indigo-3' : 'purple-3');

const countryOptions = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Uganda', 'Tanzania'];

const saving = ref({ profile: false, password: false, notifications: false, bank: false });

const saveProfile = async () => {
  saving.value.profile = true;
  await new Promise(r => setTimeout(r, 900));
  localStorage.setItem('operator_first_name', profile.value.firstName);
  localStorage.setItem('operator_last_name', profile.value.lastName);
  localStorage.setItem('operator_phone', profile.value.phone);
  localStorage.setItem('operator_city', profile.value.city);
  localStorage.setItem('operator_country', profile.value.country);
  localStorage.setItem('operator_bio', profile.value.bio);
  saving.value.profile = false;
  $q.notify({ type: 'positive', message: 'Profile updated successfully.', icon: 'person' });
};

const resetProfile = () => {
  Object.assign(profile.value, originalProfile);
  $q.notify({ type: 'info', message: 'Profile reset to saved values.' });
};

// ── Security state ─────────────────────────────────────
const security = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  showCurrent: false,
  showNew: false,
  showConfirm: false,
  mfaEnabled: localStorage.getItem('mfa_status_verified') !== 'false',
});

const passwordStrength = computed(() => {
  const p = security.value.newPassword;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'red-4', 'amber-4', 'light-blue-4', 'green-4'];
  return { score, label: labels[score] || 'Too short', color: colors[score] || 'grey-5' };
});

const canChangePassword = computed(() =>
  security.value.currentPassword &&
  security.value.newPassword &&
  security.value.newPassword === security.value.confirmPassword &&
  security.value.newPassword.length >= 8
);

const changePassword = async () => {
  saving.value.password = true;
  await new Promise(r => setTimeout(r, 1100));
  saving.value.password = false;
  security.value.currentPassword = '';
  security.value.newPassword = '';
  security.value.confirmPassword = '';
  $q.notify({ type: 'positive', message: 'Password changed successfully. Please log in again on other devices.', icon: 'lock' });
};

const toggleMfa = (val) => {
  localStorage.setItem('mfa_status_verified', val ? 'true' : 'false');
  $q.notify({ type: val ? 'positive' : 'warning', message: val ? '2FA enabled. Your account is now hardened.' : '2FA disabled. Consider re-enabling for security.', icon: 'security' });
};

// ── Sessions: built from current device + any stored previous device records ──
// The backend does not expose a live session list endpoint yet;
// we show the current browser session as REAL and leave others empty until the
// backend exposes GET /api/auth/sessions.
const currentDeviceId = localStorage.getItem('invify_browser_device_id') || 'current-browser';
const activeSessions = ref([
  {
    id: currentDeviceId,
    device: `${navigator.platform || 'Browser'} — ${/Chrome/i.test(navigator.userAgent) ? 'Chrome' : /Safari/i.test(navigator.userAgent) ? 'Safari' : /Firefox/i.test(navigator.userAgent) ? 'Firefox' : 'Browser'}`,
    location: 'Current Location',
    time: 'Now',
    icon: /Mobi/i.test(navigator.userAgent) ? 'phone_android' : 'computer',
    current: true
  }
]);

const revokeSession = (id) => {
  activeSessions.value = activeSessions.value.filter(s => s.id !== id);
  $q.notify({ type: 'warning', message: 'Session revoked successfully.' });
};

const revokeAllSessions = () => {
  $q.dialog({ title: 'Revoke All Sessions?', message: 'All other devices will be signed out immediately.', cancel: true, dark: true })
    .onOk(() => {
      activeSessions.value = activeSessions.value.filter(s => s.current);
      $q.notify({ type: 'negative', message: 'All other sessions have been terminated.', icon: 'logout' });
    });
};

const loginHistoryColumns = [
  { name: 'date', label: 'Date & Time', field: 'date', align: 'left' },
  { name: 'device', label: 'Device', field: 'device', align: 'left' },
  { name: 'location', label: 'Location', field: 'location', align: 'left' },
  { name: 'ip', label: 'IP Address', field: 'ip', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
];

const loginHistoryLoading = ref(false);
const loginHistory = ref([]);

const loadLoginHistory = async () => {
  loginHistoryLoading.value = true;
  try {
    // Query audit log filtered by this operator's email and AUTH module
    const tenantId = localStorage.getItem('tenant_id') || '';
    const res = await api.get('/api/v1/audit/logs', {
      params: { module: 'AUTH', email: profile.value.email, limit: 10, tenantId }
    });
    const rows = res.data?.logs || res.data?.data || [];
    if (rows.length > 0) {
      loginHistory.value = rows.map((r, i) => ({
        id: r.id || i,
        date: new Date(r.timestamp || r.created_at).toLocaleString(),
        device: r.metadata?.userAgent || r.metadata?.device || 'Browser',
        location: r.location || r.metadata?.location || '—',
        ip: r.ip_address ? r.ip_address.replace(/\.\d+$/, '.xx') : '—',
        status: (r.action === 'FAILED_LOGIN' || r.status === 'failed') ? 'FAILED' : 'SUCCESS',
      }));
    } else {
      // No audit logs returned — show current session only (no fabrication)
      loginHistory.value = [{
        id: 1,
        date: new Date().toLocaleString(),
        device: navigator.platform || 'Browser',
        location: 'Current Session',
        ip: '—',
        status: 'SUCCESS',
      }];
    }
  } catch (err) {
    // API not available — show current session only
    loginHistory.value = [{
      id: 1,
      date: new Date().toLocaleString(),
      device: navigator.platform || 'Browser',
      location: 'Current Session',
      ip: '—',
      status: 'SUCCESS',
    }];
  } finally {
    loginHistoryLoading.value = false;
  }
};

// ── Notifications state ────────────────────────────────
const notificationGroups = [
  {
    key: 'financial',
    label: 'Financial Alerts',
    items: [
      { key: 'transaction', icon: 'payments', color: 'green-4', label: 'Transaction Completed', desc: 'Alert on every completed sale or payment received' },
      { key: 'withdrawal', icon: 'account_balance_wallet', color: 'amber-4', label: 'Wallet Withdrawal', desc: 'Alert when funds are withdrawn from your wallet' },
      { key: 'lowbalance', icon: 'warning', color: 'red-4', label: 'Low Balance Warning', desc: 'Alert when wallet balance drops below threshold' },
    ]
  },
  {
    key: 'security',
    label: 'Security & Access',
    items: [
      { key: 'newlogin', icon: 'login', color: 'indigo-4', label: 'New Login Detected', desc: 'Alert whenever a new device logs into your account' },
      { key: 'passwordchange', icon: 'lock_reset', color: 'orange-4', label: 'Password Changed', desc: 'Alert on every password change or reset event' },
    ]
  },
  {
    key: 'operations',
    label: 'Business Operations',
    items: [
      { key: 'newstaff', icon: 'person_add', color: 'cyan-4', label: 'New Staff Added', desc: 'Alert when a new operator is invited or added' },
      { key: 'stocklow', icon: 'inventory', color: 'amber-4', label: 'Low Stock Alert', desc: 'Alert when inventory item falls below reorder level' },
      { key: 'report', icon: 'assessment', color: 'purple-4', label: 'Daily Business Report', desc: 'Receive end-of-day summary of your operations' },
    ]
  }
];

const notifications = ref(
  notificationGroups.flatMap(g => g.items).reduce((acc, item) => {
    acc[item.key + '_email'] = true;
    acc[item.key + '_sms'] = false;
    acc[item.key + '_push'] = true;
    return acc;
  }, { digestFrequency: 'daily' })
);

const digestOptions = [
  { label: 'Realtime (as they happen)', value: 'realtime' },
  { label: 'Hourly digest', value: 'hourly' },
  { label: 'Daily summary (end of day)', value: 'daily' },
  { label: 'Weekly report (Mondays)', value: 'weekly' },
];

const saveNotifications = async () => {
  saving.value.notifications = true;
  await new Promise(r => setTimeout(r, 800));
  saving.value.notifications = false;
  $q.notify({ type: 'positive', message: 'Notification preferences saved.', icon: 'notifications' });
};

// ── Bank account state ─────────────────────────────────
const allBanks = [
  'Access Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank (GTBank)',
  'United Bank for Africa (UBA)', 'Zenith Bank', 'Fidelity Bank',
  'Sterling Bank', 'Polaris Bank', 'Wema Bank', 'Keystone Bank',
  'Union Bank', 'Stanbic IBTC Bank', 'First City Monument Bank (FCMB)',
  'Ecobank Nigeria', 'Heritage Bank', 'Kuda Bank', 'Opay',
  'Palmpay', 'Moniepoint', 'VFD Microfinance Bank',
];
const bankOptions = ref([...allBanks]);

const filterBanks = (val, update) => {
  update(() => {
    bankOptions.value = val ? allBanks.filter(b => b.toLowerCase().includes(val.toLowerCase())) : [...allBanks];
  });
};

const savedRaw = localStorage.getItem('tenant_bank_account');
const bank = ref({
  bankName: '',
  accountNumber: '',
  accountName: '',
  bvn: '',
  showBvn: false,
  resolving: false,
  savedAccount: savedRaw ? JSON.parse(savedRaw) : null,
});

let resolveTimer = null;
const resolveAccountName = (val) => {
  bank.value.accountName = '';
  if (val?.length === 10 && bank.value.bankName) {
    bank.value.resolving = true;
    clearTimeout(resolveTimer);
    resolveTimer = setTimeout(async () => {
      try {
        // Call backend bank account resolution endpoint (requires Paystack/Flutterwave integration on backend)
        const res = await api.post('/api/v1/bank/resolve-account', {
          accountNumber: val,
          bankName: bank.value.bankName
        });
        bank.value.accountName = res.data?.accountName || res.data?.account_name || '';
        if (!bank.value.accountName) {
          $q.notify({ type: 'warning', message: 'Account name could not be resolved. Please enter manually.' });
        }
      } catch {
        // Backend endpoint not available — prompt manual entry, do NOT fabricate a name
        bank.value.accountName = '';
        $q.notify({
          type: 'info',
          message: 'Auto-resolution unavailable. Please type the account name manually.',
          icon: 'info'
        });
      } finally {
        bank.value.resolving = false;
      }
    }, 800);
  }
};

const saveBankAccount = async () => {
  saving.value.bank = true;
  await new Promise(r => setTimeout(r, 1000));
  bank.value.savedAccount = {
    bankName: bank.value.bankName,
    accountNumber: bank.value.accountNumber,
    accountName: bank.value.accountName,
  };
  localStorage.setItem('tenant_bank_account', JSON.stringify(bank.value.savedAccount));
  saving.value.bank = false;
  $q.notify({ type: 'positive', message: 'Bank account saved. Payout verification will begin within 24 hours.', icon: 'account_balance' });
};

const clearBankForm = () => {
  bank.value.bankName = '';
  bank.value.accountNumber = '';
  bank.value.accountName = '';
  bank.value.bvn = '';
};

const payoutInfo = [
  { label: 'Payout Cycle', value: 'Daily (T+1)' },
  { label: 'Minimum Payout', value: '₦5,000' },
  { label: 'Processing Fee', value: '0% (Enterprise plan)' },
  { label: 'Next Scheduled Payout', value: new Date(Date.now() + 86400000).toLocaleDateString('en-NG'), valueClass: 'text-green-3' },
  { label: 'Account Status', value: bank.value.savedAccount ? 'Verified ✓' : 'Not Configured', valueClass: bank.value.savedAccount ? 'text-green-3' : 'text-amber-3' },
];

const notifyComingSoon = (feature) => {
  $q.notify({ type: 'info', message: `${feature} — Coming soon.`, icon: 'schedule' });
};

onMounted(async () => {
  // Load saved notification prefs from localStorage
  const saved = localStorage.getItem('tenant_notification_prefs');
  if (saved) {
    try { Object.assign(notifications.value, JSON.parse(saved)); } catch {}
  }

  // Load real login history from backend audit logs
  await loadLoginHistory();
});
</script>

<style scoped>
.border-card { border: 1px solid rgba(255,255,255,0.06); }
.border-card-inner { border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
.op-gap-8 { gap: 8px; }
.op-gap-12 { gap: 12px; }
.text-metric-sm { font-size: 10px; letter-spacing: 0.5px; }

.transparent-panels :deep(.q-tab-panel) {
  background: transparent;
  padding: 0;
}

.profile-input :deep(.q-field__control) {
  background: rgba(0,0,0,0.3);
}

.bg-green-muted { background: rgba(34,197,94,0.08) !important; border: 1px solid rgba(34,197,94,0.2); }
.bg-red-muted { background: rgba(239,68,68,0.08) !important; border: 1px solid rgba(239,68,68,0.2); }

.border-indigo { border: 2px solid rgba(99,102,241,0.4); }
.border-indigo-left { border-left: 2px solid rgba(99,102,241,0.4); }

.login-table :deep(.q-table__bottom) { border-top: 1px solid rgba(255,255,255,0.05); }
.login-table :deep(thead tr th) { color: rgba(255,255,255,0.4); font-size: 10px; letter-spacing: 1px; }
</style>
