<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md id-card-no-print">
      <div>
        <div class="text-h5 text-weight-bold text-indigo-9">ID Card Management</div>
        <div class="text-caption id-card-page-copy">{{ workplaceCopy }}</div>
      </div>
    </div>

    <q-banner v-if="forbidden" class="bg-grey-8 text-grey-1 q-mb-md id-card-no-print" rounded>
      Card management is limited to the owner and a tenant administrator. Gate scans are recorded on the gate clock page, and they are not saved until gate persistence is enabled.
    </q-banner>

    <q-banner v-if="schemaUnapplied" class="id-card-warning-banner q-mb-md id-card-no-print" rounded>
      Card settings and issuance are not saved yet. The ID card migration is still unapplied, so this page can preview templates and sample print layouts only.
    </q-banner>

    <q-banner v-if="errorMessage" class="bg-red-9 text-red-1 q-mb-md id-card-no-print" rounded>
      {{ errorMessage }}
    </q-banner>

    <div v-if="!forbidden">
      <q-tabs v-model="tab" dense align="left" class="text-primary id-card-no-print" active-color="primary" indicator-color="primary">
        <q-tab name="templates" label="Templates" />
        <q-tab name="settings" label="Settings" />
        <q-tab name="cards" label="Cards" />
        <q-tab name="print" label="Print" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated class="bg-transparent">
        <q-tab-panel name="templates" class="q-px-none">
          <div class="q-mb-md id-card-no-print">
            <q-btn-toggle v-model="galleryCategory" toggle-color="primary" :options="categoryOptions" />
          </div>
          <div class="row q-col-gutter-md id-card-no-print">
            <div v-for="template in templates" :key="template.key" class="col-12 col-md-6 col-lg-4">
              <q-card
                flat
                bordered
                class="q-pa-md cursor-pointer id-card-picker"
                :class="{ 'id-card-picker--selected': previewTemplate === template.key }"
                @click="selectTemplate(template.key)"
              >
                <div class="id-card-thumb" :class="'id-card-thumb--' + template.key">
                  <IdCardFace :face="thumbFace(template.key)" side="front" />
                </div>
                <div class="text-subtitle2">{{ template.name }}</div>
                <div class="text-caption id-card-page-copy q-mb-sm">{{ template.description }}</div>
                <q-btn flat color="primary" label="Preview" @click.stop="selectTemplate(template.key)" />
              </q-card>
            </div>
          </div>
          <div class="row q-col-gutter-md q-mt-md items-start">
            <div class="col-auto"><IdCardFace :face="galleryFace" side="front" /></div>
            <div class="col-auto"><IdCardFace :face="galleryFace" side="back" /></div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="settings" class="q-px-none">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6 id-card-no-print">
              <q-select v-model="draft.studentTemplate" :options="templateOptions" :label="`${terms.beneficiary} template`" emit-value map-options outlined dense class="q-mb-sm" />
              <q-select v-model="draft.staffTemplate" :options="templateOptions" :label="`${terms.staffShort} template`" emit-value map-options outlined dense class="q-mb-sm" />
              <q-select v-model="draft.adminTemplate" :options="templateOptions" :label="`${terms.administrator} template`" emit-value map-options outlined dense class="q-mb-sm" />
              <q-select v-model="draft.paperSize" :options="['A4', 'Letter', 'CR80']" label="Paper size" outlined dense class="q-mb-sm" />
              <q-select v-model="draft.logoPlacement" :options="['left', 'center', 'right']" label="Logo placement" outlined dense class="q-mb-sm" />
              <div class="row items-center q-col-gutter-sm q-mb-sm">
                <div class="col">
                  <q-input v-model="draft.accentColor" label="Accent color" outlined dense />
                </div>
                <input
                  class="id-card-accent-swatch"
                  type="color"
                  :value="accentSwatch"
                  aria-label="Accent color picker"
                  @input="draft.accentColor = $event.target.value"
                >
              </div>
              <q-input v-model="draft.disclaimer" type="textarea" autogrow label="Disclaimer" outlined class="q-mb-sm" />
              <q-input v-model="draft.lostFoundPhone" label="Lost card phone" outlined dense class="q-mb-sm" />
              <q-input v-model="draft.lostFoundEmail" label="Lost card email" outlined dense class="q-mb-sm" />
              <div class="text-caption id-card-page-copy q-mb-sm">
                Notification switches stay off. Delivery is not part of ID card management. A signature image cannot be uploaded yet because a private, school-scoped store is not configured.
              </div>
              <q-btn outline color="primary" label="Choose signature image" class="q-mr-sm" disable />
              <q-btn color="primary" label="Save settings" :loading="saving" @click="saveSettings" />
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption q-mb-sm id-card-no-print">Preview before saving</div>
              <IdCardFace :face="settingsPreview" side="front" />
              <div class="q-mt-sm"><IdCardFace :face="settingsPreview" side="back" /></div>
            </div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="cards" class="q-px-none id-card-no-print">
          <div class="q-mb-md row q-gutter-sm items-center">
            <q-btn outline color="primary" label="Refresh" @click="loadCards" />
            <q-btn color="primary" label="Print selected (browser)" :disable="!selected.length" @click="printSelected" />
            <q-btn color="teal-6" text-color="black" label="Publish for mobile print" :disable="!selected.length" :loading="publishingMobile" @click="publishForMobile" />
          </div>
          <q-banner class="id-card-info-banner q-mb-md" rounded>
            Browser print issues a new barcode for paper/CR80. <b>Publish for mobile print</b> issues the same people so the phone can open ID Card → Issue/Print, attach the {{ terms.beneficiary.toLowerCase() }} photo saved on the device, and print on a paired 58mm/80mm Bluetooth printer.
          </q-banner>
          <q-list bordered separator>
            <q-item v-for="person in people" :key="person.subjectType + person.subjectId">
              <q-item-section side>
                <q-checkbox v-model="selected" :val="person" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ person.name }}</q-item-label>
                <q-item-label caption>{{ person.subjectType }} · {{ person.printedCode }} · {{ person.cardStatus }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat color="primary" label="Print" @click="printPeopleNow([person])" />
                <q-btn v-if="person.activeCardId" flat color="negative" label="Revoke" @click="revokePerson(person)" />
              </q-item-section>
            </q-item>
          </q-list>
          <div v-if="!people.length" class="id-card-empty q-mt-md">No eligible identities are loaded.</div>
          <q-dialog v-model="revokeOpen">
            <q-card style="min-width: 360px">
              <q-card-section class="text-subtitle1">Revoke card</q-card-section>
              <q-card-section>
                <q-input v-model="revokeReason" type="textarea" autogrow label="Reason" outlined />
              </q-card-section>
              <q-card-actions align="right">
                <q-btn flat label="Cancel" v-close-popup />
                <q-btn color="negative" label="Revoke" @click="confirmRevoke" />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </q-tab-panel>

        <q-tab-panel name="print" class="q-px-none">
          <div class="id-card-no-print q-mb-md">
            <q-btn-toggle v-model="printMode" toggle-color="primary" :options="printModes" class="q-mr-sm" />
            <q-btn color="primary" label="Print sample layout" @click="printSample" />
          </div>
          <q-banner class="id-card-info-banner q-mb-md id-card-no-print" rounded>{{ printPlan.instruction }}</q-banner>
          <div class="id-print-root">
            <section v-for="page in printPlan.pages" :key="`${page.pass}-${page.side}-${page.pairId}`" class="id-print-sheet">
              <div class="id-print-pass">{{ printMode === 'manual' ? `Pass ${page.pass}` : 'Duplex sheet' }} · {{ page.side }}</div>
              <IdCardFace :face="page.person" :side="page.side" />
            </section>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script>
import IdCardFace from './id-cards/IdCardFace.vue'
import { schoolIdCardsApi } from '../../api/schoolIdCards'
import { adminApi } from '../../api'
import { DEFAULT_DISCLAIMER, ID_CARD_TEMPLATES, normalizeAccent, sampleFace } from './id-cards/templates'
import { buildPrintPlan } from './id-cards/print-plan'
import { serviceModeTerms } from '../../utils/serviceModeTerms'
import { tenantIndustry } from '../../utils/tenantIndustry'

function getTenantIdFromToken() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    if (!token) return localStorage.getItem('tenant_id') || ''
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.tenant_id || payload.tenantId || localStorage.getItem('tenant_id') || ''
  } catch {
    return localStorage.getItem('tenant_id') || ''
  }
}

