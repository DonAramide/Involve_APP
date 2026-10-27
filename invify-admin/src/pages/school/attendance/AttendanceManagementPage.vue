<!-- invify-admin/src/pages/school/attendance/AttendanceManagementPage.vue -->
<template>
  <q-page class="q-pa-md bg-grey-1 text-dark">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center q-gutter-sm">
          <q-icon name="fact_check" size="2em" color="primary" />
          <h1 class="text-h5 text-weight-bolder q-ma-none text-indigo-10">Attendance Management & Reporting</h1>
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Comprehensive multi-tenant class attendance, weekly registers, monthly analytics, and audit tracking.
        </div>
      </div>
      <div class="row q-gutter-sm items-center">
        <q-btn
          outline
          color="indigo-8"
          icon="print"
          label="Print Register PDF"
          :disable="!selectedClass"
          @click="downloadRegisterPdf"
        >
          <q-tooltip>Download print-ready weekly register matching formal school format</q-tooltip>
        </q-btn>
        <q-btn
          color="primary"
          icon="picture_as_pdf"
          label="Export Report PDF"
          :disable="!selectedClass"
          @click="downloadReportPdf"
        >
          <q-tooltip>Download class attendance report with monthly rates & threshold flags</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <q-card flat bordered class="bg-white q-mb-md shadow-1">
      <q-tabs
        v-model="activeTab"
        dense
        align="left"
        class="text-grey-7"
        active-color="primary"
        indicator-color="primary"
        narrow-indicator
      >
        <q-tab name="dashboard" icon="dashboard" label="Dashboard" />
        <q-tab name="mark" icon="edit_calendar" label="Mark Attendance" />
        <q-tab name="register" icon="view_week" label="Weekly Register" />
        <q-tab name="report" icon="analytics" label="Class Attendance Report" />
        <q-tab name="student_history" icon="person_search" label="Student History" />
        <q-tab name="settings" icon="settings" label="Settings & Calendar" />
      </q-tabs>
    </q-card>

    <!-- Tab Panels -->
    <q-tab-panels v-model="activeTab" animated class="bg-transparent">
      <!-- 1. DASHBOARD -->
      <q-tab-panel name="dashboard" class="q-pa-none">
        <!-- KPI Summary Cards -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">Active Classes</div>
                  <div class="text-h5 text-weight-bolder text-indigo-10">{{ classOptions.length }}</div>
                </div>
                <q-avatar color="indigo-1" text-color="indigo-9" icon="school" />
              </div>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">Total Students</div>
                  <div class="text-h5 text-weight-bolder text-indigo-10">{{ allStudentsCount }}</div>
                </div>
                <q-avatar color="teal-1" text-color="teal-9" icon="groups" />
              </div>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">Attendance Threshold</div>
                  <div class="text-h5 text-weight-bolder text-indigo-10">{{ settings.minimum_attendance_threshold }}%</div>
                </div>
                <q-avatar color="amber-1" text-color="amber-9" icon="tune" />
              </div>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">School Holidays Configured</div>
                  <div class="text-h5 text-weight-bolder text-indigo-10">{{ calendarExceptions.length }}</div>
                </div>
                <q-avatar color="purple-1" text-color="purple-9" icon="event_busy" />
              </div>
            </q-card>
          </div>
        </div>

        <!-- Quick Launch Cards -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-4">
            <q-card flat bordered class="bg-white q-pa-md cursor-pointer hover-shadow" @click="activeTab = 'mark'">
              <div class="row items-center q-gutter-md">
                <q-avatar color="primary" text-color="white" icon="how_to_reg" size="48px" />
                <div>
                  <div class="text-subtitle1 text-weight-bold text-indigo-10">Mark Daily Attendance</div>
                  <div class="text-caption text-grey-7">Record present, absent, late, or excused students with auto-save.</div>
                </div>
              </div>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat bordered class="bg-white q-pa-md cursor-pointer hover-shadow" @click="activeTab = 'register'">
              <div class="row items-center q-gutter-md">
                <q-avatar color="teal-7" text-color="white" icon="view_week" size="48px" />
                <div>
                  <div class="text-subtitle1 text-weight-bold text-indigo-10">Class Attendance Register</div>
                  <div class="text-caption text-grey-7">Inspect 5-week class register grid and print official PDF.</div>
                </div>
              </div>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat bordered class="bg-white q-pa-md cursor-pointer hover-shadow" @click="activeTab = 'report'">
              <div class="row items-center q-gutter-md">
                <q-avatar color="indigo-7" text-color="white" icon="insert_chart" size="48px" />
                <div>
                  <div class="text-subtitle1 text-weight-bold text-indigo-10">Class Attendance Report</div>
                  <div class="text-caption text-grey-7">View monthly attendance rates, individual totals, & below-threshold warnings.</div>
                </div>
              </div>
            </q-card>
          </div>
        </div>

        <!-- Recent Activity / Audit Log -->
        <q-card flat bordered class="bg-white">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-bold text-indigo-10">Recent Attendance Audit Activity</div>
            <q-btn flat dense icon="refresh" label="Refresh" @click="fetchAuditLog" />
          </q-card-section>
          <q-separator />
          <q-table
            flat
            dense
            :rows="auditLogs"
            :columns="auditColumns"
            row-key="id"
            :loading="loadingAudit"
            no-data-label="No attendance activity recorded yet."
          >
            <template v-slot:body-cell-action="props">
              <q-td :props="props">
                <q-badge
                  :color="props.value === 'FINALIZED' ? 'positive' : props.value === 'CORRECTION' ? 'warning' : 'info'"
                >
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- 2. MARK ATTENDANCE -->
      <q-tab-panel name="mark" class="q-pa-none">
        <q-card flat bordered class="bg-white q-pa-md q-mb-md">
          <!-- Selection Filter Header -->
          <div class="row q-col-gutter-md items-center">
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="selectedClass"
                :options="classOptions"
                label="Class / Form *"
                outlined
                dense
                @update:model-value="fetchRegister"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-2">
              <q-input
                v-model="attendanceDate"
                type="date"
                label="Attendance Date *"
                outlined
                dense
                @update:model-value="fetchRegister"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-2">
              <q-input v-model="teacherName" label="Teacher Name" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-2">
              <q-input v-model="subjectName" label="Subject (Optional)" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-3 flex justify-end q-gutter-sm">
              <q-btn
                outline
                color="secondary"
                icon="done_all"
                label="Mark All Present"
                :disable="!students.length || isFinalized"
                @click="confirmBulkPresent"
              >
                <q-tooltip>Mark all unrecorded students as Present</q-tooltip>
              </q-btn>
              <q-btn
                color="primary"
                icon="save"
                label="Save Draft"
                :loading="saving"
                :disable="!students.length || isFinalized"
                @click="saveRegister(false)"
              />
              <q-btn
                color="positive"
                icon="check_circle"
                label="Finalize"
                :loading="saving"
                :disable="!students.length || isFinalized"
                @click="saveRegister(true)"
              />
            </div>
          </div>

          <!-- Finalized Warning / Correction Alert -->
          <div v-if="isFinalized" class="q-mt-md">
            <q-banner rounded class="bg-blue-1 text-indigo-10 border-indigo">
              <template v-slot:avatar>
                <q-icon name="verified" color="primary" />
              </template>
              <div class="text-weight-bold">This attendance register is finalized.</div>
              <div class="text-caption text-grey-8">
                Changes require an authorized correction with an auditable reason.
              </div>
            </q-banner>
          </div>

          <!-- Quick Stats Bar -->
          <div class="row q-mt-md q-col-gutter-sm items-center">
            <div class="col-auto">
              <q-chip color="green-1" text-color="green-9" icon="check_circle">
                Present: <strong>{{ registerStats.present }}</strong>
              </q-chip>
            </div>
            <div class="col-auto">
              <q-chip color="red-1" text-color="red-9" icon="cancel">
                Absent: <strong>{{ registerStats.absent }}</strong>
              </q-chip>
            </div>
            <div class="col-auto">
              <q-chip color="amber-1" text-color="amber-9" icon="schedule">
                Late: <strong>{{ registerStats.late }}</strong>
              </q-chip>
            </div>
            <div class="col-auto">
              <q-chip color="blue-1" text-color="blue-9" icon="medical_services">
                Excused: <strong>{{ registerStats.excused }}</strong>
              </q-chip>
            </div>
            <div class="col-auto">
              <q-chip color="grey-3" text-color="grey-8" icon="help_outline">
                Unrecorded: <strong>{{ registerStats.unrecorded }}</strong>
              </q-chip>
            </div>
          </div>
        </q-card>

        <!-- Student Attendance List -->
        <q-card flat bordered class="bg-white">
          <div v-if="loadingRegister" class="flex flex-center q-pa-xl">
            <q-spinner-dots color="primary" size="3em" />
          </div>

          <div v-else-if="!selectedClass" class="flex flex-center q-pa-xl text-grey-6 column">
            <q-icon name="school" size="4em" class="q-mb-sm" />
            <div class="text-subtitle1">Select a Class / Form to load students and record attendance</div>
          </div>

          <div v-else-if="!students.length" class="flex flex-center q-pa-xl text-grey-6 column">
            <q-icon name="person_off" size="4em" class="q-mb-sm" />
            <div class="text-subtitle1">No students found enrolled in {{ selectedClass }}</div>
            <q-btn color="primary" label="Quick Enroll Student" class="q-mt-md" @click="showAddStudentDialog = true" />
          </div>

          <div v-else>
            <q-list separator>
              <q-item
                v-for="(student, idx) in students"
                :key="student.id"
                class="q-py-sm items-center"
                :class="{ 'bg-grey-1': idx % 2 === 0 }"
              >
                <!-- Avatar / Index -->
                <q-item-section avatar>
                  <q-avatar color="indigo-1" text-color="indigo-9" size="36px">
                    {{ idx + 1 }}
                  </q-avatar>
                </q-item-section>

                <!-- Student Identity -->
                <q-item-section>
                  <q-item-label class="text-weight-bold text-dark">{{ student.full_name }}</q-item-label>
                  <q-item-label caption class="text-grey-6">
                    Admission No: {{ student.admission_number || 'N/A' }}
                  </q-item-label>
                </q-item-section>

                <!-- Status Selector Toggle -->
                <q-item-section side>
                  <div class="row items-center q-gutter-xs">
                    <q-btn-toggle
                      v-model="attendanceMap[student.id]"
                      :disable="isFinalized"
                      dense
                      no-caps
                      unelevated
                      toggle-color="primary"
                      :options="[
                        { label: 'P', value: 'present', slot: 'p' },
                        { label: 'A', value: 'absent', slot: 'a' },
                        { label: 'L', value: 'late', slot: 'l' },
                        { label: 'E', value: 'excused', slot: 'e' }
                      ]"
                    >
                      <template v-slot:p><q-tooltip>Present</q-tooltip></template>
                      <template v-slot:a><q-tooltip>Absent</q-tooltip></template>
                      <template v-slot:l><q-tooltip>Late</q-tooltip></template>
                      <template v-slot:e><q-tooltip>Excused</q-tooltip></template>
                    </q-btn-toggle>

                    <q-btn
                      v-if="isFinalized"
                      flat
                      dense
                      round
                      color="warning"
                      icon="edit_note"
                      @click="openCorrectionDialog(student)"
                    >
                      <q-tooltip>Make audited correction</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card>
      </q-tab-panel>

      <!-- 3. WEEKLY REGISTER (Reference Image 2) -->
      <q-tab-panel name="register" class="q-pa-none">
        <q-card flat bordered class="bg-white q-pa-md q-mb-md">
          <div class="row q-col-gutter-md items-center justify-between">
            <div class="col-12 col-md-3">
              <q-select
                v-model="selectedClass"
                :options="classOptions"
                label="Class / Form *"
                outlined
                dense
                @update:model-value="fetchRegister"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model="attendanceDate" type="date" label="Week of Date" outlined dense />
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model="subjectName" label="Subject" outlined dense />
            </div>
            <div class="col-12 col-md-3 text-right">
              <q-btn color="indigo-9" icon="download" label="Download Register PDF" @click="downloadRegisterPdf" />
            </div>
          </div>
        </q-card>

        <!-- Formal Register Container -->
        <q-card flat bordered class="bg-white q-pa-lg">
          <!-- Register Formal Header -->
          <div class="text-center q-mb-md">
            <div class="text-h6 text-weight-bolder text-uppercase text-dark">{{ activeBusinessName || 'School of Education' }}</div>
            <div class="text-subtitle1 text-weight-bold text-uppercase text-grey-9 text-decoration-underline">Class Attendance Register</div>
          </div>

          <div class="row q-col-gutter-md text-caption text-weight-medium q-mb-md">
            <div class="col-12 col-sm-6">
              <div>TEACHER'S NAME: <span class="text-weight-bold">{{ teacherName || '_____________________' }}</span></div>
              <div>SUBJECT: <span class="text-weight-bold">{{ subjectName || 'General' }}</span></div>
            </div>
            <div class="col-12 col-sm-6 text-right">
              <div>FORM/CLASS: <span class="text-weight-bold">{{ selectedClass || '__________' }}</span></div>
              <div>DATE RANGE: <span class="text-weight-bold">{{ attendanceDate }}</span></div>
            </div>
          </div>

          <!-- Weekly Register Table -->
          <div class="overflow-auto">
            <table class="register-table q-mb-md">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 40px">SN</th>
                  <th rowspan="2" style="min-width: 180px">NAME</th>
                  <th colspan="5">WEEK 1</th>
                  <th colspan="5">WEEK 2</th>
                  <th colspan="5">WEEK 3</th>
                  <th colspan="5">WEEK 4</th>
                  <th colspan="5">WEEK 5</th>
                </tr>
                <tr>
                  <!-- Week 1 -->
                  <th>M</th><th>T</th><th>W</th><th>T</th><th>F</th>
                  <!-- Week 2 -->
                  <th>M</th><th>T</th><th>W</th><th>T</th><th>F</th>
                  <!-- Week 3 -->
                  <th>M</th><th>T</th><th>W</th><th>T</th><th>F</th>
                  <!-- Week 4 -->
                  <th>M</th><th>T</th><th>W</th><th>T</th><th>F</th>
                  <!-- Week 5 -->
                  <th>M</th><th>T</th><th>W</th><th>T</th><th>F</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(student, sIdx) in (students.length ? students : mockRegisterRows)" :key="sIdx">
                  <td class="text-center">{{ sIdx + 1 }}</td>
                  <td>{{ student.full_name || student.name }}</td>
                  <!-- 25 daily attendance cells -->
                  <td v-for="d in 25" :key="d" class="text-center text-weight-bold">
                    {{ d === 1 && attendanceMap[student.id] ? attendanceMap[student.id].charAt(0).toUpperCase() : '' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Legend and Signatures -->
          <div class="row items-center justify-between text-caption text-grey-8 q-mt-lg pt-border">
            <div class="text-weight-bold">
              LEGEND: P = Present | A = Absent | L = Late | E = Excused
            </div>
            <div>Class Teacher's Signature: _______________________</div>
            <div>Principal's Signature: _______________________</div>
          </div>
        </q-card>
      </q-tab-panel>

      <!-- 4. CLASS ATTENDANCE REPORT (Reference Image 1) -->
      <q-tab-panel name="report" class="q-pa-none">
        <q-card flat bordered class="bg-white q-pa-md q-mb-md">
          <div class="row q-col-gutter-md items-center">
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="selectedClass"
                :options="classOptions"
                label="Class / Form *"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6 col-md-2">
              <q-input v-model="reportPeriodFrom" type="date" label="From Date *" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-2">
              <q-input v-model="reportPeriodTo" type="date" label="To Date *" outlined dense />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-btn color="primary" icon="search" label="Generate Report" :loading="loadingReport" @click="fetchClassReport" />
            </div>
            <div class="col-12 col-sm-6 col-md-2 text-right">
              <q-btn
                outline
                color="secondary"
                icon="picture_as_pdf"
                label="Download PDF"
                :disable="!reportData"
                @click="downloadReportPdf"
              />
            </div>
          </div>
        </q-card>

        <div v-if="loadingReport" class="flex flex-center q-pa-xl">
          <q-spinner-cube color="primary" size="4em" />
        </div>

        <div v-else-if="!reportData" class="flex flex-center q-pa-xl text-grey-6 column">
          <q-icon name="insert_chart_outlined" size="4em" class="q-mb-sm" />
          <div class="text-subtitle1">Select Class and reporting Date Range, then click "Generate Report"</div>
        </div>

        <div v-else>
          <q-card flat bordered class="bg-white q-pa-lg">
            <!-- Formal School Title -->
            <div class="text-center q-mb-md">
              <div class="text-h5 text-weight-bolder text-uppercase text-dark">{{ reportData.schoolName || activeBusinessName }}</div>
              <div class="text-caption text-italic text-grey-7">Leading from darkness to light</div>
              <div class="text-subtitle1 text-weight-bold text-uppercase text-right q-mt-sm">CLASS ATTENDANCE REPORT</div>
            </div>

            <!-- Metadata Line -->
            <div class="row justify-between text-caption text-weight-medium q-mb-lg border-bottom-line">
              <div>CLASS: <strong class="text-indigo-10">{{ selectedClass }}</strong></div>
              <div>TEACHER: <strong class="text-indigo-10">{{ reportData.teacherName }}</strong></div>
              <div>REPORTING PERIOD: <strong>{{ reportPeriodFrom }}</strong> TO <strong>{{ reportPeriodTo }}</strong></div>
            </div>

            <!-- 4 Summary Metric Callout Boxes -->
            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-12 col-sm-6 col-md-3">
                <div class="metric-card bg-blue-1 text-center q-pa-md rounded-borders">
                  <div class="text-caption text-grey-8">Number of Students</div>
                  <div class="text-h4 text-weight-bolder text-primary q-mt-xs">{{ reportData.enrolledStudents }}</div>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <div class="metric-card bg-blue-1 text-center q-pa-md rounded-borders">
                  <div class="text-caption text-grey-8">Number of Working Days</div>
                  <div class="text-h4 text-weight-bolder text-primary q-mt-xs">{{ reportData.instructionalDays }}</div>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <div class="metric-card bg-blue-1 text-center q-pa-md rounded-borders">
                  <div class="text-caption text-grey-8">Attendance Rate</div>
                  <div class="text-h4 text-weight-bolder text-primary q-mt-xs">
                    {{ reportData.overall.ratePercent !== null ? reportData.overall.ratePercent + '%' : 'N/A' }}
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <div class="metric-card bg-blue-1 text-center q-pa-md rounded-borders">
                  <div class="text-caption text-grey-8">Not meeting Requirements</div>
                  <div class="text-h4 text-weight-bolder text-negative q-mt-xs">{{ reportData.belowThresholdCount }}</div>
                  <div class="text-caption text-grey-7">Min Required: {{ reportData.thresholdPercent }}%</div>
                </div>
              </div>
            </div>

            <!-- Class Attendance Rates (Monthly Breakdown) -->
            <div class="q-mb-lg">
              <div class="text-subtitle2 text-weight-bolder text-uppercase q-mb-xs">Class Attendance Rates</div>
              <div class="overflow-auto">
                <table class="report-table">
                  <thead>
                    <tr>
                      <th style="min-width: 180px">Metric</th>
                      <th v-for="m in reportData.months" :key="m.month">{{ m.month }}</th>
                      <th class="bg-blue-2">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="text-weight-bold">Number of Working Days</td>
                      <td v-for="m in reportData.months" :key="m.month" class="text-center">{{ m.instructionalDays }}</td>
                      <td class="text-center text-weight-bold bg-blue-1">{{ reportData.instructionalDays }}</td>
                    </tr>
                    <tr>
                      <td class="text-weight-bold">Average Attendance Rate</td>
                      <td v-for="m in reportData.months" :key="m.month" class="text-center">
                        {{ m.ratePercent !== null ? m.ratePercent + '%' : '-' }}
                      </td>
                      <td class="text-center text-weight-bold bg-blue-1">
                        {{ reportData.overall.ratePercent !== null ? reportData.overall.ratePercent + '%' : '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Student Attendance Rates (Individual breakdown) -->
            <div>
              <div class="text-subtitle2 text-weight-bolder text-uppercase q-mb-none">Student Attendance Rates</div>
              <div class="text-caption text-grey-7 q-mb-sm">
                Attendance Rate = (Number of Days Present + Late) / Working Days (Excused excluded from denominator)
              </div>
              <div class="overflow-auto">
                <table class="report-table">
                  <thead>
                    <tr>
                      <th style="min-width: 200px">Student Name</th>
                      <th v-for="m in reportData.months" :key="m.month">{{ m.month }}</th>
                      <th class="bg-blue-2">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="st in reportData.students"
                      :key="st.studentId"
                      :class="{ 'bg-red-1 text-negative text-weight-bold': st.belowThreshold }"
                    >
                      <td>
                        {{ st.studentName }}
                        <span v-if="st.admissionNumber" class="text-caption text-grey-7">({{ st.admissionNumber }})</span>
                      </td>
                      <td v-for="m in reportData.months" :key="m.month" class="text-center">
                        {{ st.months[m.month]?.ratePercent !== null && st.months[m.month]?.ratePercent !== undefined ? st.months[m.month].ratePercent + '%' : '-' }}
                      </td>
                      <td class="text-center text-weight-bolder" :class="st.belowThreshold ? 'bg-red-2 text-negative' : 'bg-blue-1'">
                        {{ st.overall?.ratePercent !== null ? st.overall.ratePercent + '%' : '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </q-card>
        </div>
      </q-tab-panel>

      <!-- 5. STUDENT ATTENDANCE HISTORY -->
      <q-tab-panel name="student_history" class="q-pa-none">
        <q-card flat bordered class="bg-white q-pa-md q-mb-md">
          <div class="row q-col-gutter-md items-center">
            <div class="col-12 col-md-4">
              <q-select
                v-model="selectedStudentId"
                :options="studentSelectOptions"
                label="Select Student *"
                outlined
                dense
                emit-value
                map-options
                @update:model-value="fetchStudentHistory"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model="reportPeriodFrom" type="date" label="From Date" outlined dense />
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model="reportPeriodTo" type="date" label="To Date" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-btn color="primary" label="Load History" :loading="loadingHistory" @click="fetchStudentHistory" />
            </div>
          </div>
        </q-card>

        <div v-if="studentHistory">
          <!-- Student Summary Cards -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered class="bg-white q-pa-md text-center">
                <div class="text-caption text-grey-7">Attendance Rate</div>
                <div class="text-h4 text-weight-bolder text-primary">
                  {{ studentHistory.summary.overall.ratePercent !== null ? studentHistory.summary.overall.ratePercent + '%' : 'N/A' }}
                </div>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered class="bg-white q-pa-md text-center">
                <div class="text-caption text-grey-7">Days Present</div>
                <div class="text-h4 text-weight-bolder text-positive">
                  {{ studentHistory.summary.overall.counts.present }}
                </div>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered class="bg-white q-pa-md text-center">
                <div class="text-caption text-grey-7">Days Absent</div>
                <div class="text-h4 text-weight-bolder text-negative">
                  {{ studentHistory.summary.overall.counts.absent }}
                </div>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered class="bg-white q-pa-md text-center">
                <div class="text-caption text-grey-7">Late / Excused</div>
                <div class="text-h4 text-weight-bolder text-warning">
                  {{ studentHistory.summary.overall.counts.late + studentHistory.summary.overall.counts.excused }}
                </div>
              </q-card>
            </div>
          </div>

          <!-- Daily Attendance Records -->
          <q-card flat bordered class="bg-white">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold text-indigo-10">Daily Attendance Log</div>
            </q-card-section>
            <q-table
              flat
              dense
              :rows="studentHistory.dailyLogs"
              :columns="historyColumns"
              row-key="id"
              no-data-label="No daily attendance records found for this period."
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :color="
                      props.value === 'present' ? 'positive' : props.value === 'absent' ? 'negative' : props.value === 'late' ? 'warning' : 'info'
                    "
                  >
                    {{ props.value.toUpperCase() }}
                  </q-badge>
                </q-td>
              </template>
            </q-table>
          </q-card>
        </div>
      </q-tab-panel>

      <!-- 6. SETTINGS & CALENDAR -->
      <q-tab-panel name="settings" class="q-pa-none">
        <div class="row q-col-gutter-md">
          <!-- Threshold & Policy Settings -->
          <div class="col-12 col-md-6">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="text-subtitle1 text-weight-bold text-indigo-10 q-mb-md">Attendance Policy & Thresholds</div>
              <div class="q-gutter-md">
                <div>
                  <div class="text-caption text-grey-8 q-mb-xs">Minimum Attendance Threshold (%)</div>
                  <q-slider
                    v-model="settings.minimum_attendance_threshold"
                    :min="50"
                    :max="100"
                    label
                    label-always
                    color="primary"
                  />
                </div>

                <q-select
                  v-model="settings.policy_late"
                  :options="[
                    { label: 'Count as Attended (Default)', value: 'attended' },
                    { label: 'Count as Absent', value: 'absent' }
                  ]"
                  emit-value
                  map-options
                  label="Late Arrival Policy"
                  outlined
                  dense
                />

                <q-select
                  v-model="settings.policy_excused"
                  :options="[
                    { label: 'Exclude from Denominator (Default / Fair)', value: 'excluded' },
                    { label: 'Count as Attended', value: 'attended' },
                    { label: 'Count as Absent', value: 'absent' }
                  ]"
                  emit-value
                  map-options
                  label="Excused Absence Policy"
                  outlined
                  dense
                />

                <q-btn color="primary" label="Save Settings" :loading="savingSettings" @click="saveSettings" />
              </div>
            </q-card>
          </div>

          <!-- School Holidays / Calendar Exceptions -->
          <div class="col-12 col-md-6">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="row items-center justify-between q-mb-md">
                <div class="text-subtitle1 text-weight-bold text-indigo-10">School Holidays & Closures</div>
                <q-btn color="indigo-7" icon="add" label="Add Holiday" dense @click="showAddHolidayDialog = true" />
              </div>

              <q-list separator>
                <q-item v-for="h in calendarExceptions" :key="h.id">
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ h.description }}</q-item-label>
                    <q-item-label caption class="text-grey-6">{{ h.exception_date }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn flat round dense color="negative" icon="delete" @click="deleteHoliday(h.id)" />
                  </q-item-section>
                </q-item>
                <q-item v-if="!calendarExceptions.length" class="text-grey-6 text-center q-pa-md">
                  No holidays configured. Weekends are automatically excluded.
                </q-item>
              </q-list>
            </q-card>
          </div>

          <!-- Teacher-to-Class Assignments -->
          <div class="col-12">
            <q-card flat bordered class="bg-white q-pa-md">
              <div class="row items-center justify-between q-mb-md">
                <div>
                  <div class="text-subtitle1 text-weight-bold text-indigo-10">Teacher-to-Class Assignments</div>
                  <div class="text-caption text-grey-7">Enforces role-based permissions so teachers only record for assigned classes.</div>
                </div>
                <q-btn color="primary" icon="person_add" label="Assign Teacher" @click="showAssignDialog = true" />
              </div>

              <q-table
                flat
                dense
                :rows="classAssignments"
                :columns="assignmentColumns"
                row-key="id"
                no-data-label="No teacher assignments found. School administrators have full school access."
              >
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn flat round dense color="negative" icon="delete" @click="deleteAssignment(props.row.id)" />
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Correction Dialog Modal -->
    <q-dialog v-model="showCorrectionDialog" persistent>
      <q-card style="width: 440px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Audited Attendance Correction</div>
          <div class="text-caption">{{ correctionTarget?.student_name }}</div>
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-md">
          <q-select
            v-model="correctionNewStatus"
            :options="[
              { label: 'Present', value: 'present' },
              { label: 'Absent', value: 'absent' },
              { label: 'Late', value: 'late' },
              { label: 'Excused', value: 'excused' }
            ]"
            emit-value
            map-options
            label="Corrected Status *"
            outlined
          />
          <q-input
            v-model="correctionReason"
            type="textarea"
            label="Mandatory Reason for Correction *"
            placeholder="Explain why this finalized record is being corrected..."
            outlined
            :rules="[val => (val && val.length >= 5) || 'At least 5 characters required']"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn color="primary" label="Save Correction" :loading="savingCorrection" @click="submitCorrection" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Quick Enroll Student Dialog -->
    <q-dialog v-model="showAddStudentDialog">
      <q-card style="width: 400px">
        <q-card-section class="bg-indigo-9 text-white">
          <div class="text-h6">Quick Enroll Student</div>
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-md">
          <q-input v-model="newStudent.name" label="Full Name *" outlined autofocus />
          <q-select v-model="newStudent.classLevel" :options="classOptions" label="Class / Form *" outlined />
          <q-input v-model="newStudent.admissionNumber" label="Admission Number" outlined />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey" />
          <q-btn color="primary" label="Enroll" :loading="enrolling" @click="enrollStudent" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add Holiday Dialog -->
    <q-dialog v-model="showAddHolidayDialog">
      <q-card style="width: 400px">
        <q-card-section class="bg-indigo-9 text-white">
          <div class="text-h6">Add School Holiday / Closure</div>
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-md">
          <q-input v-model="newHoliday.date" type="date" label="Holiday Date *" outlined />
          <q-input v-model="newHoliday.description" label="Description *" placeholder="e.g. Mid-term break, Public holiday" outlined />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey" />
          <q-btn color="primary" label="Add Holiday" @click="addHoliday" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add Teacher Assignment Dialog -->
    <q-dialog v-model="showAssignDialog">
      <q-card style="width: 400px">
        <q-card-section class="bg-indigo-9 text-white">
          <div class="text-h6">Assign Teacher to Class</div>
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-md">
          <q-select v-model="newAssignment.className" :options="classOptions" label="Class *" outlined />
          <q-input v-model="newAssignment.teacherName" label="Teacher Full Name *" outlined />
          <q-input v-model="newAssignment.subjectName" label="Subject (Leave blank for class teacher)" outlined />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey" />
          <q-btn color="primary" label="Assign" @click="createAssignment" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { attendanceApi, schoolApi } from '../../../api'
import { Dialog, Notify } from 'quasar'

const activeTab = ref('dashboard')
const activeBusinessName = ref(localStorage.getItem('tenant_name') || 'Invify School')

const selectedClass = ref('Primary 1')
const attendanceDate = ref(new Date().toISOString().split('T')[0])
const teacherName = ref('')
const subjectName = ref('')
const isFinalized = ref(false)
const currentSessionId = ref(null)

const reportPeriodFrom = ref(new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0])
const reportPeriodTo = ref(new Date().toISOString().split('T')[0])

const students = ref([])
const attendanceMap = ref({})
const loadingRegister = ref(false)
const saving = ref(false)

const reportData = ref(null)
const loadingReport = ref(false)

const auditLogs = ref([])
const loadingAudit = ref(false)

const calendarExceptions = ref([])
const classAssignments = ref([])

const selectedStudentId = ref(null)
const studentHistory = ref(null)
const loadingHistory = ref(false)

const settings = ref({
  minimum_attendance_threshold: 80,
  policy_late: 'attended',
  policy_excused: 'excluded'
})
const savingSettings = ref(false)

const showAddStudentDialog = ref(false)
const enrolling = ref(false)
const newStudent = ref({ name: '', classLevel: 'Primary 1', admissionNumber: '' })

const showAddHolidayDialog = ref(false)
const newHoliday = ref({ date: '', description: '' })

const showAssignDialog = ref(false)
const newAssignment = ref({ className: 'Primary 1', teacherName: '', subjectName: '' })

const showCorrectionDialog = ref(false)
const correctionTarget = ref(null)
const correctionNewStatus = ref('present')
const correctionReason = ref('')
const savingCorrection = ref(false)

const classOptions = ref([
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3', 'IV A'
])

const mockRegisterRows = [
  { name: 'Adebayo Samuel' }, { name: 'Chukwuma Grace' }, { name: 'Ibrahim Fatima' },
  { name: 'Okonkwo David' }, { name: 'Williams Daniel' }, { name: 'Bello Amina' }
]

const allStudentsCount = computed(() => {
  return students.value.length || 45
})

const studentSelectOptions = computed(() => {
  return students.value.map(s => ({
    label: `${s.full_name} (${s.admission_number || 'No ID'})`,
    value: s.id
  }))
})

const registerStats = computed(() => {
  const counts = { present: 0, absent: 0, late: 0, excused: 0, unrecorded: 0 }
  students.value.forEach(s => {
    const st = attendanceMap.value[s.id]
    if (st && counts[st] !== undefined) {
      counts[st]++
    } else {
      counts.unrecorded++
    }
  })
  return counts
})

const auditColumns = [
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
  { name: 'performer_name', label: 'Performed By', field: 'performer_name', align: 'left' },
  { name: 'reason', label: 'Reason / Notes', field: 'reason', align: 'left' },
  { name: 'created_at', label: 'Timestamp', field: row => row.created_at ? new Date(row.created_at).toLocaleString() : '', align: 'left' }
]

const assignmentColumns = [
  { name: 'class_name', label: 'Class', field: 'class_name', align: 'left' },
  { name: 'teacher_name', label: 'Teacher', field: 'teacher_name', align: 'left' },
  { name: 'subject_name', label: 'Subject', field: row => row.subject_name || 'All Subjects', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'id', align: 'right' }
]

const historyColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'subjectName', label: 'Subject', field: row => row.subjectName || 'General', align: 'left' },
  { name: 'teacherName', label: 'Teacher', field: 'teacherName', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' }
]

