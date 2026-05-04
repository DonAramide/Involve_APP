<!-- invify-admin/src/pages/OnboardingFlow.vue -->
<template>
  <q-page class="bg-dark flex flex-center q-pa-md">
    <q-card style="width: 700px; max-width: 95vw; min-height: 500px;" class="bg-blue-grey-10 text-white shadow-10 border-indigo overflow-hidden">
      
      <!-- Progress Header -->
      <q-linear-progress :value="progress" color="indigo-5" class="q-mt-none" />
      
      <q-card-section class="q-pa-lg">
        <div class="row items-center q-mb-md">
           <q-icon name="school" color="indigo-4" size="md" class="q-mr-sm" />
           <div class="text-h5 text-weight-bolder letter-spacing-1">Invify Onboarding</div>
           <q-space />
           <q-btn flat label="Skip to Dashboard" color="grey-6" size="sm" @click="skipOnboarding" />
        </div>

        <q-stepper
          v-model="step"
          ref="stepper"
          color="indigo-5"
          animated
          dark
          flat
          class="bg-transparent"
        >
          <!-- STEP 1: Create Account -->
          <q-step :name="1" title="Account" icon="person_add" :done="step > 1">
            <div class="text-subtitle1 q-mb-md">Start your school's AI journey</div>
            <div class="q-gutter-md">
              <q-input v-model="form.schoolName" label="School Name" dark filled dense :rules="[val => !!val || 'Required']" />
              <q-input v-model="form.email" label="Admin Email" type="email" dark filled dense :rules="[val => !!val || 'Required']" />
              <q-input v-model="form.password" label="Create Password" type="password" dark filled dense :rules="[val => !!val || 'Min 6 chars']" />
            </div>
          </q-step>

          <!-- STEP 2: Setup Basics -->
          <q-step :name="2" title="Setup" icon="settings" :done="step > 2">
            <div class="text-subtitle1 q-mb-sm">Standardize your curriculum</div>
            <div class="text-caption text-grey-6 q-mb-md">We've pre-filled standard Nigerian subjects. Adjust as needed.</div>
            
            <q-select
              v-model="form.subjects"
              use-input
              use-chips
              multiple
              input-debounce="0"
              @new-value="createValue"
              :options="subjectOptions"
              label="Teaching Subjects"
              dark filled dense
              class="q-mb-md"
            />

            <q-select
              v-model="form.classes"
              multiple
              chips
              :options="['Primary 1-6', 'JSS 1-3', 'SSS 1-3']"
              label="Offered Classes"
              dark filled dense
            />
          </q-step>

          <!-- STEP 3: Invite Teachers -->
          <q-step :name="3" title="Colleagues" icon="group_add" :done="step > 3">
            <div class="text-subtitle1 q-mb-md">Invite your teaching staff</div>
            <div class="text-caption text-grey-6 q-mb-md">Collaborate on lesson notes and share the school library.</div>
            
            <div class="row q-col-gutter-sm">
               <div class="col-9"><q-input v-model="teacherEmail" label="Teacher Email" dark filled dense @keyup.enter="addTeacher" /></div>
               <div class="col-3"><q-btn color="indigo-7" icon="add" class="full-width" @click="addTeacher" /></div>
            </div>

            <q-list dark separator class="q-mt-md rounded-borders bg-dark">
               <q-item v-for="(t, i) in form.teachers" :key="i">
                  <q-item-section>{{ t }}</q-item-section>
                  <q-item-section side><q-btn flat icon="delete" color="red-4" size="sm" @click="form.teachers.splice(i, 1)" /></q-item-section>
               </q-item>
            </q-list>
            <div v-if="!form.teachers.length" class="text-center q-pa-md text-grey-8">No teachers added yet. You can invite them later.</div>
          </q-step>

          <!-- STEP 4: First AI Generation -->
          <q-step :name="4" title="Activate" icon="auto_awesome" :done="step > 4">
            <div class="text-h6 text-indigo-3 text-weight-bold q-mb-sm">Aha! Moment</div>
            <div class="text-subtitle2 q-mb-md">Let's generate your first professional lesson note in seconds.</div>
            
            <q-card class="bg-indigo-10 q-pa-md rounded-borders border-indigo">
               <div class="row q-col-gutter-sm">
                  <div class="col-12"><q-select v-model="demoNote.subject" :options="form.subjects" label="Select Subject" dark filled dense /></div>
                  <div class="col-6"><q-select v-model="demoNote.class_level" :options="['JSS 1', 'SSS 1']" label="Class" dark filled dense /></div>
                  <div class="col-6"><q-input v-model="demoNote.week" label="Week" type="number" dark filled dense /></div>
               </div>
               <q-btn 
                 color="white" text-color="indigo-10" 
                 label="Generate My First Note" 
                 icon="bolt" 
                 class="full-width q-mt-md text-weight-bolder" 
                 :loading="generating"
                 @click="generateFirstNote" 
               />
            </q-card>
          </q-step>

          <!-- STEP 5: Success -->
          <q-step :name="5" title="Finish" icon="celebration">
             <div class="text-center q-pa-xl">
                <q-icon name="check_circle" color="green-4" size="4em" class="q-mb-md" />
                <div class="text-h5 text-weight-bold">Welcome to Invify!</div>
                <div class="text-body1 text-grey-5 q-mt-sm">
                   Your first lesson note is ready in your dashboard. 
                   We've sent a verification link to your email.
                </div>
                
                <div class="row q-gutter-md q-mt-xl justify-center">
                   <q-btn outline label="Verify Email Later" color="grey-6" @click="goToDashboard" />
                   <q-btn unelevated label="Enter Workspace" color="indigo-7" class="q-px-xl glossy" @click="goToDashboard" />
                </div>
             </div>
          </q-step>

          <!-- Navigation Footer -->
          <template v-slot:navigation>
            <q-stepper-navigation class="row q-gutter-sm q-mt-md" v-if="step < 4">
              <q-btn v-if="step === 1" color="indigo-7" label="Create Account" @click="handleStep1" :loading="loading" />
              <q-btn v-else color="indigo-7" label="Continue" @click="$refs.stepper.next()" />
              
              <q-btn v-if="step > 1" flat color="grey-6" label="Back" @click="$refs.stepper.previous()" class="q-ml-sm" />
              
              <q-space />
              <q-btn v-if="step > 1 && step < 4" flat color="indigo-4" label="Skip Step" @click="$refs.stepper.next()" />
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { onboardingApi, aiApi } from '../api'