function draftSettings() {
  return {
    studentTemplate: 'classic_school',
    staffTemplate: 'modern_corporate',
    adminTemplate: 'premium_identity',
    paperSize: 'A4',
    cardWidthMm: 85.6,
    cardHeightMm: 53.98,
    printOrientation: 'portrait',
    logoPlacement: 'left',
    accentColor: '#1F4B99',
    showAddress: true,
    showClassOrDepartment: true,
    showStatus: true,
    showIssueDate: true,
    showExpiry: false,
    disclaimer: DEFAULT_DISCLAIMER,
    signatureImageUrl: null,
    signatoryName: null,
    signatoryDesignation: null,
    lostFoundPhone: '',
    lostFoundEmail: '',
    notifyStudentArrival: false,
    notifyStudentDeparture: false,
    notifyStaffArrival: false,
    notifyStaffDeparture: false,
    trackAdminEntry: false,
    duplicateScanWindowSeconds: 45
  }
}

function pickSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const next = draftSettings()
  const paper = String(src.paperSize || next.paperSize)
  const logo = String(src.logoPlacement || next.logoPlacement)
  const orientation = String(src.printOrientation || next.printOrientation)
  next.studentTemplate = src.studentTemplate || next.studentTemplate
  next.staffTemplate = src.staffTemplate || next.staffTemplate
  next.adminTemplate = src.adminTemplate || next.adminTemplate
  next.paperSize = ['A4', 'Letter', 'CR80'].includes(paper) ? paper : 'A4'
  next.logoPlacement = ['left', 'center', 'right'].includes(logo) ? logo : 'left'
  next.printOrientation = ['portrait', 'landscape'].includes(orientation) ? orientation : 'portrait'
  next.accentColor = normalizeAccent(src.accentColor || next.accentColor, next.accentColor)
  next.cardWidthMm = Number(src.cardWidthMm || next.cardWidthMm)
  next.cardHeightMm = Number(src.cardHeightMm || next.cardHeightMm)
  next.duplicateScanWindowSeconds = Number(src.duplicateScanWindowSeconds || next.duplicateScanWindowSeconds)
  next.disclaimer = String(src.disclaimer || next.disclaimer)
  next.lostFoundPhone = src.lostFoundPhone ? String(src.lostFoundPhone).trim() : ''
  next.lostFoundEmail = src.lostFoundEmail ? String(src.lostFoundEmail).trim() : ''
  next.showAddress = src.showAddress !== false
  next.showClassOrDepartment = src.showClassOrDepartment !== false
  next.showStatus = src.showStatus !== false
  next.showIssueDate = src.showIssueDate !== false
  next.showExpiry = src.showExpiry === true
  next.signatureImageUrl = null
  next.signatoryName = null
  next.signatoryDesignation = null
  next.notifyStudentArrival = false
  next.notifyStudentDeparture = false
  next.notifyStaffArrival = false
  next.notifyStaffDeparture = false
  if (!(next.cardWidthMm >= 50 && next.cardWidthMm <= 120)) next.cardWidthMm = 85.6
  if (!(next.cardHeightMm >= 30 && next.cardHeightMm <= 90)) next.cardHeightMm = 53.98
  if (!(next.duplicateScanWindowSeconds >= 5 && next.duplicateScanWindowSeconds <= 300)) next.duplicateScanWindowSeconds = 45
  return next
}