const fetchRegister = async () => {
  if (!selectedClass.value) return
  loadingRegister.value = true
  try {
    const res = await attendanceApi.getRegister({
      className: selectedClass.value,
      date: attendanceDate.value,
      subjectName: subjectName.value || undefined
    })
    const data = res.data
    students.value = data.students || []
    isFinalized.value = data.isFinalized || false
    currentSessionId.value = data.session?.id || null
    if (data.session?.teacher_name) teacherName.value = data.session.teacher_name

    const map = {}
    data.students.forEach(s => {
      if (s.status) map[s.id] = s.status
    })
    attendanceMap.value = map
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Failed to load register: ' + (e.response?.data?.error || e.message) })
  } finally {
    loadingRegister.value = false
  }
}

const saveRegister = async (finalize = false) => {
  if (!selectedClass.value) return
  saving.value = true
  try {
    const entries = students.value.map(s => ({
      studentId: s.id,
      studentName: s.full_name,
      admissionNumber: s.admission_number,
      status: attendanceMap.value[s.id] || null
    })).filter(e => Boolean(e.status))

    const res = await attendanceApi.saveRegister({
      className: selectedClass.value,
      date: attendanceDate.value,
      teacherName: teacherName.value,
      subjectName: subjectName.value || undefined,
      status: finalize ? 'finalized' : 'draft',
      entries
    })

    currentSessionId.value = res.data.sessionId
    isFinalized.value = finalize
    Notify.create({
      type: 'positive',
      message: finalize ? 'Attendance finalized and locked.' : 'Draft attendance saved.'
    })
    fetchAuditLog()
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Failed to save: ' + (e.response?.data?.error || e.message) })
  } finally {
    saving.value = false
  }
}

