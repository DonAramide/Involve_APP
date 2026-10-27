<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md id-card-no-print">
      <div>
        <div class="text-h5 text-weight-bold text-indigo-9">ID Card Management</div>
        <div class="text-caption text-grey-7">Student, staff, and administrator cards for this school.</div>
      </div>
    </div>

    <q-banner v-if="forbidden" class="bg-grey-3 q-mb-md id-card-no-print" rounded>
      Card management is limited to the school owner and a tenant administrator. Gate scans are recorded on Entry and Exit, and they are not saved until school-gate persistence is enabled.
    </q-banner>

    <q-banner v-if="schemaUnapplied" class="bg-amber-2 q-mb-md id-card-no-print" rounded>
      Card settings and issuance are not saved yet. The school ID card migration is still unapplied, so this page can preview templates and sample print layouts only.
    </q-banner>

    <q-banner v-if="errorMessage" class="bg-red-1 q-mb-md id-card-no-print" rounded>
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
              <q-card flat bordered class="q-pa-md cursor-pointer" @click="selectTemplate(template.key)">
                <div class="text-subtitle2">{{ template.name }}</div>
                <div class="text-caption text-grey-7 q-mb-sm">{{ template.description }}</div>
                <q-btn flat color="primary" label="Preview" @click.stop="selectTemplate(template.key)" />
              </q-card>
            </div>
          </div>
          <div class="row q-col-gutter-md q-mt-md">
            <div class="col-auto"><IdCardFace :face="galleryFace" side="front" /></div>
            <div class="col-auto"><IdCardFace :face="galleryFace" side="back" /></div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="settings" class="q-px-none">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6 id-card-no-print">
              <q-select v-model="draft.studentTemplate" :options="templateOptions" label="Student template" emit-value map-options outlined dense class="q-mb-sm" />
              <q-select v-model="draft.staffTemplate" :options="templateOptions" label="Staff template" emit-value map-options outlined dense class="q-mb-sm" />
              <q-select v-model="draft.adminTemplate" :options="templateOptions" label="Administrator template" emit-value map-options outlined dense class="q-mb-sm" />
              <q-select v-model="draft.paperSize" :options="['A4', 'Letter', 'CR80']" label="Paper size" outlined dense class="q-mb-sm" />
              <q-select v-model="draft.logoPlacement" :options="['left', 'center', 'right']" label="Logo placement" outlined dense class="q-mb-sm" />
              <q-input v-model="draft.accentColor" label="Accent color" outlined dense class="q-mb-sm" />
              <q-input v-model="draft.disclaimer" type="textarea" autogrow label="Disclaimer" outlined class="q-mb-sm" />
              <q-input v-model="draft.lostFoundPhone" label="Lost card phone" outlined dense class="q-mb-sm" />
              <q-input v-model="draft.lostFoundEmail" label="Lost card email" outlined dense class="q-mb-sm" />
              <div class="text-caption text-grey-7 q-mb-sm">
                Notification switches stay off. Delivery is not part of ID card management. A signature image can be saved only after an approved upload store is configured.
              </div>
              <q-btn outline color="primary" label="Choose signature image" class="q-mr-sm" @click="uploadSignature" />
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
          <div class="q-mb-md">
            <q-btn outline color="primary" label="Refresh" class="q-mr-sm" @click="loadCards" />
            <q-btn color="primary" label="Print selected" :disable="!selected.length" @click="printSelected" />
          </div>
          <q-banner class="bg-blue-1 q-mb-md" rounded>
            Printing issues a new barcode. If a card is already active, printing replaces it and the previous barcode stops working. The barcode stays on screen for this print and is not stored.
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
          <div v-if="!people.length" class="text-grey-7 q-mt-md">No eligible identities are loaded.</div>
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
          <q-banner class="bg-blue-1 q-mb-md id-card-no-print" rounded>{{ printPlan.instruction }}</q-banner>
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
import { DEFAULT_DISCLAIMER, ID_CARD_TEMPLATES, sampleFace } from './id-cards/templates'
import { buildPrintPlan } from './id-cards/print-plan'

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
      printPeople: [sampleFace('classic_school', 'STUDENT'), sampleFace('classic_school', 'STAFF')]
    }
  },
  computed: {
    templateOptions() {
      return this.templates.map((template) => ({ label: template.name, value: template.key }))
    },
    categoryOptions() {
      return [
        { label: 'Student', value: 'STUDENT' },
        { label: 'Staff', value: 'STAFF' },
        { label: 'Administrator', value: 'ADMIN' }
      ]
    },
    galleryFace() {
      return sampleFace(this.previewTemplate, this.previewCategory)
    },
    settingsPreview() {
      const face = sampleFace(this.draft.studentTemplate, 'STUDENT')
      return {
        ...face,
        disclaimer: this.draft.disclaimer,
        accentColor: this.draft.accentColor,
        logoPlacement: this.draft.logoPlacement,
        lostFoundPhone: this.draft.lostFoundPhone,
        lostFoundEmail: this.draft.lostFoundEmail,
        cardWidthMm: Number(this.draft.cardWidthMm) || 85.6,
        cardHeightMm: Number(this.draft.cardHeightMm) || 53.98,
        paperSize: this.draft.paperSize
      }
    },
    printPlan() {
      return buildPrintPlan(this.printPeople, this.printMode)
    }
  },
  mounted() {
    this.loadTemplates()
  },
  methods: {
    selectTemplate(key) {
      this.previewTemplate = key
      this.previewCategory = this.galleryCategory
      if (this.galleryCategory === 'STUDENT') this.draft.studentTemplate = key
      if (this.galleryCategory === 'STAFF') this.draft.staffTemplate = key
      if (this.galleryCategory === 'ADMIN') this.draft.adminTemplate = key
    },
    async loadTemplates() {
      try {
        const response = await schoolIdCardsApi.templates()
        const keys = response.data.templates || []
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
        await schoolIdCardsApi.saveSettings({
          ...this.draft,
          lostFoundPhone: this.draft.lostFoundPhone || null,
          lostFoundEmail: this.draft.lostFoundEmail || null,
          notifyStudentArrival: false,
          notifyStudentDeparture: false,
          notifyStaffArrival: false,
          notifyStaffDeparture: false
        })
      } catch (error) {
        this.noteError(error)
      } finally {
        this.saving = false
      }
    },
    async uploadSignature() {
      try {
        await schoolIdCardsApi.signature()
      } catch (error) {
        this.noteError(error)
      }
    },
    async loadCards() {
      this.errorMessage = ''
      try {
        const response = await schoolIdCardsApi.eligible()
        const data = response.data || {}
        this.people = [...(data.students || []), ...(data.staff || []), ...(data.administrators || [])]
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
        sampleFace(this.draft.studentTemplate, 'STUDENT'),
        sampleFace(this.draft.staffTemplate, 'STAFF'),
        sampleFace(this.draft.adminTemplate, 'ADMIN')
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
      this.errorMessage = data.error || 'The ID card request could not be completed.'
    }
  }
}
</script>

<style>
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
}
.id-print-pass { font-size: 8pt; margin-bottom: 2mm; color: #333; }
</style>
