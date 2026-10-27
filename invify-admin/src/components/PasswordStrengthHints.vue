<template>
  <div class="pwd-hints" v-if="password || alwaysShow">
    <div class="pwd-hints__title">Password must include:</div>
    <ul class="pwd-hints__list">
      <li :class="cls(checks.minLength)">At least {{ minLength }} characters</li>
      <li :class="cls(checks.uppercase && checks.lowercase)">Uppercase and lowercase letters</li>
      <li :class="cls(checks.number)">At least one number</li>
      <li :class="cls(checks.special)">At least one special character (!@#$%…)</li>
      <li :class="cls(checks.notWeak)">Not a common or easy-to-guess word</li>
      <li :class="cls(checks.notRepeated)">No repeated or sequential patterns (aaa, 1234)</li>
      <li v-if="currentPassword" :class="cls(checks.notCurrent)">Different from your current / default password</li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { evaluatePasswordPolicy, PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy'

const props = defineProps({
  password: { type: String, default: '' },
  email: { type: String, default: '' },
  currentPassword: { type: String, default: '' },
  alwaysShow: { type: Boolean, default: true },
})

const minLength = PASSWORD_MIN_LENGTH
const result = computed(() =>
  evaluatePasswordPolicy(props.password, {
    email: props.email,
    currentPassword: props.currentPassword,
  }),
)
const checks = computed(() => result.value.checks)

function cls(ok) {
  if (!props.password) return 'pwd-hints__item'
  return ok ? 'pwd-hints__item pwd-hints__item--ok' : 'pwd-hints__item pwd-hints__item--bad'
}
</script>

<style scoped>
.pwd-hints {
  margin: 8px 0 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.12);
}
.pwd-hints__title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  opacity: 0.85;
}
.pwd-hints__list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.55;
}
.pwd-hints__item--ok {
  color: #16a34a;
}
.pwd-hints__item--bad {
  color: #dc2626;
}
</style>
