<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="admin_panel_settings" size="sm" color="cyan-3" />
        <div class="text-operator-title text-weight-bold" style="font-size: 14px;">INSTITUTE GOVERNANCE & ONBOARDING</div>
      </div>
      <div class="row items-center op-gap-8">
        <span class="text-caption text-muted">Institute portal</span>
        <code class="text-amber-4 text-caption">{{ institutePortalUrl }}</code>
        <q-btn flat dense size="sm" icon="content_copy" color="cyan-3" @click="copyPortalUrl">
          <q-tooltip>Copy Institute login URL</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="row items-stretch op-gap-16 col min-h-0">
      <!-- Agent Directory (Full Width) -->
      <div class="col-12 column border-muted rounded-borders bg-panel overflow-hidden">
        <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
          <span class="text-operator-title text-weight-bold">Active Institute Roster</span>
          <div class="row items-center op-gap-8">
            <q-btn dense outline color="cyan-3" label="PROVISION NEW AGENT" size="sm" @click="showProvisionDialog = true" class="text-weight-bold q-px-sm" :disable="!schemaAvailable" />
            <q-btn dense flat size="sm" color="cyan-3" icon="refresh" @click="fetchAgents" :loading="loadingList" />
          </div>
        </div>
        <div v-if="schemaNotice" class="q-px-sm q-py-xs bg-amber-10 text-amber-2 text-caption border-bottom">
          {{ schemaNotice }}
        </div>
        <div class="col overflow-auto custom-scrollbar">
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
              <tr>
                <th class="q-pa-xs" style="width: 36px;">Logo</th>
                <th class="q-pa-xs">Category</th>
                <th class="q-pa-xs">Institute Code</th>
                <th class="q-pa-xs">Name / Display</th>
                <th class="q-pa-xs">KYC Status</th>
                <th class="q-pa-xs">Profile Status</th>
                <th class="q-pa-xs">Operating State</th>
                <th class="q-pa-xs">Commissions</th>
              </tr>
            </thead>
            <tbody class="text-caption" style="font-size: 11px;">
              <tr v-for="agent in agents" :key="agent.id" class="hover-row border-bottom-light cursor-pointer" @click="openAgentProfile(agent.id)">
                <td class="q-pa-xs text-center">
                  <q-avatar size="24px" class="bg-panel rounded-borders" v-if="agent.logoUrl">
                    <img :src="agent.logoUrl" alt="Logo" style="object-fit: contain;" />
                  </q-avatar>
                  <q-icon v-else :name="getCategoryIcon(agent.institutionType)" :color="getCategoryColor(agent.institutionType)" size="xs" />
                </td>
                <td class="q-pa-xs">
                  <q-badge :color="getCategoryBadgeColor(agent.institutionType)" :text-color="getCategoryBadgeTextColor(agent.institutionType)" class="text-metric-sm text-weight-bold">
                    {{ agent.institutionType || 'SCHOOL' }}
                  </q-badge>
                </td>
                <td class="q-pa-xs text-metric-mono text-amber-4 text-weight-bold">{{ agent.agentCode }}</td>
                <td class="q-pa-xs text-main">
                  <div class="text-weight-medium">{{ agent.name }}</div>
                  <div v-if="agent.tradingName && agent.tradingName !== agent.name" class="text-cyan-3" style="font-size: 9px;">
                    {{ agent.tradingName }}
                  </div>
                  <div class="text-muted" style="font-size: 9px;">{{ agent.phone }}</div>
                </td>
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.kycStatus === 'VERIFIED' ? 'green-10' : 'amber-10'" :text-color="agent.kycStatus === 'VERIFIED' ? 'green-2' : 'amber-2'">
                    {{ agent.kycStatus || 'PENDING' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.isFirstLogin ? 'blue-grey-8' : 'green-10'" :text-color="agent.isFirstLogin ? 'blue-grey-2' : 'green-2'">
                    {{ agent.isFirstLogin ? 'PENDING ACTIVATION' : 'ACTIVE' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.status === 'SUSPENDED' ? 'red-10' : agent.status === 'PENDING' ? 'amber-10' : 'blue-8'" :text-color="agent.status === 'SUSPENDED' ? 'red-2' : agent.status === 'PENDING' ? 'amber-2' : 'blue-2'">
                    {{ agent.status || 'PENDING' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs text-metric-mono text-green-4">{{ currentCurrency.symbol }}{{ agent.commissions?.toFixed(2) || '0.00' }}</td>
              </tr>
              <tr v-if="(!agents || agents.length === 0) && !loadingList">
                <td colspan="8" class="q-pa-md text-center text-muted">No institutions provisioned yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Provisioning Dialog -->
    <q-dialog v-model="showProvisionDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 500px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="text-weight-bold text-subtitle1">Provision New Institute</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="onboardAgent" class="column op-gap-8">
            <q-select
              v-model="newAgent.institutionType"
              :options="institutionTypeOptions"
              dark filled dense
              emit-value
              map-options
              label="Institution Category *"
              class="bg-panel-darker text-caption"
              required
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps" class="bg-panel text-main">
                  <q-item-section avatar>
                    <q-icon :name="scope.opt.icon" :color="scope.opt.color" size="xs" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-caption text-weight-medium">{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption class="text-muted" style="font-size: 9px;">{{ scope.opt.desc }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-input v-model="newAgent.name" dark filled dense label="Full Legal Name *" placeholder="e.g. Leadway Health Ltd, Apex High School" class="bg-panel-darker text-caption" required />
            <q-input v-model="newAgent.tradingName" dark filled dense label="Trading / Display Name" placeholder="e.g. Leadway Health, Apex Academy" class="bg-panel-darker text-caption" />
            <q-input v-model="newAgent.email" dark filled dense type="email" label="Official Contact Email *" placeholder="agent@example.com" class="bg-panel-darker text-caption" required />
            <q-input v-model="newAgent.phone" dark filled dense type="tel" label="Primary Phone Number *" placeholder="+2348012345678" class="bg-panel-darker text-caption" maxlength="14" counter required />
            <div class="row items-center justify-between no-wrap op-gap-8">
              <q-input v-model="newAgent.whatsappNumber" dark filled dense type="tel" label="WhatsApp Number *" placeholder="+2348012345678" class="bg-panel-darker text-caption col" maxlength="14" counter :disable="sameAsPhone" required />
              <q-checkbox v-model="sameAsPhone" dark dense label="Same as Phone" color="cyan-3" class="text-caption text-muted" />
            </div>
            <q-input v-model="newAgent.address" dark filled dense type="textarea" rows="2" label="Official Registered Address *" placeholder="Registered office / campus address..." class="bg-panel-darker text-caption" required />

            <!-- Official Institution Logo Upload -->
            <div class="bg-panel-darker rounded-borders border-muted q-pa-sm column op-gap-6">
              <div class="row items-center justify-between">
                <span class="text-caption text-weight-bold text-muted" style="font-size: 10px;">OFFICIAL INSTITUTION LOGO (PNG, JPEG, WebP - MAX 2MB)</span>
                <span v-if="logoFile" class="text-caption text-cyan-3" style="font-size: 9px;">{{ (logoFile.size / 1024).toFixed(0) }} KB</span>
              </div>
              <div class="row items-center op-gap-12" v-if="logoPreviewUrl">
                <q-avatar size="44px" class="bg-panel rounded-borders border-muted">
                  <img :src="logoPreviewUrl" alt="Logo Preview" style="object-fit: contain;" />
                </q-avatar>
                <div class="column col">
                  <span class="text-caption text-weight-bold ellipsis">{{ logoFile?.name || 'Selected Logo' }}</span>
                  <span class="text-caption text-muted" style="font-size: 9px;">Ready for upload</span>
                </div>
                <q-btn flat round dense size="sm" icon="close" color="red-4" @click="clearLogoSelection">
                  <q-tooltip>Remove logo</q-tooltip>
                </q-btn>
              </div>
              <q-file
                v-else
                v-model="logoFile"
                dark filled dense
                label="Select Official Institution Logo"
                accept="image/png,image/jpeg,image/webp"
                class="bg-panel text-caption"
                @update:model-value="onLogoSelected"
              >
                <template v-slot:prepend><q-icon name="add_photo_alternate" color="cyan-3" /></template>
              </q-file>
            </div>

            <!-- Conditional Regulatory Fields -->
            <template v-if="newAgent.institutionType === 'HMO'">
              <div class="text-caption text-teal-3 text-weight-bold q-mt-xs" style="font-size: 10px;">HMO REGULATORY ACCREDITATION</div>
              <q-input v-model="newAgent.nhiaLicenseNumber" dark filled dense label="NHIA Accreditation / License Number *" placeholder="e.g. NHIA/HMO/2026/042" class="bg-panel-darker text-caption" required />
            </template>

            <template v-else-if="newAgent.institutionType === 'BANK' || newAgent.institutionType === 'PTSP'">
              <div class="text-caption text-amber-4 text-weight-bold q-mt-xs" style="font-size: 10px;">CENTRAL BANK (CBN) LICENSING</div>
              <q-input v-model="newAgent.cbnLicenseNumber" dark filled dense :label="`${newAgent.institutionType} CBN Approval / License Reference *`" placeholder="e.g. CBN/BPSD/2026/108" class="bg-panel-darker text-caption" required />
            </template>

            <template v-else-if="newAgent.institutionType === 'SCHOOL'">
              <div class="text-caption text-cyan-3 text-weight-bold q-mt-xs" style="font-size: 10px;">EDUCATION REGULATORY APPROVAL</div>
              <q-input v-model="newAgent.ministryApprovalNumber" dark filled dense label="Ministry of Education Approval / Ref Number *" placeholder="e.g. MOE/ED/REG/2026/99" class="bg-panel-darker text-caption" required />
            </template>

            <template v-else-if="newAgent.institutionType === 'MERCHANT' || newAgent.institutionType === 'CORPORATE'">
              <div class="text-caption text-orange-4 text-weight-bold q-mt-xs" style="font-size: 10px;">CORPORATE REGISTRATION & TAX</div>
              <q-input v-model="newAgent.cacNumber" dark filled dense label="CAC Registration / RC Number *" placeholder="e.g. RC-1928374" class="bg-panel-darker text-caption" required />
              <q-input v-model="newAgent.tin" dark filled dense label="Tax Identification Number (TIN)" placeholder="e.g. TIN-99283741" class="bg-panel-darker text-caption" />
            </template>

            <!-- Passport & ID -->
            <q-file v-model="passportFile" dark filled dense label="Upload Principal Officer Photo *" accept="image/*" class="bg-panel-darker text-caption" required>
              <template v-slot:prepend><q-icon name="face" /></template>
            </q-file>
            <q-file v-model="idCardFile" dark filled dense label="Upload Government ID / Reg Certificate *" accept="image/*,application/pdf" class="bg-panel-darker text-caption" required>
              <template v-slot:prepend><q-icon name="badge" /></template>
            </q-file>
            <q-input v-model="newAgent.agentCode" dark filled dense label="Institute Code" class="bg-panel-darker text-caption" maxlength="10" hint="Auto-generated or custom identifier" />
            
            <q-btn type="submit" dense color="cyan-3" text-color="black" label="PROVISION INSTITUTE (PENDING KYC VERIFICATION)" :loading="loading" class="q-mt-md text-weight-bold full-width" />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Suspension Dialog -->
    <q-dialog v-model="showSuspendDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 450px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="text-weight-bold text-subtitle1 text-red-4">Suspend Institute</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pt-md">
          <div class="text-caption text-muted">
            Provide the suspension message displayed to the agent at login, and optionally require them to perform an action to reactivate.
          </div>
          
          <q-input 
            v-model="suspensionForm.suspensionReason" 
            dark filled dense type="textarea" rows="3"
            label="Suspension Reason / Message"
            placeholder="e.g. Your account has been temporarily flagged for high risk transactions."
            class="bg-panel-darker text-caption"
            required
          />

          <q-select
            v-model="suspensionForm.requiredAction"
            :options="actionOptionsList"
            label="Required Action at Login"
            dark filled dense
            emit-value
            map-options
            class="bg-panel-darker text-caption"
          />

          <template v-if="suspensionForm.requiredAction === 'ANSWER_QUESTION'">
            <q-input
              v-model="suspensionForm.actionQuestion"
              dark filled dense
              label="Verification Question"
              placeholder="e.g. Verify your manager's phone number or business ID"
              class="bg-panel-darker text-caption"
              required
            />
            <q-input
              v-model="suspensionForm.actionAnswer"
              dark filled dense
              label="Expected Answer"
              placeholder="e.g. +2348000000000"
              class="bg-panel-darker text-caption"
            />
          </template>
        </q-card-section>

        <q-card-actions align="right" class="border-top q-pa-md bg-panel-darker">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn label="Confirm Suspension" color="red-8" @click="confirmSuspension" :loading="loadingStatus" class="text-weight-bold" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Agent Profile Drawer -->
    <q-dialog v-model="showProfileDialog" position="right" seamless transition-show="slide-left" transition-hide="slide-right">
      <q-card class="bg-panel text-main font-inter border-left-muted column no-wrap drawer-shadow" style="width: 500px; max-width: 100vw; height: 100vh;">
        <q-card-section class="row items-center justify-between bg-panel-darker border-bottom shrink-0 q-pa-sm">
          <div class="row items-center op-gap-8">
            <q-btn icon="close" flat round dense v-close-popup size="sm" />
            <div class="text-weight-bold text-subtitle2">Institute Profile Inspector</div>
          </div>
          <template v-if="selectedAgent">
            <div class="row items-center op-gap-8">
              <q-btn dense size="sm" outline color="cyan-3" label="EDIT INSTITUTE" icon="edit" 
                     @click="openEditDialog" class="text-weight-bold q-px-sm" />
              <q-btn v-if="selectedAgent.status === 'PENDING_APPROVAL'" :loading="loadingStatus" dense size="sm" 
                     color="green-8" text-color="white" label="APPROVE & ACTIVATE AGENT" 
                     @click="approveAgentStatus" class="text-weight-bold q-px-sm" />
              <q-btn v-else :loading="loadingStatus" dense size="sm" 
                     :color="selectedAgent.status === 'SUSPENDED' ? 'green-10' : 'red-10'"
                     :text-color="selectedAgent.status === 'SUSPENDED' ? 'green-2' : 'red-2'"
                     :label="selectedAgent.status === 'SUSPENDED' ? 'REACTIVATE INSTITUTE' : 'SUSPEND INSTITUTE'" 
                     @click="toggleAgentStatus" class="text-weight-bold q-px-sm" />
            </div>
          </template>
        </q-card-section>

        <q-card-section class="col overflow-auto custom-scrollbar q-pa-none">
          <div v-if="loadingProfile" class="q-pa-xl text-center"><q-spinner color="cyan-3" size="2em" /></div>
          
          <div v-else-if="selectedAgent" class="column">
            <!-- KYC & Profile Section -->
            <div class="q-pa-md column op-gap-16 border-bottom">
              <div class="row items-center justify-between">
                <div class="row items-center op-gap-12">
                  <q-avatar size="44px" class="bg-panel-darker rounded-borders border-muted" v-if="selectedAgent.logoUrl">
                    <img :src="selectedAgent.logoUrl" alt="Logo" style="object-fit: contain;" />
                  </q-avatar>
                  <q-avatar size="44px" class="bg-panel-darker rounded-borders border-muted text-center" v-else>
                    <q-icon :name="getCategoryIcon(selectedAgent.institutionType)" :color="getCategoryColor(selectedAgent.institutionType)" size="md" />
                  </q-avatar>
                  <div>
                    <div class="row items-center op-gap-6">
                      <span class="text-h6 text-weight-bold text-amber-4 text-metric-mono">{{ selectedAgent.agentCode }}</span>
                      <q-badge :color="getCategoryBadgeColor(selectedAgent.institutionType)" :text-color="getCategoryBadgeTextColor(selectedAgent.institutionType)" class="text-metric-sm text-weight-bold">
                        {{ selectedAgent.institutionType || 'SCHOOL' }}
                      </q-badge>
                    </div>
                    <div class="text-subtitle1 text-weight-medium">{{ selectedAgent.name }}</div>
                    <div v-if="selectedAgent.tradingName && selectedAgent.tradingName !== selectedAgent.name" class="text-caption text-cyan-3">
                      Trading: {{ selectedAgent.tradingName }}
                    </div>
                  </div>
                </div>
                <div class="column items-end op-gap-4">
                  <q-chip dense size="xs" :color="selectedAgent.kycStatus === 'VERIFIED' ? 'green-10' : 'amber-10'" :text-color="selectedAgent.kycStatus === 'VERIFIED' ? 'green-2' : 'amber-2'">
                    KYC: {{ selectedAgent.kycStatus || 'PENDING' }}
                  </q-chip>
                  <q-chip dense size="xs" :color="selectedAgent.status === 'SUSPENDED' ? 'red-10' : selectedAgent.status === 'PENDING' ? 'amber-10' : 'blue-8'" :text-color="selectedAgent.status === 'SUSPENDED' ? 'red-2' : selectedAgent.status === 'PENDING' ? 'amber-2' : 'blue-2'">
                    STATE: {{ selectedAgent.status || 'PENDING' }}
                  </q-chip>
                </div>
              </div>

              <!-- Contact & Institutional Info -->
              <div class="bg-panel-darker rounded-borders border-muted q-pa-sm text-caption column op-gap-4">
                <div class="row items-center justify-between q-mb-xs">
                  <div class="text-caption text-weight-bold text-muted" style="font-size: 10px; letter-spacing: 0.5px;">INSTITUTE PROFILE DETAILS</div>
                  <q-btn flat dense size="xs" color="cyan-3" icon="edit" label="Edit Details" @click="openEditDialog" />
                </div>
                <div class="row"><div class="col-4 text-muted">Legal Name</div><div class="col-8 text-weight-medium">{{ selectedAgent.name || 'N/A' }}</div></div>
                <div class="row" v-if="selectedAgent.tradingName"><div class="col-4 text-muted">Trading Name</div><div class="col-8 text-cyan-3">{{ selectedAgent.tradingName }}</div></div>
                <div class="row"><div class="col-4 text-muted">Category</div><div class="col-8"><q-badge :color="getCategoryBadgeColor(selectedAgent.institutionType)" :text-color="getCategoryBadgeTextColor(selectedAgent.institutionType)" class="text-metric-sm text-weight-bold">{{ selectedAgent.institutionType || 'SCHOOL' }}</q-badge></div></div>
                <div class="row"><div class="col-4 text-muted">Email</div><div class="col-8 text-metric-mono">{{ selectedAgent.email || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">Phone</div><div class="col-8">{{ selectedAgent.phone || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">WhatsApp</div><div class="col-8">{{ selectedAgent.whatsappNumber || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">Address</div><div class="col-8">{{ selectedAgent.address || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">Created</div><div class="col-8">{{ new Date(selectedAgent.createdAt).toLocaleDateString() }}</div></div>
              </div>

              <!-- Regulatory & Accreditation Metadata -->
              <div v-if="hasRegulatoryData(selectedAgent)" class="bg-panel-darker rounded-borders border-muted q-pa-sm text-caption column op-gap-4">
                <div class="text-caption text-weight-bold text-muted" style="font-size: 10px; letter-spacing: 0.5px;">REGULATORY & ACCREDITATION</div>
                <div class="row" v-if="selectedAgent.regulatorLicenseReference">
                  <div class="col-5 text-muted">License / Approval Ref</div>
                  <div class="col-7 text-teal-3 text-metric-mono">{{ selectedAgent.regulatorLicenseReference }}</div>
                </div>
                <div class="row" v-if="selectedAgent.cacNumber">
                  <div class="col-5 text-muted">CAC RC Number</div>
                  <div class="col-7 text-amber-4 text-metric-mono">{{ selectedAgent.cacNumber }}</div>
                </div>
                <div class="row" v-if="selectedAgent.tin">
                  <div class="col-5 text-muted">TIN</div>
                  <div class="col-7 text-cyan-3 text-metric-mono">{{ selectedAgent.tin }}</div>
                </div>
              </div>

              <!-- Official Institution Logo Management -->
              <div class="bg-panel-darker rounded-borders border-muted q-pa-sm column op-gap-6">
                <div class="row items-center justify-between">
                  <span class="text-caption text-weight-bold text-muted" style="font-size: 10px; letter-spacing: 0.5px;">OFFICIAL INSTITUTION LOGO</span>
                  <q-btn v-if="selectedAgent.logoUrl" flat dense size="xs" color="red-4" label="Remove Logo" icon="delete" :loading="updatingLogo" @click="removeAgentLogo" />
                </div>
                <div class="row items-center op-gap-12">
                  <q-avatar size="48px" class="bg-panel rounded-borders border-muted" v-if="selectedAgent.logoUrl">
                    <img :src="selectedAgent.logoUrl" alt="Official Logo" style="object-fit: contain;" />
                  </q-avatar>
                  <div class="col">
                    <q-file
                      v-model="replaceLogoFile"
                      dark filled dense
                      label="Upload / Replace Logo (PNG/JPEG/WebP, Max 2MB)"
                      accept="image/png,image/jpeg,image/webp"
                      class="bg-panel text-caption"
                      :loading="updatingLogo"
                      @update:model-value="onReplaceLogoSelected"
                    >
                      <template v-slot:prepend><q-icon name="cloud_upload" color="cyan-3" /></template>
                    </q-file>
                  </div>
                </div>
              </div>

              <!-- KYC Documentation -->
              <div class="column op-gap-8">
                <div class="text-caption text-weight-bold text-muted" style="font-size: 10px; letter-spacing: 0.5px;">KYC DOCUMENTATION</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="bg-panel-darker rounded-borders border-muted q-pa-sm text-center column justify-center items-center" style="min-height: 120px;">
                      <div class="text-caption text-muted q-mb-xs" style="font-size: 10px;">Passport Photo</div>
                      <q-img v-if="selectedAgent.passportImage" :src="selectedAgent.passportImage" spinner-color="cyan" style="max-height: 90px; width: 90px; border-radius: 4px;" contain />
                      <div v-else class="text-caption text-grey q-py-md">No image uploaded</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="bg-panel-darker rounded-borders border-muted q-pa-sm text-center column justify-center items-center" style="min-height: 120px;">
                      <div class="text-caption text-muted q-mb-xs" style="font-size: 10px;">Government ID</div>
                      <q-img v-if="selectedAgent.idCard && selectedAgent.idCard.startsWith('data:image')" :src="selectedAgent.idCard" spinner-color="cyan" style="max-height: 90px; width: 90px; border-radius: 4px;" contain />
                      <div v-else-if="selectedAgent.idCard" class="q-py-md">
                        <q-btn dense size="xs" color="cyan-9" icon="open_in_new" label="View ID Document" @click="openIdCard(selectedAgent.idCard)" />
                      </div>
                      <div v-else class="text-caption text-grey q-py-md">No ID uploaded</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- KYC Decisions -->
              <div v-if="selectedAgent.kycStatus === 'PENDING' || selectedAgent.kycStatus === 'REJECTED' || !selectedAgent.kycStatus" class="row op-gap-8">
                <q-btn color="green-8" text-color="white" label="Approve KYC" icon="check" size="sm" class="col text-weight-bold" :loading="loadingKyc" @click="updateKycStatus('VERIFIED')" />
                <q-btn color="red-8" text-color="white" label="Reject KYC" icon="close" size="sm" class="col text-weight-bold" :loading="loadingKyc" @click="updateKycStatus('REJECTED')" />
              </div>
              <div v-else-if="selectedAgent.kycStatus === 'VERIFIED'" class="bg-green-10 text-green-2 border-green rounded-borders q-pa-sm text-center row items-center justify-center op-gap-8">
                <q-icon name="verified" size="sm" color="green-4" />
                <span class="text-caption text-weight-bold" style="font-size: 11px;">KYC VERIFIED & APPROVED</span>
                <q-btn flat dense size="xs" color="red-2" label="Revert" class="q-ml-auto" @click="updateKycStatus('PENDING')" :loading="loadingKyc" />
              </div>

              <!-- Messaging Actions -->
              <div class="row op-gap-8">
                <q-btn outline color="cyan-3" label="Message Institute" icon="send" size="sm" class="col" @click="promptMessageAgent" />
                <q-btn outline color="amber-4" label="Broadcast to Tenants" icon="campaign" size="sm" class="col" @click="promptMessageTenants" />
              </div>
              <q-btn outline color="teal-3" label="Resend Invite (Set-Password Email)" icon="mark_email_unread" size="sm" class="full-width q-mt-sm" :loading="resendingInvite" @click="resendInvite" />
            </div>

            <!-- Onboarded Tenants Section -->
            <div class="column">
              <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
                <span class="text-operator-title text-weight-bold text-muted">Onboarded Tenants Roster</span>
              </div>
              <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
                <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom" style="font-size: 10px;">
                  <tr>
                    <th class="q-pa-xs">Tenant ID</th>
                    <th class="q-pa-xs">Business Name</th>
                    <th class="q-pa-xs">Status</th>
                  </tr>
                </thead>
                <tbody class="text-caption" style="font-size: 11px;">
                  <tr v-for="tenant in selectedAgentTenants" :key="tenant.id" class="border-bottom-light">
                    <td class="q-pa-xs text-metric-mono text-cyan-3">{{ tenant.id }}</td>
                    <td class="q-pa-xs text-main">{{ tenant.businessName }}</td>
                    <td class="q-pa-xs">
                      <q-chip dense size="xs" :color="tenant.status === 'ACTIVE' ? 'green-10' : 'amber-10'" :text-color="tenant.status === 'ACTIVE' ? 'green-2' : 'amber-2'">
                        {{ tenant.status }}
                      </q-chip>
                    </td>
                  </tr>
                  <tr v-if="selectedAgentTenants.length === 0">
                    <td colspan="3" class="q-pa-md text-center text-muted">No tenants onboarded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit Institute Profile Dialog -->
    <q-dialog v-model="showEditDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 520px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="row items-center op-gap-8">
            <q-icon name="edit_note" color="cyan-3" size="sm" />
            <div class="text-weight-bold text-subtitle1">Edit Institute Profile</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-form @submit="saveEditProfile" class="column op-gap-12">
            <!-- Read-only Agent Code & Email -->
            <div class="row op-gap-8">
              <div class="col">
                <q-input v-model="editForm.agentCode" dark filled dense label="Institute Code" readonly class="bg-panel-darker text-amber-4 text-metric-mono" />
              </div>
              <div class="col">
                <q-input v-model="editForm.email" dark filled dense label="Email" readonly class="bg-panel-darker text-metric-mono" />
              </div>
            </div>

            <!-- Institution Category Selector -->
            <div>
              <div class="text-caption text-weight-bold text-muted q-mb-xs" style="font-size: 10px; letter-spacing: 0.5px;">INSTITUTION CATEGORY</div>
              <q-select
                v-model="editForm.institutionType"
                :options="institutionTypeOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                dark filled dense
                class="bg-panel-darker"
              >
                <template v-slot:selected-item="scope">
                  <div class="row items-center op-gap-8">
                    <q-icon :name="getCategoryIcon(scope.opt)" :color="getCategoryColor(scope.opt)" size="xs" />
                    <span class="text-weight-bold" :class="`text-${getCategoryColor(scope.opt)}`">{{ scope.opt }}</span>
                  </div>
                </template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps" class="bg-panel-darker text-main">
                    <q-item-section avatar style="min-width: 32px;">
                      <q-icon :name="scope.opt.icon" :color="scope.opt.color" size="xs" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold" :class="`text-${scope.opt.color}`">{{ scope.opt.value }}</q-item-label>
                      <q-item-label caption class="text-muted" style="font-size: 10px;">{{ scope.opt.desc }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <!-- Legal Name & Trading Name -->
            <q-input v-model="editForm.name" dark filled dense label="Legal Name *" class="bg-panel-darker" required />
            <q-input v-model="editForm.tradingName" dark filled dense label="Trading / Display Name" class="bg-panel-darker" />

            <!-- Phone & WhatsApp -->
            <div class="row op-gap-8">
              <div class="col">
                <q-input v-model="editForm.phone" dark filled dense label="Phone Number" class="bg-panel-darker" />
              </div>
              <div class="col">
                <q-input v-model="editForm.whatsappNumber" dark filled dense label="WhatsApp Number" class="bg-panel-darker" />
              </div>
            </div>

            <!-- Operating Address -->
            <q-input v-model="editForm.address" dark filled dense label="Operating Address" type="textarea" rows="2" class="bg-panel-darker" />

            <!-- Category-Specific Regulatory & Compliance Fields -->
            <div class="column op-gap-8 bg-panel-darker rounded-borders q-pa-sm border-muted">
              <div class="text-caption text-weight-bold text-muted" style="font-size: 10px; letter-spacing: 0.5px;">REGULATORY & COMPLIANCE DETAILS</div>

              <!-- HMO License -->
              <div v-if="editForm.institutionType === 'HMO'">
                <q-input v-model="editForm.nhiaLicenseNumber" dark filled dense label="NHIA License / Accreditation Reference *" class="bg-panel" :rules="[val => !!val || 'NHIA reference is required for HMO']" />
              </div>

              <!-- Bank / PTSP License -->
              <div v-if="editForm.institutionType === 'BANK' || editForm.institutionType === 'PTSP'">
                <q-input v-model="editForm.cbnLicenseNumber" dark filled dense :label="`${editForm.institutionType} CBN License / Approval Ref *`" class="bg-panel" :rules="[val => !!val || 'CBN license reference is required']" />
              </div>

              <!-- School Ministry Approval -->
              <div v-if="editForm.institutionType === 'SCHOOL'">
                <q-input v-model="editForm.ministryApprovalNumber" dark filled dense label="Ministry of Education Approval / School Code *" class="bg-panel" :rules="[val => !!val || 'Ministry approval reference is required for Schools']" />
              </div>

              <!-- CAC & TIN -->
              <div class="row op-gap-8">
                <div class="col">
                  <q-input v-model="editForm.cacNumber" dark filled dense label="CAC RC Number" class="bg-panel" />
                </div>
                <div class="col">
                  <q-input v-model="editForm.tin" dark filled dense label="Tax ID (TIN)" class="bg-panel" />
                </div>
              </div>
            </div>

            <div class="row justify-end op-gap-8 q-mt-sm">
              <q-btn label="Cancel" flat color="grey-4" v-close-popup />
              <q-btn type="submit" label="Save Profile Changes" color="cyan-3" text-color="black" class="text-weight-bold" :loading="savingEditProfile" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import axios from '../../api'
import { useCurrency } from '../../composables/useCurrency'

const $q = useQuasar()
const { currentCurrency } = useCurrency()
const institutePortalUrl = `${window.location.origin}/institute/login`
const copyPortalUrl = async () => {
  try {
    await copyToClipboard(institutePortalUrl)
    $q.notify({ type: 'positive', message: 'Institute portal URL copied', position: 'top-right' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not copy URL', position: 'top-right' })
  }
}
const agents = ref([])
const loading = ref(false)
const loadingList = ref(false)
const schemaAvailable = ref(true)
const schemaNotice = ref('')

const showProvisionDialog = ref(false)
const showProfileDialog = ref(false)
const showEditDialog = ref(false)
const savingEditProfile = ref(false)
const editForm = ref({
  id: '',
  agentCode: '',
  email: '',
  institutionType: 'SCHOOL',
  name: '',
  tradingName: '',
  phone: '',
  whatsappNumber: '',
  address: '',
  nhiaLicenseNumber: '',
  cbnLicenseNumber: '',
  ministryApprovalNumber: '',
  cacNumber: '',
  tin: '',
})
const loadingProfile = ref(false)
const loadingStatus = ref(false)
const loadingKyc = ref(false)
const showSuspendDialog = ref(false)
const suspensionForm = ref({
  suspensionReason: '',
  requiredAction: 'NONE',
  actionQuestion: '',
  actionAnswer: ''
})
const actionOptionsList = [
  { label: 'None (Manual Review Required)', value: 'NONE' },
  { label: 'Upload Passport Photo', value: 'UPLOAD_PASSPORT' },
  { label: 'Upload Government ID', value: 'UPLOAD_ID' },
  { label: 'Update Residential Address', value: 'UPDATE_ADDRESS' },
  { label: 'Update Phone Number', value: 'UPDATE_PHONE' },
  { label: 'Update WhatsApp Number', value: 'UPDATE_WHATSAPP' },
  { label: 'Answer Verification Question', value: 'ANSWER_QUESTION' }
]
const selectedAgent = ref(null)
const selectedAgentTenants = ref([])

const institutionTypeOptions = [
  { label: 'School (K-12 & Tertiary)', value: 'SCHOOL', icon: 'school', color: 'cyan-3', desc: 'Educational institution for students & staff' },
  { label: 'HMO / Health Insurer', value: 'HMO', icon: 'health_and_safety', color: 'teal-3', desc: 'Licensed Health Maintenance Organization' },
  { label: 'Commercial / Microfinance Bank', value: 'BANK', icon: 'account_balance', color: 'amber-4', desc: 'Commercial or Microfinance banking institution' },
  { label: 'Merchant / Retailer', value: 'MERCHANT', icon: 'storefront', color: 'orange-4', desc: 'Retail and commercial merchant network' },
  { label: 'PTSP (Terminal Provider)', value: 'PTSP', icon: 'point_of_sale', color: 'purple-3', desc: 'Payment Terminal Service Provider' },
  { label: 'Corporate Entity', value: 'CORPORATE', icon: 'corporate_fare', color: 'indigo-3', desc: 'Enterprise and corporate organization' },
]

function getCategoryIcon(type) {
  const t = String(type || 'SCHOOL').toUpperCase()
  switch (t) {
    case 'HMO': return 'health_and_safety'
    case 'BANK': return 'account_balance'
    case 'PTSP': return 'point_of_sale'
    case 'MERCHANT': return 'storefront'
    case 'CORPORATE': return 'corporate_fare'
    case 'SCHOOL':
    default:
      return 'school'
  }
}

function getCategoryColor(type) {
  const t = String(type || 'SCHOOL').toUpperCase()
  switch (t) {
    case 'HMO': return 'teal-3'
    case 'BANK': return 'amber-4'
    case 'PTSP': return 'purple-3'
    case 'MERCHANT': return 'orange-4'
    case 'CORPORATE': return 'indigo-3'
    case 'SCHOOL':
    default:
      return 'cyan-3'
  }
}

function getCategoryBadgeColor(type) {
  const t = String(type || 'SCHOOL').toUpperCase()
  switch (t) {
    case 'HMO': return 'teal-9'
    case 'BANK': return 'amber-9'
    case 'PTSP': return 'purple-9'
    case 'MERCHANT': return 'orange-9'
    case 'CORPORATE': return 'indigo-9'
    case 'SCHOOL':
    default:
      return 'cyan-9'
  }
}

function getCategoryBadgeTextColor(type) {
  const t = String(type || 'SCHOOL').toUpperCase()
  switch (t) {
    case 'HMO': return 'teal-2'
    case 'BANK': return 'amber-2'
    case 'PTSP': return 'purple-2'
    case 'MERCHANT': return 'orange-2'
    case 'CORPORATE': return 'indigo-2'
    case 'SCHOOL':
    default:
      return 'cyan-2'
  }
}

function hasRegulatoryData(agent) {
  return !!(
    agent?.regulatorLicenseReference ||
    agent?.cacNumber ||
    agent?.tin ||
    agent?.regulatoryMetadata?.nhia_license_number ||
    agent?.regulatoryMetadata?.cbn_license_number ||
    agent?.regulatoryMetadata?.ministry_approval_number
  )
}

const logoFile = ref(null)
const logoPreviewUrl = ref('')
const replaceLogoFile = ref(null)
const updatingLogo = ref(false)

const onLogoSelected = (file) => {
  if (!file) {
    logoPreviewUrl.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Logo file size exceeds the 2MB limit.', position: 'top-right' })
    logoFile.value = null
    logoPreviewUrl.value = ''
    return
  }
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!allowed.includes(file.type)) {
    $q.notify({ type: 'negative', message: 'Only PNG, JPEG, and WebP logos are supported.', position: 'top-right' })
    logoFile.value = null
    logoPreviewUrl.value = ''
    return
  }
  logoPreviewUrl.value = URL.createObjectURL(file)
}

const clearLogoSelection = () => {
  logoFile.value = null
  logoPreviewUrl.value = ''
}

const onReplaceLogoSelected = async (file) => {
  if (!file || !selectedAgent.value) return
  if (file.size > 2 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Logo file size exceeds the 2MB limit.', position: 'top-right' })
    replaceLogoFile.value = null
    return
  }
  updatingLogo.value = true
  try {
    const base64Data = await toBase64(file)
    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    const res = await axios.post(`/api/admin/agents/${selectedAgent.value.id}/logo`, {
      logoImage: base64Data
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const newUrl = res.data?.logoUrl || ''
    selectedAgent.value.logoUrl = newUrl
    const inList = agents.value.find(a => a.id === selectedAgent.value.id)
    if (inList) inList.logoUrl = newUrl
    $q.notify({ type: 'positive', message: 'Institution logo updated successfully', position: 'top-right' })
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Logo update failed: ${msg}`, position: 'top-right' })
  } finally {
    updatingLogo.value = false
    replaceLogoFile.value = null
  }
}

const removeAgentLogo = async () => {
  if (!selectedAgent.value) return
  updatingLogo.value = true
  try {
    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    await axios.delete(`/api/admin/agents/${selectedAgent.value.id}/logo`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    selectedAgent.value.logoUrl = null
    const inList = agents.value.find(a => a.id === selectedAgent.value.id)
    if (inList) inList.logoUrl = null
    $q.notify({ type: 'positive', message: 'Institution logo removed successfully', position: 'top-right' })
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Logo removal failed: ${msg}`, position: 'top-right' })
  } finally {
    updatingLogo.value = false
  }
}

const newAgent = ref({
  institutionType: 'SCHOOL',
  name: '',
  tradingName: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  address: '',
  agentCode: '',
  nhiaLicenseNumber: '',
  cbnLicenseNumber: '',
  ministryApprovalNumber: '',
  cacNumber: '',
  tin: '',
})

const sameAsPhone = ref(false)

watch(sameAsPhone, (val) => {
  if (val) {
    newAgent.value.whatsappNumber = newAgent.value.phone
  } else {
    newAgent.value.whatsappNumber = ''
  }
})

watch(() => newAgent.value.phone, (newPhone) => {
  if (sameAsPhone.value) {
    newAgent.value.whatsappNumber = newPhone
  }
  
  if (newPhone) {
    const digits = newPhone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const last10 = digits.slice(-10)
      const num = parseInt(last10, 10)
      newAgent.value.agentCode = num.toString(36).toUpperCase().padStart(6, '0').substring(0, 6)
    } else {
      newAgent.value.agentCode = ''
    }
  } else {
    newAgent.value.agentCode = ''
  }
})

const passportFile = ref(null)
const idCardFile = ref(null)

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const fetchAgents = async () => {
  loadingList.value = true
  schemaNotice.value = ''
  try {
    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    const res = await axios.get('/api/admin/agents', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const payload = res.data || {}
    agents.value = payload.agents || payload.data || []
    schemaAvailable.value = payload.schemaAvailable !== false
    if (payload.schemaAvailable === false) {
      schemaNotice.value = payload.message || 'Agent portal database tables are not provisioned on production yet. Listing is empty until the schema is applied.'
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    schemaAvailable.value = err.response?.data?.schemaAvailable !== false
    if (String(msg).includes('public.agents') || String(msg).includes('schema cache')) {
      agents.value = []
      schemaAvailable.value = false
      schemaNotice.value = 'Agent portal schema is not provisioned on this database yet.'
    } else {
      $q.notify({ type: 'negative', message: `Failed to fetch agents: ${msg}`, position: 'top-right' })
    }
  } finally {
    loadingList.value = false
  }
}

const onboardAgent = async () => {
  loading.value = true
  try {
    const code = newAgent.value.agentCode.trim().toUpperCase() || generateCode()
    
    let passportImage = ''
    let idCard = ''
    let logoImage = ''
    if (passportFile.value) passportImage = await toBase64(passportFile.value)
    if (idCardFile.value) idCard = await toBase64(idCardFile.value)
    if (logoFile.value) logoImage = await toBase64(logoFile.value)

    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    const res = await axios.post('/api/admin/agents/onboard', {
      institutionType: newAgent.value.institutionType,
      name: newAgent.value.name,
      tradingName: newAgent.value.tradingName,
      email: newAgent.value.email,
      phone: newAgent.value.phone,
      whatsappNumber: newAgent.value.whatsappNumber,
      address: newAgent.value.address,
      passportImage,
      idCard,
      logoImage,
      agentCode: code,
      nhiaLicenseNumber: newAgent.value.nhiaLicenseNumber,
      cbnLicenseNumber: newAgent.value.cbnLicenseNumber,
      ministryApprovalNumber: newAgent.value.ministryApprovalNumber,
      cacNumber: newAgent.value.cacNumber,
      tin: newAgent.value.tin,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const provisionedCode = res.data?.agent?.agentCode || code
    $q.notify({
      type: res.data?.welcomeEmailSent === false ? 'warning' : 'positive',
      message: `Institution ${provisionedCode} provisioned. Status: PENDING KYC VERIFICATION. ${res.data?.message || ''}`.trim(),
      position: 'top-right',
      timeout: 8000
    })
    newAgent.value.institutionType = 'SCHOOL'
    newAgent.value.name = ''
    newAgent.value.tradingName = ''
    newAgent.value.email = ''
    newAgent.value.phone = ''
    newAgent.value.whatsappNumber = ''
    sameAsPhone.value = false
    newAgent.value.address = ''
    newAgent.value.agentCode = ''
    newAgent.value.nhiaLicenseNumber = ''
    newAgent.value.cbnLicenseNumber = ''
    newAgent.value.ministryApprovalNumber = ''
    newAgent.value.cacNumber = ''
    newAgent.value.tin = ''
    passportFile.value = null
    idCardFile.value = null
    clearLogoSelection()
    showProvisionDialog.value = false
    fetchAgents()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Provisioning failed: ${msg}`, position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const openAgentProfile = async (id) => {
  showProfileDialog.value = true
  loadingProfile.value = true
  selectedAgent.value = null
  selectedAgentTenants.value = []
  
  try {
    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    const res = await axios.get(`/api/admin/agents/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    selectedAgent.value = res.data.agent || res.data.data
    selectedAgentTenants.value = res.data.tenants || []
  } catch (err) {
    $q.notify({ type: 'negative', message: `Failed to load profile: ${err.message}`, position: 'top-right' })
    showProfileDialog.value = false
  } finally {
    loadingProfile.value = false
  }
}

const openEditDialog = () => {
  if (!selectedAgent.value) return
  const a = selectedAgent.value
  editForm.value = {
    id: a.id,
    agentCode: a.agentCode || '',
    email: a.email || '',
    institutionType: a.institutionType || 'SCHOOL',
    name: a.name || '',
    tradingName: a.tradingName || '',
    phone: a.phone || '',
    whatsappNumber: a.whatsappNumber || '',
    address: a.address || '',
    nhiaLicenseNumber: a.regulatoryMetadata?.nhia_license_number || (a.institutionType === 'HMO' ? a.regulatorLicenseReference : '') || '',
    cbnLicenseNumber: a.regulatoryMetadata?.cbn_license_number || ((a.institutionType === 'BANK' || a.institutionType === 'PTSP') ? a.regulatorLicenseReference : '') || '',
    ministryApprovalNumber: a.regulatoryMetadata?.ministry_approval_number || (a.institutionType === 'SCHOOL' ? a.regulatorLicenseReference : '') || '',
    cacNumber: a.cacNumber || a.regulatoryMetadata?.cac_registration_number || '',
    tin: a.tin || a.regulatoryMetadata?.tax_identification_number || '',
  }
  showEditDialog.value = true
}

const saveEditProfile = async () => {
  savingEditProfile.value = true
  try {
    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    const res = await axios.patch(`/api/admin/agents/${editForm.value.id}`, {
      institutionType: editForm.value.institutionType,
      name: editForm.value.name,
      tradingName: editForm.value.tradingName,
      phone: editForm.value.phone,
      whatsappNumber: editForm.value.whatsappNumber,
      address: editForm.value.address,
      nhiaLicenseNumber: editForm.value.nhiaLicenseNumber,
      cbnLicenseNumber: editForm.value.cbnLicenseNumber,
      ministryApprovalNumber: editForm.value.ministryApprovalNumber,
      cacNumber: editForm.value.cacNumber,
      tin: editForm.value.tin,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    $q.notify({ type: 'positive', message: 'Institute profile updated successfully', position: 'top-right' })
    showEditDialog.value = false

    const updatedData = res.data?.agent || res.data?.data
    if (updatedData) {
      selectedAgent.value = { ...selectedAgent.value, ...updatedData }
      const inList = agents.value.find(a => a.id === editForm.value.id)
      if (inList) {
        Object.assign(inList, updatedData)
      }
    }
    fetchAgents()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Update failed: ${msg}`, position: 'top-right' })
  } finally {
    savingEditProfile.value = false
  }
}

const approveAgentStatus = async () => {
  if (!selectedAgent.value) return
  loadingStatus.value = true
  try {
    const token = localStorage.getItem('invify_access_token')
    await axios.patch(`/api/admin/agents/${selectedAgent.value.id}/status`, {
      status: 'ACTIVE'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    selectedAgent.value.status = 'ACTIVE'
    selectedAgent.value.kycStatus = 'VERIFIED'
    $q.notify({ type: 'positive', message: `Agent approved and activated successfully`, position: 'top-right' })
    fetchAgents() // Refresh list in background
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to approve agent: ${msg}`, position: 'top-right' })
  } finally {
    loadingStatus.value = false
  }
}

const toggleAgentStatus = async () => {
  if (!selectedAgent.value) return
  
  if (selectedAgent.value.status === 'SUSPENDED') {
    loadingStatus.value = true
    try {
      const token = localStorage.getItem('invify_access_token')
      await axios.patch(`/api/admin/agents/${selectedAgent.value.id}/status`, {
        status: 'ACTIVE'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      selectedAgent.value.status = 'ACTIVE'
      $q.notify({ type: 'positive', message: `Agent status updated to ACTIVE`, position: 'top-right' })
      fetchAgents() // Refresh list in background
    } catch (err) {
      $q.notify({ type: 'negative', message: `Failed to update status: ${err.message}`, position: 'top-right' })
    } finally {
      loadingStatus.value = false
    }
  } else {
    suspensionForm.value = {
      suspensionReason: '',
      requiredAction: 'NONE',
      actionQuestion: '',
      actionAnswer: ''
    }
    showSuspendDialog.value = true
  }
}

const confirmSuspension = async () => {
  if (!suspensionForm.value.suspensionReason.trim()) {
    $q.notify({ type: 'warning', message: 'Suspension reason is required', position: 'top-right' })
    return
  }
  
  loadingStatus.value = true
  try {
    const token = localStorage.getItem('invify_access_token')
    await axios.patch(`/api/admin/agents/${selectedAgent.value.id}/status`, {
      status: 'SUSPENDED',
      suspensionReason: suspensionForm.value.suspensionReason,
      requiredAction: suspensionForm.value.requiredAction,
      actionQuestion: suspensionForm.value.actionQuestion,
      actionAnswer: suspensionForm.value.actionAnswer
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    selectedAgent.value.status = 'SUSPENDED'
    $q.notify({ type: 'positive', message: 'Agent has been suspended', position: 'top-right' })
    showSuspendDialog.value = false
    fetchAgents() // Refresh list in background
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to suspend agent: ${msg}`, position: 'top-right' })
  } finally {
    loadingStatus.value = false
  }
}

const updateKycStatus = async (newKycStatus) => {
  if (!selectedAgent.value) return
  loadingKyc.value = true
  
  try {
    const token = localStorage.getItem('invify_access_token')
    await axios.patch(`/api/admin/agents/${selectedAgent.value.id}/kyc`, {
      kycStatus: newKycStatus
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    selectedAgent.value.kycStatus = newKycStatus
    $q.notify({ type: 'positive', message: `Agent KYC status updated to ${newKycStatus}`, position: 'top-right' })
    fetchAgents() // Refresh list in background
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to update KYC status: ${msg}`, position: 'top-right' })
  } finally {
    loadingKyc.value = false
  }
}

const openIdCard = (idCard) => {
  const newTab = window.open()
  if (newTab) {
    newTab.document.write(`<iframe src="${idCard}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
  }
}

const resendingInvite = ref(false)
const resendInvite = async () => {
  if (!selectedAgent.value?.id) return
  resendingInvite.value = true
  try {
    const token = localStorage.getItem('invify_token') || localStorage.getItem('invify_access_token')
    const res = await axios.post(`/api/admin/agents/${selectedAgent.value.id}/resend-invite`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: res.data?.message || 'Invitation email re-sent', position: 'top-right' })
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Resend failed: ${msg}`, position: 'top-right' })
  } finally {
    resendingInvite.value = false
  }
}

const promptMessageAgent = () => {
  $q.dialog({
    title: 'Direct Message Agent',
    message: 'Send a high-priority system notification to this agent.',
    prompt: {
      model: '',
      type: 'text',
      filled: true,
      dark: true
    },
    cancel: true,
    persistent: true,
    color: 'cyan-3',
    dark: true
  }).onOk(async data => {
    if (!data.trim()) return
    try {
      const token = localStorage.getItem('invify_access_token')
      await axios.post(`/api/admin/agents/${selectedAgent.value.id}/message`, {
        message: data
      }, { headers: { Authorization: `Bearer ${token}` }})
      $q.notify({ type: 'positive', message: 'Message dispatched successfully', position: 'top-right' })
    } catch(e) {
      $q.notify({ type: 'negative', message: 'Failed to send message', position: 'top-right' })
    }
  })
}

const promptMessageTenants = () => {
  $q.dialog({
    title: 'Broadcast to Tenants',
    message: 'Broadcast a message to ALL tenants managed by this agent.',
    prompt: {
      model: '',
      type: 'textarea',
      filled: true,
      dark: true
    },
    cancel: true,
    persistent: true,
    color: 'amber-4',
    dark: true
  }).onOk(async data => {
    if (!data.trim()) return
    try {
      const token = localStorage.getItem('invify_access_token')
      await axios.post(`/api/admin/agents/${selectedAgent.value.id}/message-tenants`, {
        message: data
      }, { headers: { Authorization: `Bearer ${token}` }})
      $q.notify({ type: 'positive', message: 'Broadcast dispatched to tenants', position: 'top-right' })
    } catch(e) {
      $q.notify({ type: 'negative', message: 'Failed to broadcast message', position: 'top-right' })
    }
  })
}

onMounted(() => {
  fetchAgents()
})
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
}

.hover-row:hover {
  background-color: #1a2327 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0b0f12;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #22282d;
  border-radius: 3px;
}
</style>
