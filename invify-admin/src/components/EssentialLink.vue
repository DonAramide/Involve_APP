<!-- invify-admin/src/components/EssentialLink.vue -->
<template>
  <q-item
    clickable
    tag="router-link"
    :to="link"
    class="q-mx-sm q-my-xs rounded-borders text-grey-4"
    active-class="text-white bg-indigo-9"
  >
    <q-item-section
      v-if="icon"
      avatar
    >
      <q-icon :name="icon" :class="`text-${color || 'indigo-4'}`" />
    </q-item-section>

    <q-item-section>
      <q-item-label class="text-weight-medium">{{ title }}</q-item-label>
      <q-item-label caption v-if="caption" class="text-grey-6">{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  caption: { type: String, default: '' },
  link: { type: String, default: '#' },
  icon: { type: String, default: '' },
  color: { type: String, default: 'indigo-4' }
})
</script>

<style scoped>
.rounded-borders {
  border-radius: 8px;
}
</style>