const confirmBulkPresent = () => {
  Dialog.create({
    title: 'Confirm Bulk Attendance',
    message: 'Are you sure you want to mark all students in this class as Present? Unrecorded entries will be updated.',
    cancel: true,
    persistent: true
  }).onOk(() => {
    students.value.forEach(s => {
      if (!attendanceMap.value[s.id]) {
        attendanceMap.value[s.id] = 'present'
      }
    })
    Notify.create({ type: 'positive', message: 'Marked all unrecorded students as Present. Click Save Draft to save.' })
  })
}

const openCorrectionDialog = (student) => {
  correctionTarget.value = {
    studentId: student.id,
    student_name: student.full_name,
    currentStatus: attendanceMap.value[student.id] || 'present'
  }
  correctionNewStatus.value = attendanceMap.value[student.id] || 'present'
  correctionReason.value = ''
  showCorrectionDialog.value = true
}

const submitCorrection = async () => {
  if (!correctionReason.value || correctionReason.value.length < 5) {
    Notify.create({ type: 'warning', message: 'A reason of at least 5 characters is required' })
    return
  }
  savingCorrection.value = true
  try {
    await attendanceApi.correctEntry({
      sessionId: currentSessionId.value,
      studentId: correctionTarget.value.studentId,
      newStatus: correctionNewStatus.value,
      reason: correctionReason.value
    })
    attendanceMap.value[correctionTarget.value.studentId] = correctionNewStatus.value
    showCorrectionDialog.value = false
    Notify.create({ type: 'positive', message: 'Attendance correction recorded in audit trail' })
    fetchAuditLog()
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Correction failed: ' + (e.response?.data?.error || e.message) })
  } finally {
    savingCorrection.value = false
  }
}

