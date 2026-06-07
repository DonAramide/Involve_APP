<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center op-gap-8 border-bottom q-pb-sm">
      <q-icon name="menu_book" size="sm" color="amber-4" />
      <div class="text-operator-title text-weight-bold" style="font-size: 16px;">KNOWLEDGE BASE</div>
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <div v-else class="column op-gap-16">
      <div v-if="!selectedArticle" class="row op-gap-16 items-start">
        <!-- Categories Sidebar -->
        <div class="col-xs-12 col-md-3 bg-panel border-muted rounded-borders q-pa-md column op-gap-8">
          <div class="text-weight-bold text-muted q-mb-sm">CATEGORIES</div>
          <q-btn v-for="c in categories" :key="c.id" flat align="left"
                 :color="selectedCategory === c.id ? 'amber-4' : 'white'"
                 :label="c.name" @click="selectCategory(c.id)" />
          <q-btn flat align="left" :color="!selectedCategory ? 'amber-4' : 'white'" label="All Articles" @click="selectCategory(null)" />
        </div>

        <!-- Articles List -->
        <div class="col-xs-12 col-md-9 bg-panel border-muted rounded-borders q-pa-md column op-gap-16">
          <q-input dark outlined v-model="search" dense placeholder="Search articles..." color="amber-4" @update:model-value="fetchArticles">
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>

          <div class="column op-gap-8">
            <q-card v-for="a in articles" :key="a.id" class="bg-panel-darker border-muted cursor-pointer" @click="openArticle(a.id)">
              <q-card-section>
                <div class="text-weight-bold text-h6">{{ a.title }}</div>
                <div class="text-caption text-muted q-mt-sm">{{ a.summary || 'Read more...' }}</div>
              </q-card-section>
            </q-card>
            <div v-if="!articles.length" class="text-muted text-center q-pa-lg border-dashed border-muted rounded-borders">
              No articles found.
            </div>
          </div>
        </div>
      </div>

      <!-- Article Detail -->
      <div v-else class="bg-panel border-muted rounded-borders q-pa-md column op-gap-16">
        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="arrow_back" @click="selectedArticle = null" color="amber-4" />
          <div class="text-h5 text-weight-bold">{{ selectedArticle.title }}</div>
        </div>
        <div class="text-caption text-muted">Last updated: {{ new Date(selectedArticle.updated_at).toLocaleDateString() }}</div>
        <q-separator dark />
        <div class="text-body1 q-pa-sm" style="line-height: 1.6;" v-html="selectedArticle.content"></div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(true)
const categories = ref([])
const articles = ref([])
const selectedCategory = ref(null)
const selectedArticle = ref(null)
const search = ref('')

const fetchCategories = async () => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.get('/api/kb/categories', { headers: { Authorization: `Bearer ${token}` } })
    categories.value = res.data.data || []
  } catch (err) {}
}

const fetchArticles = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    let url = '/api/kb/articles?'
    if (selectedCategory.value) url += `categoryId=${selectedCategory.value}&`
    if (search.value) url += `search=${search.value}`
    
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
    articles.value = res.data.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load knowledge base' })
  } finally {
    loading.value = false
  }
}

const selectCategory = async (id) => {
  selectedCategory.value = id
  await fetchArticles()
}

const openArticle = async (id) => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.get(`/api/kb/articles/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    selectedArticle.value = res.data.data
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load article' })
  }
}

onMounted(async () => {
  await fetchCategories()
  await fetchArticles()
})
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-dashed { border-style: dashed !important; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