const router = useRouter()
const step = ref(1)
const loading = ref(false)
const generating = ref(false)
const teacherEmail = ref('')
const referralCode = ref(route.query.ref || '')

const form = ref({
  schoolName: '',
  email: '',
  password: '',
  subjects: ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics', 'Civic Education'],
  classes: ['Primary 1-6', 'JSS 1-3', 'SSS 1-3'],
  teachers: []
})

const demoNote = ref({ subject: 'Mathematics', class_level: 'JSS 1', term: 'First', week: 1 })
const subjectOptions = ref(['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics'])

const progress = computed(() => (step.value - 1) / 4)

const handleStep1 = async () => {
  loading.value = true
  try {
    // 1. Supabase Auth Signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.value.email,
      password: form.value.password,
    })
    
    if (authError) throw authError

    // 2. Local Backend Activation (Including Referral)
    await onboardingApi.signup({
      userId: authData.user.id,
      email: form.value.email,
      schoolName: form.value.schoolName,
      referralCode: referralCode.value
    })

    step.value = 2
  } finally {
    loading.value = false
  }
}

const addTeacher = () => {
  if (teacherEmail.value && !form.value.teachers.includes(teacherEmail.value)) {
    form.value.teachers.push(teacherEmail.value)
    teacherEmail.value = ''
  }
}

const generateFirstNote = async () => {
  generating.value = true
  try {
    await aiApi.generateLessonNote(demoNote.value)
    step.value = 5
  } finally {
    generating.value = false
  }
}

const skipOnboarding = () => {
  router.push('/teacher-workspace')
}

const goToDashboard = () => {
  router.push('/teacher-workspace')
}

const createValue = (val, done) => {
  if (val.length > 0) {
    if (!subjectOptions.value.includes(val)) subjectOptions.value.push(val)
    done(val, 'toggle')
  }
}
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.border-indigo { border-top: 5px solid #3f51b5; }
.bg-indigo-10 { background: #1a237e; }
</style>
