<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold text-indigo-9">School Roster (Web Sync)</div>
      <q-space />
      <q-btn color="primary" icon="refresh" label="Refresh" @click="fetchData" :loading="loading" />
    </div>

    <q-banner v-if="loadError" class="bg-negative text-white q-mb-md" rounded>
      {{ loadError }}
    </q-banner>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3" v-for="card in summaryCards" :key="card.label">
        <q-card flat bordered class="q-pa-md">
          <div class="text-caption text-grey-7">{{ card.label }}</div>
          <div class="text-h5 text-weight-bold">{{ card.value }}</div>
        </q-card>
      </div>
    </div>

    <q-tabs v-model="tab" dense class="text-primary" active-color="primary" indicator-color="primary" align="left">
      <q-tab name="students" label="Students" />
      <q-tab name="parents" label="Parents" />
      <q-tab name="teachers" label="Teachers" />
      <q-tab name="classes" label="Classes" />
      <q-tab name="subjects" label="Subjects" />
      <q-tab name="results" label="Results" />
      <q-tab name="terms" label="Terms" />
      <q-tab name="years" label="Years" />
    </q-tabs>
    <q-separator />

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="students">
        <q-table
          class="roster-table cursor-pointer"
          :rows="students"
          :columns="studentColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('student', row)"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="text-primary text-weight-medium">
              {{ props.value }}
              <q-icon name="chevron_right" size="xs" class="q-ml-xs" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="parents">
        <q-table
          class="roster-table cursor-pointer"
          :rows="parents"
          :columns="parentColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('parent', row)"
        />
      </q-tab-panel>
      <q-tab-panel name="teachers">
        <q-table
          class="roster-table cursor-pointer"
          :rows="teachers"
          :columns="teacherColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('teacher', row)"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="text-primary text-weight-medium">
              {{ props.value }}
              <q-icon name="chevron_right" size="xs" class="q-ml-xs" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="classes">
        <q-table
          class="roster-table cursor-pointer"
          :rows="classes"
          :columns="simpleColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('class', row)"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="text-primary text-weight-medium">
              {{ props.value }}
              <q-icon name="chevron_right" size="xs" class="q-ml-xs" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="subjects">
        <q-table
          class="roster-table cursor-pointer"
          :rows="subjects"
          :columns="subjectColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('subject', row)"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="text-primary text-weight-medium">
              {{ props.value }}
              <q-icon name="chevron_right" size="xs" class="q-ml-xs" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="results">
        <q-table
          class="roster-table cursor-pointer"
          :rows="results"
          :columns="resultColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('result', row)"
        />
      </q-tab-panel>
      <q-tab-panel name="terms">
        <q-table
          class="roster-table cursor-pointer"
          :rows="terms"
          :columns="termColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('term', row)"
        />
      </q-tab-panel>
      <q-tab-panel name="years">
        <q-table
          class="roster-table cursor-pointer"
          :rows="years"
          :columns="yearColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          @row-click="(_, row) => openProfile('year', row)"
        />
      </q-tab-panel>
    </q-tab-panels>

    <!-- Entity profile drawer -->
    <q-drawer
      v-model="drawerOpen"
      side="right"
      overlay
      bordered
      :width="440"
      class="bg-white"
    >
      <div v-if="selected" class="column full-height">
        <div class="row items-center q-pa-md bg-indigo-1">
          <q-avatar color="primary" text-color="white" size="48px" class="q-mr-md">
            {{ selectedInitials }}
          </q-avatar>
          <div class="col">
            <div class="text-caption text-grey-7 text-uppercase">{{ selectedTypeLabel }}</div>
            <div class="text-h6 text-weight-bold">{{ selectedTitle }}</div>
            <div v-if="selectedSubtitle" class="text-caption text-grey-7">{{ selectedSubtitle }}</div>
          </div>
          <q-btn flat round dense icon="close" @click="drawerOpen = false" />
        </div>

        <q-scroll-area class="col" style="min-height: 0">
          <div class="q-pa-md">
            <!-- Status chips -->
            <div class="row q-gutter-sm q-mb-md" v-if="selectedChips.length">
              <q-chip
                v-for="chip in selectedChips"
                :key="chip.label"
                :color="chip.color"
                :text-color="chip.textColor"
                size="sm"
                dense
              >
                {{ chip.label }}
              </q-chip>
            </div>

            <!-- Field grid -->
            <div class="text-caption text-grey-7 text-uppercase q-mb-sm">Details</div>
            <q-list bordered separator class="rounded-borders q-mb-md">
              <q-item v-for="field in selectedFields" :key="field.label">
                <q-item-section>
                  <q-item-label caption>{{ field.label }}</q-item-label>
                  <q-item-label class="text-body2 text-weight-medium">{{ field.value }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <!-- Related students for a class -->
            <div v-if="(selected.type === 'class' || selected.type === 'parent') && relatedStudents.length" class="q-mb-md">
              <div class="text-caption text-grey-7 text-uppercase q-mb-sm">
                {{ selected.type === 'parent' ? 'Children' : 'Students in class' }} ({{ relatedStudents.length }})
              </div>
              <q-list bordered separator class="rounded-borders">
                <q-item
                  v-for="s in relatedStudents"
                  :key="s.id"
                  clickable
                  v-ripple
                  @click="openProfile('student', s)"
                >
                  <q-item-section>
                    <q-item-label>{{ studentName(s) }}</q-item-label>
                    <q-item-label caption>{{ s.admission_number || s.admissionNumber || '—' }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label :class="balanceClass(s.running_balance ?? s.balance)">
                      {{ formatMoney(s.running_balance ?? s.balance) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Related results for student / subject -->
            <div v-if="relatedResults.length" class="q-mb-md">
              <div class="text-caption text-grey-7 text-uppercase q-mb-sm">
                Academic results ({{ relatedResults.length }})
              </div>
              <q-list bordered separator class="rounded-borders">
                <q-item v-for="(r, idx) in relatedResults" :key="r.id || idx">
                  <q-item-section>
                    <q-item-label>
                      {{ resolveSubjectName(r) }} · {{ resolveStudentName(r) }}
                    </q-item-label>
                    <q-item-label caption>
                      Score {{ r.totalScore ?? r.total_score ?? '—' }} · Grade {{ r.grade || '—' }}
                      <span v-if="r.remarks"> · {{ r.remarks }}</span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Raw payload for anything else synced -->
            <div v-if="extraPayloadKeys.length">
              <div class="text-caption text-grey-7 text-uppercase q-mb-sm">Synced fields</div>
              <q-list bordered separator class="rounded-borders">
                <q-item v-for="key in extraPayloadKeys" :key="key">
                  <q-item-section>
                    <q-item-label caption>{{ key }}</q-item-label>
                    <q-item-label class="text-body2">{{ formatFieldValue(selected.row[key]) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-scroll-area>
      </div>
    </q-drawer>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import { schoolApi } from 'src/api'

const emptyRoster = () => ({
  students: [],
  teachers: [],
  classes: [],
  subjects: [],
  results: [],
  years: [],
  terms: [],
  parents: [],
})

const loading = ref(false)
const tab = ref('students')
const loadError = ref('')
const roster = ref(emptyRoster())

const drawerOpen = ref(false)
const selected = ref(null)

const students = computed(() => roster.value.students || [])
const teachers = computed(() => roster.value.teachers || [])
const classes = computed(() => roster.value.classes || [])
const subjects = computed(() => roster.value.subjects || [])
const results = computed(() => roster.value.results || [])
const terms = computed(() => roster.value.terms || [])
const years = computed(() => roster.value.years || [])
const parents = computed(() => {
  const rows = roster.value.parents || []
  const kids = students.value
  return rows.map((p) => {
    const children = kids.filter(
      (s) => String(s.parentSyncId || '') === String(p.id || p.syncId || ''),
    )
    const outstanding = children.reduce(
      (n, s) => n + Number(s.running_balance ?? s.balance ?? 0),
      0,
    )
    return { ...p, childCount: children.length, outstanding, children }
  })
})

const summaryCards = computed(() => [
  { label: 'Students', value: students.value.length },
  { label: 'Teachers', value: teachers.value.length },
  { label: 'Classes', value: classes.value.length },
  { label: 'Subjects', value: subjects.value.length },
  { label: 'Parents', value: parents.value.length },
])

const studentColumns = [
  { name: 'admission', label: 'Admission No', field: (r) => r.admission_number || r.admissionNumber, align: 'left' },
  { name: 'name', label: 'Name', field: (r) => studentName(r), align: 'left' },
  { name: 'class', label: 'Class', field: (r) => r.current_class || r.className || '—', align: 'left' },
  { name: 'balance', label: 'Balance', field: (r) => r.running_balance ?? r.balance ?? 0, align: 'right' },
]

const teacherColumns = [
  { name: 'name', label: 'Name', field: (r) => r.fullName || r.name || '—', align: 'left' },
  { name: 'phone', label: 'Phone', field: (r) => r.phone || '—', align: 'left' },
  { name: 'profession', label: 'Profession', field: (r) => r.profession || '—', align: 'left' },
  { name: 'classes', label: 'Classes', field: (r) => r.classNames || '—', align: 'left' },
  { name: 'subjects', label: 'Subjects', field: (r) => r.subjectNames || '—', align: 'left' },
]

const simpleColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'description', label: 'Description', field: (r) => r.description || '—', align: 'left' },
]

const subjectColumns = [
  { name: 'name', label: 'Subject', field: 'name', align: 'left' },
  { name: 'code', label: 'Code', field: (r) => r.code || '—', align: 'left' },
  { name: 'teachers', label: 'Teachers', field: (r) => r.teacherNames || '—', align: 'left' },
  { name: 'classes', label: 'Classes', field: (r) => r.classNames || '—', align: 'left' },
]

const resultColumns = [
  { name: 'student', label: 'Student', field: (r) => resolveStudentName(r), align: 'left' },
  { name: 'subject', label: 'Subject', field: (r) => resolveSubjectName(r), align: 'left' },
  { name: 'term', label: 'Term', field: (r) => r.termName || r.term || '—', align: 'left' },
  { name: 'total', label: 'Total', field: (r) => r.totalScore ?? r.total_score ?? 0, align: 'right' },
  { name: 'grade', label: 'Grade', field: (r) => r.grade || '—', align: 'left' },
  { name: 'remarks', label: 'Remark', field: (r) => r.remarks || '—', align: 'left' },
]

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()
}

const termColumns = [
  { name: 'name', label: 'Term', field: 'name', align: 'left' },
  { name: 'year', label: 'Session', field: (r) => r.academicYearName || r.year || '—', align: 'left' },
  { name: 'start', label: 'Start', field: (r) => formatDate(r.startDate || r.start_date), align: 'left' },
  { name: 'end', label: 'End', field: (r) => formatDate(r.endDate || r.end_date), align: 'left' },
  { name: 'current', label: 'Current', field: (r) => (r.isCurrent ? 'Yes' : '—'), align: 'left' },
]

const yearColumns = [
  { name: 'name', label: 'Session', field: 'name', align: 'left' },
  { name: 'start', label: 'Start', field: (r) => formatDate(r.startDate || r.start_date), align: 'left' },
  { name: 'end', label: 'End', field: (r) => formatDate(r.endDate || r.end_date), align: 'left' },
  { name: 'current', label: 'Current', field: (r) => (r.isCurrent ? 'Yes' : '—'), align: 'left' },
]

const parentColumns = [
  { name: 'name', label: 'Parent', field: (r) => r.fullName || r.name || '—', align: 'left' },
  { name: 'phone', label: 'Phone', field: (r) => r.phone || '—', align: 'left' },
  { name: 'children', label: 'Children', field: (r) => r.childCount ?? 0, align: 'right' },
  { name: 'outstanding', label: 'Outstanding', field: (r) => r.outstanding ?? 0, align: 'right' },
  { name: 'credit', label: 'Credit', field: (r) => r.creditBalance ?? 0, align: 'right' },
  { name: 'va', label: 'Virtual Account', field: (r) => r.virtualAccountNumber || '—', align: 'left' },
]

const TYPE_LABELS = {
  student: 'Student profile',
  teacher: 'Staff profile',
  class: 'Class profile',
  subject: 'Subject profile',
  result: 'Result record',
  term: 'Term profile',
  year: 'Academic year',
  parent: 'Parent profile',
}

const HIDDEN_KEYS = new Set([
  'id', 'syncId', 'sync_id', 'tenant_id', 'school_id', 'payload',
  'first_name', 'middle_name', 'last_name', 'firstName', 'middleName', 'lastName', 'fullName', 'name',
  'admission_number', 'admissionNumber', 'current_class', 'className',
  'running_balance', 'balance', 'phone', 'profession', 'email', 'code',
  'description', 'created_at', 'updated_at',
  'teacherId', 'teacherIds', 'classId', 'classIds', 'subjectIds',
  'studentId', 'subjectId', 'termId', 'academicYearId', 'localKey', 'isDeleted',
  'studentSyncId', 'subjectSyncId', 'localId',
  'childCount', 'children', 'outstanding', 'creditBalance',
  'parentSyncId', 'parentId', 'virtualAccounts',
])

function studentName(r) {
  const parts = [
    r.first_name || r.firstName,
    r.middle_name || r.middleName,
    r.last_name || r.lastName,
  ].filter((p) => String(p || '').trim())
  return parts.join(' ').trim()
    || r.name
    || r.fullName
    || '—'
}

function formatMoney(value) {
  const n = Number(value || 0)
  return `₦${n.toLocaleString()}`
}

function balanceClass(value) {
  const n = Number(value || 0)
  if (n > 0) return 'text-negative text-weight-bold'
  if (n < 0) return 'text-positive text-weight-bold'
  return 'text-grey-7'
}

function formatFieldValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function openProfile(type, row) {
  selected.value = { type, row: { ...row } }
  drawerOpen.value = true
}

const selectedTypeLabel = computed(() => TYPE_LABELS[selected.value?.type] || 'Profile')

const selectedTitle = computed(() => {
  if (!selected.value) return ''
  const { type, row } = selected.value
  if (type === 'student') return studentName(row)
  if (type === 'teacher') return row.fullName || row.name || 'Staff'
  if (type === 'parent') return row.fullName || row.name || 'Parent'
  if (type === 'result') return `Result · ${row.grade || row.totalScore || row.total_score || '—'}`
  return row.name || row.code || 'Untitled'
})

const selectedSubtitle = computed(() => {
  if (!selected.value) return ''
  const { type, row } = selected.value
  if (type === 'student') return row.admission_number || row.admissionNumber || row.id
  if (type === 'teacher') return row.profession || row.phone || ''
  if (type === 'parent') return row.phone || `${row.childCount ?? 0} child(ren)`
  if (type === 'class') return `${relatedStudents.value.length} student(s)`
  if (type === 'subject') return row.code || ''
  return row.id || ''
})

const selectedInitials = computed(() => {
  const title = String(selectedTitle.value || '?').trim()
  const parts = title.split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
})

const selectedChips = computed(() => {
  if (!selected.value) return []
  const { type, row } = selected.value
  const chips = []
  if (type === 'student') {
    const bal = Number(row.running_balance ?? row.balance ?? 0)
    if (bal > 0) chips.push({ label: `Owing ${formatMoney(bal)}`, color: 'red-2', textColor: 'red-10' })
    else if (bal < 0) chips.push({ label: `Credit ${formatMoney(Math.abs(bal))}`, color: 'green-2', textColor: 'green-10' })
    else chips.push({ label: 'Settled', color: 'grey-3', textColor: 'grey-9' })
    if (row.current_class || row.className) {
      chips.push({ label: row.current_class || row.className, color: 'blue-1', textColor: 'primary' })
    }
  }
  if (type === 'teacher' && row.profession) {
    chips.push({ label: row.profession, color: 'purple-1', textColor: 'purple-10' })
  }
  if (type === 'subject' && row.code) {
    chips.push({ label: row.code, color: 'teal-1', textColor: 'teal-10' })
  }
  if (type === 'parent') {
    const owing = Number(row.outstanding ?? 0)
    const credit = Number(row.creditBalance ?? 0)
    if (owing > 0) chips.push({ label: `Owing ${formatMoney(owing)}`, color: 'red-2', textColor: 'red-10' })
    else chips.push({ label: 'Settled', color: 'grey-3', textColor: 'grey-9' })
    if (credit > 0) chips.push({ label: `Credit ${formatMoney(credit)}`, color: 'indigo-1', textColor: 'indigo-10' })
    if (row.virtualAccountNumber) {
      chips.push({ label: 'Parent VA', color: 'teal-1', textColor: 'teal-10' })
    }
  }
  return chips
})

const selectedFields = computed(() => {
  if (!selected.value) return []
  const { type, row } = selected.value
  const fields = []

  const push = (label, value) => {
    if (value == null || value === '') return
    fields.push({ label, value: formatFieldValue(value) })
  }

  if (type === 'student') {
    push('Admission number', row.admission_number || row.admissionNumber)
    push('Full name', studentName(row))
    push('Middle name', row.middle_name || row.middleName)
    push('Class', row.current_class || row.className)
    push('Academic year', row.academicYearName)
    push('Balance', formatMoney(row.running_balance ?? row.balance))
    push('Email', row.email)
    push('Phone', row.phone || row.parentPhone || row.parent_phone)
    push('Guardian', row.guardianName || row.guardian_name || row.parentName || row.parent_name)
    push('Gender', row.gender)
    push('Department', row.department)
    push('Virtual account', row.virtual_account_number || row.virtualAccountNumber)
    push('Bank', row.virtual_account_bank || row.virtualAccountBank)
    push('Record ID', row.id)
    push('Created', row.created_at ? new Date(row.created_at).toLocaleString() : null)
  } else if (type === 'teacher') {
    push('Full name', row.fullName || row.name)
    push('Phone', row.phone)
    push('Email', row.email)
    push('Profession', row.profession)
    push('Assigned classes', row.classNames)
    push('Assigned subjects', row.subjectNames)
    push('Certificates', row.certificates)
    push('Date joined', row.employmentDate)
    push('Staff ID', row.staffId || row.staff_id || row.employeeId)
    push('Address', row.address)
    push('Record ID', row.id)
  } else if (type === 'class') {
    push('Class name', row.name)
    push('Description', row.description)
    push('Level / arm', row.level || row.arm || row.section)
    push('Capacity', row.capacity)
    push('Students enrolled', relatedStudents.value.length)
    push('Record ID', row.id)
  } else if (type === 'subject') {
    push('Subject', row.name)
    push('Code', row.code)
    push('Teachers', row.teacherNames)
    push('Classes', row.classNames)
    push('Description', row.description)
    push('Results on file', relatedResults.value.length)
    push('Record ID', row.id)
  } else if (type === 'result') {
    push('Student', resolveStudentName(row))
    push('Subject', resolveSubjectName(row))
    push('CA', row.assessmentScore ?? row.assessment_score)
    push('Exam', row.examScore ?? row.exam_score)
    push('Total score', row.totalScore ?? row.total_score)
    push('Grade', row.grade)
    push('Remark', row.remarks)
    push('Term', row.termName || row.term || row.termId)
    push('Session', row.academicYearName || row.sessionId || row.academicYearId || row.year)
    push('Record ID', row.id)
  } else if (type === 'term') {
    push('Term', row.name)
    push('Session', row.academicYearName)
    push('Start date', formatDate(row.startDate || row.start_date))
    push('End date', formatDate(row.endDate || row.end_date))
    push('Current', row.isCurrent ? 'Yes' : 'No')
    push('Record ID', row.id)
  } else if (type === 'year') {
    push('Session', row.name)
    push('Start date', formatDate(row.startDate || row.start_date))
    push('End date', formatDate(row.endDate || row.end_date))
    push('Current', row.isCurrent ? 'Yes' : 'No')
    push('Record ID', row.id)
  } else if (type === 'parent') {
    push('Parent', row.fullName || row.name)
    push('Phone', row.phone)
    push('Email', row.email)
    push('Children', row.childCount)
    push('Outstanding', row.outstanding)
    push('Parent credit', row.creditBalance)
    push('Virtual account', row.virtualAccountNumber)
    push('Bank', row.virtualAccountBank)
    push('Record ID', row.id)
  }

  return fields
})

const relatedStudents = computed(() => {
  if (!selected.value) return []
  if (selected.value.type === 'parent') {
    const parentIds = new Set([
      String(selected.value.row.id || ''),
      String(selected.value.row.syncId || ''),
      String(selected.value.row.localId || ''),
    ].filter(Boolean))
    return students.value.filter((s) => parentIds.has(String(s.parentSyncId || s.parentId || '')))
  }
  if (selected.value?.type !== 'class') return []
  const className = String(selected.value.row.name || '').trim().toLowerCase()
  const classIds = new Set([
    String(selected.value.row.id || ''),
    String(selected.value.row.syncId || ''),
    String(selected.value.row.localId || ''),
  ].filter(Boolean))
  return students.value.filter((s) => {
    const sClass = String(s.current_class || s.className || '').trim().toLowerCase()
    const sClassId = String(s.classId || s.class_id || '')
    return (className && sClass === className) || (sClassId && classIds.has(sClassId))
  })
})

const relatedResults = computed(() => {
  if (!selected.value) return []
  const { type, row } = selected.value
  if (type === 'student') {
    const ids = new Set([
      String(row.id || ''),
      String(row.syncId || row.sync_id || ''),
      String(row.localId || ''),
    ].filter(Boolean))
    return results.value.filter((r) => {
      const keys = [r.studentSyncId, r.studentId, r.student_id]
      return keys.some((k) => k != null && ids.has(String(k)))
    }).slice(0, 20)
  }
  if (type === 'subject') {
    const ids = new Set([
      String(row.id || ''),
      String(row.syncId || row.sync_id || ''),
      String(row.localId || ''),
    ].filter(Boolean))
    return results.value.filter((r) => {
      const keys = [r.subjectSyncId, r.subjectId, r.subject_id]
      return keys.some((k) => k != null && ids.has(String(k)))
    }).slice(0, 20)
  }
  return []
})

const extraPayloadKeys = computed(() => {
  if (!selected.value?.row) return []
  return Object.keys(selected.value.row)
    .filter((k) => !HIDDEN_KEYS.has(k))
    .filter((k) => {
      const v = selected.value.row[k]
      return v != null && v !== '' && typeof v !== 'object'
    })
    .slice(0, 12)
})

function resolveStudentName(r) {
  if (r.studentName) return r.studentName
  const keys = [r.studentSyncId, r.studentId, r.student_id].filter((k) => k != null)
  const match = students.value.find((s) =>
    keys.some((k) =>
      String(s.id) === String(k) ||
      String(s.syncId || s.sync_id || '') === String(k) ||
      String(s.localId || '') === String(k),
    ),
  )
  return match ? studentName(match) : (keys[0] || '—')
}

function resolveSubjectName(r) {
  if (r.subjectName) return r.subjectName
  const keys = [r.subjectSyncId, r.subjectId, r.subject_id].filter((k) => k != null)
  const match = subjects.value.find((s) =>
    keys.some((k) =>
      String(s.id) === String(k) ||
      String(s.syncId || s.sync_id || '') === String(k) ||
      String(s.localId || '') === String(k),
    ),
  )
  return match?.name || keys[0] || '—'
}

const fetchData = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const tenantId = localStorage.getItem('tenant_id')
    const { data } = await schoolApi.getRoster(
      tenantId && tenantId !== 'global' ? { params: { tenantId } } : undefined,
    )
    if (!data || Array.isArray(data)) {
      loadError.value = 'Roster API returned an unexpected empty response. Check tenant context / access.'
      roster.value = emptyRoster()
      return
    }
    roster.value = { ...emptyRoster(), ...data }
  } catch (error) {
    console.error('Failed to fetch school roster:', error)
    loadError.value = error?.response?.data?.error || error?.message || 'Failed to load roster'
    Notify.create({ type: 'negative', message: loadError.value })
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.roster-table :deep(tbody tr:hover) {
  background: rgba(25, 118, 210, 0.06);
}
.cursor-pointer :deep(tbody tr) {
  cursor: pointer;
}
</style>