export default {
  name: 'IdCardManagementPage',
  components: { IdCardFace },
  data() {
    return {
      tab: 'templates',
      templates: ID_CARD_TEMPLATES,
      draft: draftSettings(),
      previewTemplate: 'classic_school',
      previewCategory: 'STUDENT',
      galleryCategory: 'STUDENT',
      forbidden: false,
      schemaUnapplied: false,
      errorMessage: '',
      saving: false,
      people: [],
      selected: [],
      revokeOpen: false,
      revokeTarget: null,
      revokeReason: '',
      printMode: 'manual',
      printModes: [
        { label: 'Manual two-pass', value: 'manual' },
        { label: 'Duplex', value: 'duplex' }
      ],
      printPeople: [sampleFace('classic_school', 'STUDENT'), sampleFace('classic_school', 'STAFF')],
      schoolName: localStorage.getItem('active_business_name') || '',
      schoolAddress: '',
      publishingMobile: false
    }
  },
  computed: {
    templateOptions() {
      const list = Array.isArray(this.templates) ? this.templates : ID_CARD_TEMPLATES
      return list.map((template) => ({ label: template.name, value: template.key }))
    },
    terms() {
      return serviceModeTerms(tenantIndustry())
    },
    categoryOptions() {
      const t = this.terms
      return [
        { label: t.beneficiary, value: 'STUDENT' },
        { label: t.staffShort, value: 'STAFF' },
        { label: t.administrator, value: 'ADMIN' }
      ]
    },
    accentSwatch() {
      return normalizeAccent(this.draft.accentColor, '#1F4B99')
    },
    workplaceCopy() {
      return this.terms.idCardSubtitle
    },
    galleryFace() {
      return this.withDraft(sampleFace(this.previewTemplate, this.galleryCategory))
    },
    settingsPreview() {
      return this.withDraft(sampleFace(this.draft.studentTemplate, 'STUDENT'))
    },
    printPlan() {
      return buildPrintPlan(this.printPeople, this.printMode)
    }
  },
  mounted() {
    this.loadSchoolBranding()
    this.loadTemplates()
    this.loadSettings()
  },
  methods: {
    withDraft(face) {
      return {
        ...face,
        schoolName: this.schoolName || face.schoolName,
        address: this.schoolAddress || face.address,
        disclaimer: this.draft.disclaimer || face.disclaimer,
        accentColor: normalizeAccent(this.draft.accentColor, face.accentColor),
        logoPlacement: this.draft.logoPlacement || face.logoPlacement,
        lostFoundPhone: this.draft.lostFoundPhone || null,
        lostFoundEmail: this.draft.lostFoundEmail || null,
        paperSize: this.draft.paperSize || face.paperSize,
        sample: true
      }
    },
    thumbFace(key) {
      return this.withDraft(sampleFace(key, this.galleryCategory))
    },
    selectTemplate(key) {
      this.previewTemplate = key
      this.previewCategory = this.galleryCategory
      if (this.galleryCategory === 'STUDENT') this.draft.studentTemplate = key
      if (this.galleryCategory === 'STAFF') this.draft.staffTemplate = key
      if (this.galleryCategory === 'ADMIN') this.draft.adminTemplate = key
    },
    async loadSchoolBranding() {
      const tenantId = getTenantIdFromToken()
      if (!tenantId) {
        this.schoolName = localStorage.getItem('active_business_name') || this.schoolName
        return
      }
      try {
        const res = await adminApi.getTenantDetails(tenantId)
        const tenant = res.data?.tenant || res.data?.data?.tenant || null
        if (tenant?.name) {
          this.schoolName = tenant.name
          localStorage.setItem('active_business_name', tenant.name)
        }
        const address = [tenant?.street_address, tenant?.city, tenant?.state].filter(Boolean).join(', ')
        if (address) this.schoolAddress = address
      } catch {
        this.schoolName = localStorage.getItem('active_business_name') || this.schoolName
      }
    },
    async loadSettings() {
      try {
        const response = await schoolIdCardsApi.settings()
        const settings = response.data?.settings
        if (settings && typeof settings === 'object') {
          this.draft = pickSettings({ ...this.draft, ...settings })
        }
      } catch (error) {
        this.noteError(error)
      }
    },
    async loadTemplates() {
      try {
        const response = await schoolIdCardsApi.templates()
        const keys = Array.isArray(response.data?.templates) ? response.data.templates : []
        if (keys.length === 6) {
          this.templates = ID_CARD_TEMPLATES.filter((template) => keys.includes(template.key))
        }
        await this.loadCards()
      } catch (error) {
        this.noteError(error)
      }
    },
    async saveSettings() {
      this.saving = true
      this.errorMessage = ''
      try {
        const payload = pickSettings(this.draft)
        this.draft = payload
        const response = await schoolIdCardsApi.saveSettings({
          ...payload,
          lostFoundPhone: payload.lostFoundPhone || null,
          lostFoundEmail: payload.lostFoundEmail || null
        })
        if (response.data?.settings && typeof response.data.settings === 'object') {
          this.draft = pickSettings({ ...payload, ...response.data.settings })
        }
        this.$q?.notify?.({ type: 'positive', message: 'ID card settings saved.' })
      } catch (error) {
        this.noteError(error)
      } finally {
        this.saving = false
      }
    },
    async uploadSignature() {
      this.errorMessage = 'A signature image cannot be uploaded yet because a private, school-scoped store is not configured.'
    },
    async loadCards() {
      this.errorMessage = ''
      try {
        const response = await schoolIdCardsApi.eligible()
        const data = response.data || {}
        const students = Array.isArray(data.students) ? data.students : []
        const staff = Array.isArray(data.staff) ? data.staff : []
        const administrators = Array.isArray(data.administrators) ? data.administrators : []
        this.people = [...students, ...staff, ...administrators]
        this.selected = Array.isArray(this.selected) ? this.selected : []
      } catch (error) {
        this.noteError(error)
      }
    },
    printSelected() {
      this.printPeopleNow(this.selected)
    },
    async printPeopleNow(people) {
      this.errorMessage = ''
      try {
        const response = await schoolIdCardsApi.batch(people.map((person) => ({
          subjectType: person.subjectType,
          subjectId: person.subjectId
        })))
        this.printPeople = (response.data.cards || []).map((item) => item.face)
        this.tab = 'print'
        this.$nextTick(() => window.print())
        await this.loadCards()
      } catch (error) {
        this.noteError(error)
      }
    },
    async publishForMobile() {
      if (!this.selected.length) return
      this.errorMessage = ''
      this.publishingMobile = true
      try {
        await schoolIdCardsApi.batch(this.selected.map((person) => ({
          subjectType: person.subjectType,
          subjectId: person.subjectId
        })))
        await this.loadCards()
        this.$q.notify({
          type: 'positive',
          message: `Published ${this.selected.length} card(s) for mobile. On the phone: ID Card → Issue/Print. ${this.terms.beneficiary} photo is taken from the photo saved on that phone, then sent to the Bluetooth printer.`,
          timeout: 8000
        })
        this.selected = []
      } catch (error) {
        this.noteError(error)
      } finally {
        this.publishingMobile = false
      }
    },
    revokePerson(person) {
      this.revokeTarget = person
      this.revokeReason = ''
      this.revokeOpen = true
    },
    async confirmRevoke() {
      if (!this.revokeTarget?.activeCardId) return
      try {
        await schoolIdCardsApi.revoke(this.revokeTarget.activeCardId, this.revokeReason)
        this.revokeOpen = false
        await this.loadCards()
      } catch (error) {
        this.noteError(error)
      }
    },
    printSample() {
      this.printPeople = [
        this.withDraft(sampleFace(this.draft.studentTemplate, 'STUDENT')),
        this.withDraft(sampleFace(this.draft.staffTemplate, 'STAFF')),
        this.withDraft(sampleFace(this.draft.adminTemplate, 'ADMIN'))
      ]
      this.$nextTick(() => window.print())
    },
    noteError(error) {
      const status = error?.response?.status
      const data = error?.response?.data || {}
      if (status === 403) {
        this.forbidden = true
        return
      }
      if (data.code === 'SCHOOL_GATE_SCHEMA_UNAPPLIED') {
        this.schemaUnapplied = true
        return
      }
      if (data.code === 'SIGNATURE_STORAGE_UNCONFIGURED' || /signature store is not configured/i.test(data.error || '')) {
        this.errorMessage = 'A signature image cannot be uploaded yet because a private, school-scoped store is not configured.'
        return
      }
      const raw = data.error
      this.errorMessage = typeof raw === 'string'
        ? raw
        : (raw?.message || data.message || 'The ID card request could not be completed.')
    }
  }
}
</script>