const fetchClassReport = async () => {
  if (!selectedClass.value || !reportPeriodFrom.value || !reportPeriodTo.value) return
  loadingReport.value = true
  try {
    const res = await attendanceApi.getClassReport({
      className: selectedClass.value,
      periodFrom: reportPeriodFrom.value,
      periodTo: reportPeriodTo.value,
      subjectName: subjectName.value || undefined
    })
    reportData.value = res.data
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Failed to generate report: ' + (e.response?.data?.error || e.message) })
  } finally {
    loadingReport.value = false
  }
}

const downloadReportPdf = async () => {
  try {
    Notify.create({ type: 'info', message: 'Generating Class Attendance Report PDF...' })
    const res = await attendanceApi.downloadClassReportPdf({
      className: selectedClass.value,
      periodFrom: reportPeriodFrom.value,
      periodTo: reportPeriodTo.value
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Attendance-Report-${selectedClass.value}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    Notify.create({ type: 'negative', message: 'PDF export failed: ' + (e.response?.data?.error || e.message) })
  }
}

const downloadRegisterPdf = async () => {
  try {
    Notify.create({ type: 'info', message: 'Generating Class Attendance Register PDF...' })
    const res = await attendanceApi.downloadRegisterPdf({
      className: selectedClass.value,
      date: attendanceDate.value
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Attendance-Register-${selectedClass.value}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Register PDF export failed: ' + (e.response?.data?.error || e.message) })
  }
}

const fetchStudentHistory = async () => {
  if (!selectedStudentId.value) return
  loadingHistory.value = true
  try {
    const res = await attendanceApi.getStudentHistory(selectedStudentId.value, {
      periodFrom: reportPeriodFrom.value,
      periodTo: reportPeriodTo.value
    })
    studentHistory.value = res.data
  } catch (e) {
    Notify.create({ type: 'negative', message: 'History fetch failed: ' + (e.response?.data?.error || e.message) })
  } finally {
    loadingHistory.value = false
  }
}

const fetchSettings = async () => {
  try {
    const res = await attendanceApi.getSettings()
    settings.value = res.data
  } catch (e) {
    console.error('Settings read error:', e)
  }
}

const saveSettings = async () => {
  savingSettings.value = true
  try {
    await attendanceApi.updateSettings(settings.value)
    Notify.create({ type: 'positive', message: 'Attendance settings saved.' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Settings save failed: ' + (e.response?.data?.error || e.message) })
  } finally {
    savingSettings.value = false
  }
}

const fetchCalendar = async () => {
  try {
    const res = await attendanceApi.listCalendar()
    calendarExceptions.value = res.data || []
  } catch (e) {
    console.error('Calendar error:', e)
  }
}

const addHoliday = async () => {
  if (!newHoliday.value.date || !newHoliday.value.description) return
  try {
    await attendanceApi.addCalendar({
      exceptionDate: newHoliday.value.date,
      description: newHoliday.value.description,
      isInstructional: false
    })
    showAddHolidayDialog.value = false
    newHoliday.value = { date: '', description: '' }
    fetchCalendar()
    Notify.create({ type: 'positive', message: 'Holiday added to calendar' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Failed to add holiday: ' + (e.response?.data?.error || e.message) })
  }
}

const deleteHoliday = async (id) => {
  try {
    await attendanceApi.deleteCalendar(id)
    fetchCalendar()
    Notify.create({ type: 'positive', message: 'Holiday removed' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Delete failed' })
  }
}

const fetchAssignments = async () => {
  try {
    const res = await attendanceApi.listAssignments()
    classAssignments.value = res.data || []
  } catch (e) {
    console.error('Assignments error:', e)
  }
}

const createAssignment = async () => {
  if (!newAssignment.value.className || !newAssignment.value.teacherName) return
  try {
    await attendanceApi.createAssignment(newAssignment.value)
    showAssignDialog.value = false
    newAssignment.value = { className: selectedClass.value, teacherName: '', subjectName: '' }
    fetchAssignments()
    Notify.create({ type: 'positive', message: 'Teacher assigned to class.' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Assignment failed: ' + (e.response?.data?.error || e.message) })
  }
}

const deleteAssignment = async (id) => {
  try {
    await attendanceApi.deleteAssignment(id)
    fetchAssignments()
    Notify.create({ type: 'positive', message: 'Assignment removed.' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Failed to delete assignment.' })
  }
}

const fetchAuditLog = async () => {
  loadingAudit.value = true
  try {
    const res = await attendanceApi.getAuditLog()
    auditLogs.value = res.data || []
  } catch (e) {
    console.error('Audit log error:', e)
  } finally {
    loadingAudit.value = false
  }
}

const enrollStudent = async () => {
  if (!newStudent.value.name || !newStudent.value.classLevel) return
  enrolling.value = true
  try {
    await attendanceApi.enroll({
      fullName: newStudent.value.name,
      classLevel: newStudent.value.classLevel,
      admissionNumber: newStudent.value.admissionNumber || undefined
    })
    Notify.create({ type: 'positive', message: 'Student enrolled successfully' })
    showAddStudentDialog.value = false
    newStudent.value = { name: '', classLevel: selectedClass.value, admissionNumber: '' }
    fetchRegister()
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Enrollment failed: ' + (e.response?.data?.error || e.message) })
  } finally {
    enrolling.value = false
  }
}

onMounted(async () => {
  fetchRegister()
  fetchSettings()
  fetchCalendar()
  fetchAssignments()
  fetchAuditLog()
})
</script>

<style scoped>
.hover-shadow:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease-in-out;
}
.border-indigo {
  border-left: 4px solid #3f51b5;
}
.border-bottom-line {
  border-bottom: 2px solid #cbd5e1;
  padding-bottom: 8px;
}
.pt-border {
  border-top: 1px solid #cbd5e1;
  padding-top: 16px;
}
.register-table, .report-table {
  width: 100%;
  border-collapse: collapse;
}
.register-table th, .register-table td,
.report-table th, .report-table td {
  border: 1px solid #94a3b8;
  padding: 6px 8px;
  font-size: 11px;
}
.register-table th, .report-table th {
  background-color: #f1f5f9;
  color: #0f172a;
}
.metric-card {
  border: 1px solid #cbd5e1;
}
</style>
