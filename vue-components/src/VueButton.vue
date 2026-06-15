<template>
  <button
    :class="['vue-button', `vue-button--${variant}`, `vue-button--${size}`]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style scoped>
.vue-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.vue-button--primary {
  background-color: #0066cc;
  color: white;
}

.vue-button--secondary {
  background-color: #f0f0f0;
  color: #333;
}

.vue-button--ghost {
  background-color: transparent;
  color: #0066cc;
}

.vue-button--sm {
  padding: 4px 8px;
  font-size: 12px;
}

.vue-button--md {
  padding: 8px 16px;
  font-size: 14px;
}

.vue-button--lg {
  padding: 12px 24px;
  font-size: 16px;
}

.vue-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