<style>
.id-card-warning-banner,
.id-card-warning-banner.q-banner,
.id-card-warning-banner .q-banner__content,
.id-card-warning-banner .q-banner__content * {
  background: #78350f !important;
  color: #fff7ed !important;
}
.id-card-info-banner,
.id-card-info-banner.q-banner,
.id-card-info-banner .q-banner__content {
  background: #1e3a8a !important;
  color: #ffffff !important;
}
.id-card-info-banner .q-banner__content * {
  color: #ffffff !important;
}
.id-card-empty { color: #e2e8f0; }
.id-card-page-copy,
.id-card-page-copy.text-grey-7,
.id-card-page-copy.text-caption {
  color: #cbd5e1 !important;
}
@media print {
  .q-header,
  .q-drawer,
  .q-footer,
  .q-page-sticky,
  .id-card-no-print { display: none !important; }
  .id-print-root { display: block !important; }
  .id-print-sheet {
    break-after: page;
    page-break-after: always;
    margin: 0 0 8mm;
  }
  .id-print-sheet:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  @page { margin: 10mm; }
  .id-print-pass { color: #333; }
}
.id-print-pass { font-size: 8pt; margin-bottom: 2mm; color: #e2e8f0; }
.id-card-picker { min-height: 100%; }
.id-card-picker--selected { outline: 2px solid #3b82f6; outline-offset: -1px; }
.id-card-thumb {
  height: 124px;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 8px;
  pointer-events: none;
  background: #0f172a;
  border-radius: 8px;
  padding-top: 10px;
}
.id-card-thumb .id-card-face {
  transform: scale(0.42);
  transform-origin: top center;
}
.id-card-thumb--modern_corporate .id-card-face,
.id-card-thumb--academic_blue .id-card-face,
.id-card-thumb--premium_identity .id-card-face,
.id-card-thumb--compact_barcode .id-card-face {
  transform: scale(0.31);
}
.id-card-accent-swatch {
  width: 42px;
  height: 40px;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
</style>
