<!-- invify-admin/src/components/GlobalSearchModal.vue -->
<template>
  <q-dialog v-model="isOpen" position="top" transition-show="slide-down" transition-hide="slide-up">
    <div class="bg-panel border-muted drawer-shadow" style="width: 600px; max-width: 90vw; margin-top: 10vh; border-radius: 8px;">
      
      <!-- Input Area -->
      <div class="row items-center q-pa-sm border-bottom bg-dark">
        <q-icon name="search" color="cyan-4" size="md" class="q-mx-sm" />
        <q-input 
          v-model="searchQuery" 
          autofocus 
          borderless 
          dense 
          placeholder="Search entities, TXN IDs, cases, or terminals... (Ctrl+K)" 
          class="col text-h6 font-mono text-main"
          @update:model-value="onInput"
        />
        <q-badge color="grey-8" text-color="grey-4" class="font-mono text-caption q-mr-sm">ESC</q-badge>
      </div>

      <!-- Results Area -->
      <q-scroll-area style="height: 350px;">
        <div v-if="!searchQuery" class="q-pa-lg text-center text-muted font-mono">
          <q-icon name="manage_search" size="xl" class="q-mb-md opacity-50" />
          <div class="text-subtitle1">Global Smart Search</div>
          <div class="text-caption">Type an exact ID (e.g., CAS-2026-881) to instantly open the investigation drawer, or search for names.</div>
        </div>

        <div v-else-if="isLoading" class="q-pa-lg flex flex-center">
          <q-spinner-dots color="cyan-4" size="40px" />
        </div>

        <div v-else-if="results.length === 0" class="q-pa-lg text-center text-muted font-mono">
          <q-icon name="search_off" size="xl" class="q-mb-md opacity-50" />
          <div class="text-subtitle1">No Results Found</div>
        </div>

        <div v-else class="q-pa-sm">
          <q-list dark class="font-mono text-caption">
            <q-item v-for="(result, index) in results" :key="index" clickable v-ripple class="q-mb-xs rounded-borders hover-bg" @click="handleSelect(result)">
              <q-item-section avatar>
                <q-icon :name="result.icon" :color="result.color" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-main text-weight-bold">{{ result.title }}</q-item-label>
                <q-item-label caption class="text-muted">{{ result.subtitle }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge outline :color="result.color">{{ result.type }}</q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-scroll-area>
      
      <div class="q-pa-sm border-top bg-dark row justify-between text-muted font-mono" style="font-size: 10px;">
        <div>↑↓ Navigate | ↵ Select</div>
        <div>Invify Intelligence Engine</div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchApi } from '../api'
import uiSearchIndex from '../assets/ui-search-index.json'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const searchQuery = ref('')
const isLoading = ref(false)
const results = ref([])

let searchTimeout = null

// NLP & Smart Search Engine
const onInput = (val) => {
  if (!val) {
    results.value = []
    return
  }

  isLoading.value = true
  
  // Debounce API calls
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    try {
      const response = await searchApi.globalSearch(val)
      let backendResults = response.data.results || []

      // Map through all frontend routes for UI navigation matching
      const qLower = val.toLowerCase()
      const frontendMatches = router.getRoutes()
        .filter(r => {
          if (!r.meta?.title || r.path.includes(':')) return false
          
          // Exclude the merchant portal routes from the enterprise admin search
          if (r.path.startsWith('/tenant/')) return false
          
          const matchTitle = r.meta.title.toLowerCase().includes(qLower)
          const matchPath = r.path.toLowerCase().includes(qLower)
          const matchKeywords = r.meta.keywords ? r.meta.keywords.some(k => k.toLowerCase().includes(qLower)) : false
          
          return matchTitle || matchPath || matchKeywords
        })
        .map(r => ({
          type: 'NAVIGATION',
          title: r.meta.title,
          subtitle: `Open Workspace • ${r.path}`,
          icon: 'view_list',
          color: 'blue',
          route: r.path
        }))

      // Search inside the static build-time UI text index
      const uiTextMatches = []
      const seen = new Set()
      
      for (const entry of uiSearchIndex) {
        if (entry.route.startsWith('/tenant/')) continue // Exclude merchant portal
        if (entry.route.includes(':')) continue // Exclude dynamic routes
        
        if (entry.text.toLowerCase().includes(qLower)) {
          const key = `${entry.text.toLowerCase()}|${entry.route}`
          if (!seen.has(key)) {
            seen.add(key)
            uiTextMatches.push({
              type: 'UI TEXT',
              title: entry.text,
              subtitle: `${entry.pageTitle} • ${entry.route}`,
              icon: 'text_fields',
              color: 'amber-8',
              route: entry.route
            })
          }
        }
      }

      // If we found local navigation or UI text matches, remove the default "Ask AI" fallback from backend
      if (frontendMatches.length > 0 || uiTextMatches.length > 0) {
        backendResults = backendResults.filter(r => r.type !== 'GLOBAL')
      }

      // Merge and limit: Backend specific entity results first, then exact navigation routes, then deep UI text matches
      const merged = [...backendResults, ...frontendMatches, ...uiTextMatches].slice(0, 15)
      
      // Re-add fallback if entirely empty
      if (merged.length === 0) {
        merged.push({ type: 'GLOBAL', title: `Ask AI to find "${val}"`, subtitle: 'Execute Natural Language Query', icon: 'travel_explore', color: 'purple', route: '/executive/ai-insights' })
      }

      results.value = merged
    } catch (error) {
      console.error('Search API Error:', error)
      results.value = [{ 
        type: 'ERROR', 
        title: 'Intelligence Engine Offline', 
        subtitle: 'Unable to process search query at this time.', 
        icon: 'error_outline', 
        color: 'red', 
        route: '' 
      }]
    } finally {
      isLoading.value = false
    }
  }, 400)
}

const handleSelect = (result) => {
  isOpen.value = false
  searchQuery.value = ''
  if (result.route) {
    router.push(result.route)
    // In a real implementation, you would also pass the ID via query params or a global state store to automatically open the drawer on the target page.
  }
}

// Keyboard Shortcut Listener
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.opacity-50 { opacity: 0.5; }

.hover-bg:hover {
  background: rgba(255,255,255,0.05);
}
</style>
